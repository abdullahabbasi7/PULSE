"""Load demo data: the pilot company and a second sample company.

Run from the backend folder after migrations:  python -m scripts.seed_demo
Safe to run twice; accounts that already exist are skipped.
Extend this script with menus, assets, staff and bookings as modules are built.
"""

import uuid

from sqlalchemy import text

from app.core.security import hash_password
from app.db.session import SessionLocal, set_current_company
from app.models import Company, User

PASSWORD = "Demo@12345"

COMPANIES = [
    {
        "name": "Naveed Event Management (Pilot)",
        "city": "Islamabad",
        "phone": "051-2851166",
        "domain": "nem-demo.pk",
        "users": [
            ("Naveed Owner", "owner", "owner"),
            ("Event Manager", "manager", "manager"),
            ("Warehouse Staff", "staff", "staff"),
            ("Driver One", "driver", "driver"),
            ("Accounts Officer", "accounts", "accounts"),
        ],
    },
    {
        "name": "Sample Caterers Lahore",
        "city": "Lahore",
        "phone": "042-0000000",
        "domain": "sample-caterers.pk",
        "users": [("Sample Owner", "owner", "owner"), ("Sample Manager", "manager", "manager")],
    },
]


def email_exists(session, email: str) -> bool:
    return session.execute(text("SELECT 1 FROM auth_find_user(:email)"), {"email": email}).first() is not None


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
                session.add(Company(id=company_id, name=spec["name"], city=spec["city"], phone=spec["phone"]))
                session.flush()
                for full_name, role, local_part in spec["users"]:
                    session.add(
                        User(
                            id=uuid.uuid4(),
                            company_id=company_id,
                            full_name=full_name,
                            email=f"{local_part}@{spec['domain']}",
                            password_hash=hash_password(PASSWORD),
                            role=role,
                        )
                    )
            print(f"Seeded {spec['name']}")
    print(f"\nDemo logins use password {PASSWORD}, e.g. owner@nem-demo.pk, manager@nem-demo.pk, driver@nem-demo.pk")


if __name__ == "__main__":
    main()
