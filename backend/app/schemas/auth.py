from pydantic import BaseModel, EmailStr, Field, model_validator

from app.core.passwords import ensure_strong
from app.schemas.common import OptionalPhone, Phone
from app.schemas.company import CompanyOut
from app.schemas.user import UserOut


class SignupIn(BaseModel):
    company_name: str = Field(min_length=2, max_length=120)
    owner_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    mobile: Phone = Field(description="Owner's mobile number; it can be used to sign in.")
    password: str = Field(min_length=1, max_length=128)
    phone: OptionalPhone = Field(default=None, description="Company phone (optional)")
    city: str | None = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def _strong_password(self) -> "SignupIn":
        ensure_strong(self.password, email=str(self.email), full_name=self.owner_name)
        return self


class LoginIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=254, description="Email or mobile number")
    password: str = Field(min_length=1, max_length=128)


class RefreshIn(BaseModel):
    refresh_token: str


class SignupOut(BaseModel):
    status: str
    company_name: str
    message: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MeOut(BaseModel):
    user: UserOut
    company: CompanyOut


class ProfileUpdate(BaseModel):
    """What a person can change about themselves. Email and role stay with the owner."""

    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: OptionalPhone = None
    job_title: str | None = Field(default=None, max_length=80)
    avatar: str | None = Field(default=None, max_length=9_000_000, description="Image data URL; empty string removes the photo")


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=1, max_length=128)


class PasswordCheckIn(BaseModel):
    password: str = Field(max_length=128)
    email: str | None = None
    full_name: str | None = None


class PasswordCheckOut(BaseModel):
    ok: bool
    problems: list[str]
