# Pohonch Edit & Recalculate APIs

These APIs let you update individual GR fields inside a pohonch, or fully
recalculate totals by re-fetching live data from the database.

---

## When to use which API

| Situation | Use |
|-----------|-----|
| Changed kaat rate for a destination via `/api/kaat/*` | `POST /api/pohonch/{id}/recalculate` or bulk |
| Changed weight/freight on a bilty | `POST /api/pohonch/{id}/recalculate` |
| Want to fix one GR's kaat/pf/destination without touching the rest | `PATCH /api/pohonch/{id}/gr/{gr_no}` |
| Updated kaat for ALL pohonch of a transport | `POST /api/pohonch/bulk-recalculate` with `transport_gstin` |
| Updated kaat for a specific set of pohonch | `POST /api/pohonch/bulk-recalculate` with `pohonch_numbers[]` |

---

## Existing edit API (add/remove GRs, rename)

`PATCH /api/pohonch/{pohonch_id}/edit`

Already supported — documented separately. Handles:
- Adding new GR items
- Removing GR nos
- Renaming pohonch_number
- Replacing challan_metadata

---

## API 1 — Update a Single GR's Fields

`PATCH /api/pohonch/{pohonch_id}/gr/{gr_no}`

Patches one or more fields on a single GR entry inside `bilty_metadata`.
Recalculates pohonch totals (`total_kaat`, `total_pf`, `total_amount`, etc.) immediately after.

### URL params
| Param | Description |
|-------|-------------|
| `pohonch_id` | UUID of the pohonch |
| `gr_no` | GR number string, e.g. `"A09407"` |

### Body — send only the fields you want to change

```json
{
  "destination":   "LUCKNOW",
  "kaat":          150.0,
  "pf":            350.0,
  "dd":            0,
  "kaat_rate":     2.5,
  "weight":        60.0,
  "packages":      3,
  "amount":        500.0,
  "pohonch_bilty": "12345",
  "e_way_bill":    "3312XXXXXXX",
  "is_paid":       false,
  "payment_mode":  "to-pay",
  "delivery_type": "godown",
  "user_id":       "uuid",
  "force":         false
}
```

### Updatable fields

| Field | Type | Description |
|-------|------|-------------|
| `destination` | string | City name — auto-resolves `destination_code` from cities table |
| `destination_code` | string | Short city code (set manually if not using `destination`) |
| `kaat` | float | Kaat amount for this GR |
| `pf` | float | Provider fee (PF) for this GR |
| `dd` | float | DD charge for this GR |
| `kaat_rate` | float | Rate used to calculate kaat |
| `weight` | float | Weight in kg |
| `packages` | int | Number of packages |
| `amount` | float | Freight amount |
| `pohonch_bilty` | string | Receipt/bilty number on the crossing document |
| `e_way_bill` | string | E-Way Bill number |
| `is_paid` | bool | Whether this GR's payment is settled |
| `payment_mode` | string | `paid` / `to-pay` / `foc` |
| `delivery_type` | string | `godown` / `door` |
| `user_id` | uuid | Who made the update (audit) |
| `force` | bool | `true` to edit even if pohonch is signed |

> `gr_no`, `date`, `consignor`, `consignee` are **read-only** — they come from the bilty table and are not patchable here.

### Response

```json
{
  "status": "success",
  "gr_no": "A09407",
  "updated_entry": {
    "gr_no": "A09407",
    "destination": "LUCKNOW",
    "destination_code": "LKO",
    "kaat": 150.0,
    "pf": 350.0,
    "dd": 0,
    "weight": 60.0,
    "amount": 500.0,
    "pohonch_bilty": "12345"
  },
  "new_totals": {
    "total_bilties": 5,
    "total_kaat": 1350.0,
    "total_pf": 3850.0,
    "total_dd": 0,
    "total_amount": 5200.0,
    "total_weight": 280.0,
    "total_packages": 14
  }
}
```

### Errors
| Error | When |
|-------|------|
| `404 Pohonch not found` | Invalid pohonch_id |
| `404 GR not found in this pohonch` | gr_no not in bilty_metadata |
| `409 Pohonch is signed` | Signed pohonch — pass `force: true` to override |
| `400 No fields to update provided` | Empty body |

---

## API 2 — Recalculate One Pohonch (Live Data)

`POST /api/pohonch/{pohonch_id}/recalculate`

Re-fetches **all GR data live** from `bilty`, `bilty_wise_kaat`,
`station_bilty_summary`, and `cities` tables. Rebuilds the entire
`bilty_metadata` array and recalculates all totals.

**Use this after:**
- Updating kaat rate via `/api/kaat/bulk-update` or `/api/kaat/update`
- Changing weight or freight amount on a bilty
- Correcting a destination city

Preserves `pohonch_bilty` and `is_paid` (manual fields) for each GR.

### URL params
| Param | Description |
|-------|-------------|
| `pohonch_id` | UUID of the pohonch |

### Body
```json
{
  "user_id": "uuid",
  "force": false
}
```

### Response

```json
{
  "status": "success",
  "message": "Pohonch NIE0012 recalculated from live data",
  "pohonch_number": "NIE0012",
  "old_totals": {
    "total_kaat": 1200.0,
    "total_pf": 3000.0,
    "total_amount": 4200.0,
    "total_bilties": 5
  },
  "new_totals": {
    "total_kaat": 1350.0,
    "total_pf": 3200.0,
    "total_amount": 4550.0,
    "total_bilties": 5
  },
  "diff": {
    "kaat": 150.0,
    "pf": 200.0,
    "amount": 350.0
  },
  "not_refreshed_gr_nos": []
}
```

