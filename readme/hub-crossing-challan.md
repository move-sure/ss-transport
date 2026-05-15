# Transport Bilty Report API

## Overview
The Transport Bilty Report API provides comprehensive bilty details for a specific transport company (GSTIN or name) within a date range. Returns grouped data by pohonch number with full bilty details including content, kaat calculations, payment mode, and dispatch information.

## Endpoint
```
GET /api/bilty/transport-report
```

## Request Parameters

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transport_gstin` | string | Yes* | GST Identification Number of transport (e.g., "09AVKPJ3682J1Z2") |
| `transport_name` | string | Yes* | Transport company name (if GSTIN not provided) |
| `from_date` | string | Yes | Start date (YYYY-MM-DD format) |
| `to_date` | string | Yes | End date (YYYY-MM-DD format) |

**Note:** Either `transport_gstin` OR `transport_name` must be provided.

### Example Request
```bash
curl -X GET "http://localhost:5000/api/bilty/transport-report?transport_gstin=09AVKPJ3682J1Z2&from_date=2026-03-31&to_date=2026-04-30"
```

## Response Structure

### Success Response (200 OK)
```json
{
  "status": "success",
  "from_date": "2026-03-31",
  "to_date": "2026-04-30",
  "transport_gstin": "09AVKPJ3682J1Z2",
  "transport_name": "Transport Company Name",
  "sources": {
    "bilty_table": 25,
    "station_bilty_summary": 5
  },
  "summary": {
    "total": 30,
    "with_pohonch": 20,
    "without_pohonch": 10,
    "total_weight_kg": 1500.50,
    "total_freight": 75000.00
  },
  "with_pohonch": {
    "POH-001": {
      "regular": [...],
      "manual": [...]
    }
  },
  "no_pohonch": {
    "CHALLAN-001": [...],
    "UNKNOWN": [...]
  }
}
```

## Response Fields

### Summary Object
| Field | Type | Description |
|-------|------|-------------|
| `total` | integer | Total number of bilties |
| `with_pohonch` | integer | Bilties grouped with pohonch number |
| `without_pohonch` | integer | Bilties without pohonch number |
| `total_weight_kg` | number | Total weight in KG across all bilties |
| `total_freight` | number | Total freight amount |

### Bilty Record (Per Item)
| Field | Type | Description |
|-------|------|-------------|
| `source` | string | "regular" (from bilty table) or "manual" (from station_bilty_summary) |
| `gr_no` | string | Goods Receipt number (unique identifier) |
| `bilty_date` | date | Date bilty was created (YYYY-MM-DD) |
| `transport_name` | string | Transport company name |
| `transport_gst` | string | Transport GST number |
| `consignor_name` | string | Sender/Shipper name |
| `consignee_name` | string | Receiver/Consignee name |
| `from_city` | string | Origin city |
| `to_city` | string | Destination city |
| `payment_mode` | string | "paid", "to-pay", "foc", or "partial" |
| `no_of_pkg` | integer | Number of packages |
| `wt` | number | Weight in KG |
| `freight_amount` | number | Base freight charge |
| `pf_charge` | number | Platform/Processing fee |
| `dd_charge` | number | DD (Demand Draft) charge |
| `labour_charge` | number | Labour handling charge |
| `bill_charge` | number | Billing/Documentation charge |
| `toll_charge` | number | Toll/Tax charge |
| `other_charge` | number | Other miscellaneous charges |
| `total` | number | Total amount (sum of all charges) |
| **`contain`** | string | **Contents/Goods description** |
| `pvt_marks` | string | Private marks or special identifiers |
| `remark` | string | Additional remarks/notes |
| `challan_no` | string | Associated challan number |
| `challan_dispatch_date` | date | Date challan was dispatched |
| `pohonch_number` | string | Pohonch (delivery receipt) number |
| `has_crossing_challan` | boolean | Whether bilty crosses multiple challans |
| `crossing_challans` | string | Comma-separated crossing challan numbers |
| `dest_pohonch_no` | string | Destination pohonch number |
| `bilty_number` | string | Bilty reference number |
| `kaat` | number | KAAT deduction amount |
| `kaat_pf` | number | KAAT PF (Provider Fee) for to-pay items |
| `kaat_dd` | number | KAAT DD (Deduction) for to-pay items |
| `kaat_rate` | number | Actual KAAT rate applied (per KG) |

## Key Fields Explanation

### Contain/Contents Field
The `contain` field describes the **goods/items in the bilty**. Examples:
- "Cotton fabric rolls"
- "Electronics - TVs, Refrigerators"
- "Textile goods - shirts, trousers"
- "Spices - turmeric, coriander powder"
- "FMCG products - soaps, shampoos"

This field comes from:
- **bilty table**: `contain` column (for regular bilties)
- **station_bilty_summary table**: `contents` column (for manual bilties)

### Kaat Fields
- **`kaat`**: Total KAAT deduction from the bilty
- **`kaat_pf`**: Provider Fee component of KAAT
- **`kaat_dd`**: DD (Deduction) component of KAAT
- **`kaat_rate`**: The rate per KG applied for KAAT calculation

### Payment Mode
- **`paid`**: Full payment received
- **`to-pay`**: Payment pending
- **`foc`**: Free of charge
- **`partial`**: Partial payment received

### Grouping
Results are grouped by pohonch number:
- **`with_pohonch`**: Bilties with a pohonch number (grouped by pohonch)
  - Each pohonch contains `regular` and `manual` sub-groups
- **`no_pohonch`**: Bilties without pohonch (grouped by challan or unknown)

## Example Response with Content Details

```json
{
  "status": "success",
  "from_date": "2026-03-31",
  "to_date": "2026-04-30",
  "transport_gstin": "09AVKPJ3682J1Z2",
  "transport_name": "ABC Transport Ltd",
  "summary": {
    "total": 2,
    "with_pohonch": 1,
    "without_pohonch": 1,
    "total_weight_kg": 520.50,
    "total_freight": 25000.00
  },
  "with_pohonch": {
    "POH-2026-001": {
      "regular": [
        {
          "gr_no": "GR-001",
          "consignor_name": "ABC Industries",
          "consignee_name": "XYZ Retail Pvt Ltd",
          "from_city": "Delhi",
          "to_city": "Mumbai",
          "contain": "Cotton fabric rolls - 500 kg",
          "no_of_pkg": 50,
          "wt": 500,
          "payment_mode": "to-pay",
          "total": 12500.00,
          "kaat": 625.00,
          "kaat_rate": 1.25,
          "kaat_dd": 500.00,
          "kaat_pf": 125.00,
          "pvt_marks": "URGENT-DELIVERY",
          "remark": "Handle with care"
        }
      ],
      "manual": []
    }
  },
  "no_pohonch": {
    "GR-002": [
      {
        "gr_no": "GR-002",
        "consignor_name": "DEF Corporation",
        "consignee_name": "GHI Traders",
        "from_city": "Bangalore",
        "to_city": "Chennai",
        "contain": "Electronics - Laptops, Monitors",
        "no_of_pkg": 25,
        "wt": 20.50,
        "payment_mode": "paid",
        "total": 12500.00,
        "kaat": null,
        "pvt_marks": "FRAGILE",
        "source": "manual"
      }
    ]
  }
}
```

## Error Responses

### Missing Required Parameters (400)
```json
{
  "status": "error",
  "message": "transport_gstin or transport_name is required",
  "status_code": 400
}
```

### Invalid Date Format (400)
```json
{
  "status": "error",
  "message": "Invalid date format. Use YYYY-MM-DD",
  "status_code": 400
}
```

### No Results Found (200)
```json
{
  "status": "success",
  "from_date": "2026-05-01",
  "to_date": "2026-05-31",
  "transport_gstin": "09AVKPJ3682J1Z2",
  "transport_name": "",
  "sources": {
    "bilty_table": 0,
    "station_bilty_summary": 0
  },
  "summary": {
    "total": 0,
    "with_pohonch": 0,
    "without_pohonch": 0,
    "total_weight_kg": 0,
    "total_freight": 0
  },
  "with_pohonch": {},
  "no_pohonch": {}
}
```

## Data Sources

### Bilty Table (Regular Bilties)
- Source field: **"regular"**
- Tables: `bilty`, `bilty_wise_kaat`, `pohonch`
- Contains field: `contain` (text describing goods)
- Payment mode: `payment_mode` field

### Station Bilty Summary (Manual Bilties)
- Source field: **"manual"**
- Table: `station_bilty_summary`
- Contents field: `contents` (text describing goods)
- Payment status: `payment_status` field

## Usage Examples

### Get Transport Report by GSTIN
```bash
curl -X GET "http://localhost:5000/api/bilty/transport-report?transport_gstin=09AVKPJ3682J1Z2&from_date=2026-01-01&to_date=2026-12-31"
```

### Get Transport Report by Name
```bash
curl -X GET "http://localhost:5000/api/bilty/transport-report?transport_name=ABC%20Transport&from_date=2026-01-01&to_date=2026-12-31"
```

### Using in JavaScript/Frontend
```javascript
const response = await fetch(
  `/api/bilty/transport-report?transport_gstin=09AVKPJ3682J1Z2&from_date=2026-03-01&to_date=2026-03-31`
);
const data = await response.json();

