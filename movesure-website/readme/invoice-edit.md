# Invoice Edit — API Reference

> **Important:** Call APIs directly from the frontend. Do not create proxy routes.

The edit flow is two steps:
1. **Fetch** the existing invoice to pre-fill the form → `GET /api/invoice/{invoice_id}`
2. **Submit** the edited form → `PUT /api/invoice/{invoice_id}/edit`

---

## Step 1 — Fetch invoice to pre-fill the form

### GET `/api/invoice/{invoice_id}`

Call this when the user clicks the edit button. Use the response to pre-fill every field in the create/edit form.

```
GET /api/invoice/c1a2b3c4-d5e6-7890-abcd-ef1234567890
```

**Response shape (map to form fields):**
```json
{
  "status": "success",
  "data": {
    "id": "c1a2b3c4-...",
    "invoice_no": "INV/2024-25/0001",        ← display only, never editable
    "invoice_series_id": "4f81babc-...",
    "invoice_type": "TAX_INVOICE",
    "invoice_date": "2026-06-20",
    "due_date": "2026-07-20",

    "tenant_id": "b34897bf-...",
    "seller_name": "RITA TRADERS",
    "seller_gstin": "09FNZPD3543J1ZC",
    "seller_pan": "FNZPD3543J",
    "seller_address": "1372, SHRI KASHI RAM AWAS YOJNA, ALIGARH",
    "seller_state": "UTTAR PRADESH",
    "seller_state_code": "09",

    "receiver_id": null,
    "buyer_name": "SHYAM",
    "buyer_gstin": "",
    "buyer_pan": "",
    "buyer_aadhar_number": "",
    "billing_address": "",
    "shipping_address": "",
    "buyer_state": "",
    "buyer_state_code": "09",

    "transport_name": "S S TRANSPORT",
    "gr_no": "",
    "challan_no": "",
    "po_number": "",
    "po_date": null,
    "pvt_marks": "SHYAM",

    "place_of_supply": "BANARAS",
    "supply_type": "B2B",
    "is_reverse_charge": false,
    "is_export": false,
    "export_type": null,
    "e_way_bill": "",

    "notes": "",
    "terms_and_conditions": "Payment within 30 days.",
    "status": "DRAFT",

    "subtotal": 14700.00,
    "taxable_amount": 14700.00,
    "total_cgst": 1323.00,
    "total_sgst": 1323.00,
    "total_igst": 0.00,
    "total_tax": 2646.00,
    "total_amount": 17346.00,
    "payment_status": "UNPAID",
    "paid_amount": 0.00,
    "balance_amount": 17346.00,

    "line_items": [
      {
        "id": "d7e8f9...",
        "line_number": 1,
        "inventory_item_id": "9b230bc9-...",
        "item_name": "CUPBOARD LOCK",
        "description": null,
        "hsn_sac_code": "83013000",
        "quantity": 490,
        "unit": "PCS",
        "rate": 30.00,
        "weight": null,
        "pvt_marks": "SHYAM",
        "discount_percent": 0,
        "gst_rate": 18,
        "cess_rate": 0,
        "cgst_rate": 9,
        "cgst_amount": 1323.00,
        "sgst_rate": 9,
        "sgst_amount": 1323.00,
        "igst_rate": 0,
        "igst_amount": 0.00,
        "total_amount": 17346.00
      }
    ]
  }
}
```

### Form pre-fill mapping (frontend)

