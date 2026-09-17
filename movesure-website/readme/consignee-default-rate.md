# Consignee Default Rates — Frontend Integration Guide

This mirrors the existing **consignor rates** feature, but for consignees.
Backend files:
- `migrations/008_consignee_bilty_profile.sql` — new table
- `services/bilty/consignee_rates_service.py` — logic
- `app.py` — 4 new endpoints (below)

Base URL: `${API_URL}` = your backend base, e.g. `http://localhost:5000`.

---

## 1. `GET /api/bilty/rates/consignee/{consignee_id}` — Consignee Rate Profiles

Fetch all active rates from `consignee_bilty_profile` for a specific consignee.
Returns destination-wise rate, labour, DD charges, transport info, etc.

**Path Parameter:**
| Param | Required | Description |
|-------|----------|-------------|
| `consignee_id` | Yes | Consignee UUID |

**Example Request:**
```js
const res = await fetch(`${API_URL}/api/bilty/rates/consignee/${consigneeId}`);
const { data } = await res.json();
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "rates": [
      {
        "id": "uuid",
        "consignee_id": "uuid",
        "destination_station_id": "city-uuid",
        "city_code": "AZM",
        "city_name": "AZAMGARH",
        "transport_name": "NEW INDIA EXPRESS TRANSPORT CO.",
        "transport_gst": "09AABFN1234A1Z1",
        "rate": 3.0,
        "rate_unit": "PER_KG",
        "minimum_weight_kg": 0,
        "labour_rate": 6.0,
        "labour_unit": "PER_KG",
        "dd_charge_per_kg": 0,
        "dd_charge_per_nag": 0,
        "receiving_slip_charge": 0,
        "bilty_charge": 0,
        "is_no_charge": false,
        "effective_from": "2025-01-01",
        "effective_to": null,
        "is_active": true,
        "dd_print_charge_per_kg": null,
        "dd_print_charge_per_nag": null,
        "is_toll_tax_applicable": false,
        "toll_tax_amount": 0,
        "freight_minimum_amount": 0,
        "local_charge_per_nag": 0
      }
    ],
    "rates_by_city": {
      "city-uuid-1": [ { "...rate object..." } ],
      "city-uuid-2": [ { "...rate object..." } ]
    },
    "count": 33
  }
}
```

**Frontend usage — auto-fill rate when consignee + city selected:**
```js
// Load when consignee changes
async function onConsigneeChange(consigneeId) {
  const res = await fetch(`${API_URL}/api/bilty/rates/consignee/${consigneeId}`);
  const { data } = await res.json();
  consigneeRatesRef.current = data.rates_by_city;
}

// When city is selected, look up rate instantly from cache
function onToCityChange(cityId) {
  const cityRates = consigneeRatesRef.current[cityId];
  if (cityRates && cityRates.length > 0) {
    const r = cityRates[0];
    setFormData(prev => ({
      ...prev,
      rate: r.rate,
      labour_rate: r.labour_rate,
      transport_name: r.transport_name || prev.transport_name,
      transport_gst: r.transport_gst || prev.transport_gst,
      dd_charge: r.rate_unit === 'PER_KG'
        ? (r.dd_charge_per_kg * prev.wt)
        : (r.dd_charge_per_nag * prev.no_of_pkg),
      bill_charge: r.bilty_charge,
      toll_charge: r.is_toll_tax_applicable ? r.toll_tax_amount : 0,
    }));
  }
}
```

---

## 2. `GET /api/bilty/rates/default/consignee` — Default Branch Rates

Fetch default city-wise rates for a branch from the `rates` table.
Used as fallback when no `consignee_bilty_profile` exists for a consignee+city.

**Query Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `branch_id` | Yes | Branch UUID |

**Example Request:**
```js
const res = await fetch(`${API_URL}/api/bilty/rates/default/consignee?branch_id=${branchId}`);
const { data } = await res.json();
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "rates": [
      { "id": "uuid", "branch_id": "uuid", "city_id": "uuid", "rate": 4.5, "is_default": true }
    ],
    "rate_by_city_id": {
      "city-uuid-1": 4.5,
      "city-uuid-2": 3.5,
      "city-uuid-3": 5.0
    },
    "count": 439
  }
}
```

> Note: this is the same `rates` table already used for consignor default
> rates — it isn't consignor/consignee-specific. If you already loaded it via
> `/api/bilty/rates/default`, you can reuse that response instead of calling
> this endpoint again.

---

## 3. `GET /api/bilty/rates/all/consignee` — Both Rates in One Call (Parallel)

Fetches **both** consignee-specific AND default branch rates in parallel.
Use this when you need both at once (e.g., when consignee changes).

**Query Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `consignee_id` | Yes | Consignee UUID |
| `branch_id` | Yes | Branch UUID |

**Example Request:**
```js
const res = await fetch(
  `${API_URL}/api/bilty/rates/all/consignee?consignee_id=${consigneeId}&branch_id=${branchId}`
);
const { data } = await res.json();
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "consignee_rates": [ { "...consignee_bilty_profile rows..." } ],
    "consignee_rates_by_city": {
      "city-uuid": [ { "...rate objects..." } ]
    },
    "default_rates": [ { "...rates table rows..." } ],
    "default_rate_by_city_id": {
      "city-uuid": 4.5
    }
  }
}
```

