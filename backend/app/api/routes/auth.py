import uuid
from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import company_block_message, get_current_user, get_public_session, get_session
from app.core.config import settings
from app.core.passwords import password_problems
from app.core.phone import looks_like_email, normalize_phone
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
from app.schemas.auth import (
    ChangePasswordIn,
    LoginIn,
    MeOut,
    PasswordCheckIn,
    PasswordCheckOut,
    RefreshIn,
    SignupIn,
    SignupOut,
    TokenPair,
)
from app.schemas.company import CompanyOut
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

_BAD_LOGIN = "Incorrect email/mobile number or password."


def _duplicate_message(error: IntegrityError) -> str:
    detail = str(error.orig)
    if "users_phone_unique" in detail:
        return "An account with this mobile number already exists."
    return "An account with this email already exists."


@router.post("/signup", response_model=SignupOut, status_code=status.HTTP_202_ACCEPTED)
def signup(body: SignupIn, session: Session = Depends(get_public_session)) -> SignupOut:
    """Request a workspace for a new company. Nobody can sign in until PULSE approves it."""
    company_id = uuid.uuid4()
    try:
        with session.begin():
            set_current_company(session, company_id)
            session.add(
                Company(
                    id=company_id,
                    name=body.company_name.strip(),
                    phone=body.phone or body.mobile,
                    city=body.city,
                )
            )
            session.flush()
            owner = User(
                id=uuid.uuid4(),
                company_id=company_id,
                full_name=body.owner_name.strip(),
                email=body.email.lower(),
                phone=body.mobile,
                password_hash=hash_password(body.password),
                role="owner",
            )
            session.add(owner)
            session.flush()
    except IntegrityError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_duplicate_message(error)) from None
    return SignupOut(
        status="pending",
        company_name=body.company_name.strip(),
        message="Your request has been sent. The PULSE team will review it, and you can sign in once it is approved.",
    )


@router.post("/login", response_model=TokenPair)
def login(body: LoginIn, session: Session = Depends(get_public_session)) -> dict:
    """Sign in with the email or mobile number that the user's company registered."""
    identifier = body.identifier.strip()
    email = phone = None
    if looks_like_email(identifier):
        email = identifier.lower()
    else:
        try:
            phone = normalize_phone(identifier)
        except ValueError:
            verify_password(body.password, DUMMY_PASSWORD_HASH)
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, _BAD_LOGIN) from None

    with session.begin():
        row = (
            session.execute(
                text(
                    "SELECT id, company_id, password_hash, role, is_active, locked_until "
                    "FROM auth_find_user(:email, :phone)"
                ),
                {"email": email, "phone": phone},
            )
            .mappings()
            .first()
        )
        if row is None:
            # Same work as a real check, so response time does not reveal unknown accounts.
            verify_password(body.password, DUMMY_PASSWORD_HASH)
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, _BAD_LOGIN)

        now = datetime.now(timezone.utc)
        if row["locked_until"] is not None and row["locked_until"] > now:
            minutes = max(1, int((row["locked_until"] - now).total_seconds() // 60) + 1)
            raise HTTPException(
                status.HTTP_423_LOCKED,
                f"Too many wrong passwords. This account is locked; try again in {minutes} minute"
                f"{'s' if minutes != 1 else ''}.",
            )

        ok = verify_password(body.password, row["password_hash"])
        locked_until = session.execute(
            text("SELECT auth_record_login(:uid, :ok, :max, :mins)"),
            {"uid": row["id"], "ok": ok, "max": settings.max_failed_logins, "mins": settings.lockout_minutes},
        ).scalar()
        blocked = None
        if ok:
            # Only someone with the right password learns whether the company is approved.
            set_current_company(session, row["company_id"])
            company = session.get(Company, row["company_id"])
            blocked = company_block_message(company.status, company.review_note)

    if not ok:
        if locked_until is not None:
            raise HTTPException(
                status.HTTP_423_LOCKED,
                f"Too many wrong passwords. This account is locked for {settings.lockout_minutes} minutes.",
            )
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, _BAD_LOGIN)
    if blocked:
        raise HTTPException(status.HTTP_403_FORBIDDEN, blocked)
    if not row["is_active"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated. Contact your company owner.")
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
        company = session.get(Company, user.company_id)
        if company is None or company.status != "active":
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in again.")
        # Tokens issued before the last password change stop working.
        issued = datetime.fromtimestamp(claims.get("iat", 0), timezone.utc)
        if user.password_changed_at and issued < user.password_changed_at.replace(microsecond=0):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your password was changed. Please log in again.")
        # Uses the current role, so a role change takes effect on the next refresh.
        return create_token_pair(user.id, user.company_id, user.role)


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> MeOut:
    company = session.get(Company, user.company_id)
    return MeOut(user=UserOut.model_validate(user), company=CompanyOut.model_validate(company))


@router.post("/check-password", response_model=PasswordCheckOut)
def check_password(body: PasswordCheckIn) -> PasswordCheckOut:
    """Lets forms show the server's verdict on a password before submitting."""
    problems = password_problems(body.password, email=body.email, full_name=body.full_name)
    return PasswordCheckOut(ok=not problems, problems=problems)


@router.post("/change-password", response_model=TokenPair)
def change_password(
    body: ChangePasswordIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict:
    """Change your own password. Older sessions are signed out; this one gets new tokens."""
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your current password is incorrect.")
    if body.current_password == body.new_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a new password that is different from the current one.")
    problems = password_problems(body.new_password, email=user.email, full_name=user.full_name)
    if problems:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Password is not strong enough. " + " ".join(problems))
    user.password_hash = hash_password(body.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    session.flush()
    return create_token_pair(user.id, user.company_id, user.role)
