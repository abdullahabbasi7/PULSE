"""M3 Face-Recognition Attendance & Workforce Registry API."""

import csv
import io
import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import get_session, require_roles
from app.core.clock import company_now, company_zone
from app.models import User
from app.modules.attendance.ai.face import (
    DUPLICATE_THRESHOLD,
    FaceError,
    cosine,
    get_engine,
    identify,
    liveness,
)
from app.modules.attendance.models import AttendanceLog, FaceEmbedding, StaffMember
from app.modules.attendance.schemas import (
    CheckIn,
    CheckOut,
    EnrollIn,
    EnrollOut,
    LogOut,
    ManualIn,
    Sheet,
    SheetRow,
    StaffIn,
    StaffOut,
    StaffUpdate,
)
from app.modules.bookings.models import Booking

router = APIRouter(prefix="/attendance", tags=["M3 attendance"])

VIEW = ("owner", "manager", "accounts", "staff")
MANAGE = ("owner", "manager")
KIOSK = ("owner", "manager", "staff")
REPORTS = ("owner", "manager", "accounts")


def _staff(session: Session, staff_id: uuid.UUID) -> StaffMember:
    member = session.get(StaffMember, staff_id)
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff member not found.")
    return member


def _gallery(session: Session, exclude: uuid.UUID | None = None) -> dict[uuid.UUID, list[np.ndarray]]:
    rows = session.execute(
        select(FaceEmbedding.staff_id, FaceEmbedding.embedding)
        .join(StaffMember, StaffMember.id == FaceEmbedding.staff_id)
        .where(StaffMember.is_active.is_(True))
    ).all()
    gallery: dict[uuid.UUID, list[np.ndarray]] = {}
    for staff_id, blob in rows:
        if staff_id != exclude:
            gallery.setdefault(staff_id, []).append(np.frombuffer(blob, dtype=np.float32))
    return gallery


def _day_bounds(session: Session, company_id: uuid.UUID, day: date) -> tuple[datetime, datetime]:
    zone = company_zone(session, company_id)
    start = datetime.combine(day, time.min, tzinfo=zone)
    return start.astimezone(timezone.utc), (start + timedelta(days=1)).astimezone(timezone.utc)


# ---------------------------------------------------------------- staff registry

@router.get("/staff", response_model=list[StaffOut])
def list_staff(
    include_inactive: bool = False, session: Session = Depends(get_session), _: User = Depends(require_roles(*VIEW))
) -> list[StaffMember]:
    stmt = select(StaffMember).order_by(StaffMember.full_name)
    if not include_inactive:
        stmt = stmt.where(StaffMember.is_active.is_(True))
    return list(session.scalars(stmt))


