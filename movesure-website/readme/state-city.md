# Cities & States API

Covers the `states` master table and all city/state operations.

---

## Migration

Run `migrations/002_add_states_and_city_state.sql` once in your Supabase SQL editor.

What it does:
- Creates `public.states` table (GST-aligned Indian state codes, 38 states pre-seeded)
- Adds `state_id`, `state_code`, `state_name` columns to `public.cities`
- Adds FK `cities.state_id → states.id`
- Adds performance indexes

---

## States CRUD

Uses the existing generic master-data routes with `entity = states`.

### List states (paginated)
```
GET /api/bilty/master/states?page=1&page_size=40&search=Maharashtra
```
Response:
```json
{
  "status": "success",
  "data": {
    "rows": [
      { "id": "uuid", "state_code": "27", "state_name": "Maharashtra", ... }
    ],
    "page": 1,
    "page_size": 40,
    "total": 38,
    "has_more": false
  }
}
```

### Get single state
```
GET /api/bilty/master/states/{state_id}
```

### Create state
```
POST /api/bilty/master/states
Content-Type: application/json

{
  "state_code": "99",
  "state_name": "Custom State",
  "user_id": "<your-user-uuid>"
}
```

### Update state
```
PUT /api/bilty/master/states/{state_id}
Content-Type: application/json

{
  "state_name": "Updated Name",
  "user_id": "<your-user-uuid>"
}
```

### Delete state
```
DELETE /api/bilty/master/states/{state_id}
```

### Bulk create states
```
POST /api/bilty/master/states/bulk-create
Content-Type: application/json

{
  "user_id": "<uuid>",
  "records": [
    { "state_code": "A1", "state_name": "State One" },
    { "state_code": "A2", "state_name": "State Two" }
  ]
}
```

### Bulk update states
```
PUT /api/bilty/master/states/bulk-update
Content-Type: application/json

{
  "user_id": "<uuid>",
  "updates": [
    { "id": "<uuid>", "state_name": "New Name" }
  ]
}
```

---

## Cities CRUD (now includes state fields)

Same generic master-data routes, `entity = cities`. State fields (`state_id`, `state_code`, `state_name`) are returned automatically.

### List cities
```
GET /api/bilty/master/cities?page=1&search=Mumbai
```
Response rows now include:
```json
{
  "id": "uuid",
  "city_code": "MUM",
  "city_name": "Mumbai",
  "state_id": "uuid",
  "state_code": "27",
  "state_name": "Maharashtra",
  "created_by": "John",
  "updated_by": "John",
  "created_at": "...",
  "updated_at": "..."
}
```

### Create city (with state)
```
POST /api/bilty/master/cities
Content-Type: application/json

{
  "city_code": "MUM",
  "city_name": "Mumbai",
  "state_id": "<state-uuid>",
  "state_code": "27",
  "state_name": "Maharashtra",
  "user_id": "<your-user-uuid>"
}
```

---

## Assign State to City

### Single city — assign state
```
PUT /api/master/cities/{city_id}/assign-state
Content-Type: application/json

{
  "state_id": "<state-uuid>",
  "user_id": "<your-user-uuid>"
}
```

The service looks up the state record, then writes `state_id`, `state_code`, and `state_name` onto the city row in one update.

**Success response:**
```json
{
  "status": "success",
  "message": "State assigned to city",
  "data": {
    "id": "city-uuid",
    "city_code": "MUM",
    "city_name": "Mumbai",
    "state_id": "state-uuid",
    "state_code": "27",
    "state_name": "Maharashtra",
    "updated_at": "2026-07-04T..."
  }
}
```

**Error — city not found:**
```json
{ "status": "error", "message": "City not found", "status_code": 404 }
```

**Error — state not found:**
```json
{ "status": "error", "message": "State not found: <uuid>", "status_code": 404 }
```

---

### Bulk assign state to cities
```
PUT /api/master/cities/bulk-assign-state
Content-Type: application/json

{
  "user_id": "<your-user-uuid>",
  "updates": [
    { "city_id": "<uuid>", "state_id": "<uuid>" },
    { "city_id": "<uuid>", "state_id": "<uuid>" },
    { "city_id": "<uuid>", "state_id": "<uuid>" }
  ]
}
```

- All unique `state_id`s are resolved in a **single DB query** (efficient for large batches).
- Each city is updated individually; failures are collected and reported without stopping the batch.

**Success response:**
```json
{
  "status": "success",
  "message": "Bulk state assignment: 3 updated, 0 failed",
  "data": {
    "success_count": 3,
    "failed_count": 0,
    "failed": []
  }
}
```

**Partial failure response:**
```json
{
  "status": "success",
  "message": "Bulk state assignment: 2 updated, 1 failed",
  "data": {
    "success_count": 2,
    "failed_count": 1,
    "failed": [
      { "city_id": "bad-uuid", "error": "City not found" }
    ]
  }
}
```

---

## Bulk update city fields (generic)

To update city name / city code alongside state in one call, use the generic bulk-update:

```
PUT /api/bilty/master/cities/bulk-update
Content-Type: application/json

{
  "user_id": "<uuid>",
  "updates": [
    {
      "id": "<city-uuid>",
      "city_name": "New Name",
      "state_id": "<state-uuid>",
      "state_code": "27",
      "state_name": "Maharashtra"
    }
  ]
}
```

> **Note:** When using generic bulk-update, pass `state_code` and `state_name` explicitly since the service won't look them up automatically. Use the dedicated `/assign-state` endpoint when you only know the `state_id`.

---

## Field reference

### `states` table
| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK, auto-generated |
| `state_code` | varchar | Unique, GST state code (e.g. `"27"`) |
| `state_name` | varchar | Human-readable name |
| `created_by` | uuid | User who created |
| `updated_by` | uuid | User who last updated |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

### New columns on `cities`
| Field | Type | Notes |
|-------|------|-------|
| `state_id` | uuid | FK → `states.id`, nullable |
| `state_code` | varchar | Denormalised for fast queries |
| `state_name` | varchar | Denormalised for fast queries |
