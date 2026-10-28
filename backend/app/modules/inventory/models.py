import uuid

from sqlalchemy import Boolean, ForeignKeyConstraint, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TenantMixin

CATEGORIES = ("dinner_plate", "dessert_plate", "bowl", "glass", "cup", "cutlery_set", "chafing_dish",
              "serving_dish", "chair", "table", "tablecloth", "other")


class InventoryItem(IdMixin, TenantMixin, Base):
    __tablename__ = "inventory_items"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False, default="pcs")
    total_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    min_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    condition_note: Mapped[str | None] = mapped_column(Text)
    qr_token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ItemMovement(IdMixin, TenantMixin, Base):
    __tablename__ = "item_movements"
    __table_args__ = (
        ForeignKeyConstraint(["item_id", "company_id"], ["inventory_items.id", "inventory_items.company_id"]),
        ForeignKeyConstraint(["booking_id", "company_id"], ["bookings.id", "bookings.company_id"]),
        ForeignKeyConstraint(["recorded_by", "company_id"], ["users.id", "users.company_id"]),
    )

    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    direction: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    damaged: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    note: Mapped[str | None] = mapped_column(Text)
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
