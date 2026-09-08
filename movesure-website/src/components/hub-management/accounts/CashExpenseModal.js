'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cashManagerApi, ledgerApi } from './api';
import { todayLocalDate } from './helpers';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

// A plain cash expense straight from the cash box — rent, tea, stationery,
// whatever doesn't belong to Delivery / Truck Bhada / Labour Kharcha.
export default function CashExpenseModal({ isOpen, onClose, branchId, userId, onSuccess }) {
  const [expenseLedgerId, setExpenseLedgerId] = useState('');
  const [expenseLedgers, setExpenseLedgers] = useState([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  const [amount, setAmount] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setExpenseLedgerId(''); setAmount(''); setReferenceNo(''); setError(null);
    (async () => {
      setLoadingLedgers(true);
      try {
        const groupsRes = await ledgerApi.groups.list({ is_active: true });
        const expenseGroups = (groupsRes.data || []).filter((g) => g.nature === 'expense');
        const ledgerLists = await Promise.all(
          expenseGroups.map((g) => ledgerApi.ledgers.list({ branch_id: branchId, group_id: g.id, is_active: true, page_size: 50 }))
        );
        setExpenseLedgers(ledgerLists.flatMap((r) => r.data?.rows || []));
      } catch (_) {
        setExpenseLedgers([]);
      } finally {
        setLoadingLedgers(false);
      }
    })();
  }, [isOpen, branchId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!expenseLedgerId) { setError('Pick an expense type'); return; }
    if (!amount || Number(amount) <= 0) { setError('Enter an amount'); return; }

    setSaving(true);
    setError(null);
    try {
      // Send the browser's own local date — never rely on the server's
      // clock/timezone to decide what "today" means for this entry.
      const res = await cashManagerApi.expense({
        branch_id: branchId,
        expense_ledger_id: expenseLedgerId,
        amount: Number(amount),
        reference_no: referenceNo.trim() || undefined,
        date: todayLocalDate(),
        created_by: userId,
      });
      onSuccess(res.data);
    } catch (err) {
      setError(err.message || 'Failed to add expense');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-black">Cash Expense</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Expense Type</label>
            {loadingLedgers ? (
              <Loader2 className="w-4 h-4 text-black animate-spin" />
            ) : expenseLedgers.length > 0 ? (
              <select value={expenseLedgerId} onChange={(e) => setExpenseLedgerId(e.target.value)} className={inputCls}>
                <option value="">— Select —</option>
                {expenseLedgers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            ) : (
              <p className="text-sm text-black">No expense ledgers yet — add one in Ledger Master first.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Amount</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="e.g. 200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Reference (optional)</label>
            <input type="text" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className={inputCls} placeholder="e.g. Tea for office" />
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
