"""PULSE platform console: the PULSE team approves, rejects and suspends companies.

Platform admins are not users of any company. They sign in here with their own accounts
(created with `python -m scripts.create_platform_admin`) and get a platform token, which
company routes refuse. Company routes' tokens are refused here in turn.
"""

import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_platform_admin, get_public_session
from app.core.security import DUMMY_PASSWORD_HASH, create_platform_token, verify_password

router = APIRouter(prefix="/platform", tags=["platform"])

CompanyStatus = Literal["pending", "active", "rejected", "suspended"]

# Which decisions are allowed from each state.
ALLOWED = {
    "pending": {"active", "rejected"},
    "active": {"suspended"},
    "suspended": {"active"},
    "rejected": {"active"},
}


class PlatformLoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class PlatformAdminOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str


class PlatformLoginOut(BaseModel):
    access_token: str
    admin: PlatformAdminOut


class CompanyRow(BaseModel):
    id: uuid.UUID
    name: str
    city: str | None
    phone: str | None
    timezone: str
    status: CompanyStatus
    created_at: datetime
    reviewed_at: datetime | None
    review_note: str | None
    reviewed_by_name: str | None
    owner_name: str | None
    owner_email: str | None
    owner_phone: str | None
    members: int
    bookings: int


class DecisionIn(BaseModel):
    status: Literal["active", "rejected", "suspended"]
    note: str | None = Field(default=None, max_length=500)


_BAD_LOGIN = "Incorrect email or password."


@router.post("/login", response_model=PlatformLoginOut)
def platform_login(body: PlatformLoginIn, session: Session = Depends(get_public_session)) -> PlatformLoginOut:
    with session.begin():
        row = session.execute(
            text("SELECT id, email, full_name, password_hash, is_active FROM platform_find_admin(:email)"),
            {"email": body.email.strip()},
        ).mappings().first()
    if row is None:
        verify_password(body.password, DUMMY_PASSWORD_HASH)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, _BAD_LOGIN)
    if not verify_password(body.password, row["password_hash"]) or not row["is_active"]:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, _BAD_LOGIN)
    return PlatformLoginOut(
        access_token=create_platform_token(row["id"]),
        admin=PlatformAdminOut(id=row["id"], email=row["email"], full_name=row["full_name"]),
    )


@router.get("/me", response_model=PlatformAdminOut)
def platform_me(admin: dict = Depends(get_platform_admin)) -> PlatformAdminOut:
    return PlatformAdminOut(**{k: admin[k] for k in ("id", "email", "full_name")})


def _companies(session: Session) -> list[CompanyRow]:
    rows = session.execute(text("SELECT * FROM platform_list_companies()")).mappings().all()
    return [CompanyRow(**row) for row in rows]


@router.get("/companies", response_model=list[CompanyRow])
def list_companies(
    status_filter: CompanyStatus | None = Query(default=None, alias="status"),
    admin: dict = Depends(get_platform_admin),
    session: Session = Depends(get_public_session),
) -> list[CompanyRow]:
    with session.begin():
        rows = _companies(session)
    return [r for r in rows if status_filter is None or r.status == status_filter]


@router.post("/companies/{company_id}/decision", response_model=CompanyRow)
def decide(
    company_id: uuid.UUID,
    body: DecisionIn,
    admin: dict = Depends(get_platform_admin),
    session: Session = Depends(get_public_session),
) -> CompanyRow:
    """Approve (active), reject, suspend or reactivate a company."""
    with session.begin():
        current = next((r for r in _companies(session) if r.id == company_id), None)
        if current is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Company not found.")
        if body.status not in ALLOWED[current.status]:
            raise HTTPException(status.HTTP_409_CONFLICT, f"A {current.status} company cannot be changed to {body.status}.")
        if body.status in ("rejected", "suspended") and not (body.note and body.note.strip()):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Give a reason; the company will see it.")
        session.execute(
            text("SELECT platform_set_company_status(:cid, :status, :note, :admin)"),
            {"cid": company_id, "status": body.status, "note": (body.note or "").strip() or None, "admin": admin["id"]},
        )
        return next(r for r in _companies(session) if r.id == company_id)
