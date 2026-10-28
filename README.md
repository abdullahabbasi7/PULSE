# PULSE

**Predictive Unified Logistics for Smart Events** is an AI-driven management platform for catering and event companies.

PULSE is a multi-tenant web app for catering and event companies in any city or country. Each company signs up and gets its own private workspace, with its own staff, time zone and data.

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
| Auth | Sign in with email or mobile number; strong-password policy; lockout after 5 failed attempts; JWT access and refresh tokens; scrypt hashes |
| AI | scikit-learn (inquiry reader, equipment predictor), OpenCV YuNet + SFace (face check-in) |

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

The first start trains the two scikit-learn models (about 40 seconds); later starts load them from `backend/.models/`.

If you ran an older version before, wipe the old demo data first: `docker compose down -v`.

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

These accounts are created by `seed_demo`. They are fictional companies. Every one has the password **`Pulse@Demo2026`**, and you can sign in with the **email or the mobile number**.

| Company | Email | Mobile | Role |
|---|---|---|---|
| Royal Caterers, Islamabad | owner@royal-demo.pk | 0300 0000001 | Owner |
| | manager@royal-demo.pk | 0300 0000002 | Manager |
| | staff@royal-demo.pk | 0300 0000003 | Staff |
| | driver@royal-demo.pk | 0300 0000004 | Driver |
| | accounts@royal-demo.pk | 0300 0000005 | Accounts |
| Crescent Events, Dubai | owner@crescent-demo.ae | +971 50 000 0001 | Owner |
| | manager@crescent-demo.ae | +971 50 000 0002 | Manager |

Royal Caterers comes with clients, bookings (two today, one live), stock and staff. Sign in to both companies to show that one company can never see another company's data.

### Camera features

QR scanning and face check-in use the webcam. Browsers only allow the camera on `https://` or on `http://localhost`, so open the app on localhost or through the Codespaces https address. Faces must be registered first (Staff & Attendance → Staff → Register face), and only for staff whose consent is recorded.

### Tests

The tests need the database to be running.

```bash
cd backend
pytest
```

---

## Sign-in security

- Accounts are created by a company's owner or manager. Only a new company's owner signs up publicly.
- Sign in with the registered email or mobile number (any format: `0300 1234567`, `+92 300 1234567`, `+971…`). Numbers are stored in international format, so each mobile number belongs to one account.
- Passwords must be at least 10 characters with upper and lower case letters, a number and a symbol; no common words, no repeated or sequential runs, and nothing from the person's name or email. The same rules run in the browser (live checklist) and on the server.
- After 5 wrong passwords the account is locked for 15 minutes. An owner or manager can reset a member's password, which also unlocks it.
- Changing a password signs out every other device.

## AI in each module

| Module | Feature | Technique | Result on held-out tests |
|---|---|---|---|
| M1 | Inquiry reader: reads a WhatsApp or email inquiry (English or Roman Urdu) and fills the booking form | TF-IDF + logistic regression for event type; MaxEnt BIO tagger for date, time, guests, venue and dishes | 98.6% of fields correct on 20 hand-written messages; event type 100%, entity F1 0.997 on synthetic test set |
| M2 | Equipment predictor: how many plates, glasses, chafing dishes and so on to send | Gradient-boosted regression per category, trained on simulated past events | 5.9% weighted error against 31.2% for the usual rule of thumb (81% lower) |
| M3 | Face check-in with anti-spoofing | YuNet face detector, SFace embeddings (cosine match), head-turn liveness challenge | A still photo or screen fails the liveness check; only embeddings are stored, never photos |

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

## Look and feel

The theme comes from Multani blue pottery: porcelain white, cobalt glaze (`brand-*`), kashi turquoise (`kashi-*`) and saffron (`saffron-*`). Headings use **Marcellus** and body text uses **Figtree**. The colours, shadows and animations live in `frontend/tailwind.config.js`.

To keep the three modules looking like one product, build your screens from `frontend/src/components/ui`:
`Button`, `Field`, `SelectField`, `StepperField`, `Card`, `PageHeader`, `Badge`, `Alert`, `Avatar`, `Skeleton`, `EmptyState`, plus `useToast()` for confirmations. Use `toast('Booking saved')` after a successful action.

Motion follows one rule: animate in response to what the user does (opening, saving, navigating). Everything is switched off automatically for people who turn on "reduce motion" in their system settings.

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
