"""Database engine, sessions and the per-request company context.

Every company's rows are protected by PostgreSQL row-level security. Before
touching tenant data, a transaction must call `set_current_company`, which sets
`app.company_id` for that transaction only. The setting disappears at commit,
so routes must use `session.flush()` and never call `session.commit()`.
"""

import uuid

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def set_current_company(session: Session, company_id: uuid.UUID | str) -> None:
    session.execute(
        text("SELECT set_config('app.company_id', :company_id, true)"),
        {"company_id": str(company_id)},
    )
