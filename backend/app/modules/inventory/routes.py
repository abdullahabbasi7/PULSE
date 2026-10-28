"""M2 QR Inventory & Crockery Custody API."""

import secrets
import uuid
from collections import defaultdict
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_session, require_roles
from app.core.ai_cache import get_model
from app.core.clock import company_today
from app.core.config import settings
from app.models import User
from app.modules.bookings.models import Booking, Client
from app.modules.inventory.ai.predictor import (
    CATEGORY_LABELS,
    MODEL_FILE,
    EquipmentPredictor,
    EventSpec,
    baseline,
    menu_features,
    train_and_save,
)
from app.modules.inventory.models import InventoryItem, ItemMovement
from app.modules.inventory.schemas import (
    Alert,
    ItemIn,
    ItemOut,
    ItemUpdate,
    MovementIn,
    MovementOut,
    PredictIn,
    PredictionLine,
    PredictOut,
    Reconciliation,
    ReconciliationLine,
)

router = APIRouter(prefix="/inventory", tags=["M2 inventory"])

VIEW = ("owner", "manager", "staff")
EDIT = ("owner", "manager")
QR_PREFIX = "PULSE:ITEM:"


def get_predictor() -> EquipmentPredictor:
    path = Path(settings.ai_model_dir) / MODEL_FILE
    return get_model("equipment_predictor", lambda: EquipmentPredictor.load(path), train_and_save)


# ---------------------------------------------------------------- stock helpers

def _outstanding_by_item(session: Session, item_ids: list[uuid.UUID] | None = None) -> dict[uuid.UUID, int]:
    """Pieces currently out at events: sent minus returned, damaged and lost."""
    signed = case(
        (ItemMovement.direction == "out", ItemMovement.quantity),
        else_=-(ItemMovement.quantity + ItemMovement.damaged),
    )
    stmt = select(ItemMovement.item_id, func.coalesce(func.sum(signed), 0)).group_by(ItemMovement.item_id)
    if item_ids is not None:
        stmt = stmt.where(ItemMovement.item_id.in_(item_ids))
    return {item_id: int(total) for item_id, total in session.execute(stmt)}


def _item_out(item: InventoryItem, out_now: int) -> ItemOut:
    available = max(0, item.total_quantity - out_now)
    return ItemOut(
        id=item.id, name=item.name, category=item.category, unit=item.unit, total_quantity=item.total_quantity,
        min_quantity=item.min_quantity, out_now=out_now, available=available, condition_note=item.condition_note,
        qr_token=item.qr_token, qr_payload=QR_PREFIX + item.qr_token, is_active=item.is_active,
        low_stock=item.is_active and available < item.min_quantity, created_at=item.created_at,
    )


def _find_item(session: Session, body: MovementIn) -> InventoryItem:
    if body.item_id is not None:
        item = session.get(InventoryItem, body.item_id, with_for_update=True)
    else:
        token = body.qr.strip()
        token = token[len(QR_PREFIX):] if token.upper().startswith(QR_PREFIX) else token
        item = session.scalar(select(InventoryItem).where(InventoryItem.qr_token == token).with_for_update())
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This QR code does not belong to any item in your inventory.")
    if not item.is_active:
        raise HTTPException(status.HTTP_409_CONFLICT, f"{item.name} is archived and cannot be moved.")
    return item


def _booking_outstanding(session: Session, item_id: uuid.UUID, booking_id: uuid.UUID) -> int:
    rows = session.execute(
        select(ItemMovement.direction, func.sum(ItemMovement.quantity), func.sum(ItemMovement.damaged))
        .where(ItemMovement.item_id == item_id, ItemMovement.booking_id == booking_id)
        .group_by(ItemMovement.direction)
    ).all()
    sent = sum(q for d, q, _ in rows if d == "out")
    back = sum(q + dmg for d, q, dmg in rows if d in ("in", "lost"))
    return int(sent - back)


# ---------------------------------------------------------------- items

@router.get("/items", response_model=list[ItemOut])
def list_items(
    include_archived: bool = False,
    session: Session = Depends(get_session),
    _: User = Depends(require_roles(*VIEW)),
) -> list[ItemOut]:
    stmt = select(InventoryItem).order_by(InventoryItem.category, InventoryItem.name)
    if not include_archived:
        stmt = stmt.where(InventoryItem.is_active.is_(True))
    items = list(session.scalars(stmt))
    out = _outstanding_by_item(session)
    return [_item_out(i, out.get(i.id, 0)) for i in items]


