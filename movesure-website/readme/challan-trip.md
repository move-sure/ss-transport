# Truck Trips API

## Overview

A **Truck Trip** groups multiple challan numbers under one physical truck movement.
One trip = one truck departure. Multiple challans link to the trip via `truck_trip_id` on `challan_details`.

---

## Trip Lifecycle

```
PENDING  →  DISPATCHED  →  RECEIVED
   │              │
   ├─ add/remove challans
   └─ delete (only pending)
```

| Status | Meaning |
|--------|---------|
| `pending` | Trip created, challans being added |
| `dispatched` | Truck has left — `dispatch_date` set |
| `received` | Arrived at hub — `received_date` set |

---

## Frontend: Create Trip Modal

### Recommended flow (single API call)

**Step 1 — Load modal data (trucks, staff, challans)**
```
GET /api/truck-trips/init?branch_id=<uuid>
```
Returns all active trucks, all staff (split into `drivers` + `owners`), and all challans not yet linked to any trip. Load this once when the modal opens.

**Step 2 — User fills form and submits**

User selects:
- Truck (required)
- Driver (optional, from staff list)
- Owner (optional, from staff list)
- One or more Challans (from unlinked challan list)
- Remarks (optional)

**Step 3 — Submit: create trip + link challans atomically**
```
POST /api/truck-trips/create-with-challans
```
Single call — no need to call create then link separately.

**Step 4 — To add one more challan later**
```
POST /api/truck-trips/{trip_id}/add-challan/{challan_id}
```

---

## API Reference

### Page-load: Get Modal Data
`GET /api/truck-trips/init`

| Param | Type | Description |
|-------|------|-------------|
| `branch_id` | uuid (optional) | Filters unlinked challans to this branch |

**Response:**
```json
{
  "status": "success",
  "data": {
    "trucks": [
      { "id": "uuid", "truck_number": "UP70CE1234", "truck_type": "HCV",
        "is_available": true, "current_location": "Lucknow" }
    ],
    "staff": [ ...all active staff... ],
    "drivers": [ ...staff where post contains "driver"... ],
    "owners":  [ ...all other staff... ],
    "challans": [
      { "id": "uuid", "challan_no": "0235", "date": "2026-06-03",
        "branch_id": "uuid", "total_bilty_count": 12,
        "is_dispatched": false, "truck_trip_id": null }
    ]
  }
}
```

---

### Create Trip + Link Challans (Atomic)
`POST /api/truck-trips/create-with-challans`

**Body:**
```json
{
  "truck_id":   "uuid",
  "driver_id":  "uuid",
  "owner_id":   "uuid",
  "branch_id":  "uuid",
  "remarks":    "Jaunpur run",
  "created_by": "uuid",
  "challan_ids": ["uuid-1", "uuid-2"]
}
```

