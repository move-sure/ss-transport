'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft, Wand2 } from 'lucide-react';
import { useAuth } from '@/app/utils/auth';
import { transportLedgersApi } from '@/components/hub-management/accounts/api';
import { formatDate, formatINR } from '@/components/hub-management/accounts/helpers';
import BiltyAssignTable from '@/components/hub-management/accounts/transport-ledgers/BiltyAssignTable';
import AutoAssignModal from '@/components/hub-management/accounts/transport-ledgers/AutoAssignModal';

// One received challan: every bilty with its suggested transport, kaat and pf -> assign.
export default function HubChallanPage() {
  const { challan_no: raw } = useParams();
  const challanNo = decodeURIComponent(raw || '');
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAuto, setShowAuto] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await transportLedgersApi.challan(challanNo);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load challan');
    } finally {
      setLoading(false);
    }
  }, [challanNo]);

  useEffect(() => { if (challanNo) load(); }, [challanNo, load]);

  const c = data?.challan;
  const t = data?.totals;
  const bilties = data?.bilties || [];
  const pct = t?.bilties ? Math.round((t.assigned / t.bilties) * 100) : 0;

  return (
    <div className="px-6 py-6 w-full">
      <button onClick={() => router.push('/hub-management/accounts/transport-challans')} className="flex items-center gap-1.5 text-sm text-black mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Hub Challans
      </button>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">Challan {challanNo}</h1>
          <p className="text-sm text-black mt-0.5">
            {c ? `${formatDate(c.date)}${c.received_at_hub_timing ? ` · received ${new Date(c.received_at_hub_timing).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}` : ''}
          </p>
        </div>
        <button onClick={() => setShowAuto(true)} disabled={!t || t.assigned >= t.bilties}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-40">
          <Wand2 className="w-4 h-4" /> Auto-assign challan
        </button>
      </div>

      {t && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-black uppercase">Bilties</p>
            <p className="text-2xl font-bold text-black mt-1">{t.bilties}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-black uppercase">Assigned</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{t.assigned} <span className="text-sm text-gray-500">({pct}%)</span></p>
            <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-black uppercase">To-pay total</p>
            <p className="text-2xl font-bold text-black mt-1">₹{formatINR(t.to_pay_total)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-black uppercase">Paid total</p>
            <p className="text-2xl font-bold text-black mt-1">₹{formatINR(t.paid_total)}</p>
          </div>
        </div>
      )}

      <BiltyAssignTable rows={bilties} loading={loading} userId={user?.id} onAssigned={load} />

      {showAuto && (
        <AutoAssignModal challanNo={challanNo} userId={user?.id} onClose={() => setShowAuto(false)} onDone={load} />
      )}
    </div>
  );
}
