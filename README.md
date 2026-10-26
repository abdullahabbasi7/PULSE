# PULSE

**Predictive Unified Logistics for Smart Events** is an AI-driven management platform for catering and event companies.

PULSE is a multi-tenant web app. Any catering or event management company can sign up and get its own private workspace. Naveed Event Management (NEM) is the pilot company.

Final Year Project, BS Artificial Intelligence, SZABIST Islamabad. Supervisor: Mr. Hamza Imran.

| Member | ID | Mid-term module |
|---|---|---|
| Abdullah Iftikhar Abbasi | 23108151 | **M1** Booking & Live Event Board |
| Amna Arslan | 23108156 | **M2** QR Inventory |
| Atiqa Jabeen | 23108157 | **M3** Face Attendance |

All three members share the platform base: sign-up, login, roles, team accounts and company settings.

---

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3 |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2 |
| Database | PostgreSQL 16 with row-level security, one database shared by every company |
| Auth | JWT access and refresh tokens; passwords hashed with scrypt |

## Run it

### Option A: Docker (easiest)

You need Docker Desktop installed.

```bash
git clone https://github.com/abdullahabbasi7/PULSE.git
cd PULSE
docker compose up --build
```

- App: http://localhost:5173
- API docs (Swagger): http://localhost:8000/docs

Load the demo companies and users (run once, in a second terminal):

```bash
docker compose exec backend python -m scripts.seed_demo
```

### Option B: Without Docker

You need Python 3.12, Node 22 and PostgreSQL 16.

1. **Database.** Create the database and roles once. Run this in `psql` as a superuser:

   ```sql
   CREATE ROLE pulse LOGIN PASSWORD 'pulse_dev';
   CREATE DATABASE pulse OWNER pulse;
   \c pulse
   \i db/init/01-roles.sql
   ```

2. **Backend.**

   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
   pip install -r requirements.txt
   copy ..\.env.example .env       # macOS/Linux: cp ../.env.example .env
   alembic upgrade head
   python -m scripts.seed_demo
   uvicorn app.main:app --reload
   ```

3. **Frontend.** Run this in a new terminal:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Demo accounts

These accounts are created by `seed_demo`. Every one has the password **`Demo@12345`**.

| Company | Email | Role |
|---|---|---|
| Naveed Event Management (Pilot) | owner@nem-demo.pk | Owner |
| | manager@nem-demo.pk | Manager |
| | staff@nem-demo.pk | Staff |
| | driver@nem-demo.pk | Driver |
| | accounts@nem-demo.pk | Accounts |
| Sample Caterers Lahore | owner@sample-caterers.pk | Owner |
| | manager@sample-caterers.pk | Manager |

Log in as both owners to show the defense panel that one company can never see another company's data.

### Tests

The tests need the database to be running.

```bash
cd backend
pytest
```

---

## Project layout

```
backend/
  app/
    core/          settings, password hashing, JWT
    db/            database session; sets the current company on each request
    models/        SQLAlchemy models (Company, User, ...)
    schemas/       request and response shapes (Pydantic)
    api/routes/    shared routes: auth, companies, users
    modules/
      bookings/    M1 — Abdullah
      inventory/   M2 — Amna
      attendance/  M3 — Atiqa
  migrations/      Alembic migrations (one file per change)
  scripts/         seed_demo.py
  tests/
frontend/
  src/
    auth/          login state, route guard
    components/ui/ shared Button, Field, Card, Badge, ... (use these!)
    layout/        sidebar, header, nav items per role
    pages/         login, signup, dashboard, team, settings
    modules/
      bookings/    M1 — Abdullah
      inventory/   M2 — Amna
      attendance/  M3 — Atiqa
db/init/           creates the pulse_app database role
```

## Roles

| Page | Owner | Manager | Staff | Driver | Accounts |
|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| M1 Bookings & Events | ✓ | ✓ | ✓ | ✓ | |
| M2 Inventory | ✓ | ✓ | ✓ | | |
| M3 Staff & Attendance | ✓ | ✓ | ✓ | | ✓ |
| Team Accounts | ✓ | ✓ (view, add) | | | |
| Company Settings | ✓ | | | | |

The sidebar and the routes both read from `frontend/src/layout/nav.js`. Inside the API, protect a route with `Depends(require_roles("owner", "manager"))`.

---

## Rules for multi-tenancy (read before adding a table)

Every company's data lives in the same tables. PostgreSQL **row-level security** keeps each company's rows apart:

- The API logs in as `pulse_app`, a role that **cannot bypass** RLS.
- Each request runs inside one transaction. That transaction stores the user's `company_id` in the setting `app.company_id`.
- Every tenant table has a policy that only shows or accepts rows where `company_id = app_current_company()`.

When you add a table for your module:

1. In the model, inherit `TenantMixin`. It adds `company_id` with a foreign key to `companies`.
2. In the Alembic migration, copy the **TENANT TABLE PATTERN** block from `migrations/versions/0001_core.py`. It covers the table, the `company_id` index, `ENABLE ROW LEVEL SECURITY` and the `company_isolation` policy.
3. When you create a row, set `company_id=current.company_id`.
4. In route code, use `session.flush()`, **never** `session.commit()`. The request dependency commits once at the end. Committing early drops the company setting.
5. Write a test showing that company B cannot see company A's rows. See `tests/test_auth_and_isolation.py`.

## Git workflow

- `main` must always run. Never push directly to it.
- Branch per feature: `m1/booking-form`, `m2/qr-labels`, `m3/face-register`, `base/...`
- Open a pull request and ask one teammate to review it before merging.
- Keep your work inside your module folders. If you need to change a shared file (`main.py`, `nav.js`, `App.jsx`, `components/ui`), mention it in the pull request.
- New migration: run `alembic revision -m "m2 inventory items"`, then edit the file it creates. Never edit a migration that is already on `main`.
