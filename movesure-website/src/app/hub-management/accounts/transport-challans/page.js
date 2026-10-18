'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ClipboardCheck, ChevronRight } from 'lucide-react';
import { useBranch } from '@/components/hub-management/accounts/useBranch';
import { transportLedgersApi } from '@/components/hub-management/accounts/api';
import { formatDate, todayLocalDate } from '@/components/hub-management/accounts/helpers';
import { daysAgo } from '@/components/hub-management/accounts/transport-ledgers/shared';

const PAGE_SIZE = 30;

// Challans received at the hub, with how many of their bilties are already in transport ledgers.
export default function HubChallansPage() {
  const router = useRouter();
  const { branchId, isAllBranches } = useBranch();
  const [fromDate, setFromDate] = useState(daysAgo(30));
  const [toDate, setToDate] = useState(todayLocalDate());
  const [onlyPending, setOnlyPending] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await transportLedgersApi.challans({
        from_date: fromDate || undefined, to_date: toDate || undefined,
        branch_id: isAllBranches ? undefined : branchId, page, page_size: PAGE_SIZE
      });
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load challans');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, branchId, isAllBranches, page]);

  useEffect(() => { load(); }, [load]);

  const rows = (data?.rows || []).filter((r) => !onlyPending || r.unassigned_count > 0);
  const pages = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE));
  const sum = rows.reduce((t, r) => ({ b: t.b + (r.bilty_count || 0), a: t.a + (r.assigned_count || 0) }), { b: 0, a: 0 });

  return (
    <div className="px-6 py-6 w-full">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-md"><ClipboardCheck className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-black">Hub Challans</h1>
            <p className="text-sm text-black">Challans received at the hub. Open one to move its bilties into transport ledgers.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm text-sm text-black">
          <span>{rows.length} challans</span>
          <span>{sum.b} bilties</span>
          <span className="text-emerald-700 font-semibold">{sum.a} assigned</span>
          <span className="text-amber-700 font-semibold">{sum.b - sum.a} left</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm text-black">From</label>
        <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black" />
        <label className="text-sm text-black">To</label>
        <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black" />
        <label className="flex items-center gap-2 text-sm text-black ml-2">
          <input type="checkbox" className="accent-emerald-600" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          Only with unassigned bilties
        </label>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-black text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Challan</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">From branch</th>
              <th className="text-left px-4 py-3">Received at hub</th>
              <th className="text-right px-4 py-3">Bilties</th>
              <th className="text-left px-4 py-3 w-72">Assigned to transports</th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-black">
            {loading && <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-500">No received challans in this range</td></tr>}
            {!loading && rows.map((r) => {
              const pct = r.bilty_count ? Math.round((r.assigned_count / r.bilty_count) * 100) : 0;
              const done = r.bilty_count && r.assigned_count >= r.bilty_count;
              return (
                <tr key={r.challan_no} onClick={() => router.push(`/hub-management/accounts/transport-challans/${encodeURIComponent(r.challan_no)}`)}
                  className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-bold">{r.challan_no}</td>
                  <td className="px-4 py-3">{formatDate(r.date)}</td>
                  <td className="px-4 py-3">{r.branch_name || '-'}</td>
                  <td className="px-4 py-3 text-xs">{r.received_at_hub_timing ? new Date(r.received_at_hub_timing).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.bilty_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-xs font-semibold w-20 text-right ${done ? 'text-emerald-700' : 'text-black'}`}>{r.assigned_count}/{r.bilty_count}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-400" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-3 text-sm text-black">
          <span>{data?.total} challans</span>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
          <span>Page {page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