`not_refreshed_gr_nos` — GR numbers that could not be found in bilty or
station_bilty_summary (deleted/moved bilties). Their old values are preserved.

---

## API 3 — Bulk Recalculate Multiple Pohonch

`POST /api/pohonch/bulk-recalculate`

Recalculates multiple pohonch in a single request. Re-fetches all GR data
in one bulk query (efficient — one DB round-trip per table regardless of count).

### Body — supply ONE selector

```json
{
  "pohonch_numbers":  ["NIE0010", "NIE0011", "NIE0012"],
  "user_id": "uuid",
  "force": false
}
```

OR by UUID list:
```json
{
  "pohonch_ids": ["uuid1", "uuid2", "uuid3"],
  "user_id": "uuid"
}
```

OR entire transport by GSTIN:
```json
{
  "transport_gstin": "09ASEPS5059F1ZF",
  "user_id": "uuid"
}
```

OR entire transport by name:
```json
{
  "transport_name": "NEW INDIA EXPRESS",
  "user_id": "uuid"
}
```

### Selectors

| Field | Type | Description |
|-------|------|-------------|
| `pohonch_ids` | uuid[] | Recalculate specific pohonch by UUID |
| `pohonch_numbers` | string[] | Recalculate by pohonch_number |
| `transport_gstin` | string | All active pohonch for this GSTIN (partial match) |
| `transport_name` | string | All active pohonch for this transport name (partial match) |
| `user_id` | uuid | Audit field |
| `force` | bool | Recalculate even signed pohonch (default `false`) |

### Response

```json
{
  "status": "success",
  "total_found": 3,
  "processed": 2,
  "skipped_signed": 1,
  "skipped_empty": 0,
  "results": [
    {
      "pohonch_number": "NIE0010",
      "status": "updated",
      "old_totals": { "total_kaat": 800.0, "total_pf": 2100.0, "total_amount": 2900.0 },
      "new_totals": { "total_kaat": 950.0, "total_pf": 2300.0, "total_amount": 3250.0 },
      "diff": { "kaat": 150.0, "pf": 200.0, "amount": 350.0 },
      "not_refreshed_gr_nos": []
    },
    {
      "pohonch_number": "NIE0011",
      "status": "updated",
      "old_totals": { "total_kaat": 400.0, "total_pf": 900.0, "total_amount": 1300.0 },
      "new_totals": { "total_kaat": 400.0, "total_pf": 900.0, "total_amount": 1300.0 },
      "diff": { "kaat": 0, "pf": 0, "amount": 0 },
      "not_refreshed_gr_nos": []
    },
    {
      "pohonch_number": "NIE0012",
      "status": "skipped",
      "reason": "signed — pass force=true to override"
    }
  ]
}
```

### Result statuses per pohonch

| `status` | Meaning |
|----------|---------|
| `updated` | Recalculated and saved |
| `skipped` | Not processed — see `reason` |

`reason` values: `"signed — pass force=true to override"`, `"no bilty entries"`

---

## Common Frontend Patterns

### After bulk kaat rate update for a transport

```javascript
// 1. Update kaat rates
await fetch('/api/kaat/bulk-update', { method: 'POST', body: JSON.stringify({
  transport_gstin: '09ASEPS5059F1ZF',
  from_date: '2026-06-01',
  to_date: '2026-06-30',
  station_name: 'LUCKNOW',
  new_kaat_rate: 2.5,
}) });

// 2. Recalculate all pohonch of this transport
await fetch('/api/pohonch/bulk-recalculate', { method: 'POST', body: JSON.stringify({
  transport_gstin: '09ASEPS5059F1ZF',
  user_id: currentUser.id,
}) });
```

### After changing one GR's kaat manually

```javascript
// Update the specific GR inside the pohonch
await fetch(`/api/pohonch/${pohonchId}/gr/${grNo}`, {
  method: 'PATCH',
  body: JSON.stringify({ kaat: 180, pf: 320, user_id: currentUser.id }),
});
```

### After changing weight/freight on a bilty

```javascript
// Recalculate the affected pohonch
await fetch(`/api/pohonch/${pohonchId}/recalculate`, {
  method: 'POST',
  body: JSON.stringify({ user_id: currentUser.id }),
});
```

### Change destination for a GR

```javascript
// Pass destination name — city code is auto-resolved
await fetch(`/api/pohonch/${pohonchId}/gr/${grNo}`, {
  method: 'PATCH',
  body: JSON.stringify({ destination: 'LUCKNOW', user_id: currentUser.id }),
});
// Response includes destination_code: "LKO" resolved automatically
```

---

## Notes

- **Signed pohonch** are blocked from all edits by default. Pass `"force": true` to override.
- `bulk-recalculate` uses **one DB round-trip per table** regardless of how many pohonch you select — it is safe to run on entire transports.
- `not_refreshed_gr_nos` in the response lists GRs whose bilty could not be found (deleted/moved). Their old values are preserved unchanged.
- Recalculation **does not** update `bilty_wise_kaat` — it only reads from it. To update kaat rates, use `/api/kaat/*` first, then recalculate.
