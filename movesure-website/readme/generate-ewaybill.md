# Generate E-Way Bill API

Two endpoints are available depending on the use case:

| Endpoint | Use when |
|---|---|
| `POST /api/generate-ewaybill` | Full control — you supply every field including `document_type`, `sub_supply_type`, etc. |
| `POST /api/generate-delivery-challan` | **Shortcut** — `document_type`, `sub_supply_type`, and `sub_supply_description` are pre-set. You only supply shipment fields. |

> JWT auth is handled automatically. No token needed from the frontend.

---

---

## Delivery Challan Shortcut — `POST /api/generate-delivery-challan`

Use this endpoint when you always generate Delivery Challan EWBs. The following three fields are **pre-set by the server** — you do not send them:

| Field | Pre-set value |
|---|---|
| `document_type` | `"Delivery Challan"` |
| `sub_supply_type` | `"Others"` |
| `sub_supply_description` | `"Delivery against invoice <document_number>"` (auto from your doc number) |

You can still override any of these by including them in the request body.

### Minimal request body (Delivery Challan endpoint)

```json
{
  "userGstin":              "09COVPS5556J1ZT",
  "supply_type":            "outward",
  "document_number":        "DE/00123/26-27",
  "document_date":          "22/05/2026",

  "gstin_of_consignor":     "09AAGPG4966R1ZV",
  "legal_name_of_consignor":"THE DESIGNO INTERNATIONAL",
  "address1_of_consignor":  "E-60, Sector-6,",
  "place_of_consignor":     "Noida",
  "pincode_of_consignor":   201301,
  "state_of_consignor":     "UTTAR PRADESH",

  "gstin_of_consignee":     "09DRJPS0580Q4ZR",
  "legal_name_of_consignee":"THE CHAHAMAN ENTERPRISES",
  "address1_of_consignee":  "22bn ssb camp, Chiuraha road, maharajganj, UP - 273303",
  "place_of_consignee":     "maharajganj",
  "pincode_of_consignee":   273303,
  "state_of_supply":        "UTTAR PRADESH",

  "taxable_amount":         96000,
  "cgst_amount":            8640,
  "sgst_amount":            8640,
  "igst_amount":            0,
  "cess_amount":            0,
  "other_value":            0,
  "total_invoice_value":    113280,

  "transportation_mode":    "Road",
  "transportation_distance":827,
  "vehicle_number":         "DL01LAR7116",
  "vehicle_type":           "Regular",
  "transporter_id":         "09COVPS5556J1ZT",
  "transporter_name":       "S S TRANSPORT CORPORATION",

  "itemList": [
    {
      "product_name":    "24 Air Circulator With SS Drum",
      "hsn_code":        84149030,
      "quantity":        6,
      "unit_of_product": "NOS",
      "taxable_amount":  96000,
      "cgst_rate":       9,
      "sgst_rate":       9,
      "igst_rate":       0
    }
  ]
}
```

### What the server adds automatically

```json
{
  "document_type":         "Delivery Challan",
  "sub_supply_type":       "Others",
  "sub_supply_description":"Delivery against invoice DE/00123/26-27",
  "actual_from_state_name":"UTTAR PRADESH",
  "actual_to_state_name":  "UTTAR PRADESH",
  "transaction_type":      1,
  "generate_status":       1,
  "data_source":           "erp"
}
```

### Override the description

To customise the description, include it in your request:

```json
{
  "sub_supply_description": "Delivery against work order WO-2026-045"
}
```

### Success response (same for both endpoints)

```json
{
  "status":       "success",
  "message":      "E-Way Bill generated successfully",
  "ewayBillNo":   441727987045,
  "ewayBillDate": "22/05/2026 01:49:00 PM",
  "validUpto":    "27/05/2026 11:59:00 PM",
  "alert":        "",
  "url":          "https://router.mastersindia.co/api/v1/detailPrintPdf/xxxx/"
}
```

---

## Full Control Endpoint — `POST /api/generate-ewaybill`

Use this when `document_type` is anything other than Delivery Challan
(Tax Invoice, Bill of Supply, Bill of Entry, Credit Note, Others).

## Quick Start

```javascript
const response = await fetch("https://your-backend-url/api/generate-ewaybill", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const result = await response.json();

if (result.status === "success") {
  console.log("EWB No:", result.ewayBillNo);
  console.log("PDF:",    result.url);
} else {
  // result.errors is an array of human-readable strings
  console.log("Errors:", result.errors);
}
```

---

## Request Body

### Required Fields

