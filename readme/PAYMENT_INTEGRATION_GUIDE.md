# Bilty Payment Management Integration Guide

## 📋 Overview
Payment management has been integrated into the bilty creation and printing workflow. Users can now add payment details (advance amount, payment method, etc.) directly after saving a bilty.

## 🎯 Implementation Summary

### Files Created

#### 1. **PaymentForm Component** (`src/components/bilty/payment-form.js`)
- Compact form for collecting payment details
- Fields:
  - Payment Mode (Cash, Online, Partial, FOC)
  - Advance Amount (for non-FOC modes)
  - Payment Method (Cash, Cheque, Bank Transfer, UPI)
  - Reference Number (optional - for cheque/transaction IDs)
  - Notes (optional)
- Auto-calculates remaining amount
- Validates amount doesn't exceed total
- Calls `/api/bilty/payment/save` endpoint
- Shows success/error messages

#### 2. **PaymentStatus Component** (`src/components/bilty/payment-status.js`)
- Displays payment status summary card
- Shows:
  - Payment Status badge (PENDING, PARTIAL, PAID, FOC)
  - Total Amount
  - Advance Paid
  - Remaining Amount
  - Visual progress bar (% Paid)
- Color-coded status indicators

### Files Modified

#### 1. **Print Modal** (`src/components/bilty/print-model.js`)
- Added PaymentForm and PaymentStatus component imports
- Added state management for payment form visibility and status
- Added toggle button: "💳 Add Payment Details"
- Integrated payment form in the right column of the modal
- Displays payment status after successful payment save
- Resets payment states when modal closes/opens

#### 2. **Bilty Page** (`src/app/bilty/page.js`)
- Added imports for PaymentForm and PaymentStatus components
- Added state variables:
  - `showPaymentForm` - controls payment form visibility
  - `paymentStatus` - stores payment response data
- Passes payment state to PrintModal component
- Print modal can now manage payment details independently

## 🚀 How It Works

### User Flow
1. User creates a bilty and clicks "Save" or "Save & Print"
2. Bilty is saved successfully
3. Print Modal opens with bilty details
4. User can optionally click "💳 Add Payment Details" button
5. Payment form expands with fields
6. User enters payment information
7. Form validates and sends to `/api/bilty/payment/save`
8. On success:
   - Payment status card displays payment information
   - Form closes automatically
9. User can proceed with printing or close the modal

### API Integration
**Endpoint**: `POST https://api.movesure.io/api/bilty/payment/save`

**Request Body**:
```json
{
  "bilty_id": "uuid",
  "payment_mode": "cash|online|partial|foc",
  "advance_amount": 5000,
  "payment_date": "2026-05-15",
  "payment_method": "cash|cheque|bank_transfer|upi",
  "reference_number": "CHQ123456",
  "notes": "advance payment",
  "add_transaction": {
    "amount": 5000,
    "method": "cash",
    "reference": "CHQ123456",
    "notes": "initial advance"
  }
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "payment_status": "PARTIAL",
    "advance_amount": 5000,
    "remaining_amount": 3000
  }
}
```

## 🎨 UI/UX Features

### Payment Form
- **Compact Design**: Small inputs suitable for modal context
- **Smart Fields**: Only shows amount fields if payment mode is not "FOC"
- **Real-time Calculation**: Shows remaining amount as user types
- **Validation**: Prevents invalid amounts
- **Loading State**: Shows spinner during save
- **Success Feedback**: Displays success message and auto-closes

### Payment Status
- **Color-coded Badges**: 
  - Red (PENDING)
  - Yellow (PARTIAL)
  - Green (PAID)
  - Blue (FOC)
- **Progress Bar**: Visual indication of payment completion %
- **Amount Details**: Clear breakdown of paid vs remaining

## ⚙️ Technical Details

### State Management
- Payment form state can be managed at:
  - **Parent Level** (page.js): For persistent state across modal reopens
  - **Local Level** (print-model.js): For independent form management
- Props-based approach allows flexibility

### Error Handling
- Network errors: Shows user-friendly error messages
- Validation errors: Displays specific validation feedback
- Amount validation: Ensures advance ≤ total amount

### Loading States
- Form disables during save operation
- Spinner appears while API request is in progress
- Success state shown briefly before closing

## 📝 Usage Examples

### Example 1: After Bilty Save
```
User clicks "Save" → Bilty saves → Print Modal opens → 
User clicks "Add Payment Details" → Form appears → 
User enters advance amount ₹5000 → Click "Save Payment" → 
Payment saved successfully → Status card shows PARTIAL status
```

### Example 2: Multiple Payments
```
User saves bilty → Adds first payment (₹5000) → Status shows PARTIAL →
Later, user can save another bilty and track its payment separately
```

## 🔒 Security Notes
- Payment amounts validated on backend
- Reference numbers for audit trail only
- Transaction history is immutable (append-only)
- Payment data inherits same access controls as bilty record

## 🐛 Testing Checklist
- [ ] Create new bilty and save
- [ ] Click "Add Payment Details" in print modal
- [ ] Test FOC mode (no amount fields shown)
- [ ] Test amount validation (enter amount > total)
- [ ] Test all payment methods
- [ ] Test successful payment save
- [ ] Verify payment status displays correctly
- [ ] Test error message for network failures
- [ ] Close and reopen modal - payment form resets
- [ ] Save multiple bilties with different payment statuses

## 🚀 Future Enhancements
- Payment history view (list of all transactions)
- Payment receipt generation
- Bulk payment management
- Payment scheduling/reminders
- Payment reconciliation reports
- Integration with accounting module

---

**Last Updated**: 2026-05-15
**Components**: 2 new, 2 modified
**Build Status**: ✅ Successful
