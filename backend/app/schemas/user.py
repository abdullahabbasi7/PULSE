import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.core.passwords import ensure_strong
from app.schemas.common import OptionalPhone

Role = Literal["owner", "manager", "staff", "driver", "accounts"]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str
    phone: str | None = None
    role: Role
    is_active: bool
    created_at: datetime


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: OptionalPhone = None
    role: Role
    password: str = Field(min_length=1, max_length=128, description="Temporary password for the new account")

    @model_validator(mode="after")
    def _strong_password(self) -> "UserCreate":
        ensure_strong(self.password, email=str(self.email), full_name=self.full_name)
        return self


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: OptionalPhone = None
    role: Role | None = None
    is_active: bool | None = None


class PasswordResetIn(BaseModel):
    new_password: str = Field(min_length=1, max_length=128)
