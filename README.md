# EcoCycle

EcoCycle is a waste segregation and recycling platform that helps citizens identify waste, request pickups, track collection status, and earn EcoPoints after verified handover.

This monorepo contains:
- a FastAPI backend for analysis, pickup workflows, impact tracking, and data APIs
- a React + Vite + Tailwind frontend for the citizen, collector, and admin demo views

## Features

- AI-style waste identification from uploaded images
- Category-based recycling guidance and safety warnings
- Pickup request flow from request to acceptance to verified collection
- OTP-based handover verification
- EcoPoints tracking and impact summaries
- Demo dashboards for citizen, collector, and admin roles

## Tech Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- SQLite for local development
- Pydantic
- Pytest

### Frontend
- React
- Vite
- Tailwind CSS
- React Router

## Project Structure

```text
EcoCycle/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── docs/
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── README.md
├── .gitignore
├── README.md
└── .DS_Store (ignored locally)
```

## Quick Start

### 1) Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend URL:
- http://localhost:8000
- Swagger docs: http://localhost:8000/docs

### 2) Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend URL:
- http://localhost:5173

## Environment Variables

### Backend
Configure values in `backend/.env`.

Common settings include:
- `DATABASE_URL`
- `MOCK_CLASSIFIER`
- `FRONTEND_ORIGINS`
- `APP_ENV`

See `backend/.env.example` for the full list.

### Frontend
Configure values in `frontend/.env`.

Common settings include:
- `VITE_API_URL=http://localhost:8000`
- `VITE_USE_MOCK_DATA=true` or `false`

## Demo Mode

The app supports mock/demo data so the UI can run without the backend during development.

- `VITE_USE_MOCK_DATA=true` uses in-memory mock data in the frontend
- `VITE_USE_MOCK_DATA=false` connects to the live FastAPI backend

## API Overview

The backend exposes endpoints under `/api` for:
- health checks
- waste analysis
- pickup requests and lifecycle updates
- user points and impact summaries

Detailed API documentation is available in:
- `backend/docs/API.md`
- Swagger UI at http://localhost:8000/docs

## Testing

### Backend

```bash
cd backend
pytest tests/ -v
```

### Frontend

```bash
cd frontend
npm run build
```

## Notes

- `.env` files and secrets are ignored by Git
- local caches and generated folders such as `__pycache__`, `.pytest_cache`, `node_modules`, and `dist` should not be committed
- the app is structured as a demo/prototype and is intended for local development and demonstration workflows

## Default Demo Flow

1. Open the frontend homepage
2. Upload an image on the waste scan page
3. Review the analysis result
4. Request a pickup
5. Accept the request from the collector dashboard
6. Verify the handover code and collect EcoPoints

## License

This project is currently intended for educational/demo use and is not configured for production deployment as-is.
