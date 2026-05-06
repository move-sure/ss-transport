# Kaat Update API

Base URL: `https://api.movesure.io`

---

## Overview

Two endpoints to update kaat fields in `bilty_wise_kaat`:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/kaat/bulk-update` | Update kaat_rate for all bilties of a transport + date range + destination station |
| `PATCH` | `/api/kaat/gr/{gr_no}` | Update any kaat field for a single GR number |

### Recalculation rules
- `kaat = weight × kaat_rate`
- `pf = total_freight − kaat`
- Changing `kaat_rate` automatically recalculates both `kaat` and `pf`
- Changing `kaat` directly recalculates `pf`
- `kaat_dd` (`dd_chrg`) can be set independently without affecting other fields

---

## 1. Bulk Update by Station

**`POST /api/kaat/bulk-update`**

Updates kaat_rate for every bilty of a transport in a date range whose **destination city** matches the given station name. Fetches bilties from both `bilty` table (regular) and `station_bilty_summary` table (manual).

### Request Body (JSON)

```json
{
  "transport_gstin": "09AWMPS0747E1Z8",
  "from_date": "2026-03-31",
  "to_date": "2026-04-30",
  "station_name": "SULTANPUR",
  "new_kaat_rate": 1.5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transport_gstin` | string | ✅ | Exact GSTIN of the transport |
| `from_date` | string | ✅ | Start date inclusive (YYYY-MM-DD) |
| `to_date` | string | ✅ | End date inclusive (YYYY-MM-DD) |
| `station_name` | string | ✅ | Destination city name (partial, case-insensitive). e.g. `"SULTANPUR"`, `"PRATAPGARH"`, `"RAIBARAILLY"` |
| `new_kaat_rate` | float | ✅ | New kaat rate — kaat = weight × rate |
| `new_kaat_dd` | float | ❌ | If provided, also updates `dd_chrg` for all matched bilties |

### Response

```json
{
  "status": "success",
  "transport_gstin": "09AWMPS0747E1Z8",
  "station_name": "SULTANPUR",
  "city_ids_matched": ["uuid1", "uuid2"],
  "from_date": "2026-03-31",
  "to_date": "2026-04-30",
  "new_kaat_rate": 1.5,
  "updated_count": 12,
  "skipped_count": 0,
  "skipped_gr_nos": [],
  "updated": [
    {
      "gr_no": "A09066",
      "wt": 100.0,
      "total": 510.0,
      "kaat_rate": 1.5,
      "kaat": 150.0,
      "pf": 360.0
    }
  ]
}
```

`skipped_gr_nos` — bilties found in bilty table but not in `bilty_wise_kaat` (no kaat row yet).

### Example — multiple stations in sequence
```
POST /api/kaat/bulk-update  { station_name: "SULTANPUR",   new_kaat_rate: 1.5  }
POST /api/kaat/bulk-update  { station_name: "PRATAPGARH",  new_kaat_rate: 1.5  }
POST /api/kaat/bulk-update  { station_name: "RAIBARAILLY", new_kaat_rate: 1.0  }
```

---

## 2. Update Single GR

**`PATCH /api/kaat/gr/{gr_no}`**

Update one or more kaat fields for a specific GR number. At least one field in the body is required.

### URL Parameter

| Parameter | Description |
|-----------|-------------|
| `gr_no` | GR number, e.g. `A09066`, `22677` |

### Request Body (JSON) — all fields optional, at least one required

```json
{
  "kaat_rate": 1.75,
  "kaat_dd": 50.0
}
```

| Field | Type | Description |
|-------|------|-------------|
| `kaat_rate` | float | Recalculates `kaat = weight × kaat_rate` and `pf = total − kaat` |
| `kaat` | float | Set kaat directly; `pf = total − kaat` is recalculated automatically |
| `kaat_dd` | float | Updates `dd_chrg` only, no effect on kaat or pf |
| `pf` | float | Override pf directly (use only if you want to set it manually) |

> If `kaat_rate` and `kaat` are both provided, `kaat_rate` takes priority.

### Response

```json
{
  "status": "success",
  "gr_no": "A09066",
  "updated": {
    "kaat_rate": 1.75,
    "kaat": 175.0,
    "kaat_dd": 50.0,
    "pf": 285.0
  },
  "weight": 100.0,
  "total": 510.0
}
```

### Example — change only kaat_dd for one GR
```
PATCH /api/kaat/gr/A09066
{ "kaat_dd": 25.0 }
```

### Example — change kaat_rate for one GR
```
PATCH /api/kaat/gr/22677
{ "kaat_rate": 2.0 }
```

---

## Error Responses

```json
{ "status": "error", "message": "No city found matching 'SULTANPUUR'" }
{ "status": "error", "message": "GR 'A09999' not found in bilty_wise_kaat" }
{ "status": "error", "message": "transport_gstin is required" }
```

| HTTP Code | Meaning |
|-----------|---------|
| 400 | Missing or invalid parameters |
| 404 | City or GR not found |
| 500 | Internal server error |
