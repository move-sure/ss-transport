# Accounts: Backend Changes Needed

**For:** whoever changes the `api.movesure.io` ledger backend.
**Goal:** make ledgers easy to create and maintain, let users **edit** a wrong transaction, and show everything as **Dr / Cr**.

Every endpoint here lives under `https://api.movesure.io/api/ledger`. The frontend client is in
`src/components/hub-management/accounts/api.js`.

---

## 1. What the frontend does today (already shipped)

| Need | How it works now | Backend used |
|---|---|---|
| **Dr / Cr labels** | Every "Money In / Money Out / They owe / You owe" label now reads **Dr / Cr** (`helpers.js`). | none (labels only) |
| **Fix a wrong transaction** | An **Edit / Cancel** button on every row of a party's History (Transport PF, Truck Bhada, Labour), on every ledger Statement row, and on the voucher page. **Correct** edits in place via `PUT /vouchers/{id}` (done, migration 023), bills included. **Cancel** cancels it with a reason. | `PUT /vouchers/{id}`, `POST /vouchers/{id}/cancel` |
| **Maintain a ledger** | An **Add Entry (Dr/Cr)** button on the ledger page. It posts a two-line voucher: this ledger Dr or Cr, another ledger the opposite side. | `POST /vouchers` |
| **Create a ledger** | The New Ledger form now has a **Branch** dropdown. Before, `branch_id` could be empty when "All Branches" was selected, and the API rejected it with `name, branch_id, group_id and created_by are required`. | `POST /ledgers` |

**Party Ledgers** (migration 024) are wired to every `/party-ledgers` endpoint: list, create (party / custom), bilties, add / remove, bilty search, sync in batches, collect with allocations, and profile. The manual bilty form calls `auto-add` after saving.

### Limits of the old workaround (fixed by `PUT /vouchers/{id}`, kept for history)
1. **An edit is two calls, not one.** If the second call (cancel) fails, the user has two live vouchers and must cancel one by hand. The UI warns them, but an atomic edit is safer.
2. **Bills can't be edited**, only cancelled and raised again. Re-posting a voucher whose entry is `bill_allocation_type: 'new_ref'` would create a second bill reference.
3. **Voucher numbers change on every edit** (PAY0007 becomes PAY0012). The Day Book shows both, which is correct for audit but confusing for users.
4. **Not confirmed:** whether `POST /vouchers` accepts `bill_reference_id` and `bill_allocation_type` inside `entries`. The Correct flow sends them for payments applied against a bill. If the API ignores them, a corrected payment loses its link to the bill. **Please confirm or add support.**

---

## 2. Requested endpoints

### 2.1 Edit a voucher (most important)
`PUT /vouchers/{id}`

```json
{
  "voucher_date": "2026-10-18",
  "narration": "PF collected - corrected amount",
  "reference_no": "AUG-2026-RT",
  "entries": [
    { "id": "<existing entry id>", "ledger_id": "…", "entry_type": "dr", "amount": 40000,
      "bill_reference_id": "…", "bill_allocation_type": "against_ref" },
    { "id": "<existing entry id>", "ledger_id": "…", "entry_type": "cr", "amount": 40000 }
  ],
  "updated_by": "<user uuid>",
  "edit_reason": "Wrong amount"
}
```

Send only what changed: leave out `entries` to change just the date or narration. An entry without an `id` is new; an existing entry left out of the list is removed.

**Rules:**
- Reject if the voucher is cancelled: `400 "Cancelled voucher can't be edited"`.
- Dr total must equal Cr total. Reuse the existing `"Voucher is not balanced"` check.
- **Keep the same `voucher_no` and `id`.**
- Recalculate every affected bill:
  - `against_ref` amount changed: the bill's outstanding amount and `is_settled` change.
  - `new_ref` amount changed: the bill's original amount changes. Reject if the new amount is less than what has already been paid against it: `400 "Bill already has ₹X paid against it"`.
- Write an `audit_log` row with `action: 'update'` and old/new JSON, including `edit_reason`.
- Response: the full voucher (same shape as `GET /vouchers/{id}`, with `entries` and `ledger_name`).

> Once this exists, tell me. `EditVoucherModal.js` will switch from "post copy + cancel" to one `PUT`, and bills become editable too.

### 2.2 Simple edit for the party screens (nice to have)
The party screens think in terms of "payment of ₹X by cash/bank against bill Y", not voucher rows. One endpoint per screen that takes the same body as the create call would keep the UI simple:

