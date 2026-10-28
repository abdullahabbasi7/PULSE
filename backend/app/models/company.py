from datetime import datetime

from sqlalchemy import DateTime, FetchedValue, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin


class Company(IdMixin, Base):
    """A subscribing catering or event company (one tenant)."""

    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(Text)
    timezone: Mapped[str] = mapped_column(Text, nullable=False, default="Asia/Karachi")
    # Set only by the PULSE platform team (the app role cannot write these columns).
    # No Python default, so the ORM never sends them and the database default 'pending' applies.
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=FetchedValue())
    review_note: Mapped[str | None] = mapped_column(Text, server_default=FetchedValue())
