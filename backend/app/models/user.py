from sqlalchemy import Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TenantMixin

ROLES = ("owner", "manager", "staff", "driver", "accounts")


class User(IdMixin, TenantMixin, Base):
    """A login account belonging to one company."""

    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
