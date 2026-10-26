import uuid


def test_health(client):
    assert client.get("/api/v1/health").json() == {"status": "ok"}


def test_signup_login_and_me(client, new_company):
    headers, email = new_company("Sample Caterers")

    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["company"]["name"] == "Sample Caterers"
    assert me.json()["user"]["role"] == "owner"

    login = client.post("/api/v1/auth/login", json={"email": email.upper(), "password": "Password123"})
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_wrong_password_and_bad_token_are_rejected(client, new_company):
    _, email = new_company()
    assert client.post("/api/v1/auth/login", json={"email": email, "password": "wrong-pass"}).status_code == 401
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-token"}).status_code == 401
    assert client.get("/api/v1/users").status_code == 401


def test_duplicate_email_is_rejected(client, new_company):
    headers, email = new_company()
    duplicate = client.post(
        "/api/v1/users",
        headers=headers,
        json={"full_name": "Copy", "email": email, "role": "staff", "password": "Password123"},
    )
    assert duplicate.status_code == 409


def test_companies_cannot_see_each_others_data(client, new_company):
    headers_a, _ = new_company("Company A")
    headers_b, _ = new_company("Company B")

    staff_email = f"staff-{uuid.uuid4().hex[:10]}@pulse-test.pk"
    created = client.post(
        "/api/v1/users",
        headers=headers_a,
        json={"full_name": "A Staff", "email": staff_email, "role": "staff", "password": "Password123"},
    )
    assert created.status_code == 201
    staff_id = created.json()["id"]

    users_seen_by_b = [u["email"] for u in client.get("/api/v1/users", headers=headers_b).json()]
    assert staff_email not in users_seen_by_b
    assert client.get("/api/v1/companies/me", headers=headers_b).json()["name"] == "Company B"

    # B cannot change A's user, even knowing its id.
    attempt = client.patch(f"/api/v1/users/{staff_id}", headers=headers_b, json={"is_active": False})
    assert attempt.status_code == 404


def test_roles_are_enforced(client, new_company):
    headers, _ = new_company()
    email = f"driver-{uuid.uuid4().hex[:10]}@pulse-test.pk"
    client.post(
        "/api/v1/users",
        headers=headers,
        json={"full_name": "A Driver", "email": email, "role": "driver", "password": "Password123"},
    )
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123"}).json()
    driver = {"Authorization": f"Bearer {token['access_token']}"}

    assert client.get("/api/v1/users", headers=driver).status_code == 403
    assert client.patch("/api/v1/companies/me", headers=driver, json={"city": "Lahore"}).status_code == 403
