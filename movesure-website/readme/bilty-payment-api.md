# Payment Tracking System - Bilty & Station Summary Bilty

## Overview

The Payment Tracking System allows you to track payment details for bilties and station summary bilties. This system records:

- **Payment Mode**: How the payment was/will be made (cash, online, partial, FOC)
- **Advance Amount**: Amount already paid
- **Remaining Amount**: Amount still pending
- **Payment Status**: Current payment state (PENDING, PARTIAL, PAID, FOC)
- **Payment History**: Transaction-by-transaction audit trail
- **Payment Method**: Specific method used (cash, cheque, bank transfer, UPI)
- **Reference Numbers**: Cheque/transaction references for tracking

## Database Schema

### New Columns Added

#### `bilty` Table
```sql
- payment_details (JSONB, NULL by default)      -- Complete payment tracking object
- payment_status (VARCHAR, NULL by default)      -- Quick-filter status: PENDING|PARTIAL|PAID|FOC
- advance_amount (NUMERIC, NULL by default)      -- Amount paid so far
- remaining_amount (NUMERIC, NULL by default)    -- Amount still pending
```

#### `station_bilty_summary` Table
```sql
- payment_details (JSONB, NULL by default)      -- Complete payment tracking object
- payment_status (VARCHAR, NULL by default)      -- Quick-filter status: PENDING|PARTIAL|PAID|FOC
- advance_amount (NUMERIC, NULL by default)      -- Amount paid so far
- remaining_amount (NUMERIC, NULL by default)    -- Amount still pending
```

**Important**: All columns default to `NULL`. No existing data is affected by this migration.

### Indexes Created

For performance optimization:
- `idx_bilty_payment_status` - On `bilty.payment_status`
- `idx_bilty_payment_details` - GIN index on `bilty.payment_details` JSONB
- `idx_station_bilty_summary_payment_status` - On `station_bilty_summary.payment_status`
- `idx_station_bilty_summary_payment_details` - GIN index on `station_bilty_summary.payment_details` JSONB

## payment_details JSONB Structure

```json
{
  "payment_mode": "cash|online|partial|foc",
  "advance_amount": 5000,
  "remaining_amount": 3000,
  "paid_amount": 5000,
  "payment_date": "2026-05-15",
  "payment_method": "cash|cheque|bank_transfer|upi",
  "reference_number": "CHQ123456",
  "notes": "advance payment collected at branch",
  "transactions": [
    {
      "date": "2026-05-10",
      "amount": 5000,
      "method": "cash",
      "reference": "RECEIPT-001",
      "notes": "initial advance"
    },
    {
      "date": "2026-05-15",
      "amount": 3000,
      "method": "cheque",
      "reference": "CHQ789",
      "notes": "additional payment"
    }
  ],
  "created_at": "2026-05-15T10:30:00Z",
  "updated_at": "2026-05-15T11:45:00Z"
}
```

## API Endpoints

### 1. Save Bilty Payment Details

**Endpoint**: `POST /api/bilty/payment/save`

**Request Body**:
```json
{
  "bilty_id": "550e8400-e29b-41d4-a716-446655440000",
  "payment_mode": "partial",
  "advance_amount": 5000,
  "payment_date": "2026-05-15",
  "payment_method": "cash",
  "reference_number": null,
  "notes": "advance payment collected",
  "add_transaction": {
    "amount": 5000,
    "method": "cash",
    "reference": "RECEIPT-001",
    "notes": "initial advance"
  }
}
```

**Parameters**:
- `bilty_id` (string, required) - UUID of the bilty
- `payment_mode` (string, required) - `cash`, `online`, `partial`, `foc`
- `advance_amount` (numeric, required) - Amount paid. Cannot exceed total
- `payment_date` (string, optional) - ISO date. Defaults to today
- `payment_method` (string, optional) - `cash`, `cheque`, `bank_transfer`, `upi`
- `reference_number` (string, optional) - Cheque/transaction reference
- `notes` (string, optional) - Additional notes
- `add_transaction` (object, optional) - Add a transaction to history:
  - `amount` (numeric, required)
  - `method` (string, optional)
  - `reference` (string, optional)
  - `notes` (string, optional)

