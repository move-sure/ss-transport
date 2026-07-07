# Invoice Module — Frontend API Reference

> **Important:** Call these APIs directly from the frontend. Do **not** create wrapper/proxy API routes in the frontend. All endpoints are already live on the backend.

**Base URL:** `http://localhost:5000` (or your deployed backend URL)

All responses follow this shape:
```json
{ "status": "success", "data": {...} }
{ "status": "error",   "message": "reason", "status_code": 400 }
```

---

## Table of Contents
1. [Setup Flow (do this in order)](#1-setup-flow)
2. [Invoice Tenants](#2-invoice-tenants-the-issuing-company)
3. [Invoice Series (Numbering)](#3-invoice-series-numbering)
4. [Invoice Receivers (Buyers)](#4-invoice-receivers-buyers)
5. [Invoice Inventory (Item Catalog)](#5-invoice-inventory-item-catalog)
6. [Invoices (Create & Manage)](#6-invoices)
7. [Invoice Payments](#7-invoice-payments)
8. [Field Reference Tables](#8-field-reference-tables)

---

## 1. Setup Flow

Run the setup screens **in this order** before you can create invoices:

```
Step 1 → Create Tenant         (who is issuing the invoice — your company)
Step 2 → Create Invoice Series (INV/2024-25/0001 numbering)
Step 3 → Create Receivers      (your buyers/customers)
Step 4 → Create Inventory Items (products/services you sell)
Step 5 → Create Invoices       (actual invoice documents)
```

---

## 2. Invoice Tenants (The Issuing Company)

The company or firm that **issues** invoices. Usually set up once.

### GET `/api/invoice/tenants`
List all tenants.

**Query Params:**
| Param | Type | Required | Description |
|---|---|---|---|
| `is_active` | boolean | No | Filter by active/inactive |

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "company_name": "Shree Ram Transport Co.",
      "trade_name": "SRT Co.",
      "gstin": "09ABCDE1234F1Z5",
      "pan": "ABCDE1234F",
      "address_line1": "123, Transport Nagar",
      "address_line2": "Near Railway Station",
      "city": "Lucknow",
      "state": "Uttar Pradesh",
      "state_code": "09",
      "pincode": "226001",
      "mobile": "9876543210",
      "alternate_mobile": "9876543211",
      "email": "info@srtco.com",
      "website": "www.srtco.com",
      "logo_url": null,
      "signature_url": null,
      "bank_name": "SBI",
      "bank_account_no": "123456789012",
      "bank_ifsc": "SBIN0001234",
      "bank_branch": "Lucknow Main",
      "upi_id": "srtco@sbi",
      "invoice_prefix": "INV",
      "default_payment_terms": 30,
      "default_tax_type": "INTRA",
      "default_notes": null,
      "terms_and_conditions": "Goods once sold will not be taken back.",
      "consignor_id": null,
      "is_active": true,
      "created_by": "uuid",
      "created_at": "2026-06-20T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/invoice/tenants/{tenant_id}`
Get single tenant by ID.

---

### POST `/api/invoice/tenants`
Create a new tenant.

**Request Body:**
```json
{
  "company_name": "Shree Ram Transport Co.",       // REQUIRED
  "trade_name": "SRT Co.",                         // optional
  "gstin": "09ABCDE1234F1Z5",                      // optional
  "pan": "ABCDE1234F",                             // optional
  "address_line1": "123, Transport Nagar",          // optional
  "address_line2": "Near Railway Station",          // optional
  "city": "Lucknow",                               // optional
  "state": "Uttar Pradesh",                        // optional
  "state_code": "09",                              // optional — 2-digit GST state code
  "pincode": "226001",                             // optional
  "mobile": "9876543210",                          // optional
  "alternate_mobile": "9876543211",                // optional
  "email": "info@srtco.com",                       // optional
  "website": "www.srtco.com",                      // optional
  "logo_url": null,                                // optional — URL of company logo
  "signature_url": null,                           // optional — URL of authorized signature
  "bank_name": "SBI",                              // optional
  "bank_account_no": "123456789012",               // optional
  "bank_ifsc": "SBIN0001234",                      // optional
  "bank_branch": "Lucknow Main",                   // optional
  "upi_id": "srtco@sbi",                          // optional
  "invoice_prefix": "INV",                         // optional — default "INV"
  "default_payment_terms": 30,                     // optional — days, default 30
  "default_tax_type": "INTRA",                     // optional — "INTRA" | "INTER" | "EXEMPT"
  "default_notes": null,                           // optional — printed on every invoice
  "terms_and_conditions": "Goods once sold...",    // optional
  "consignor_id": null,                            // optional — link to existing consignors table
  "created_by": "user-uuid"                        // optional
}
```

**All input fields for the Tenant form:**
| Field | Label | Type | Required |
|---|---|---|---|
| `company_name` | Company Name | text | YES |
| `trade_name` | Trade Name | text | No |
| `gstin` | GSTIN | text | No |
| `pan` | PAN Number | text | No |
| `address_line1` | Address Line 1 | text | No |
| `address_line2` | Address Line 2 | text | No |
| `city` | City | text | No |
| `state` | State | text | No |
| `state_code` | GST State Code | text (2 chars) | No |
| `pincode` | Pincode | text | No |
| `mobile` | Mobile Number | text | No |
| `alternate_mobile` | Alternate Mobile | text | No |
| `email` | Email | email | No |
| `website` | Website | text | No |
| `logo_url` | Company Logo URL | text/url | No |
| `signature_url` | Signature URL | text/url | No |
| `bank_name` | Bank Name | text | No |
| `bank_account_no` | Bank Account No | text | No |
| `bank_ifsc` | IFSC Code | text | No |
| `bank_branch` | Bank Branch | text | No |
| `upi_id` | UPI ID | text | No |
| `invoice_prefix` | Invoice Prefix | text | No (default: INV) |
| `default_payment_terms` | Payment Terms (days) | number | No (default: 30) |
| `default_tax_type` | Tax Type | select | No |
| `default_notes` | Default Notes | textarea | No |
| `terms_and_conditions` | Terms & Conditions | textarea | No |

---

### PUT `/api/invoice/tenants/{tenant_id}`
Update tenant. Send only the fields you want to change.

---

### DELETE `/api/invoice/tenants/{tenant_id}`
Soft-deactivates the tenant (`is_active = false`).

---

## 3. Invoice Series (Numbering)

Controls how invoice numbers are generated.
Example: prefix=`INV`, financial_year=`2024-25`, digits=`4` → `INV/2024-25/0001`

### GET `/api/invoice/series`
List series.

**Query Params:**
| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | uuid | No | Filter by tenant |

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "series_name": "Main Series",
      "prefix": "INV",
      "suffix": null,
      "financial_year": "2024-25",
      "digits": 4,
      "current_number": 1,
      "is_default": true,
      "is_active": true,
      "created_at": "2026-06-20T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/invoice/series`
Create a new numbering series.

**Request Body:**
```json
{
  "tenant_id": "uuid",             // REQUIRED
  "series_name": "Main Series",    // REQUIRED — display name
  "prefix": "INV",                 // optional — e.g. "INV", "GST", "TAX"
  "suffix": null,                  // optional — appended after number
  "financial_year": "2024-25",     // optional — e.g. "2024-25"
  "digits": 4,                     // optional — zero-pad length (default 4)
  "current_number": 1,             // optional — start from (default 1)
  "is_default": true,              // optional — mark as default series for tenant
  "created_by": "user-uuid"        // optional
}
```

**All input fields for Series form:**
| Field | Label | Type | Required |
|---|---|---|---|
| `tenant_id` | Tenant | select (from tenant list) | YES |
| `series_name` | Series Name | text | YES |
| `prefix` | Prefix | text | No |
| `suffix` | Suffix | text | No |
| `financial_year` | Financial Year | text | No |
| `digits` | Number of Digits | number | No (default: 4) |
| `current_number` | Start From | number | No (default: 1) |
| `is_default` | Set as Default | checkbox | No |

Generated invoice number example: `INV/2024-25/0001`

---

### PUT `/api/invoice/series/{series_id}`
Update a series (e.g. bump `current_number`).

### DELETE `/api/invoice/series/{series_id}`
Soft-deactivate a series.

---

## 4. Invoice Receivers (Buyers)

The customers / companies who **receive** invoices from you.

### GET `/api/invoice/receivers`
List receivers.

**Query Params:**
| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | uuid | No | Filter by tenant |
| `is_active` | boolean | No | Filter active/inactive |

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "company_name": "ABC Industries",
      "trade_name": "ABC",
      "contact_person": "Ramesh Gupta",
      "gstin": "09XYZAB1234C1Z5",
      "pan": "XYZAB1234C",
      "aadhar_number": null,
      "mobile": "9876543210",
      "email": "ramesh@abcind.com",
      "billing_address_line1": "Plot 5, Industrial Area",
      "billing_address_line2": null,
      "billing_city": "Kanpur",
      "billing_state": "Uttar Pradesh",
      "billing_state_code": "09",
      "billing_pincode": "208001",
      "shipping_address_line1": null,
      "shipping_address_line2": null,
      "shipping_city": null,
      "shipping_state": null,
      "shipping_state_code": null,
      "shipping_pincode": null,
      "credit_limit": 100000,
      "credit_days": 30,
      "outstanding_amount": 0,
      "consignee_id": null,
      "is_active": true
    }
  ]
}
```

---

### GET `/api/invoice/receivers/{receiver_id}`
Get single receiver.

---

### POST `/api/invoice/receivers`
Create a new receiver.

**Request Body:**
```json
{
  "company_name": "ABC Industries",              // REQUIRED
  "tenant_id": "uuid",                           // optional — link to a specific tenant
  "trade_name": "ABC",                           // optional
  "contact_person": "Ramesh Gupta",              // optional
  "gstin": "09XYZAB1234C1Z5",                   // optional
  "pan": "XYZAB1234C",                           // optional
  "aadhar_number": null,                         // optional — for unregistered buyers
  "mobile": "9876543210",                        // optional
  "email": "ramesh@abcind.com",                  // optional

  "billing_address_line1": "Plot 5, Industrial Area",  // optional
  "billing_address_line2": null,                        // optional
  "billing_city": "Kanpur",                            // optional
  "billing_state": "Uttar Pradesh",                    // optional
  "billing_state_code": "09",                          // optional
  "billing_pincode": "208001",                         // optional

  "shipping_address_line1": null,               // optional — if different from billing
  "shipping_address_line2": null,               // optional
  "shipping_city": null,                        // optional
  "shipping_state": null,                       // optional
  "shipping_state_code": null,                  // optional
  "shipping_pincode": null,                     // optional

  "credit_limit": 100000,                       // optional — max credit allowed
  "credit_days": 30,                            // optional — payment due days
  "consignee_id": null,                         // optional — link to existing consignees table
  "created_by": "user-uuid"                     // optional
}
```

**All input fields for Receiver form:**
| Field | Label | Type | Required | Notes |
|---|---|---|---|---|
| `company_name` | Company Name | text | YES | |
| `trade_name` | Trade Name | text | No | |
| `contact_person` | Contact Person | text | No | |
| `gstin` | GSTIN | text | No | Optional for unregistered buyers |
| `pan` | PAN Number | text | No | |
| `aadhar_number` | Aadhaar Number | text | No | For individual / unregistered buyers |
| `mobile` | Mobile | text | No | |
| `email` | Email | email | No | |
| `billing_address_line1` | Billing Address 1 | text | No | |
| `billing_address_line2` | Billing Address 2 | text | No | |
| `billing_city` | Billing City | text | No | |
| `billing_state` | Billing State | text | No | |
| `billing_state_code` | Billing State Code | text | No | 2-digit GST code |
| `billing_pincode` | Billing Pincode | text | No | |
| `shipping_address_line1` | Shipping Address 1 | text | No | Leave blank if same as billing |
| `shipping_address_line2` | Shipping Address 2 | text | No | |
| `shipping_city` | Shipping City | text | No | |
| `shipping_state` | Shipping State | text | No | |
| `shipping_state_code` | Shipping State Code | text | No | |
| `shipping_pincode` | Shipping Pincode | text | No | |
| `credit_limit` | Credit Limit (₹) | number | No | |
| `credit_days` | Credit Days | number | No | |

---

### PUT `/api/invoice/receivers/{receiver_id}`
Update receiver. Send only changed fields.

### DELETE `/api/invoice/receivers/{receiver_id}`
Soft-deactivate.

---

## 5. Invoice Inventory (Item Catalog)

Products or services you add as line items on invoices.

### GET `/api/invoice/inventory`
List items.

**Query Params:**
| Param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | uuid | No | Filter by tenant |
| `is_active` | boolean | No | Filter active/inactive |

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "item_code": "FRT-001",
      "item_name": "Freight Charges",
      "description": "Transportation freight charges per kg",
      "hsn_sac_code": "9965",
      "item_type": "SERVICE",
      "unit_of_measurement": "KG",
      "default_rate": 5.50,
      "default_discount_pct": 0,
      "gst_rate": 18,
      "cess_rate": 0,
      "is_tax_inclusive": false,
      "is_active": true
    }
  ]
}
```

---

### GET `/api/invoice/inventory/{item_id}`
Get single inventory item.

---

### POST `/api/invoice/inventory`
Create an inventory item.

**Request Body:**
```json
{
  "item_name": "Freight Charges",          // REQUIRED
  "tenant_id": "uuid",                     // optional
  "item_code": "FRT-001",                  // optional — your internal item code
  "description": "Transport freight",      // optional
  "hsn_sac_code": "9965",                  // optional — HSN for goods / SAC for services
  "item_type": "SERVICE",                  // optional — "GOODS" | "SERVICE" (default: GOODS)
  "unit_of_measurement": "KG",             // optional — NOS / KG / MTR / LTR / BOX / SET etc.
  "default_rate": 5.50,                    // optional — pre-fill rate on invoice
  "default_discount_pct": 0,              // optional — default discount %
  "gst_rate": 18,                          // optional — total GST % (0/5/12/18/28), default 18
  "cess_rate": 0,                          // optional — cess %
  "is_tax_inclusive": false,               // optional — is rate inclusive of tax?
  "created_by": "user-uuid"               // optional
}
```

**All input fields for Inventory form:**
| Field | Label | Type | Required | Notes |
|---|---|---|---|---|
| `item_name` | Item / Service Name | text | YES | |
| `item_code` | Item Code | text | No | Your internal SKU/code |
| `description` | Description | textarea | No | |
| `hsn_sac_code` | HSN / SAC Code | text | No | HSN for goods, SAC for services |
| `item_type` | Type | select | No | GOODS or SERVICE |
| `unit_of_measurement` | Unit | select/text | No | NOS, KG, MTR, LTR, BOX, SET, PCS… |
| `default_rate` | Default Rate (₹) | number | No | Pre-filled on invoice line |
| `default_discount_pct` | Default Discount % | number | No | |
| `gst_rate` | GST Rate % | select | No | 0 / 5 / 12 / 18 / 28 |
| `cess_rate` | Cess % | number | No | Usually 0 |
| `is_tax_inclusive` | Rate includes GST? | checkbox | No | |

---

### PUT `/api/invoice/inventory/{item_id}`
Update item.

### DELETE `/api/invoice/inventory/{item_id}`
Soft-deactivate.

---

## 6. Invoices

### POST `/api/invoice/create`
Create a complete invoice with line items. The backend:
- Auto-generates `invoice_no` from the series
- Calculates CGST/SGST (intra-state) or IGST (inter-state) per line
- Computes totals, round-off, and amount in words

**Request Body:**
```json
{
  // ── REQUIRED ──────────────────────────────────────────────
  "tenant_id": "uuid",
  "seller_name": "Shree Ram Transport Co.",
  "buyer_name": "ABC Industries",
  "created_by": "user-uuid",

  // ── Seller snapshot (from tenant record) ──────────────────
  "seller_gstin": "09ABCDE1234F1Z5",
  "seller_pan": "ABCDE1234F",
  "seller_address": "123, Transport Nagar, Lucknow - 226001",
  "seller_state": "Uttar Pradesh",
  "seller_state_code": "09",

  // ── Buyer snapshot (from receiver record) ─────────────────
  "receiver_id": "uuid",                      // optional — link receiver
  "buyer_gstin": "09XYZAB1234C1Z5",           // optional
  "buyer_pan": "XYZAB1234C",                  // optional
  "buyer_aadhar_number": null,                // optional
  "billing_address": "Plot 5, Industrial Area, Kanpur - 208001",
  "shipping_address": null,                   // optional — if different
  "buyer_state": "Uttar Pradesh",
  "buyer_state_code": "09",

  // ── Transport & billing reference ─────────────────────────
  "transport_name": "Shree Ganesh Transport",  // optional
  "gr_no": "A00123",                           // optional — link to bilty GR number
  "bilty_id": null,                            // optional — UUID link to bilty table
  "challan_no": null,                          // optional
  "po_number": "PO/2024/001",                  // optional — buyer's purchase order
  "po_date": "2026-06-15",                     // optional

  // ── Invoice settings ──────────────────────────────────────
  "invoice_series_id": "uuid",                 // optional — use a specific series
  "invoice_type": "TAX_INVOICE",              // optional — see types below
  "invoice_date": "2026-06-20",               // optional — defaults to today
  "due_date": "2026-07-20",                   // optional

  // ── GST supply details ────────────────────────────────────
  "place_of_supply": "09",                    // optional — state code of supply
  "supply_type": "B2B",                       // optional — B2B | B2C | EXPORT | SEZ
  "is_reverse_charge": false,                 // optional
  "is_export": false,                         // optional
  "export_type": null,                        // optional — "WPAY" | "WOPAY"

  // ── E-Way Bill ────────────────────────────────────────────
  "e_way_bill": "1234567890123",              // optional

  // ── Credit / Debit note ref (only for CN/DN) ──────────────
  "original_invoice_id": null,
  "original_invoice_no": null,
  "credit_debit_reason": null,

  // ── Notes ─────────────────────────────────────────────────
  "notes": "Goods dispatched via road.",
  "terms_and_conditions": "Payment within 30 days.",
  "status": "DRAFT",                          // optional — DRAFT | SENT

  // ── LINE ITEMS (REQUIRED, at least 1) ─────────────────────
  "line_items": [
    {
      "item_name": "Freight Charges",          // REQUIRED
      "inventory_item_id": "uuid",             // optional — from inventory catalog
      "description": "LCK to KNP freight",    // optional
      "hsn_sac_code": "9965",                  // optional
      "quantity": 100,                         // optional — default 1
      "unit": "KG",                            // optional — default NOS
      "rate": 5.50,                            // REQUIRED — per unit price
      "weight": 100,                           // optional — weight in kg
      "pvt_marks": "LOT-A",                    // optional — private/lot marks
      "discount_percent": 0,                   // optional
      "gst_rate": 18,                          // optional — total GST %, default 18
      "cess_rate": 0                           // optional
    },
    {
      "item_name": "Labour Charges",
      "quantity": 1,
      "unit": "NOS",
      "rate": 500,
      "gst_rate": 18
    }
  ]
}
```

**Invoice type values:**
| Value | Description |
|---|---|
| `TAX_INVOICE` | Standard GST tax invoice (default) |
| `BILL_OF_SUPPLY` | For exempt goods / composition dealers |
| `PROFORMA` | Proforma / quotation invoice |
| `CREDIT_NOTE` | Credit note against an original invoice |
| `DEBIT_NOTE` | Debit note against an original invoice |
| `DELIVERY_CHALLAN` | Delivery challan document |

**Supply type values:**
| Value | Description |
|---|---|
| `B2B` | Business to Business (registered buyer) |
| `B2C` | Business to Consumer (unregistered) |
| `EXPORT` | Export invoice |
| `SEZ` | Supply to SEZ unit |

**Tax calculation (auto done by backend):**
- Same state (`seller_state_code == buyer_state_code`) → **CGST + SGST** (each = GST/2)
- Different state → **IGST** (= GST rate)
- EXPORT / SEZ → **IGST** at 0% or full depending on `export_type`

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "invoice_no": "INV/2024-25/0001",
    "invoice_type": "TAX_INVOICE",
    "invoice_date": "2026-06-20",
    "seller_name": "Shree Ram Transport Co.",
    "buyer_name": "ABC Industries",
    "transport_name": "Shree Ganesh Transport",
    "subtotal": 1050.00,
    "total_discount": 0,
    "taxable_amount": 1050.00,
    "total_cgst": 94.50,
    "total_sgst": 94.50,
    "total_igst": 0,
    "total_tax": 189.00,
    "round_off": 0,
    "total_amount": 1239.00,
    "payment_status": "UNPAID",
    "paid_amount": 0,
    "balance_amount": 1239.00,
    "status": "DRAFT",
    "line_items": [
      {
        "id": "uuid",
        "line_number": 1,
        "item_name": "Freight Charges",
        "quantity": 100,
        "unit": "KG",
        "rate": 5.50,
        "weight": 100,
        "pvt_marks": "LOT-A",
        "discount_percent": 0,
        "discount_amount": 0,
        "taxable_amount": 550.00,
        "cgst_rate": 9,
        "cgst_amount": 49.50,
        "sgst_rate": 9,
        "sgst_amount": 49.50,
        "igst_rate": 0,
        "igst_amount": 0,
        "total_amount": 649.00
      }
    ]
  }
}
```

---

### GET `/api/invoice/list`
List invoices with filters.

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `tenant_id` | uuid | Filter by issuing company |
| `receiver_id` | uuid | Filter by buyer |
| `status` | string | `DRAFT` \| `SENT` \| `ACKNOWLEDGED` \| `CANCELLED` |
| `payment_status` | string | `UNPAID` \| `PARTIAL` \| `PAID` \| `OVERDUE` \| `CANCELLED` |
| `invoice_type` | string | `TAX_INVOICE` \| `CREDIT_NOTE` etc. |
| `from_date` | date (YYYY-MM-DD) | Invoice date from |
| `to_date` | date (YYYY-MM-DD) | Invoice date to |
| `gr_no` | string | Filter by linked GR number |
| `transport_name` | string | Partial name search on transport_name |
| `page` | number | Page number (default: 1) |
| `page_size` | number | Results per page (default: 50) |

---

### GET `/api/invoice/{invoice_id}`
Get a single invoice with all line items.

**Response:** Same as create response — includes `line_items` array.

---

### PUT `/api/invoice/{invoice_id}`
Update invoice header fields. Send only the fields you want to change.

> Cannot update a CANCELLED invoice.

```json
{
  "due_date": "2026-07-25",
  "notes": "Updated notes.",
  "status": "SENT",
  "transport_name": "New Transport Co."
}
```

---

### PUT `/api/invoice/{invoice_id}/line-items`
Replace **all** line items and recalculate totals.

```json
{
  "line_items": [
    {
      "item_name": "Freight Charges",
      "quantity": 150,
      "unit": "KG",
      "rate": 5.50,
      "weight": 150,
      "pvt_marks": "LOT-B",
      "gst_rate": 18
    }
  ],
  "supply_type": "INTRA"
}
```

---

### POST `/api/invoice/{invoice_id}/cancel`
Cancel an invoice. Cannot be undone.

```json
{
  "cancelled_by": "user-uuid",
  "cancel_reason": "Duplicate invoice created."
}
```

---

### DELETE `/api/invoice/{invoice_id}`
Soft-delete (`is_active = false`). Invoice won't appear in lists.

---

## 7. Invoice Payments

Record payment received against an invoice. Supports partial / split payments.
After each payment, `paid_amount`, `balance_amount`, and `payment_status` on the invoice are automatically updated.

### GET `/api/invoice/{invoice_id}/payment`
List all payments for an invoice.

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "invoice_id": "uuid",
      "payment_date": "2026-06-22",
      "amount": 500.00,
      "payment_mode": "NEFT",
      "reference_no": "UTR123456789",
      "bank_name": "HDFC Bank",
      "cheque_date": null,
      "notes": "Partial payment received",
      "created_by": "uuid",
      "created_at": "2026-06-22T14:30:00Z"
    }
  ]
}
```

---

### POST `/api/invoice/{invoice_id}/payment`
Record a payment.

**Request Body:**
```json
{
  "amount": 500.00,               // REQUIRED — must be > 0
  "payment_mode": "NEFT",        // REQUIRED — see modes below
  "payment_date": "2026-06-22",  // optional — defaults to today
  "reference_no": "UTR123456789",// optional — UTR / cheque number / transaction ID
  "bank_name": "HDFC Bank",      // optional
  "cheque_date": null,           // optional — for post-dated cheques
  "notes": "Partial payment",    // optional
  "created_by": "user-uuid"      // optional
}
```

**Payment mode values:**
| Value | Description |
|---|---|
| `CASH` | Cash payment |
| `CHEQUE` | Cheque payment |
| `DD` | Demand Draft |
| `NEFT` | NEFT bank transfer |
| `RTGS` | RTGS bank transfer |
| `IMPS` | IMPS instant transfer |
| `UPI` | UPI / GPay / PhonePe |
| `OTHER` | Any other mode |

**Payment input fields:**
| Field | Label | Type | Required |
|---|---|---|---|
| `amount` | Amount (₹) | number | YES |
| `payment_mode` | Payment Mode | select | YES |
| `payment_date` | Payment Date | date | No (today) |
| `reference_no` | UTR / Cheque No | text | No |
| `bank_name` | Bank Name | text | No |
| `cheque_date` | Cheque Date | date | No |
| `notes` | Notes | textarea | No |

**Auto-updated on invoice after payment:**
- `paid_amount` → sum of all payments
- `balance_amount` → `total_amount - paid_amount`
- `payment_status` → `UNPAID` / `PARTIAL` / `PAID`

---

### DELETE `/api/invoice/{invoice_id}/payment/{payment_id}`
Delete a payment record. Invoice totals are recalculated automatically.

---

## 8. Field Reference Tables

### GST State Codes (India)
| Code | State |
|---|---|
| 01 | Jammu & Kashmir |
| 02 | Himachal Pradesh |
| 03 | Punjab |
| 04 | Chandigarh |
| 05 | Uttarakhand |
| 06 | Haryana |
| 07 | Delhi |
| 08 | Rajasthan |
| 09 | Uttar Pradesh |
| 10 | Bihar |
| 11 | Sikkim |
| 12 | Arunachal Pradesh |
| 13 | Nagaland |
| 14 | Manipur |
| 15 | Mizoram |
| 16 | Tripura |
| 17 | Meghalaya |
| 18 | Assam |
| 19 | West Bengal |
| 20 | Jharkhand |
| 21 | Odisha |
| 22 | Chhattisgarh |
| 23 | Madhya Pradesh |
| 24 | Gujarat |
| 27 | Maharashtra |
| 29 | Karnataka |
| 30 | Goa |
| 32 | Kerala |
| 33 | Tamil Nadu |
| 36 | Telangana |
| 37 | Andhra Pradesh |

### Common Units of Measurement
| Value | Label |
|---|---|
| `NOS` | Numbers (pieces) |
| `KG` | Kilogram |
| `MTR` | Metre |
| `LTR` | Litre |
| `BOX` | Box |
| `SET` | Set |
| `PCS` | Pieces |
| `TON` | Tonne |
| `BAG` | Bag |
| `BDL` | Bundle |

### Common GST Rates
| Rate | Goods/Services |
|---|---|
| 0% | Exempted items |
| 5% | Essential goods |
| 12% | Standard goods |
| 18% | Services (transport, freight) |
| 28% | Luxury / sin goods |

> **Transport / Freight services** (SAC code `9965`) → **18% GST**

---

## Quick Integration Checklist

```
[ ] 1. Create Tenant              POST /api/invoice/tenants
[ ] 2. Create Series              POST /api/invoice/series
[ ] 3. Create Receivers           POST /api/invoice/receivers
[ ] 4. Create Inventory Items     POST /api/invoice/inventory
[ ] 5. Create Invoice             POST /api/invoice/create
[ ] 6. View Invoice               GET  /api/invoice/{id}
[ ] 7. Update Status to SENT      PUT  /api/invoice/{id}  { "status": "SENT" }
[ ] 8. Record Payment             POST /api/invoice/{id}/payment
[ ] 9. Check Payment Status       GET  /api/invoice/{id}  → payment_status field
```
