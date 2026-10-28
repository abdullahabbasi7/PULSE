"""Validators shared by several schemas."""

from typing import Annotated

from pydantic import AfterValidator

from app.core.phone import normalize_phone


def _phone(value: str) -> str:
    return normalize_phone(value)


def _optional_phone(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    return normalize_phone(value)


Phone = Annotated[str, AfterValidator(_phone)]
OptionalPhone = Annotated[str | None, AfterValidator(_optional_phone)]