@router.post("/items", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(body: ItemIn, session: Session = Depends(get_session), user: User = Depends(require_roles(*EDIT))) -> ItemOut:
    item = InventoryItem(id=uuid.uuid4(), company_id=user.company_id, qr_token=secrets.token_urlsafe(9), **body.model_dump())
    session.add(item)
    session.flush()
    session.refresh(item)
    return _item_out(item, 0)


@router.patch("/items/{item_id}", response_model=ItemOut)
def update_item(
    item_id: uuid.UUID, body: ItemUpdate, session: Session = Depends(get_session), _: User = Depends(require_roles(*EDIT))
) -> ItemOut:
    item = session.get(InventoryItem, item_id, with_for_update=True)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found.")
    changes = body.model_dump(exclude_unset=True)
    out_now = _outstanding_by_item(session, [item.id]).get(item.id, 0)
    if "total_quantity" in changes and changes["total_quantity"] < out_now:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"{out_now} {item.unit} are still out at events, so the total cannot be lower than that."
        )
    for field, value in changes.items():
        setattr(item, field, value)
    session.flush()
    return _item_out(item, out_now)


@router.get("/items/by-qr/{qr}", response_model=ItemOut)
def item_by_qr(qr: str, session: Session = Depends(get_session), _: User = Depends(require_roles(*VIEW))) -> ItemOut:
    token = qr[len(QR_PREFIX):] if qr.upper().startswith(QR_PREFIX) else qr
    item = session.scalar(select(InventoryItem).where(InventoryItem.qr_token == token))
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This QR code does not belong to any item in your inventory.")
    return _item_out(item, _outstanding_by_item(session, [item.id]).get(item.id, 0))


# ---------------------------------------------------------------- movements

@router.post("/movements", response_model=MovementOut, status_code=status.HTTP_201_CREATED)
def record_movement(body: MovementIn, session: Session = Depends(get_session), user: User = Depends(require_roles(*VIEW))) -> MovementOut:
    """Scan items out to an event, back in (with any damaged pieces), or write off lost pieces."""
    booking = session.get(Booking, body.booking_id)
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found.")
    item = _find_item(session, body)  # locks the item row so two scans cannot overdraw it

    if body.direction == "out":
        if booking.status == "cancelled":
            raise HTTPException(status.HTTP_409_CONFLICT, "This booking is cancelled.")
        available = item.total_quantity - _outstanding_by_item(session, [item.id]).get(item.id, 0)
        if body.quantity > available:
            raise HTTPException(status.HTTP_409_CONFLICT, f"Only {max(available, 0)} {item.unit} of {item.name} are available.")
    else:
        outstanding = _booking_outstanding(session, item.id, booking.id)
        if body.quantity + body.damaged > outstanding:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Only {outstanding} {item.unit} of {item.name} are still out for this event.",
            )
        # Broken and lost pieces leave the stock for good.
        item.total_quantity -= body.damaged if body.direction == "in" else body.quantity

    movement = ItemMovement(
        id=uuid.uuid4(), company_id=user.company_id, item_id=item.id, booking_id=booking.id,
        direction=body.direction, quantity=body.quantity, damaged=body.damaged, note=body.note, recorded_by=user.id,
    )
    session.add(movement)
    session.flush()
    session.refresh(movement)
    return MovementOut(
        id=movement.id, item_id=item.id, item_name=item.name, booking_id=booking.id, direction=movement.direction,
        quantity=movement.quantity, damaged=movement.damaged, note=movement.note, recorded_by_name=user.full_name,
        created_at=movement.created_at,
    )


@router.get("/movements", response_model=list[MovementOut])
def list_movements(
    booking_id: uuid.UUID | None = None,
    limit: int = Query(default=100, le=500),
    session: Session = Depends(get_session),
    _: User = Depends(require_roles(*VIEW)),
) -> list[MovementOut]:
    stmt = (
        select(ItemMovement, InventoryItem.name, User.full_name)
        .join(InventoryItem, InventoryItem.id == ItemMovement.item_id)
        .outerjoin(User, User.id == ItemMovement.recorded_by)
        .order_by(ItemMovement.created_at.desc())
        .limit(limit)
    )
    if booking_id:
        stmt = stmt.where(ItemMovement.booking_id == booking_id)
    return [
        MovementOut(
            id=m.id, item_id=m.item_id, item_name=name, booking_id=m.booking_id, direction=m.direction, quantity=m.quantity,
            damaged=m.damaged, note=m.note, recorded_by_name=who, created_at=m.created_at,
        )
        for m, name, who in session.execute(stmt)
    ]


