'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/utils/auth';
import { Loader2, AlertCircle, ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import { ledgerApi, VOUCHER_TYPES } from '@/components/hub-management/accounts/api';
import { formatDate, formatINR } from '@/components/hub-management/accounts/helpers';
import { useBranch } from '@/components/hub-management/accounts/useBranch';

const PAGE_SIZE = 40;

export default function DayBookPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { branchId, isAllBranches } = useBranch();
  const [mounted, setMounted] = useState(false);

  const [voucherType, setVoucherType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await ledgerApi.vouchers.list({
        branch_id: isAllBranches ? undefined : branchId,
        voucher_type: voucherType || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        is_active: showCancelled ? undefined : true,
        page,
        page_size: PAGE_SIZE,
      });
      setRows(res.data?.rows || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  }, [branchId, isAllBranches, voucherType, fromDate, toDate, showCancelled, page]);

  useEffect(() => {
    if (mounted && branchId) load();
  }, [mounted, branchId, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!mounted || !user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-md">
            <ScrollText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">Day Book</h1>
            <p className="text-sm text-black">Every voucher created by the screens above, in one list</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={voucherType}
          onChange={(e) => { setPage(1); setVoucherType(e.target.value); }}
          className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-black focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All types</option>
          {VOUCHER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={(e) => { setPage(1); setFromDate(e.target.value); }}
          className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-black focus:ring-2 focus:ring-emerald-500" />
        <span className="text-black text-sm">to</span>
        <input type="date" value={toDate} onChange={(e) => { setPage(1); setToDate(e.target.value); }}
          className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-black focus:ring-2 focus:ring-emerald-500" />
        <label className="flex items-center gap-2 text-sm text-black ml-2">
          <input type="checkbox" checked={showCancelled} onChange={(e) => { setPage(1); setShowCancelled(e.target.checked); }}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
          Show cancelled too
        </label>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-black text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                {isAllBranches && <th className="text-left px-4 py-3 font-semibold">Branch</th>}
                <th className="text-left px-4 py-3 font-semibold">Voucher No</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Narration</th>
                <th className="text-right px-4 py-3 font-semibold">Total Amount</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-black">
              {loading && (
                <tr><td colSpan={isAllBranches ? 7 : 6} className="text-center py-10"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={isAllBranches ? 7 : 6} className="text-center py-10 text-black">No vouchers found</td></tr>
              )}
              {!loading && rows.map((v) => (
                <tr key={v.id} onClick={() => router.push(`/hub-management/accounts/vouchers/${v.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3">{formatDate(v.voucher_date)}</td>
                  {isAllBranches && <td className="px-4 py-3 text-black">{v.branch_name || '-'}</td>}
                  <td className="px-4 py-3 font-medium text-emerald-700">{v.voucher_no}</td>
                  <td className="px-4 py-3 capitalize text-black">{v.voucher_type?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-black max-w-xs truncate">{v.narration || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium">₹{formatINR(v.total_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    {!v.is_active && (
                      <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Cancelled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-black">Page {page} of {totalPages} · {total} vouchers</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