**Response** (Success):
```json
{
  "status": "success",
  "bilty_id": "550e8400-e29b-41d4-a716-446655440000",
  "payment_details": {...},
  "payment_status": "PARTIAL",
  "advance_amount": 5000,
  "remaining_amount": 3000
}
```

**Response** (Error):
```json
{
  "status": "error",
  "message": "advance_amount (8000) cannot exceed total (8000)",
  "status_code": 400
}
```

**Status Codes**:
- `200` - Success
- `400` - Validation error (invalid amount, missing fields)
- `404` - Bilty not found
- `500` - Server error

---

### 2. Get Bilty Payment Details

**Endpoint**: `GET /api/bilty/payment/{bilty_id}`

**URL Parameters**:
- `bilty_id` (string) - UUID of the bilty

**Response** (Success):
```json
{
  "status": "success",
  "bilty_id": "550e8400-e29b-41d4-a716-446655440000",
  "gr_no": "A00001",
  "total_amount": 8000,
  "payment_status": "PARTIAL",
  "advance_amount": 5000,
  "remaining_amount": 3000,
  "payment_details": {...}
}
```

**Response** (Error):
```json
{
  "status": "error",
  "message": "Bilty not found",
  "status_code": 404
}
```

---

### 3. Save Station Bilty Payment Details

**Endpoint**: `POST /api/station-bilty/payment/save`

**Request Body** (same structure as bilty payment, but uses `gr_no`):
```json
{
  "gr_no": "A00001",
  "payment_mode": "partial",
  "advance_amount": 5000,
  "payment_date": "2026-05-15",
  "payment_method": "cash",
  "notes": "advance payment collected",
  "add_transaction": {
    "amount": 5000,
    "method": "cash",
    "reference": "RECEIPT-001",
    "notes": "initial advance"
  }
}
```

**Parameters** (same as bilty payment, replace `bilty_id` with `gr_no`):
- `gr_no` (string, required) - GR number (e.g., "A00001")
- All other parameters same as bilty payment endpoint

**Response** (Success):
```json
{
  "status": "success",
  "gr_no": "A00001",
  "payment_details": {...},
  "payment_status": "PARTIAL",
  "advance_amount": 5000,
  "remaining_amount": 3000
}
```

---

### 4. Get Station Bilty Payment Details

**Endpoint**: `GET /api/station-bilty/payment/{gr_no}`

**URL Parameters**:
- `gr_no` (string) - GR number (e.g., "A00001")

**Response** (Success):
```json
{
  "status": "success",
  "gr_no": "A00001",
  "total_amount": 8000,
  "payment_status": "PARTIAL",
  "advance_amount": 5000,
  "remaining_amount": 3000,
  "payment_details": {...}
}
```

---

## Payment Status Values

| Status | Meaning | Condition |
|--------|---------|-----------|
| `PENDING` | No payment received | `advance_amount == 0` |
| `PARTIAL` | Some payment received | `0 < advance_amount < total` |
| `PAID` | Full payment received | `advance_amount >= total` |
| `FOC` | Free of charge | `payment_mode == "foc"` |

Status is automatically calculated based on `payment_mode` and `advance_amount` vs total.

## Integration with Bilty Save API

When creating/updating a bilty via `/api/bilty/save`, you can include payment fields:

```json
{
  "branch_id": "...",
  "gr_no": "A00001",
  "...other bilty fields...",
  "payment_mode": "partial",
  "payment_status": "PARTIAL",
  "advance_amount": 5000,
  "remaining_amount": 3000,
  "payment_details": {
    "payment_mode": "partial",
    "advance_amount": 5000,
    "remaining_amount": 3000,
    "paid_amount": 5000,
    "payment_date": "2026-05-15",
    "notes": "advance payment",
    "transactions": [...]
  }
}
```

Or save payment details after bilty creation:

