'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/utils/auth';
import { transportLedgersApi } from '@/components/hub-management/accounts/api';
import { todayLocalDate } from '@/components/hub-management/accounts/helpers';
import BiltyAssignTable from '@/components/hub-management/accounts/transport-ledgers/BiltyAssignTable';
import { daysAgo } from '@/components/hub-management/accounts/transport-ledgers/shared';

// Every received bilty that is in no transport ledger yet, with its suggestion or the reason none was found.
export default function UnassignedBiltiesPage() {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(daysAgo(30));
  const [toDate, setToDate] = useState(todayLocalDate());
  const [onlyUndetected, setOnlyUndetected] = useState(false);
  const [includeSettled, setIncludeSettled] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await transportLedgersApi.unassigned({
        from_date: fromDate || undefined, to_date: toDate || undefined,
        only_undetected: onlyUndetected, include_settled: includeSettled
      });
      setData(res.data || res);
    } catch (err) {
      setError(err.message || 'Failed to load bilties');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, onlyUndetected, includeSettled]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-6 py-6 w-full">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-md"><AlertTriangle className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-black">Unassigned Bilties</h1>
            <p className="text-sm text-black">Received at the hub but not in any transport ledger. Anything you don&apos;t assign stays here.</p>
          </div>
        </div>
        {data && (
          <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm text-sm text-black">
            <span><b>{data.count ?? (data.rows || []).length}</b> unassigned</span>
            <span className="text-amber-700"><b>{data.undetected_count ?? 0}</b> no transport found</span>
            <span className="text-gray-600"><b>{data.settled_elsewhere_count ?? 0}</b> settled via pohonch / crossing{includeSettled ? '' : ' (hidden)'}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm text-black">From</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black" />
        <label className="text-sm text-black">To</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black" />
        <label className="flex items-center gap-2 text-sm text-black ml-2">
          <input type="checkbox" className="accent-emerald-600" checked={onlyUndetected} onChange={(e) => setOnlyUndetected(e.target.checked)} />
          Only &quot;no transport found&quot;
        </label>
        <label className="flex items-center gap-2 text-sm text-black">
          <input type="checkbox" className="accent-emerald-600" checked={includeSettled} onChange={(e) => setIncludeSettled(e.target.checked)} />
          Show settled via pohonch / crossing
        </label>
        <button onClick={load} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="py-16 text-center"><Loader2 className="w-7 h-7 mx-auto text-emerald-600 animate-spin" /></div>
      ) : (
        <BiltyAssignTable rows={data?.rows || []} loading={loading} userId={user?.id} onAssigned={load} showChallan />
      )}
    </div>
  );
}
