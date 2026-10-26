"""Tests run against the real database (start it with `docker compose up db`
and run `alembic upgrade head` first). Each test creates its own companies
with unique emails, so tests never depend on each other."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def new_company(client: TestClient):
    """Sign up a fresh company and return (auth headers, owner email)."""

    def _create(name: str = "Test Caterers") -> tuple[dict[str, str], str]:
        email = f"owner-{uuid.uuid4().hex[:10]}@pulse-test.pk"
        response = client.post(
            "/api/v1/auth/signup",
            json={
                "company_name": name,
                "owner_name": "Test Owner",
                "email": email,
                "password": "Password123",
            },
        )
        assert response.status_code == 201, response.text
        return {"Authorization": f"Bearer {response.json()['access_token']}"}, email

    return _create
