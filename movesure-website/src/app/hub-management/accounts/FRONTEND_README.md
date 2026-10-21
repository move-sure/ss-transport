# Accounts: Frontend Overview

`/hub-management/accounts`. A quick map of the screens and what each one does.

## Layout

```
┌──────────────┬───────────────────────────────────────────────┐
│  Side menu   │  Branch bar (pick a branch / All Branches)    │
│              ├───────────────────────────────────────────────┤
│  Daily use   │                                               │
│  Advanced    │          The selected screen                  │
│              │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

- **Home** (`/accounts`): the screen cards and the Transport PF headline (total Receivable and Payable).
- **Branch bar**: one shared choice for every screen.
  - Party screens and the Cash Manager fall back to your own branch when "All Branches" is selected.
  - Kanpur Delivery always uses Kanpur.

## Screens

### Daily use
| Screen | Path | What you can do |
|---|---|---|
| **Transport PF Collection** | `/transporters` | Add a transporter. Raise a **PF bill** (they owe you) or a **payable bill** (you owe them). **Collect** or **Give** a payment by cash or bank, against an open bill or as an advance. |
| **Kanpur Delivery** | `/delivery` | Add **income** and **expense** per GR number. |
| **Cash Manager (Galla)** | `/cash-register` | Day-by-day cash box: everything that touched cash, plus a **Cash Expense** button. |
| **Truck Bhada** | `/drivers` | Add a driver. **Add Trip Bhada** (challan, truck no) and **Pay**. |
| **Labour Kharcha** | `/labour` | Add labour. **Add Expense** and **Pay**. |
| **Party Ledgers** | `/party-ledgers` | Bilty-wise ledgers. A **party** ledger holds a consignor's paid bilties (or a consignee's to-pay bilties); a **custom** ledger (e.g. MRM RAMKOLA) holds any bilties you pick. See below. |

Transport PF, Truck Bhada and Labour share one layout (`PartyMasterDetail`):
- **Left:** a searchable party list, each with its balance (e.g. ₹12,000 Dr).
- **Right:** the balance, action buttons, a **Bills** table and a **History** table.

### Party Ledgers
- **List:** Party / Custom tabs, each ledger's bilty count, bilty total and balance (Dr/Cr). **+ Party Ledger** and **+ Custom Ledger**.
- **New Party Ledger:** pick a consignor or consignee, tick the other spellings of its name found on bilties, then set an opening balance and an import-from date. Existing bilties import in batches, with progress shown.
- **Ledger page:** balance, Total Dr / Cr, bilty count. Buttons: **Receive Payment** (tick the bilties it settles; any extra stays on account), **Add Bilties** (search by GR, party or bilty group, then tick), **Sync** (party only: preview, then apply), **History**.
- **Tabs:** **Bilties** (open / settled / all, remove), **Statement** (with Edit / Cancel), **Settings** (spellings, GSTIN, auto-add, this-branch-only).
- **Automatic:** new regular bilties are added on booking (backend). A manual bilty calls auto-add after saving.

### Hub → Transport
Bilties on challans **received at the hub** are posted, one by one, into the delivery transport's ledger. A to-pay bilty is **Dr pf** (total − kaat − dd: the transport owes us). A paid bilty is **Cr kaat** (we owe the transport).

| Screen | Path | What you can do |
|---|---|---|
| **Hub Challans** | `/transport-challans` | Received challans, with an assigned/total progress bar. Open one to see its bilties: suggested transport (with a source tag), kaat, pf and status. Change a transport inline, **Assign selected**, or **Auto-assign** the whole challan (preview first). |
| **Unassigned Bilties** | `/transport-unassigned` | Every received bilty in no transport ledger, for a date range. Filters: no transport found, no kaat, blocked, with pohonch / bilty no. Same assign table. |
| **Transport Ledgers** | `/transport-ledgers` | Each transport's net balance, bilties, to-pay, kaat and pf totals. **+ Transport Ledger** (optional; assign creates ledgers). |
| **Transport ledger page** | `/transport-ledgers/[id]` | **Collect** (receivable bilty bills), **Give** (payable kaat bills), **Refresh kaat** (preview, then apply). Tabs: **Bilties** (kaat / dd / pf, outstanding, unassign), **Statement** (Dr/Cr, CSV/PDF), **Settings** (transport rows, allow zero kaat). |

A pohonch no, crossing challan no or transport bilty no is **proof** the transport received the bilty (a blue badge, e.g. "Pohonch 217"), not a settlement: those bilties are assigned like any other. Blocked: to-pay bilties already owed in a party ledger, and GRs booked as Kanpur Delivery income.

- **Transport picker:** one row per transport company (grouped by PAN), showing only transports at the bilty's station. Tags: at station, has ledger, no GST, "looks like X".
- **Add kaat rate:** for bilties with no kaat (one station at a time): rate per kg or per pkg, an optional DD, "save as station rate" and "assign now". Opens from the status badge, the bottom bar, or the skipped list after an assign.
- **Refresh** (ledger page): updates totals, kaat and narration; unassigns bilties whose station changed; lists bilties that need review. Bilties flagged for review show a red **REVIEW** badge in the Bilties tab.
- **Merge** (ledger Settings): moves a split ledger into another one.
- **Manual bilty edit:** calls `bilty-changed` so its transport ledger entry stays in sync.

### Advanced
| Screen | Path | What you can do |
|---|---|---|
| **Ledger Master** | `/ledgers` | Create, edit or deactivate any ledger (bank, cash, income/expense heads, parties), with branch, group, opening balance Dr/Cr, GST and contact details. |
| **Ledger page** | `/ledgers/[id]` | Balance (Total Dr / Total Cr), **Statement** (date filter, running balance), **Bills** tab for bill-wise ledgers, and **Add Entry (Dr/Cr)**. |
| **Day Book** | `/vouchers` | Every voucher from every screen. Filter by type, date and branch, and optionally show cancelled vouchers. |
| **Voucher page** | `/vouchers/[id]` | The voucher's Dr/Cr rows, with **Edit**, **Cancel** and **History**. |
| **Audit Log** | `/audit-log` | Who created, changed or cancelled what, with old and new values. |

## Common functions

| Function | Where | How it works |
|---|---|---|
| **Dr / Cr** | Everywhere | **Dr** = receivable / asset / expense. **Cr** = payable / liability / income. |
| **Cash or bank** | Every payment | Choose Cash or a bank. Leave the bank blank to use the default bank. |
| **Pay against a bill** | Collect / Give / Pay | Pick an open bill and the amount fills in; edit it for a part payment. |
| **Edit / Cancel a transaction** | History rows, Statement rows, Voucher page | **Correct** edits the amount, date or narration in place (same voucher no; bills are recalculated). **Cancel** needs a reason. |
| **Add Entry (Dr/Cr)** | Ledger page | This ledger Dr or Cr, the other ledger takes the opposite side, plus date, type and narration. |
| **Opening balance** | New Ledger | Amount, Dr/Cr and date, for balances from before using the system. |

## Code map

```
app/hub-management/accounts/
  page.js                home
  transporters/ drivers/ labour/ delivery/ cash-register/
  party-ledgers/ party-ledgers/[id]/
  transport-challans/ transport-challans/[challan_no]/ transport-unassigned/ transport-ledgers/ transport-ledgers/[id]/
  ledgers/ ledgers/[id]/ vouchers/ vouchers/[id]/ audit-log/
components/hub-management/accounts/
  api.js                 all API calls (api.movesure.io/api/ledger)
  helpers.js             Dr/Cr labels, ₹ and date formatting
  PartyMasterDetail.js   shared party screen
  EditVoucherModal.js    edit / cancel a transaction (PUT /vouchers/{id})
  party-ledgers/         Party Ledgers: new-ledger modals, Bilties tab, Settings, Receive Payment, Add Bilties, Sync
  transport-ledgers/     Hub → Transport: BiltyAssignTable, TransportPicker, AutoAssign, RefreshKaat, Bilties tab, Settings
  LedgerEntryModal.js    add a Dr/Cr entry to a ledger
  LedgerFormModal.js     create / edit a ledger
  PayModal.js, AddChargeModal.js, CashExpenseModal.js, DeliveryModals.js
  StatementView.js, BillsTable.js, LedgerPicker.js, BranchBar.js, SideNavbar.js
```

For more detail, see [README.md](README.md). For the planned backend changes, see [ACCOUNTS_BACKEND_README.md](ACCOUNTS_BACKEND_README.md).