```js
// After GET /api/invoice/{invoice_id}
const invoice = response.data

// Pre-fill header fields
form.setValue('invoice_type',         invoice.invoice_type)
form.setValue('invoice_date',         invoice.invoice_date)
form.setValue('due_date',             invoice.due_date ?? '')
form.setValue('seller_name',          invoice.seller_name)
form.setValue('seller_gstin',         invoice.seller_gstin ?? '')
form.setValue('seller_pan',           invoice.seller_pan ?? '')
form.setValue('seller_address',       invoice.seller_address ?? '')
form.setValue('seller_state',         invoice.seller_state ?? '')
form.setValue('seller_state_code',    invoice.seller_state_code ?? '')
form.setValue('receiver_id',          invoice.receiver_id ?? '')
form.setValue('buyer_name',           invoice.buyer_name)
form.setValue('buyer_gstin',          invoice.buyer_gstin ?? '')
form.setValue('buyer_pan',            invoice.buyer_pan ?? '')
form.setValue('buyer_aadhar_number',  invoice.buyer_aadhar_number ?? '')
form.setValue('billing_address',      invoice.billing_address ?? '')
form.setValue('shipping_address',     invoice.shipping_address ?? '')
form.setValue('buyer_state',          invoice.buyer_state ?? '')
form.setValue('buyer_state_code',     invoice.buyer_state_code ?? '')
form.setValue('transport_name',       invoice.transport_name ?? '')
form.setValue('gr_no',                invoice.gr_no ?? '')
form.setValue('challan_no',           invoice.challan_no ?? '')
form.setValue('po_number',            invoice.po_number ?? '')
form.setValue('po_date',              invoice.po_date ?? '')
form.setValue('pvt_marks',            invoice.pvt_marks ?? '')
form.setValue('place_of_supply',      invoice.place_of_supply ?? '')
form.setValue('supply_type',          invoice.supply_type)
form.setValue('is_reverse_charge',    invoice.is_reverse_charge)
form.setValue('e_way_bill',           invoice.e_way_bill ?? '')
form.setValue('notes',                invoice.notes ?? '')
form.setValue('terms_and_conditions', invoice.terms_and_conditions ?? '')

// Pre-fill line items
form.setValue('line_items', invoice.line_items.map(line => ({
  id:                  line.id,               // keep id for reference (not sent on edit)
  inventory_item_id:   line.inventory_item_id ?? '',
  item_name:           line.item_name,
  description:         line.description ?? '',
  hsn_sac_code:        line.hsn_sac_code ?? '',
  quantity:            line.quantity,
  unit:                line.unit,
  rate:                line.rate,
  weight:              line.weight ?? '',
  pvt_marks:           line.pvt_marks ?? '',
  discount_percent:    line.discount_percent ?? 0,
  gst_rate:            line.gst_rate,
  cess_rate:           line.cess_rate ?? 0,
})))
```

> **Note:** `invoice_no` is read-only — show it as a label, never put it in the editable form. The backend protects it from being changed.

---

## Step 2 — Submit the edited invoice

### PUT `/api/invoice/{invoice_id}/edit`

Sends **header fields + full line_items array** in one call.

- The backend **replaces all line items** (deletes old ones, inserts new ones).
- **Recalculates all totals** (subtotal, CGST/SGST/IGST, total_amount, balance_amount).
- `invoice_no` is **never changed** even if sent.
- `paid_amount` and `payment_status` are **never changed** — payment records are separate.
- Cannot edit a `CANCELLED` invoice.

**Request body** (same shape as create, minus `invoice_no`):
```json
{
  "invoice_type": "TAX_INVOICE",
  "invoice_date": "2026-06-20",
  "due_date": "2026-07-20",

  "tenant_id": "b34897bf-...",
  "seller_name": "RITA TRADERS",
  "seller_gstin": "09FNZPD3543J1ZC",
  "seller_pan": "FNZPD3543J",
  "seller_address": "1372, SHRI KASHI RAM AWAS YOJNA, ALIGARH",
  "seller_state": "UTTAR PRADESH",
  "seller_state_code": "09",

  "receiver_id": null,
  "buyer_name": "SHYAM",
  "buyer_gstin": "",
  "buyer_pan": "",
  "buyer_aadhar_number": "",
  "billing_address": "",
  "shipping_address": "",
  "buyer_state": "",
  "buyer_state_code": "09",

  "transport_name": "S S TRANSPORT",
  "gr_no": "",
  "challan_no": "",
  "po_number": "",
  "po_date": "",
  "pvt_marks": "SHYAM",

  "place_of_supply": "BANARAS",
  "supply_type": "B2B",
  "is_reverse_charge": false,
  "e_way_bill": "",

  "notes": "",
  "terms_and_conditions": "Payment within 30 days.",
  "status": "DRAFT",
  "updated_by": "6b415114-...",

  "line_items": [
    {
      "item_name": "CUPBOARD LOCK",
      "inventory_item_id": "9b230bc9-...",
      "hsn_sac_code": "83013000",
      "quantity": 600,
      "unit": "PCS",
      "rate": 30,
      "weight": null,
      "pvt_marks": "SHYAM",
      "discount_percent": 0,
      "gst_rate": 18,
      "cess_rate": 0
    },
    {
      "item_name": "DOOR LOCK",
      "hsn_sac_code": "83013000",
      "quantity": 100,
      "unit": "PCS",
      "rate": 50,
      "gst_rate": 18
    }
  ]
}
```

