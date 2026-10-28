"""M1 Bookings & Live Event Board API."""

import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_session, require_roles
from app.core.ai_cache import get_model
from app.core.clock import company_today
from app.core.config import settings
from app.models import User
from app.modules.bookings.ai.reader import InquiryReader
from app.modules.bookings.ai.train import MODEL_FILE, train_and_save
from app.modules.bookings.models import Booking, BookingHistory, Client
from app.modules.bookings.schemas import (
    BookingCreate,
    BookingOut,
    BookingUpdate,
    Clash,
    ClashQuery,
    ClientIn,
    ClientOut,
    ClientUpdate,
    HistoryOut,
    InquiryIn,
    InquiryOut,
    ProgressIn,
    StatusIn,
)

router = APIRouter(prefix="/bookings", tags=["M1 bookings"])

VIEW = ("owner", "manager", "staff", "driver")
EDIT = ("owner", "manager")

# Allowed status changes. A booking cannot jump backwards except to cancel or reopen.
TRANSITIONS = {
    "inquiry": {"quoted", "confirmed", "cancelled"},
    "quoted": {"inquiry", "confirmed", "cancelled"},
    "confirmed": {"quoted", "in_progress", "cancelled"},
    "in_progress": {"completed", "confirmed"},
    "completed": {"in_progress"},
    "cancelled": {"inquiry"},
}


def get_reader() -> InquiryReader:
    path = Path(settings.ai_model_dir) / MODEL_FILE
    return get_model("inquiry_reader", lambda: InquiryReader.load(path), train_and_save)


# ---------------------------------------------------------------- helpers

def _log(session: Session, booking: Booking, actor: User, action: str, detail: str | None = None) -> None:
    session.add(
        BookingHistory(
            id=uuid.uuid4(), company_id=booking.company_id, booking_id=booking.id,
            actor_id=actor.id, action=action, detail=detail,
        )
    )


def _minutes(t) -> int:
    return t.hour * 60 + t.minute


def _window(x) -> tuple[int, int]:
    """Start and end in minutes after midnight. Events without an end are assumed to last four hours."""
    start = _minutes(x.start_time)
    end = _minutes(x.end_time) if x.end_time else min(start + 240, 24 * 60)
    return start, end


def _overlaps(a, b: Booking) -> bool:
    if not (a.start_time and b.start_time):
        return True  # unknown times on the same day: treat as overlapping
    a_start, a_end = _window(a)
    b_start, b_end = _window(b)
    return a_start < b_end and b_start < a_end


def find_clashes(session: Session, candidate, exclude_id: uuid.UUID | None = None) -> list[Clash]:
    """Bookings at the same venue whose times overlap on the same day."""
    rows = session.execute(
        select(Booking, Client.name)
        .join(Client, Client.id == Booking.client_id)
        .where(Booking.event_date == candidate.event_date, Booking.status != "cancelled")
    ).all()
    venue = candidate.venue.strip().lower()
    clashes = []
    for other, client_name in rows:
        if exclude_id and other.id == exclude_id:
            continue
        if other.venue.strip().lower() == venue and _overlaps(candidate, other):
            clashes.append(
                Clash(
                    booking_id=other.id, client_name=client_name, event_type=other.event_type, venue=other.venue,
                    start_time=other.start_time, end_time=other.end_time,
                    reason="Another event is booked at this venue at an overlapping time.",
                )
            )
    return clashes


def _out(session: Session, booking: Booking, with_clashes: bool = False) -> BookingOut:
    client = session.get(Client, booking.client_id)
    data = {c: getattr(booking, c) for c in BookingOut.model_fields if c not in ("client", "clashes")}
    out = BookingOut(**data, client=ClientOut.model_validate(client))
    if with_clashes and booking.status != "cancelled":
        out.clashes = find_clashes(session, booking, exclude_id=booking.id)
    return out


def _get_booking(session: Session, booking_id: uuid.UUID) -> Booking:
    booking = session.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found.")
    return booking


# ---------------------------------------------------------------- clients

