import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

Category = Literal["dinner_plate", "dessert_plate", "bowl", "glass", "cup", "cutlery_set", "chafing_dish",
                   "serving_dish", "chair", "table", "tablecloth", "other"]
ServiceStyle = Literal["buffet", "plated", "family_style"]


class ItemIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: Category
    unit: str = Field(default="pcs", min_length=1, max_length=20)
    total_quantity: int = Field(ge=0, le=1_000_000)
    min_quantity: int = Field(default=0, ge=0, le=1_000_000)
    condition_note: str | None = Field(default=None, max_length=500)


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    category: Category | None = None
    unit: str | None = Field(default=None, min_length=1, max_length=20)
    total_quantity: int | None = Field(default=None, ge=0, le=1_000_000)
    min_quantity: int | None = Field(default=None, ge=0, le=1_000_000)
    condition_note: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class ItemOut(BaseModel):
    id: uuid.UUID
    name: str
    category: Category
    unit: str
    total_quantity: int
    min_quantity: int
    out_now: int
    available: int
    condition_note: str | None
    qr_token: str
    qr_payload: str
    is_active: bool
    low_stock: bool
    created_at: datetime


class MovementIn(BaseModel):
    booking_id: uuid.UUID
    item_id: uuid.UUID | None = None
    qr: str | None = Field(default=None, max_length=200, description="The scanned QR content or token")
    direction: Literal["out", "in", "lost"]
    quantity: int = Field(ge=0, le=100_000)
    damaged: int = Field(default=0, ge=0, le=100_000)
    note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _check(self):
        if (self.item_id is None) == (self.qr is None):
            raise ValueError("Scan an item's QR code or choose the item.")
        if self.direction != "in" and self.damaged:
            raise ValueError("Damaged pieces are recorded when items come back.")
        if self.quantity + self.damaged <= 0:
            raise ValueError("Enter a quantity.")
        return self


class MovementOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    item_name: str
    booking_id: uuid.UUID
    direction: str
    quantity: int
    damaged: int
    note: str | None
    recorded_by_name: str | None
    created_at: datetime


class ReconciliationLine(BaseModel):
    item_id: uuid.UUID
    item_name: str
    category: str
    sent: int
    returned: int
    damaged: int
    lost: int
    outstanding: int
    sent_by: list[str]


class Reconciliation(BaseModel):
    booking_id: uuid.UUID
    client_name: str
    event_date: date
    venue: str
    lines: list[ReconciliationLine]
    total_sent: int
    total_outstanding: int
    total_damaged: int
    total_lost: int


class PredictIn(BaseModel):
    booking_id: uuid.UUID | None = None
    guest_count: int | None = Field(default=None, gt=0, le=100000)
    event_type: str | None = None
    service_style: ServiceStyle = "buffet"
    menu: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def _source(self):
        if self.booking_id is None and self.guest_count is None:
            raise ValueError("Choose a booking or enter the number of guests.")
        return self


class PredictionLine(BaseModel):
    category: str
    label: str
    predicted: int
    rule_of_thumb: int
    available: int
    shortfall: int


class PredictOut(BaseModel):
    guest_count: int
    event_type: str
    service_style: str
    menu_summary: dict
    lines: list[PredictionLine]
    model: dict


class Alert(BaseModel):
    kind: Literal["low_stock", "not_returned"]
    message: str
    item_id: uuid.UUID | None = None
    booking_id: uuid.UUID | None = None
