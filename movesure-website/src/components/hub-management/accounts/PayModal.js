'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { formatINR, todayLocalDate } from './helpers';
import PaymentModeField from './PaymentModeField';

/**
 * Shared "how much, cash or bank" form — used for Collect Payment / Give
 * Payment (transporters) and Pay (drivers, labour). `bills` is the list of
 * still-open bills to optionally tag the payment against; pass `[]` to hide
 * that picker entirely (e.g. Give Payment, which is never against a bill).
 */
export default function PayModal({ isOpen, onClose, title, subtitle, bills = [], branchId, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [bankLedgerId, setBankLedgerId] = useState('');
  const [billId, setBillId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) { setAmount(''); setMode('cash'); setBankLedgerId(''); setBillId(''); setError(null); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBillChange = (id) => {
    setBillId(id);
    const bill = bills.find((b) => b.id === id);
    if (bill) setAmount(String(bill.balance_amount));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError('Enter an amount'); return; }

    setSaving(true);
    setError(null);
    try {
      // Send the browser's own local date — never rely on the server's
      // clock/timezone to decide what "today" means for this entry.
      const payload = { amount: Number(amount), payment_mode: mode, date: todayLocalDate() };
      if (mode === 'bank' && bankLedgerId) payload.bank_ledger_id = bankLedgerId;
      if (billId) payload.bill_reference_id = billId;
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || 'Failed to save');
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-bold text-black">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {subtitle && <p className="text-sm text-black">{subtitle}</p>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

          {bills.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-black mb-1">Against which bill? (optional)</label>
              <select value={billId} onChange={(e) => handleBillChange(e.target.value)} className={inputCls}>
                <option value="">— Not against a specific bill —</option>
                {bills.map((b) => (
                  <option key={b.id} value={b.id}>{b.reference_no} — ₹{formatINR(b.balance_amount)} due</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-1">How much?</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Cash or Bank?</label>
            <PaymentModeField
              branchId={branchId}
              mode={mode}
              onModeChange={setMode}
              bankLedgerId={bankLedgerId}
              onBankChange={setBankLedgerId}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
