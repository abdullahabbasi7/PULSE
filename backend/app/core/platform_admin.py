"""Owner-level helpers for the PULSE team: create platform admins and set company status.

These use the migration (owner) connection, not the app role, because the app role has
no access to platform_admins and cannot write a company's status. Only command-line
scripts call them; no API route does.
"""

import uuid

from sqlalchemy import create_engine, text

from app.core.config import settings
from app.core.passwords import password_problems
from app.core.security import hash_password


def owner_engine():
    return create_engine(settings.migration_database_url)


def create_admin(email: str, full_name: str, password: str) -> tuple[uuid.UUID, bool]:
    """Create a platform admin (or reset an existing one's password). Returns (id, created)."""
    problems = password_problems(password, email=email, full_name=full_name)
    if problems:
        raise ValueError(" ".join(problems))
    with owner_engine().begin() as conn:
        existing = conn.execute(text("SELECT id FROM platform_admins WHERE lower(email) = lower(:e)"), {"e": email}).scalar()
        if existing:
            conn.execute(
                text("UPDATE platform_admins SET password_hash = :h, full_name = :n, is_active = true WHERE id = :id"),
                {"h": hash_password(password), "n": full_name, "id": existing},
            )
            return existing, False
        admin_id = uuid.uuid4()
        conn.execute(
            text("INSERT INTO platform_admins (id, email, full_name, password_hash) VALUES (:id, :e, :n, :h)"),
            {"id": admin_id, "e": email.strip(), "n": full_name, "h": hash_password(password)},
        )
        return admin_id, True


def set_company_status(company_id: uuid.UUID, status: str, note: str | None = None) -> None:
    with owner_engine().begin() as conn:
        conn.execute(text("SELECT platform_set_company_status(:c, :s, :n, NULL)"), {"c": company_id, "s": status, "n": note})
