"""Dates and times in a company's own time zone (companies may be in any country)."""

import uuid
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models import Company


def company_zone(session: Session, company_id: uuid.UUID) -> ZoneInfo:
    company = session.get(Company, company_id)
    try:
        return ZoneInfo(company.timezone if company else "UTC")
    except Exception:
        return ZoneInfo("UTC")


def company_now(session: Session, company_id: uuid.UUID) -> datetime:
    return datetime.now(timezone.utc).astimezone(company_zone(session, company_id))


def company_today(session: Session, company_id: uuid.UUID) -> date:
    return company_now(session, company_id).date()
