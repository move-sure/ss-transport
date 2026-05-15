'use client';

import React, { useState } from 'react';
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const BILTY_API_URL = 'https://api.movesure.io';

export default function PaymentForm({
  biltyId,
  totalAmount,
  onPaymentSaved,
  onClose,
  initialPaymentMode = 'cash',
  initialAdvanceAmount = '',
  initialReferenceNumber = '',
  initialNotes = ''
}) {
  const [paymentMode, setPaymentMode] = useState(initialPaymentMode);
  const [advanceAmount, setAdvanceAmount] = useState(initialAdvanceAmount);
  const [referenceNumber, setReferenceNumber] = useState(initialReferenceNumber);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const advanceAmountNum = parseFloat(advanceAmount) || 0;
  const remainingAmount = totalAmount - advanceAmountNum;

  // No client-side validation - let backend handle all validation
  const isValid = true;

  const handleSave = async (e) => {
    e.preventDefault();
    // No client-side validation - backend will handle all validation
    if (!isValid) {
      setError('Unable to save payment');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const amount = parseFloat(advanceAmount) || 0;

      const payload = {
        bilty_id: biltyId,
        payment_mode: paymentMode,
        advance_amount: amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMode,
        reference_number: referenceNumber || null,
        notes: notes || null,
        add_transaction: {
          amount: amount,
          method: paymentMode,
          reference: referenceNumber || null,
          notes: notes || null
        }
      };

      console.log('💾 Sending payment payload:', payload);
      console.log('Selected Payment Mode:', paymentMode);

      const res = await fetch(`${BILTY_API_URL}/api/bilty/payment/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      console.log('📥 API Response:', result);
      console.log('Returned Payment Status:', result.data?.payment_status || result.payment_status);

      if (result.status !== 'success') {
        // Handle backend validation errors
        let errorMsg = result.message || 'Failed to save payment';

        // If total is 0 and error is about exceeding total, provide helpful message
        if (totalAmount === 0 && errorMsg.includes('cannot exceed total')) {
          errorMsg = '⚠️ This bilty has no freight amount. Please ensure the advance amount is valid for this shipment.';
        }

        setError(errorMsg);
        return;
      }

      setSuccess(true);
      if (onPaymentSaved) onPaymentSaved(result.data);

      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      console.error('Payment save error:', err);
      setError(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle2 className="w-10 h-10 text-green-600 mb-2" />
        <p className="text-green-700 font-semibold">Payment saved successfully!</p>
        <p className="text-sm text-green-600">Status: {success.payment_status || 'Updated'}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-4 h-4" />
        <h3 className="text-sm font-bold text-gray-900">Add Payment Details</h3>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        {/* Payment Mode */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Mode</label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-700"
          >
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="partial">Partial</option>
            <option value="foc">Free of Charge</option>
          </select>
        </div>

        {/* Amount Fields - Only show if not FOC */}
        {paymentMode !== 'foc' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Total Amount: ₹{totalAmount.toFixed(2)}
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Advance Amount</label>
              <input
                type="number"
                min="0"
                max={totalAmount > 0 ? totalAmount : undefined}
                step="0.01"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-700"
              />
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              Advance: ₹{advanceAmountNum.toFixed(2)} | Remaining: ₹{remainingAmount.toFixed(2)}
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reference Number (Optional)</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Cheque/Transaction ID"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-700"
              />
            </div>

            {/* Payment Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
              <select
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-700"
              >
                <option value="">-- Select --</option>
                <option value="All Paid">✓ All Paid</option>
                <option value="Not Paid Yet">✕ Not Paid Yet</option>
              </select>
            </div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            {saving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </>
            ) : (
              '✓ Save Payment'
            )}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-all duration-200"
            >
              ✕ Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
