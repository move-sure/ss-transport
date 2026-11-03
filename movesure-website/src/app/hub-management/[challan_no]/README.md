# Hub challan details page — how data is loaded

> **Update:** the page now loads through the hub API first:
> `GET https://api.movesure.io/api/hub/challan/{challan_no}?include_masters=true` (one call: challan, bilties,
> kaat, pohonch map, POD GRs, Kanpur GRs, masters). Refreshes use `/api/hub/kaat?gr_nos=`,
> `/api/hub/pohonch/by-gr?gr_nos=`, and `/api/hub/masters?refresh=true` after adding a transport / hub rate.
> If the API route is missing (404 `Not Found`) or unreachable, the page falls back to the Supabase reads
> described below (`fetchChallanDetailsLegacy`). Writes are unchanged.

Page: `src/app/hub-management/[challan_no]/page.js` (route `/hub-management/<challan_no>`)

**No REST API (`api.movesure.io`) is used to load the challan.** Everything is read straight from
**Supabase** with the JS client (`src/app/utils/supabase.js`, anon key), inside `fetchChallanDetails()`
(~line 172). It runs on page load whenever `user.id` or `challan_no` changes.

`challan_no` comes from the URL and is decoded with `decodeURIComponent`.

---

## Step 1: master data + the challan (5 queries in parallel)

| # | Table | Columns | Filter | Used for |
|---|-------|---------|--------|----------|
| 1 | `branches` | `id, branch_name` | `is_active = true` | branch id → name map (challan branch, from/to branch of each bilty) |
| 2 | `cities` | `id, city_name, city_code` | order `city_name` | city id / code → name (destination) |
| 3 | `challan_details` | see below | `challan_no = <url>` `.single()` | the challan header |
| 4 | `transports` | `id, transport_name, city_id, city_name, mob_number, gst_number, is_prior` | order `is_prior desc`, `transport_name` | transports grouped by city (kaat / transport pickers) |
| 5 | `transport_hub_rates` | `*` | `is_active = true` | rates map `transport_id → destination_city_id → [rates]` |

`challan_details` select (with joins):

```
id, challan_no, branch_id, truck_id, owner_id, driver_id, date,
total_bilty_count, remarks, is_active, is_dispatched, dispatch_date,
is_received_at_hub, received_at_hub_timing, received_by_user,
created_by, created_at, updated_at,
truck:trucks(id, truck_number, truck_type),
owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
driver:staff!challan_details_driver_id_fkey(id, name, mobile_number)
```

If the challan query errors (not found), the page shows "Failed to load challan details."
`branch_name` is added to the challan from the branches map.

## Step 2: bilties on the challan

`transit_details`, filter `challan_no = <url>`, ordered by `created_at asc` (the bilty order on the page):

```
id, challan_no, gr_no, bilty_id, challan_book_id, from_branch_id, to_branch_id,
is_out_of_delivery_from_branch1, out_of_delivery_from_branch1_date,
is_delivered_at_branch2, delivered_at_branch2_date,
is_out_of_delivery_from_branch2, out_of_delivery_from_branch2_date,
is_delivered_at_destination, delivered_at_destination_date,
out_for_door_delivery, out_for_door_delivery_date,
delivery_agent_name, delivery_agent_phone, vehicle_number, remarks, created_at
```

If there are no rows, the page stops here with an empty list.

## Step 3: bilty details for those GR numbers (2 queries in parallel)

`grNos` = every `gr_no` from step 2.

**a) `bilty`** (regular/computer bilties): `gr_no IN grNos`, `is_active = true`

```
id, gr_no, bilty_date, consignor_name, consignee_name, payment_mode,
no_of_pkg, total, to_city_id, wt, rate, freight_amount, contain,
e_way_bill, pvt_marks, consignor_number, consignee_number, consignor_gst,
transport_name, delivery_type, invoice_no, invoice_value,
labour_charge, bill_charge, toll_charge, dd_charge, other_charge, remark, bilty_image
```

**b) `station_bilty_summary`** (manual/station bilties): `gr_no IN grNos`

