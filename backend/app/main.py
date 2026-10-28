from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, companies, users
from app.core.ai_cache import warm_up
from app.core.config import settings
from app.modules.attendance import routes as attendance
from app.modules.attendance.ai.face import get_engine
from app.modules.bookings import routes as bookings
from app.modules.inventory import routes as inventory


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Load (or train on first run) the AI models in the background, so the first
    # request that needs one does not have to wait.
    warm_up([bookings.get_reader, inventory.get_predictor, get_engine])
    yield


app = FastAPI(
    title="PULSE API",
    description="Predictive Unified Logistics for Smart Events: multi-company backend.",
    version="0.2.0",
    lifespan=lifespan,
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
# Module routers
api.include_router(bookings.router)  # M1, Abdullah
api.include_router(inventory.router)  # M2, Amna
api.include_router(attendance.router)  # M3, Atiqa

app.include_router(api)
