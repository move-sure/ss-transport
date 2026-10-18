# Accounting (`/hub-management/accounts`)

This replaces the previous version of this file, which documented a manual
"Chart of Accounts → Voucher Entry" workflow (Tally-style, type every debit
and credit row yourself). **That screen no longer exists in the UI.** The
current app is built around business actions instead — "raise a bill",
"collect a payment", "log an expense" — and creates the underlying ledger
entries for you behind the scenes. This file describes what's actually
there today.

## The 8 screens

Left sidebar, top to bottom (`SideNavbar.js`):

**Daily use:**

| Screen | Path | What it's for |
|---|---|---|
| Transport PF Collection | `/accounts/transporters` | Bill a transporter, collect from them, or give an advance. |
| Kanpur Delivery | `/accounts/delivery` | Income & expense per GR number. Hard-locked to the Kanpur branch. |
| Cash Manager (Galla) | `/accounts/cash-register` | Day-by-day view of everything that touched the cash box. |
| Truck Bhada | `/accounts/drivers` | What you owe each driver, per trip. |
| Labour Kharcha | `/accounts/labour` | What you owe your loading labour, itemized per trip. |

**Advanced:**

| Screen | Path | What it's for |
|---|---|---|
| Ledger Master | `/accounts/ledgers` | Your list of every account — parties, banks, cash, income/expense heads. Create/edit/deactivate here. |
| Day Book | `/accounts/vouchers` | Every voucher any of the screens above created. Read-only list + cancel. |
| Audit Log | `/accounts/audit-log` | Who changed what, and when, with before/after JSON. |

All 8 share one layout (`layout.js`): a fixed left `SideNavbar`, a `BranchBar`
at the top for picking which branch you're looking at, and the screen itself
in the remaining space.

## The branch selector — read this first

`BranchBar` (top of every screen) lets you pick one branch, or **"All
Branches"** (visible to owners). This is a single shared selection
(`useBranch()`/`BranchProvider`, backed by `localStorage`) — change it once
and every screen you navigate to afterwards respects it.

**Except three screens don't**, on purpose:
- **Kanpur Delivery** always uses the Kanpur branch, full stop.
- **Cash Manager** falls back to *your own* branch if "All Branches" is
  selected — a cash box balance for "all branches at once" doesn't mean
  anything.
- **Transport PF / Truck Bhada / Labour Kharcha** do the same fallback —
  a party account is always tied to one physical branch.

This is called out in small print in `BranchBar` itself, but it's easy to
miss and worth knowing before you go looking for a transporter you know you
added, in the wrong branch.

## How the three "party" screens work (Transporters, Drivers, Labour)

These three are the same component (`PartyMasterDetail.js`) wearing
different labels — once you understand one, you understand all three.

1. **Left panel** — search box + list of parties (transporters / drivers /
   labour), each row showing name and current balance ("₹X they owe you" /
   "₹X you owe them" / "Settled"). The **+** button opens **Add Party**
   (just name + a couple of optional fields — GSTIN/phone for transporters,
   phone for drivers/labour).
2. **Click a party** → right panel loads their full detail: balance, a
   **Bills** table, and a full **History** table (every voucher, running
   balance).
3. **Action buttons** at the top of the detail panel, specific to each
   screen:
   - *Transport PF Collection*: **New Bill**, **Collect Payment**, **Give
     Payment**.
   - *Truck Bhada*: **Add Trip Bhada**, **Pay**.
   - *Labour Kharcha*: **Add Expense**, **Pay** (component not read in this
     pass, but same shape as Drivers via `AddLabourExpenseModal`).

**New Bill / Add Trip Bhada / Add Expense** (`AddChargeModal.js`) is one
generic small form: an amount, plus whatever reference fields that screen
asks for (Bill Reference + optional due date for transporters; Challan No +
truck number for drivers). This is what creates a bill and increases what
that party owes you (or what you owe them).

**Collect Payment / Give Payment / Pay** (`PayModal.js`) is: how much, cash
or bank (`PaymentModeField`, picks from the Ledger Master bank list or lets
the backend use whichever bank is marked default), and — only for the
"collect"/"pay" direction, never for a no-bill advance — an optional
dropdown of that party's still-open bills to apply the payment against.
Picking a bill auto-fills the amount to that bill's remaining balance (you
can still edit it, e.g. for a partial payment).

Every one of these calls posts straight to a purpose-built endpoint
(`transportersApi.raiseBill/collect/give`, `driversApi.addBhada/pay`, etc. —
see `components/hub-management/accounts/api.js`) — there's no generic
"create a voucher with these rows" call from the frontend for these flows.

## Ledger Master — the other kind of account

Ledger Master (`/accounts/ledgers`) is the master list of **every** account
in the system, including the party ledgers the three screens above create
automatically. In practice you go here to create things those screens
*don't* create for you: a **Bank Account**, **Cash**, a **Sales Account**,
or any other expense/income head.

Creating one (`LedgerFormModal.js`):
- **Name** + **Group** (required) — the group is what makes a ledger behave
  like an asset, liability, income, or expense account. Groups are a tree
  (`ledgerApi.groups.tree`); picking a group under something matching
  "Sundry Debtors/Creditors" auto-checks **"Maintain bill-by-bill"** for you
  (you can override it).
- **Opening Balance** + who it's owed by ("They Owe" / "You Owe") + a date —
  this is the one-time way to bring in a balance that existed before you
  started using this system (see the walkthrough README used to have — that
  part is still accurate, opening balance still works the same way).
