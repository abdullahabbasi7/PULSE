from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, companies, users
from app.core.config import settings

app = FastAPI(
    title="PULSE API",
    description="Predictive Unified Logistics for Smart Events: multi-company backend.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api/v1")


@api.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


api.include_router(auth.router)
api.include_router(companies.router)
api.include_router(users.router)
# Module routers are added here as they are built:
# api.include_router(bookings.router)    # M1, Abdullah
# api.include_router(inventory.router)   # M2, Amna
# api.include_router(attendance.router)  # M3, Atiqa

app.include_router(api)
