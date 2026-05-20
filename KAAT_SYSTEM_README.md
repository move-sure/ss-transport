# Kaat Bulk Update by GR List — API Reference

Update kaat for a specific list of GR numbers in one call.  
Use this when you already know which GRs to update (e.g., bilties from different dates or different source tables that a date-range search would miss).

---

## Endpoint

```
POST /api/kaat/bulk-update-by-grs
```

---

## Request Body

```json
{
  "gr_nos": ["22681", "A09136", "22718"],
  "new_kaat_rate": 1.5,
  "new_kaat_dd": 0
}
```

| Field          | Type            | Required | Description                                          |
|----------------|-----------------|----------|------------------------------------------------------|
| `gr_nos`       | `list[string]`  | Yes      | List of GR numbers (bilty or station type, any mix)  |
| `new_kaat_rate`| `float`         | Yes      | New rate per kg. `kaat = weight × new_kaat_rate`     |
| `new_kaat_dd`  | `float`         | No       | New DD charge. If omitted, existing DD is kept.      |

- Duplicate GR numbers are silently deduplicated.
- Supports GRs from both `bilty` table (e.g. `A09136`) and `station_bilty_summary` (e.g. `22681`) in the same call.

---

## How it works

For each GR number in the list:

1. Fetches `weight`, `total`, `payment_mode` from `bilty` table first; falls back to `station_bilty_summary` if not found there.
2. Calculates:
   - `kaat = weight × new_kaat_rate`
   - `dd   = new_kaat_dd` (if provided) or existing `dd_chrg` from `bilty_wise_kaat`
   - `pf   = total − kaat − dd`  *(negative for `paid` bilties)*
3. Updates `bilty_wise_kaat` row for that GR.
4. Syncs the new `kaat`, `pf`, `dd` values into `pohonch.bilty_metadata` for every pohonch that contains this GR.

GRs that are not found in `bilty_wise_kaat` (no kaat row exists yet) are reported in `skipped_gr_nos` and are **not** inserted — only existing rows are updated.

---

## Response

```json
{
  "status": "success",
  "new_kaat_rate": 1.5,
  "new_kaat_dd": 0,
  "requested_count": 3,
  "updated_count": 3,
  "skipped_count": 0,
  "not_found_count": 0,
  "skipped_gr_nos": [],
  "not_found_gr_nos": [],
  "pohonch_rows_synced": 2,
  "updated": [
    {
      "gr_no": "22681",
      "wt": 1120,
      "total": 4830.0,
      "kaat_rate": 1.5,
      "kaat": 1680.0,
      "pf": 3150.0,
      "kaat_dd": 0
    },
    {
      "gr_no": "A09136",
      "wt": 1280,
      "total": 5510.0,
      "kaat_rate": 1.5,
      "kaat": 1920.0,
      "pf": 3590.0,
      "kaat_dd": 0
    },
    {
      "gr_no": "22718",
      "wt": 75,
      "total": 0.0,
      "kaat_rate": 1.5,
      "kaat": 112.5,
      "pf": -112.5,
      "kaat_dd": 0
    }
  ]
}
```

| Field               | Description                                                    |
|---------------------|----------------------------------------------------------------|
| `requested_count`   | Total unique GRs in the request                                |
| `updated_count`     | GRs successfully updated in `bilty_wise_kaat`                  |
| `skipped_count`     | GRs found in bilty/station table but missing from `bilty_wise_kaat` |
| `not_found_count`   | GRs not found in bilty or station_bilty_summary at all         |
| `skipped_gr_nos`    | List of GRs that exist but have no kaat row                    |
| `not_found_gr_nos`  | List of GRs not found in either source table                   |
| `pohonch_rows_synced` | Number of pohonch records whose `bilty_metadata` was updated |
| `updated`           | Per-GR detail for every successfully updated GR                |

---

## Examples

### Update two MISHRIK bilties (different date origins, same rate)

```json
POST /api/kaat/bulk-update-by-grs

{
  "gr_nos": ["22681", "A09136"],
  "new_kaat_rate": 1.5
}
```

Use this when the date-range bulk update misses some GRs because their bilty dates fall outside the range but they logically belong to the same kaat update.

---

### Update multiple stations in one call

```json
POST /api/kaat/bulk-update-by-grs

{
  "gr_nos": ["22681", "A09136", "22718", "B00412", "C11923"],
  "new_kaat_rate": 2.0,
  "new_kaat_dd": 50
}
```

---

### Update a single GR (prefer the dedicated endpoint for this)

For a single GR, the `PATCH /api/kaat/gr/{gr_no}` endpoint is simpler.  
But this endpoint also handles single-GR updates:

```json
POST /api/kaat/bulk-update-by-grs

{
  "gr_nos": ["A09136"],
  "new_kaat_rate": 3.0
}
```

---

## Error responses

| Status | Condition                              |
|--------|----------------------------------------|
| 400    | `gr_nos` is empty                      |
| 400    | `new_kaat_rate` is negative            |
| 500    | Unexpected server error                |

---

## Difference from `/api/kaat/bulk-update`

| Feature                    | `/api/kaat/bulk-update`            | `/api/kaat/bulk-update-by-grs`    |
|----------------------------|------------------------------------|-----------------------------------|
| How GRs are selected       | transport GSTIN + date range + station | Explicit GR list               |
| Works across date ranges   | No — single date range only        | Yes                               |
| Works for known GR list    | No                                 | Yes                               |
| Station/city filter needed | Yes                                | No                                |
| Per-station kaat rates     | One rate per call                  | One rate per call (same for all)  |