@router.get("/clients", response_model=list[ClientOut])
def list_clients(
    q: str | None = Query(default=None, max_length=100),
    session: Session = Depends(get_session),
    _: User = Depends(require_roles(*VIEW)),
) -> list[Client]:
    stmt = select(Client).order_by(Client.name)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Client.name.ilike(like), Client.phone.ilike(like), Client.email.ilike(like)))
    return list(session.scalars(stmt.limit(200)))


@router.post("/clients", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(body: ClientIn, session: Session = Depends(get_session), user: User = Depends(require_roles(*EDIT))) -> Client:
    client = Client(id=uuid.uuid4(), company_id=user.company_id, **body.model_dump())
    session.add(client)
    session.flush()
    session.refresh(client)
    return client


@router.patch("/clients/{client_id}", response_model=ClientOut)
def update_client(
    client_id: uuid.UUID, body: ClientUpdate, session: Session = Depends(get_session), _: User = Depends(require_roles(*EDIT))
) -> Client:
    client = session.get(Client, client_id)
    if client is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    session.flush()
    return client


# ---------------------------------------------------------------- AI inquiry reader

@router.post("/parse-inquiry", response_model=InquiryOut)
def parse_inquiry(body: InquiryIn, _: User = Depends(require_roles(*EDIT))) -> dict:
    """Read a client's message and return the booking details it contains, for review."""
    reader = get_reader()
    result = reader.parse(body.text)
    metrics = reader.metrics or {}
    result["model"] = {
        "event_type_accuracy": metrics.get("synthetic_test", {}).get("event_type_accuracy"),
        "entity_f1": metrics.get("synthetic_test", {}).get("entity_f1_micro"),
        "handwritten_accuracy": metrics.get("handwritten_test", {}).get("overall"),
    }
    return result


@router.get("/reader-metrics")
def reader_metrics(_: User = Depends(require_roles(*EDIT))) -> dict:
    return get_reader().metrics


# ---------------------------------------------------------------- bookings

@router.get("", response_model=list[BookingOut])
def list_bookings(
    date_from: date | None = None,
    date_to: date | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, max_length=100),
    session: Session = Depends(get_session),
    _: User = Depends(require_roles(*VIEW)),
) -> list[BookingOut]:
    stmt = select(Booking).join(Client, Client.id == Booking.client_id).order_by(Booking.event_date, Booking.start_time)
    if date_from:
        stmt = stmt.where(Booking.event_date >= date_from)
    if date_to:
        stmt = stmt.where(Booking.event_date <= date_to)
    if status_filter:
        stmt = stmt.where(Booking.status == status_filter)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Client.name.ilike(like), Booking.venue.ilike(like), Client.phone.ilike(like)))
    return [_out(session, b) for b in session.scalars(stmt.limit(500))]


@router.post("/check-clashes", response_model=list[Clash])
def check_clashes(
    body: ClashQuery,
    exclude_id: uuid.UUID | None = None,
    session: Session = Depends(get_session),
    _: User = Depends(require_roles(*EDIT)),
) -> list[Clash]:
    return find_clashes(session, body, exclude_id)


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(body: BookingCreate, session: Session = Depends(get_session), user: User = Depends(require_roles(*EDIT))) -> BookingOut:
    if body.client is not None:
        client = Client(id=uuid.uuid4(), company_id=user.company_id, **body.client.model_dump())
        session.add(client)
        session.flush()
        client_id = client.id
    else:
        if session.get(Client, body.client_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found.")
        client_id = body.client_id
    fields = body.model_dump(exclude={"client", "client_id"})
    booking = Booking(id=uuid.uuid4(), company_id=user.company_id, client_id=client_id, created_by=user.id, **fields)
    session.add(booking)
    session.flush()
    _log(session, booking, user, "created", f"Status: {booking.status}")
    if booking.inquiry_text:
        _log(session, booking, user, "inquiry_read", "Details filled from the client's message by the AI reader")
    session.flush()
    session.refresh(booking)
    return _out(session, booking, with_clashes=True)


@router.get("/live", response_model=list[BookingOut])
def live_board(
    on: date | None = None, session: Session = Depends(get_session), user: User = Depends(require_roles(*VIEW))
) -> list[BookingOut]:
    """Every event of the day that is going ahead, in time order."""
    day = on or company_today(session, user.company_id)
    stmt = (
        select(Booking)
        .where(Booking.event_date == day, Booking.status.in_(("confirmed", "in_progress", "completed")))
        .order_by(Booking.start_time.nulls_last())
    )
    return [_out(session, b) for b in session.scalars(stmt)]


@router.get("/summary")
def summary(session: Session = Depends(get_session), user: User = Depends(require_roles(*VIEW))) -> dict:
    today = company_today(session, user.company_id)
    counts = dict(session.execute(select(Booking.status, func.count()).group_by(Booking.status)).all())
    upcoming = session.scalar(
        select(func.count()).select_from(Booking).where(
            Booking.event_date >= today, Booking.event_date <= today + timedelta(days=7), Booking.status != "cancelled"
        )
    )
    today_count = session.scalar(
        select(func.count()).select_from(Booking).where(
            Booking.event_date == today, Booking.status.in_(("confirmed", "in_progress", "completed"))
        )
    )
    return {"by_status": counts, "next_7_days": upcoming or 0, "today": today_count or 0}


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: uuid.UUID, session: Session = Depends(get_session), _: User = Depends(require_roles(*VIEW))) -> BookingOut:
    return _out(session, _get_booking(session, booking_id), with_clashes=True)


