"""Password hashing (scrypt, from the standard library) and JWT tokens."""

import base64
import hashlib
import hmac
import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings

ACCESS = "access"
REFRESH = "refresh"

_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_DKLEN = 64


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text.encode("ascii"))


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, dklen=_DKLEN
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, digest = stored.split("$")
        if scheme != "scrypt":
            return False
        expected = _unb64(digest)
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=_unb64(salt),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected),
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)


# Used when an email is unknown, so a failed login takes as long as a real one.
DUMMY_PASSWORD_HASH = hash_password("pulse-dummy-password")


def create_token(
    *, user_id: uuid.UUID, company_id: uuid.UUID, role: str, token_type: str, expires: timedelta
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "cid": str(company_id),
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + expires,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_token_pair(user_id: uuid.UUID, company_id: uuid.UUID, role: str) -> dict[str, str]:
    return {
        "access_token": create_token(
            user_id=user_id,
            company_id=company_id,
            role=role,
            token_type=ACCESS,
            expires=timedelta(minutes=settings.access_token_minutes),
        ),
        "refresh_token": create_token(
            user_id=user_id,
            company_id=company_id,
            role=role,
            token_type=REFRESH,
            expires=timedelta(days=settings.refresh_token_days),
        ),
        "token_type": "bearer",
    }


PLATFORM = "platform"


def create_platform_token(admin_id: uuid.UUID) -> str:
    """Token for the PULSE platform console. It has no company and is refused by company routes."""
    now = datetime.now(timezone.utc)
    payload = {"sub": str(admin_id), "type": PLATFORM, "iat": now, "exp": now + timedelta(hours=8), "jti": uuid.uuid4().hex}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_platform_token(token: str) -> dict:
    claims = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm], options={"require": ["sub", "type", "exp"]})
    if claims.get("type") != PLATFORM:
        raise jwt.InvalidTokenError("Wrong token type")
    uuid.UUID(claims["sub"])
    return claims


def decode_token(token: str, expected_type: str) -> dict:
    """Return the token's claims, or raise jwt.PyJWTError if it is invalid."""
    claims = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "cid", "type", "exp"]},
    )
    if claims.get("type") != expected_type:
        raise jwt.InvalidTokenError("Wrong token type")
    uuid.UUID(claims["sub"])
    uuid.UUID(claims["cid"])
    return claims