```javascript
// Step 1: Create bilty
POST /api/bilty/save
{
  "branch_id": "...",
  "gr_no": "A00001",
  ...
}

// Step 2: Save payment details
POST /api/bilty/payment/save
{
  "bilty_id": "<returned bilty_id>",
  "payment_mode": "partial",
  "advance_amount": 5000,
  ...
}
```

## Frontend Implementation Examples

### React Component - Bilty Payment Form

```typescript
import React, { useState } from 'react';

interface PaymentFormProps {
  biltyId: string;
  totalAmount: number;
}

const BiltyPaymentForm: React.FC<PaymentFormProps> = ({ biltyId, totalAmount }) => {
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/bilty/payment/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bilty_id: biltyId,
          payment_mode: paymentMode,
          advance_amount: parseFloat(advanceAmount.toString()),
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          reference_number: referenceNumber || null,
          notes: notes || null,
          add_transaction: {
            amount: parseFloat(advanceAmount.toString()),
            method: paymentMethod,
            reference: referenceNumber
          }
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        console.log('Payment saved:', data);
        alert(`Payment saved! Status: ${data.payment_status}`);
      } else {
        console.error('Error:', data.message);
        alert(`Error: ${data.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const remainingAmount = totalAmount - advanceAmount;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: '20px auto' }}>
      <h3>Payment Details</h3>

      <div style={{ marginBottom: '15px' }}>
        <label>Total Amount: ₹{totalAmount.toFixed(2)}</label>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>Payment Mode:</label>
        <select
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
          required
        >
          <option value="cash">Cash</option>
          <option value="online">Online</option>
          <option value="partial">Partial</option>
          <option value="foc">Free of Charge</option>
        </select>
      </div>

      {paymentMode !== 'foc' && (
        <>
          <div style={{ marginBottom: '15px' }}>
            <label>Advance Amount:</label>
            <input
              type="number"
              min="0"
              max={totalAmount}
              step="0.01"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(parseFloat(e.target.value))}
              required
            />
          </div>

          <div style={{ marginBottom: '15px', color: '#666' }}>
            <p>
              Advance: ₹{advanceAmount.toFixed(2)} | 
              Remaining: ₹{remainingAmount.toFixed(2)}
            </p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Payment Method:</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Reference Number (optional):</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Cheque/Transaction ID"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Notes (optional):</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
              rows={3}
            />
          </div>
        </>
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Payment'}
      </button>
    </form>
  );
};

export default BiltyPaymentForm;
```

### Vue Component - Station Bilty Payment

```vue
<template>
  <div class="payment-form">
    <h3>Station Bilty Payment - {{ grNo }}</h3>

    <div class="form-group">
      <label>Total Amount: ₹{{ totalAmount.toFixed(2) }}</label>
    </div>

    <div class="form-group">
      <label>Payment Mode:</label>
      <select v-model="form.payment_mode" required>
        <option value="cash">Cash</option>
        <option value="online">Online</option>
        <option value="partial">Partial</option>
        <option value="foc">Free of Charge</option>
      </select>
    </div>

    <div v-if="form.payment_mode !== 'foc'" class="form-group">
      <label>Advance Amount:</label>
      <input
        type="number"
        v-model.number="form.advance_amount"
        :max="totalAmount"
        min="0"
        step="0.01"
        required
      />
      <p class="amount-info">
        Advance: ₹{{ form.advance_amount.toFixed(2) }} |
        Remaining: ₹{{ (totalAmount - form.advance_amount).toFixed(2) }}
      </p>
    </div>

    <div v-if="form.payment_mode !== 'foc'" class="form-group">
      <label>Payment Method:</label>
      <select v-model="form.payment_method">
        <option value="cash">Cash</option>
        <option value="cheque">Cheque</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="upi">UPI</option>
      </select>
    </div>

    <div v-if="form.payment_mode !== 'foc'" class="form-group">
      <label>Reference Number (optional):</label>
      <input
        type="text"
        v-model="form.reference_number"
        placeholder="Cheque/Transaction ID"
      />
    </div>

    <div v-if="form.payment_mode !== 'foc'" class="form-group">
      <label>Notes (optional):</label>
      <textarea
        v-model="form.notes"
        placeholder="Additional notes"
        rows="3"
      ></textarea>
    </div>

    <button @click="savePayment" :disabled="loading">
      {{ loading ? 'Saving...' : 'Save Payment' }}
    </button>
  </div>
