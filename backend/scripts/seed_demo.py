"""Load demo data: two fictional companies with users, clients, bookings, inventory and staff.

Run from the backend folder after migrations:  python -m scripts.seed_demo
Safe to run twice; a company that already exists is skipped.

The companies are made up for demonstrations. PULSE is not built for any one company:
any catering or event business can sign up and get its own private workspace.
"""

import uuid
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import text

from app.core.passwords import password_problems
from app.core.security import hash_password
from app.db.session import SessionLocal, set_current_company
from app.models import Company, User
from app.modules.attendance.models import StaffMember
from app.modules.bookings.models import Booking, BookingHistory, Client
from app.modules.inventory.models import InventoryItem, ItemMovement

PASSWORD = "Pulse@Demo2026"
assert not password_problems(PASSWORD), "The demo password must pass the password policy"

COMPANIES = [
    {
        "name": "Royal Caterers",
        "city": "Islamabad",
        "timezone": "Asia/Karachi",
        "domain": "royal-demo.pk",
        "users": [
            ("Hamid Raza", "owner", "owner", "+923000000001"),
            ("Sana Malik", "manager", "manager", "+923000000002"),
            ("Imran Khan", "staff", "staff", "+923000000003"),
            ("Kashif Ali", "driver", "driver", "+923000000004"),
            ("Nadia Hussain", "accounts", "accounts", "+923000000005"),
        ],
        "full_demo": True,
    },
    {
        "name": "Crescent Events",
        "city": "Dubai",
        "timezone": "Asia/Dubai",
        "domain": "crescent-demo.ae",
        "users": [
            ("Omar Siddiqui", "owner", "owner", "+971500000001"),
            ("Layla Haddad", "manager", "manager", "+971500000002"),
        ],
        "full_demo": False,
    },
]

CLIENTS = [
    ("Sara Ahmed", "+923211234567"), ("Bilal Chaudhry", "+923331112233"), ("Ayesha Siddiqui", "+923004445566"),
    ("Tech Valley Pvt Ltd", "+92512345678"), ("Usman Tariq", "+923459876543"),
]

ITEMS = [
    ("Dinner plate, white", "dinner_plate", 1200, 300), ("Quarter plate", "dessert_plate", 800, 200),
    ("Dessert bowl", "bowl", 900, 200), ("Water glass", "glass", 1500, 400), ("Tea cup with saucer", "cup", 600, 150),
    ("Cutlery set (spoon, fork, knife)", "cutlery_set", 1300, 300), ("Chafing dish, steel", "chafing_dish", 40, 10),
    ("Serving platter", "serving_dish", 120, 30), ("Banquet chair", "chair", 1000, 250),
    ("Round table (8 seats)", "table", 120, 30), ("Tablecloth, white", "tablecloth", 140, 40),
]

STAFF = [
    ("Imran Khan", "Head waiter", 3000), ("Zeeshan Akhtar", "Waiter", 2200), ("Faisal Mehmood", "Waiter", 2200),
    ("Rashid Iqbal", "Cook", 3500), ("Shazia Parveen", "Decorator", 2800), ("Kashif Ali", "Driver", 2500),
]


def email_exists(session, email: str) -> bool:
    return session.execute(text("SELECT 1 FROM auth_find_user(:email, NULL)"), {"email": email}).first() is not None


