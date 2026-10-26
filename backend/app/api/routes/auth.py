import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_public_session, get_session
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    REFRESH,
    create_token_pair,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import set_current_company
from app.models import Company, User
from app.schemas.auth import LoginIn, MeOut, RefreshIn, SignupIn, TokenPair
from app.schemas.company import CompanyOut
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, session: Session = Depends(get_public_session)) -> dict:
    """Register a new company and its owner account."""
    company_id = uuid.uuid4()
    try:
        with session.begin():
            set_current_company(session, company_id)
            session.add(
                Company(
                    id=company_id,
                    name=body.company_name.strip(),
                    phone=body.phone,
                    city=body.city,
                )
            )
            session.flush()
            owner = User(
                id=uuid.uuid4(),
                company_id=company_id,
                full_name=body.owner_name.strip(),
                email=body.email.lower(),
                password_hash=hash_password(body.password),
                role="owner",
            )
            session.add(owner)
            session.flush()
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from None
    return create_token_pair(owner.id, company_id, owner.role)


@router.post("/login", response_model=TokenPair)
def login(body: LoginIn, session: Session = Depends(get_public_session)) -> dict:
    row = (
        session.execute(
            text("SELECT id, company_id, password_hash, role, is_active FROM auth_find_user(:email)"),
            {"email": body.email},
        )
        .mappings()
        .first()
    )
    if row is None:
        verify_password(body.password, DUMMY_PASSWORD_HASH)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    if not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    if not row["is_active"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")
    return create_token_pair(row["id"], row["company_id"], row["role"])


@router.post("/refresh", response_model=TokenPair)
def refresh(body: RefreshIn, session: Session = Depends(get_public_session)) -> dict:
    try:
        claims = decode_token(body.refresh_token, REFRESH)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in again.") from None

    with session.begin():
        set_current_company(session, claims["cid"])
        user = session.get(User, uuid.UUID(claims["sub"]))
        if user is None or not user.is_active:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in again.")
        # Uses the current role, so a role change takes effect on the next refresh.
        return create_token_pair(user.id, user.company_id, user.role)


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> MeOut:
    company = session.get(Company, user.company_id)
    return MeOut(user=UserOut.model_validate(user), company=CompanyOut.model_validate(company))
