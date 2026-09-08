# Your Ledger System

The one and only ledger readme — every earlier one (Accounting, UI Guide,
Transporter Example, Transporter & Delivery UI, Full System, Business) has
been deleted and folded into this single file.


## ⚠️ Your live server is running old code — restart/redeploy it

Found this while testing just now: a real "Delivery Income" ledger got
created for DUBE-PARAO a few minutes ago under the **old** "Direct
Incomes" group, not the new shared "Delivery" group — proof that whatever
server your team is actually hitting hasn't picked up this session's
changes (branch-optional lists, the Delivery group, itemized Labour
Kharcha, Cash Manager's day view, all of it). I moved that one ledger into
the right group so it's not stranded, but **nothing new below will fully
work until the running process is restarted/redeployed** — I only edit
files on disk, never a live process.

## Branch selection — one selected branch, everywhere, plus an "All Branches" owner view

This is the real, permanent fix for the "my entry isn't showing" class of
bug from before (it was a branch mismatch: the add-form and the view
screen were reading `branch_id` from two different places). The fix is
architectural, not a patch — one source of truth for "which branch am I
looking at", used by every screen, all the time:

**New endpoint:**
```
GET /api/branches?is_active=true   → [{ id, branch_name, branch_code }, ...]
```

### ⚠️ If you already built this as a plain hook (no Context), that's the bug

A plain custom hook — `function useBranch() { const [branchId, setBranchId] = useState(...) }`
with no `React.createContext` — gives **every component that calls it its
own independent copy of that state.** Your header's branch dropdown and
your "Add Expense" form are two different components; each one calling a
plain `useBranch()` gets its own `branchId`, entirely disconnected from
the other. Selecting Kanpur in the header updates *that component's*
state (and localStorage) — but a form elsewhere that already mounted with
its own copy never finds out, and keeps using whatever it defaulted to
(commonly the logged-in user's own branch, if that's the fallback used
elsewhere in your app). **This is almost certainly why entries are saving
under the user's branch instead of the one you picked** — I checked the
entire backend line by line and confirmed `branch_id` is never touched,
defaulted, or substituted anywhere; every ledger endpoint saves exactly
whatever `branch_id` is in the request body it receives.

**The fix — wrap it in a real Context so state is genuinely shared:**
```jsx
// context/BranchContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const BranchContext = createContext(null);
const STORAGE_KEY = 'ledger.selectedBranchId'; // 'all' means "every branch" (owner only)

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(
    () => localStorage.getItem(STORAGE_KEY) || null
  );

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(res => {
      setBranches(res.data);
      if (!branchId && res.data.length) {
        setBranch(res.data[0].id); // default to the first branch if nothing saved yet
      }
    });
  }, []);

  function setBranch(id) {
    setBranchId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <BranchContext.Provider value={{ branches, branchId, setBranch, isAllBranches: branchId === 'all' }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch() must be used inside <BranchProvider>');
  return ctx;
}
```
**Mount `<BranchProvider>` exactly once, at the app root** (e.g. wrapping
your top-level layout or `_app.jsx`), above every page that needs it:
```jsx
<BranchProvider>
  <YourAppLayout>{children}</YourAppLayout>
</BranchProvider>
```
Now every component anywhere in the tree that calls `useBranch()` reads
and writes the **same** state — selecting Kanpur in the header
immediately re-renders every other component using `branchId`, including
your Add Expense form, with no stale copies possible. That's the whole
fix: one Provider, one shared state, read everywhere.

**Quick way to verify which case you're in:** open your browser's Network
tab, submit an "Add Expense" (or any create) while Kanpur is selected,
and look at the actual JSON request body sent to the API. If `branch_id`
in that request is NOT Kanpur's id
(`e47a517f-92b5-4a28-91b4-4e67916d172e`), that proves the form's
`branch_id` source is disconnected from the selector — confirming the
Context fix above is what you need.

**Owner's "All Branches" option:** add an `"All Branches"` entry at the
top of the dropdown (value `'all'`). When selected, **omit `branch_id`
from the API call entirely** rather than sending the string `"all"` — the
backend already treats a missing `branch_id` as "every branch", and tags
each row with `branch_name` so you can tell them apart:

```
GET /api/ledger/ledgers               → every branch's ledgers, each row has branch_id + branch_name
GET /api/ledger/overview              → same, grouped by category
GET /api/ledger/transporters          → same
GET /api/ledger/drivers               → same
GET /api/ledger/labour                → same
GET /api/ledger/vouchers (Day Book)   → same
```
**Verified live:** created one Cash ledger each for Kanpur and
DUBE-PARAO, called `list_ledgers()` with no `branch_id` — both came back
in one list, each correctly tagged (`branch_name: "KNP-BRANCH"` /
`"DUBE-PARAO"`). Called it again *with* `branch_id` — the tag correctly
disappears (every row obviously belongs to the one branch you asked for,
so the field would just be noise).

**Cash Manager, Kanpur Delivery, and Banks stay branch-required** — a
day's cash-box or delivery view genuinely only makes sense for one
physical branch at a time; there's no meaningful "combined" version of a
day's opening/closing balance across branches. Keep those screens on the
single-branch selector, everything else can offer "All Branches".

---

## Kanpur Delivery — hard-lock this ONE screen to the Kanpur branch

You said this screen should only ever be for Kanpur, regardless of
whatever branch is selected elsewhere in the app. Do this on the
frontend, not by changing the branch selector's value:

```js
// pages/accounts/delivery.jsx
const KANPUR_BRANCH_ID = 'e47a517f-92b5-4a28-91b4-4e67916d172e'; // KNP-BRANCH — real id, already in your DB

// Ignore useBranch()'s branchId entirely on this one page:
fetch(`/api/ledger/delivery?branch_id=${KANPUR_BRANCH_ID}&from_date=...&to_date=...`)
```
Every other screen keeps following the global selector; this one page
always sends the same hardcoded id no matter what. That's the entire fix
— the backend `/api/ledger/delivery` endpoint is already generic and
branch-parameterized, so no backend change is needed for this part, only
which `branch_id` your Kanpur Delivery component happens to send.

---

## The 8 screens (5 daily + 3 advanced)

Chart of Accounts, Ledger Statement, and the "Ledgers" browse screen are
**removed** — Ledger Master now covers all of that (create ledgers, click
one to see its balance + full history in the same place).

### Daily use

| Screen | What it's for |
|---|---|
| **Transport PF Collection** | Bill, collect from, or advance a transporter |
| **Kanpur Delivery** | Income & expense by GR number |
| **Cash Manager (Galla)** | Day-by-day view of everything that touched your cash box |
| **Truck Bhada** | What you owe each driver, per trip |
| **Labour Kharcha** | What you owe your loading labour, itemized per trip |

### Advanced (occasional use)

| Screen | What it's for |
|---|---|
| **Ledger Master** | Create banks, expense types, or any other ledger — click one to see its balance + full timestamped history |
| **Day Book** | Every voucher, from any screen, in one list |
| **Audit Log** | Who changed what, when |

### Replace your sidebar arrays with this

```js
const DAILY_OPTIONS = [
  { id: 'transporters', name: 'Transport PF Collection', icon: Truck, description: 'Bill, collect, or advance a transporter', path: '/hub-management/accounts/transporters' },
  { id: 'delivery', name: 'Kanpur Delivery', icon: Package, description: 'Income & expense by GR no.', path: '/hub-management/accounts/delivery' },
  { id: 'cash-register', name: 'Cash Manager (Galla)', icon: Wallet, description: 'Day-by-day view of everything that touched your cash box', path: '/hub-management/accounts/cash-register' },
  { id: 'drivers', name: 'Truck Bhada', icon: Truck, description: 'What you owe each driver, per trip', path: '/hub-management/accounts/drivers' },
  { id: 'labour', name: 'Labour Kharcha', icon: Users, description: 'What you owe your loading labour, itemized', path: '/hub-management/accounts/labour' },
];

const ADVANCED_OPTIONS = [
  { id: 'ledgers', name: 'Ledger Master', icon: BookUser, description: 'Create banks, expense types, etc. — click any ledger for its full history', path: '/hub-management/accounts/ledgers' },
  { id: 'vouchers', name: 'Day Book', icon: ScrollText, description: 'Every voucher, from any screen', path: '/hub-management/accounts/vouchers' },
  { id: 'audit-log', name: 'Audit Log', icon: History, description: 'Who changed what, when', path: '/hub-management/accounts/audit-log' },
];
```
`Network` and `BookOpenText` icon imports can go if nothing else in your
file uses them (Chart of Accounts and Ledger Statement are what used
them).

---

## Screen: Transport PF Collection

```
GET  /api/ledger/transporters?branch_id=              → list, with live balance
POST /api/ledger/transporters                          → { branch_id, name, gstin?, phone?, created_by }
GET  /api/ledger/transporters/{id}                     → balance + bills + full timestamped history, one call
POST /api/ledger/transporters/{id}/pf-bill             → { branch_id, amount, reference_no, due_date?, created_by }
POST /api/ledger/transporters/{id}/collect             → { branch_id, amount, payment_mode, bank_ledger_id?, bill_reference_id?, created_by }
POST /api/ledger/transporters/{id}/give                → { branch_id, amount, payment_mode, bank_ledger_id?, created_by }
```
"Collect" = money they paid you. "Give" = money you gave them (advance).
`payment_mode` is `"cash"` or `"bank"` — for bank, pass `bank_ledger_id`
(from `GET /api/ledger/banks`) or leave it out to use the default bank.

---

## Screen: Kanpur Delivery — now one page, income + expense together

### History of this screen's bugs (both fixed now)

1. **Branch mismatch** — an entry saved under the wrong branch because the
   frontend's "add" form and "view" screen weren't reading the same
   `branch_id`. Still worth checking your branch-selector wiring if
   something seems to vanish — this was never a backend issue.
2. **No GET at all** — the income/expense endpoints were POST-only, so
   "Today's entries" was just local browser state, gone on refresh.
3. **Income and expense lived in different places** — income always went
   to one "Delivery Income" ledger, but expense went to *whichever*
   expense ledger you picked each time (fuel, misc, ...), so there was no
   single place to read a combined list from.

**Fix for #3, which also finishes #2 properly:** Delivery now has its own
group — same pattern as Transporters/Drivers/Labour — holding exactly two
ledgers per branch: **Delivery Income** and **Delivery Expense**. Every
delivery expense now posts to that one canonical ledger automatically —
you no longer pick an expense ledger per entry. That makes a genuine
combined view possible.

### The one endpoint to build the page around

```
GET /api/ledger/delivery?branch_id=&from_date=&to_date=
```
Returns income and expense merged into one chronological, day-grouped
feed — verified live:
```json
{
  "data": {
    "period_total_income": 300, "period_total_expense": 60, "period_net": 240,
    "all_time_net": 240.0,
    "days": [
      {
        "date": "2026-09-05",
        "opening_net": 0.0, "closing_net": 240.0,
        "total_income": 300, "total_expense": 60, "net": 240,
        "entries": [
          { "time": "2026-09-05T05:58:56Z", "kind": "income",  "voucher_no": "REC0003", "amount": 300, "narration": "Delivery income - GR 5142" },
          { "time": "2026-09-05T19:56:02Z", "kind": "expense", "voucher_no": "PAY0004", "amount": 60,  "narration": "Delivery expense (Auto Rickshaw) - GR 5140" }
        ]
      }
    ]
  }
}
```
- `kind` is always `"income"` or `"expense"` — render income green/+,
  expense red/− in one list, exactly like a passbook.
- `opening_net`/`closing_net` are the running income-minus-expense total
  **within the date range you asked for** (starts at 0 at `from_date`).
- `all_time_net` is the true lifetime total (income ever earned minus
  expense ever spent for this branch), independent of the date filter —
  show this as the headline number, the day-by-day view as the detail below it.
- `from_date`/`to_date` default to **today** if omitted.

### Recording entries (unchanged shape, one simplification)

```
POST /api/ledger/delivery/income
{ branch_id, gr_no, amount, payment_mode, bank_ledger_id?, created_by }

POST /api/ledger/delivery/expense
{ branch_id, gr_no?, category? (free text, e.g. "Fuel", "Auto Rickshaw" — just
  shown in the narration, no ledger to pick anymore), amount, payment_mode,
  bank_ledger_id?, created_by }
```
`expense_ledger_id` is **gone** from this form — you no longer choose
which expense category it belongs to; every delivery expense goes to the
same "Delivery Expense" ledger, tagged with whatever `category` text you
give it (optional, just for readability in the feed).

### Single-side views, if you ever need just one

```
GET /api/ledger/delivery/income?branch_id=&from_date=&to_date=
GET /api/ledger/delivery/expense?branch_id=&from_date=&to_date=
```
Same shape as before, unchanged — `get /api/ledger/delivery` above is the
one to build the actual page around.

---

## Screen: Cash Manager (Galla) — now shows opening/closing per day, with timing

```
GET  /api/ledger/cash-manager?branch_id=&from_date=&to_date=
POST /api/ledger/cash-manager/expense   → { branch_id, expense_ledger_id, amount, reference_no?, created_by }
```
Response is grouped by day, exactly what was asked for:
```json
{
  "data": {
    "current_balance": 10050.0, "current_balance_type": "dr",
    "days": [
      {
        "date": "2026-09-05",
        "opening_balance": 15000.0, "opening_balance_type": "dr",
        "closing_balance": 10050.0, "closing_balance_type": "dr",
        "total_in": 300, "total_out": 5250,
        "entries": [
          { "time": "2026-09-05T05:58:56Z", "voucher_no": "REC0003", "narration": "Delivery income - GR 5142",
            "direction": "in", "amount": 300, "running_balance": 15300.0, "running_balance_type": "dr" },
          { "time": "2026-09-05T13:50:06Z", "voucher_no": "PAY0001", "narration": "Payment given (cash)",
            "direction": "out", "amount": 1000, "running_balance": 14300.0, "running_balance_type": "dr" }
        ]
      }
    ]
  }
}
```
- **`direction`** is always `"in"` or `"out"` — never Dr/Cr.
- **`time`** is the exact moment the entry was recorded (not just the date).
- **`opening_balance`/`closing_balance`** are per-day — render each day as its own card/section with these at top and bottom, entries listed between them.

Render each entry row as: `time · voucher_no · narration · [+amount if in / −amount if out] · running_balance`.

---

## Screen: Truck Bhada

```
GET  /api/ledger/drivers?branch_id=
POST /api/ledger/drivers                                → { branch_id, name, phone?, created_by }
GET  /api/ledger/drivers/{id}                           → balance + bills + full timestamped history, one call
POST /api/ledger/drivers/{id}/bhada                     → { branch_id, challan_no, truck_number?, amount, created_by }
POST /api/ledger/drivers/{id}/pay                       → { branch_id, amount, payment_mode, bank_ledger_id?, bill_reference_id?, created_by }
```

---

## Screen: Labour Kharcha — now itemized, exactly as requested

**No more one flat "expense_type + amount".** The form now has these
fields, all optional except at least one charge must be filled in:

| Field | Type | Notes |
|---|---|---|
| Challan No | text | used as the bill's reference number |
| Weight | number | stored for reference, not part of the total |
| Unloading | number | |
| Crossing | number | |
| Dala Munshiyana | number | |
| Labour Wage | number | |
| Other Charge | number | |

**The total is always calculated for you** — Unloading + Crossing + Dala
Munshiyana + Labour Wage + Other Charge — never typed in directly, so the
breakdown and the total can never disagree.

```json
POST /api/ledger/labour/{id}/expense
{
  "branch_id": "<branch>",
  "challan_no": "0350",
  "weight": 4500,
  "unloading": 150,
  "crossing": 50,
  "dala_munshiyana": 30,
  "labour_wage": 100,
  "other_charge": 20,
  "created_by": "<user>"
}
```
→ raises a bill for ₹350 (150+50+30+100+20) against this labourer, with
the full breakdown saved on the bill so it can be shown again later —
`GET /api/ledger/labour/{id}` returns each bill's `metadata` field exactly
as submitted: `{ "challan_no": "0350", "weight": 4500, "unloading": 150,
"crossing": 50, "dala_munshiyana": 30, "labour_wage": 100, "other_charge": 20 }`.
Render the bill detail as a small itemized table using that.

```
GET  /api/ledger/labour?branch_id=
POST /api/ledger/labour                                → { branch_id, name, created_by }
GET  /api/ledger/labour/{id}                            → balance + bills + full timestamped history
POST /api/ledger/labour/{id}/expense                    → shown above
POST /api/ledger/labour/{id}/pay                        → { branch_id, amount, payment_mode, bank_ledger_id?, bill_reference_id?, created_by }
```

---

## Screen: Ledger Master (replaces Chart of Accounts + Ledger Statement + Ledgers)

```
GET  /api/ledger/ledgers?branch_id=&group_id=&search=&is_active=&page=&page_size=   → list / search
POST /api/ledger/ledgers                                                              → create any ledger (bank, expense type, etc.)
GET  /api/ledger/ledgers/{id}                                                          → the record
GET  /api/ledger/ledgers/{id}/balance                                                  → current balance
GET  /api/ledger/ledgers/{id}/statement?from_date=&to_date=                            → full timestamped history — THIS is what used to be its own "Ledger Statement" screen
GET  /api/ledger/overview?branch_id=                                                   → everything, grouped by category — the data behind whatever "browse all" view you keep inside Ledger Master
```
One screen: a searchable list (optionally grouped, using `overview` for
the grouping), a "+ New" form for ad-hoc ledgers (banks, expense
categories — Transporters/Drivers/Labour still get created from their own
screens, not here), and clicking any row shows balance + statement inline
— no separate "Chart of Accounts" or "Ledger Statement" pages needed.

This is also the screen where the owner's **"All Branches"** option (see
above) is most useful — omit `branch_id` on both endpoints and every
ledger across every branch comes back in one list/grouping, each tagged
with `branch_name`.

