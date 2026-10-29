"""Calendar step for the inquiry reader: turns relative day phrases into real dates.

Clients rarely write "6 November". They write "aglay jummay ko", "is itwaar", "kal",
"parson", "agle hafte jumeraat ko" or "aglay mahine 5 tareekh". This module finds such
a phrase anywhere in the message, in any of the common English and Roman Urdu spellings,
and works out the date from the company's own "today".

Rules (they match how people use these words for bookings):
* "is / this / coming <day>"      the next such day, today included
* "agle / aglay / next <day>"     the next such day after today
* "<day> ko" (no qualifier)       the next such day after today
* "agle hafte <day>"              that day in the following week (Mon-Sun weeks)
* "agle hafte" / "next week"      seven days from today (exact day not given)
* "kal" / "tomorrow"              tomorrow ("kal" can mean yesterday, but an inquiry
                                   is always about the future)
* "parson" / "day after tomorrow" in two days; "N din baad" / "in N days" in N days
* "agle mahine N tareekh"         day N of next month
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, timedelta

NEXT = r"(?:agl(?:e|ay|ey|ae|i|ee|a|y)|next|aan[ae]y?\s+wal[aey]+)"
THIS = r"(?:is|iss|ye|yeh|this|coming)"
WEEK = r"(?:hafte|haftay|hafta|hafty|week)"
MONTH = r"(?:mahine|mahinay|mahina|maheene|month)"

# Thursday comes before Friday so "jumeraat" is never read as "jumma".
DAYS = [
    (3, "Thursday", r"thursday|thurs?|jume?r+a+a?t|jumm?ai?r[ae]+t|jumerat"),
    (4, "Friday", r"friday|fri|jumm?(?:a+h?|ah|ay|ae|ey|e|y)"),
    (0, "Monday", r"monday|mon|peer|pir|somwa+r"),
    (1, "Tuesday", r"tuesday|tues?|mangal(?:wa+r)?"),
    (2, "Wednesday", r"wednesday|wed|budh(?:wa+r)?|buddh"),
    (5, "Saturday", r"saturday|sat|sanichar|haftay\s+ke\s+din"),
    (6, "Sunday", r"sunday|sun|itwa+r|itvaar|itvar|etwa+r"),
]
DAY_RE = "|".join(f"(?P<d{i}>{pat})" for i, (_, _, pat) in enumerate(DAYS))
AFTER = r"(?:\s+(?:ko|ke\s+din|wal[ae]\s+din|ki|kay|ke|wala|wali))?"


@dataclass
class RelativeDate:
    value: date
    start: int
    end: int
    phrase: str
    rule: str


def _which_day(match: re.Match) -> tuple[int, str]:
    for i, (weekday, name, _) in enumerate(DAYS):
        if match.group(f"d{i}"):
            return weekday, name
    raise ValueError("no weekday matched")


def _next_weekday(today: date, weekday: int, include_today: bool) -> date:
    ahead = (weekday - today.weekday()) % 7
    if ahead == 0 and not include_today:
        ahead = 7
    return today + timedelta(days=ahead)


def find_relative_date(text: str, today: date) -> RelativeDate | None:
    t = text.lower()

    def found(m: re.Match, value: date, rule: str) -> RelativeDate:
        return RelativeDate(value, m.start(), m.end(), text[m.start() : m.end()], rule)

    # "agle hafte jumma ko": that day in the following Monday-to-Sunday week.
    m = re.search(rf"\b{NEXT}\s+{WEEK}\s+(?:ka\s+|ke\s+|kay\s+|ki\s+|on\s+)?(?:{DAY_RE})\b{AFTER}", t)
    if m:
        weekday, name = _which_day(m)
        next_monday = today + timedelta(days=7 - today.weekday())
        return found(m, next_monday + timedelta(days=weekday), f"{name} of next week")

    # "agle mahine 5 tareekh": day N of next month.
    m = re.search(rf"\b{NEXT}\s+{MONTH}\s+(?:ki\s+|ko\s+|on\s+the\s+)?(\d{{1,2}})\s*(?:tareekh|tarikh|tarik|date|th|st|nd|rd)?\b", t)
    if m:
        day = int(m.group(1))
        first_next = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
        try:
            return found(m, first_next.replace(day=day), f"day {day} of next month")
        except ValueError:
            pass

    # "is jumma", "aglay jummay ko", "jummay ko", "next friday".
    m = re.search(rf"\b(?:(?P<q>{THIS}|{NEXT})\s+)?(?:{DAY_RE})\b{AFTER}", t)
    if m:
        weekday, name = _which_day(m)
        q = (m.group("q") or "").strip()
        bare = not q
        # A bare day name counts only with "ko" or similar after it, so words like
        # "sat" or "sun" inside a sentence are not taken for dates.
        if not bare or re.search(r"\s(?:ko|ke\s+din|wal[ae]\s+din)$", m.group(0)):
            include_today = bool(q) and re.fullmatch(THIS, q) is not None
            value = _next_weekday(today, weekday, include_today)
            label = "this coming" if include_today else "the coming"
            return found(m, value, f"{label} {name}")

    m = re.search(rf"\b{NEXT}\s+{WEEK}\b", t)
    if m:
        return found(m, today + timedelta(days=7), "a week from today (no exact day given)")

    m = re.search(r"\b(\d{1,2})\s+din\s+(?:baad|bad|ke\s+baad)\b|\bin\s+(\d{1,2})\s+days\b", t)
    if m:
        n = int(m.group(1) or m.group(2))
        return found(m, today + timedelta(days=n), f"{n} days from today")

    m = re.search(r"\b(?:parson|parso|parsoon|parsun|day\s+after\s+tomorrow)\b", t)
    if m:
        return found(m, today + timedelta(days=2), "the day after tomorrow")

    m = re.search(r"\b(?:kal|kl|tomorrow|tmrw)\b", t)
    if m:
        return found(m, today + timedelta(days=1), "tomorrow")

    m = re.search(r"\b(?:aaj|today|tonight)\b", t)
    if m:
        return found(m, today, "today")
    return None