def add_demo_operations(session, company_id: uuid.UUID, users: dict[str, User], zone: ZoneInfo) -> None:
    today = datetime.now(timezone.utc).astimezone(zone).date()
    manager = users["manager"]
    clients = []
    for name, phone in CLIENTS:
        c = Client(id=uuid.uuid4(), company_id=company_id, name=name, phone=phone)
        session.add(c)
        clients.append(c)
    session.flush()

    bookings_spec = [
        # (client, type, day offset, start, end, venue, guests, menu, status, progress)
        (0, "wedding", 0, time(19, 0), time(23, 30), "Grand Marquee, DHA Phase 2", 450,
         "Chicken biryani, mutton qorma, seekh kabab, naan, raita, kheer, soft drinks", "in_progress", "serving"),
        (3, "corporate", 0, time(13, 0), time(15, 30), "Tech Valley office, Blue Area", 120,
         "Chicken tikka, pasta, salad, brownies, green tea", "confirmed", "scheduled"),
        (1, "walima", 2, time(20, 0), time(23, 0), "Emerald Banquet Hall, F-7", 600,
         "Mutton qorma, chicken biryani, salad, naan, firni", "confirmed", "scheduled"),
        (2, "mehndi", 5, time(20, 30), None, "Siddiqui residence, E-11", 150,
         "Chicken karahi, naan, gajar ka halwa, kashmiri chai", "quoted", "scheduled"),
        (4, "birthday", 9, time(17, 0), time(20, 0), "Lakeview Lawn, Bani Gala", 80,
         "Sandwiches, cake, ice cream, soft drinks", "inquiry", "scheduled"),
        (1, "engagement", -3, time(19, 0), time(22, 0), "Pearl Hall, G-11", 300,
         "Chicken biryani, chicken qorma, naan, custard", "completed", "done"),
    ]
    bookings = []
    for ci, etype, offset, start, end, venue, guests, menu, status, progress in bookings_spec:
        b = Booking(
            id=uuid.uuid4(), company_id=company_id, client_id=clients[ci].id, event_type=etype,
            event_date=today + timedelta(days=offset), start_time=start, end_time=end, venue=venue,
            guest_count=guests, menu=menu, status=status, progress=progress, created_by=manager.id,
        )
        session.add(b)
        bookings.append(b)
    session.flush()
    for b in bookings:
        session.add(BookingHistory(id=uuid.uuid4(), company_id=company_id, booking_id=b.id, actor_id=manager.id,
                                   action="created", detail=f"Status: {b.status}"))

    items = {}
    for name, category, total, minimum in ITEMS:
        item = InventoryItem(id=uuid.uuid4(), company_id=company_id, name=name, category=category,
                             total_quantity=total, min_quantity=minimum, qr_token=uuid.uuid4().hex[:12])
        session.add(item)
        items[category] = item
    session.flush()

    staff_user = users["staff"]

    def move(booking, category, direction, qty, damaged=0):
        session.add(ItemMovement(id=uuid.uuid4(), company_id=company_id, item_id=items[category].id,
                                 booking_id=booking.id, direction=direction, quantity=qty, damaged=damaged,
                                 recorded_by=staff_user.id))

    tonight, past = bookings[0], bookings[5]
    for category, qty in (("dinner_plate", 620), ("bowl", 520), ("glass", 800), ("cutlery_set", 600),
                          ("chafing_dish", 14), ("chair", 430), ("table", 56)):
        move(tonight, category, "out", qty)
    # Last week's engagement: most items came back, some are still missing.
    for category, sent, back, broken in (("dinner_plate", 400, 372, 6), ("glass", 450, 431, 9), ("chair", 290, 290, 0)):
        move(past, category, "out", sent)
        move(past, category, "in", back, broken)
    items["dinner_plate"].total_quantity -= 6
    items["glass"].total_quantity -= 9

    for full_name, designation, wage in STAFF:
        session.add(StaffMember(id=uuid.uuid4(), company_id=company_id, full_name=full_name, designation=designation,
                                daily_wage=wage, face_consent=True))


def main() -> None:
    with SessionLocal() as session:
        for spec in COMPANIES:
            owner_email = f"owner@{spec['domain']}"
            with session.begin():
                if email_exists(session, owner_email):
                    print(f"Skipped {spec['name']} (already seeded)")
                    continue
                company_id = uuid.uuid4()
                set_current_company(session, company_id)
                session.add(Company(id=company_id, name=spec["name"], city=spec["city"], timezone=spec["timezone"],
                                    phone=spec["users"][0][3]))
                session.flush()
                users = {}
                for full_name, role, local_part, phone in spec["users"]:
                    user = User(id=uuid.uuid4(), company_id=company_id, full_name=full_name,
                                email=f"{local_part}@{spec['domain']}", phone=phone,
                                password_hash=hash_password(PASSWORD), role=role)
                    session.add(user)
                    users[role] = user
                session.flush()
                if spec["full_demo"]:
                    add_demo_operations(session, company_id, users, ZoneInfo(spec["timezone"]))
            print(f"Seeded {spec['name']}")
    print(f"\nDemo password for every account: {PASSWORD}")
    print("Sign in with an email such as owner@royal-demo.pk, or a mobile number such as 0300 0000001.")


if __name__ == "__main__":
    main()