**Fields the backend ignores / protects on edit:**

| Field | Why ignored |
|---|---|
| `invoice_no` | Never changes after creation |
| `invoice_series_id` | Series not changed on edit |
| `created_by` | Cannot change who created |
| `created_at` | Immutable audit field |
| `paid_amount` | Managed by payment endpoints only |
| `payment_status` | Managed by payment endpoints only |

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "c1a2b3c4-...",
    "invoice_no": "INV/2024-25/0001",
    "buyer_name": "SHYAM",
    "pvt_marks": "SHYAM",
    "subtotal": 22000.00,
    "taxable_amount": 22000.00,
    "total_cgst": 1980.00,
    "total_sgst": 1980.00,
    "total_igst": 0.00,
    "total_tax": 3960.00,
    "total_amount": 25960.00,
    "balance_amount": 25960.00,
    "updated_at": "2026-06-20T07:15:00Z",
    "line_items": [
      {
        "line_number": 1,
        "item_name": "CUPBOARD LOCK",
        "quantity": 600,
        "rate": 30,
        "pvt_marks": "SHYAM",
        "taxable_amount": 18000.00,
        "cgst_amount": 1620.00,
        "sgst_amount": 1620.00,
        "total_amount": 21240.00
      },
      {
        "line_number": 2,
        "item_name": "DOOR LOCK",
        "quantity": 100,
        "rate": 50,
        "taxable_amount": 5000.00,
        "cgst_amount": 450.00,
        "sgst_amount": 450.00,
        "total_amount": 5900.00
      }
    ]
  }
}
```

---

## What CAN and CANNOT be edited

| Field | Editable | Notes |
|---|---|---|
| `invoice_type` | ✅ | Can change type |
| `invoice_date` | ✅ | |
| `due_date` | ✅ | |
| `buyer_name` | ✅ | |
| `buyer_gstin` | ✅ | |
| `buyer_aadhar_number` | ✅ | |
| `buyer_pan` | ✅ | |
| `billing_address` | ✅ | |
| `shipping_address` | ✅ | |
| `buyer_state_code` | ✅ | Changes CGST/SGST vs IGST calculation |
| `transport_name` | ✅ | |
| `pvt_marks` | ✅ | Invoice-level |
| `gr_no` | ✅ | |
| `po_number` | ✅ | |
| `po_date` | ✅ | |
| `place_of_supply` | ✅ | |
| `supply_type` | ✅ | Affects tax split |
| `e_way_bill` | ✅ | |
| `notes` | ✅ | |
| `terms_and_conditions` | ✅ | |
| `status` | ✅ | DRAFT → SENT etc. |
| `line_items` | ✅ | Fully replaced, all recalculated |
| `invoice_no` | ❌ | Never changes |
| `paid_amount` | ❌ | Use payment endpoints |
| `payment_status` | ❌ | Auto-managed |
| `created_by` | ❌ | Immutable |

---

## Guard: when to show the Edit button

```js
// Show Edit only when:
const canEdit = invoice.status !== 'CANCELLED' && invoice.is_active === true

// Additional business rule — optionally block edit if already paid
const canEditStrict = canEdit && invoice.payment_status !== 'PAID'
```

---

## API summary for the edit flow

| Step | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | `GET` | `/api/invoice/{invoice_id}` | Fetch invoice + line items to pre-fill form |
| 2 | `PUT` | `/api/invoice/{invoice_id}/edit` | Save edited header + all line items, recalculate totals |