@router.post("/staff", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
def create_staff(body: StaffIn, session: Session = Depends(get_session), user: User = Depends(require_roles(*MANAGE))) -> StaffMember:
    member = StaffMember(id=uuid.uuid4(), company_id=user.company_id, **body.model_dump())
    session.add(member)
    session.flush()
    session.refresh(member)
    return member


@router.patch("/staff/{staff_id}", response_model=StaffOut)
def update_staff(
    staff_id: uuid.UUID, body: StaffUpdate, session: Session = Depends(get_session), _: User = Depends(require_roles(*MANAGE))
) -> StaffMember:
    member = _staff(session, staff_id)
    changes = body.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(member, field, value)
    if changes.get("face_consent") is False or changes.get("is_active") is False:
        # Withdrawn consent or a departed worker: their face data is deleted.
        session.execute(delete(FaceEmbedding).where(FaceEmbedding.staff_id == member.id))
        member.face_enrolled_at = None
    session.flush()
    return member


@router.delete("/staff/{staff_id}/face", response_model=StaffOut)
def delete_face(staff_id: uuid.UUID, session: Session = Depends(get_session), _: User = Depends(require_roles(*MANAGE))) -> StaffMember:
    member = _staff(session, staff_id)
    session.execute(delete(FaceEmbedding).where(FaceEmbedding.staff_id == member.id))
    member.face_enrolled_at = None
    session.flush()
    return member


@router.post("/staff/{staff_id}/enroll", response_model=EnrollOut)
def enroll_face(
    staff_id: uuid.UUID, body: EnrollIn, session: Session = Depends(get_session), user: User = Depends(require_roles(*MANAGE))
) -> EnrollOut:
    """Register a staff member's face from 3 to 6 webcam photos."""
    member = _staff(session, staff_id)
    if not member.face_consent:
        raise HTTPException(status.HTTP_409_CONFLICT, "Record the staff member's consent before registering their face.")
    engine = get_engine()
    embeddings: list[np.ndarray] = []
    for n, data in enumerate(body.images, start=1):
        try:
            img = engine.decode(data)
            face = engine.single_face(img)
            problem = engine.quality_problem(img, face)
            if problem:
                raise FaceError(problem)
            embeddings.append(engine.embed(img, face))
        except FaceError as error:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Photo {n}: {error}") from None

    consistency = min(cosine(a, b) for i, a in enumerate(embeddings) for b in embeddings[i + 1 :])
    if consistency < 0.5:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The photos do not look like the same person. Take them again.")

    mean = np.mean(embeddings, axis=0)
    for other_id, others in _gallery(session, exclude=member.id).items():
        if max(cosine(mean, e) for e in others) >= DUPLICATE_THRESHOLD:
            other = session.get(StaffMember, other_id)
            raise HTTPException(status.HTTP_409_CONFLICT, f"This face is already registered to {other.full_name}.")

    session.execute(delete(FaceEmbedding).where(FaceEmbedding.staff_id == member.id))
    for emb in embeddings:
        session.add(FaceEmbedding(
            id=uuid.uuid4(), company_id=user.company_id, staff_id=member.id,
            embedding=emb.astype(np.float32).tobytes(), quality=round(consistency, 3),
        ))
    member.face_enrolled_at = datetime.now(timezone.utc)
    session.flush()
    return EnrollOut(staff=StaffOut.model_validate(member), photos_used=len(embeddings), consistency=round(consistency, 3))


# ---------------------------------------------------------------- check-in

@router.post("/check", response_model=CheckOut)
def face_check(body: CheckIn, session: Session = Depends(get_session), user: User = Depends(require_roles(*KIOSK))) -> CheckOut:
    """Check a staff member in or out by face, with a head-turn liveness challenge."""
    if body.booking_id and session.get(Booking, body.booking_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found.")
    engine = get_engine()
    faces = []
    for data in body.frames:
        try:
            img = engine.decode(data)
            faces.append((img, engine.single_face(img)))
        except FaceError:
            continue  # a frame without a usable face is skipped
    if len(faces) < 3:
        return CheckOut(ok=False, kind=body.kind, match_score=0, liveness_passed=False, liveness_score=0,
                        message="Your face was not visible in enough frames. Look at the camera and try again.")

    alive, spread = liveness([face.yaw_ratio for _, face in faces])
    if not alive:
        return CheckOut(ok=False, kind=body.kind, match_score=0, liveness_passed=False, liveness_score=spread,
                        message="Liveness check failed. Turn your head slowly when asked; photos and screens are not accepted.")

    frontal_img, frontal = min(faces, key=lambda pair: abs(pair[1].yaw_ratio))
    problem = engine.quality_problem(frontal_img, frontal)
    if problem:
        return CheckOut(ok=False, kind=body.kind, match_score=0, liveness_passed=True, liveness_score=spread, message=problem)
    probe = engine.embed(frontal_img, frontal)

    # The person who turned must be the person who faced the camera.
    turned_img, turned = max(faces, key=lambda pair: abs(pair[1].yaw_ratio))
    if cosine(probe, engine.embed(turned_img, turned)) < 0.3:
        return CheckOut(ok=False, kind=body.kind, match_score=0, liveness_passed=False, liveness_score=spread,
                        message="A different face appeared during the check. Try again with only one person in view.")

    staff_id, best, _second = identify(probe, _gallery(session))
    if staff_id is None:
        return CheckOut(ok=False, kind=body.kind, match_score=round(best, 3), liveness_passed=True, liveness_score=spread,
                        message="Face not recognised. Ask a manager to register your face, or try again in better light.")
    member = session.get(StaffMember, staff_id)

    start, end = _day_bounds(session, user.company_id, company_now(session, user.company_id).date())
    last = session.scalar(
        select(AttendanceLog).where(AttendanceLog.staff_id == staff_id, AttendanceLog.logged_at >= start,
                                    AttendanceLog.logged_at < end).order_by(AttendanceLog.logged_at.desc())
    )
    zone = company_zone(session, user.company_id)
    if last is not None and last.kind == body.kind:
        when = last.logged_at.astimezone(zone).strftime("%H:%M")
        word = "in" if body.kind == "in" else "out"
        return CheckOut(ok=False, staff=StaffOut.model_validate(member), kind=body.kind, match_score=round(best, 3),
                        liveness_passed=True, liveness_score=spread,
                        message=f"{member.full_name} already checked {word} at {when}.")
    if last is None and body.kind == "out":
        return CheckOut(ok=False, staff=StaffOut.model_validate(member), kind=body.kind, match_score=round(best, 3),
                        liveness_passed=True, liveness_score=spread,
                        message=f"{member.full_name} has not checked in today.")

    log = AttendanceLog(
        id=uuid.uuid4(), company_id=user.company_id, staff_id=staff_id, kind=body.kind, booking_id=body.booking_id,
        site=body.site, method="face", match_score=round(best, 4), liveness_score=spread, recorded_by=user.id,
    )
    session.add(log)
    session.flush()
    session.refresh(log)
    local = log.logged_at.astimezone(zone).strftime("%H:%M")
    verb = "checked in" if body.kind == "in" else "checked out"
    return CheckOut(ok=True, staff=StaffOut.model_validate(member), kind=body.kind, match_score=round(best, 3),
                    liveness_passed=True, liveness_score=spread, message=f"{member.full_name} {verb} at {local}.",
                    logged_at=log.logged_at)


@router.post("/manual", response_model=LogOut, status_code=status.HTTP_201_CREATED)
def manual_entry(body: ManualIn, session: Session = Depends(get_session), user: User = Depends(require_roles(*MANAGE))) -> LogOut:
    """Mark attendance by hand when face check-in is not possible. A reason is required."""
    member = _staff(session, body.staff_id)
    log = AttendanceLog(
        id=uuid.uuid4(), company_id=user.company_id, staff_id=member.id, kind=body.kind,
        logged_at=body.at or datetime.now(timezone.utc), booking_id=body.booking_id, site=body.site,
        method="manual", note=body.note.strip(), recorded_by=user.id,
    )
    session.add(log)
    session.flush()
    zone = company_zone(session, user.company_id)
    return _log_out(log, member.full_name, zone)


def _log_out(log: AttendanceLog, name: str, zone) -> LogOut:
    return LogOut(
        id=log.id, staff_id=log.staff_id, staff_name=name, kind=log.kind, logged_at=log.logged_at,
        local_time=log.logged_at.astimezone(zone).strftime("%H:%M"), method=log.method, match_score=log.match_score,
        liveness_score=log.liveness_score, site=log.site, booking_id=log.booking_id, note=log.note,
    )


# ---------------------------------------------------------------- reports

@router.get("/logs", response_model=list[LogOut])
def logs(day: date | None = None, session: Session = Depends(get_session), user: User = Depends(require_roles(*VIEW))) -> list[LogOut]:
    day = day or company_now(session, user.company_id).date()
    start, end = _day_bounds(session, user.company_id, day)
    zone = company_zone(session, user.company_id)
    rows = session.execute(
        select(AttendanceLog, StaffMember.full_name)
        .join(StaffMember, StaffMember.id == AttendanceLog.staff_id)
        .where(AttendanceLog.logged_at >= start, AttendanceLog.logged_at < end)
        .order_by(AttendanceLog.logged_at.desc())
    ).all()
    return [_log_out(log, name, zone) for log, name in rows]


@router.get("/sheet", response_model=Sheet)
def daily_sheet(
    day: date | None = None,
    late_after: time = Query(default=time(9, 30)),
    session: Session = Depends(get_session),
    user: User = Depends(require_roles(*VIEW)),
) -> Sheet:
    """Who is present, late or absent on a day, with first check-in and last check-out."""
    day = day or company_now(session, user.company_id).date()
    start, end = _day_bounds(session, user.company_id, day)
    zone = company_zone(session, user.company_id)
    staff = list(session.scalars(select(StaffMember).where(StaffMember.is_active.is_(True)).order_by(StaffMember.full_name)))
    logs_by_staff: dict[uuid.UUID, list[AttendanceLog]] = {}
    for log in session.scalars(
        select(AttendanceLog).where(AttendanceLog.logged_at >= start, AttendanceLog.logged_at < end).order_by(AttendanceLog.logged_at)
    ):
        logs_by_staff.setdefault(log.staff_id, []).append(log)

    rows = []
    for member in staff:
        entries = logs_by_staff.get(member.id, [])
        ins = [e.logged_at for e in entries if e.kind == "in"]
        outs = [e.logged_at for e in entries if e.kind == "out"]
        if not ins:
            rows.append(SheetRow(staff=StaffOut.model_validate(member), status="absent", first_in=None, last_out=None, hours=None))
            continue
        first_in = min(ins).astimezone(zone)
        last_out = max(outs).astimezone(zone) if outs else None
        hours = round((last_out - first_in).total_seconds() / 3600, 2) if last_out and last_out > first_in else None
        if entries[-1].kind == "out":
            state = "checked_out"
        else:
            state = "late" if first_in.time() > late_after else "present"
        rows.append(SheetRow(
            staff=StaffOut.model_validate(member), status=state, first_in=first_in.strftime("%H:%M"),
            last_out=last_out.strftime("%H:%M") if last_out else None, hours=hours,
        ))
    late_count = sum(1 for r in rows if r.status == "late" or (r.first_in and r.first_in > late_after.strftime("%H:%M")))
    return Sheet(
        day=day, late_after=late_after, rows=rows,
        present=sum(1 for r in rows if r.status != "absent"), late=late_count,
        absent=sum(1 for r in rows if r.status == "absent"),
    )


@router.get("/export")
def export_wages(
    date_from: date, date_to: date, session: Session = Depends(get_session), user: User = Depends(require_roles(*REPORTS))
) -> Response:
    """CSV of days present and wages earned per staff member, for the accounts team."""
    if date_to < date_from or (date_to - date_from).days > 92:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Choose a range of up to three months.")
    start, _ = _day_bounds(session, user.company_id, date_from)
    _, end = _day_bounds(session, user.company_id, date_to)
    zone = company_zone(session, user.company_id)
    days: dict[uuid.UUID, set[date]] = {}
    for log in session.scalars(
        select(AttendanceLog).where(AttendanceLog.kind == "in", AttendanceLog.logged_at >= start, AttendanceLog.logged_at < end)
    ):
        days.setdefault(log.staff_id, set()).add(log.logged_at.astimezone(zone).date())

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Staff member", "Designation", "Phone", "Days present", "Daily wage", "Wages earned"])
    for member in session.scalars(select(StaffMember).order_by(StaffMember.full_name)):
        present = len(days.get(member.id, ()))
        if present == 0 and not member.is_active:
            continue
        writer.writerow([member.full_name, member.designation, member.phone or "", present,
                         f"{member.daily_wage:.2f}", f"{member.daily_wage * Decimal(present):.2f}"])
    filename = f"attendance-wages-{date_from:%Y%m%d}-{date_to:%Y%m%d}.csv"
    return Response(buffer.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})