**Groups (Chart of Accounts) still exist in the backend** — they're just
no longer a screen you manage directly. They're created automatically the
first time a new category is needed (Transporters, Drivers, Labour), and
the built-in ones (Cash-in-Hand, Bank Accounts, Sundry Debtors/Creditors,
Direct Incomes/Expenses, etc.) were seeded once and never need touching.

---

## Banks

```
GET  /api/ledger/banks?branch_id=                      → list, each with is_default + balance
POST /api/ledger/banks/{id}/set-default                → { branch_id }
```
Two real banks already exist for Kanpur: **EKLAVYA BANK ACCOUNT** and
**SS TRANSPORT CORPORATION BANK ACCOUNT**. Once migration 006 is run, tell
me which should be default (or call `set-default` yourself).

---

## Day Book & Audit Log (unchanged)

```
GET /api/ledger/vouchers?branch_id=&voucher_type=&from_date=&to_date=&is_active=&page=&page_size=
GET /api/ledger/vouchers/{id}
POST /api/ledger/vouchers/{id}/cancel   → { cancelled_by?, reason? }

GET /api/ledger/audit-log?entity_type=&entity_id=&page=&page_size=
```

---

## The one sentence of accounting you actually need

Every screen above hides Dr/Cr completely — but if a number ever looks
surprising: **money always has a "went to" side and a "came from" side,
and they're always equal.** A bill raised against someone is money that
"went to" them (they now owe more) and "came from" your income/expense
category. A payment is money that "went to" cash/bank and "came from"
reducing what someone owed (or increasing it, for a "give"/advance).
That's the entire system underneath every screen above.

## Code

- [services/ledger/](../services/ledger/) — every function behind every endpoint above
- [app.py](../app.py) — every route
- [migrations/006_ledger_default_bank.sql](../migrations/006_ledger_default_bank.sql) and [migrations/007_ledger_bill_metadata.sql](../migrations/007_ledger_bill_metadata.sql) — run both first
