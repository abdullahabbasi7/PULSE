"""Remove the daily event limit from companies.

PULSE does not cap how many events a company can take on one day.

Revision ID: 0002_drop_event_capacity
Revises: 0001_core
Create Date: 2026-10-26
"""

from alembic import op

revision = "0002_drop_event_capacity"
down_revision = "0001_core"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE companies DROP COLUMN IF EXISTS daily_event_capacity")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE companies ADD COLUMN daily_event_capacity integer NOT NULL DEFAULT 4 "
        "CHECK (daily_event_capacity > 0)"
    )
