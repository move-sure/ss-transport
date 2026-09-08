'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { formatINR, todayLocalDate } from './helpers';

const CHARGE_FIELDS = [
  { key: 'unloading', label: 'Unloading' },
  { key: 'crossing', label: 'Crossing' },
  { key: 'dala_munshiyana', label: 'Dala Munshiyana' },
  { key: 'labour_wage', label: 'Labour Wage' },
  { key: 'other_charge', label: 'Other Charge' },
];

// Itemized labour expense — the total is always the sum of the charge
// fields below, never typed in directly, so the breakdown and the total
// can never disagree.
export default function AddLabourExpenseModal({ isOpen, onClose, subtitle, onSubmit }) {
  const [challanNo, setChallanNo] = useState('');
  const [weight, setWeight] = useState('');
  const [charges, setCharges] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) { setChallanNo(''); setWeight(''); setCharges({}); setError(null); }
  }, [isOpen]);

  const total = useMemo(
    () => CHARGE_FIELDS.reduce((sum, f) => sum + (Number(charges[f.key]) || 0), 0),
    [charges]
  );

  if (!isOpen) return null;

  const setCharge = (key, val) => setCharges((c) => ({ ...c, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (total <= 0) { setError('Fill in at least one charge'); return; }

    setSaving(true);
    setError(null);
    try {
      // Send the browser's own local date — never rely on the server's
      // clock/timezone to decide what "today" means for this entry.
      const payload = { date: todayLocalDate() };
      if (challanNo.trim()) payload.challan_no = challanNo.trim();
      if (weight) payload.weight = Number(weight);
      CHARGE_FIELDS.forEach((f) => {
        const val = Number(charges[f.key]);
        if (val > 0) payload[f.key] = val;
      });
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
          <h3 className="text-lg font-bold text-black">Add Expense</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {subtitle && <p className="text-sm text-black">{subtitle}</p>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Challan No</label>
              <input type="text" value={challanNo} onChange={(e) => setChallanNo(e.target.value)} className={inputCls} placeholder="e.g. 0350" />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Weight (optional)</label>
              <input type="number" step="0.01" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} placeholder="e.g. 4500" />
            </div>
          </div>

          <div className="space-y-3">
            {CHARGE_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <label className="text-sm text-black w-36 flex-shrink-0">{f.label}</label>
                <input
                  type="number" step="0.01" min="0"
                  value={charges[f.key] || ''}
                  onChange={(e) => setCharge(f.key, e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-sm font-semibold text-black">Total</span>
            <span className="text-lg font-bold text-emerald-700">₹{formatINR(total)}</span>
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
