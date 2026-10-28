"""Smart inquiry reader (Module 1 AI).

Two trained models read a client's message:

1. Event-type classifier: TF-IDF features over words and character n-grams, fed to
   multinomial logistic regression. Character n-grams cope with Roman Urdu spelling
   variation (shadi / shaadi, walima / valima).
2. Entity tagger: a maximum-entropy (logistic regression) sequence tagger that labels each
   token with BIO tags for DATE, TIME, GUESTS, VENUE and DISH, using the token, its shape,
   affixes, small gazetteers and a window of neighbouring tokens.

Rule-based normalisers then turn the tagged spans into values: "agle jumma" -> a date,
"5 sau" -> 500, "raat 8 baje" -> 20:00.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction import DictVectorizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FeatureUnion, Pipeline

from app.modules.bookings.ai.data import DISHES, MONTH_ABBR, MONTHS, WEEKDAYS, WEEKDAYS_UR, Example

MODEL_VERSION = 1
LABELS = ("DATE", "TIME", "GUESTS", "VENUE", "DISH")

_TOKEN_RE = re.compile(r"\d+(?:[:/.\-]\d+)*(?:st|nd|rd|th|k)?|[^\W\d_]+(?:[-'][^\W\d_]+)*|\S", re.UNICODE)

_MONTH_LOOKUP = {m.lower(): i + 1 for i, m in enumerate(MONTHS)} | {m.lower(): i + 1 for i, m in enumerate(MONTH_ABBR)}
_MONTH_LOOKUP["sept"] = 9
_WEEKDAY_LOOKUP = {d.lower(): i for i, d in enumerate(WEEKDAYS)} | {u: WEEKDAYS.index(d) for d, u in WEEKDAYS_UR.items()}
_DISH_WORDS = {w.lower() for dish in DISHES for w in dish.split()}
_VENUE_WORDS = {"marquee", "hall", "banquet", "lawn", "farmhouse", "hotel", "club", "garden", "convention", "centre",
                "center", "ghar", "house", "home", "chhat", "community", "park", "phase", "town", "resort", "auditorium"}
_DATE_WORDS = {"kal", "parson", "tomorrow", "today", "aaj", "next", "agle", "agli", "this", "is", "tareekh", "tarikh",
               "week", "hafte", "of"} | set(_MONTH_LOOKUP) | set(_WEEKDAY_LOOKUP)
_TIME_WORDS = {"am", "pm", "baje", "raat", "shaam", "subah", "dopehar", "evening", "morning", "night", "noon", "around"}
_GUEST_WORDS = {"guests", "people", "log", "logon", "afraad", "bande", "persons", "mehman", "pax", "heads", "sau", "hazar"}


@dataclass
class Token:
    text: str
    start: int
    end: int


def tokenize(text: str) -> list[Token]:
    return [Token(m.group(), m.start(), m.end()) for m in _TOKEN_RE.finditer(text)]


def _shape(word: str) -> str:
    shape = re.sub(r"[A-Z]", "X", word)
    shape = re.sub(r"[a-z]", "x", shape)
    shape = re.sub(r"\d", "d", shape)
    return re.sub(r"(.)\1+", r"\1\1", shape)


def _token_features(tokens: list[Token], i: int) -> dict[str, float]:
    w = tokens[i].text
    lw = w.lower()
    f: dict[str, float] = {
        "bias": 1.0,
        f"w={lw}": 1.0,
        f"shape={_shape(w)}": 1.0,
        f"p3={lw[:3]}": 1.0,
        f"s3={lw[-3:]}": 1.0,
        "is_digit": float(lw.isdigit()),
        "has_digit": float(any(c.isdigit() for c in lw)),
        "is_title": float(w[:1].isupper() and w[1:].islower()),
        "is_punct": float(not w.isalnum()),
        "g_month": float(lw in _MONTH_LOOKUP),
        "g_weekday": float(lw in _WEEKDAY_LOOKUP),
        "g_date": float(lw in _DATE_WORDS),
        "g_time": float(lw in _TIME_WORDS),
        "g_guest": float(lw in _GUEST_WORDS),
        "g_dish": float(lw in _DISH_WORDS),
        "g_venue": float(lw in _VENUE_WORDS),
    }
    if lw.isdigit():
        n = int(lw)
        f["num_small"] = float(n <= 31)
        f["num_hour"] = float(n <= 24)
        f["num_big"] = float(n >= 50)
        f["num_year"] = float(1990 <= n <= 2100)
    for offset in (-2, -1, 1, 2):
        j = i + offset
        if 0 <= j < len(tokens):
            nw = tokens[j].text.lower()
            f[f"{offset}:w={nw}"] = 1.0
            f[f"{offset}:shape={_shape(tokens[j].text)}"] = 1.0
            for name, words in (("month", _MONTH_LOOKUP), ("time", _TIME_WORDS), ("guest", _GUEST_WORDS),
                                ("dish", _DISH_WORDS), ("venue", _VENUE_WORDS), ("date", _DATE_WORDS)):
                if nw in words:
                    f[f"{offset}:g_{name}"] = 1.0
        else:
            f[f"{offset}:edge"] = 1.0
    return f


def bio_tags(tokens: list[Token], spans: list[tuple[int, int, str]]) -> list[str]:
    tags = ["O"] * len(tokens)
    for start, end, label in spans:
        first = True
        for k, t in enumerate(tokens):
            if t.start >= start and t.end <= end:
                tags[k] = ("B-" if first else "I-") + label
                first = False
    return tags


def _spans_from_tags(tokens: list[Token], tags: list[str], probs: list[float]) -> list[dict]:
    spans: list[dict] = []
    current: dict | None = None
    for t, tag, p in zip(tokens, tags, probs):
        if tag == "O":
            current = None
            continue
        prefix, label = tag.split("-", 1)
        if prefix == "B" or current is None or current["label"] != label:
            current = {"label": label, "start": t.start, "end": t.end, "probs": [p]}
            spans.append(current)
        else:
            current["end"] = t.end
            current["probs"].append(p)
    for s in spans:
        s["confidence"] = round(float(np.mean(s.pop("probs"))), 3)
    return spans


# ---------------------------------------------------------------- normalisers

def normalize_date(text: str, today: date) -> date | None:
    t = text.lower().strip().replace(",", " ")
    t = re.sub(r"(\d+)(st|nd|rd|th)\b", r"\1", t)
    if t in ("aaj", "today"):
        return today
    if t in ("kal", "tomorrow"):
        return today + timedelta(days=1)
    if t in ("parson", "day after tomorrow"):
        return today + timedelta(days=2)
    if t in ("next week", "agle hafte"):
        return today + timedelta(days=7)
    m = re.match(r"^(next|this|agle|agli|is)\s+(\w+)$", t)
    if m and m.group(2) in _WEEKDAY_LOOKUP:
        # "this/is Friday" is the coming Friday (today if it is Friday);
        # "next/agle Friday" is the coming Friday, or a week today if today is Friday.
        target = _WEEKDAY_LOOKUP[m.group(2)]
        ahead = (target - today.weekday()) % 7
        if ahead == 0 and m.group(1) in ("next", "agle", "agli"):
            ahead = 7
        return today + timedelta(days=ahead)
    m = re.match(r"^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?$", t)
    if m:
        day, month = int(m.group(1)), int(m.group(2))
        year = int(m.group(3)) if m.group(3) else None
        return _resolve(day, month, year, today)
    m = re.match(r"^(\d{1,2})\s+(?:tareekh|tarikh)$", t)
    if m:
        day = int(m.group(1))
        candidate = _safe_date(today.year, today.month, day)
        if candidate and candidate >= today:
            return candidate
        nxt = today.replace(day=1) + timedelta(days=32)
        return _safe_date(nxt.year, nxt.month, day)
    words = t.replace(" of ", " ").split()
    day = month = year = None
    for w in words:
        if w.isdigit():
            n = int(w)
            if n > 31:
                year = n
            elif day is None:
                day = n
        elif w in _MONTH_LOOKUP:
            month = _MONTH_LOOKUP[w]
    if day and month:
        return _resolve(day, month, year, today)
    return None


def _safe_date(year: int, month: int, day: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _resolve(day: int, month: int, year: int | None, today: date) -> date | None:
    if year is not None and year < 100:
        year += 2000
    if year is None:
        candidate = _safe_date(today.year, month, day)
        if candidate and candidate < today:
            candidate = _safe_date(today.year + 1, month, day)
        return candidate
    return _safe_date(year, month, day)


def normalize_time(text: str) -> str | None:
    t = text.lower()
    m = re.search(r"(\d{1,2})(?::(\d{2}))?", t)
    if not m:
        return None
    hour, minute = int(m.group(1)), int(m.group(2) or 0)
    if hour > 23 or minute > 59:
        return None
    pm = "pm" in t or any(w in t for w in ("raat", "shaam", "evening", "night"))
    am = "am" in t or "subah" in t or "morning" in t
    if "dopehar" in t or "noon" in t:
        pm = hour != 12 and hour < 6
    if pm and hour < 12:
        hour += 12
    if am and hour == 12:
        hour = 0
    if not pm and not am and 1 <= hour <= 6:
        hour += 12  # "8 baje" for an event is evening; "2 baje" lunch is afternoon
    return f"{hour:02d}:{minute:02d}"


def normalize_guests(text: str) -> int | None:
    t = text.lower().replace(",", "")
    m = re.search(r"(\d+(?:\.\d+)?)\s*(k|sau|hazar|hazaar|thousand|hundred)?", t)
    if not m:
        return None
    n = float(m.group(1))
    unit = m.group(2)
    if unit in ("k", "hazar", "hazaar", "thousand"):
        n *= 1000
    elif unit in ("sau", "hundred"):
        n *= 100
    value = int(round(n))
    return value if 0 < value <= 100000 else None


_PHONE_RE = re.compile(r"(?:\+?\d[\d\s\-]{8,15}\d)")


class InquiryReader:
    def __init__(self) -> None:
        self.classifier: Pipeline | None = None
        self.tagger: LogisticRegression | None = None
        self.vectorizer: DictVectorizer | None = None
        self.metrics: dict = {}

    # ---------------------------------------------------------- training
    def fit(self, examples: list[Example]) -> "InquiryReader":
        texts = [e.text for e in examples]
        labels = [e.event_type for e in examples]
        self.classifier = Pipeline([
            ("features", FeatureUnion([
                ("words", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=2)),
                ("chars", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True, min_df=2)),
            ])),
            ("model", LogisticRegression(max_iter=2000, C=8.0)),
        ])
        self.classifier.fit(texts, labels)

        feats, tags = [], []
        for e in examples:
            tokens = tokenize(e.text)
            feats.extend(_token_features(tokens, i) for i in range(len(tokens)))
            tags.extend(bio_tags(tokens, e.spans))
        self.vectorizer = DictVectorizer(sparse=True)
        X = self.vectorizer.fit_transform(feats)
        self.tagger = LogisticRegression(max_iter=300, C=4.0)
        self.tagger.fit(X, tags)
        return self

    # ---------------------------------------------------------- inference
    def tag(self, text: str) -> tuple[list[Token], list[str], list[float]]:
        tokens = tokenize(text)
        if not tokens:
            return [], [], []
        X = self.vectorizer.transform([_token_features(tokens, i) for i in range(len(tokens))])
        proba = self.tagger.predict_proba(X)
        classes = list(self.tagger.classes_)
        tags = [classes[k] for k in proba.argmax(axis=1)]
        probs = proba.max(axis=1).tolist()
        # Repair invalid BIO sequences (I- without a preceding tag of the same type).
        for k, tag in enumerate(tags):
            if tag.startswith("I-") and (k == 0 or tags[k - 1] == "O" or tags[k - 1][2:] != tag[2:]):
                tags[k] = "B-" + tag[2:]
        return tokens, tags, probs

    def parse(self, text: str, today: date | None = None) -> dict:
        today = today or date.today()
        text = text.strip()
        proba = self.classifier.predict_proba([text])[0]
        classes = list(self.classifier.classes_)
        order = np.argsort(proba)[::-1]
        tokens, tags, probs = self.tag(text)
        spans = _spans_from_tags(tokens, tags, probs)
        for s in spans:
            s["text"] = text[s["start"] : s["end"]]

        def first(label: str) -> dict | None:
            return next((s for s in spans if s["label"] == label), None)

        result: dict = {
            "event_type": classes[order[0]],
            "event_type_confidence": round(float(proba[order[0]]), 3),
            "alternatives": [
                {"event_type": classes[k], "confidence": round(float(proba[k]), 3)} for k in order[1:3]
            ],
            "event_date": None,
            "start_time": None,
            "guest_count": None,
            "venue": None,
            "menu": [],
            "phone": None,
            "entities": spans,
        }
        if (d := first("DATE")) is not None:
            parsed = normalize_date(d["text"], today)
            result["event_date"] = parsed.isoformat() if parsed else None
        if (t := first("TIME")) is not None:
            result["start_time"] = normalize_time(t["text"])
        if (g := first("GUESTS")) is not None:
            # Include a multiplier word the tagger left outside the span ("2 hazar", "5 sau").
            after = re.match(r"\s*(sau|hazar|hazaar|thousand|hundred)\b", text[g["end"]:], re.IGNORECASE)
            result["guest_count"] = normalize_guests(g["text"] + (" " + after.group(1) if after else ""))
        venues = [s for s in spans if s["label"] == "VENUE" and len(s["text"].strip(" ,.-")) >= 3]
        if venues:
            # The most confident venue phrase, preferring longer ones on ties.
            best = max(venues, key=lambda s: (s["confidence"], s["end"] - s["start"]))
            result["venue"] = best["text"].strip(" ,.")
        seen: set[str] = set()
        for s in spans:
            if s["label"] == "DISH":
                dish = s["text"].strip(" ,.")
                if dish and dish.lower() not in seen:
                    seen.add(dish.lower())
                    result["menu"].append(dish)
        if (m := _PHONE_RE.search(text)) is not None:
            result["phone"] = re.sub(r"[\s\-]", "", m.group())
        return result

    # ---------------------------------------------------------- persistence
    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({"version": MODEL_VERSION, "reader": self}, path)

    @staticmethod
    def load(path: Path) -> "InquiryReader | None":
        try:
            payload = joblib.load(path)
        except Exception:  # missing, corrupt or from another library version
            return None
        if not isinstance(payload, dict) or payload.get("version") != MODEL_VERSION:
            return None
        return payload["reader"]
