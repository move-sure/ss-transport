'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * Generic "add a new account" form — Transporter / Driver / Labourer all just
 * need a name plus a couple of optional fields, so one form covers all three.
 * `fields`: [{ key, label, placeholder?, required? }]
 */
export default function AddPartyModal({ isOpen, onClose, title, fields, onSubmit }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) { setValues({}); setError(null); }
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (key, val) => setValues((v) => ({ ...v, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !values[f.key]?.trim());
    if (missing) { setError(`${missing.label} is required`); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = {};
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-black">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          {fields.map((f, i) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-black mb-1">{f.label}</label>
              <input
                type="text"
                value={values[f.key] || ''}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputCls}
                placeholder={f.placeholder}
                autoFocus={i === 0}
              />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