// Access content details
data.with_pohonch['POH-001'].regular.forEach(bilty => {
  console.log(`GR: ${bilty.gr_no}`);
  console.log(`Contents: ${bilty.contain}`);
  console.log(`Weight: ${bilty.wt} kg`);
  console.log(`Payment Mode: ${bilty.payment_mode}`);
});
```

## Performance Notes
- Pagination: Results are fetched in chunks of 1000 records
- Large date ranges with many bilties may take 2-5 seconds
- Results are sorted naturally (e.g., POH-1, POH-2, POH-10 instead of POH-1, POH-10, POH-2)

## Database Columns Referenced

### bilty table
- `gr_no` - Goods receipt number
- `contain` - **Contents/goods description**
- `transport_gst` - Transport GST
- `payment_mode` - Payment mode
- Other charge columns (freight, dd_charge, etc.)

### station_bilty_summary table
- `gr_no` - Goods receipt number
- `contents` - **Contents/goods description**
- `transport_gst` - Transport GST
- `payment_status` - Payment status
- Other amount fields

### bilty_wise_kaat table
- `gr_no` - Goods receipt number
- `kaat` - KAAT amount
- `pf` - Provider Fee
- `dd_chrg` - DD charge
- `actual_kaat_rate` - KAAT rate applied

## Last Updated
2026-05-15

## Version
1.0.0
