# Crossing Bill — Recalculate API

## What it does

A crossing bill stores a **snapshot** of pohonch totals at the time the bill was created (`pohonch_data`). If kaat rates are updated, bilties are added/removed from a pohonch, or a pohonch is recalculated after the bill was created, the bill's totals go stale.

`POST /api/crossing-bill/{bill_id}/recalculate` re-fetches live totals from the `pohonch` table for every pohonch linked to the bill, rebuilds the snapshot, and recomputes all bill-level totals and balances.

**What is preserved:**
- Bill status (`draft`, `sent`, `partial_paid`, `paid`)
- All transactions (payment history)
- `total_paid_kaat` and `total_paid_to_transport`

**What is refreshed:**
- `pohonch_data` snapshot (per-pohonch: kaat, pf, dd, amount, bilties, weight, packages)
- `total_kaat`, `total_pf`, `total_dd`, `total_amount`, `total_bilties`, `total_pohonch`
- `balance_on_us` = `total_pf − total_paid_to_transport` (auto-computed by DB)
- `balance_on_transport` = `total_kaat − total_paid_kaat` (auto-computed by DB)

---

## Endpoint

```
POST /api/crossing-bill/{bill_id}/recalculate
```

**Auth:** not required (on crossing-bill skip list)

**Path param:**

| Param | Type | Description |
|-------|------|-------------|
| `bill_id` | uuid | ID of the crossing bill to recalculate |

**Body (optional):**
```json
{ "updated_by": "user-uuid" }
```

---

## Typical flow

### Step 1 — Find the bill to recalculate

List bills for a transport (newest first):
```
GET /api/crossing-bill?transport_gstin=09AWMPS0747E1Z8&page_size=5
```

Grab the `id` of the bill you want.

### Step 2 — Recalculate

```
POST /api/crossing-bill/{bill_id}/recalculate
Content-Type: application/json

{
  "updated_by": "user-uuid"
}
```

---

## Response

```json
{
  "status": "success",
  "message": "Crossing bill CB-202607-0001 recalculated from live pohonch data",
  "bill_no": "CB-202607-0001",
  "old_totals": {
    "total_kaat":   14520.00,
    "total_pf":     52245.00,
    "total_amount": 76120.00
  },
  "new_totals": {
    "total_kaat":   22002.50,
    "total_pf":     48052.50,
    "total_amount": 76340.00
  },
  "diff": {
    "kaat":   7482.50,
    "pf":    -4192.50,
    "amount":  220.00
  },
  "data": {
    "bill_no":                 "CB-202607-0001",
    "status":                  "draft",
    "total_pohonch":           25,
    "total_bilties":           77,
    "total_kaat":              22002.50,
    "total_pf":                48052.50,
    "total_dd":                0.0,
    "total_amount":            76340.00,
    "total_paid_kaat":         0,
    "total_paid_to_transport": 0,
    "balance_on_us":           48052.50,
    "balance_on_transport":    22002.50,
    "pohonch_data":            [ ...refreshed snapshot per pohonch... ],
    "transactions":            [ ...unchanged... ]
  }
}
```

**`diff` field:** positive kaat = transport owes more, negative pf = we owe transport less. Use this to know at a glance whether the recalculation changed anything.

---

## Error responses

| Condition | Status | Message |
|-----------|--------|---------|
| Bill not found | 404 | `Bill not found` |
| Bill is cancelled | 400 | `Cannot recalculate a cancelled bill` |
| Bill has no pohonch | 400 | `Bill has no pohonch entries` |

---

## When to recalculate

Recalculate a crossing bill after any of these operations on its pohonch:

| Operation | Endpoint used first | Then recalculate bill? |
|-----------|---------------------|------------------------|
| Kaat rate changed (bulk by station) | `POST /api/kaat/bulk-update` | Yes |
| Kaat rate changed (by GR list) | `POST /api/kaat/bulk-update-by-grs` | Yes |
| Single GR kaat updated | `PATCH /api/kaat/gr/{gr_no}` | Yes |
| Pohonch bilty added/removed | `PATCH /api/pohonch/{id}/edit` | Yes |
| Pohonch recalculated | `POST /api/pohonch/{id}/recalculate` | Yes |
| Pohonch bulk-recalculated | `POST /api/pohonch/bulk-recalculate` | Yes |

---

## Bulk recalculation (all pohonch first, then the bill)

To fully refresh everything from raw bilty data:

```
# 1. Recalculate all pohonch in the bill from live bilty data
POST /api/pohonch/bulk-recalculate
{
  "transport_gstin": "09AWMPS0747E1Z8"
}

# 2. Then recalculate the crossing bill from the updated pohonch
POST /api/crossing-bill/{bill_id}/recalculate
```

---

## Service function

```python
from services.crossing_bill.crossing_bill_service import recalculate_crossing_bill

result = recalculate_crossing_bill(
    bill_id="4011e3ab-f6c1-4ff0-94c5-cc90372d0f6d",
    updated_by="user-uuid",   # optional
)
```

Located in [services/crossing_bill/crossing_bill_service.py](../services/crossing_bill/crossing_bill_service.py) — function `recalculate_crossing_bill`.
