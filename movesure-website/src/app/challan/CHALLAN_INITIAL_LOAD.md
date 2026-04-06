# Challan Page — Initial Load Breakdown

What exactly happens when the challan page loads for the first time.

---

## 2 Sequential API Requests

```
Request 1 → GET /api/challan/init?branch_id=X                  (everything in 1 RPC)
Request 2 → GET /api/challan/transit/bilties/{challan_no}       (transit bilties for auto-selected challan)
```

---

## Request 1: `GET /api/challan/init?branch_id={user.branch_id}`

**Single Supabase RPC call** (`get_challan_page_init`) — returns 7 datasets in 1 DB round-trip.

| Data | Filter | Stored In | Used By |
|------|--------|-----------|---------|
| `user_branch` | `id = branch_id` | `userBranch` | TransitHeader, PDF header |
| `branches` | All (no filter) | `branches` | ChallanSelector (branch names), BiltyList (branch filter) |
| `cities` | All (no filter) | `cities` | BiltyList (city filter) |
| `permanent_details` | All (company details) | `permanentDetails` | ChallanPDFPreview (company name, logo, address) |
| `challan_books` | `is_active=true`, `is_completed=false`, `branch_1/2/3 = branch_id` | `challanBooks` | ChallanSelector book dropdown — **only books assigned to user's branch** |
| `challans` | `branch_id`, `is_active=true`, ALL (no limit), non-dispatched first | `challans` | ChallanSelector dropdown (Active + Dispatched sections) |
| `available_regular` | `branch_id`, `is_active=true`, not CANCEL, NOT IN transit_details | `bilties` | BiltyList "Available" tab (Reg section) |
| `available_station` | `branch_id`, NOT IN transit_details, NOT IN bilty (dedup) | `stationBilties` | BiltyList "Available" tab (Mnl section) |

Challans include resolved names via SQL JOINs: `truck_number`, `driver_name`, `owner_name`, `created_by`.

---

## Request 2: `GET /api/challan/transit/bilties/{challan_no}`

Fetches bilties loaded into the **auto-selected challan**.

| Data | Filter | Stored In | Used By |
|------|--------|-----------|---------|
| Transit bilties | `challan_no` match | `transitBilties` | BiltyList "Transit" tab, ChallanSelector bilty counts |

Each row includes `bilty_type` (`"reg"` / `"mnl"`), `transit_id`, `source_table`, and enriched bilty details.

---

## After Load — Auto-Selection

| What | Logic |
|------|-------|
| **Challan** | First active (non-dispatched) challan. If none → first dispatched challan. |
| **Challan Book** | First available book (already branch-filtered by init). |

---

## Refresh Strategy

| Action | What happens |
|--------|-------------|
| Add/Remove bilties | Re-call `/api/challan/init` (refreshes challans + available bilties) + `/transit/bilties/{no}` |
| Select different challan | Only `/transit/bilties/{new_challan_no}` (init data unchanged) |
| Manual refresh button | Re-call `/api/challan/init` + `/transit/bilties/{no}` |

---

## What's Branch-Filtered vs Global

| Branch-Filtered (`user.branch_id`) | Global (all rows) |
|-------------------------------------|-------------------|
| `challan_books` — `branch_1/2/3 = branch_id` | `branches` — all branches |
| `challans` — `branch_id` match | `cities` — all cities |
| `available_regular` — `branch_id` match | `permanent_details` — company info |
| `available_station` — `branch_id` match | |
| `user_branch` — user's own branch | |

---

## Summary

```
┌────────────────────────────────────────────────────────────────┐
│  CHALLAN PAGE INITIAL LOAD (2 requests)                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Request 1: GET /api/challan/init  (1 RPC = 7 datasets)       │
│  ├─ user_branch          (branch-filtered)                     │
│  ├─ branches             (global)                              │
│  ├─ cities               (global)                              │
│  ├─ permanent_details    (global)                              │
│  ├─ challan_books        (branch-filtered: branch_1/2/3)      │
│  ├─ challans             (branch-filtered, ALL, no limit)      │
│  ├─ available_regular    (branch-filtered, not in transit)     │
│  └─ available_station    (branch-filtered, not in transit)     │
│                                                                │
│  Request 2: GET /api/challan/transit/bilties/{challan_no}      │
│  └─ transit bilties      (for auto-selected challan)           │
│                                                                │
│  Auto-select: first active challan + first challan book        │
└────────────────────────────────────────────────────────────────┘
```
