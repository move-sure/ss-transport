# Transport Bilty Report API

## Endpoint

```
GET /api/bilty/transport-report
```

---

## Purpose

Returns **all bilties** for a given transport in a specified date range, merged from two sources:

| Source | Type label | Date field |
|--------|-----------|-----------|
| `bilty` table | `"regular"` | `bilty_date` |
| `station_bilty_summary` table | `"manual"` | `created_at` |

Duplicates (same `gr_no`) are deduped — `bilty` table wins.

Each bilty is enriched with:
- `challan_no` + `challan_dispatch_date` (from `challan_details`)
- `pohonch_number` — our internal pohonch code
- `has_crossing_challan` + `crossing_challans`
- kaat / pf / dd / rate from `bilty_wise_kaat`

---

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transport_gstin` | `string` | One required | GSTIN — **exact match**, preferred |
| `transport_name` | `string` | One required | Name — **partial case-insensitive match** |
| `from_date` | `string` | ✅ | Start date inclusive `YYYY-MM-DD` |
| `to_date` | `string` | ✅ | End date inclusive `YYYY-MM-DD` |

---

## Example Request

```
GET /api/bilty/transport-report
    ?transport_gstin=09AVKPJ3682J1Z2
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
    "bilty_table": 72,
    "station_bilty_summary": 128
  },
  "summary": {
    "total": 200,
    "with_pohonch": 169,
    "without_pohonch": 31,
    "total_weight_kg": 18450.0,
    "total_freight": 92300.00
  },

  // ── Bilties that have a pohonch assigned ──────────────────────────────────
  "with_pohonch": {
    "HC0001": {
      "regular": [                          // from bilty table
        {
          "source": "regular",
          "gr_no": "22783",
          "bilty_date": "2026-04-03",
          "transport_name": "HEERA TRANSPORT COMPANY",
          "transport_gst": "09AVKPJ3682J1Z2",
          "consignor_name": "S K INTERNATIONAL",
          "consignee_name": "SUNJAY ENTER",
          "from_city": "KANPUR",
          "to_city": "PRAYAGRAJ",
          "payment_mode": "to-pay",
          "no_of_pkg": 20,
          "wt": 1000.0,
          "freight_amount": 3070.0,
          "pf_charge": 2220.0,
          "dd_charge": 0.0,
          "labour_charge": 0.0,
          "bill_charge": 0.0,
          "toll_charge": 0.0,
          "other_charge": 0.0,
          "total": 3070.0,
          "contain": "",
          "pvt_marks": "",
          "remark": "",
          "challan_no": "B00017",
          "challan_dispatch_date": {
            "challan_date":           "2026-04-04",
            "is_dispatched":          true,
            "dispatch_date":          "2026-04-05T10:30:00+05:30",
            "is_received_at_hub":     true,
            "received_at_hub_timing": "2026-04-06T08:15:00+05:30",
            "remarks":                "",
            "total_bilty_count":      12
          },
          "pohonch_number": "HC0001",
          "has_crossing_challan": true,
          "crossing_challans": "0239 | B00017",
          "dest_pohonch_no": "6266",
          "bilty_number": "",
          "kaat": 850.0,
          "kaat_pf": 2220.0,
          "kaat_dd": 0.0,
          "kaat_rate": 0.85
        }
      ],
      "manual": [                           // from station_bilty_summary
        {
          "source": "manual",
          "gr_no": "0803",
          // ... same fields ...
          "challan_no": "0239",
          "challan_dispatch_date": {
            "challan_date":           "2026-04-03",
            "is_dispatched":          true,
            "dispatch_date":          "2026-04-04T09:00:00+05:30",
            "is_received_at_hub":     false,
            "received_at_hub_timing": "",
            "remarks":                "",
            "total_bilty_count":      8
          },
          "pohonch_number": "HC0001",
          "has_crossing_challan": true,
          "crossing_challans": "0239 | B00017"
        }
      ]
    },
    "HC0002": {
      "regular": [ ... ],
      "manual":  [ ... ]
    }
  },

  // ── Bilties with NO pohonch, grouped by challan number ────────────────────
  "no_pohonch": {
    "B00025": [
      {
        "source": "regular",
        "gr_no": "23100",
        "bilty_date": "2026-04-28",
        "challan_no": "B00025",
        "challan_dispatch_date": {
          "challan_date":           "2026-04-28",
          "is_dispatched":          true,
          "dispatch_date":          "2026-04-29T11:00:00+05:30",
          "is_received_at_hub":     false,
          "received_at_hub_timing": "",
          "remarks":                "",
          "total_bilty_count":      5
        },
        "pohonch_number": "",
        "has_crossing_challan": false,
        "crossing_challans": "",
        // ... all other bilty fields ...
      }
    ],
    "UNKNOWN": [
      {
        // bilties where no challan_no AND no bilty_number found in bilty_wise_kaat
        "gr_no": "23999",
        "challan_no": "",
        "challan_dispatch_date": "",
        // ...
      }
    ]
  }
}
```

> **`no_pohonch` grouping priority:** `challan_no` → `bilty_number` (transit bilties that only have a destination bilty number, not a pohonch) → `"UNKNOWN"` (always last).
>
> **`with_pohonch` key order:** Natural ascending — `HC0001, HC0002, … HC0009, HC0010, HC0011` (not lexicographic).

---

## Response Structure

### Top level

| Field | Type | Description |
|-------|------|-------------|
| `transport_name` | `string` | Resolved transport name |
| `transport_gstin` | `string` | GSTIN used |
| `sources.bilty_table` | `int` | Rows from `bilty` |
| `sources.station_bilty_summary` | `int` | Rows from `station_bilty_summary` |
| `summary.total` | `int` | Total unique bilties |
| `summary.with_pohonch` | `int` | Bilties with pohonch assigned |
| `summary.without_pohonch` | `int` | Bilties without pohonch |
| `summary.total_weight_kg` | `float` | Sum of all weights |
| `summary.total_freight` | `float` | Sum of all totals |
| `with_pohonch` | `object` | Keyed by `pohonch_number` |
| `no_pohonch` | `object` | Keyed by `challan_no` (or `"UNKNOWN"`) |

### Each pohonch group (`with_pohonch.<pohonch_number>`)

```jsonc
{
  "regular": [ <bilty>, ... ],   // from bilty table
  "manual":  [ <bilty>, ... ]    // from station_bilty_summary
}
```

### Each bilty object

| Field | Type | Description |
|-------|------|-------------|
| `source` | `string` | `"regular"` (bilty table) or `"manual"` (station table) |
| `gr_no` | `string` | GR number |
| `bilty_date` | `string` | `YYYY-MM-DD` |
| `consignor_name` | `string` | Sender |
| `consignee_name` | `string` | Receiver |
| `from_city` | `string` | Origin city |
| `to_city` | `string` | Destination city |
| `payment_mode` | `string` | `to-pay` / `paid` / `foc` |
| `no_of_pkg` | `int` | Packages |
| `wt` | `float` | Weight kg |
| `freight_amount` | `float` | |
| `pf_charge` | `float` | Platform charge |
| `dd_charge` | `float` | Door delivery |
| `total` | `float` | Bilty total |
| `challan_no` | `string` | Challan this bilty was on |
| `challan_dispatch_date` | `object\|string` | `{ challan_date, is_dispatched, dispatch_date, is_received_at_hub, received_at_hub_timing, remarks, total_bilty_count }` or `""` if challan not found |
| `pohonch_number` | `string` | Pohonch code or `""` |
| `has_crossing_challan` | `bool` | |
| `crossing_challans` | `string` | e.g. `"0239 \| B00017"` |
| `dest_pohonch_no` | `string` | Destination bilty number |
| `kaat` | `float\|null` | |
| `kaat_pf` | `float\|null` | |
| `kaat_dd` | `float\|null` | |
| `kaat_rate` | `float\|null` | |

---

## Data Sources

```
bilty                bilty_date range + transport filter → type=regular
station_bilty_summary created_at range + transport filter → type=manual
bilty_wise_kaat      gr_no join → challan_no, kaat, pf, dd, rate, dest_pohonch_no
challan_details      challan_no join → dispatch_date, is_dispatched, challan_date
pohonch              bilty_metadata JSONB → pohonch_number + crossing_challans
cities               city_id join → from_city / to_city names
```


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
