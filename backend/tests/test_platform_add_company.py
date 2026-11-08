"""A platform admin can add a company directly; its owner can sign in straight away."""

from tests.conftest import STRONG, unique_email, unique_mobile


def payload(**over):
    body = {
        "company_name": "Added Caterers",
        "city": "Lahore",
        "timezone": "Asia/Karachi",
        "owner_name": "Bilal Ahmed",
        "owner_email": unique_email("added"),
        "owner_mobile": unique_mobile(),
        "owner_password": STRONG,
    }
    body.update(over)
    return body


def test_admin_adds_an_active_company_whose_owner_can_sign_in(client, platform_headers):
    body = payload()
    r = client.post("/api/v1/platform/companies", json=body, headers=platform_headers)
    assert r.status_code == 201, r.text
    row = r.json()
    assert row["status"] == "active" and row["name"] == "Added Caterers" and row["city"] == "Lahore"
    assert row["owner_email"] == body["owner_email"] and row["members"] == 1
    assert row["review_note"].startswith("Added by")

    # Owner signs in with email and with mobile number.
    for identifier in (body["owner_email"], body["owner_mobile"]):
        login = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": STRONG})
        assert login.status_code == 200, login.text
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"}).json()
    assert me["user"]["role"] == "owner" and me["company"]["name"] == "Added Caterers"

    listed = client.get("/api/v1/platform/companies?status=active", headers=platform_headers).json()
    assert any(c["id"] == row["id"] for c in listed)


def test_duplicate_owner_and_weak_password_are_refused(client, platform_headers):
    body = payload()
    assert client.post("/api/v1/platform/companies", json=body, headers=platform_headers).status_code == 201
    again = client.post("/api/v1/platform/companies", json=payload(owner_email=body["owner_email"]), headers=platform_headers)
    assert again.status_code == 409 and "email" in again.json()["detail"]
    same_mobile = client.post("/api/v1/platform/companies", json=payload(owner_mobile=body["owner_mobile"]), headers=platform_headers)
    assert same_mobile.status_code == 409 and "mobile" in same_mobile.json()["detail"]
    assert client.post("/api/v1/platform/companies", json=payload(owner_password="password"), headers=platform_headers).status_code == 422
    assert client.post("/api/v1/platform/companies", json=payload(timezone="Mars/Base"), headers=platform_headers).status_code == 422


def test_only_platform_admins_can_add_companies(client, new_company):
    company_headers, _ = new_company()
    assert client.post("/api/v1/platform/companies", json=payload()).status_code == 401
    assert client.post("/api/v1/platform/companies", json=payload(), headers=company_headers).status_code == 401
