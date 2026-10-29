"""The owner can edit or delete any staff record; managers can edit but not delete."""

from tests.test_attendance import _staff


def test_owner_edits_and_deletes_staff(client, new_company, member):
    owner, _ = new_company()
    s = _staff(client, owner, "Bilal Ahmed")

    r = client.patch(f"/api/v1/attendance/staff/{s['id']}", headers=owner,
                     json={"full_name": "Bilal Ahmed Khan", "designation": "Head waiter", "phone": "0300 1234567", "daily_wage": "3000"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["full_name"] == "Bilal Ahmed Khan" and body["designation"] == "Head waiter" and float(body["daily_wage"]) == 3000
    assert body["phone"]

    # Clearing the phone is allowed; clearing the name is not.
    assert client.patch(f"/api/v1/attendance/staff/{s['id']}", headers=owner, json={"phone": None}).json()["phone"] is None
    assert client.patch(f"/api/v1/attendance/staff/{s['id']}", headers=owner, json={"full_name": None}).status_code == 422

    # Manual attendance entry, then the record shows its history.
    client.post("/api/v1/attendance/manual", headers=owner, json={"staff_id": s["id"], "kind": "in", "note": "Camera not working"})
    detail = client.get(f"/api/v1/attendance/staff/{s['id']}", headers=owner).json()
    assert detail["attendance_entries"] == 1 and detail["last_seen"]

    # A manager can edit but not delete.
    manager = member(owner, "manager")
    assert client.patch(f"/api/v1/attendance/staff/{s['id']}", headers=manager, json={"designation": "Waiter"}).status_code == 200
    assert client.delete(f"/api/v1/attendance/staff/{s['id']}", headers=manager).status_code == 403

    r = client.delete(f"/api/v1/attendance/staff/{s['id']}", headers=owner)
    assert r.status_code == 200, r.text
    assert r.json() == {"full_name": "Bilal Ahmed Khan", "attendance_entries_deleted": 1}
    ids = [m["id"] for m in client.get("/api/v1/attendance/staff", headers=owner).json()]
    assert s["id"] not in ids
    assert client.get(f"/api/v1/attendance/staff/{s['id']}", headers=owner).status_code == 404


def test_cannot_delete_another_companys_staff(client, new_company):
    a, _ = new_company("Company A")
    b, _ = new_company("Company B")
    s = _staff(client, a, "Only In A")
    assert client.delete(f"/api/v1/attendance/staff/{s['id']}", headers=b).status_code == 404
    assert client.patch(f"/api/v1/attendance/staff/{s['id']}", headers=b, json={"designation": "Cook"}).status_code == 404
