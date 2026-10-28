"""Tests run against the real database (start it with `docker compose up db`
and run `alembic upgrade head` first). Each test creates its own companies
with unique emails and mobile numbers, so tests never depend on each other."""

import random
import uuid

import pytest
from fastapi.testclient import TestClient

from sqlalchemy import text

from app.core.platform_admin import create_admin, owner_engine
from app.main import app

# Meets the password policy: long, mixed case, digit, symbol, no common word.
STRONG = "Br1ght#Mango!Tree"


def unique_mobile() -> str:
    """A random Pakistani mobile number in national format, e.g. 0345 1234567."""
    return "03" + "".join(random.choice("0123456789") for _ in range(9))


def unique_email(prefix: str = "user") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@pulse-test.pk"


def auth(token_pair: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {token_pair['access_token']}"}


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


PLATFORM_EMAIL = "platform-tests@pulse-test.pk"


@pytest.fixture(scope="session")
def platform_headers(client: TestClient) -> dict[str, str]:
    """Signs in as a PULSE platform admin (created for the tests)."""
    create_admin(PLATFORM_EMAIL, "Test Reviewer", STRONG)
    response = client.post("/api/v1/platform/login", json={"email": PLATFORM_EMAIL, "password": STRONG})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def company_id_for(email: str) -> str:
    with owner_engine().connect() as conn:
        return str(conn.execute(text("SELECT company_id FROM users WHERE lower(email) = lower(:e)"), {"e": email}).scalar())


def request_workspace(client: TestClient, email: str, mobile: str | None = None, name: str = "Test Caterers"):
    return client.post(
        "/api/v1/auth/signup",
        json={"company_name": name, "owner_name": "Test Owner", "email": email, "mobile": mobile or unique_mobile(), "password": STRONG},
    )


@pytest.fixture
def approve(client: TestClient, platform_headers):
    def _approve(email: str) -> None:
        r = client.post(f"/api/v1/platform/companies/{company_id_for(email)}/decision", headers=platform_headers, json={"status": "active"})
        assert r.status_code == 200, r.text

    return _approve


@pytest.fixture
def new_company(client: TestClient, approve):
    """Request a workspace, approve it as the platform team, sign in; returns (auth headers, owner email)."""

    def _create(name: str = "Test Caterers") -> tuple[dict[str, str], str]:
        email = unique_email("owner")
        response = request_workspace(client, email, name=name)
        assert response.status_code == 202, response.text
        approve(email)
        login = client.post("/api/v1/auth/login", json={"identifier": email, "password": STRONG})
        assert login.status_code == 200, login.text
        return auth(login.json()), email

    return _create


@pytest.fixture
def member(client: TestClient):
    """Add a team member with the given role to a company and return their auth headers."""

    def _add(owner_headers: dict[str, str], role: str = "staff") -> dict[str, str]:
        email = unique_email(role)
        created = client.post(
            "/api/v1/users",
            headers=owner_headers,
            json={"full_name": f"Test {role.title()}", "email": email, "role": role, "password": STRONG},
        )
        assert created.status_code == 201, created.text
        login = client.post("/api/v1/auth/login", json={"identifier": email, "password": STRONG})
        assert login.status_code == 200, login.text
        return auth(login.json())

    return _add
