import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_session, require_roles
from app.core.passwords import password_problems
from app.core.security import hash_password
from app.models import User
from app.schemas.user import PasswordResetIn, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


def _flush_or_conflict(session: Session) -> None:
    try:
        # A savepoint, so a duplicate email or phone does not end the request's transaction.
        with session.begin_nested():
            session.flush()
    except IntegrityError as error:
        what = "mobile number" if "users_phone_unique" in str(error.orig) else "email"
        raise HTTPException(status.HTTP_409_CONFLICT, f"An account with this {what} already exists.") from None


@router.get("", response_model=list[UserOut])
def list_users(
    session: Session = Depends(get_session),
    _: User = Depends(require_roles("owner", "manager")),
) -> list[User]:
    return list(session.scalars(select(User).order_by(User.created_at)))


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    session: Session = Depends(get_session),
    current: User = Depends(require_roles("owner", "manager")),
) -> User:
    """Register a team member. Only accounts created here (or the owner at sign-up) can sign in."""
    if body.role == "owner" and current.role != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the owner can add another owner.")
    user = User(
        id=uuid.uuid4(),
        company_id=current.company_id,
        full_name=body.full_name.strip(),
        email=body.email.lower(),
        phone=body.phone,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    session.add(user)
    _flush_or_conflict(session)
    session.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    session: Session = Depends(get_session),
    current: User = Depends(require_roles("owner")),
) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if user.id == current.id and (body.is_active is False or (body.role and body.role != "owner")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot deactivate or demote your own owner account.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    _flush_or_conflict(session)
    return user


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(
    user_id: uuid.UUID,
    body: PasswordResetIn,
    session: Session = Depends(get_session),
    current: User = Depends(require_roles("owner", "manager")),
) -> None:
    """Set a new temporary password for a member who forgot theirs. It also unlocks the account."""
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if user.role == "owner" and current.role != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an owner can reset an owner's password.")
    problems = password_problems(body.new_password, email=user.email, full_name=user.full_name)
    if problems:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Password is not strong enough. " + " ".join(problems))
    user.password_hash = hash_password(body.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    user.failed_logins = 0
    user.locked_until = None
    session.flush()
