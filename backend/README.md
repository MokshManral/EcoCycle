# EcoCycle Backend

FastAPI backend for the EcoCycle waste segregation and recycling platform. The backend serves the API used by the React frontend and can run with the demo classifier or an AWS Bedrock-backed classifier.

## Local startup

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
# Edit .env if needed; the defaults are already suitable for local development

# 4. Start the API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API runs at http://localhost:8000 and the Swagger docs live at http://localhost:8000/docs.

## Run the frontend alongside the backend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

This starts the app at http://localhost:5173 and points it to the local backend by default via `VITE_API_URL=http://localhost:8000`.

## Run tests

```bash
cd backend
pytest tests/ -v
```

## Environment variables

The backend reads values from `backend/.env` created from `.env.example`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./EcoCycle.db` | Local dev database |
| `APP_ENV` | `development` | App mode for local dev vs production |
| `SECRET_KEY` | `change-me-in-production` | Secret used for app-level security |
| `FRONTEND_ORIGINS` | `http://localhost:5173,http://localhost:4173` | Allowed frontend origins for CORS |
| `MOCK_CLASSIFIER` | `false` | `true` uses the local mock classifier; `false` enables the real classifier flow |
| `AWS_ACCESS_KEY_ID` | empty | Optional AWS credential for Bedrock access |
| `AWS_SECRET_ACCESS_KEY` | empty | Optional AWS credential for Bedrock access |
| `AWS_REGION` | `us-east-1` | AWS region |
| `BEDROCK_MODEL_ID` | `anthropic.claude-opus-4-8` | Bedrock model selection |
| `MAX_UPLOAD_BYTES` | `5242880` | Maximum upload size in bytes |

## Project structure

```text
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
│   │   ├── classifier.py    # AI adapter (mock + Bedrock-capable)
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

## AI classifier

The classifier is abstracted behind `app/services/classifier.py`.

- `MOCK_CLASSIFIER=true` → deterministic local fallback with no AWS configuration needed.
- `MOCK_CLASSIFIER=false` → real classifier flow with optional Bedrock fallback if AWS credentials and model settings are configured.

The API layer depends on the stable `WasteAnalysisResponse` contract instead of raw provider-specific output.

## Security notes

- OTPs are hashed before storage and never logged in plaintext.
- Maximum OTP attempts are limited to reduce brute-force abuse.
- `.env` should never be committed; it contains local secrets and credentials.
- This MVP uses demo-role flows rather than production auth. Add JWT or a proper identity provider before production deployment.

## API notes

The frontend and backend should stay aligned on the same pickup and waste-analysis payload shapes. If the behavior changes, update both the backend contract and the frontend mock implementation together.
