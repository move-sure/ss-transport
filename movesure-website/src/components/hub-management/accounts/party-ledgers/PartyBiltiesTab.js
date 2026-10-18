'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Search, Trash2 } from 'lucide-react';
import { partyLedgersApi } from '../api';
import { formatINR, formatDate } from '../helpers';
import { customAlert } from '@/components/common/alert-system';
import { ADDED_VIA_TAG } from './shared';

const PAGE_SIZE = 50;

// billing_status from the API -> label + colour
const statusOf = (r) => {
  if (!Number(r.amount) && !r.voucher_id) return { label: '₹0 bilty - no charge', cls: 'text-amber-700' };
  switch (r.billing_status) {
    case 'part_paid': return { label: 'Part paid', cls: 'text-blue-700' };
    case 'paid': case 'settled': return { label: 'Settled', cls: 'text-emerald-700' };
    case 'to_be_billed': return { label: 'To be billed', cls: 'text-amber-700' };
    default: return r.is_settled ? { label: 'Settled', cls: 'text-emerald-700' } : { label: 'Open', cls: 'text-black' };
  }
};

// Bilties in a party / custom ledger: open / settled filter, search, remove.
export default function PartyBiltiesTab({ ledgerId, userId, reloadKey, onChanged }) {
  const [status, setStatus] = useState('open');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await partyLedgersApi.bilties(ledgerId, {
        status: status || undefined, q: query || undefined, page, page_size: PAGE_SIZE
      });
      setData(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load bilties');
    } finally {
      setLoading(false);
    }
  }, [ledgerId, status, query, page]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const remove = async (row) => {
    const reason = window.prompt(`Remove ${row.gr_no} from this ledger?\nIts Sales voucher will be cancelled.\n\nReason:`, 'Added by mistake');
    if (reason === null) return;
    setRemovingId(row.id);
    try {
      await partyLedgersApi.removeBilty(ledgerId, row.id, { user_id: userId, reason: reason || 'Removed' });
      customAlert(`${row.gr_no} removed`, 'success');
      load();
      onChanged?.();
    } catch (err) {
      customAlert(err.message || 'Failed to remove', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {[['open', 'Open'], ['settled', 'Settled'], ['', 'All']].map(([v, l]) => (
          <button key={l} onClick={() => { setStatus(v); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${status === v ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-black'}`}>{l}</button>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); setPage(1); }} className="relative ml-auto">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search GR no / party"
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-black w-60" />
        </form>
        {data?.open_total != null && (
          <span className="text-sm text-black">Open total: <b>₹{formatINR(data.open_total)}</b></span>
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-black text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">GR No</th>
              <th className="text-left px-4 py-2.5">Date</th>
              <th className="text-left px-4 py-2.5">Consignor</th>
              <th className="text-left px-4 py-2.5">Consignee</th>
              <th className="text-left px-4 py-2.5">Payment</th>
              <th className="text-right px-4 py-2.5">Amount (Dr)</th>
              <th className="text-right px-4 py-2.5">Paid (Cr)</th>
              <th className="text-right px-4 py-2.5">Balance</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Added</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-black">
            {loading && <tr><td colSpan={11} className="py-10 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={11} className="py-10 text-center text-gray-500">No bilties</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-semibold">
                  {r.gr_no}
                  {r.bilty_type === 'manual' && <span className="ml-1 text-[10px] font-semibold text-amber-700">MANUAL</span>}
                </td>
                <td className="px-4 py-2.5">{formatDate(r.bilty_date)}</td>
                <td className="px-4 py-2.5">{r.consignor || '-'}</td>
                <td className="px-4 py-2.5">{r.consignee || '-'}</td>
                <td className="px-4 py-2.5 text-xs uppercase">{r.payment_mode || '-'}</td>
                <td className="px-4 py-2.5 text-right">₹{formatINR(r.amount)}</td>
                <td className="px-4 py-2.5 text-right text-rose-700">{Number(r.paid_amount) ? `₹${formatINR(r.paid_amount)}` : ''}</td>
                <td className="px-4 py-2.5 text-right font-medium">₹{formatINR(r.balance_amount)}</td>
                <td className={`px-4 py-2.5 text-xs font-semibold ${statusOf(r).cls}`}>{statusOf(r).label}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${ADDED_VIA_TAG[r.added_via] || 'bg-gray-100 text-gray-700'}`}>{r.added_via || '-'}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => remove(r)} disabled={removingId === r.id} title="Remove from ledger"
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50">
                    {removingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
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
