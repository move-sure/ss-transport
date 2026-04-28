# Pohonch API — Frontend Integration Guide

> Base URL: `https://api.movesure.io`  
> All endpoints require a valid JWT in the `Authorization: Bearer <token>` header.

---

## Table of Contents

1. [What is a Pohonch?](#what-is-a-pohonch)
2. [Endpoints Overview](#endpoints-overview)
3. [Create Pohonch](#1-create-pohonch)
4. [Edit Pohonch (add/remove bilties, rename)](#2-edit-pohonch)
5. [List Pohonch](#3-list-pohonch)
6. [Get by Pohonch Number](#4-get-by-pohonch-number)
7. [Get by ID](#5-get-by-id)
8. [Sign / Unsign](#6-sign--unsign)
9. [Delete Pohonch](#7-delete-pohonch)
10. [Field Reference — bilty_metadata item](#field-reference--bilty_metadata-item)
11. [Prefix Auto-Derivation](#prefix-auto-derivation)
12. [Frontend Flow — Step by Step](#frontend-flow--step-by-step)
13. [Example JS Code](#example-js-code)

---

## What is a Pohonch?

A **Pohonch** is a onwards transport dispatch document that groups one or more GR (Goods Receipt) bilties under a single transport party for a given set of challans. It tracks payment summaries (kaat, pf, dd) per GR and is used to reconcile freight payments.

---

## Endpoints Overview

| Method   | Path                                  | Purpose                                      |
|----------|---------------------------------------|----------------------------------------------|
| `POST`   | `/api/pohonch/create`                 | Create a new pohonch from GR items           |
| `PATCH`  | `/api/pohonch/{id}/edit`              | Add/remove bilties, rename pohonch_number    |
| `GET`    | `/api/pohonch/list`                   | Paginated list with filters                  |
| `GET`    | `/api/pohonch/number/{number}`        | Get by pohonch number string (e.g. NIE0001)  |
| `GET`    | `/api/pohonch/{id}`                   | Get by UUID                                  |
| `PUT`    | `/api/pohonch/{id}`                   | Raw field update (use edit for bilty changes)|
| `POST`   | `/api/pohonch/{id}/sign`              | Mark as signed                               |
| `POST`   | `/api/pohonch/{id}/unsign`            | Revert signature                             |
| `DELETE` | `/api/pohonch/{id}`                   | Hard-delete permanently                      |

---

## 1. Create Pohonch

**`POST /api/pohonch/create`**

Creates a new pohonch and auto-enriches bilty data from the DB.

### Request Body

```json
{
  "transport_name":  "NEW INDIA EXPRESS TRANSPORT CO.",
  "transport_gstin": "09AACPY1378F3ZC",
  "challan_nos":     ["B00016"],
  "gr_items": [
    { "gr_no": "22789", "challan_no": "B00016", "pohonch_bilty": "1031" },
    { "gr_no": "22790", "challan_no": "B00016", "pohonch_bilty": "1031" },
    { "gr_no": "22791", "challan_no": "B00016" },
    { "gr_no": "22803", "challan_no": "B00016" }
  ],
  "pohonch_prefix":  "NIE",
  "created_by":      "user-uuid"
}
```

| Field                      | Type     | Required | Notes                                         |
|----------------------------|----------|----------|-----------------------------------------------|
| `transport_name`           | string   | YES      |                                               |
| `transport_gstin`          | string   | no       | Auto-uppercased                               |
| `challan_nos`              | string[] | YES      | One or more challan numbers                   |
| `gr_items`                 | object[] | YES      | Each must have `gr_no`                        |
| `gr_items[].pohonch_bilty` | string   | no       | Internal bilty reference number               |
| `pohonch_prefix`           | string   | no       | Auto-derived from transport name if omitted   |
| `created_by`               | UUID     | no       | Falls back to first active user in DB         |

### Response 200

```json
{
  "status": "success",
  "pohonch_number": "NIE0001",
  "data": { },
  "warnings": {
    "unmatched_gr_nos": ["22999"],
    "message": "These GR numbers were not found..."
  }
}
```

---

## 2. Edit Pohonch

**`PATCH /api/pohonch/{pohonch_id}/edit`**

All fields optional — send only what you want to change. Operations can be combined in one request.

### Operations

| Goal                      | Fields to send                        |
|---------------------------|---------------------------------------|
| Add new GRs               | `add_gr_items`                        |
| Remove GRs                | `remove_gr_nos`                       |
| Rename pohonch number     | `new_pohonch_number`                  |
| Replace challan list      | `challan_nos`                         |
| Add + remove in one shot  | both `add_gr_items` + `remove_gr_nos` |

### Request Body

```json
{
  "add_gr_items": [
    { "gr_no": "22900", "challan_no": "B00020", "pohonch_bilty": "1045" }
  ],
  "remove_gr_nos": ["22803"],
  "new_pohonch_number": "NIE0001",
  "challan_nos": ["B00016", "B00020"],
  "user_id": "user-uuid",
  "force": false
}
```

| Field                | Type     | Notes                                                              |
|----------------------|----------|--------------------------------------------------------------------|
| `add_gr_items`       | object[] | Enriched automatically from bilty/station_bilty_summary            |
| `remove_gr_nos`      | string[] | GR numbers to remove                                               |
| `new_pohonch_number` | string   | Rename; returns 409 if number is already taken                     |
| `challan_nos`        | string[] | Replaces challan_metadata entirely                                 |
| `user_id`            | UUID     | Audit trail                                                        |
| `force`              | boolean  | Set `true` to edit a signed pohonch (default: `false`)             |

### Response 200

```json
{
  "status": "success",
  "message": "Pohonch updated: +1 GRs added, -1 GRs removed",
  "pohonch_number": "NIE0001",
  "data": { },
  "warnings": ["GRs not found in bilty/station_bilty_summary (amounts=0): 22999"]
}
```

### Error Responses

| Code | Reason                                              |
|------|-----------------------------------------------------|
| 404  | Pohonch not found                                   |
| 409  | Pohonch is signed (send `force: true` to override)  |
| 409  | `new_pohonch_number` already taken                  |

---

## 3. List Pohonch

**`GET /api/pohonch/list`**

### Query Parameters

| Param             | Type    | Default | Notes                                   |
|-------------------|---------|---------|-----------------------------------------|
| `transport_name`  | string  | —       | Partial match (case-insensitive)        |
| `transport_gstin` | string  | —       | Exact match; takes priority over name   |
| `is_signed`       | boolean | —       | Filter by signed status                 |
| `is_active`       | boolean | `true`  |                                         |
| `search`          | string  | —       | Searches pohonch_number + transport_name|
| `page`            | int     | `1`     |                                         |
| `page_size`       | int     | `40`    |                                         |

### Response 200

```json
{
  "status": "success",
  "data": [],
  "total": 28,
  "page": 1,
  "page_size": 40,
  "total_pages": 1
}
```

---

## 4. Get by Pohonch Number

**`GET /api/pohonch/number/{pohonch_number}`**

```
GET /api/pohonch/number/NIE0001
```

Returns the full pohonch row including complete `bilty_metadata` array.

---

## 5. Get by ID

**`GET /api/pohonch/{pohonch_id}`**

```
GET /api/pohonch/3a29e19f-84ef-493c-b43c-81b1ef335a1d
```

---

## 6. Sign / Unsign

**`POST /api/pohonch/{pohonch_id}/sign`**

```json
{ "user_id": "user-uuid" }
```

**`POST /api/pohonch/{pohonch_id}/unsign`**

```json
{ "user_id": "user-uuid" }
```

- Signing an already-signed pohonch → `409`
- Unsigning an unsigned pohonch → `409`
- A signed pohonch blocks the edit endpoint unless `force: true` is passed

---

## 7. Delete Pohonch

**`DELETE /api/pohonch/{pohonch_id}?user_id=uuid`**

**Hard-delete — permanently removes the row and frees the pohonch_number for reuse.**

Response 200:

```json
{
  "status": "success",
  "message": "Pohonch NIE0001 deleted permanently",
  "pohonch_number": "NIE0001"
}
```

---

## Field Reference — `bilty_metadata` item

| Field              | Type    | Source                             | Notes                                |
|--------------------|---------|------------------------------------|--------------------------------------|
| `gr_no`            | string  | Input                              |                                      |
| `date`             | string  | `bilty.bilty_date`                 | Format: `YYYY-MM-DD`                 |
| `challan_no`       | string  | `bilty_wise_kaat.challan_no`       |                                      |
| `amount`           | float   | `bilty.freight_amount`             | Freight amount                       |
| `kaat`             | float   | `bilty_wise_kaat.kaat`             | Deduction from transport             |
| `pf`               | float   | `amount - kaat`                    | Payable freight                      |
| `dd`               | float   | `bilty_wise_kaat.dd_chrg`          | Door-delivery charge                 |
| `weight`           | float   | `bilty.wt`                         | In kg                                |
| `packages`         | int     | `bilty.no_of_pkg`                  |                                      |
| `consignor`        | string  | `bilty.consignor_name`             |                                      |
| `consignee`        | string  | `bilty.consignee_name`             |                                      |
| `kaat_rate`        | float   | `bilty_wise_kaat.actual_kaat_rate` |                                      |
| `e_way_bill`       | string  | `bilty.e_way_bill`                 |                                      |
| `destination`      | string  | `cities.city_name`                 |                                      |
| `destination_code` | string  | `cities.city_code`                 |                                      |
| `payment_mode`     | string  | `bilty.payment_mode`               | `to-pay` / `paid` / `tbb`            |
| `delivery_type`    | string  | `bilty.delivery_type`              | `godown` / `door`                    |
| `pohonch_bilty`    | string  | Input                              | Internal bilty reference             |
| `is_paid`          | boolean | computed                           | `true` when payment_mode = paid      |

### Pohonch-level totals

| Field            | Description                               |
|------------------|-------------------------------------------|
| `total_bilties`  | Count of GRs                              |
| `total_amount`   | Sum of all `amount`                       |
| `total_kaat`     | Sum of all `kaat`                         |
| `total_pf`       | Sum of all `pf` (= total_amount - total_kaat) |
| `total_dd`       | Sum of all `dd`                           |
| `total_weight`   | Sum of all `weight`                       |
| `total_packages` | Sum of all `packages`                     |

---

## Prefix Auto-Derivation

If `pohonch_prefix` is not provided, the prefix is derived from transport name initials, skipping common words:

**Skipped:** `TRANSPORT, CARRIER, ROADLINES, ROADWAYS, LOGISTICS, PVT, LTD, CO, CORP, CORPORATION, EXPRESS, SERVICE, SERVICES, AGENCY, NEW, AND, THE`

| Transport Name                        | Derived Prefix |
|---------------------------------------|----------------|
| NEW INDIA EXPRESS TRANSPORT CO.       | `NIE`          |
| VISHWANATH EXPRESS TRANSPORT          | `VET`          |
| KANPUR PRATABGARH TRANSPORT COMPANY   | `KPC`          |
| SARAN ROADWAYS COMPANY                | `SR`           |
| JAI MAA SHARDA TRANSPORT              | `JMS`          |

Sequence is zero-padded 4 digits: `NIE0001`, `NIE0002`, …

---

## Frontend Flow — Step by Step

### Creating a Pohonch

```
1. User selects transport party (name + GSTIN)
2. User selects challan number(s)
3. User enters GR numbers (manually or scanned)
4. POST /api/pohonch/create
5. Display pohonch summary from response.data.bilty_metadata
```

### Adding Bilties to an Existing Pohonch

```
1. User opens pohonch (GET /api/pohonch/number/NIE0001)
2. User scans/enters new GR numbers
3. PATCH /api/pohonch/{id}/edit  { "add_gr_items": [{gr_no, challan_no}] }
4. Refresh UI from response.data
```

### Removing a Bilty

```
1. User clicks Remove on a GR row
2. PATCH /api/pohonch/{id}/edit  { "remove_gr_nos": ["22789"] }
3. Refresh UI from response.data
```

### Renaming Pohonch Number

```
1. User edits pohonch number input field
2. PATCH /api/pohonch/{id}/edit  { "new_pohonch_number": "NIE0005" }
3. 409 if taken, 200 on success — update displayed number
```

### Signing

```
1. User reviews and clicks Sign
2. POST /api/pohonch/{id}/sign  { "user_id": "..." }
3. Show lock icon after sign; disable edit button
4. To unlock: POST /api/pohonch/{id}/unsign
```

---

## Example JS Code

```js
const BASE = 'http://localhost:5000';
const headers = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

// Create
async function createPohonch(token, payload) {
  const res = await fetch(`${BASE}/api/pohonch/create`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(payload),
  });
  return res.json();
}

// Edit — add GRs
async function addGrsToPohonch(token, pohonchId, grItems, userId) {
  const res = await fetch(`${BASE}/api/pohonch/${pohonchId}/edit`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ add_gr_items: grItems, user_id: userId }),
  });
  return res.json();
}

// Edit — remove GRs
async function removeGrsFromPohonch(token, pohonchId, grNos, userId) {
  const res = await fetch(`${BASE}/api/pohonch/${pohonchId}/edit`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ remove_gr_nos: grNos, user_id: userId }),
  });
  return res.json();
}

// Edit — rename
async function renamePohonch(token, pohonchId, newNumber, userId) {
  const res = await fetch(`${BASE}/api/pohonch/${pohonchId}/edit`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ new_pohonch_number: newNumber, user_id: userId }),
  });
  return res.json();
}

// List
async function listPohonch(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/api/pohonch/list?${qs}`, { headers: headers(token) });
  return res.json();
}

// Get by number
async function getPohonchByNumber(token, number) {
  const res = await fetch(`${BASE}/api/pohonch/number/${number}`, { headers: headers(token) });
  return res.json();
}

// Delete (hard)
async function deletePohonch(token, pohonchId) {
  const res = await fetch(`${BASE}/api/pohonch/${pohonchId}`, {
    method: 'DELETE', headers: headers(token),
  });
  return res.json();
}

// Sign
async function signPohonch(token, pohonchId, userId) {
  const res = await fetch(`${BASE}/api/pohonch/${pohonchId}/sign`, {
    method: 'POST', headers: headers(token), body: JSON.stringify({ user_id: userId }),
  });
  return res.json();
}
```
