'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { todayLocalDate, OWES_LABEL } from './helpers';

function ancestorNames(groupId, flatGroups) {
  const byId = new Map((flatGroups || []).map((g) => [g.id, g]));
  const names = [];
  let current = byId.get(groupId);
  let guard = 0;
  while (current && guard < 20) {
    names.push(current.name);
    current = current.parent_group_id ? byId.get(current.parent_group_id) : null;
    guard += 1;
  }
  return names;
}

function isDebtorCreditorGroup(groupId, flatGroups) {
  return ancestorNames(groupId, flatGroups).some((n) => /sundry\s+(debtors|creditors)/i.test(n));
}

const emptyForm = {
  name: '', group_id: '', opening_balance: 0, opening_balance_type: 'dr',
  opening_balance_date: '', gstin: '', pan: '', address: '', phone: '', email: '',
  city_id: '', credit_period_days: '', credit_limit: '', is_bill_wise: false,
};

export default function LedgerFormModal({ isOpen, onClose, initialData, flatGroups, cities, branchId, onSubmit }) {
  const isEdit = !!initialData?.id;
  const [form, setForm] = useState(emptyForm);
  const [billWiseTouched, setBillWiseTouched] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setBillWiseTouched(false);
    if (initialData) {
      setForm({
        name: initialData.name || '',
        group_id: initialData.group_id || '',
        opening_balance: initialData.opening_balance ?? 0,
        opening_balance_type: initialData.opening_balance_type || 'dr',
        opening_balance_date: initialData.opening_balance_date || todayLocalDate(),
        gstin: initialData.gstin || '', pan: initialData.pan || '', address: initialData.address || '',
        phone: initialData.phone || '', email: initialData.email || '', city_id: initialData.city_id || '',
        credit_period_days: initialData.credit_period_days ?? '', credit_limit: initialData.credit_limit ?? '',
        is_bill_wise: !!initialData.is_bill_wise,
      });
      setShowDetails(true);
    } else {
      setForm({ ...emptyForm, opening_balance_date: todayLocalDate() });
      setShowDetails(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleGroupChange = (groupId) => {
    set('group_id', groupId);
    if (!billWiseTouched) {
      set('is_bill_wise', isDebtorCreditorGroup(groupId, flatGroups));
    }
    if (isDebtorCreditorGroup(groupId, flatGroups)) setShowDetails(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.group_id) { setError('Group is required'); return; }

    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      group_id: form.group_id,
      opening_balance: Number(form.opening_balance) || 0,
      opening_balance_type: form.opening_balance_type,
      opening_balance_date: form.opening_balance_date || todayLocalDate(),
      is_bill_wise: form.is_bill_wise,
    };
    if (!isEdit) payload.branch_id = branchId;
    if (form.gstin.trim()) payload.gstin = form.gstin.trim();
    if (form.pan.trim()) payload.pan = form.pan.trim();
    if (form.address.trim()) payload.address = form.address.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.city_id) payload.city_id = form.city_id;
    if (form.credit_period_days !== '') payload.credit_period_days = Number(form.credit_period_days);
    if (form.credit_limit !== '') payload.credit_limit = Number(form.credit_limit);

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || 'Failed to save ledger');
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-bold text-black">{isEdit ? 'Edit Ledger' : 'New Ledger'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="e.g. Ramesh Transport" />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Group</label>
            <select value={form.group_id} onChange={(e) => handleGroupChange(e.target.value)} className={inputCls}>
              <option value="">— Select group —</option>
              {(flatGroups || []).map((g) => (
                <option key={g.id} value={g.id}>{'—'.repeat(g.depth || 0)} {g.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-black mb-1">Opening Balance</label>
              <input type="number" step="0.01" value={form.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Who owes?</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button type="button" onClick={() => set('opening_balance_type', 'dr')} title={OWES_LABEL.dr}
                  className={`flex-1 py-2 text-xs font-semibold ${form.opening_balance_type === 'dr' ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>They Owe</button>
                <button type="button" onClick={() => set('opening_balance_type', 'cr')} title={OWES_LABEL.cr}
                  className={`flex-1 py-2 text-xs font-semibold ${form.opening_balance_type === 'cr' ? 'bg-rose-600 text-white' : 'bg-white text-black'}`}>You Owe</button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Opening Balance Date</label>
            <input type="date" value={form.opening_balance_date} onChange={(e) => set('opening_balance_date', e.target.value)} className={inputCls} />
          </div>

          <label className="flex items-center gap-2 text-sm text-black">
            <input type="checkbox" checked={form.is_bill_wise}
              onChange={(e) => { setBillWiseTouched(true); set('is_bill_wise', e.target.checked); }}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            Maintain bill-by-bill (enables bill selection in Voucher Entry)
          </label>

          <button type="button" onClick={() => setShowDetails((s) => !s)}
            className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            {showDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Additional Details (GSTIN, address, credit terms…)
          </button>

          {showDetails && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">GSTIN</label>
                  <input type="text" value={form.gstin} onChange={(e) => set('gstin', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">PAN</label>
                  <input type="text" value={form.pan} onChange={(e) => set('pan', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-black mb-1">Address</label>
                <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-black mb-1">City</label>
                <select value={form.city_id} onChange={(e) => set('city_id', e.target.value)} className={inputCls}>
                  <option value="">— None —</option>
                  {(cities || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.city_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Credit Period (days)</label>
                  <input type="number" value={form.credit_period_days} onChange={(e) => set('credit_period_days', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Credit Limit</label>
                  <input type="number" value={form.credit_limit} onChange={(e) => set('credit_limit', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
