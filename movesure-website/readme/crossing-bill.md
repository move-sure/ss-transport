# Crossing Bill API

## Overview

A **Crossing Bill** consolidates multiple pohonch (crossing challans) for one transport into a single settlement document. It tracks:
- Total kaat (what transport owes us)
- Total PF (provider fee — what we owe transport)
- Payment transactions (partial/full settlement)
- Bill PDF URL (uploaded from jsPDF in the UI)

---

The `crossing-bill` bucket is **public** — PDFs are accessible via direct URL. Upload from jsPDF in the frontend, save the returned URL via `PUT /api/crossing-bill/{id}`.

---

## Bill Lifecycle

```
DRAFT → SENT → PARTIAL_PAID → PAID
  │
  └── CANCELLED (from any non-paid state)
```

| Status | Meaning |
|--------|---------|
| `draft` | Created, pohonch can still be added/removed |
| `sent` | Sent to transport for approval |
| `partial_paid` | Some payments recorded, not yet fully settled |
| `paid` | Fully settled (auto-set when transactions cover both sides) |
| `cancelled` | Cancelled — all pohonch unlinked |

---

## Balance Fields (auto-computed)

| Field | Formula | Meaning |
|-------|---------|---------|
| `balance_on_us` | `total_pf - total_paid_to_transport` | What we still owe the transport (PF balance) |
| `balance_on_transport` | `total_kaat - total_paid_kaat` | What transport still owes us (kaat balance) |

---

## API Reference

Base path: `/api/crossing-bill`  
Auth: **not required** (skip list in middleware)

---

### Step 1 — Get Eligible Pohonch (for create modal)

`GET /api/crossing-bill/pohonch`

Call this when the user opens the "Create Crossing Bill" modal. Returns all pohonch not yet in any bill, filtered by transport and date range.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `transport_gstin` | string | Filter by transport GSTIN (partial match) |
| `transport_name` | string | Filter by transport name (partial match) |
| `transport_id` | uuid | Filter by transport_admin.transport_id |
| `from_date` | YYYY-MM-DD | Filter pohonch created from this date |
| `to_date` | YYYY-MM-DD | Filter pohonch created up to this date |

**Response:**
```json
{
  "status": "success",
  "data": {
    "pohonch": [
      {
        "id": "uuid",
        "pohonch_number": "NIE0012",
        "transport_name": "NEW INDIA EXPRESS TRANSPORT CO.",
        "transport_gstin": "09XXXXX",
        "total_bilties": 5,
        "total_kaat": 1250.00,
        "total_pf": 3750.00,
        "total_dd": 0,
        "total_amount": 5000.00,
        "total_weight": 320.0,
        "total_packages": 12.0,
        "is_signed": true,
        "challan_metadata": ["0235", "0236"],
        "created_at": "2026-06-01T10:00:00Z"
      }
    ],
    "preview_totals": {
      "total_pohonch": 3,
      "total_bilties": 18,
      "total_kaat": 4500.00,
      "total_pf": 9800.00,
      "total_dd": 0,
      "total_amount": 14300.00
    }
  }
}
```

---

### Step 2 — Create Crossing Bill

`POST /api/crossing-bill`

**Body:**
```json
{
  "transport_id":     "uuid",
  "transport_gstin":  "09XXXXX1ZT",
  "transport_name":   "NEW INDIA EXPRESS TRANSPORT CO.",
  "from_date":        "2026-06-01",
  "to_date":          "2026-06-30",
  "pohonch_numbers":  ["NIE0010", "NIE0011", "NIE0012"],
  "created_by":       "user-uuid"
}
```

- `pohonch_numbers` — required; list of pohonch_number strings selected by user
- `transport_id` — optional but recommended (links to transport_admin table)
- `bill_month` / `bill_year` — optional; auto-derived from `from_date` if omitted

**Response:**
```json
{
  "status": "success",
  "message": "Crossing bill CB-202606-0001 created with 3 pohonch",
  "bill_no": "CB-202606-0001",
  "data": {
    "id": "uuid",
    "bill_no": "CB-202606-0001",
    "transport_name": "NEW INDIA EXPRESS TRANSPORT CO.",
    "from_date": "2026-06-01",
    "to_date": "2026-06-30",
    "bill_month": 6,
    "bill_year": 2026,
    "status": "draft",
    "total_pohonch": 3,
    "total_bilties": 18,
    "total_kaat": 4500.00,
    "total_pf": 9800.00,
    "total_dd": 0,
    "total_amount": 14300.00,
    "total_paid_kaat": 0,
    "total_paid_to_transport": 0,
    "balance_on_us": 9800.00,
    "balance_on_transport": 4500.00,
    "pohonch_data": [ ...snapshot of each pohonch... ],
    "transactions": [],
    "bill_url": null
  }
}
```

**Errors:**
- `409 Conflict` — if any pohonch already belongs to another bill
- `404` — if any pohonch_number not found

---

### List Bills

`GET /api/crossing-bill`

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `transport_gstin` | string | Partial match |
| `transport_id` | uuid | Exact match |
| `status` | string | `draft` / `sent` / `partial_paid` / `paid` / `cancelled` |
| `bill_month` | int | 1–12 |
| `bill_year` | int | e.g. 2026 |
| `page` | int | Default 1 |
| `page_size` | int | Default 40 |

