"""People can update their own profile and photo; photos are cleaned and resized."""

import base64

import cv2
import numpy as np

from tests.conftest import unique_mobile


def _png(w=400, h=300) -> str:
    img = np.zeros((h, w, 3), np.uint8)
    img[:, :, 1] = 180
    ok, buf = cv2.imencode(".png", img)
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode()


def test_update_profile_and_photo(client, new_company):
    headers, _ = new_company()
    mobile = unique_mobile()
    r = client.patch("/api/v1/auth/me", headers=headers, json={"full_name": "Sara Ahmed", "job_title": "Operations manager", "phone": mobile, "avatar": _png()})
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    assert user["full_name"] == "Sara Ahmed" and user["job_title"] == "Operations manager"
    assert user["phone"] == "+92" + mobile[1:]
    assert user["avatar"].startswith("data:image/jpeg;base64,")
    img = cv2.imdecode(np.frombuffer(base64.b64decode(user["avatar"].split(",", 1)[1]), np.uint8), cv2.IMREAD_COLOR)
    assert img.shape[:2] == (256, 256)
    # The photo is on the team list too, and can be removed.
    assert client.get("/api/v1/users", headers=headers).json()[0]["avatar"]
    r = client.patch("/api/v1/auth/me", headers=headers, json={"avatar": ""})
    assert r.json()["user"]["avatar"] is None


def test_rejects_files_that_are_not_images(client, new_company):
    headers, _ = new_company()
    bad = "data:image/png;base64," + base64.b64encode(b"<script>alert(1)</script>").decode()
    assert client.patch("/api/v1/auth/me", headers=headers, json={"avatar": bad}).status_code == 422
    assert client.patch("/api/v1/auth/me", headers=headers, json={"avatar": "data:text/html;base64,AAAA"}).status_code == 422


def test_cannot_change_role_or_email_through_profile(client, new_company):
    headers, email = new_company()
    r = client.patch("/api/v1/auth/me", headers=headers, json={"role": "staff", "email": "x@y.pk", "job_title": "Owner"})
    assert r.status_code == 200
    me = r.json()["user"]
    assert me["role"] == "owner" and me["email"] == email
