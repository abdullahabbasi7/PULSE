"""M3 Face-Recognition Attendance. Uses two public sample photos (OpenCV sample data)."""

import base64
from datetime import date
from pathlib import Path

import cv2
import numpy as np
import pytest

from app.modules.attendance import routes as attendance_routes
from app.modules.attendance.ai.face import identify, liveness

FIXTURES = Path(__file__).parent / "fixtures"


def _data_url(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    assert ok
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()


def _variants(name: str, n: int = 3) -> list[str]:
    """The same photo with small changes in brightness, scale and position."""
    img = cv2.imread(str(FIXTURES / name))
    out = []
    for i in range(n):
        v = cv2.convertScaleAbs(img, alpha=1.0 - 0.06 * i, beta=6 * i)
        h, w = v.shape[:2]
        m = cv2.getRotationMatrix2D((w / 2, h / 2), 2 * i - 2, 1.0 + 0.03 * i)
        out.append(_data_url(cv2.warpAffine(v, m, (w, h), borderMode=cv2.BORDER_REPLICATE)))
    return out


def _staff(client, headers, name="Bilal Ahmed", consent=True):
    r = client.post("/api/v1/attendance/staff", headers=headers,
                    json={"full_name": name, "designation": "Waiter", "daily_wage": "2500", "face_consent": consent})
    assert r.status_code == 201, r.text
    return r.json()


def test_liveness_and_matching_rules():
    assert liveness([0.01, 0.12, 0.26])[0] is True          # head turned
    assert liveness([0.10, 0.11, 0.12, 0.10])[0] is False   # flat photo
    probe = np.ones(128, dtype=np.float32) / np.sqrt(128)
    other = np.roll(probe * np.linspace(0, 2, 128), 5).astype(np.float32)
    person, best, _ = identify(probe, {"a": [probe], "b": [other]})
    assert person == "a" and best > 0.99
    assert identify(probe, {"b": [-probe]})[0] is None


def test_enrolment_needs_consent_and_rejects_duplicates(client, new_company):
    owner, _ = new_company()
    no_consent = _staff(client, owner, "No Consent", consent=False)
    r = client.post(f"/api/v1/attendance/staff/{no_consent['id']}/enroll", headers=owner, json={"images": _variants("person_a.jpg")})
    assert r.status_code == 409

    a = _staff(client, owner, "Person A")
    r = client.post(f"/api/v1/attendance/staff/{a['id']}/enroll", headers=owner, json={"images": _variants("person_a.jpg")})
    assert r.status_code == 200, r.text
    assert r.json()["photos_used"] == 3 and r.json()["consistency"] > 0.8

    b = _staff(client, owner, "Person B")
    assert client.post(f"/api/v1/attendance/staff/{b['id']}/enroll", headers=owner,
                       json={"images": _variants("person_b.jpg")}).status_code == 200
    copy = _staff(client, owner, "Impostor")
    dup = client.post(f"/api/v1/attendance/staff/{copy['id']}/enroll", headers=owner, json={"images": _variants("person_a.jpg")})
    assert dup.status_code == 409 and "Person A" in dup.text

    blank = np.full((480, 640, 3), 128, np.uint8)
    no_face = client.post(f"/api/v1/attendance/staff/{copy['id']}/enroll", headers=owner, json={"images": [_data_url(blank)] * 3})
    assert no_face.status_code == 422 and "No face" in no_face.text


def test_photo_held_up_to_camera_fails_liveness(client, new_company):
    owner, _ = new_company()
    a = _staff(client, owner, "Person A")
    client.post(f"/api/v1/attendance/staff/{a['id']}/enroll", headers=owner, json={"images": _variants("person_a.jpg")})
    # A printed photo moved and tilted in front of the camera: the face never turns.
    r = client.post("/api/v1/attendance/check", headers=owner, json={"kind": "in", "frames": _variants("person_a.jpg", 5)})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False and body["liveness_passed"] is False
    assert client.get("/api/v1/attendance/logs", headers=owner).json() == []


@pytest.fixture
def live(monkeypatch):
    """Pretend the head-turn challenge passed, to test recognition and logging on still photos."""
    monkeypatch.setattr(attendance_routes, "liveness", lambda ratios: (True, 0.3))


def test_face_check_in_out_sheet_and_wage_export(client, new_company, live):
    owner, _ = new_company()
    a = _staff(client, owner, "Person A")
    b = _staff(client, owner, "Person B")
    for staff, photo in ((a, "person_a.jpg"), (b, "person_b.jpg")):
        client.post(f"/api/v1/attendance/staff/{staff['id']}/enroll", headers=owner, json={"images": _variants(photo)})

    r = client.post("/api/v1/attendance/check", headers=owner, json={"kind": "in", "frames": _variants("person_b.jpg", 4)}).json()
    assert r["ok"] is True and r["staff"]["full_name"] == "Person B" and r["match_score"] > 0.6

    again = client.post("/api/v1/attendance/check", headers=owner, json={"kind": "in", "frames": _variants("person_b.jpg", 4)}).json()
    assert again["ok"] is False and "already checked in" in again["message"]

    out = client.post("/api/v1/attendance/check", headers=owner, json={"kind": "out", "frames": _variants("person_b.jpg", 4)}).json()
    assert out["ok"] is True

    sheet = client.get("/api/v1/attendance/sheet", headers=owner).json()
    states = {row["staff"]["full_name"]: row["status"] for row in sheet["rows"]}
    assert states == {"Person A": "absent", "Person B": "checked_out"}

    # Manual entry needs a reason.
    assert client.post("/api/v1/attendance/manual", headers=owner,
                       json={"staff_id": a["id"], "kind": "in", "note": ""}).status_code == 422
    assert client.post("/api/v1/attendance/manual", headers=owner,
                       json={"staff_id": a["id"], "kind": "in", "note": "Camera not working at venue"}).status_code == 201

    today = date.today().isoformat()
    csv_text = client.get(f"/api/v1/attendance/export?date_from={today}&date_to={today}", headers=owner).text
    assert "Person A,Waiter,,1,2500.00,2500.00" in csv_text
    assert "Person B,Waiter,,1,2500.00,2500.00" in csv_text


def test_faces_are_private_to_each_company(client, new_company, live):
    owner_a, _ = new_company("Company A")
    owner_b, _ = new_company("Company B")
    a = _staff(client, owner_a, "Person A")
    client.post(f"/api/v1/attendance/staff/{a['id']}/enroll", headers=owner_a, json={"images": _variants("person_a.jpg")})
    # Company B's kiosk does not recognise Company A's staff.
    r = client.post("/api/v1/attendance/check", headers=owner_b, json={"kind": "in", "frames": _variants("person_a.jpg", 4)}).json()
    assert r["ok"] is False and "not recognised" in r["message"]
    assert client.get("/api/v1/attendance/staff", headers=owner_b).json() == []


def test_withdrawing_consent_deletes_face_data(client, new_company):
    owner, _ = new_company()
    a = _staff(client, owner, "Person A")
    client.post(f"/api/v1/attendance/staff/{a['id']}/enroll", headers=owner, json={"images": _variants("person_a.jpg")})
    updated = client.patch(f"/api/v1/attendance/staff/{a['id']}", headers=owner, json={"face_consent": False}).json()
    assert updated["face_enrolled_at"] is None
