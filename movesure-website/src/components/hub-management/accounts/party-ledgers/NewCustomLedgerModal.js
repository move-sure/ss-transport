'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { partyLedgersApi } from '../api';
import { todayLocalDate } from '../helpers';
import { inputCls } from './shared';

// New Custom Ledger: a named ledger (e.g. MRM RAMKOLA) you fill with any bilties by hand.
export default function NewCustomLedgerModal({ isOpen, onClose, branches = [], defaultBranchId, userId, onCreated }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      branch_id: defaultBranchId && defaultBranchId !== 'all' ? defaultBranchId : '',
      name: '', phone: '', address: '',
      opening_balance: '', opening_balance_type: 'dr', opening_balance_date: todayLocalDate()
    });
    setSaving(false);
    setError(null);
  }, [isOpen, defaultBranchId]);

  if (!isOpen) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.branch_id) { setError('Select a branch'); return; }
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await partyLedgersApi.create({
        kind: 'custom',
        branch_id: form.branch_id,
        name: form.name.trim().toUpperCase(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        opening_balance: Number(form.opening_balance) || 0,
        opening_balance_type: form.opening_balance_type,
        opening_balance_date: form.opening_balance_date || null,
        created_by: userId
      });
      const data = res.data || {};
      onCreated?.(data.ledger?.id || data.ledger_id || data.id);
    } catch (err) {
      setError(err.message || 'Failed to create ledger');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-black">New Custom Ledger</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Branch</label>
            <select value={form.branch_id} onChange={(e) => set('branch_id', e.target.value)} className={inputCls}>
              <option value="">— Select branch —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Ledger name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={`${inputCls} uppercase`} placeholder="e.g. MRM RAMKOLA" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Address</label>
              <input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Opening (₹)</label>
              <input type="number" step="0.01" min="0" value={form.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Dr / Cr</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button type="button" onClick={() => set('opening_balance_type', 'dr')} className={`flex-1 py-2 text-sm font-bold ${form.opening_balance_type === 'dr' ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>Dr</button>
                <button type="button" onClick={() => set('opening_balance_type', 'cr')} className={`flex-1 py-2 text-sm font-bold ${form.opening_balance_type === 'cr' ? 'bg-rose-600 text-white' : 'bg-white text-black'}`}>Cr</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">As on</label>
              <input type="date" value={form.opening_balance_date} onChange={(e) => set('opening_balance_date', e.target.value)} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-gray-500">After creating, open the ledger and use <b>Add Bilties</b> to pick any regular or manual bilty.</p>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create
          </button>
        </div>
      </form>
    </div>
  );
}
