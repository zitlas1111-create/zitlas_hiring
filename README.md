# ZITLAS Experts — Fitness Platform

AI + Human Experts for Better Fitness Results.

A full-stack fitness platform connecting users with certified Nutritionists and Fitness Trainers. Features AI-powered fitness assessment, diet plans, workout plans, and expert consultations.

---

## Project Structure

```
zitlas_hiring/
├── backend/
│   ├── main.py                   # FastAPI app entry point
│   ├── schemas.py                # Pydantic request/response models
│   ├── requirements.txt
│   ├── .env                      # Environment variables (copy from .env.example)
│   ├── routes/
│   │   ├── auth.py               # POST /api/auth/login|signup, GET /api/auth/me
│   │   ├── profiles.py           # GET|PUT /api/profile/me
│   │   ├── opportunities.py      # GET|POST /api/opportunities
│   │   ├── applications.py       # GET|POST /api/applications
│   │   └── ai.py                 # GET /api/ai/profile-suggestions|opportunity-matches
│   ├── services/                 # Business logic (auth, profile, opportunity, application, AI)
│   ├── database/
│   │   ├── models.py             # SQLAlchemy ORM models
│   │   ├── connection.py         # Engine, session factory, Base
│   │   └── migrations/           # Alembic migrations (run: alembic init migrations)
│   ├── middleware/
│   │   ├── auth.py               # JWT Bearer dependency
│   │   └── permissions.py        # Role-based access helpers
│   ├── uploads/                  # User-uploaded files
│   └── static/                   # Reserved for compiled frontend assets
└── frontend/
    ├── login.html / login.css / login.js
    ├── application-success.html
    ├── profile/academy|coach|nutritionist/
    ├── apply/academy|coach|nutritionist/
    ├── opportunities/academy|coach|nutritionist/
    └── shared/
        ├── auth-guard.js         # Synchronous session check (runs in <head>)
        └── bottom-nav.js
```

---

## Getting Started

### 1. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure environment

Edit `backend/.env`:

```env
DATABASE_URL=sqlite:///./zitlas.db          # default — zero config
# DATABASE_URL=postgresql://user:pass@host/db  # swap for production
SECRET_KEY=your-strong-random-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### 3. Start the server

```bash
cd backend
uvicorn main:app --reload
```

Open **http://127.0.0.1:8000** — the login page loads automatically.

---

## API Reference

Interactive docs available at **http://127.0.0.1:8000/api/docs** (Swagger UI) or **/api/redoc**.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | — | Register a new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | Current user info |
| GET | `/api/profile/me` | Bearer | Get my profile |
| PUT | `/api/profile/me` | Bearer | Save/update profile |
| POST | `/api/profile/me/publish` | Bearer | Publish profile |
| GET | `/api/opportunities` | — | List opportunities (`?role_type=coach`) |
| POST | `/api/opportunities` | Bearer | Post an opportunity |
| GET | `/api/applications` | Bearer | My applications |
| POST | `/api/applications` | Bearer | Apply to an opportunity |
| GET | `/api/ai/profile-suggestions` | Bearer | AI profile tips |
| GET | `/api/ai/opportunity-matches` | Bearer | AI opportunity matching |

---

## Authentication Flow

```
Browser → POST /api/auth/login
       ← { access_token, user }

Browser stores:
  localStorage['zitlas_token']   = JWT access_token
  localStorage['zitlas_session'] = { isLoggedIn: true, role, name, ... }

Protected pages → auth-guard.js checks localStorage → redirect to /login.html if missing

API calls → Authorization: Bearer <token>
```

---

## Database

- **Development**: SQLite (`backend/zitlas.db`) — created automatically on first run.
- **Production**: Change `DATABASE_URL` in `.env` to a PostgreSQL connection string.  
  The SQLAlchemy models use generic types (`String`, `JSON`, `Text`) compatible with both engines.
  Run Alembic migrations after switching: `alembic upgrade head`.

---

## User Roles

| Role | Can Post Opportunities | Can Apply |
|------|----------------------|-----------|
| academy | ✅ | — |
| scout | ✅ | — |
| coach | — | ✅ |
| player | — | ✅ |
| nutritionist | — | ✅ |
| physiotherapist | — | ✅ |
| psychologist | — | ✅ |

---

## Development Notes

- The frontend (`frontend/`) is served as static files by the backend. No build step required.
- `login.js` detects the serving protocol: uses the backend API over HTTP/HTTPS, falls back to localStorage for direct `file://` access.
- Auth guard (`frontend/shared/auth-guard.js`) is synchronous — it cannot make async API calls. It checks `localStorage['zitlas_session']` or `localStorage['zitlas_token']` and redirects to login if neither is present.
