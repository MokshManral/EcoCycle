# EcoCycle API Documentation

**Base URL:** `http://localhost:8000` (development)  
**API prefix:** `/api`  
**Interactive docs:** `http://localhost:8000/docs` (Swagger UI)  
**Alternative docs:** `http://localhost:8000/redoc`

---

## Contract Rules

All endpoints follow these rules:

- JSON field names use `snake_case`.
- Timestamps are ISO 8601, e.g. `2026-10-10T10:00:00Z`.
- Numeric values are returned as numbers, not formatted strings.
- `null` is only used for genuinely optional fields.
- Error responses use FastAPI's default `{ "detail": "..." }` format.
- Category and status values are lowercase strings (see enums below).

---

## Enums

### Waste Category

| Value       | Description                        |
|-------------|------------------------------------|
| `plastic`   | Plastic items                      |
| `paper`     | Paper and cardboard                |
| `glass`     | Glass containers and jars          |
| `metal`     | Metal cans and items               |
| `e-waste`   | Electronic waste                   |
| `organic`   | Organic / food waste               |
| `hazardous` | Batteries, chemicals               |
| `other`     | General / non-recyclable           |

### Pickup Status

| Value       | Description                    | Terminal? |
|-------------|--------------------------------|-----------|
| `requested` | Created, awaiting collector    | No        |
| `accepted`  | Collector assigned, OTP active | No        |
| `collected` | Verified handover complete     | **Yes**   |
| `cancelled` | Cancelled at any pre-collected stage | **Yes** |

### State Transitions

```
requested → accepted → collected
requested → cancelled
accepted  → cancelled
```

Invalid transitions return `409 Conflict`.

---

## Endpoints

---

### `GET /api/health`

Liveness check.

**Response `200`:**
```json
{ "status": "ok" }
```

---

### `POST /api/waste/analyze`

Upload a waste image and receive AI classification.

**Request:** `multipart/form-data`

| Field  | Type   | Required | Notes                          |
|--------|--------|----------|--------------------------------|
| `file` | binary | Yes      | JPEG, PNG, or WebP; max 5 MB   |

**Response `200`:**
```json
{
  "item_name":      "PET plastic bottle",
  "category":       "plastic",
  "confidence":     0.94,
  "hazard_warning": null,
  "disposal_method": "Empty, rinse and flatten...",
  "recycler": {
    "name":    "Demo Plastics Recovery Centre",
    "address": "Sample Industrial Area, Block C"
  },
  "estimated_points": 12
}
```

All fields are nullable. When the classifier cannot identify the item, all fields return `null`.

**Errors:**
| Status | Condition |
|--------|-----------|
| `413`  | File > 5 MB |
| `415`  | Non-image file type |
| `422`  | Missing `file` field |
| `500`  | Classifier failure |

---

### `POST /api/pickup/request`

Create a pickup request.

**Request body (JSON):**
```json
{
  "waste_item":     "Old laptop charger",
  "category":       "e-waste",
  "quantity":       2,
  "address":        "Flat 12, Sample Residency, Demo Nagar",
  "preferred_date": "2026-10-12",
  "instructions":   "Call at the gate."
}
```

| Field            | Type    | Required | Validation                   |
|------------------|---------|----------|------------------------------|
| `waste_item`     | string  | Yes      | min 1 char                   |
| `category`       | string  | Yes      | must be a valid category enum |
| `quantity`       | integer | Yes      | ≥ 1                          |
| `address`        | string  | Yes      | min 8 chars                  |
| `preferred_date` | string  | No       | `YYYY-MM-DD` format or null  |
| `instructions`   | string  | No       | defaults to `""`             |

**Response `201`:** Pickup object (see Pickup Object below).

---

### `GET /api/pickup`

List all pickup requests.

**Query parameters:**

| Param    | Type   | Required | Notes                                      |
|----------|--------|----------|--------------------------------------------|
| `status` | string | No       | Filter by status enum value                |
| `viewer` | string | No       | `citizen` (default) or `collector`         |

**Response `200`:** JSON array of pickup objects.
```json
[
  { "pickup_id": "...", "status": "requested", ... },
  { "pickup_id": "...", "status": "collected", ... }
]
```

---

### `GET /api/pickup/{pickup_id}`

Get a single pickup's details.

**Query parameters:**

| Param    | Type   | Required | Notes                               |
|----------|--------|----------|-------------------------------------|
| `viewer` | string | No       | `citizen` (default) or `collector`  |

**Response `200`:** Pickup object.  
**Response `404`:** Pickup not found.

---

### `PATCH /api/pickup/{pickup_id}/accept`

Collector accepts a pickup request.

No request body required.

**Response `200`:** Updated pickup object (citizen view — includes OTP when status is `accepted`).