</template>

<script>
export default {
  props: {
    grNo: String,
    totalAmount: Number
  },
  data() {
    return {
      loading: false,
      form: {
        payment_mode: 'cash',
        advance_amount: 0,
        payment_method: 'cash',
        reference_number: '',
        notes: ''
      }
    };
  },
  methods: {
    async savePayment() {
      this.loading = true;
      try {
        const response = await fetch('/api/station-bilty/payment/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gr_no: this.grNo,
            ...this.form,
            add_transaction: {
              amount: this.form.advance_amount,
              method: this.form.payment_method,
              reference: this.form.reference_number
            }
          })
        });

        const data = await response.json();

        if (data.status === 'success') {
          alert(`Payment saved! Status: ${data.payment_status}`);
          this.$emit('payment-saved', data);
        } else {
          alert(`Error: ${data.message}`);
        }
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.payment-form {
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.amount-info {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
```

## Manual (Station Summary) Page Display

When displaying payment information on the manual/station summary page:

```html
<!-- Payment Status Card -->
<div class="payment-status-card">
  <h4>Payment Status</h4>
  <div class="status-row">
    <span class="label">Status:</span>
    <span class="badge badge-{{ paymentStatus }}">{{ paymentStatus }}</span>
  </div>
  <div class="status-row">
    <span class="label">Total Amount:</span>
    <span>₹{{ totalAmount.toFixed(2) }}</span>
  </div>
  <div class="status-row">
    <span class="label">Advance Paid:</span>
    <span>₹{{ advanceAmount.toFixed(2) }}</span>
  </div>
  <div class="status-row">
    <span class="label">Remaining:</span>
    <span class="amount-pending">₹{{ remainingAmount.toFixed(2) }}</span>
  </div>
  <div class="payment-progress">
    <div class="progress-bar">
      <div class="progress-fill" style="width: {{ (advanceAmount / totalAmount * 100) }}%"></div>
    </div>
    <small>{{ ((advanceAmount / totalAmount * 100)).toFixed(0) }}% Paid</small>
  </div>
</div>

<!-- Payment History Table -->
<div class="payment-history">
  <h4>Payment History</h4>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Amount</th>
        <th>Method</th>
        <th>Reference</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="transaction in paymentDetails.transactions" :key="transaction.date">
        <td>{{ formatDate(transaction.date) }}</td>
        <td>₹{{ transaction.amount.toFixed(2) }}</td>
        <td>{{ capitalizeFirst(transaction.method) }}</td>
        <td>{{ transaction.reference || '-' }}</td>
        <td>{{ transaction.notes || '-' }}</td>
      </tr>
    </tbody>
  </table>
</div>
```


## Troubleshooting

### Issue: "advance_amount cannot exceed total"
**Cause**: Payment amount is greater than bilty total
**Solution**: Ensure `advance_amount ≤ total` before saving

### Issue: Payment details not saving
**Cause**: Bilty ID doesn't exist
**Solution**: Verify `bilty_id` is correct and bilty exists

### Issue: Status not updating correctly
**Cause**: Payment mode validation issue
**Solution**: Ensure `payment_mode` is one of: `cash`, `online`, `partial`, `foc`

### Issue: Transaction history not accumulating
**Cause**: Not using `add_transaction` field
**Solution**: Use `add_transaction` object to add to transaction history

## Performance Notes

- Indexes on `payment_status` enable fast filtering by payment state
- GIN index on `payment_details` JSONB enables complex JSON queries
- Payment operations are isolated and don't affect bilty retrieval performance
- No locking mechanism - concurrent updates are safe (JSONB merge-friendly)

## Security Notes

- Always validate `advance_amount` on backend (already done in service)
- Reference numbers are for audit trail only - don't expose sensitive data
- Transaction history is immutable - cannot be deleted, only appended
- Payment data is part of the same bilty record - inherits same access controls
