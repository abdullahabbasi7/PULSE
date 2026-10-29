import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import OptionalPhone

EventType = Literal["wedding", "mehndi", "walima", "engagement", "birthday", "corporate", "conference", "religious", "other"]
Status = Literal["inquiry", "quoted", "confirmed", "in_progress", "completed", "cancelled"]
Progress = Literal["scheduled", "dispatched", "setup", "serving", "wind_up", "done"]


class ClientIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: OptionalPhone = None
    email: str | None = Field(default=None, max_length=254)
    address: str | None = Field(default=None, max_length=300)
    notes: str | None = Field(default=None, max_length=1000)


class ClientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: OptionalPhone = None
    email: str | None = Field(default=None, max_length=254)
    address: str | None = Field(default=None, max_length=300)
    notes: str | None = Field(default=None, max_length=1000)


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    address: str | None
    notes: str | None
    created_at: datetime


class BookingFields(BaseModel):
    event_type: EventType
    event_date: date
    start_time: time | None = None
    end_time: time | None = None
    venue: str = Field(min_length=2, max_length=300)
    guest_count: int = Field(gt=0, le=100000)
    menu: str | None = Field(default=None, max_length=2000)
    package: str | None = Field(default=None, max_length=200)
    add_ons: str | None = Field(default=None, max_length=1000)
    quoted_amount: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    notes: str | None = Field(default=None, max_length=2000)
    inquiry_text: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def _times(self):
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValueError("The end time must be after the start time.")
        return self


class BookingCreate(BookingFields):
    client_id: uuid.UUID | None = None
    client: ClientIn | None = Field(default=None, description="Create a new client with the booking")
    status: Literal["inquiry", "quoted", "confirmed"] = "inquiry"

    @model_validator(mode="after")
    def _client(self):
        if (self.client_id is None) == (self.client is None):
            raise ValueError("Choose an existing client or enter a new one.")
        return self


class BookingUpdate(BaseModel):
    event_type: EventType | None = None
    event_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    venue: str | None = Field(default=None, min_length=2, max_length=300)
    guest_count: int | None = Field(default=None, gt=0, le=100000)
    menu: str | None = Field(default=None, max_length=2000)
    package: str | None = Field(default=None, max_length=200)
    add_ons: str | None = Field(default=None, max_length=1000)
    quoted_amount: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    notes: str | None = Field(default=None, max_length=2000)


class StatusIn(BaseModel):
    status: Status


class ProgressIn(BaseModel):
    progress: Progress


class ClashQuery(BaseModel):
    event_date: date
    start_time: time | None = None
    end_time: time | None = None
    venue: str = Field(min_length=2, max_length=300)


class Clash(BaseModel):
    booking_id: uuid.UUID
    client_name: str
    event_type: str
    venue: str
    start_time: time | None
    end_time: time | None
    reason: str


class BookingOut(BaseModel):
    id: uuid.UUID
    client: ClientOut
    event_type: EventType
    event_date: date
    start_time: time | None
    end_time: time | None
    venue: str
    guest_count: int
    menu: str | None
    package: str | None
    add_ons: str | None
    quoted_amount: Decimal | None
    status: Status
    progress: Progress
    inquiry_text: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    clashes: list[Clash] = []


class HistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    action: str
    detail: str | None
    actor_name: str | None = None
    created_at: datetime


class InquiryIn(BaseModel):
    text: str = Field(min_length=5, max_length=4000)


class Entity(BaseModel):
    label: str
    start: int
    end: int
    text: str
    confidence: float


class Alternative(BaseModel):
    event_type: str
    confidence: float


class DateNote(BaseModel):
    phrase: str
    rule: str
    today: date


class InquiryOut(BaseModel):
    event_type: EventType
    event_type_confidence: float
    alternatives: list[Alternative]
    event_date: date | None
    start_time: str | None
    guest_count: int | None
    venue: str | None
    menu: list[str]
    phone: str | None
    date_note: DateNote | None = None
    entities: list[Entity]
    model: dict
