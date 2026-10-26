"""Request dependencies: database sessions, the logged-in user and role checks.

Use them in every route that touches company data:

    @router.get("/things")
    def list_things(
        session: Session = Depends(get_session),
        user: User = Depends(require_roles("owner", "manager")),
    ):
        ...

`get_session` opens one transaction per request with the user's company set,
so row-level security limits every query to that company. It commits when the
route returns and rolls back if the route raises. Use `session.flush()` inside
routes, never `session.commit()`.
"""

import uuid
from collections.abc import Callable, Iterator

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import ACCESS, decode_token
from app.db.session import SessionLocal, set_current_company
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Please log in again.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_public_session() -> Iterator[Session]:
    """A session with no company set. Only for sign-up, login and refresh."""
    with SessionLocal() as session:
        yield session


def get_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Iterator[Session]:
    if credentials is None:
        raise _UNAUTHORIZED
    try:
        claims = decode_token(credentials.credentials, ACCESS)
    except jwt.PyJWTError:
        raise _UNAUTHORIZED from None

    with SessionLocal() as session, session.begin():
        set_current_company(session, claims["cid"])
        session.info["claims"] = claims
        yield session


def get_current_user(session: Session = Depends(get_session)) -> User:
    claims = session.info["claims"]
    user = session.get(User, uuid.UUID(claims["sub"]))
    if user is None or not user.is_active:
        raise _UNAUTHORIZED
    return user


def require_roles(*roles: str) -> Callable[..., User]:
    """Dependency that allows only the given roles, for example require_roles("owner")."""

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your role does not have access to this.",
            )
        return user

    return checker
