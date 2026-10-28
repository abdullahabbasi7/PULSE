"""A new company is only a request until the PULSE platform team approves it."""

from tests.conftest import STRONG, company_id_for, request_workspace, unique_email


def login(client, email, password=STRONG):
    return client.post("/api/v1/auth/login", json={"identifier": email, "password": password})


def test_signup_is_a_request_and_gives_no_tokens(client):
    email = unique_email("req")
    response = request_workspace(client, email)
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "pending" and "access_token" not in body


def test_pending_company_cannot_sign_in_until_approved(client, platform_headers):
    email = unique_email("pend")
    request_workspace(client, email, name="Waiting Caterers")
    blocked = login(client, email)
    assert blocked.status_code == 403
    assert "waiting for approval" in blocked.json()["detail"]
    # A wrong password still gets the generic message, so the status is not revealed.
    assert login(client, email, "Wrong#Pass9x").status_code == 401

    pending = client.get("/api/v1/platform/companies?status=pending", headers=platform_headers).json()
    row = next(c for c in pending if c["owner_email"] == email)
    assert row["name"] == "Waiting Caterers" and row["members"] == 1

    approved = client.post(f"/api/v1/platform/companies/{row['id']}/decision", headers=platform_headers, json={"status": "active"})
    assert approved.status_code == 200 and approved.json()["status"] == "active"
    assert login(client, email).status_code == 200


def test_rejected_company_sees_the_reason(client, platform_headers):
    email = unique_email("rej")
    request_workspace(client, email)
    cid = company_id_for(email)
    no_reason = client.post(f"/api/v1/platform/companies/{cid}/decision", headers=platform_headers, json={"status": "rejected"})
    assert no_reason.status_code == 422
    client.post(f"/api/v1/platform/companies/{cid}/decision", headers=platform_headers, json={"status": "rejected", "note": "Could not verify the business."})
    response = login(client, email)
    assert response.status_code == 403 and "Could not verify the business." in response.json()["detail"]


def test_suspending_locks_out_existing_sessions(client, new_company, platform_headers):
    headers, email = new_company()
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
    cid = company_id_for(email)
    r = client.post(f"/api/v1/platform/companies/{cid}/decision", headers=platform_headers, json={"status": "suspended", "note": "Unpaid invoice"})
    assert r.status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 403
    assert login(client, email).status_code == 403
    client.post(f"/api/v1/platform/companies/{cid}/decision", headers=platform_headers, json={"status": "active"})
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200


def test_company_tokens_are_refused_by_the_platform_console(client, new_company):
    headers, _ = new_company()
    assert client.get("/api/v1/platform/companies", headers=headers).status_code == 401


def test_platform_tokens_are_refused_by_company_routes(client, platform_headers):
    assert client.get("/api/v1/auth/me", headers=platform_headers).status_code == 401


def test_app_role_cannot_write_company_status():
    """Even raw SQL through the app's own database role cannot approve a company."""
    import pytest
    from sqlalchemy import text
    from sqlalchemy.exc import ProgrammingError

    from app.db.session import SessionLocal

    with SessionLocal() as session, pytest.raises(ProgrammingError):
        with session.begin():
            session.execute(text("UPDATE companies SET status = 'active'"))