@router.patch("/{booking_id}", response_model=BookingOut)
def update_booking(
    booking_id: uuid.UUID, body: BookingUpdate, session: Session = Depends(get_session), user: User = Depends(require_roles(*EDIT))
) -> BookingOut:
    booking = _get_booking(session, booking_id)
    changes = body.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(booking, field, value)
    if booking.start_time and booking.end_time and booking.end_time <= booking.start_time:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The end time must be after the start time.")
    booking.updated_at = datetime.now(timezone.utc)
    if changes:
        _log(session, booking, user, "edited", ", ".join(sorted(changes)))
    session.flush()
    return _out(session, booking, with_clashes=True)


@router.post("/{booking_id}/status", response_model=BookingOut)
def change_status(
    booking_id: uuid.UUID, body: StatusIn, session: Session = Depends(get_session), user: User = Depends(require_roles(*EDIT))
) -> BookingOut:
    booking = _get_booking(session, booking_id)
    if body.status == booking.status:
        return _out(session, booking)
    if body.status not in TRANSITIONS[booking.status]:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"A booking that is {booking.status.replace('_', ' ')} cannot be moved to {body.status.replace('_', ' ')}.",
        )
    old = booking.status
    booking.status = body.status
    if body.status == "completed":
        booking.progress = "done"
    booking.updated_at = datetime.now(timezone.utc)
    _log(session, booking, user, "status", f"{old} → {body.status}")
    session.flush()
    return _out(session, booking)


@router.post("/{booking_id}/progress", response_model=BookingOut)
def change_progress(
    booking_id: uuid.UUID, body: ProgressIn, session: Session = Depends(get_session), user: User = Depends(require_roles(*VIEW))
) -> BookingOut:
    """Staff at the venue update how far the event has got."""
    booking = _get_booking(session, booking_id)
    if booking.status not in ("confirmed", "in_progress"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Only confirmed events can be updated on the live board.")
    old = booking.progress
    booking.progress = body.progress
    if booking.status == "confirmed" and body.progress != "scheduled":
        booking.status = "in_progress"
    if body.progress == "done":
        booking.status = "completed"
    booking.updated_at = datetime.now(timezone.utc)
    _log(session, booking, user, "progress", f"{old} → {body.progress}")
    session.flush()
    return _out(session, booking)


@router.get("/{booking_id}/history", response_model=list[HistoryOut])
def booking_history(booking_id: uuid.UUID, session: Session = Depends(get_session), _: User = Depends(require_roles(*VIEW))) -> list[HistoryOut]:
    _get_booking(session, booking_id)
    rows = session.execute(
        select(BookingHistory, User.full_name)
        .outerjoin(User, User.id == BookingHistory.actor_id)
        .where(BookingHistory.booking_id == booking_id)
        .order_by(BookingHistory.created_at)
    ).all()
    return [HistoryOut(id=h.id, action=h.action, detail=h.detail, actor_name=name, created_at=h.created_at) for h, name in rows]
