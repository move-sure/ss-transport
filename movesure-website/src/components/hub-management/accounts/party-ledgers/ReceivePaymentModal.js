'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { partyLedgersApi } from '../api';
import { formatINR, formatDate, todayLocalDate } from '../helpers';
import PaymentModeField from '../PaymentModeField';
import { inputCls } from './shared';

/**
 * Receive Payment: tick the bilty bills it settles (amount auto-fills, editable for part payment).
 * Anything above the ticked total stays "on account".
 */
export default function ReceivePaymentModal({ isOpen, onClose, ledger, openBills = [], userId, onSaved }) {
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [mode, setMode] = useState('cash');
  const [bankLedgerId, setBankLedgerId] = useState('');
  const [date, setDate] = useState(todayLocalDate());
  const [narration, setNarration] = useState('');
  const [alloc, setAlloc] = useState({}); // bill id -> amount string
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setAmount(''); setAmountTouched(false); setMode('cash'); setBankLedgerId('');
    setDate(todayLocalDate()); setNarration(''); setAlloc({}); setFilter(''); setError(null); setSaving(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const allocTotal = Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0);
  const effectiveAmount = amountTouched ? Number(amount) || 0 : allocTotal;
  const onAccount = Math.max(0, effectiveAmount - allocTotal);

  const toggle = (bill, on) => setAlloc((a) => {
    const n = { ...a };
    if (on) n[bill.id] = String(bill.balance_amount ?? bill.bill_amount ?? 0); else delete n[bill.id];
    return n;
  });

  const visible = openBills.filter((b) => !filter.trim() || String(b.reference_no || '').toUpperCase().includes(filter.trim().toUpperCase()));
  const allTicked = visible.length > 0 && visible.every((b) => alloc[b.id] !== undefined);

  const handleSave = async (e) => {
    e.preventDefault();
    if (effectiveAmount <= 0) { setError('Enter the amount received'); return; }
    if (allocTotal - effectiveAmount > 0.005) { setError(`Bills ticked (₹${formatINR(allocTotal)}) are more than the amount (₹${formatINR(effectiveAmount)})`); return; }
    const allocations = Object.entries(alloc)
      .map(([id, v]) => ({ bill_reference_id: id, amount: Number(v) || 0 }))
      .filter((a) => a.amount > 0);
    setSaving(true);
    setError(null);
    try {
      await partyLedgersApi.collect(ledger.id, {
        branch_id: ledger.branch_id,
        amount: effectiveAmount,
        payment_mode: mode,
        bank_ledger_id: mode === 'bank' && bankLedgerId ? bankLedgerId : null,
        ...(allocations.length ? { allocations } : {}),
        date,
        narration: narration.trim() || null,
        created_by: userId
      });
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Failed to save payment');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-black">Receive Payment — {ledger?.name}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-auto">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Amount received (₹)</label>
              <input type="number" step="0.01" min="0"
                value={amountTouched ? amount : (allocTotal ? String(allocTotal) : '')}
                onChange={(e) => { setAmountTouched(true); setAmount(e.target.value); }}
                className={inputCls} placeholder="0" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <PaymentModeField branchId={ledger?.branch_id} mode={mode} onModeChange={setMode}
            bankLedgerId={bankLedgerId} onBankChange={setBankLedgerId} />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-black">Settle bilties ({openBills.length} open)</label>
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter GR no"
                className="px-2 py-1 border border-gray-300 rounded text-xs text-black w-36" />
            </div>
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-black sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input type="checkbox" className="accent-emerald-600" checked={allTicked}
                        onChange={(e) => visible.forEach((b) => toggle(b, e.target.checked))} />
                    </th>
                    <th className="text-left px-3 py-2">GR No</th>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-right px-3 py-2">Due</th>
                    <th className="text-right px-3 py-2 w-32">Pay now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-black">
                  {visible.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-500">No open bilties</td></tr>}
                  {visible.map((b) => {
                    const on = alloc[b.id] !== undefined;
                    return (
                      <tr key={b.id} className={on ? 'bg-emerald-50/50' : ''}>
                        <td className="px-3 py-1.5"><input type="checkbox" className="accent-emerald-600" checked={on} onChange={(e) => toggle(b, e.target.checked)} /></td>
                        <td className="px-3 py-1.5 font-semibold">{b.reference_no}</td>
                        <td className="px-3 py-1.5">{formatDate(b.reference_date || b.bill_date)}</td>
                        <td className="px-3 py-1.5 text-right">₹{formatINR(b.balance_amount)}</td>
                        <td className="px-3 py-1.5 text-right">
                          {on && (
                            <input type="number" step="0.01" min="0" value={alloc[b.id]}
                              onChange={(e) => setAlloc((a) => ({ ...a, [b.id]: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Narration</label>
            <input value={narration} onChange={(e) => setNarration(e.target.value)} className={inputCls} placeholder="e.g. October payment" />
          </div>

          <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-black flex flex-wrap gap-x-6">
            <span>Against bilties: <b>₹{formatINR(allocTotal)}</b></span>
            <span>On account: <b>₹{formatINR(onAccount)}</b></span>
            <span>Total: <b>₹{formatINR(effectiveAmount)}</b></span>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Receipt
          </button>
        </div>
      </form>
    </div>
  );
}
