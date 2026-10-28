"""Company approval by the PULSE platform team.

Revision ID: 0007_platform_approval
Revises: 0006_attendance
Create Date: 2026-10-29

A company that signs up is only a *request*. Nobody can sign in to its workspace until a
PULSE platform admin approves it, and an admin can later suspend a company.

* companies.status: pending | active | rejected | suspended. Existing companies become
  active; new rows default to pending.
* The app role (pulse_app) may no longer write the status columns at all. Column-level
  privileges mean even a bug in a company route cannot approve its own company.
* platform_admins: the PULSE team. Not a tenant table, and pulse_app has no privileges on
  it; the API reaches it only through the SECURITY DEFINER functions below.
"""

from alembic import op

revision = "0007_platform_approval"
down_revision = "0006_attendance"
branch_labels = None
depends_on = None

APP_ROLE = "pulse_app"
COMPANY_COLUMNS = "id, name, phone, address, city, logo_url, timezone"
EDITABLE_COLUMNS = "name, phone, address, city, logo_url, timezone"

UPGRADE = [
    """
    CREATE TABLE platform_admins (
        id uuid PRIMARY KEY,
        email text NOT NULL,
        full_name text NOT NULL,
        password_hash text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE UNIQUE INDEX platform_admins_email_unique ON platform_admins (lower(email))",
    "REVOKE ALL ON platform_admins FROM PUBLIC",
    # Existing companies stay usable; every new one starts as a request.
    """
    ALTER TABLE companies
        ADD COLUMN status text NOT NULL DEFAULT 'active'
            CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
        ADD COLUMN reviewed_at timestamptz,
        ADD COLUMN reviewed_by uuid REFERENCES platform_admins(id) ON DELETE SET NULL,
        ADD COLUMN review_note text
    """,
    "ALTER TABLE companies ALTER COLUMN status SET DEFAULT 'pending'",
    f"REVOKE INSERT, UPDATE ON companies FROM {APP_ROLE}",
    f"GRANT INSERT ({COMPANY_COLUMNS}) ON companies TO {APP_ROLE}",
    f"GRANT UPDATE ({EDITABLE_COLUMNS}) ON companies TO {APP_ROLE}",
    """
    CREATE FUNCTION platform_find_admin(p_email text)
    RETURNS TABLE (id uuid, email text, full_name text, password_hash text, is_active boolean)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
        SELECT a.id, a.email, a.full_name, a.password_hash, a.is_active
        FROM platform_admins a WHERE lower(a.email) = lower(p_email)
    $$
    """,
    """
    CREATE FUNCTION platform_get_admin(p_id uuid)
    RETURNS TABLE (id uuid, email text, full_name text, is_active boolean)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
        SELECT a.id, a.email, a.full_name, a.is_active FROM platform_admins a WHERE a.id = p_id
    $$
    """,
    """
    CREATE FUNCTION platform_list_companies()
    RETURNS TABLE (id uuid, name text, city text, phone text, timezone text, status text,
                   created_at timestamptz, reviewed_at timestamptz, review_note text, reviewed_by_name text,
                   owner_name text, owner_email text, owner_phone text, members bigint, bookings bigint)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
        SELECT c.id, c.name, c.city, c.phone, c.timezone, c.status, c.created_at, c.reviewed_at,
               c.review_note, a.full_name,
               o.full_name, o.email, o.phone,
               (SELECT count(*) FROM users u WHERE u.company_id = c.id),
               (SELECT count(*) FROM bookings b WHERE b.company_id = c.id)
        FROM companies c
        LEFT JOIN platform_admins a ON a.id = c.reviewed_by
        LEFT JOIN LATERAL (
            SELECT u.full_name, u.email, u.phone FROM users u
            WHERE u.company_id = c.id AND u.role = 'owner' ORDER BY u.created_at LIMIT 1
        ) o ON true
        ORDER BY c.created_at DESC
    $$
    """,
    """
    CREATE FUNCTION platform_set_company_status(p_company uuid, p_status text, p_note text, p_admin uuid)
    RETURNS text
    LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
    DECLARE
        result text;
    BEGIN
        IF p_status NOT IN ('active', 'rejected', 'suspended') THEN
            RAISE EXCEPTION 'invalid status %', p_status;
        END IF;
        UPDATE companies
           SET status = p_status, review_note = p_note, reviewed_at = now(), reviewed_by = p_admin
         WHERE id = p_company
        RETURNING status INTO result;
        RETURN result;
    END
    $$
    """,
]

FUNCTIONS = [
    "platform_find_admin(text)",
    "platform_get_admin(uuid)",
    "platform_list_companies()",
    "platform_set_company_status(uuid, text, text, uuid)",
]
for fn in FUNCTIONS:
    UPGRADE += [f"REVOKE ALL ON FUNCTION {fn} FROM PUBLIC", f"GRANT EXECUTE ON FUNCTION {fn} TO {APP_ROLE}"]

DOWNGRADE = [f"DROP FUNCTION IF EXISTS {fn}" for fn in FUNCTIONS] + [
    f"GRANT INSERT, UPDATE ON companies TO {APP_ROLE}",
    "ALTER TABLE companies DROP COLUMN review_note, DROP COLUMN reviewed_by, DROP COLUMN reviewed_at, DROP COLUMN status",
    "DROP TABLE IF EXISTS platform_admins",
]


def upgrade() -> None:
    for statement in UPGRADE:
        op.execute(statement)


def downgrade() -> None:
    for statement in DOWNGRADE:
        op.execute(statement)
