# Transport Bilty Report API

## Endpoint

```
GET /api/bilty/transport-report
```

---

## Purpose

Returns **all bilties** for a given transport in a specified date range, fetched from **two sources**:

| Source | Date field used |
|--------|----------------|
| `bilty` table | `bilty_date` |
| `station_bilty_summary` table | `created_at` |

Duplicates (same `gr_no`) are deduped — `bilty` table wins.

Each bilty is enriched with:
- **Pohonch number** (our internal code, e.g. `HC0002`)
- **Crossing challans** (challan numbers attached to that pohonch, e.g. `0239 | B00017`)
- **has_crossing_challan** flag (`true` / `false`)
- **kaat / pf / dd / rate** from `bilty_wise_kaat`

The response is ordered:
1. Bilties **with pohonch** — ascending `gr_no`
2. Bilties **without pohonch** — ascending `gr_no`

---

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transport_gstin` | `string` | One of the two is required | GSTIN of the transport — **exact match**, preferred |
| `transport_name` | `string` | One of the two is required | Transport name — **partial (case-insensitive) match**, fallback |
| `from_date` | `string` | ✅ Yes | Start date (inclusive) — format `YYYY-MM-DD` |
| `to_date` | `string` | ✅ Yes | End date (inclusive) — format `YYYY-MM-DD` |

> **Tip:** Always prefer `transport_gstin` when available — it is an exact match and avoids ambiguity between similarly named transports.

---

## Example Requests

### By GSTIN
```
GET /api/bilty/transport-report
    ?transport_gstin=09AVKPJ3682J1Z2
    &from_date=2026-03-31
    &to_date=2026-04-30
```

### By Name
```
GET /api/bilty/transport-report
    ?transport_name=HEERA
    &from_date=2026-03-31
    &to_date=2026-04-30
```

---

## Success Response

```jsonc
{
  "status": "success",
  "from_date": "2026-03-31",
  "to_date": "2026-04-30",
  "transport_gstin": "09AVKPJ3682J1Z2",
  "transport_name": "HEERA TRANSPORT COMPANY",
  "sources": {
    "bilty_table": 54,
    "station_bilty_summary": 128
  },
  "total": 182,
  "with_pohonch_count": 156,
  "without_pohonch_count": 26,
  "bilties": [
    // ── Bilties WITH pohonch (sorted ascending gr_no) ───────────────
    {
      "source": "bilty",                  // "bilty" | "station_bilty_summary"
      "gr_no": "5031",
      "bilty_date": "2026-04-01",
      "transport_name": "HEERA TRANSPORT COMPANY",
      "transport_gst": "09AVKPJ3682J1Z2",
      "consignor_name": "BASANT TRADERS",
      "consignee_name": "MOHD MUSTAFA",
      "from_city": "KANPUR",
      "to_city": "PRAYAGRAJ",
      "payment_mode": "to-pay",
      "no_of_pkg": 1,
      "wt": 85.0,
      "freight_amount": 670.0,
      "pf_charge": 597.75,
      "dd_charge": 0.0,
      "labour_charge": 0.0,
      "bill_charge": 0.0,
      "toll_charge": 0.0,
      "other_charge": 0.0,
      "total": 670.0,
      "contain": "",
      "pvt_marks": "",
      "remark": "",
      "pohonch_number": "HC0002",         // internal pohonch code
      "has_crossing_challan": true,
      "crossing_challans": "0239 | B00017", // challan numbers on that pohonch
      "dest_pohonch_no": "6266",           // destination bilty no (from bilty_wise_kaat)
      "bilty_number": null,
      "kaat": 72.25,
      "kaat_pf": 597.75,
      "kaat_dd": 0.0,
      "kaat_rate": 0.85
    },
    // ... more bilties with pohonch ...

    // ── Bilties WITHOUT pohonch (sorted ascending gr_no) ─────────────
    {
      "source": "station_bilty_summary",
      "gr_no": "22999",
      "bilty_date": "2026-04-15",
      // ... same fields as above ...
      "pohonch_number": "",
      "has_crossing_challan": false,
      "crossing_challans": "",
      "dest_pohonch_no": "",
      "bilty_number": null,
      "kaat": null,
      "kaat_pf": null,
      "kaat_dd": null,
      "kaat_rate": null
    }
  ]
}
```

---

## Error Responses

### 400 — Missing required parameters
```json
{
  "status": "error",
  "message": "transport_gstin or transport_name is required"
}
```

### 400 — Missing dates
```json
{
  "status": "error",
  "message": "from_date and to_date are required (YYYY-MM-DD)"
}
```

### 400 — Invalid date format
```json
{
  "status": "error",
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

### 503 — Server busy
```json
{
  "status": "error",
  "message": "Server busy, please retry in a moment"
}
```

---

## Response Fields Reference

| Field | Type | Description |
|-------|------|-------------|
| `source` | `string` | `"bilty"` or `"station_bilty_summary"` — which table the record came from |
| `gr_no` | `string` | GR number |
| `bilty_date` | `string` | Date of bilty (`YYYY-MM-DD`) |
| `transport_name` | `string` | Transport company name |
| `transport_gst` | `string` | Transport GSTIN |
| `consignor_name` | `string` | Sender name |
| `consignee_name` | `string` | Receiver name |
| `from_city` | `string` | Origin city name |
| `to_city` | `string` | Destination city name |
| `payment_mode` | `string` | `"to-pay"` / `"paid"` / `"foc"` |
| `no_of_pkg` | `integer` | Number of packages |
| `wt` | `number` | Weight (kg) |
| `freight_amount` | `number` | Freight charge |
| `pf_charge` | `number` | Platform / handling charge |
| `dd_charge` | `number` | Door delivery charge |
| `labour_charge` | `number` | Labour charge |
| `bill_charge` | `number` | Bilty charge |
| `toll_charge` | `number` | Toll charge |
| `other_charge` | `number` | Other charges |
| `total` | `number` | Total amount |
| `contain` | `string` | Contents description |
| `pvt_marks` | `string` | Private marks |
| `remark` | `string` | Remarks |
| `pohonch_number` | `string` | Internal pohonch code (e.g. `HC0002`) — empty if not in any pohonch |
| `has_crossing_challan` | `boolean` | `true` if crossing challans are present for this bilty's pohonch |
| `crossing_challans` | `string` | Pipe-separated crossing challan numbers (e.g. `"0239 \| B00017"`) |
| `dest_pohonch_no` | `string` | Destination-side bilty number from `bilty_wise_kaat.pohonch_no` |
| `bilty_number` | `string` | Bilty number from `bilty_wise_kaat` |
| `kaat` | `number\|null` | Kaat amount |
| `kaat_pf` | `number\|null` | Kaat PF |
| `kaat_dd` | `number\|null` | Kaat DD charge |
| `kaat_rate` | `number\|null` | Kaat rate per kg |

---

## Data Sources

```
bilty                  bilty_date range filter  + transport_gst / transport_name
station_bilty_summary  created_at range filter  + transport_gst / transport_name
bilty_wise_kaat        joined on gr_no → kaat, pf, dd, rate, dest_pohonch_no
pohonch                bilty_metadata JSONB → pohonch_number + crossing challans
cities                 joined on from_city_id / to_city_id → city names
```
