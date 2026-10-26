import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_session, require_roles
from app.core.security import hash_password
from app.models import User
from app.schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


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
    if body.role == "owner" and current.role != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the owner can add another owner.")
    user = User(
        id=uuid.uuid4(),
        company_id=current.company_id,
        full_name=body.full_name.strip(),
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        role=body.role,
    )
    session.add(user)
    try:
        # A savepoint, so a duplicate email does not end the request's transaction.
        with session.begin_nested():
            session.flush()
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.") from None
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
    session.flush()
    return user
