import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import OptionalPhone


class StaffIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    designation: str = Field(default="Staff", min_length=2, max_length=60)
    phone: OptionalPhone = None
    daily_wage: Decimal = Field(default=Decimal(0), ge=0, max_digits=12, decimal_places=2)
    face_consent: bool = False


class StaffUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    designation: str | None = Field(default=None, min_length=2, max_length=60)
    phone: OptionalPhone = None
    daily_wage: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    face_consent: bool | None = None
    is_active: bool | None = None


class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    designation: str
    phone: str | None
    daily_wage: Decimal
    face_consent: bool
    face_enrolled_at: datetime | None
    is_active: bool
    created_at: datetime


class StaffDetail(StaffOut):
    attendance_entries: int = 0
    last_seen: datetime | None = None


class StaffDeleted(BaseModel):
    full_name: str
    attendance_entries_deleted: int


class EnrollIn(BaseModel):
    images: list[str] = Field(min_length=3, max_length=6, description="Webcam photos as data URLs")


class PoseBaseline(BaseModel):
    yaw: float = Field(ge=-2, le=2)
    pitch: float = Field(ge=-2, le=3)


class PoseIn(BaseModel):
    image: str = Field(min_length=100, description="One webcam frame as a data URL")
    pose: Literal["front", "up", "left", "right"]
    baseline: PoseBaseline | None = Field(default=None, description="Yaw and pitch of the accepted front photo")


class PoseOut(BaseModel):
    ok: bool
    face: bool
    yaw: float | None = None
    pitch: float | None = None
    progress: float = 0.0
    hint: str


class EnrollOut(BaseModel):
    staff: StaffOut
    photos_used: int
    consistency: float


class CheckIn(BaseModel):
    kind: Literal["in", "out"]
    frames: list[str] = Field(min_length=3, max_length=12, description="Frames captured during the head-turn challenge")
    booking_id: uuid.UUID | None = None
    site: str | None = Field(default=None, max_length=120)


class CheckOut(BaseModel):
    ok: bool
    staff: StaffOut | None = None
    kind: str
    match_score: float
    liveness_passed: bool
    liveness_score: float
    message: str
    logged_at: datetime | None = None


class ManualIn(BaseModel):
    staff_id: uuid.UUID
    kind: Literal["in", "out"]
    at: datetime | None = None
    booking_id: uuid.UUID | None = None
    site: str | None = Field(default=None, max_length=120)
    note: str = Field(min_length=3, max_length=300, description="Why attendance was marked by hand")


class LogOut(BaseModel):
    id: uuid.UUID
    staff_id: uuid.UUID
    staff_name: str
    kind: str
    logged_at: datetime
    local_time: str
    method: str
    match_score: float | None
    liveness_score: float | None
    site: str | None
    booking_id: uuid.UUID | None
    note: str | None


class SheetRow(BaseModel):
    staff: StaffOut
    status: Literal["present", "late", "absent", "checked_out"]
    first_in: str | None
    last_out: str | None
    hours: float | None


class Sheet(BaseModel):
    day: date
    late_after: time
    rows: list[SheetRow]
    present: int
    late: int
    absent: int
