"""Train and evaluate the inquiry reader.

    python -m app.modules.bookings.ai.train

Prints accuracy on a held-out synthetic split and on hand-written messages that use
phrasing not seen in training, then saves the model and its metrics.
"""

from __future__ import annotations

import json
import time
from collections import Counter
from datetime import date
from pathlib import Path

from app.core.config import settings
from app.modules.bookings.ai.data import generate
from app.modules.bookings.ai.reader import LABELS, InquiryReader, _spans_from_tags, tokenize, bio_tags

MODEL_FILE = "inquiry_reader.joblib"
METRICS_FILE = "inquiry_reader_metrics.json"
EVAL_TODAY = date(2026, 10, 29)  # a Thursday; relative dates in the hand-written set use it

# Hand-written messages, phrased differently from the training patterns.
# Expected values: event type, date, time, guest count, a word the venue must contain, dishes.
HANDWRITTEN = [
    ("Salam! Meri beti ki shadi hai 12 December ko, Grand Marquee DHA mein. 450 mehman honge. Biryani, qorma aur kheer chahiye.",
     "wedding", "2026-12-12", None, 450, "Grand Marquee", ["biryani", "qorma", "kheer"]),
    ("Hi, we're hosting our annual dinner on 20 Nov at Serena Hotel for 180 people, 8 pm. Looking for BBQ and pasta.",
     "corporate", "2026-11-20", "20:00", 180, "Serena Hotel", ["BBQ", "pasta"]),
    ("mehndi ka function hai kal raat 9 baje ghar pe, 150 log. chicken karahi naan aur gajar ka halwa",
     "mehndi", "2026-10-30", "21:00", 150, "ghar", ["chicken karahi", "naan", "gajar ka halwa"]),
    ("AoA. Walima on 5th January 2027, Emerald Banquet Hall Gulberg. Approx 600 guests. Mutton qorma, chicken biryani, salad, raita, firni.",
     "walima", "2027-01-05", None, 600, "Emerald Banquet Hall", ["mutton qorma", "chicken biryani", "salad", "raita", "firni"]),
    ("Need catering for a 2-day seminar starting 14/11/2026 at Convention Centre, around 300 participants... tea, sandwiches and lunch.",
     "conference", "2026-11-14", None, None, "Convention Centre", ["tea", "sandwiches"]),
    ("Bhai mangni ki rasm hai agle itwaar, 120 bande, Lakeview Lawn. Chicken tikka, malai boti aur soft drinks.",
     "engagement", "2026-11-01", None, 120, "Lakeview Lawn", ["chicken tikka", "malai boti", "soft drinks"]),
    ("Hello! My son's birthday party this Saturday 5pm, 60 kids + parents ~ 100 people at our home. Pizza, cake and ice cream.",
     "birthday", "2026-10-31", "17:00", 100, "home", ["cake", "ice cream"]),
    ("Milad sharif ka ehtimam 3 sau logon ke liye, 18 tareekh ko, Noor Hall mein. Zarda, biryani aur kashmiri chai.",
     "religious", "2026-11-18", None, 300, "Noor Hall", ["zarda", "biryani", "kashmiri chai"]),
    ("We need a quote: family reunion, Dec 27, Bani Gala farmhouse, 80 guests, steak + grilled chicken + mashed potatoes.",
     "other", "2026-12-27", None, 80, "Bani Gala farmhouse", ["steak", "grilled chicken", "mashed potatoes"]),
    ("Barat 2 hazar mehmano ki, 15 Feb, Royal Marquee and Lawn Bahria Town. Mutton biryani, seekh kabab, roghni naan, kulfi.",
     "wedding", "2027-02-15", None, 2000, "Royal Marquee", ["mutton biryani", "seekh kabab", "roghni naan", "kulfi"]),
    ("Iftar party for our staff on 10 March, 250 persons, office lawn F-7. Pakoray, samosay, dahi bhalle, chana chaat.",
     "religious", "2027-03-10", None, 250, "lawn", ["pakoray", "samosay", "dahi bhalle", "chana chaat"]),
    ("Product launch at Pearl Hotel next Friday 7:30 pm, 200 heads, hi-tea style: sandwiches, brownies, coffee.",
     "corporate", "2026-10-30", "19:30", 200, "Pearl Hotel", ["sandwiches", "brownies", "coffee"]),
    ("dholki hai parson shaam 7 baje, 70 log, apne ghar. chana chaat aur gol gappay, chai",
     "mehndi", "2026-10-31", "19:00", 70, "ghar", ["chana chaat"]),
    ("Valima 22nd of November at Shalimar Hall, Model Town. 700 people. Menu: beef pulao, chicken qorma, naan, custard.",
     "walima", "2026-11-22", None, 700, "Shalimar Hall", ["beef pulao", "chicken qorma", "naan", "custard"]),
    ("Engagement party for my sister on 8 Dec, around 90 guests, Orchid Garden. Chinese rice and chicken manchurian please.",
     "engagement", "2026-12-08", None, 90, "Orchid Garden", ["chinese rice", "chicken manchurian"]),
    ("Workshop for 40 people tomorrow 10 am at our office Blue Area, tea and sandwiches.",
     "conference", "2026-10-30", "10:00", 40, "Blue Area", ["tea", "sandwiches"]),
    ("Quran khwani aur niaz, jumeraat ko, 200 afraad, Satellite Town ghar. Biryani aur zarda.",
     "religious", None, None, 200, "ghar", ["biryani", "zarda"]),
    ("Shaadi ka khana chahiye 1500 logon ka, 3/1/2027, Diamond Banquet. Nihari, haleem, naan, kheer.",
     "wedding", "2027-01-03", None, 1500, "Diamond Banquet", ["nihari", "haleem", "naan", "kheer"]),
    ("Anniversary dinner 14 Feb 8pm at Riviera Club for 50 guests. Soup, steak and fruit trifle.",
     "other", "2027-02-14", "20:00", 50, "Riviera Club", ["soup", "steak", "fruit trifle"]),
    ("Salgirah ki party agle hafte, 120 log, humare ghar. Cake, samosay, soft drinks.",
     "birthday", "2026-11-05", None, 120, "ghar", ["cake", "samosay", "soft drinks"]),
]


