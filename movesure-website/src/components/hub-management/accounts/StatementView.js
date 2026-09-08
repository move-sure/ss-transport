'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { ledgerApi } from './api';
import { formatDate, formatINR, FLOW_LABEL, OWES_LABEL } from './helpers';

// Screen 2b's Statement tab, promoted to a standalone reusable block (also used by Screen 5).
// `plain` drops the "they owe you / you owe them" phrasing — use it for
// non-party ledgers (Cash, Bank, Income) where that phrasing doesn't apply.
export default function StatementView({ ledgerId, plain = false, initialFromDate = '', initialToDate = '', hideDateFilters = false, onTotals }) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!ledgerId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await ledgerApi.ledgers.statement(ledgerId, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setData(res.data);
      if (onTotals) {
        const entries = res.data?.entries || [];
        const totalDr = entries.reduce((s, e) => s + (Number(e.dr_amount) || 0), 0);
        const totalCr = entries.reduce((s, e) => s + (Number(e.cr_amount) || 0), 0);
        onTotals({ totalDr, totalCr, entries });
      }
    } catch (err) {
      setError(err.message || 'Failed to load statement');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {!hideDateFilters && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <label className="text-sm text-black">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500" />
          <label className="text-sm text-black">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500" />
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></div>
      ) : data ? (
        <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-black text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                <th className="text-left px-4 py-2.5 font-semibold">Voucher No</th>
                <th className="text-left px-4 py-2.5 font-semibold">Narration</th>
                <th className="text-right px-4 py-2.5 font-semibold">{FLOW_LABEL.dr}</th>
                <th className="text-right px-4 py-2.5 font-semibold">{FLOW_LABEL.cr}</th>
                <th className="text-right px-4 py-2.5 font-semibold">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-black">
              <tr className="bg-gray-50/60 font-medium text-black">
                <td className="px-4 py-2.5" colSpan={5}>Opening Balance</td>
                <td className="px-4 py-2.5 text-right">
                  ₹{formatINR(data.opening_balance)}{plain ? '' : ` — ${OWES_LABEL[data.opening_balance_type] || ''}`}
                </td>
              </tr>
              {(data.entries || []).map((e, i) => (
                <tr key={e.id || i} className="hover:bg-gray-50 text-black">
                  <td className="px-4 py-2.5">{formatDate(e.date || e.voucher_date)}</td>
                  <td className="px-4 py-2.5">
                    {e.voucher_id ? (
                      <button
                        onClick={() => router.push(`/hub-management/accounts/vouchers/${e.voucher_id}`)}
                        className="text-emerald-700 font-medium hover:underline"
                      >
                        {e.voucher_no}
                      </button>
                    ) : (e.voucher_no || '-')}
                  </td>
                  <td className="px-4 py-2.5 text-black">{e.narration || '-'}</td>
                  <td className="px-4 py-2.5 text-right">{e.dr_amount ? `₹${formatINR(e.dr_amount)}` : ''}</td>
                  <td className="px-4 py-2.5 text-right">{e.cr_amount ? `₹${formatINR(e.cr_amount)}` : ''}</td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    ₹{formatINR(e.running_balance)}{!plain && e.running_balance_type ? ` — ${OWES_LABEL[e.running_balance_type]}` : ''}
                  </td>
                </tr>
              ))}
              {!data.entries?.length && (
                <tr><td colSpan={6} className="text-center py-8 text-black">No entries in this range</td></tr>
              )}
              <tr className="bg-gray-50/60 font-semibold text-black">
                <td className="px-4 py-2.5" colSpan={5}>Closing Balance</td>
                <td className="px-4 py-2.5 text-right">
                  ₹{formatINR(data.closing_balance)}{plain ? '' : ` — ${OWES_LABEL[data.closing_balance_type] || ''}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
