from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_session, require_roles
from app.models import Company, User
from app.schemas.company import CompanyOut, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/me", response_model=CompanyOut)
def get_my_company(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Company:
    return session.get(Company, user.company_id)


@router.patch("/me", response_model=CompanyOut)
def update_my_company(
    body: CompanyUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(require_roles("owner")),
) -> Company:
    company = session.get(Company, user.company_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(company, field, value.strip() if isinstance(value, str) else value)
    session.flush()
    return company
