"""M3 Face-Recognition Attendance & Workforce Registry, and a time zone per company.

Revision ID: 0006_attendance
Revises: 0005_inventory
Create Date: 2026-10-29

* companies.timezone: PULSE serves companies in any country, so "today", lateness and
  attendance dates are worked out in each company's own time zone.
* staff_members: the workforce (not every worker has a login account).
* face_embeddings: 128-number SFace embeddings, never photos. Stored only after the staff
  member's consent is recorded, and deleted with the staff member.
* attendance_logs: each check-in or check-out, how it was verified and its match score.
"""

from alembic import op

revision = "0006_attendance"
down_revision = "0005_inventory"
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


UPGRADE = [
    "ALTER TABLE companies ADD COLUMN timezone text NOT NULL DEFAULT 'Asia/Karachi'",
    """
    CREATE TABLE staff_members (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        full_name text NOT NULL CHECK (length(trim(full_name)) > 0),
        designation text NOT NULL DEFAULT 'Staff',
        phone text,
        daily_wage numeric(12, 2) NOT NULL DEFAULT 0 CHECK (daily_wage >= 0),
        user_id uuid,
        face_consent boolean NOT NULL DEFAULT false,
        face_enrolled_at timestamptz,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (id, company_id),
        FOREIGN KEY (user_id, company_id) REFERENCES users (id, company_id)
    )
    """,
    *tenant("staff_members"),
    """
    CREATE TABLE face_embeddings (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        staff_id uuid NOT NULL,
        embedding bytea NOT NULL,
        quality real,
        created_at timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY (staff_id, company_id) REFERENCES staff_members (id, company_id) ON DELETE CASCADE
    )
    """,
    *tenant("face_embeddings"),
    "CREATE INDEX face_embeddings_staff_idx ON face_embeddings (staff_id)",
    """
    CREATE TABLE attendance_logs (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        staff_id uuid NOT NULL,
        kind text NOT NULL CHECK (kind IN ('in', 'out')),
        logged_at timestamptz NOT NULL DEFAULT now(),
        booking_id uuid,
        site text,
        method text NOT NULL CHECK (method IN ('face', 'manual')),
        match_score real,
        liveness_score real,
        note text,
        recorded_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY (staff_id, company_id) REFERENCES staff_members (id, company_id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id, company_id) REFERENCES bookings (id, company_id),
        FOREIGN KEY (recorded_by, company_id) REFERENCES users (id, company_id),
        CHECK (method = 'face' OR note IS NOT NULL)
    )
    """,
    *tenant("attendance_logs"),
    "CREATE INDEX attendance_logs_staff_time_idx ON attendance_logs (staff_id, logged_at)",
]

DOWNGRADE = [
    "DROP TABLE IF EXISTS attendance_logs",
    "DROP TABLE IF EXISTS face_embeddings",
    "DROP TABLE IF EXISTS staff_members",
    "ALTER TABLE companies DROP COLUMN IF EXISTS timezone",
]


def upgrade() -> None:
    for statement in UPGRADE:
        op.execute(statement)


def downgrade() -> None:
    for statement in DOWNGRADE:
        op.execute(statement)
