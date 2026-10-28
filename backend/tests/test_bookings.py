"""M1 Bookings & Live Event Board."""

from datetime import date, timedelta

from tests.conftest import unique_mobile

TOMORROW = (date.today() + timedelta(days=1)).isoformat()


def _booking(client, headers, **overrides):
    body = {
        "client": {"name": "Sara Ahmed", "phone": unique_mobile()},
        "event_type": "wedding",
        "event_date": TOMORROW,
        "start_time": "19:00",
        "end_time": "23:00",
        "venue": "Grand Marquee",
        "guest_count": 400,
        "menu": "Chicken biryani, mutton qorma, kheer",
    }
    body.update(overrides)
    response = client.post("/api/v1/bookings", headers=headers, json=body)
    assert response.status_code == 201, response.text
    return response.json()


def test_inquiry_reader_fills_booking_details(client, new_company):
    headers, _ = new_company()
    text = "AoA, meri behn ki mehndi hai 20 December ko raat 8 baje, Royal Marquee DHA mein, 300 log honge. Chicken karahi aur kheer chahiye."
    response = client.post("/api/v1/bookings/parse-inquiry", headers=headers, json={"text": text})
    assert response.status_code == 200, response.text
    r = response.json()
    assert r["event_type"] == "mehndi"
    assert r["event_date"].endswith("-12-20")
    assert r["start_time"] == "20:00"
    assert r["guest_count"] == 300
    assert "Royal Marquee" in r["venue"]
    assert {"chicken karahi", "kheer"} <= {d.lower() for d in r["menu"]}
    assert r["entities"] and r["model"]["event_type_accuracy"] > 0.9


def test_create_booking_with_new_client_and_history(client, new_company):
    headers, _ = new_company()
    booking = _booking(client, headers, inquiry_text="Shadi kal hai")
    assert booking["client"]["name"] == "Sara Ahmed"
    assert booking["status"] == "inquiry"
    history = client.get(f"/api/v1/bookings/{booking['id']}/history", headers=headers).json()
    assert [h["action"] for h in history] == ["created", "inquiry_read"]
    assert history[0]["actor_name"] == "Test Owner"


def test_clash_warning_for_same_venue_and_time(client, new_company):
    headers, _ = new_company()
    first = _booking(client, headers)
    second = _booking(client, headers, start_time="21:00", end_time="23:30")
    assert [c["booking_id"] for c in second["clashes"]] == [first["id"]]
    # A different venue, or a different time at the same venue, does not clash.
    assert _booking(client, headers, venue="Pearl Hall")["clashes"] == []
    assert _booking(client, headers, start_time="12:00", end_time="15:00")["clashes"] == []
    check = client.post(
        "/api/v1/bookings/check-clashes", headers=headers,
        json={"event_date": TOMORROW, "start_time": "20:00", "venue": "grand marquee"},
    )
    assert check.status_code == 200 and len(check.json()) >= 2


def test_status_rules_and_live_board(client, new_company, member):
    owner, _ = new_company()
    booking = _booking(client, owner, event_date=date.today().isoformat())
    bad = client.post(f"/api/v1/bookings/{booking['id']}/status", headers=owner, json={"status": "completed"})
    assert bad.status_code == 409
    ok = client.post(f"/api/v1/bookings/{booking['id']}/status", headers=owner, json={"status": "confirmed"})
    assert ok.json()["status"] == "confirmed"

    live = client.get("/api/v1/bookings/live", headers=owner).json()
    assert [b["id"] for b in live] == [booking["id"]]

    staff = member(owner, "staff")
    progressed = client.post(f"/api/v1/bookings/{booking['id']}/progress", headers=staff, json={"progress": "setup"})
    assert progressed.status_code == 200
    assert progressed.json()["status"] == "in_progress"
    done = client.post(f"/api/v1/bookings/{booking['id']}/progress", headers=staff, json={"progress": "done"})
    assert done.json()["status"] == "completed"


def test_roles_and_company_isolation(client, new_company, member):
    owner_a, _ = new_company("Company A")
    owner_b, _ = new_company("Company B")
    booking = _booking(client, owner_a)

    driver = member(owner_a, "driver")
    assert client.get("/api/v1/bookings", headers=driver).status_code == 200
    assert client.post("/api/v1/bookings", headers=driver, json={}).status_code in (403, 422)
    accounts = member(owner_a, "accounts")
    assert client.get("/api/v1/bookings", headers=accounts).status_code == 403

    assert client.get(f"/api/v1/bookings/{booking['id']}", headers=owner_b).status_code == 404
    assert client.get("/api/v1/bookings", headers=owner_b).json() == []
    # B cannot attach a booking to A's client, even knowing its id.
    stolen = client.post(
        "/api/v1/bookings", headers=owner_b,
        json={"client_id": booking["client"]["id"], "event_type": "other", "event_date": TOMORROW,
              "venue": "Somewhere", "guest_count": 10},
    )
    assert stolen.status_code == 404
