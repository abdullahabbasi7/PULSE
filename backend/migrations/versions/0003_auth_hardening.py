"""Stronger sign-in: mobile-number login and lockout after repeated wrong passwords.

Revision ID: 0003_auth_hardening
Revises: 0002_drop_event_capacity
Create Date: 2026-10-29

* users.phone holds the mobile number in international format (+923001234567). It is
  unique across the platform, like email, so it can identify an account at login.
* failed_logins / locked_until lock an account for a while after too many wrong
  passwords, which stops password guessing.
* Login happens before the company is known, so both look-up and the failure counter
  run through SECURITY DEFINER functions that expose only what login needs.
"""

from alembic import op

revision = "0003_auth_hardening"
down_revision = "0002_drop_event_capacity"
branch_labels = None
depends_on = None

APP_ROLE = "pulse_app"

UPGRADE = [
    "ALTER TABLE users ADD COLUMN phone text",
    "ALTER TABLE users ADD COLUMN failed_logins integer NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN locked_until timestamptz",
    "ALTER TABLE users ADD COLUMN password_changed_at timestamptz NOT NULL DEFAULT now()",
    "ALTER TABLE users ADD CONSTRAINT users_phone_format CHECK (phone IS NULL OR phone ~ '^\\+[0-9]{8,15}$')",
    "CREATE UNIQUE INDEX users_phone_unique ON users (phone) WHERE phone IS NOT NULL",
    "DROP FUNCTION IF EXISTS auth_find_user(text)",
    """
    CREATE FUNCTION auth_find_user(p_email text, p_phone text)
    RETURNS TABLE (id uuid, company_id uuid, full_name text, email text, password_hash text,
                   role text, is_active boolean, locked_until timestamptz)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
        SELECT u.id, u.company_id, u.full_name, u.email, u.password_hash, u.role, u.is_active,
               u.locked_until
        FROM users u
        WHERE (p_email IS NOT NULL AND lower(u.email) = lower(p_email))
           OR (p_phone IS NOT NULL AND u.phone = p_phone)
        LIMIT 1
    $$
    """,
    """
    CREATE FUNCTION auth_record_login(p_user uuid, p_success boolean, p_max integer, p_lock_minutes integer)
    RETURNS timestamptz
    LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
    DECLARE
        result timestamptz;
    BEGIN
        IF p_success THEN
            UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = p_user;
            RETURN NULL;
        END IF;
        UPDATE users
           SET failed_logins = CASE WHEN failed_logins + 1 >= p_max THEN 0 ELSE failed_logins + 1 END,
               locked_until  = CASE WHEN failed_logins + 1 >= p_max
                                    THEN now() + make_interval(mins => p_lock_minutes)
                                    ELSE locked_until END
         WHERE id = p_user
        RETURNING locked_until INTO result;
        RETURN result;
    END
    $$
    """,
    "REVOKE ALL ON FUNCTION auth_find_user(text, text) FROM PUBLIC",
    "REVOKE ALL ON FUNCTION auth_record_login(uuid, boolean, integer, integer) FROM PUBLIC",
    f"GRANT EXECUTE ON FUNCTION auth_find_user(text, text) TO {APP_ROLE}",
    f"GRANT EXECUTE ON FUNCTION auth_record_login(uuid, boolean, integer, integer) TO {APP_ROLE}",
]

DOWNGRADE = [
    "DROP FUNCTION IF EXISTS auth_record_login(uuid, boolean, integer, integer)",
    "DROP FUNCTION IF EXISTS auth_find_user(text, text)",
    """
    CREATE FUNCTION auth_find_user(p_email text)
    RETURNS TABLE (id uuid, company_id uuid, password_hash text, role text, is_active boolean)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
        SELECT u.id, u.company_id, u.password_hash, u.role, u.is_active
        FROM users u WHERE lower(u.email) = lower(p_email)
    $$
    """,
    f"GRANT EXECUTE ON FUNCTION auth_find_user(text) TO {APP_ROLE}",
    "DROP INDEX IF EXISTS users_phone_unique",
    "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_format",
    "ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at",
    "ALTER TABLE users DROP COLUMN IF EXISTS locked_until",
    "ALTER TABLE users DROP COLUMN IF EXISTS failed_logins",
    "ALTER TABLE users DROP COLUMN IF EXISTS phone",
]


def upgrade() -> None:
    for statement in UPGRADE:
        op.execute(statement)


def downgrade() -> None:
    for statement in DOWNGRADE:
        op.execute(statement)