**Response:**
```json
{
  "status": "success",
  "data": {
    "rows": [ ...bill rows... ],
    "total": 12,
    "page": 1,
    "page_size": 40,
    "has_more": false
  }
}
```

---

### Get One Bill

`GET /api/crossing-bill/{bill_id}`

Returns full bill including `pohonch_data` (snapshot) and `transactions`.

**`pohonch_data` structure:**
```json
[
  {
    "pohonch_id": "uuid",
    "pohonch_number": "NIE0010",
    "transport_name": "NEW INDIA EXPRESS...",
    "total_bilties": 6,
    "total_kaat": 1500.00,
    "total_pf": 3200.00,
    "total_dd": 0,
    "total_amount": 4700.00,
    "is_signed": true,
    "challan_nos": ["0230", "0231"]
  }
]
```

**`transactions` structure:**
```json
[
  {
    "id": "uuid",
    "date": "2026-06-15",
    "amount": 2000.00,
    "type": "received_from_transport",
    "mode": "online",
    "note": "First instalment",
    "recorded_by": "user-uuid",
    "recorded_at": "2026-06-15T14:30:00Z"
  }
]
```

---

### Update Bill (status / bill_url)

`PUT /api/crossing-bill/{bill_id}`

```json
{
  "status":     "sent",
  "bill_url":   "https://<supabase>.supabase.co/storage/v1/object/public/crossing-bill/CB-202606-0001.pdf",
  "updated_by": "user-uuid"
}
```

- Use this to save the PDF URL after uploading from jsPDF.
- Updatable fields: `status`, `bill_url`, `updated_by`.

---

### Add Transaction

`POST /api/crossing-bill/{bill_id}/transaction`

Record a payment — either transport paying us (kaat) or us paying transport (PF).

```json
{
  "amount":      2500.00,
  "type":        "received_from_transport",
  "date":        "2026-06-15",
  "mode":        "online",
  "note":        "Kaat payment — June batch",
  "recorded_by": "user-uuid"
}
```

| `type` value | Meaning |
|-------------|---------|
| `received_from_transport` | Transport paid us (reduces `balance_on_transport`) |
| `paid_to_transport` | We paid transport (reduces `balance_on_us`) |

Status auto-updates:
- Any payment → `partial_paid`
- Both balances fully settled → `paid`

**Response:**
```json
{
  "status": "success",
  "message": "Transaction recorded",
  "data": {
    "total_paid_kaat": 2500.00,
    "total_paid_to_transport": 0,
    "balance_on_us": 9800.00,
    "balance_on_transport": 2000.00,
    "status": "partial_paid"
  }
}
```

---

### Remove Pohonch from Bill

`POST /api/crossing-bill/{bill_id}/remove-pohonch/{pohonch_number}`

Only allowed on `draft` bills. Recalculates totals.

```json
{ "updated_by": "user-uuid" }
```

---

### Cancel Bill

`POST /api/crossing-bill/{bill_id}/cancel`

Cancels the bill and unlinks all pohonch (they become available for a new bill). Not allowed once `paid`.

```json
{ "updated_by": "user-uuid" }
```

---

## Storage: Upload Bill PDF

The `crossing-bill` bucket is public. Upload from the frontend using the Supabase JS client:

```javascript
// 1. Generate PDF with jsPDF
const pdfBlob = doc.output('blob');

// 2. Upload to Supabase storage
const fileName = `${bill_no}.pdf`;
const { data, error } = await supabase.storage
  .from('crossing-bill')
  .upload(fileName, pdfBlob, {
    contentType: 'application/pdf',
    upsert: true,
  });

// 3. Get public URL
const { data: urlData } = supabase.storage
  .from('crossing-bill')
  .getPublicUrl(fileName);

const billUrl = urlData.publicUrl;

// 4. Save URL to bill record
await fetch(`/api/crossing-bill/${bill_id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bill_url: billUrl, updated_by: userId }),
});
```

---

## Frontend Integration Flow

```
1. Open modal
   → GET /api/crossing-bill/pohonch?transport_gstin=&from_date=&to_date=
   → Show pohonch list with preview totals

2. User selects pohonch + fills transport + date range
   → POST /api/crossing-bill
   → Store returned bill_id and bill_no

3. Generate PDF with jsPDF (bill details from response)
   → Upload to "crossing-bill" bucket
   → PUT /api/crossing-bill/{bill_id}  with bill_url

4. Update status to "sent"
   → PUT /api/crossing-bill/{bill_id}  with { "status": "sent" }

5. Record payments as they come in
   → POST /api/crossing-bill/{bill_id}/transaction

6. View all bills for a transport
   → GET /api/crossing-bill?transport_gstin=&bill_month=6&bill_year=2026
```

---

## Error Reference

| Error | Status | When |
|-------|--------|------|
| `Missing required fields` | 400 | Required body fields missing |
| `pohonch_numbers cannot be empty` | 400 | Empty array sent |
| `Pohonch not found` | 404 | Invalid pohonch_number |
| `Already in another bill` | 409 | Pohonch already billed — cancel that bill first |
| `Only draft bills can be modified` | 400 | Trying to remove pohonch from a non-draft bill |
| `Cannot cancel a fully paid bill` | 400 | Can't cancel paid bills |
| `Invalid status` | 400 | Status not in allowed list |
| `amount must be > 0` | 400 | Zero/negative transaction amount |
