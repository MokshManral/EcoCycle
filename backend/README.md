# EcoCycle Backend

FastAPI backend for the EcoCycle waste segregation and recycling platform.

## Quick Start

```bash
cd backend

# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # macOS / Linux
# .venv\Scripts\activate           # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env — the defaults work for local development

# 4. Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server starts at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

## Run Tests

```bash
pytest tests/ -v
```

## Connect the Frontend

In `frontend/.env`:
```
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK_DATA=false
```

No frontend code changes are needed to switch from mock data to the real backend.

## Project Structure

```
backend/
├── app/
│   ├── main.py              # App entry point, CORS, startup
│   ├── database.py          # SQLAlchemy engine and session
│   ├── models.py            # ORM models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── core/
│   │   └── config.py        # Settings from .env
│   ├── api/
│   │   ├── health.py        # GET /api/health
│   │   ├── waste.py         # POST /api/waste/analyze
│   │   ├── pickups.py       # Pickup lifecycle routes
│   │   ├── users.py         # GET /api/user/points
│   │   └── impact.py        # GET /api/impact
│   ├── services/
│   │   ├── classifier.py    # AI adapter (mock + real)
│   │   ├── waste_service.py # Image validation and analysis
│   │   ├── pickup_service.py# Pickup business logic
│   │   ├── points_service.py# Points ledger queries
│   │   └── impact_service.py# Impact aggregation
│   └── utils/
│       └── errors.py        # HTTP error helpers
├── tests/                   # Pytest test suite
├── docs/API.md              # Full API contract documentation
├── .env.example             # Environment variable template
├── requirements.txt
└── README.md
```

## Technology Stack

- **FastAPI** — web framework
- **SQLAlchemy** — ORM
- **SQLite** — local development database (auto-created)
- **PostgreSQL** — production database (set `DATABASE_URL` in `.env`)
- **Pydantic** — request/response validation
- **Uvicorn** — ASGI server
- **Pytest + httpx** — tests

## Environment Variables

See `.env.example` for all available variables. Key ones:

| Variable           | Default                    | Notes                         |
|--------------------|----------------------------|-------------------------------|
| `DATABASE_URL`     | `sqlite:///./EcoCycle.db`   | SQLite for dev, PostgreSQL for prod |
| `MOCK_CLASSIFIER`  | `true`                     | `false` to use real AI module |
| `FRONTEND_ORIGINS` | `http://localhost:5173,...` | CORS allowed origins          |
| `APP_ENV`          | `development`              | `production` disables SQL echo |

## AI Integration

The classifier is behind a stable interface in `app/services/classifier.py`.

- `MOCK_CLASSIFIER=true` — deterministic keyword-based mock (no AI key needed)
- `MOCK_CLASSIFIER=false` — calls `_real_classify()`, which you replace with the AI team's adapter

The route handler never sees the AI provider's raw response — it only receives `WasteAnalysisResponse`.

## Notes for the AI Team

To integrate your classifier:
1. Edit `app/services/classifier.py` → `_real_classify()`.
2. Import your module and call it with `image_bytes`.
3. Normalize the result into `WasteAnalysisResponse`.
4. The route handler requires no changes.

## Security Notes

- OTPs are SHA-256 hashed before storage. Plain OTPs are never logged or stored.
- Max 5 OTP attempts per pickup to prevent brute-force.
- `MOCK_CLASSIFIER=true` state is logged clearly at startup.
- `.env` is in `.gitignore` — never commit secrets.
- This MVP uses a demo identity (no auth). Add JWT auth before production deployment.
