# How to use Accounting

## First-time setup (only once)

Before entering any transaction, make sure these ledgers exist. Go to
**Ledger Master → New Ledger** and create:

1. **Swastik Transport** — Group: `Sundry Debtors` (this makes it bill-wise
   automatically, so you can track each bill separately).
2. **Bank Account** — Group: `Bank Accounts`.
3. **Cash** — Group: `Cash-in-Hand`.
4. **Sales Account** — Group: `Sales Accounts` (only if you don't already
   have one).

You only do this once per party/account, not every time.

---

## Your example: Swastik Transport owes ₹55,000, pays ₹40,000 (₹30,000 cheque + ₹10,000 cash)

This is two separate steps: first you record the ₹55,000 bill, then you
record the ₹40,000 you received against it.

### Step 1 — Record the ₹55,000 bill

Go to **Voucher Entry**:

1. Select voucher type **Sales**.
2. Row 1: Ledger = **Swastik Transport**, **Money In**, Amount = **55000**.
   - Since this ledger is bill-wise, a small panel appears below the row.
     Choose **New Bill**, and type a bill number (e.g. `INV-101`). This is
     what creates the ₹55,000 bill against Swastik Transport.
3. Row 2: Ledger = **Sales Account**, **Money Out**, Amount = **55000**.
4. Money In Total and Money Out Total both show ₹55,000, so the Save
   button is enabled. Click **Save Voucher**.

Swastik Transport now shows a balance of **₹55,000 — they owe you**, and
there's one open bill (`INV-101`) for ₹55,000 on the Ledger Master →
Swastik Transport → **Bills** tab.

> Skip this step if the ₹55,000 was already owed before you started using
> this system — in that case just set it as the ledger's **Opening
> Balance** (₹55,000, "They Owe") when you create the ledger instead.

### Step 2 — Record the ₹40,000 received (₹30,000 cheque + ₹10,000 cash)

Go to **Voucher Entry** again:

1. Select voucher type **Receipt**.
2. Click **Add Row** so you have 3 rows.
3. Row 1: Ledger = **Bank Account**, **Money In**, Amount = **30000** (the cheque).
4. Row 2: Ledger = **Cash**, **Money In**, Amount = **10000** (the cash).
5. Row 3: Ledger = **Swastik Transport**, **Money Out**, Amount = **40000**.
   - The bill panel appears again. Choose **Against Bill**, and pick
     `INV-101 — ₹55,000` from the dropdown.
6. Money In Total = ₹40,000, Money Out Total = ₹40,000 — balanced.
   Click **Save Voucher**.

### Result

- Swastik Transport's balance drops from ₹55,000 to **₹15,000**
  (what they still owe you).
- The `INV-101` bill now shows Balance Amount = **₹15,000**, still
  "Open" (not fully settled).
- Both amounts (cheque + cash) are on record separately, in Bank Account
  and Cash — so those balances go up by ₹30,000 and ₹10,000.

To see the full history any time, open **Ledger Statement**, search
"Swastik Transport", and you'll see both vouchers with the running balance.

---

## The 6 screens, in plain words

| Screen | What you use it for |
|---|---|
| **Chart of Accounts** | The categories (groups) everything else sits under — Assets, Liabilities, Sales, etc. Set up once. |
| **Ledger Master** | Your list of parties, banks, and cash accounts. Create one per person/company/account. |
| **Voucher Entry** | Where you record every transaction — a bill, a payment, a receipt. |
| **Day Book** | A list of every voucher you've entered — search, open, or cancel one. |
| **Ledger Statement** | One account's full history with running balance — like a bank passbook. |
| **Audit Log** | A record of who changed what, and when. |

## Quick rules

- **Money In and Money Out must always match** in a voucher — that's what
  the totals footer checks before letting you save.
- **Bill-wise ledgers** (parties, usually) let you pick **New Bill**,
  **Against Bill**, **Advance**, or **On Account** for each entry.
  Non-bill-wise ledgers (Cash, Bank, Sales) skip this.
- **Voucher numbers are automatic** — you never type one.
- To undo a mistake, open the voucher in **Day Book** and use **Cancel**
  (don't try to edit or delete it).
