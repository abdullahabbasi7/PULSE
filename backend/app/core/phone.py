"""Mobile numbers are stored in one international format (+<country><number>) so that
'0300-1234567', '+92 300 1234567' and '00923001234567' all identify the same account."""

import re

from app.core.config import settings


def normalize_phone(raw: str) -> str:
    """Return the number as '+<digits>' or raise ValueError if it cannot be a phone number."""
    text = raw.strip()
    if not text:
        raise ValueError("Enter a mobile number.")
    if re.search(r"[^\d\s()+\-.]", text):
        raise ValueError("A mobile number may contain only digits, spaces, dashes and a leading +.")
    plus = text.startswith("+")
    digits = re.sub(r"\D", "", text)
    if plus:
        number = digits
    elif digits.startswith("00"):
        number = digits[2:]
    elif digits.startswith("0"):
        # National format: replace the trunk 0 with the default country code.
        number = settings.default_country_code + digits[1:]
    else:
        number = digits
    if not 8 <= len(number) <= 15:
        raise ValueError("Enter a valid mobile number, for example 0300 1234567 or +44 7700 900123.")
    return "+" + number


def looks_like_email(identifier: str) -> bool:
    return "@" in identifier