**Frontend usage — smart rate resolution:**
```js
async function onConsigneeChange(consigneeId) {
  const res = await fetch(
    `${API_URL}/api/bilty/rates/all/consignee?consignee_id=${consigneeId}&branch_id=${user.branch_id}`
  );
  const { data } = await res.json();

  consigneeRatesRef.current = data.consignee_rates_by_city;
  defaultRateByCity.current = data.default_rate_by_city_id;
}

function getSmartRate(cityId) {
  // Priority: consignee profile rate > default branch rate > 0
  const profile = consigneeRatesRef.current[cityId];
  if (profile && profile.length > 0) {
    return {
      rate: profile[0].rate,
      rate_unit: profile[0].rate_unit,
      labour_rate: profile[0].labour_rate,
      transport_name: profile[0].transport_name,
      source: 'consignee_profile'
    };
  }
  const defRate = defaultRateByCity.current[cityId];
  if (defRate) {
    return { rate: defRate, rate_unit: 'PER_KG', labour_rate: 0, transport_name: null, source: 'default' };
  }
  return { rate: 0, rate_unit: 'PER_KG', labour_rate: 0, transport_name: null, source: 'none' };
}
```

---

## 4. `GET /api/bilty/calculate/dd/consignee` — Door-Delivery Charge Calculator

Calculates the DD charge from the consignee's active profile for a destination city.

**Query Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `consignee_id` | Yes | Consignee UUID |
| `destination_city_id` | Yes | Destination city UUID (`destination_station_id`) |
| `weight` | Yes | Gross weight in kg |
| `no_of_pkg` | Yes | Number of packages (nag) |

**Logic:**
1. Look up active `consignee_bilty_profile` row for consignee + destination city.
2. If `dd_charge_per_kg > 0` → `dd = dd_charge_per_kg × weight`
   else if `dd_charge_per_nag > 0` → `dd = dd_charge_per_nag × no_of_pkg`
   else → `dd = 0`
3. Apply minimum of 150: `dd_charge = max(dd, 150)`

**Example Request:**
```js
const res = await fetch(
  `${API_URL}/api/bilty/calculate/dd/consignee?consignee_id=${consigneeId}&destination_city_id=${cityId}&weight=100&no_of_pkg=5`
);
const { data } = await res.json();
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "dd_charge": 150.0,
    "raw_calculated": 0.0,
    "basis": "minimum_no_profile",
    "per_kg_rate": 0.0,
    "per_nag_rate": 0.0,
    "profile_id": null
  }
}
```

---

## Combining Consignor + Consignee Rates in One Form

If your bilty form needs both consignor and consignee default rates side by
side, just call both endpoints in parallel:

```js
async function loadAllRates(consignorId, consigneeId, branchId) {
  const [consignorRes, consigneeRes] = await Promise.all([
    fetch(`${API_URL}/api/bilty/rates/all?consignor_id=${consignorId}&branch_id=${branchId}`),
    fetch(`${API_URL}/api/bilty/rates/all/consignee?consignee_id=${consigneeId}&branch_id=${branchId}`),
  ]);
  const consignorData = (await consignorRes.json()).data;
  const consigneeData = (await consigneeRes.json()).data;

  return { consignorData, consigneeData };
}
```

---

## Quick Test with cURL

**Consignee rates:**
```bash
curl "http://localhost:5000/api/bilty/rates/consignee/YOUR_CONSIGNEE_UUID"
```

**Default rates (consignee route):**
```bash
curl "http://localhost:5000/api/bilty/rates/default/consignee?branch_id=YOUR_BRANCH_UUID"
```

**Both rates (parallel):**
```bash
curl "http://localhost:5000/api/bilty/rates/all/consignee?consignee_id=YOUR_CONSIGNEE_UUID&branch_id=YOUR_BRANCH_UUID"
```

**DD charge calculator:**
```bash
curl "http://localhost:5000/api/bilty/calculate/dd/consignee?consignee_id=YOUR_CONSIGNEE_UUID&destination_city_id=YOUR_CITY_UUID&weight=100&no_of_pkg=5"
```

---

## Error Responses

All endpoints return errors in the same format:
```json
{
  "status": "error",
  "message": "Description of what went wrong"
}
```

| HTTP Code | Meaning |
|-----------|---------|
| 500 | Server error |

---

## Managing Consignee Rate Profiles (writing rows)

There is currently no dedicated "create/update consignee rate" endpoint —
mirror however you currently manage `consignor_bilty_profile` rows (direct
Supabase insert/update from the admin/rates UI) but target the
`consignee_bilty_profile` table instead, using these columns:

```js
await supabase.from('consignee_bilty_profile').upsert({
  consignee_id: consigneeId,
  destination_station_id: cityId,
  city_code: city.city_code,
  city_name: city.city_name,
  transport_name: transportName,
  transport_gst: transportGst,
  rate: rate,
  rate_unit: 'PER_KG', // or 'PER_NAG'
  labour_rate: labourRate,
  labour_unit: 'PER_KG', // 'PER_KG' | 'PER_NAG' | 'PER_BILTY'
  dd_charge_per_kg: ddPerKg,
  dd_charge_per_nag: ddPerNag,
  bilty_charge: biltyCharge,
  local_charge_per_nag: localChargePerNag, // new — flat local charge per package (nag)
  is_toll_tax_applicable: isTollApplicable,
  toll_tax_amount: tollAmount,
  is_active: true,
  created_by: userId,
});
```

---

## `local_charge_per_nag` (new field)

Both `consignor_bilty_profile` and `consignee_bilty_profile` now have a
`local_charge_per_nag numeric NOT NULL DEFAULT 0` column (see
`migrations/009_add_local_charge_per_nag.sql`). It's a flat local-delivery
charge applied per package (nag), independent of the DD charge fields.

It's already included in every rate-profile response above
(`GET /api/bilty/rates/consignee/{id}`, `/all/consignee`, and the mirrored
consignor endpoints) — no new endpoint was needed. To compute the total for
a bilty on the frontend:

```js
const localCharge = (profile.local_charge_per_nag || 0) * no_of_pkg;
```
