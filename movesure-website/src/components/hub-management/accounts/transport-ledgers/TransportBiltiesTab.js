'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Search, Undo2 } from 'lucide-react';
import { transportLedgersApi } from '../api';
import { formatINR, formatDate } from '../helpers';
import { customAlert } from '@/components/common/alert-system';
import { KAAT_SOURCE_LABEL } from './shared';

const PAGE_SIZE = 50;

// Bilties posted into a transport ledger: kaat / dd / pf per bilty, outstanding, unassign.
export default function TransportBiltiesTab({ ledgerId, userId, reloadKey, onChanged }) {
  const [filters, setFilters] = useState({ payment_mode: '', status: '', challan_no: '', q: '' });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await transportLedgersApi.bilties(ledgerId, {
        payment_mode: applied.payment_mode || undefined,
        status: applied.status || undefined,
        challan_no: applied.challan_no.trim() || undefined,
        q: applied.q.trim() || undefined,
        page, page_size: PAGE_SIZE
      });
      setData(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load bilties');
    } finally {
      setLoading(false);
    }
  }, [ledgerId, applied, page]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const unassign = async (row) => {
    const reason = window.prompt(`Take ${row.gr_no} out of this transport ledger?\nIts voucher will be cancelled and the bilty goes back to Unassigned.\n\nReason:`, 'Wrong transport');
    if (reason === null) return;
    setBusyId(row.id);
    try {
      await transportLedgersApi.unassign(ledgerId, row.id, { user_id: userId, reason: reason || 'Unassigned' });
      customAlert(`${row.gr_no} unassigned`, 'success');
      load();
      onChanged?.();
    } catch (err) {
      customAlert(err.message || 'Failed to unassign', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const apply = (e) => { e?.preventDefault(); setApplied(filters); setPage(1); };
  const sel = 'px-3 py-2 border border-gray-300 rounded-lg text-sm text-black';

  return (
    <div>
      <form onSubmit={apply} className="flex flex-wrap items-center gap-2 mb-3">
        <select value={filters.payment_mode} onChange={(e) => { set('payment_mode', e.target.value); setApplied({ ...filters, payment_mode: e.target.value }); setPage(1); }} className={sel}>
          <option value="">To-pay + Paid</option>
          <option value="to-pay">To-pay (Dr pf)</option>
          <option value="paid">Paid (Cr kaat)</option>
        </select>
        <select value={filters.status} onChange={(e) => { set('status', e.target.value); setApplied({ ...filters, status: e.target.value }); setPage(1); }} className={sel}>
          <option value="">Open + Settled</option>
          <option value="open">Open</option>
          <option value="settled">Settled</option>
        </select>
        <input value={filters.challan_no} onChange={(e) => set('challan_no', e.target.value)} placeholder="Challan no" className={`${sel} w-32`} />
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={filters.q} onChange={(e) => set('q', e.target.value)} placeholder="GR / station / party" className={`${sel} pl-9 w-56`} />
        </div>
        <button type="submit" className="px-3 py-2 text-sm font-semibold bg-gray-100 rounded-lg hover:bg-gray-200">Search</button>
      </form>

      {error && (
        <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-black uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2.5">GR</th>
              <th className="text-left px-3 py-2.5">Challan</th>
              <th className="text-left px-3 py-2.5">Date</th>
              <th className="text-left px-3 py-2.5">Station</th>
              <th className="text-left px-3 py-2.5">Consignor</th>
              <th className="text-left px-3 py-2.5">Consignee</th>
              <th className="text-left px-3 py-2.5">Mode</th>
              <th className="text-right px-3 py-2.5">Total</th>
              <th className="text-right px-3 py-2.5">Wt</th>
              <th className="text-right px-3 py-2.5">Kaat</th>
              <th className="text-right px-3 py-2.5">DD</th>
              <th className="text-right px-3 py-2.5">pf</th>
              <th className="text-right px-3 py-2.5">Outstanding</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-black">
            {loading && <tr><td colSpan={14} className="py-10 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={14} className="py-10 text-center text-gray-500">No bilties</td></tr>}
            {!loading && rows.map((r) => {
              const pf = Number(r.pf) || 0;
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">
                    {r.gr_no}
                    {r.needs_review && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold"
                        title={typeof r.needs_review === 'string' ? r.needs_review : (r.review_reason || r.needs_review_reason || 'Needs review')}>REVIEW</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{r.challan_no || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.bilty_date || r.date)}</td>
                  <td className="px-3 py-2 font-medium">{r.station || '-'}</td>
                  <td className="px-3 py-2 max-w-[150px] truncate" title={r.consignor}>{r.consignor || '-'}</td>
                  <td className="px-3 py-2 max-w-[150px] truncate" title={r.consignee}>{r.consignee || '-'}</td>
                  <td className="px-3 py-2 uppercase">{r.payment_mode}</td>
                  <td className="px-3 py-2 text-right">{formatINR(r.total)}</td>
                  <td className="px-3 py-2 text-right">{r.weight ?? ''}</td>
                  <td className="px-3 py-2 text-right" title={`${r.kaat_rate ?? ''} · ${KAAT_SOURCE_LABEL[r.kaat_source] || r.kaat_source || ''}`}>
                    {formatINR(r.kaat)}{r.kaat_source === 'hub_rate' && <span className="text-[9px] text-purple-700 ml-0.5">rate</span>}
                  </td>
                  <td className="px-3 py-2 text-right">{Number(r.dd) ? formatINR(r.dd) : ''}</td>
                  <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${pf >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatINR(Math.abs(pf))} {pf >= 0 ? 'Dr' : 'Cr'}</td>
                  <td className="px-3 py-2 text-right">
                    {r.is_settled ? <span className="text-[10px] font-semibold text-emerald-700">Settled</span> : formatINR(r.outstanding)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => unassign(r)} disabled={busyId === r.id} title="Unassign"
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50">
                      {busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-3 text-sm text-black">
          <span>{total} bilties</span>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
          <span>Page {page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
