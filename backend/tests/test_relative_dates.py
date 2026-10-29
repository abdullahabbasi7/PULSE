"""Day phrases in inquiries are turned into real dates from the company's today."""

from datetime import date

import pytest

from app.modules.bookings.ai.relative_dates import find_relative_date

FRI = date(2026, 10, 30)  # a Friday
TUE = date(2026, 11, 3)   # a Tuesday


@pytest.mark.parametrize(
    "text,today,expected",
    [
        ("mehndi aglay jummay ko hai", FRI, date(2026, 11, 6)),
        ("barat agle jumma ko", TUE, date(2026, 11, 6)),
        ("walima jumay ko", TUE, date(2026, 11, 6)),
        ("is jummay ko dawat", FRI, FRI),
        ("is jummay ko dawat", TUE, date(2026, 11, 6)),
        ("jumeraat ko milad hai", TUE, date(2026, 11, 5)),
        ("aglay hafte jummay ko", TUE, date(2026, 11, 13)),
        ("agle hafte peer ko", FRI, date(2026, 11, 2)),
        ("agle itwar ko", FRI, date(2026, 11, 1)),
        ("aglay mangal ko", TUE, date(2026, 11, 10)),
        ("next saturday", FRI, date(2026, 10, 31)),
        ("kal hai party", FRI, date(2026, 10, 31)),
        ("parson hai", FRI, date(2026, 11, 1)),
        ("3 din baad", FRI, date(2026, 11, 2)),
        ("aglay mahine 5 tareekh ko", date(2026, 10, 3), date(2026, 11, 5)),
        ("agle hafte hai", FRI, date(2026, 11, 6)),
    ],
)
def test_relative_phrases(text, today, expected):
    found = find_relative_date(text, today)
    assert found is not None, text
    assert found.value == expected, (text, found.rule)


def test_ignores_words_that_only_look_like_days():
    assert find_relative_date("wedding catering for 300 guests at Sun Hall", FRI) is None
    assert find_relative_date("jumeraat", FRI) is None  # a bare day name without "ko" is not a date


def test_inquiry_uses_company_today_and_explains_the_date(client, new_company):
    headers, _ = new_company()
    r = client.post("/api/v1/bookings/parse-inquiry", headers=headers, json={"text": "Mehndi aglay jummay ko hai, 250 mehman, Royal Lawn"}).json()
    assert r["event_date"] is not None and date.fromisoformat(r["event_date"]).weekday() == 4
    assert r["date_note"]["phrase"].lower().startswith("aglay jummay")
    assert any(e["label"] == "DATE" and "jummay" in e["text"].lower() for e in r["entities"])