`challan_ids` can be empty `[]` if no challans yet.

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "trip_no": "TR-20260603-0001",
    "truck_number": "UP70CE1234",
    "driver_name": "Ram Singh",
    "owner_name": "Shyam Lal",
    "status": "pending",
    "total_challan_count": 2,
    "challan_nos": ["0235", "0236"],
    "challans": [ ...full challan rows... ]
  },
  "link_summary": {
    "newly_linked": ["0235", "0236"],
    "already_in_another_trip": [],
    "not_found": []
  }
}
```

---

### Add One Challan to Existing Trip
`POST /api/truck-trips/{trip_id}/add-challan/{challan_id}`

Body (optional):
```json
{ "user_id": "uuid" }
```

**Response:**
```json
{
  "status": "success",
  "linked_count": 3,
  "newly_linked": ["0237"],
  "already_in_another_trip": [],
  "not_found": []
}
```

---

### List Trips
`GET /api/truck-trips`

| Param | Type | Description |
|-------|------|-------------|
| `branch_id` | uuid | Filter by branch |
| `truck_id` | uuid | Filter by truck |
| `status` | string | `pending` / `dispatched` / `received` |
| `search` | string | Search by trip_no |
| `page` | int | Default 1 |
| `page_size` | int | Default 40 |

---

### Get Trip (with challans)
`GET /api/truck-trips/{trip_id}`

Returns the trip row plus a `challans` array with full challan detail.

---

### Create Trip (no challans)
`POST /api/truck-trips`

Same body as create-with-challans but without `challan_ids`.

---

### Update Trip
`PUT /api/truck-trips/{trip_id}`

Updatable: `driver_id`, `owner_id`, `branch_id`, `truck_id`, `remarks`.
Cannot update received trips.

---

### Dispatch Trip
`POST /api/truck-trips/{trip_id}/dispatch`

Requires at least 1 challan linked. Sets `dispatch_date`, status → `dispatched`.
```json
{ "user_id": "uuid" }
```

---

### Mark Received at Hub
`POST /api/truck-trips/{trip_id}/receive`

Sets `received_date`, status → `received`.
```json
{ "user_id": "uuid" }
```

---

### Link Multiple Challans
`POST /api/truck-trips/{trip_id}/link-challans`

```json
{ "challan_ids": ["uuid-1", "uuid-2"], "user_id": "uuid" }
```

---

### Unlink Challan from Trip
`POST /api/truck-trips/{trip_id}/unlink-challan/{challan_id}`

Sets `truck_trip_id = null` on that challan. Not allowed on received trips.

---

### Delete Trip
`DELETE /api/truck-trips/{trip_id}`

Only `pending` trips can be deleted. Unlinks all challans.

---

## Staff API

Used for driver and owner dropdowns.

### List Staff
`GET /api/staff`

| Param | Type | Description |
|-------|------|-------------|
| `post` | string | Filter by post (e.g. `driver`) |
| `active_only` | bool | Default `true` |
| `search` | string | Search by name or mobile |
| `page` | int | Default 1 |
| `page_size` | int | Default 100 |

**Response:**
```json
{
  "status": "success",
  "data": {
    "rows": [
      {
        "id": "uuid",
        "name": "Ram Singh",
        "post": "Driver",
        "mobile_number": "9876543210",
        "license_number": "UP-123456",
        "is_active": true
      }
    ],
    "total": 18,
    "page": 1,
    "page_size": 100,
    "has_more": false
  }
}
```

> **Tip:** Use `GET /api/truck-trips/init` instead of calling `/api/staff` separately — it returns pre-split `drivers` and `owners` arrays in one request.

### Get Staff Member
`GET /api/staff/{staff_id}`

### Create Staff
`POST /api/staff`
```json
{
  "name": "Ram Singh",
  "post": "Driver",
  "mobile_number": "9876543210",
  "license_number": "UP-123456",
  "aadhar_number": "1234-5678-9012"
}
```

### Update Staff
`PUT /api/staff/{staff_id}`

### Deactivate Staff
`DELETE /api/staff/{staff_id}`

---

## Trucks API

### List Trucks
`GET /api/trucks`

| Param | Type | Description |
|-------|------|-------------|
| `active_only` | bool | Default `true` |
| `available_only` | bool | Only trucks with `is_available=true` |
| `search` | string | Search by truck_number |
| `page` | int | Default 1 |
| `page_size` | int | Default 100 |

**Response:**
```json
{
  "status": "success",
  "data": {
    "rows": [
      {
        "id": "uuid",
        "truck_number": "UP70CE1234",
        "truck_type": "HCV",
        "is_available": true,
        "current_location": "Lucknow",
        "loading_capacity": 10
      }
    ],
    "total": 12
  }
}
```

### Get Truck
`GET /api/trucks/{truck_id}`

---

## Error Responses

```json
{ "status": "error", "message": "...", "status_code": 400 }
```

| Error | When |
|-------|------|
| `Missing fields: truck_id, created_by` | Required fields missing |
| `Cannot dispatch an empty trip` | No challans linked |
| `Trip is already dispatched` | Already in that state |
| `Cannot update a received trip` | Locked after receipt |
| `Only pending trips can be deleted` | Can't delete dispatched/received |

---

## Backward Compatibility

- All existing challan APIs unchanged.
- Challans created before this feature have `truck_trip_id = null` and work normally.
- Existing `truck_id`, `driver_id`, `owner_id` on `challan_details` still editable independently.
