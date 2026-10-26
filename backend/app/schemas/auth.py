from pydantic import BaseModel, EmailStr, Field

from app.schemas.company import CompanyOut
from app.schemas.user import UserOut


class SignupIn(BaseModel):
    company_name: str = Field(min_length=2, max_length=120)
    owner_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=40)
    city: str | None = Field(default=None, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshIn(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MeOut(BaseModel):
    user: UserOut
    company: CompanyOut