| Field | Type | Rules | Example |
|---|---|---|---|
| `userGstin` | string | 15-char GSTIN mapped to your MastersIndia account | `"09COVPS5556J1ZT"` |
| `supply_type` | string | `"outward"` or `"inward"` | `"outward"` |
| `sub_supply_type` | string | e.g. `"Supply"`, `"Import"`, `"Export"` | `"Supply"` |
| `document_type` | string | See [Document Types](#document-types) below | `"Tax Invoice"` |
| `document_number` | string | Max **16 chars**, only `A-Z a-z 0-9 / -` | `"INV/25-26/001"` |
| `document_date` | string | `dd/mm/yyyy`, must be ≤ today | `"22/05/2026"` |
| `gstin_of_consignor` | string | 15-char GSTIN or `"URP"` (unregistered) | `"09AAGPG4966R1ZV"` |
| `gstin_of_consignee` | string | 15-char GSTIN or `"URP"` | `"09DRJPS0580Q4ZR"` |
| `pincode_of_consignor` | number | Exactly 6 digits | `201301` |
| `pincode_of_consignee` | number | Exactly 6 digits | `273303` |
| `state_of_consignor` | string | Full state name in CAPS | `"UTTAR PRADESH"` |
| `state_of_supply` | string | Destination state name in CAPS | `"UTTAR PRADESH"` |
| `taxable_amount` | number | Total taxable amount | `96000` |
| `total_invoice_value` | number | Final invoice total incl. taxes | `113280` |
| `transportation_mode` | string | `"Road"`, `"Rail"`, `"Air"`, `"Ship"`, `"In Transit"` | `"Road"` |
| `transportation_distance` | number | 0–4000 km. Pass `0` to auto-calculate | `827` |
| `itemList` | array | 1–250 items. See [Item Fields](#item-fields) | — |

### Recommended Fields (auto-filled if omitted, but send them explicitly)

| Field | Type | Auto-fill default | Notes |
|---|---|---|---|
| `actual_from_state_name` | string | Copied from `state_of_consignor` | NIC validates pincode against this — **always send** |
| `actual_to_state_name` | string | Copied from `state_of_supply` | NIC validates pincode against this — **always send** |
| `transaction_type` | number | `1` | `1`=Regular, `2`=Bill To/Ship To, `3`=Bill From/Dispatch From, `4`=Combo |
| `generate_status` | number | `1` | Always 1 for ERP-generated bills |
| `data_source` | string | `"erp"` | Always `"erp"` |

> **Why `actual_from_state_name` matters:** NIC has two separate state checks — the billing state (from GSTIN) and the *actual physical* state goods leave from. If omitted, NIC returns `"Enter the correct actual state of consignor"` even when the billing state is correct. The backend auto-fills it, but always send the right value when dispatch and billing states differ.

### Optional Fields

| Field | Type | Example | Notes |
|---|---|---|---|
| `legal_name_of_consignor` | string | `"THE DESIGNO INTERNATIONAL"` | Recommended for clarity |
| `address1_of_consignor` | string | `"E-60, Sector-6,"` | |
| `address2_of_consignor` | string | `""` | |
| `place_of_consignor` | string | `"Noida"` | |
| `legal_name_of_consignee` | string | `"THE CHAHAMAN ENTERPRISES"` | Recommended |
| `address1_of_consignee` | string | `"22bn SSB Camp, Chiuraha Road"` | |
| `address2_of_consignee` | string | `""` | |
| `place_of_consignee` | string | `"maharajganj"` | |
| `cgst_amount` | number | `8640` | Required for intra-state |
| `sgst_amount` | number | `8640` | Required for intra-state |
| `igst_amount` | number | `0` | Required for inter-state |
| `cess_amount` | number | `0` | |
| `cess_nonadvol_value` | number | `0` | |
| `other_value` | number | `0` | Other charges (+/-) |
| `transporter_id` | string | `"09COVPS5556J1ZT"` | Transporter GSTIN |
| `transporter_name` | string | `"S S TRANSPORT CORPORATION"` | |
| `transporter_document_number` | string | `""` | **Required** for Rail / Air / Ship |
| `transporter_document_date` | string | `""` | `dd/mm/yyyy` |
| `vehicle_number` | string | `"DL01LAR7116"` | **Required** for Road. Format: `UP81CT9947` or `TMXXXXXX` (temp) |
| `vehicle_type` | string | `"Regular"` | `"Regular"` or `"ODC"` |
| `sub_supply_description` | string | `"Delivery against work order"` | **Required when `document_type` is `Others`** |

---

## Document Types

| `document_type` | When to use | `sub_supply_description` | Dedicated endpoint |
|---|---|---|---|
| `Tax Invoice` | Standard B2B sale | Not needed | — |
| `Bill of Supply` | Exempt / composition supply | Not needed | — |
| `Bill of Entry` | Import of goods | Not needed | — |
| `Delivery Challan` | Job work, returns, transport deliveries | Not needed (auto-generated) | **`/api/generate-delivery-challan`** |
| `Credit Note` | Sales returns | Not needed | — |
| `Others` | Any other document | **Required** — describe the document | — |

> **E-Invoice block:** For B2B `Tax Invoice` transactions dated on or after 01/10/2020, if the supplier is e-invoice enabled, generate the EWB via the IRN/e-invoice system — not this endpoint.

---

## "Others" Document Type — Special Rules

When `document_type` is `"Others"`:

1. **`sub_supply_description` is required.** Describe the nature of the document (e.g. `"Delivery against work order"`, `"Internal transfer slip"`).
2. The field is validated by the backend — an empty or missing description returns a `400` error.
3. All other fields work exactly the same as a Tax Invoice.

**Example payload snippet:**
```json
{
  "document_type": "Others",
  "sub_supply_type": "Supply",
  "sub_supply_description": "Delivery against work order WO-2026-045"
}
```

---

## Item Fields (`itemList[]`)

| Field | Required | Rules | Example |
|---|---|---|---|
| `product_name` | Yes | Auto-fills from `product_description` if blank | `"24 Air Circulator With SS Drum"` |
| `product_description` | No | | `"24 Air Circulator With SS Drum"` |
| `hsn_code` | Yes | 4–8 digits, numeric only | `84149030` |
| `quantity` | Yes | Must be > 0 | `6` |
| `unit_of_product` | Yes | e.g. `NOS`, `PCS`, `KGS`, `BOX` | `"NOS"` |
| `taxable_amount` | Yes | Item-level taxable amount | `96000` |
| `cgst_rate` | Yes | Negative values auto-corrected to 0 | `9` |
| `sgst_rate` | Yes | Negative values auto-corrected to 0 | `9` |
| `igst_rate` | Yes | | `0` |
| `cess_rate` | No | | `0` |
| `cessNonAdvol` | No | | `0` |

---

## Sample Request — Tax Invoice

```json
{
  "userGstin": "09COVPS5556J1ZT",
  "supply_type": "outward",
  "sub_supply_type": "Supply",
  "sub_supply_description": "",
  "document_type": "Tax Invoice",
  "document_number": "INV/25-26/001",
  "document_date": "22/05/2026",
  "transaction_type": 1,

  "gstin_of_consignor": "09AABFM8846M1ZM",
  "legal_name_of_consignor": "MODERN LOCK MFG. CO.",
  "address1_of_consignor": "KOTHI NO.1 BANNA DEVI, G.T.ROAD, ALIGARH",
  "address2_of_consignor": "",
  "place_of_consignor": "ALIGARH",
  "pincode_of_consignor": 202001,
  "state_of_consignor": "UTTAR PRADESH",
  "actual_from_state_name": "UTTAR PRADESH",

  "gstin_of_consignee": "09ASMPS6146H1Z5",
  "legal_name_of_consignee": "M.A ENTERPRISES",
  "address1_of_consignee": "127, DONDIPUR ALLAHABAD",
  "address2_of_consignee": "",
  "place_of_consignee": "ALLAHABAD",
  "pincode_of_consignee": 211003,
  "state_of_supply": "UTTAR PRADESH",
  "actual_to_state_name": "UTTAR PRADESH",

  "taxable_amount": 96000,
  "cgst_amount": 8640,
  "sgst_amount": 8640,
  "igst_amount": 0,
  "cess_amount": 0,
  "cess_nonadvol_value": 0,
  "other_value": 0,
  "total_invoice_value": 113280,

  "transporter_id": "09COVPS5556J1ZT",
  "transporter_name": "S S TRANSPORT CORPORATION",
  "transporter_document_number": "",
  "transporter_document_date": "",
  "transportation_mode": "Road",
  "transportation_distance": 563,
  "vehicle_number": "UP81CT9947",
  "vehicle_type": "Regular",

  "generate_status": 1,
  "data_source": "erp",

  "itemList": [
    {
      "product_name": "24 Air Circulator With SS Drum",
      "product_description": "24 Air Circulator With SS Drum",
      "hsn_code": 84149030,
      "quantity": 6,
      "unit_of_product": "NOS",
      "taxable_amount": 96000,
      "cgst_rate": 9,
      "sgst_rate": 9,
      "igst_rate": 0,
      "cess_rate": 0,
      "cessNonAdvol": 0
    }
  ]
}
```

---

## Sample Request — "Others" Document Type

```json
{
  "userGstin": "09COVPS5556J1ZT",
  "supply_type": "outward",
  "sub_supply_type": "Supply",
  "sub_supply_description": "Delivery against work order WO-2026-045",
  "document_type": "Others",
  "document_number": "DE/00124/26-27",
  "document_date": "22/05/2026",
  "transaction_type": 1,

  "gstin_of_consignor": "09AAGPG4966R1ZV",
  "legal_name_of_consignor": "THE DESIGNO INTERNATIONAL",
  "address1_of_consignor": "E-60, Sector-6,",
  "address2_of_consignor": "",
  "place_of_consignor": "Noida",
  "pincode_of_consignor": 201301,
  "state_of_consignor": "UTTAR PRADESH",
  "actual_from_state_name": "UTTAR PRADESH",

  "gstin_of_consignee": "09DRJPS0580Q4ZR",
  "legal_name_of_consignee": "THE CHAHAMAN ENTERPRISES",
  "address1_of_consignee": "22bn ssb camp, Chiuraha road, maharajganj, UP - 273303",
  "address2_of_consignee": "",
  "place_of_consignee": "maharajganj",
  "pincode_of_consignee": 273303,
  "state_of_supply": "UTTAR PRADESH",
  "actual_to_state_name": "UTTAR PRADESH",

  "taxable_amount": 96000,
  "cgst_amount": 8640,
  "sgst_amount": 8640,
  "igst_amount": 0,
  "cess_amount": 0,
  "cess_nonadvol_value": 0,
  "other_value": 0,
  "total_invoice_value": 113280,

  "transporter_id": "09COVPS5556J1ZT",
  "transporter_name": "S S TRANSPORT CORPORATION",
  "transporter_document_number": "",
  "transporter_document_date": "",
  "transportation_mode": "Road",
  "transportation_distance": 827,
  "vehicle_number": "DL01LAR7116",
  "vehicle_type": "Regular",

  "generate_status": 1,
  "data_source": "erp",

  "itemList": [
    {
      "product_name": "24 Air Circulator With SS Drum",
      "product_description": "24 Air Circulator With SS Drum",
      "hsn_code": 84149030,
      "quantity": 6,
      "unit_of_product": "NOS",
      "taxable_amount": 96000,
      "cgst_rate": 9,
      "sgst_rate": 9,
      "igst_rate": 0,
      "cess_rate": 0,
      "cessNonAdvol": 0
    }
  ]
}
```

---

## Success Response

```json
{
  "status": "success",
  "message": "E-Way Bill generated successfully",
  "ewayBillNo": 481727962271,
  "ewayBillDate": "22/05/2026 12:58:00 PM",
  "validUpto": "27/05/2026 11:59:00 PM",
  "alert": "",
  "url": "https://router.mastersindia.co/api/v1/detailPrintPdf/xxxx/",
  "data": { "...full API response..." }
}
```

| Field | Description |
|---|---|
| `ewayBillNo` | The NIC-issued EWB number |
| `ewayBillDate` | Generation date & time |
| `validUpto` | Expiry date (depends on distance) |
| `alert` | Non-blocking NIC alert (e.g. distance warning) |
| `url` | Direct PDF link |

---

## Validation Error Response (400)

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    "document_number: Max 16 characters allowed, you provided 20 characters",
    "sub_supply_description: Required when document_type is 'Others'"
  ],
  "error_type": "validation"
}
```

---

## NIC / API Error Response

```json
{
  "status": "error",
  "message": "E-way bill(s) are already generated for the same document number",
  "nic_code": "",
  "data": { "...full API response..." }
}
```

---

## Validation Rules

### document_number
| Rule | Detail |
|---|---|
| Max length | **16 characters** |
| Allowed chars | `A-Z a-z 0-9 / -` only |
| Uniqueness | One active EWB per document number per consignor. Cannot reuse while the EWB is active. |

### State Fields
| Rule | Detail |
|---|---|
| Format | Full uppercase name: `"UTTAR PRADESH"`, `"MAHARASHTRA"`, `"DELHI"` |
| `state_of_consignor` | Registered billing state of consignor |
| `actual_from_state_name` | Physical state goods are dispatched from (auto-filled = `state_of_consignor`) |
| `state_of_supply` | Registered billing state of consignee |
| `actual_to_state_name` | Physical destination state (auto-filled = `state_of_supply`) |
| Mismatch | If dispatch location differs from GSTIN state (e.g. Delhi branch of UP company), set `actual_from_state_name` = `"DELHI"` while `state_of_consignor` stays `"UTTAR PRADESH"` |

### Transport
| Mode | `vehicle_number` | `transporter_document_number` |
|---|---|---|
| **Road** | **Required** | Optional |
| **Rail** | Optional | **Required** |
| **Air** | Optional | **Required** |
| **Ship** | Optional | **Required** |
| **In Transit** | Optional | Optional |

### Vehicle Number Format
- Standard: `UP81CT9947`, `DL01LAR7116`, `KA12BL4567`
- Temporary: `TMXXXXXX`

### Amounts
```
taxable + cgst + sgst + igst + cess + other + cessNonAdvol  ≤  total_invoice_value  (+Rs.2 grace)
```
- **Intra-state** (same state both sides): use `cgst_rate` / `sgst_rate`
- **Inter-state** (different states): use `igst_rate`

### Distance
- Range: **0 to 4000 km**
- Pass `0` to auto-calculate from pincodes
- Same pincode: max 100 km (300 km for Line Sales)

---

## Common Errors and Fixes

| Error | Cause | Fix |
|---|---|---|
| `document_number: Max 16 characters` | Doc number too long | Shorten to ≤16 chars |
| `GSTIN does not exist / not mapped with logged-in user` | `userGstin` not registered in MastersIndia account | Use `09COVPS5556J1ZT` (default mapped GSTIN) |
| `Enter the correct actual state of consignor` | `actual_from_state_name` missing or NIC lookup failure | Add `actual_from_state_name` matching `state_of_consignor`; also add `actual_to_state_name` |
| `already generated for same document number` | Same document number already has an active EWB | Use a new, unique document number |
| `Invalid Supplier ship from State Code for the given pincode` | Pincode doesn't belong to the supplied state | Verify pincode-to-state mapping |
| `sub_supply_description: Required when document_type is 'Others'` | Missing description for Others type | Add `sub_supply_description` with a meaningful description |
| `vehicle_number: Required when transportation_mode is 'Road'` | Missing vehicle for Road mode | Add `vehicle_number` |
| `Amount mismatch` | Sum of amounts > `total_invoice_value` | Recalculate; ensure sum ≤ `total_invoice_value` + Rs.2 |
| `hsn_code must be 4-8 digits` | Invalid HSN | Use valid numeric HSN (e.g. `84149030`) |
| `quantity must be greater than 0` | Zero or negative quantity | Fix item quantity |

---

## Frontend Form Field Mapping

| Form Field | API Field | Notes |
|---|---|---|
| User GSTIN (hidden/default) | `userGstin` | Default: `09COVPS5556J1ZT` |
| Supply Type dropdown | `supply_type` | `outward` / `inward` |
| Sub Supply Type dropdown | `sub_supply_type` | `Supply`, `Export`, `Job Work`, etc. |
| Document Type dropdown | `document_type` | Shows description field when `Others` selected |
| **Description** (conditional) | `sub_supply_description` | **Show only when document_type = `Others`** |
| Invoice Number | `document_number` | Max 16 chars |
| Invoice Date | `document_date` | Send as `dd/mm/yyyy` |
| Transaction Type | `transaction_type` | Default 1 (Regular) |
| From GSTIN | `gstin_of_consignor` | |
| From Name | `legal_name_of_consignor` | |
| From Address 1 | `address1_of_consignor` | |
| From Address 2 | `address2_of_consignor` | |
| From Place | `place_of_consignor` | |
| From Pincode | `pincode_of_consignor` | 6 digits |
| From State | `state_of_consignor` | Full caps name |
| Actual Dispatch State | `actual_from_state_name` | Usually same as From State |
| To GSTIN | `gstin_of_consignee` | |
| To Name | `legal_name_of_consignee` | |
| To Address 1 | `address1_of_consignee` | |
| To Address 2 | `address2_of_consignee` | |
| To Place | `place_of_consignee` | |
| To Pincode | `pincode_of_consignee` | 6 digits |
| To State | `state_of_supply` | Full caps name |
| Actual Destination State | `actual_to_state_name` | Usually same as To State |
| Transport Mode | `transportation_mode` | |
| Distance | `transportation_distance` | 0–4000 |
| Vehicle Number | `vehicle_number` | Required for Road |
| Vehicle Type | `vehicle_type` | `Regular` / `ODC` |
| Transporter GSTIN | `transporter_id` | |
| Transporter Name | `transporter_name` | |
| Item rows | `itemList[]` | Each row = one item object |
