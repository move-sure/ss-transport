'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, Search, Truck, RefreshCw, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../../utils/auth';
import Navbar from '../../../../../components/dashboard/navbar';
import { fetchAllBills, groupByTransport, totalsOf, Rs } from '../../../../../components/hub-management/bilty-crossing-bill/billsData';

// Bilty crossing bills grouped by transporter: totals across all their bills.
export default function BiltyCrossingTransportsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setBills(await fetchAllBills(headers)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [headers]);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => groupByTransport(bills).sort((a, b) => b.totals.net - a.totals.net), [bills]);
  const needle = q.trim().toUpperCase();
  const visible = groups.filter((g) => !needle || `${g.transport_name} ${g.transport_gstin || ''}`.toUpperCase().includes(needle));
  const grand = totalsOf(visible.flatMap((g) => g.bills));

  const card = 'bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 p-4';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="w-full px-4 sm:px-6 py-6">
        <button onClick={() => router.push('/hub-management/cross-challan/bilty-crossing-bill')} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Bilty Crossing Bill
        </button>

        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow"><Truck className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Transport-wise Ledger</h1>
              <p className="text-sm text-slate-500">All bilty crossing bills per transporter · net payable = PF − kaat on paid bilties</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transporter / GSTIN"
                className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 w-64 focus:ring-2 focus:ring-teal-500" />
            </div>
            <button onClick={load} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <div className={card}><p className="text-[11px] font-semibold uppercase text-slate-500">Transporters</p><p className="text-2xl font-bold text-slate-900">{visible.length}</p><p className="text-xs text-slate-400">{grand.bills} bills · {grand.bilties} bilties</p></div>
          <div className={card}><p className="text-[11px] font-semibold uppercase text-slate-500">Total PF</p><p className="text-2xl font-bold text-slate-900">{Rs(grand.pf)}</p></div>
          <div className={card}><p className="text-[11px] font-semibold uppercase text-slate-500">Total Kaat</p><p className="text-2xl font-bold text-slate-900">{Rs(grand.kaat)}</p><p className="text-xs text-slate-400">paid-bilty kaat {Rs(grand.paidKaat)}</p></div>
          <div className={card}><p className="text-[11px] font-semibold uppercase text-slate-500">Freight</p><p className="text-2xl font-bold text-slate-900">{Rs(grand.amount)}</p></div>
          <div className={`${card} ring-teal-300 bg-teal-50/60`}><p className="text-[11px] font-semibold uppercase text-teal-700">Net payable</p><p className="text-2xl font-bold text-teal-800">{Rs(grand.net)}</p></div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Transporter</th>
                <th className="px-4 py-3 text-right">Bills</th>
                <th className="px-4 py-3 text-right">Bilties</th>
                <th className="px-4 py-3 text-right">Freight</th>
                <th className="px-4 py-3 text-right">Kaat</th>
                <th className="px-4 py-3 text-right">PF</th>
                <th className="px-4 py-3 text-right">Paid-bilty kaat</th>
                <th className="px-4 py-3 text-right">Net payable</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && <tr><td colSpan={9} className="py-12 text-center"><Loader2 className="w-6 h-6 mx-auto text-teal-600 animate-spin" /></td></tr>}
              {!loading && visible.length === 0 && <tr><td colSpan={9} className="py-12 text-center text-slate-500">No bills yet</td></tr>}
              {!loading && visible.map((g) => (
                <tr key={g.key} onClick={() => router.push(`/hub-management/cross-challan/bilty-crossing-bill/transports/${encodeURIComponent(g.key)}`)}
                  className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{g.transport_name}</div>
                    <div className="text-xs text-slate-400 font-mono">{g.transport_gstin || 'No GSTIN'} · last {g.lastPeriod}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{g.totals.bills}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{g.totals.bilties}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Rs(g.totals.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Rs(g.totals.kaat)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Rs(g.totals.pf)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-700">{Rs(g.totals.paidKaat)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-teal-800">{Rs(g.totals.net)}</td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-400" /></td>
                </tr>
              ))}
            </tbody>
            {!loading && visible.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
                <tr>
                  <td className="px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{grand.bills}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{grand.bilties}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Rs(grand.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Rs(grand.kaat)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Rs(grand.pf)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-700">{Rs(grand.paidKaat)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-teal-800">{Rs(grand.net)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </main>
    </div>
  );
}
