"""Face registration only ticks a pose when the head is really in it."""

import base64

import cv2
import numpy as np

from app.modules.attendance.ai.face import Face, head_pose, judge_pose
from tests.test_attendance import FIXTURES


def _face(nose_dx=0.0, nose_y=0.55, roll_deg=0.0):
    """Synthetic landmarks: eyes 60 px apart, mouth 70 px below; nose moved as asked."""
    pts = np.array([[-30, 0], [30, 0], [nose_dx * 60, nose_y * 70], [-22, 70], [22, 70]], dtype=np.float64)
    a = np.radians(roll_deg)
    rot = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
    pts = pts @ rot.T + [320, 200]
    return Face(box=(250, 150, 140, 160), landmarks=pts.astype(np.float32), score=0.99, raw=np.zeros(15))


def test_head_pose_ignores_head_tilt():
    straight = head_pose(_face(0.2, 0.5))
    tilted = head_pose(_face(0.2, 0.5, roll_deg=15))
    assert straight == tilted == (0.2, 0.5)


def test_front_pose_needs_a_straight_face():
    assert judge_pose("front", 0.02, 0.55, None)[0]
    ok, _, hint = judge_pose("front", 0.25, 0.55, None)
    assert not ok and "straight" in hint


def test_turns_are_judged_against_the_persons_own_front_photo():
    base = (0.05, 0.55)
    # Still looking straight: nothing but "front" passes.
    for pose in ("up", "left", "right"):
        assert not judge_pose(pose, 0.05, 0.55, base)[0]
    # Turned to their left (nose moves to image right, positive yaw).
    assert judge_pose("left", 0.24, 0.55, base)[0]
    assert not judge_pose("right", 0.24, 0.55, base)[0]
    assert "Other way" in judge_pose("right", 0.24, 0.55, base)[2]
    # Turned to their right.
    assert judge_pose("right", -0.14, 0.55, base)[0]
    # Half-way there: not accepted, but progress is shown.
    ok, progress, hint = judge_pose("left", 0.12, 0.55, base)
    assert not ok and 0.3 < progress < 0.8 and "more" in hint
    # Chin up: the nose rises towards the eyes.
    assert judge_pose("up", 0.06, 0.46, base)[0]
    assert not judge_pose("up", 0.06, 0.60, base)[0]
    # Chin up while turned far sideways is not the "chin up" pose.
    assert not judge_pose("up", 0.30, 0.44, base)[0]


def test_pose_endpoint(client, new_company):
    headers, _ = new_company()
    img = cv2.imread(str(FIXTURES / "person_a.jpg"))
    ok, buf = cv2.imencode(".jpg", img)
    data = "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()
    res = client.post("/api/v1/attendance/pose", json={"image": data, "pose": "front"}, headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["face"] and body["yaw"] is not None and isinstance(body["hint"], str)
    # This photo is turned to the side, so it is not accepted as the straight-on pose.
    assert body["ok"] is False

    blank = np.full((480, 640, 3), 128, np.uint8)
    ok, buf = cv2.imencode(".jpg", blank)
    res = client.post("/api/v1/attendance/pose", json={"image": "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode(), "pose": "front"}, headers=headers)
    assert res.json()["face"] is False and "No face" in res.json()["hint"]
