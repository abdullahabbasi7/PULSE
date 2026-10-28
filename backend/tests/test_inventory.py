"""M2 QR Inventory & Crockery Custody."""

from datetime import date, timedelta

from tests.test_bookings import _booking


def _item(client, headers, **overrides):
    body = {"name": "Dinner plate (white)", "category": "dinner_plate", "total_quantity": 500, "min_quantity": 100}
    body.update(overrides)
    response = client.post("/api/v1/inventory/items", headers=headers, json=body)
    assert response.status_code == 201, response.text
    return response.json()


def _move(client, headers, booking, item, direction, quantity, damaged=0, by_qr=True):
    body = {"booking_id": booking["id"], "direction": direction, "quantity": quantity, "damaged": damaged}
    body |= {"qr": item["qr_payload"]} if by_qr else {"item_id": item["id"]}
    return client.post("/api/v1/inventory/movements", headers=headers, json=body)


def test_scan_out_and_back_with_reconciliation(client, new_company, member):
    owner, _ = new_company()
    plates = _item(client, owner)
    booking = _booking(client, owner)
    staff = member(owner, "staff")

    assert _move(client, staff, booking, plates, "out", 450).status_code == 201
    listed = {i["id"]: i for i in client.get("/api/v1/inventory/items", headers=staff).json()}
    assert listed[plates["id"]]["out_now"] == 450 and listed[plates["id"]]["available"] == 50
    assert listed[plates["id"]]["low_stock"] is True

    # Cannot send more than is available, or return more than went out.
    assert _move(client, staff, booking, plates, "out", 51).status_code == 409
    assert _move(client, staff, booking, plates, "in", 451).status_code == 409

    assert _move(client, staff, booking, plates, "in", 430, damaged=12).status_code == 201
    assert _move(client, owner, booking, plates, "lost", 8, by_qr=False).status_code == 201

    rec = client.get(f"/api/v1/inventory/bookings/{booking['id']}/reconciliation", headers=owner).json()
    line = rec["lines"][0]
    assert (line["sent"], line["returned"], line["damaged"], line["lost"], line["outstanding"]) == (450, 430, 12, 8, 0)
    assert line["sent_by"] == ["Test Staff"]

    after = {i["id"]: i for i in client.get("/api/v1/inventory/items", headers=owner).json()}[plates["id"]]
    assert after["total_quantity"] == 480 and after["available"] == 480  # 12 broken + 8 lost written off


def test_alert_for_items_not_returned(client, new_company):
    owner, _ = new_company()
    glasses = _item(client, owner, name="Water glass", category="glass", total_quantity=300, min_quantity=0)
    past = _booking(client, owner, event_date=(date.today() - timedelta(days=2)).isoformat())
    _move(client, owner, past, glasses, "out", 200)
    _move(client, owner, past, glasses, "in", 150)
    alerts = client.get("/api/v1/inventory/alerts", headers=owner).json()
    assert any(a["kind"] == "not_returned" and a["booking_id"] == past["id"] and "50 pieces" in a["message"] for a in alerts)


def test_equipment_predictor_beats_rule_of_thumb(client, new_company):
    owner, _ = new_company()
    _item(client, owner, total_quantity=300)
    booking = _booking(client, owner, guest_count=500, menu="Chicken biryani, mutton qorma, naan, raita, kheer, soft drinks")
    response = client.post("/api/v1/inventory/predict", headers=owner, json={"booking_id": booking["id"], "service_style": "buffet"})
    assert response.status_code == 200, response.text
    r = response.json()
    lines = {line["category"]: line for line in r["lines"]}
    # A buffet for 500 needs more than 500 plates (second helpings and spares).
    assert lines["dinner_plate"]["predicted"] > 550
    assert lines["dinner_plate"]["shortfall"] == lines["dinner_plate"]["predicted"] - 300
    assert lines["bowl"]["predicted"] > 0  # kheer and raita are served in bowls
    assert r["model"]["model_error"] < r["model"]["baseline_error"]


def test_items_are_private_to_each_company(client, new_company):
    owner_a, _ = new_company("Company A")
    owner_b, _ = new_company("Company B")
    plates = _item(client, owner_a)
    booking_b = _booking(client, owner_b)
    assert client.get("/api/v1/inventory/items", headers=owner_b).json() == []
    # B scanning A's QR code finds nothing.
    assert _move(client, owner_b, booking_b, plates, "out", 1).status_code == 404
    assert client.get(f"/api/v1/inventory/items/by-qr/{plates['qr_token']}", headers=owner_b).status_code == 404