```
id, station, gr_no, consignor, consignee, contents, no_of_packets,
weight, payment_status, amount, pvt_marks, e_way_bill, delivery_type,
created_at, w_name, transport_name, transport_gst, bilty_image
```

### Merge (one row per transit_details row)

Each transit row is matched by `gr_no`. Priority: `bilty` → `station_bilty_summary` → `unknown`.

| Page field | from `bilty` | from `station_bilty_summary` |
|---|---|---|
| `source` | `'bilty'` | `'station_bilty_summary'` |
| consignor / consignee | `consignor_name` / `consignee_name` | `consignor` / `consignee` |
| destination | `cities[to_city_id].city_name` | city with `city_code = station` (else `station`) |
| destination_code | city_code | `station` |
| packets | `no_of_pkg` | `no_of_packets` |
| weight | `wt` | `weight` |
| amount | `total` | `amount` |
| payment | `payment_mode` | `payment_status` |
| contain | `contain` | `contents` |
| bilty_date | `bilty_date` | `created_at` |
| freight_amount | `freight_amount` | `amount` |
| labour_charge | `labour_charge` | 0 |
| phones / consignor_gst | from bilty | empty |
| w_name | — | `w_name` |
| remark | `remark` or transit `remarks` | transit `remarks` |

Plus `idx` (1-based position), `from_branch_name`, `to_branch_name`, and all `transit_details` columns.

## Step 4: extra data, loaded in the background (not awaited)

| Function | Table / query | Result |
|---|---|---|
| `fetchKaatData(grNos)` | `bilty_wise_kaat` `select *` where `gr_no IN grNos` | `kaatData` map `gr_no → kaat row` (transport, rate, kaat, pohonch_no, …) |
| `fetchKanpurBilties(grNos, cities)` | cities whose name has "kanpur" → `station_bilty_summary.gr_no` where `station IN kanpurCodes`, and `bilty.gr_no` where `to_city_id IN kanpurIds`, `is_active = true` | `kanpurGrNos` set (Kanpur bilties) |
| `fetchCrossChallanData(grNos)` | `pohonch` `select pohonch_number, bilty_metadata` where `is_active = true` (**all** active pohonch, filtered in the browser) | `crossChallanMap` `gr_no → pohonch_number` |
| inline | `pod_details` `select gr_no` where `gr_no IN grNos` | `podGrNos` set (bilties that already have a POD) |

---

## Query count per page load

5 (step 1) + 1 (step 2) + 2 (step 3) + 4–5 (step 4) = **about 12–13 Supabase requests**.

## Notes / possible improvements

- `fetchCrossChallanData` downloads **every active pohonch** with its full `bilty_metadata`. This gets
  slower as pohonch grows. A server-side filter would be better, e.g. a JSONB containment query or an
  RPC/API `GET /pohonch/by-gr?gr_nos=...`.
- `transports` and `transport_hub_rates` are fetched in full on every load (same on every challan). They could be cached.
- `.in('gr_no', grNos)` with very large challans can hit URL length limits. Batching (e.g. 200 GRs) would be safer.
- Everything goes through the anon key + RLS. There is no backend API for this page, so moving it to
  `api.movesure.io` would mean adding a single endpoint like `GET /api/hub/challan/{challan_no}` that
  returns `{ challan, bilties[], kaat, pohonch_map, pod_gr_nos, kanpur_gr_nos }`.

## Writes on this page (for reference, not part of loading)

- `transit_details` update: delivery / out-for-delivery flags (single row, bulk via RPC `bulk_update_transit_status`)
- `challan_details` update: `is_received_at_hub`, `received_at_hub_timing`, `received_by_user`
- `bilty_wise_kaat` upsert (`onConflict: gr_no`): transport assign, rates, kaat
- `pohonch` insert: cross challan from hub
- `transports` / `transport_hub_rates` insert: add transport / hub rate modals
- `pod_details` insert/update: POD
- External: WhatsApp template call to `adminapis.backendprod.com` (sent after "Received at hub" auto-assigns transports)
