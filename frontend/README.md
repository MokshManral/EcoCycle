# EcoCycle Frontend

React + Vite + Tailwind CSS app for the EcoCycle waste segregation workflow. It runs either in demo mode or against the live FastAPI backend.

## Local development

Start the backend first, then run the frontend in a second terminal:

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # macOS / Linux
# .venv\Scripts\activate           # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the app at http://localhost:5173 and the API docs at http://localhost:8000/docs.

## Environment variables

Copy `frontend/.env.example` to `.env` and adjust as needed.

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend |
| `VITE_USE_MOCK_DATA` | `true` | `true` uses the mock data layer; `false` calls the live backend |
| `VITE_FIREBASE_API_KEY` | empty | Firebase client config for real auth |
| `VITE_FIREBASE_AUTH_DOMAIN` | empty | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | empty | Firebase project id |
| `VITE_FIREBASE_STORAGE_BUCKET` | empty | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | empty | Firebase messaging sender id |
| `VITE_FIREBASE_APP_ID` | empty | Firebase app id |

All `VITE_` variables are public in the browser bundle. Never store secrets in them.

## Production deployment (AWS Amplify + Render)

The deployed frontend is served by Amplify and calls the FastAPI backend on Render:

- Frontend: https://main.d1cxpw7q8iu6oo.amplifyapp.com
- Backend API: https://ecocycle-backend-wl7u.onrender.com

Set these variables in **Amplify → App settings → Environment variables** for the branch being deployed:

| Variable | Production value |
| --- | --- |
| `VITE_API_URL` | `https://ecocycle-backend-wl7u.onrender.com` |
| `VITE_USE_MOCK_DATA` | `false` |

The repository includes `frontend/amplify.yml`, which sets the Amplify app root to `frontend` and publishes the Vite `dist` directory. Vite embeds `VITE_` values into the JavaScript during the build, so save the Amplify variables and redeploy after changing them. Do not commit local `.env` files; the repo `.gitignore` ignores them. Commit `.env.example` templates only.

The backend must allow the exact deployed frontend origin in its `FRONTEND_ORIGINS` setting; see [the backend README](../backend/README.md). To check connectivity, open `https://ecocycle-backend-wl7u.onrender.com/api/health`. If the browser console shows requests to `localhost:8000`, the deployed bundle was built without the production `VITE_API_URL`; if it reports a CORS error, check Render's `FRONTEND_ORIGINS` value.

## Demo accounts and roles

The app ships with demo users for all three portal roles:

- Citizen: `citizen@ecocycle.demo` / `citizen123`
- Collector: `collector@ecocycle.demo` / `collector123`
- Admin: `admin@ecocycle.demo` / `admin123`

These demo accounts work without a real backend auth service. If Firebase is configured, the app can also sign in with real Firebase users, but the demo accounts remain the fastest way to test the role-based flows.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/dashboard`, `/scan`, `/analysis`, `/pickup/new`, `/pickups`, `/pickups/:pickupId`, `/impact` | Citizen flow |
| `/collector`, `/collector/pickups/:pickupId` | Collector workflow |
| `/admin` | Admin overview |

The UI uses a demo role switcher to move between the citizen, collector, and admin experiences.

## Mock vs real backend

- `src/services/api.js` is the single fetch entry point.
- `wasteService`, `pickupService`, and `impactService` switch between mock and live implementations based on `VITE_USE_MOCK_DATA`.
- The mock layer is intentionally aligned with the backend contract so both flows can be tested with the same UI.
- The frontend never decides whether a pickup is collected or points are awarded; it only renders backend-returned status and award values.

## Demo flow

1. Open `/scan` and upload an image.
2. View the result on `/analysis` and submit a pickup request.
3. Login as the collector and accept the new pickup.
4. Open the pickup as a citizen to see the handover code.
5. Enter the code as the collector to complete the verified handoff.
6. Check `/dashboard` and `/impact` for updated counts and points.

## Assumed API contract

The frontend is built to the same contract exposed by the backend API. Keep both in sync when changing payloads.

- `POST /api/waste/analyze` → multipart form with `file` and a response containing category, confidence, warning flags, disposal instructions, and estimated points.
- `POST /api/pickup/request` → create a pickup request.
- `PATCH /api/pickup/{id}/accept` → accept a pickup.
- `POST /api/pickup/{id}/verify` → verify OTP and update status.
- `GET /api/user/points` → return total points and recent transactions.
- `GET /api/impact` → return completed pickups and impact metrics.

## Accessibility

The app includes semantic layouts, labeled form fields, visible focus states, alerts for invalid input, and status messaging that does not rely on color alone.
