"""Core tables: companies and users, with row-level security per company.

Revision ID: 0001_core
Revises:
Create Date: 2026-10-26

How company separation works
----------------------------
* The API connects as the `pulse_app` role, which is subject to row-level
  security (RLS). Migrations run as the database owner.
* Each request sets `app.company_id` for its transaction. `app_current_company()`
  reads it, and every tenant table's policy only allows rows whose company
  matches. With no company set, no rows are visible at all.
* Login happens before a company is known, so `auth_find_user()` is a
  SECURITY DEFINER function that returns only what login needs.

When you add a table that holds a company's data (bookings, assets, staff...),
copy the four statements marked "TENANT TABLE PATTERN" for your table.
"""

from alembic import op

revision = "0001_core"
down_revision = None
branch_labels = None
depends_on = None

APP_ROLE = "pulse_app"

UPGRADE = [
    """
    CREATE FUNCTION app_current_company() RETURNS uuid
    LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('app.company_id', true), '')::uuid
    $$
    """,
    """
    CREATE TABLE companies (
        id uuid PRIMARY KEY,
        name text NOT NULL CHECK (length(trim(name)) > 0),
        phone text,
        address text,
        city text,
        logo_url text,
        daily_event_capacity integer NOT NULL DEFAULT 4 CHECK (daily_event_capacity > 0),
        created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "ALTER TABLE companies ENABLE ROW LEVEL SECURITY",
    """
    CREATE POLICY company_isolation ON companies
        USING (id = app_current_company())
        WITH CHECK (id = app_current_company())
    """,
    # ---- TENANT TABLE PATTERN (users) ----
    """
    CREATE TABLE users (
        id uuid PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        full_name text NOT NULL,
        email text NOT NULL,
        password_hash text NOT NULL,
        role text NOT NULL CHECK (role IN ('owner', 'manager', 'staff', 'driver', 'accounts')),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX users_company_id_idx ON users (company_id)",
    "ALTER TABLE users ENABLE ROW LEVEL SECURITY",
    """
    CREATE POLICY company_isolation ON users
        USING (company_id = app_current_company())
        WITH CHECK (company_id = app_current_company())
    """,
    # ---- end of pattern ----
    "CREATE UNIQUE INDEX users_email_unique ON users (lower(email))",
    """
    CREATE FUNCTION auth_find_user(p_email text)
    RETURNS TABLE (id uuid, company_id uuid, password_hash text, role text, is_active boolean)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
        SELECT u.id, u.company_id, u.password_hash, u.role, u.is_active
        FROM users u
        WHERE lower(u.email) = lower(p_email)
    $$
    """,
    "REVOKE ALL ON FUNCTION auth_find_user(text) FROM PUBLIC",
    f"GRANT EXECUTE ON FUNCTION auth_find_user(text) TO {APP_ROLE}",
    f"GRANT USAGE ON SCHEMA public TO {APP_ROLE}",
    f"GRANT SELECT, INSERT, UPDATE, DELETE ON companies, users TO {APP_ROLE}",
    f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {APP_ROLE}",
    f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {APP_ROLE}",
]

DOWNGRADE = [
    "DROP FUNCTION IF EXISTS auth_find_user(text)",
    "DROP TABLE IF EXISTS users",
    "DROP TABLE IF EXISTS companies",
    "DROP FUNCTION IF EXISTS app_current_company()",
]


def upgrade() -> None:
    for statement in UPGRADE:
        op.execute(statement)


def downgrade() -> None:
    for statement in DOWNGRADE:
        op.execute(statement)
