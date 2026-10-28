"""M2 QR Inventory & Crockery Custody: items and their movements to and from events.

Revision ID: 0005_inventory
Revises: 0004_bookings
Create Date: 2026-10-29

Each item carries a random QR token. A movement records items leaving for an event (out),
coming back (in, with any damaged pieces) or being written off as lost. Damaged and lost
pieces reduce the item's total, so "available" is always total minus what is still out.
"""

from alembic import op

revision = "0005_inventory"
down_revision = "0004_bookings"
branch_labels = None
depends_on = None


def tenant(table: str) -> list[str]:
    return [
        f"CREATE INDEX {table}_company_id_idx ON {table} (company_id)",
        f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY",
        f"""CREATE POLICY company_isolation ON {table}
            USING (company_id = app_current_company())
            WITH CHECK (company_id = app_current_company())""",
    ]


CATEGORIES = ("'dinner_plate','dessert_plate','bowl','glass','cup','cutlery_set','chafing_dish','serving_dish',"
              "'chair','table','tablecloth','other'")

UPGRADE = [
    f"""
    CREATE TABLE inventory_items (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name text NOT NULL CHECK (length(trim(name)) > 0),
        category text NOT NULL CHECK (category IN ({CATEGORIES})),
        unit text NOT NULL DEFAULT 'pcs',
        total_quantity integer NOT NULL CHECK (total_quantity >= 0),
        min_quantity integer NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
        condition_note text,
        qr_token text NOT NULL UNIQUE,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (id, company_id)
    )
    """,
    *tenant("inventory_items"),
    """
    CREATE TABLE item_movements (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        item_id uuid NOT NULL,
        booking_id uuid NOT NULL,
        direction text NOT NULL CHECK (direction IN ('out', 'in', 'lost')),
        quantity integer NOT NULL CHECK (quantity >= 0),
        damaged integer NOT NULL DEFAULT 0 CHECK (damaged >= 0),
        note text,
        recorded_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        CHECK (quantity + damaged > 0),
        CHECK (direction = 'in' OR damaged = 0),
        FOREIGN KEY (item_id, company_id) REFERENCES inventory_items (id, company_id),
        FOREIGN KEY (booking_id, company_id) REFERENCES bookings (id, company_id),
        FOREIGN KEY (recorded_by, company_id) REFERENCES users (id, company_id)
    )
    """,
    *tenant("item_movements"),
    "CREATE INDEX item_movements_item_idx ON item_movements (item_id)",
    "CREATE INDEX item_movements_booking_idx ON item_movements (booking_id)",
]

DOWNGRADE = ["DROP TABLE IF EXISTS item_movements", "DROP TABLE IF EXISTS inventory_items"]


def upgrade() -> None:
    for statement in UPGRADE:
        op.execute(statement)


def downgrade() -> None:
    for statement in DOWNGRADE:
        op.execute(statement)
