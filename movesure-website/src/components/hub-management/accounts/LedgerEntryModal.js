'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Save } from 'lucide-react';
import { ledgerApi } from './api';
import { todayLocalDate } from './helpers';
import LedgerPicker from './LedgerPicker';

const TYPES = [
  { value: 'journal', label: 'Journal' },
  { value: 'receipt', label: 'Receipt (money received)' },
  { value: 'payment', label: 'Payment (money paid)' },
  { value: 'contra', label: 'Contra (cash ↔ bank)' }
];

/**
 * Post a simple two-line entry on a ledger: this ledger Dr (or Cr) and another ledger
 * the opposite side, same amount. Uses POST /api/ledger/vouchers.
 */
export default function LedgerEntryModal({ isOpen, ledger, userId, onClose, onDone }) {
  const [side, setSide] = useState('dr');
  const [amount, setAmount] = useState('');
  const [against, setAgainst] = useState(null);
  const [date, setDate] = useState(todayLocalDate());
  const [narration, setNarration] = useState('');
  const [type, setType] = useState('journal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setSide('dr');
    setAmount('');
    setAgainst(null);
    setDate(todayLocalDate());
    setNarration('');
    setType('journal');
    setError(null);
  }, [isOpen]);

  if (!isOpen || !ledger) return null;

  const other = side === 'dr' ? 'cr' : 'dr';

  const handleSave = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Enter an amount'); return; }
    if (!against) { setError('Pick the other ledger'); return; }
    if (against.id === ledger.id) { setError('Pick a different ledger for the other side'); return; }

    setSaving(true);
    setError(null);
    try {
      await ledgerApi.vouchers.create({
        branch_id: ledger.branch_id,
        voucher_type: type,
        voucher_date: date,
        narration: narration.trim() || null,
        created_by: userId,
        entries: [
          { ledger_id: ledger.id, entry_type: side, amount: amt },
          { ledger_id: against.id, entry_type: other, amount: amt }
        ]
      });
      onDone?.();
    } catch (err) {
      setError(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onSubmit={handleSave} onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-black">Add Entry — {ledger.name}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-black mb-1">This ledger</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button type="button" onClick={() => setSide('dr')}
                  className={`flex-1 py-2 text-sm font-bold ${side === 'dr' ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>Dr</button>
                <button type="button" onClick={() => setSide('cr')}
                  className={`flex-1 py-2 text-sm font-bold ${side === 'cr' ? 'bg-rose-600 text-white' : 'bg-white text-black'}`}>Cr</button>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-black mb-1">Amount (₹)</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                className={inputCls} autoFocus />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Other ledger <span className="font-normal text-gray-500">(goes {other === 'dr' ? 'Dr' : 'Cr'})</span>
            </label>
            <LedgerPicker value={against} onChange={setAgainst} branchId={ledger.branch_id}
              placeholder="Search Cash, Bank, party, income/expense…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Voucher type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Narration</label>
            <input value={narration} onChange={(e) => setNarration(e.target.value)} className={inputCls}
              placeholder="e.g. Bank interest for October" />
          </div>

          {amount && against && (
            <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-black font-mono">
              {side === 'dr' ? ledger.name : against.name} Dr ₹{amount}<br />
              {'    '}To {side === 'dr' ? against.name : ledger.name} Cr ₹{amount}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Entry
          </button>
        </div>
      </form>
    </div>
  );
}