- Optional details panel: GSTIN, PAN, address, phone, email, city, credit
  period/limit.

Clicking a ledger's name opens its detail page (`ledgers/[id]`): current
balance, a **Statement** tab (`StatementView.js` — date-filterable running
balance, same table shape as the party screens' History) and, if the ledger
is bill-wise, a **Bills** tab (Outstanding / All).

**Add Entry (Dr/Cr)** on the ledger page posts a transaction straight to that
ledger (e.g. "Bank Account Dr ₹5,000, Interest Income Cr ₹5,000"): pick Dr or
Cr for this ledger, the amount, the other ledger, date, voucher type and
narration (`LedgerEntryModal.js`, uses `POST /vouchers`). New Ledger also asks
for the **Branch** now, so a ledger can be created while "All Branches" is
selected.

## Day Book and Audit Log

- **Day Book** (`/accounts/vouchers`) — every voucher ever created, from
  every screen, filterable by type/date/branch, with a **"Show cancelled
  too"** checkbox. Click a row for the full voucher detail
  (`vouchers/[id]`), which has **Edit** and **Cancel**.

## Fixing a wrong transaction

Every party History row (Transport PF, Truck Bhada, Labour), every ledger
Statement row and the voucher page have **Edit / Cancel**
(`EditVoucherModal.js`):
- **Correct**: change the amount, date or narration, then Save. A corrected
  copy is posted and the wrong voucher is cancelled with the reason
  "Corrected - replaced by <new no>". Both stay in the Day Book.
- **Cancel**: cancel the voucher with a reason.
- **Bills** can only be cancelled (then raise the bill again).

The backend has no one-step edit yet. The changes it needs are listed in
[ACCOUNTS_BACKEND_README.md](ACCOUNTS_BACKEND_README.md).

## Dr / Cr

All screens show **Dr / Cr** instead of "Money In / Money Out" and "They owe /
You owe". **Dr** balance = receivable / asset / expense; **Cr** balance =
payable / liability / income.
- **Audit Log** (`/accounts/audit-log`) — every create/update/deactivate/
  cancel, filterable by entity type, with old/new JSON side-by-side. A
  ledger's own **History** button deep-links here with `entity_id`
  pre-filled.

## A concrete example

**Ramesh Transport (a transporter) owes you ₹55,000 for August, then pays
₹40,000 (₹30,000 by cheque, ₹10,000 cash).**

1. Go to **Transport PF Collection**, search/select Ramesh Transport.
2. Click **New Bill** → Bill Reference `AUG-2026-RT`, Amount `55000`,
   optional due date → **Raise Bill**. Their balance now shows
   **₹55,000 — Owes you**, and it appears as one open row under **Bills**.
3. Click **Collect Payment** → pick `AUG-2026-RT — ₹55,000 due` from the
   bill dropdown (amount auto-fills to 55000, edit it down to `40000` since
   it's a partial payment) → Cash or Bank → **Save**. (Two separate
   payments — one bank, one cash — need two separate Collect Payment
   clicks; there's no split-payment-in-one-entry option today.)
4. Balance drops to **₹15,000 — Owes you**; the bill's Balance Amount
   becomes ₹15,000 and it stays "Open" (not "Settled") until it hits ₹0.
5. Both the ₹30,000 and ₹10,000 also show up as running-balance entries on
   the **Bank Account** and **Cash** ledgers in Ledger Master, since every
   payment recorded here has to land in cash or a bank ledger somewhere.

## What could be added, for user-friendliness

Roughly in order of how much day-to-day friction they cause:

1. **Cash Manager has no "Cash Income" button** — only **Cash Expense**.
   If cash comes in from something other than the 5 business screens (e.g.
   a walk-in cash sale), there's currently no screen to log it going in.
2. **No inline "Record Payment" from the Bills table on the party screens.**
   `BillsTable.js` already supports an `onPay` prop that renders a
   per-row "Record Payment" link — `ledgers/[id]`'s Bills tab and the three
   party screens just don't pass it, so today you always have to open
   **Collect Payment**/**Pay** and re-pick the bill from a dropdown instead
   of clicking straight from the row you're already looking at. This looks
   like a near-free win since the plumbing already exists.
3. **No split payment in one entry** — paying ₹30,000 by bank and ₹10,000
   cash against the same bill takes two separate Collect Payment/Pay
   actions today (as in the example above). A payment form that accepts
   more than one cash/bank row at once would match how the money often
   actually arrives.
4. **Bill Reference is free-typed, not auto-numbered** — nothing stops two
   different bills from accidentally getting the same reference, or a typo
   creating an orphaned reference nobody can find later. Worth at least a
   duplicate check against that party's existing bills before saving.
5. **Audit Log's entity filter is text-only (`entity_id`), no name search**
   — you can only jump straight to a ledger's history via its own "History"
   button; there's no "search audit log by name" from the Audit Log screen
   itself.
6. **No CSV/PDF export** anywhere in Accounting — Day Book, a ledger's
   Statement, and the Bills tables are all screen-only right now. Even a
   basic "export this table" button on the Statement view would cover the
   most common ask (sending a party their outstanding-bills list).
7. **`PartyMasterDetail`'s fixed two-column layout** (`w-80` list +
   flexible detail) doesn't reflow for small/tablet screens — it's built
   list-left/detail-right and stays that way regardless of viewport width.
