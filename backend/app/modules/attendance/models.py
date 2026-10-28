import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Float, ForeignKeyConstraint, LargeBinary, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TenantMixin


class StaffMember(IdMixin, TenantMixin, Base):
    __tablename__ = "staff_members"
    __table_args__ = (ForeignKeyConstraint(["user_id", "company_id"], ["users.id", "users.company_id"]),)

    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    designation: Mapped[str] = mapped_column(Text, nullable=False, default="Staff")
    phone: Mapped[str | None] = mapped_column(Text)
    daily_wage: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    face_consent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    face_enrolled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class FaceEmbedding(IdMixin, TenantMixin, Base):
    __tablename__ = "face_embeddings"
    __table_args__ = (
        ForeignKeyConstraint(["staff_id", "company_id"], ["staff_members.id", "staff_members.company_id"], ondelete="CASCADE"),
    )

    staff_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    embedding: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    quality: Mapped[float | None] = mapped_column(Float)


class AttendanceLog(IdMixin, TenantMixin, Base):
    __tablename__ = "attendance_logs"
    __table_args__ = (
        ForeignKeyConstraint(["staff_id", "company_id"], ["staff_members.id", "staff_members.company_id"], ondelete="CASCADE"),
        ForeignKeyConstraint(["booking_id", "company_id"], ["bookings.id", "bookings.company_id"]),
        ForeignKeyConstraint(["recorded_by", "company_id"], ["users.id", "users.company_id"]),
    )

    staff_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    booking_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    site: Mapped[str | None] = mapped_column(Text)
    method: Mapped[str] = mapped_column(Text, nullable=False)
    match_score: Mapped[float | None] = mapped_column(Float)
    liveness_score: Mapped[float | None] = mapped_column(Float)
    note: Mapped[str | None] = mapped_column(Text)
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
