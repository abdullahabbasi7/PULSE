import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str | None
    address: str | None
    city: str | None
    logo_url: str | None
    daily_event_capacity: int
    created_at: datetime


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, max_length=80)
    logo_url: str | None = Field(default=None, max_length=500)
    daily_event_capacity: int | None = Field(default=None, ge=1, le=100)
