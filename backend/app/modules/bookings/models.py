import uuid
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKeyConstraint, Integer, Numeric, Text, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TenantMixin

EVENT_TYPES = ("wedding", "mehndi", "walima", "engagement", "birthday", "corporate", "conference", "religious", "other")
STATUSES = ("inquiry", "quoted", "confirmed", "in_progress", "completed", "cancelled")
PROGRESS = ("scheduled", "dispatched", "setup", "serving", "wind_up", "done")


class Client(IdMixin, TenantMixin, Base):
    __tablename__ = "clients"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)


class Booking(IdMixin, TenantMixin, Base):
    __tablename__ = "bookings"
    __table_args__ = (
        ForeignKeyConstraint(["client_id", "company_id"], ["clients.id", "clients.company_id"]),
        ForeignKeyConstraint(["created_by", "company_id"], ["users.id", "users.company_id"]),
    )

    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time | None] = mapped_column(Time)
    end_time: Mapped[time | None] = mapped_column(Time)
    venue: Mapped[str] = mapped_column(Text, nullable=False)
    guest_count: Mapped[int] = mapped_column(Integer, nullable=False)
    menu: Mapped[str | None] = mapped_column(Text)
    package: Mapped[str | None] = mapped_column(Text)
    add_ons: Mapped[str | None] = mapped_column(Text)
    quoted_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    status: Mapped[str] = mapped_column(Text, nullable=False, default="inquiry")
    progress: Mapped[str] = mapped_column(Text, nullable=False, default="scheduled")
    inquiry_text: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class BookingHistory(IdMixin, TenantMixin, Base):
    __tablename__ = "booking_history"
    __table_args__ = (
        ForeignKeyConstraint(["booking_id", "company_id"], ["bookings.id", "bookings.company_id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["actor_id", "company_id"], ["users.id", "users.company_id"]),
    )

    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    action: Mapped[str] = mapped_column(Text, nullable=False)
    detail: Mapped[str | None] = mapped_column(Text)