@router.get("/bookings/{booking_id}/reconciliation", response_model=Reconciliation)
def reconciliation(booking_id: uuid.UUID, session: Session = Depends(get_session), _: User = Depends(require_roles(*VIEW))) -> Reconciliation:
    """What went to an event, what came back, and who took out what is still missing."""
    booking = session.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found.")
    client = session.get(Client, booking.client_id)
    rows = session.execute(
        select(ItemMovement, InventoryItem, User.full_name)
        .join(InventoryItem, InventoryItem.id == ItemMovement.item_id)
        .outerjoin(User, User.id == ItemMovement.recorded_by)
        .where(ItemMovement.booking_id == booking_id)
        .order_by(ItemMovement.created_at)
    ).all()
    lines: dict[uuid.UUID, dict] = {}
    for m, item, who in rows:
        line = lines.setdefault(item.id, {
            "item_id": item.id, "item_name": item.name, "category": item.category,
            "sent": 0, "returned": 0, "damaged": 0, "lost": 0, "sent_by": [],
        })
        if m.direction == "out":
            line["sent"] += m.quantity
            if who and who not in line["sent_by"]:
                line["sent_by"].append(who)
        elif m.direction == "in":
            line["returned"] += m.quantity
            line["damaged"] += m.damaged
        else:
            line["lost"] += m.quantity
    result = []
    for line in lines.values():
        line["outstanding"] = line["sent"] - line["returned"] - line["damaged"] - line["lost"]
        result.append(ReconciliationLine(**line))
    return Reconciliation(
        booking_id=booking.id, client_name=client.name, event_date=booking.event_date, venue=booking.venue, lines=result,
        total_sent=sum(r.sent for r in result), total_outstanding=sum(r.outstanding for r in result),
        total_damaged=sum(r.damaged for r in result), total_lost=sum(r.lost for r in result),
    )


@router.get("/alerts", response_model=list[Alert])
def alerts(session: Session = Depends(get_session), user: User = Depends(require_roles(*VIEW))) -> list[Alert]:
    found: list[Alert] = []
    items = list(session.scalars(select(InventoryItem).where(InventoryItem.is_active.is_(True))))
    out = _outstanding_by_item(session)
    for item in items:
        available = item.total_quantity - out.get(item.id, 0)
        if available < item.min_quantity:
            found.append(Alert(
                kind="low_stock", item_id=item.id,
                message=f"{item.name}: only {max(available, 0)} {item.unit} available (minimum {item.min_quantity}).",
            ))
    # Items still out for events that have already happened.
    signed = case((ItemMovement.direction == "out", ItemMovement.quantity), else_=-(ItemMovement.quantity + ItemMovement.damaged))
    overdue = session.execute(
        select(Booking.id, Booking.event_date, Client.name, func.sum(signed))
        .join(ItemMovement, ItemMovement.booking_id == Booking.id)
        .join(Client, Client.id == Booking.client_id)
        .where(Booking.event_date < company_today(session, user.company_id))
        .group_by(Booking.id, Booking.event_date, Client.name)
        .having(func.sum(signed) > 0)
    ).all()
    for booking_id, event_date, client_name, pieces in overdue:
        found.append(Alert(
            kind="not_returned", booking_id=booking_id,
            message=f"{int(pieces)} pieces from {client_name}'s event on {event_date:%d %b} have not come back.",
        ))
    return found


# ---------------------------------------------------------------- AI equipment predictor

@router.post("/predict", response_model=PredictOut)
def predict(body: PredictIn, session: Session = Depends(get_session), _: User = Depends(require_roles(*VIEW))) -> PredictOut:
    """Predict the equipment an event needs and compare it with the stock available."""
    guest_count, event_type, menu = body.guest_count, body.event_type or "other", body.menu or ""
    if body.booking_id:
        booking = session.get(Booking, body.booking_id)
        if booking is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found.")
        guest_count = body.guest_count or booking.guest_count
        event_type = body.event_type or booking.event_type
        menu = body.menu if body.menu is not None else (booking.menu or "")
    spec = EventSpec(guest_count=guest_count, event_type=event_type, service_style=body.service_style, menu=menu)
    predictor = get_predictor()
    predicted = predictor.predict(spec)
    rule = baseline(spec)

    items = list(session.scalars(select(InventoryItem).where(InventoryItem.is_active.is_(True))))
    out = _outstanding_by_item(session)
    available = defaultdict(int)
    for item in items:
        available[item.category] += max(0, item.total_quantity - out.get(item.id, 0))

    lines = [
        PredictionLine(
            category=cat, label=CATEGORY_LABELS[cat], predicted=predicted[cat], rule_of_thumb=rule[cat],
            available=available[cat], shortfall=max(0, predicted[cat] - available[cat]),
        )
        for cat in CATEGORY_LABELS
        if predicted[cat] > 0 or rule[cat] > 0
    ]
    metrics = predictor.metrics or {}
    return PredictOut(
        guest_count=guest_count, event_type=event_type, service_style=body.service_style,
        menu_summary=menu_features(menu), lines=lines,
        model={
            "model_error": metrics.get("model_error"), "baseline_error": metrics.get("baseline_error"),
            "error_reduction": metrics.get("error_reduction"),
        },
    )


@router.get("/predictor-metrics")
def predictor_metrics(_: User = Depends(require_roles(*VIEW))) -> dict:
    return get_predictor().metrics
