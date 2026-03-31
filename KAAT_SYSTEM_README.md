# Kaat System — How It Works

## Tables Used

### 1. `transport_hub_rates` — Kaat Rate Master
Stores the **rate per transport per destination city**. This is the master rate table.

| Column | Description |
|--------|-------------|
| `id` | UUID primary key |
| `transport_id` | FK → `transports.id` (which transport company) |
| `transport_name` | Transport company name |
| `destination_city_id` | FK → `cities.id` (which city this rate applies to) |
| `pricing_mode` | `per_kg`, `per_pkg`, or `hybrid` |
| `rate_per_kg` | Rate per KG (used when pricing_mode = per_kg) |
| `rate_per_pkg` | Rate per package (used when pricing_mode = per_pkg) |
| `min_charge` | Minimum charge per bilty |
| `bilty_chrg` | Extra bilty charge per bilty |
| `ewb_chrg` | E-way bill charge per bilty |
| `labour_chrg` | Labour charge per bilty |
| `other_chrg` | Other charge per bilty |
| `is_active` | Whether this rate is active |

**How to add a rate:** Hub Management page → click "Add Hub Rate" button → select transport, destination city, enter rates → save.

---

### 2. `bilty_wise_kaat` — Kaat Per Bilty (GR)
Stores the **calculated kaat for each bilty/GR number**. One row per GR.

| Column | Description |
|--------|-------------|
| `gr_no` | **Unique key** — GR number of the bilty |
| `challan_no` | Which challan this bilty belongs to |
| `destination_city_id` | Destination city |
| `transport_hub_rate_id` | FK → `transport_hub_rates.id` (which rate was used) |
| `transport_id` | FK → `transports.id` (optional, user-chosen transport) |
| `rate_type` | `per_kg` / `per_pkg` / `hybrid` |
| `rate_per_kg` | Rate that was applied |
| `rate_per_pkg` | Rate that was applied |
| `actual_kaat_rate` | Effective rate (adjusted for 50kg min rule) |
| `kaat` | **Kaat amount** = (rate × weight) + dd_chrg |
| `pf` | **Profit** = bilty amount − kaat |
| `dd_chrg` | Door delivery charge (added into kaat) |
| `bilty_chrg` | Bilty charge |
| `ewb_chrg` | EWB charge |
| `labour_chrg` | Labour charge |
| `other_chrg` | Other charge |
| `pohonch_no` | Pohonch number (if assigned) |
| `bilty_number` | Bilty number (if assigned) |

---

### 3. `transports` — Transport Companies
Stores transport company info: name, city, mobile, GST etc.

### 4. `pohonch` — Pohonch (Crossing Challan)
Groups multiple bilties under one pohonch for a transport company.

---

## How Kaat Is Calculated

### Formula
```
kaat = (actual_rate × weight) + dd_chrg
pf   = bilty_amount − kaat
```

### 50kg Minimum Weight Rule
If bilty weight < 50 kg, the system uses 50 kg as minimum:
```
effective_weight = MAX(weight, 50)
kaat = actual_rate × effective_weight + dd_chrg
```

### For PAID / Door Delivery Bilties
Amount is treated as **0** (since customer already paid), so:
```
pf = 0 − kaat = negative kaat
```

---

## How Kaat Rate Is Fetched

1. System looks at the bilty's **destination city** (`to_city_id`)
2. Queries `transport_hub_rates` WHERE `destination_city_id` matches AND `is_active = true`
3. If bilty has a `transport_name`, tries to **match** it with a rate's transport name
4. If no match, uses the **first available rate** for that city
5. Applies the rate based on `pricing_mode` (per_kg / per_pkg / hybrid)

---

## Two Ways to Apply Kaat

### 1. Auto Kaat (Bulk — one click)
**Button:** "Auto Kaat" on Hub Management challan page

- Fetches ALL active rates from `transport_hub_rates` for all destination cities in the challan
- For each bilty: finds matching rate → calculates kaat → builds upsert payload
- Bulk upserts into `bilty_wise_kaat` (batches of 100, `onConflict: 'gr_no'`)
- Updates the UI state immediately

### 2. Manual Kaat (Per bilty — modal)
**Action:** Click on kaat column for any bilty row

- Opens Kaat Modal with all fields
- User can change **Actual Rate** → kaat & pf auto-calculate
- User can change **DD Chrg** → gets added to kaat, pf recalculates
- User can select transport → loads kaat rate card → click "Apply Kaat Rate"
- Click Save → upserts single row into `bilty_wise_kaat`

---

## How to Add a New Kaat Rate

1. Go to **Hub Management** → open any challan
2. Click on kaat column for a bilty → Kaat Modal opens
3. Select a **Transport** from dropdown
4. If no rate exists, you'll see "No Kaat Rate Found" warning → click **"Add Kaat Rate"**
5. Fill: pricing mode, rate/kg, rate/pkg, min charge, extra charges
6. Save → rate is stored in `transport_hub_rates`
7. Now "Auto Kaat" and manual kaat will use this rate

---

## Data Flow Summary

```
transports (company info)
    ↓
transport_hub_rates (rate per transport + city)
    ↓
bilty_wise_kaat (calculated kaat per GR number)
    ↓
pohonch (groups bilties for a transport's crossing challan)
```

**Pages using this:**
- `/hub-management/[challan_no]` — Auto Kaat button + manual kaat modal
- `/transit-finance/[challan_no]` — Auto Kaat All + Save Kaat Bill
