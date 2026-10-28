"""M1 Bookings & Live Event Board: clients, bookings and booking history.

Revision ID: 0004_bookings
Revises: 0003_auth_hardening
Create Date: 2026-10-29

Every table follows the TENANT TABLE PATTERN from 0001 (company_id, index, RLS policy).
References between tenant tables use composite keys (id, company_id), so a booking can
never point at another company's client even if someone knows its id: foreign-key checks
are not filtered by row-level security, but a composite key makes the company part of
the reference itself.
"""

from alembic import op

revision = "0004_bookings"
down_revision = "0003_auth_hardening"
branch_labels = None
depends_on = None


def tenant(table: str) -> list[str]:
    """Index, row-level security and isolation policy for a tenant table."""
    return [
        f"CREATE INDEX {table}_company_id_idx ON {table} (company_id)",
        f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY",
        f"""CREATE POLICY company_isolation ON {table}
            USING (company_id = app_current_company())
            WITH CHECK (company_id = app_current_company())""",
    ]


EVENT_TYPES = "'wedding','mehndi','walima','engagement','birthday','corporate','conference','religious','other'"
STATUSES = "'inquiry','quoted','confirmed','in_progress','completed','cancelled'"
PROGRESS = "'scheduled','dispatched','setup','serving','wind_up','done'"

UPGRADE = [
    # Lets other tables reference users by (id, company_id).
    "ALTER TABLE users ADD CONSTRAINT users_id_company_key UNIQUE (id, company_id)",
    """
    CREATE TABLE clients (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name text NOT NULL CHECK (length(trim(name)) > 0),
        phone text,
        email text,
        address text,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (id, company_id)
    )
    """,
    *tenant("clients"),
    f"""
    CREATE TABLE bookings (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_id uuid NOT NULL,
        event_type text NOT NULL CHECK (event_type IN ({EVENT_TYPES})),
        event_date date NOT NULL,
        start_time time,
        end_time time,
        venue text NOT NULL,
        guest_count integer NOT NULL CHECK (guest_count > 0 AND guest_count <= 100000),
        menu text,
        package text,
        add_ons text,
        quoted_amount numeric(14, 2) CHECK (quoted_amount IS NULL OR quoted_amount >= 0),
        status text NOT NULL DEFAULT 'inquiry' CHECK (status IN ({STATUSES})),
        progress text NOT NULL DEFAULT 'scheduled' CHECK (progress IN ({PROGRESS})),
        inquiry_text text,
        notes text,
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (id, company_id),
        CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time),
        FOREIGN KEY (client_id, company_id) REFERENCES clients (id, company_id),
        FOREIGN KEY (created_by, company_id) REFERENCES users (id, company_id)
    )
    """,
    *tenant("bookings"),
    "CREATE INDEX bookings_date_idx ON bookings (company_id, event_date)",
    """
    CREATE TABLE booking_history (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        booking_id uuid NOT NULL,
        actor_id uuid,
        action text NOT NULL,
        detail text,
        created_at timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY (booking_id, company_id) REFERENCES bookings (id, company_id) ON DELETE CASCADE,
        FOREIGN KEY (actor_id, company_id) REFERENCES users (id, company_id)
    )
    """,
    *tenant("booking_history"),
    "CREATE INDEX booking_history_booking_idx ON booking_history (booking_id)",
]

DOWNGRADE = [
    "DROP TABLE IF EXISTS booking_history",
    "DROP TABLE IF EXISTS bookings",
    "DROP TABLE IF EXISTS clients",
    "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_company_key",
]


def upgrade() -> None:
    for statement in UPGRADE:
        op.execute(statement)


def downgrade() -> None:
    for statement in DOWNGRADE:
        op.execute(statement)