**Business rules:**
- Only `requested` pickups can be accepted.
- Generates a 6-digit OTP, hashed and stored server-side.
- Returns the plain OTP **once** in the response for the citizen.

**Errors:**
| Status | Condition |
|--------|-----------|
| `404`  | Pickup not found |
| `409`  | Pickup is not in `requested` status |

---

### `POST /api/pickup/{pickup_id}/verify`

Verify the waste handover using the OTP.

**Request body (JSON):**
```json
{ "otp": "482913" }
```

OTP must be exactly 6 digits.

**Response `200`:**
```json
{
  "pickup_id":      "abc-123",
  "status":         "collected",
  "verified":       true,
  "points_awarded": 60
}
```

**Business rules:**
- Only `accepted` pickups can be verified.
- OTP is validated server-side (SHA-256 comparison).
- Max 5 incorrect attempts before the pickup is locked.
- Points = `POINTS_PER_UNIT[category] × quantity`.
- Points are awarded atomically with the status change.
- Duplicate verification → `409` (no duplicate points).

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Wrong OTP or attempts exhausted |
| `404`  | Pickup not found |
| `409`  | Already collected or not accepted |
| `422`  | OTP not 6 digits |

---

### `GET /api/user/points`

User's points balance and transaction history.

**Response `200`:**
```json
{
  "total_points": 150,
  "transactions": [
    {
      "id":          "uuid",
      "pickup_id":   "uuid",
      "points":      60,
      "description": "Verified pickup: Old laptop charger",
      "created_at":  "2026-10-10T10:30:00Z"
    }
  ]
}
```

Points are calculated from the transaction ledger. The backend never trusts a points value from the frontend.

---

### `GET /api/impact`

Environmental impact dashboard metrics.

**Response `200`:**
```json
{
  "completed_pickups": 6,
  "items_collected":   24,
  "category_breakdown": [
    { "category": "glass",   "count": 10 },
    { "category": "plastic", "count": 14 }
  ],
  "recent_activity": [
    {
      "pickup_id":  "uuid",
      "waste_item": "Glass jars",
      "quantity":   5,
      "created_at": "2026-10-10T09:00:00Z"
    }
  ]
}
```

**Calculation method:**
- `completed_pickups` — COUNT of pickups with `status = 'collected'`.
- `items_collected` — SUM of `quantity` for completed pickups.
- `category_breakdown` — GROUP BY `category`, SUM(`quantity`) for completed pickups.
- `recent_activity` — last 5 completed pickups ordered by `completed_at DESC`.

No invented environmental conversion factors are used.

---

## Pickup Object

The full pickup object schema returned by list/detail/create/accept endpoints:

```json
{
  "pickup_id":      "uuid",
  "waste_item":     "Old laptop charger",
  "category":       "e-waste",
  "quantity":       2,
  "address":        "Flat 12, Sample Residency, Demo Nagar",
  "preferred_date": null,
  "instructions":   "Call at the gate.",
  "status":         "accepted",
  "created_at":     "2026-10-10T10:00:00Z",
  "collector": {
    "id":    "uuid",
    "name":  "Demo Collector",
    "phone": null
  },
  "points_awarded": null,
  "otp":            "482913"
}
```

**OTP visibility rules:**
- `otp` is only included when `viewer=citizen` **AND** `status=accepted`.
- In all other cases the `otp` field is `null` or absent.
- This is enforced server-side.

---

## Points Per Unit

Used to calculate points at verification time:

| Category    | Points per item |
|-------------|-----------------|
| `plastic`   | 12              |
| `paper`     | 6               |
| `glass`     | 8               |
| `metal`     | 10              |
| `e-waste`   | 30              |
| `organic`   | 4               |
| `hazardous` | 30              |
| `other`     | 5               |

Formula: `points = POINTS_PER_UNIT[category] × quantity`

---

## Error Format

All errors use FastAPI's default format:

```json
{ "detail": "Human-readable error message." }
```

Validation errors (422):
```json
{
  "detail": [
    { "loc": ["body", "category"], "msg": "Category must be one of: ...", "type": "value_error" }
  ]
}
```

Stack traces and internal details are never returned to the client.

---

## Demo Identity (MVP)

This MVP uses a fixed demo identity (no authentication).

- **Citizen** — all pickup creation and points queries use the demo citizen user.
- **Collector** — all accept/verify operations use the demo collector user.

Use the `viewer` query parameter on list/detail endpoints to control OTP visibility.

**This is not production authentication.** Replace the demo identity dependencies in `app/api/pickups.py` and `app/api/users.py` with real JWT auth before deployment.

---

## Running Locally

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env as needed

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Running Tests

```bash
cd backend
pytest tests/ -v
```

## Frontend Integration

Set in `frontend/.env`:
```
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK_DATA=false
```

No frontend page changes are needed to switch from mock to real backend.
