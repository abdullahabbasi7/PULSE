"""Tests run against the real database (start it with `docker compose up db`
and run `alembic upgrade head` first). Each test creates its own companies
with unique emails and mobile numbers, so tests never depend on each other."""

import random
import uuid

import pytest
from fastapi.testclient import TestClient

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


@pytest.fixture
def new_company(client: TestClient):
    """Sign up a fresh company and return (auth headers, owner email)."""

    def _create(name: str = "Test Caterers") -> tuple[dict[str, str], str]:
        email = unique_email("owner")
        response = client.post(
            "/api/v1/auth/signup",
            json={
                "company_name": name,
                "owner_name": "Test Owner",
                "email": email,
                "mobile": unique_mobile(),
                "password": STRONG,
            },
        )
        assert response.status_code == 201, response.text
        return auth(response.json()), email

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
