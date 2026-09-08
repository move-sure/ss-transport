'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { todayLocalDate } from './helpers';

/**
 * Shared "you now owe / they now owe" form — New Bill (transporters), Add
 * Trip Bhada (drivers), Add Expense (labour) are all: an amount plus a
 * couple of reference fields. `fields` (before Amount): [{ key, label,
 * placeholder?, type?, required? }].
 */
export default function AddChargeModal({ isOpen, onClose, title, subtitle, fields, submitLabel = 'Save', onSubmit }) {
  const [values, setValues] = useState({});
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) { setValues({}); setAmount(''); setError(null); }
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (key, val) => setValues((v) => ({ ...v, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !values[f.key]?.trim());
    if (missing) { setError(`${missing.label} is required`); return; }
    if (!amount || Number(amount) <= 0) { setError('Enter an amount'); return; }

    setSaving(true);
    setError(null);
    try {
      // Send the browser's own local date — never rely on the server's
      // clock/timezone to decide what "today" means for this entry.
      const payload = { amount: Number(amount), date: todayLocalDate() };
      fields.forEach((f) => {
        const val = values[f.key]?.trim();
        if (val) payload[f.key] = val;
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
          <h3 className="text-lg font-bold text-black">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {subtitle && <p className="text-sm text-black">{subtitle}</p>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-black mb-1">Amount</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} autoFocus />
          </div>

          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-black mb-1">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={values[f.key] || ''}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputCls}
                placeholder={f.placeholder}
              />
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
