'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { deliveryApi } from './api';
import { todayLocalDate } from './helpers';
import PaymentModeField from './PaymentModeField';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

export function AddDeliveryIncomeModal({ isOpen, onClose, branchId, userId, onSuccess }) {
  const [grNo, setGrNo] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [bankLedgerId, setBankLedgerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) { setGrNo(''); setAmount(''); setMode('cash'); setBankLedgerId(''); setError(null); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!grNo.trim()) { setError('Enter the GR number'); return; }
    if (!amount || Number(amount) <= 0) { setError('Enter an amount'); return; }

    setSaving(true);
    setError(null);
    try {
      // Send the browser's own local date — never rely on the server's
      // clock/timezone to decide what "today" means for this entry.
      const payload = { branch_id: branchId, gr_no: grNo.trim(), amount: Number(amount), payment_mode: mode, date: todayLocalDate(), created_by: userId };
      if (mode === 'bank' && bankLedgerId) payload.bank_ledger_id = bankLedgerId;
      await deliveryApi.income(payload);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to add income');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-black">Add Income</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-black mb-1">GR No</label>
            <input type="text" value={grNo} onChange={(e) => setGrNo(e.target.value)} className={inputCls} placeholder="5142" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Delivery Amount</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Cash or Bank?</label>
            <PaymentModeField branchId={branchId} mode={mode} onModeChange={setMode} bankLedgerId={bankLedgerId} onBankChange={setBankLedgerId} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Income
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// No more expense-ledger picker — every delivery expense now posts to the
// same "Delivery Expense" ledger automatically; `category` is just free-text
// shown in the narration (e.g. "Fuel", "Auto Rickshaw"), for readability only.
export function AddDeliveryExpenseModal({ isOpen, onClose, branchId, userId, onSuccess }) {
  const [grNo, setGrNo] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [bankLedgerId, setBankLedgerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) { setGrNo(''); setCategory(''); setAmount(''); setMode('cash'); setBankLedgerId(''); setError(null); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError('Enter an amount'); return; }

    setSaving(true);
    setError(null);
    try {
      // Send the browser's own local date — never rely on the server's
      // clock/timezone to decide what "today" means for this entry.
      const payload = {
        branch_id: branchId,
        gr_no: grNo.trim() || undefined,
        category: category.trim() || undefined,
        amount: Number(amount),
        payment_mode: mode,
        date: todayLocalDate(),
        created_by: userId,
      };
      if (mode === 'bank' && bankLedgerId) payload.bank_ledger_id = bankLedgerId;
      await deliveryApi.expense(payload);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to add expense');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-black">Add Expense</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-black mb-1">GR No (optional)</label>
            <input type="text" value={grNo} onChange={(e) => setGrNo(e.target.value)} className={inputCls} placeholder="5140" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">What kind of expense? (optional)</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} placeholder="e.g. Fuel, Auto Rickshaw" />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Amount</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="150" />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Cash or Bank?</label>
            <PaymentModeField branchId={branchId} mode={mode} onModeChange={setMode} bankLedgerId={bankLedgerId} onBankChange={setBankLedgerId} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
