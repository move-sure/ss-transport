'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/utils/auth';
import { Loader2, AlertCircle, Package, Plus, MinusCircle } from 'lucide-react';
import { deliveryApi } from '@/components/hub-management/accounts/api';
import { formatINR, formatDate, todayLocalDate } from '@/components/hub-management/accounts/helpers';
import { customAlert } from '@/components/common/alert-system';
import { AddDeliveryIncomeModal, AddDeliveryExpenseModal } from '@/components/hub-management/accounts/DeliveryModals';

// This screen is hard-locked to Kanpur regardless of the branch selector
// elsewhere in Accounting — every call below always uses this id, on purpose.
const KANPUR_BRANCH_ID = 'e47a517f-92b5-4a28-91b4-4e67916d172e';

export default function KanpurDeliveryPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  const [fromDate, setFromDate] = useState(todayLocalDate());
  const [toDate, setToDate] = useState(todayLocalDate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await deliveryApi.getMerged({ branch_id: KANPUR_BRANCH_ID, from_date: fromDate || undefined, to_date: toDate || undefined });
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load delivery entries');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { if (mounted) load(); }, [mounted, load]);

  if (!mounted || !user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 rounded-xl shadow-md">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-black">Kanpur Delivery</h1>
          <p className="text-sm text-black">Income & expense by GR number — always Kanpur branch</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowIncome(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Income
        </button>
        <button
          onClick={() => setShowExpense(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 shadow-sm"
        >
          <MinusCircle className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {data && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <p className="text-xs font-semibold text-black uppercase tracking-wide mb-1">Net Delivery Profit (all time)</p>
          <p className={`text-3xl font-bold ${data.all_time_net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>₹{formatINR(data.all_time_net)}</p>
          <div className="flex gap-6 mt-3 text-sm text-black">
            <span>Income this period: <span className="font-semibold text-emerald-700">₹{formatINR(data.period_total_income)}</span></span>
            <span>Expense this period: <span className="font-semibold text-rose-700">₹{formatINR(data.period_total_expense)}</span></span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-black">Day by day</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-black focus:ring-2 focus:ring-emerald-500" />
          <span className="text-black text-xs">to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-black focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center"><Loader2 className="w-5 h-5 mx-auto text-emerald-600 animate-spin" /></div>
      ) : !data?.days?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-sm text-black">Nothing in this date range yet.</div>
      ) : (
        <div className="space-y-4">
          {data.days.map((day) => (
            <div key={day.date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-sm font-semibold text-black">{formatDate(day.date)}</span>
                <div className="flex gap-4 text-xs text-black">
                  <span>Opening: ₹{formatINR(day.opening_net)}</span>
                  <span className="text-emerald-700 font-semibold">In: ₹{formatINR(day.total_income)}</span>
                  <span className="text-rose-700 font-semibold">Out: ₹{formatINR(day.total_expense)}</span>
                  <span>Closing: ₹{formatINR(day.closing_net)}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {day.entries.map((e, i) => (
                  <div key={e.voucher_no || i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-black">{e.narration}</p>
                      <p className="text-xs text-black">
                        {e.time ? new Date(e.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''} · {e.voucher_no}
                      </p>
                    </div>
                    <p className={`text-sm font-bold ${e.kind === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {e.kind === 'income' ? '+' : '-'}₹{formatINR(e.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddDeliveryIncomeModal
        isOpen={showIncome}
        onClose={() => setShowIncome(false)}
        branchId={KANPUR_BRANCH_ID}
        userId={user.id}
        onSuccess={() => { setShowIncome(false); customAlert('Income added', 'success'); load(); }}
      />
      <AddDeliveryExpenseModal
        isOpen={showExpense}
        onClose={() => setShowExpense(false)}
        branchId={KANPUR_BRANCH_ID}
        userId={user.id}
        onSuccess={() => { setShowExpense(false); customAlert('Expense added', 'success'); load(); }}
      />
    </div>
  );
}
