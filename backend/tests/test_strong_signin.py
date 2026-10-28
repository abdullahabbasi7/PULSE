"""Sign-in hardening: password policy, email or mobile login, lockout, password change and reset."""

import pytest

from app.core.passwords import password_problems
from app.core.phone import normalize_phone
from tests.conftest import STRONG, auth, unique_email, unique_mobile


@pytest.mark.parametrize(
    "weak",
    [
        "short1!A",          # too short
        "alllowercase1!",    # no uppercase
        "ALLUPPERCASE1!",    # no lowercase
        "NoDigitsHere!!",    # no number
        "NoSymbols12345x",   # no symbol (and a sequence)
        "Password@2026",     # built from a common word
        "Aaaa#Strong9x",     # four repeated characters
        "Strong#1234x",      # sequence
    ],
)
def test_weak_passwords_are_listed(weak):
    assert password_problems(weak)


def test_strong_password_passes_and_personal_details_do_not():
    assert password_problems(STRONG) == []
    assert password_problems("Ayesha#Kh9qw!", full_name="Ayesha Khan")


def test_phone_numbers_are_normalised():
    assert normalize_phone("0300-1234567") == "+923001234567"
    assert normalize_phone("+92 300 1234567") == "+923001234567"
    assert normalize_phone("00923001234567") == "+923001234567"
    assert normalize_phone("+44 7700 900123") == "+447700900123"
    with pytest.raises(ValueError):
        normalize_phone("12ab")


def test_signup_rejects_weak_password(client):
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "company_name": "Weak Co",
            "owner_name": "Weak Owner",
            "email": unique_email("weak"),
            "mobile": unique_mobile(),
            "password": "Password123",
        },
    )
    assert response.status_code == 422
    assert "not strong enough" in response.text


def test_adding_member_rejects_weak_password(client, new_company):
    headers, _ = new_company()
    response = client.post(
        "/api/v1/users",
        headers=headers,
        json={"full_name": "New Staff", "email": unique_email(), "role": "staff", "password": "staff12345"},
    )
    assert response.status_code == 422


def test_login_with_email_or_mobile_number(client, approve):
    email, mobile = unique_email("mob"), unique_mobile()
    signup = client.post(
        "/api/v1/auth/signup",
        json={"company_name": "Mobile Co", "owner_name": "Mobile Owner", "email": email, "mobile": mobile, "password": STRONG},
    )
    assert signup.status_code == 202, signup.text
    approve(email)
    international = "+92" + mobile[1:]
    for identifier in (email, mobile, international, f"{mobile[:4]}-{mobile[4:]}"):
        response = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": STRONG})
        assert response.status_code == 200, (identifier, response.text)
    assert client.post("/api/v1/auth/login", json={"identifier": "03009999999", "password": STRONG}).status_code == 401


def test_duplicate_mobile_number_is_rejected(client, new_company):
    headers, _ = new_company()
    mobile = unique_mobile()
    first = client.post(
        "/api/v1/users", headers=headers,
        json={"full_name": "First Person", "email": unique_email(), "phone": mobile, "role": "staff", "password": STRONG},
    )
    assert first.status_code == 201
    second = client.post(
        "/api/v1/users", headers=headers,
        json={"full_name": "Second Person", "email": unique_email(), "phone": mobile, "role": "staff", "password": STRONG},
    )
    assert second.status_code == 409
    assert "mobile number" in second.text


def test_account_locks_after_repeated_wrong_passwords(client, new_company):
    _, email = new_company()
    for _ in range(4):
        assert client.post("/api/v1/auth/login", json={"identifier": email, "password": "Wrong#Pass9x"}).status_code == 401
    fifth = client.post("/api/v1/auth/login", json={"identifier": email, "password": "Wrong#Pass9x"})
    assert fifth.status_code == 423
    # Even the right password is refused while locked.
    assert client.post("/api/v1/auth/login", json={"identifier": email, "password": STRONG}).status_code == 423


def test_reset_password_unlocks_and_replaces_password(client, new_company):
    owner, _ = new_company()
    email = unique_email("staff")
    created = client.post(
        "/api/v1/users", headers=owner,
        json={"full_name": "Locked Staff", "email": email, "role": "staff", "password": STRONG},
    ).json()
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"identifier": email, "password": "Wrong#Pass9x"})
    new_password = "Fresh!Start7Kite"
    reset = client.post(f"/api/v1/users/{created['id']}/reset-password", headers=owner, json={"new_password": new_password})
    assert reset.status_code == 204, reset.text
    assert client.post("/api/v1/auth/login", json={"identifier": email, "password": new_password}).status_code == 200


def test_change_password(client, new_company):
    headers, email = new_company()
    new_password = "Quiet#River8Stone"
    weak = client.post("/api/v1/auth/change-password", headers=headers, json={"current_password": STRONG, "new_password": "abc"})
    assert weak.status_code == 422
    wrong = client.post("/api/v1/auth/change-password", headers=headers, json={"current_password": "nope", "new_password": new_password})
    assert wrong.status_code == 400
    ok = client.post("/api/v1/auth/change-password", headers=headers, json={"current_password": STRONG, "new_password": new_password})
    assert ok.status_code == 200
    assert client.get("/api/v1/auth/me", headers=auth(ok.json())).status_code == 200
    assert client.post("/api/v1/auth/login", json={"identifier": email, "password": STRONG}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"identifier": email, "password": new_password}).status_code == 200