| Screen | Create (exists) | Edit (new) |
|---|---|---|
| Transport PF: bill | `POST /transporters/{id}/pf-bill` | `PUT /transporters/{id}/pf-bill/{voucher_id}` |
| Transport PF: payable bill | `POST /transporters/{id}/payable-bill` | `PUT /transporters/{id}/payable-bill/{voucher_id}` |
| Transport PF: collect | `POST /transporters/{id}/collect` | `PUT /transporters/{id}/collect/{voucher_id}` |
| Transport PF: give | `POST /transporters/{id}/give` | `PUT /transporters/{id}/give/{voucher_id}` |
| Truck Bhada | `POST /drivers/{id}/bhada`, `/pay` | `PUT /drivers/{id}/bhada/{voucher_id}`, `/pay/{voucher_id}` |
| Labour | `POST /labour/{id}/expense`, `/pay` | `PUT /labour/{id}/expense/{voucher_id}`, `/pay/{voucher_id}` |

Each one builds new entries from the body (amount, `payment_mode`, `bank_ledger_id`, `bill_reference_id`, date, narration) and applies them through the same logic as 2.1.

Also return the **original create body** on each History row (`statement[].source`), so the UI can pre-fill the same form it used to create the entry:
```json
{ "voucher_id": "…", "source": { "action": "collect", "amount": 40000, "payment_mode": "bank",
  "bank_ledger_id": "…", "bill_reference_id": "…", "voucher_date": "2026-10-10", "narration": "…" } }
```

### 2.3 Cancel: confirm the cascade
`POST /vouchers/{id}/cancel` already exists. Please confirm, or make it do, the following:
- Cancelling a **bill** voucher (`new_ref`) marks that bill reference inactive, so it disappears from Outstanding bills.
  - If payments are already applied to the bill, either reject (`400 "Cancel the payments against this bill first"`) or unlink them. Pick one and tell me.
- Cancelling a **payment** (`against_ref`) gives the amount back to the bill's outstanding amount and clears `is_settled`.
- Party balance, the ledger `/balance` endpoint, Cash Manager and statements must all exclude cancelled vouchers. (They seem to already; please confirm.)

### 2.4 Ledger entry shortcut (optional)
The frontend already uses `POST /vouchers` for "Add Entry". A dedicated endpoint would let the backend own the validation:

`POST /ledgers/{id}/entries`
```json
{ "side": "dr", "amount": 5000, "against_ledger_id": "…", "voucher_type": "journal",
  "voucher_date": "2026-10-18", "narration": "Bank interest", "created_by": "<user uuid>" }
```
- Infer `voucher_type` when it's left out: the other ledger is Cash/Bank and this side is Cr → `receipt`; Dr → `payment`; both Cash/Bank → `contra`; otherwise `journal`.
- Reject when `against_ledger_id == id`, or when the two ledgers are in different branches.

### 2.5 Edit a bill reference
`PUT /bills/{id}`, with `{ "reference_no": "…", "due_date": "…", "updated_by": "…" }`.
Fixing a typo in a bill reference shouldn't need cancelling the bill.
- Check for duplicates: reject if the same `reference_no` already exists on the same ledger (`409`).

### 2.6 Bills by direction
On the Transport PF screen, the Collect and Give dropdowns show **all** open bills, including ones going the wrong way. The UI currently warns about this in the subtitle.
- Add `direction: "receivable" | "payable"` to each bill (receivable = `new_ref` on the Dr side, payable = Cr side).
- Accept `GET /bills?ledger_id=…&direction=receivable` (and `…=payable`) as a filter.

---

## 3. Dr / Cr in API responses

The UI now shows Dr/Cr everywhere, but some responses still carry the old plain-English text:

| Field | Now | Wanted |
|---|---|---|
| `balance.balance_label` (party detail) | `"You owe them"` / `"Owes you"` | `"Cr"` / `"Dr"`, or drop it; the UI uses `balance_type` |
| `summary.totals.total_you_owe_them` | name only | fine to keep. Optionally add `total_dr` / `total_cr` |

Keep `entry_type`, `balance_type`, `running_balance_type` and `opening_balance_type` as lowercase `"dr"` / `"cr"`. The UI depends on those.

**Sign convention** (please keep it consistent across all endpoints):
- **Dr balance** = asset / receivable / expense (the party owes us).
- **Cr balance** = liability / payable / income (we owe the party).

---

## 4. Ledger create / maintain checklist

| Item | Status |
|---|---|
| `POST /ledgers` needs `name, branch_id, group_id, created_by` | OK. The UI now always sends `branch_id` |
| Duplicate name in the same branch | **Please add:** `409 "Ledger 'X' already exists in this branch"` (case-insensitive) |
| `PUT /ledgers/{id}`: opening balance change | Confirm it recalculates `/balance` and statements |
| Deactivate a ledger that still has a balance | **Please add:** reject with the balance in the message, or require `force: true` |
| Merge duplicate ledgers | Optional: `POST /ledgers/{id}/merge { into_ledger_id }` moves the entries and deactivates the source |
| Error format | Keep `{ "status": "error", "message": "…" }`. The UI shows `message` directly to the user |

---

## 5. What I need back from you

When any of the above is deployed, send:
1. The endpoint, its method and an example request and response.
2. Any rule you chose differently (for example, how cancelling a bill that already has payments behaves).

I'll then update `api.js` and `EditVoucherModal.js`, and make bills editable.
