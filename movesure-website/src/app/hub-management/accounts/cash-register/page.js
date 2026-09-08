'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/utils/auth';
import { Loader2, AlertCircle, Wallet, Plus } from 'lucide-react';
import { cashManagerApi } from '@/components/hub-management/accounts/api';
import { formatINR, formatDate } from '@/components/hub-management/accounts/helpers';
import { customAlert } from '@/components/common/alert-system';
import { useBranch } from '@/components/hub-management/accounts/useBranch';
import CashExpenseModal from '@/components/hub-management/accounts/CashExpenseModal';

function formatTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function CashManagerPage() {
  const { user } = useAuth();
  const { branchId, isAllBranches } = useBranch();
  // A day's cash-box balance only makes sense for one physical branch — if
  // "All Branches" is selected elsewhere, fall back to the user's own branch.
  const effectiveBranchId = isAllBranches ? user?.branch_id : branchId;

  const [mounted, setMounted] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExpense, setShowExpense] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    if (!effectiveBranchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await cashManagerApi.get({
        branch_id: effectiveBranchId,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load cash manager');
    } finally {
      setLoading(false);
    }
  }, [effectiveBranchId, fromDate, toDate]);

  useEffect(() => { if (mounted) load(); }, [mounted, load]);

  if (!mounted || !user || loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-md">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">Cash Manager (Galla)</h1>
            <p className="text-sm text-black">Everything that ever touched your cash box</p>
          </div>
        </div>
        <button
          onClick={() => setShowExpense(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Cash Expense
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {data && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <p className="text-xs font-semibold text-black uppercase tracking-wide mb-1">Cash in hand</p>
            <p className="text-3xl font-bold text-emerald-700">₹{formatINR(data.current_balance)}</p>
          </div>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <label className="text-sm text-black">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500" />
            <label className="text-sm text-black">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500" />
          </div>

          {!data.days?.length && (
            <div className="py-16 text-center text-black text-sm bg-white rounded-2xl border border-gray-100">No entries in this range</div>
          )}

          <div className="space-y-4">
            {(data.days || []).map((day) => (
              <div key={day.date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-sm font-semibold text-black">{formatDate(day.date)}</span>
                  <div className="flex gap-4 text-xs text-black">
                    <span>Opening: ₹{formatINR(day.opening_balance)}</span>
                    <span className="text-emerald-700 font-semibold">In: ₹{formatINR(day.total_in)}</span>
                    <span className="text-rose-700 font-semibold">Out: ₹{formatINR(day.total_out)}</span>
                    <span>Closing: ₹{formatINR(day.closing_balance)}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {day.entries.map((e, i) => (
                    <div key={e.voucher_id || i} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-black">{e.narration || '-'}</p>
                        <p className="text-xs text-black">{formatTime(e.time)} · {e.voucher_no}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${e.direction === 'in' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {e.direction === 'in' ? '+' : '-'}₹{formatINR(e.amount)}
                        </p>
                        <p className="text-xs text-black">₹{formatINR(e.running_balance)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CashExpenseModal
        isOpen={showExpense}
        onClose={() => setShowExpense(false)}
        branchId={effectiveBranchId}
        userId={user.id}
        onSuccess={() => { setShowExpense(false); customAlert('Expense added', 'success'); load(); }}
      />
    </div>
  );
}
