'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Search, CheckCircle2 } from 'lucide-react';
import { partyLedgersApi } from '../api';
import { formatINR, formatDate } from '../helpers';
import { biltyGroupsApi } from '@/components/manual/station-bilty-api';
import { inputCls } from './shared';

// Search regular + manual bilties (by GR / party / bilty group) and add the ticked ones to this ledger.
export default function AddBiltiesModal({ isOpen, onClose, ledger, isParty, userId, onAdded }) {
  const [filters, setFilters] = useState({});
  const [groups, setGroups] = useState([]);
  const [rows, setRows] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState({}); // key -> item
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setFilters({ q: '', bilty_type: 'both', payment_mode: '', from_date: '', to_date: '', group_id: '' });
    setRows([]); setSelected({}); setResult(null); setError(null); setSaving(false);
    biltyGroupsApi.list().then(setGroups).catch(() => setGroups([]));
  }, [isOpen]);

  if (!isOpen) return null;
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const keyOf = (r) => `${r.bilty_type}:${r.bilty_id}`;

  const search = async (e) => {
    e?.preventDefault();
    if (!filters.q.trim() && !filters.group_id && !filters.from_date) {
      setError('Type a GR no / party name, pick a group, or set a date');
      return;
    }
    setSearching(true);
    setError(null);
    setResult(null);
    try {
      const res = await partyLedgersApi.biltySearch({
        q: filters.q.trim(),
        bilty_type: filters.bilty_type,
        payment_mode: filters.payment_mode,
        from_date: filters.from_date,
        to_date: filters.to_date,
        group_id: filters.group_id,
        limit: 100
      });
      setRows(res.data || []);
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const selectable = rows.filter((r) => !r.in_ledger);
  const allTicked = selectable.length > 0 && selectable.every((r) => selected[keyOf(r)]);
  const toggleAll = () => {
    if (allTicked) setSelected({});
    else setSelected(Object.fromEntries(selectable.map((r) => [keyOf(r), r])));
  };
  const picked = Object.values(selected);
  const pickedTotal = picked.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const handleAdd = async () => {
    if (!picked.length) return;
    setSaving(true);
    setError(null);
    try {
      const res = await partyLedgersApi.addBilties(ledger.id, {
        items: picked.map((r) => ({ bilty_type: r.bilty_type, bilty_id: r.bilty_id })),
        added_by: userId
      });
      const d = res.data || res;
      setResult({ added: d.added || [], addedCount: d.added_count ?? (d.added || []).length, skipped: d.skipped || [] });
      setSelected({});
      onAdded?.();
      search();
    } catch (err) {
      setError(err.message || 'Failed to add bilties');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-black">Add Bilties — {ledger?.name}</h3>
            {isParty && <p className="text-xs text-gray-500">Party ledgers only accept this party&apos;s bilties under the paid / to-pay rule; others are skipped with the reason.</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>

        <form onSubmit={search} className="p-4 border-b border-gray-100 grid grid-cols-2 md:grid-cols-6 gap-2">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={filters.q} onChange={(e) => set('q', e.target.value)} placeholder="GR no, consignor or consignee"
              className={`${inputCls} pl-9`} autoFocus />
          </div>
          <select value={filters.bilty_type} onChange={(e) => set('bilty_type', e.target.value)} className={inputCls}>
            <option value="both">Regular + Manual</option>
            <option value="regular">Regular only</option>
            <option value="manual">Manual only</option>
          </select>
          <select value={filters.payment_mode} onChange={(e) => set('payment_mode', e.target.value)} className={inputCls}>
            <option value="">Any payment</option>
            <option value="paid">Paid</option>
            <option value="to-pay">To Pay</option>
            <option value="foc">FOC</option>
          </select>
          <select value={filters.group_id} onChange={(e) => set('group_id', e.target.value)} className={inputCls}>
            <option value="">Any group</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button type="submit" disabled={searching}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </button>
          <input type="date" value={filters.from_date} onChange={(e) => set('from_date', e.target.value)} className={inputCls} title="From date" />
          <input type="date" value={filters.to_date} onChange={(e) => set('to_date', e.target.value)} className={inputCls} title="To date" />
        </form>

        <div className="flex-1 overflow-auto">
          {error && (
            <div className="m-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {result && (
            <div className="m-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-black">
              <div className="flex items-center gap-2 font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4" /> {result.addedCount} added{result.added.length ? `: ${result.added.join(', ')}` : ''}
              </div>
              {result.skipped.length > 0 && (
                <ul className="mt-1 text-xs text-amber-800 list-disc pl-5">
                  {result.skipped.map((s, i) => <li key={i}><b>{s.gr_no}</b>: {s.reason}</li>)}
                </ul>
              )}
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-black sticky top-0">
              <tr>
                <th className="px-3 py-2 w-8"><input type="checkbox" className="accent-emerald-600" checked={allTicked} onChange={toggleAll} /></th>
                <th className="text-left px-3 py-2">GR No</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Consignor</th>
                <th className="text-left px-3 py-2">Consignee</th>
                <th className="text-left px-3 py-2">Payment</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-black">
              {!searching && rows.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-gray-500">Search to list bilties</td></tr>
              )}
              {rows.map((r) => {
                const k = keyOf(r);
                const inThis = r.in_ledger?.ledger_id === ledger?.id;
                return (
                  <tr key={k} className={r.in_ledger ? 'bg-gray-50 text-gray-500' : 'hover:bg-emerald-50/40'}>
                    <td className="px-3 py-2">
                      <input type="checkbox" className="accent-emerald-600" disabled={!!r.in_ledger}
                        checked={!!selected[k]}
                        onChange={(e) => setSelected((s) => {
                          const n = { ...s };
                          if (e.target.checked) n[k] = r; else delete n[k];
                          return n;
                        })} />
                    </td>
                    <td className="px-3 py-2 font-semibold">{r.gr_no}{r.station ? <span className="text-xs text-gray-500"> · {r.station}</span> : ''}</td>
                    <td className="px-3 py-2">{formatDate(r.bilty_date)}</td>
                    <td className="px-3 py-2 text-xs capitalize">{r.bilty_type}</td>
                    <td className="px-3 py-2">{r.consignor || '-'}</td>
                    <td className="px-3 py-2">{r.consignee || '-'}</td>
                    <td className="px-3 py-2 text-xs uppercase">{r.payment_mode || '-'}</td>
                    <td className="px-3 py-2 text-right">₹{formatINR(r.amount)}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.in_ledger ? (inThis ? 'Already here' : `In ${r.in_ledger.ledger_name}`) : (Number(r.amount) ? '' : 'FOC - no voucher')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
          <span className="mr-auto text-sm text-black">{picked.length} selected · ₹{formatINR(pickedTotal)}</span>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Close</button>
          <button onClick={handleAdd} disabled={saving || !picked.length}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add {picked.length || ''} to ledger
          </button>
        </div>
      </div>
    </div>
  );
}