def _span_set(spans):
    return {(s[0], s[1], s[2]) for s in spans}


def evaluate_synthetic(reader: InquiryReader, examples) -> dict:
    correct = 0
    per = {label: Counter() for label in LABELS}
    for e in examples:
        pred = reader.classifier.predict([e.text])[0]
        correct += pred == e.event_type
        tokens, tags, probs = reader.tag(e.text)
        # Compare on token-aligned gold spans.
        gold_tags = bio_tags(tokens, e.spans)
        gold = {(s["start"], s["end"], s["label"]) for s in _spans_from_tags(tokens, gold_tags, [1.0] * len(tokens))}
        found = {(s["start"], s["end"], s["label"]) for s in _spans_from_tags(tokens, tags, probs)}
        for label in LABELS:
            g = {s for s in gold if s[2] == label}
            f = {s for s in found if s[2] == label}
            per[label]["tp"] += len(g & f)
            per[label]["fp"] += len(f - g)
            per[label]["fn"] += len(g - f)
    scores = {}
    tp = fp = fn = 0
    for label, c in per.items():
        p = c["tp"] / (c["tp"] + c["fp"]) if c["tp"] + c["fp"] else 0.0
        r = c["tp"] / (c["tp"] + c["fn"]) if c["tp"] + c["fn"] else 0.0
        scores[label] = round(2 * p * r / (p + r), 4) if p + r else 0.0
        tp, fp, fn = tp + c["tp"], fp + c["fp"], fn + c["fn"]
    micro_p = tp / (tp + fp) if tp + fp else 0.0
    micro_r = tp / (tp + fn) if tp + fn else 0.0
    return {
        "event_type_accuracy": round(correct / len(examples), 4),
        "entity_f1": scores,
        "entity_f1_micro": round(2 * micro_p * micro_r / (micro_p + micro_r), 4) if micro_p + micro_r else 0.0,
        "examples": len(examples),
    }


def evaluate_handwritten(reader: InquiryReader) -> dict:
    fields = Counter()
    totals = Counter()
    failures = []
    for text, etype, edate, etime, guests, venue_word, dishes in HANDWRITTEN:
        r = reader.parse(text, today=EVAL_TODAY)
        checks = {
            "event_type": r["event_type"] == etype,
            "event_date": edate is None or r["event_date"] == edate,
            "start_time": etime is None or r["start_time"] == etime,
            "guest_count": guests is None or r["guest_count"] == guests,
            "venue": r["venue"] is not None and venue_word.lower() in r["venue"].lower(),
        }
        found = " | ".join(r["menu"]).lower()
        dish_hits = sum(d.lower() in found for d in dishes)
        for name, ok in checks.items():
            if name == "event_date" and edate is None or name == "start_time" and etime is None \
                    or name == "guest_count" and guests is None:
                continue
            totals[name] += 1
            fields[name] += ok
            if not ok:
                failures.append({"text": text[:70], "field": name, "got": r.get(name)})
        totals["dishes"] += len(dishes)
        fields["dishes"] += dish_hits
    accuracy = {k: round(fields[k] / totals[k], 4) for k in totals}
    overall = round(sum(fields.values()) / sum(totals.values()), 4)
    return {"field_accuracy": accuracy, "overall": overall, "messages": len(HANDWRITTEN), "failures": failures}


def train_and_save(model_dir: Path | None = None, n_train: int = 4000, verbose: bool = False) -> InquiryReader:
    model_dir = model_dir or Path(settings.ai_model_dir)
    started = time.time()
    data = generate(n_train + 800, seed=11)
    train, test = data[:n_train], data[n_train:]
    reader = InquiryReader().fit(train)
    reader.metrics = {
        "trained_on": n_train,
        "synthetic_test": evaluate_synthetic(reader, test),
        "handwritten_test": evaluate_handwritten(reader),
        "train_seconds": round(time.time() - started, 1),
    }
    reader.save(model_dir / MODEL_FILE)
    (model_dir / METRICS_FILE).write_text(json.dumps(reader.metrics, indent=2))
    if verbose:
        print(json.dumps(reader.metrics, indent=2))
    return reader


if __name__ == "__main__":
    train_and_save(verbose=True)
