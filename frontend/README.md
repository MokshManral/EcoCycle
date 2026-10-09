# EcoCycle frontend

React + Vite + Tailwind + React Router. Runs fully on mock data or against the FastAPI backend.

## Run

```bash
npm install
cp .env.example .env     # then edit values
npm run dev              # http://localhost:5173
npm run build            # production build in dist/
```

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |
| `VITE_USE_MOCK_DATA` | `true` | `true` = use `src/mock/` and ignore the backend. `false` = call the real API |

All `VITE_` variables are public in the browser bundle. Never put secrets in them.
While mock mode is on, every app screen shows a "Demo mode" banner.

## Routes

| Route | Page | View |
| --- | --- | --- |
| `/` | Landing | public |
| `/dashboard`, `/scan`, `/analysis`, `/pickup/new`, `/pickups`, `/pickups/:pickupId`, `/impact` | Citizen flow | citizen |
| `/collector`, `/collector/pickups/:pickupId` | Collector queue and details | collector |
| `/admin` | Read-only overview | admin |

There is no authentication. The sidebar "Demo view" switcher moves between roles.

## Architecture

- `src/services/api.js` is the only place that calls `fetch`. Image upload uses `FormData` and never sets `Content-Type`.
- `wasteService`, `pickupService` and `impactService` choose mock or real implementations. Pages are identical in both modes.
- `src/mock/pickups.js` is an in-memory fake backend (resets on refresh). OTP checking, accepted-only verification, and duplicate-verification rejection happen there, mirroring what the real backend must do.
- The frontend never marks a pickup collected or awards points itself. It only displays what the backend returns (`points_awarded`, `status`).

## Try the demo flow

1. `/scan`: upload any image. Filename hints steer the mock result (`bottle`, `battery`, `can`, `box`, `glass`; `unknown` gives the "can't identify" state; `box` gives a low-confidence warning).
2. `/analysis` → Request pickup → submit.
3. `/collector` → Accept the new request.
4. Open the pickup as a citizen (`/pickups/:id`) to see the handover code. Seeded accepted pickup `PK-1003` uses code `482913`.
5. As collector, enter the code. A wrong code is rejected; a repeat verification is rejected without extra points.
6. `/dashboard` and `/impact` update from the refreshed data.

## Assumed API schemas (confirm with the backend owner)

The brief fixes endpoint paths but not payloads. These are the assumptions used in code and mocks. Change them in one place (`services/` and `mock/`) if the backend differs.

- `POST /api/waste/analyze`: multipart field **`file`** → `{ item_name, category, confidence, hazard_warning, disposal_method, recycler: {name, address} | null, estimated_points }`. All fields null when unidentified.
- `POST /api/pickup/request` JSON: `{ waste_item, category, quantity, address, preferred_date, instructions }` → pickup.
- Pickup: `{ pickup_id, waste_item, category, quantity, address, preferred_date, instructions, status, created_at, collector: {id, name, phone} | null, points_awarded, otp? }`. `status` is one of `requested | accepted | collected | cancelled`.
- `PATCH /api/pickup/{id}/accept` → pickup.
- `POST /api/pickup/{id}/verify` JSON `{ otp }` → `{ pickup_id, status, verified, points_awarded }`.
- `GET /api/user/points` → `{ total_points, transactions: [{ id, pickup_id, points, description, created_at }] }`.
- `GET /api/impact` → `{ completed_pickups, items_collected, category_breakdown: [{ category, count }], recent_activity: [pickup] }`.
- Categories: `plastic, paper, glass, metal, e-waste, organic, hazardous, other`.

Open points to raise with the backend owner:

- **OTP exposure:** `otp` must only be returned to the owning citizen while status is `accepted`, never to collectors or admins. The UI only renders it in the citizen view, but the server must enforce this.
- **Role scoping:** `GET /api/pickup` has no role/user parameter. The citizen, collector and admin views all call it. The backend needs to scope results by caller (or the contract needs a filter).
- **Admin aggregates:** computed client-side from `GET /api/pickup`; no admin or recycler endpoint exists in the contract.
- **Upload limits:** the frontend enforces JPG/PNG/WebP up to 5 MB. Align with the backend.
- **Cancellation:** not in the API, so no cancel UI is shown.

## Accessibility

Semantic landmarks and skip link, labeled controls, `aria-invalid`/`role="alert"` on errors, status shown with icon + text (not color alone), visible focus rings, reduced-motion support, modal dialogs via native `<dialog>`.
