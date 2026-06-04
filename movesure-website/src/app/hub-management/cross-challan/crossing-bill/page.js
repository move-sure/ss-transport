'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../utils/auth';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft, Loader2, RefreshCw, Search, X, ChevronDown, ChevronRight,
  FileText, Truck, TrendingDown, Calendar, Filter, Building2,
} from 'lucide-react';

const API_BASE = 'https://api.movesure.io';
const Rs = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const STATUS_CFG = {
  draft:        { label: 'Draft',      cls: 'bg-gray-100 text-gray-700 border-gray-300' },
  sent:         { label: 'Sent',       cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  partial_paid: { label: 'Part. Paid', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  paid:         { label: 'Paid',       cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  cancelled:    { label: 'Cancelled',  cls: 'bg-red-100 text-red-600 border-red-300' },
};

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG.draft;
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${s.cls}`}>{s.label}</span>;
}

/* ─── Bill row inside transport folder ─────────────────────────────────────── */
function BillItem({ bill }) {
  const kaatPct = bill.total_kaat > 0 ? Math.min(100, Math.round((bill.total_paid_kaat / bill.total_kaat) * 100)) : 0;
  const pfPct   = bill.total_pf   > 0 ? Math.min(100, Math.round((bill.total_paid_to_transport / bill.total_pf) * 100)) : 0;

  return (
    <Link href={`/hub-management/cross-challan/crossing-bill/${encodeURIComponent(bill.transport_gstin || bill.transport_name)}`}
      className="block hover:bg-blue-50/50 transition-colors border-b border-gray-100 last:border-0">
      <div className="px-5 py-3.5 flex items-start gap-4 flex-wrap">
        {/* Bill info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-black text-sm font-mono text-gray-900">{bill.bill_no}</span>
            <StatusBadge status={bill.status}/>
            {bill.from_date && (
              <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-full">
                {bill.from_date} → {bill.to_date || '—'}
              </span>
            )}
            {bill.created_at && (
              <span className="text-[10px] text-gray-400">
                Created {format(new Date(bill.created_at), 'dd MMM yy')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <span className="text-gray-600">{bill.total_pohonch} pohonch · {bill.total_bilties} bilties</span>
            <span className="font-semibold text-gray-800">Total: {Rs(bill.total_amount)}</span>
            <span className="font-bold text-rose-600">Kaat: {Rs(bill.total_kaat)}</span>
            <span className="font-bold text-teal-700">PF: {Rs(bill.total_pf)}</span>
          </div>
          {/* Progress bars */}
          <div className="grid grid-cols-2 gap-3 pt-1 max-w-sm">
            <div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                <span>Kaat rcvd</span><span className="font-bold text-rose-600">{kaatPct}%</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full"><div className="h-full bg-rose-400 rounded-full" style={{ width: `${kaatPct}%` }}/></div>
              <div className="text-[10px] text-gray-400 mt-0.5">Bal: <span className="font-bold text-rose-500">{Rs(bill.balance_on_transport)}</span></div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                <span>PF paid</span><span className="font-bold text-teal-600">{pfPct}%</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full"><div className="h-full bg-teal-400 rounded-full" style={{ width: `${pfPct}%` }}/></div>
              <div className="text-[10px] text-gray-400 mt-0.5">Bal: <span className="font-bold text-teal-500">{Rs(bill.balance_on_us)}</span></div>
            </div>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="flex flex-col items-end gap-1 shrink-0 text-right">
          <div className="text-[10px] text-gray-400">Bal. Transport: <span className="font-black text-rose-600">{Rs(bill.balance_on_transport)}</span></div>
          <div className="text-[10px] text-gray-400">Bal. Us: <span className="font-black text-teal-700">{Rs(bill.balance_on_us)}</span></div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Transport folder ─────────────────────────────────────────────────────── */
function TransportFolder({ transport, bills, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const stats = useMemo(() => bills.reduce(
    (a, b) => ({
      total_kaat: a.total_kaat + (b.total_kaat || 0),
      total_pf:   a.total_pf   + (b.total_pf   || 0),
      balance_transport: a.balance_transport + (b.balance_on_transport || 0),
      balance_us:        a.balance_us        + (b.balance_on_us       || 0),
      total_paid_kaat:   a.total_paid_kaat   + (b.total_paid_kaat     || 0),
    }),
    { total_kaat: 0, total_pf: 0, balance_transport: 0, balance_us: 0, total_paid_kaat: 0 }
  ), [bills]);

  const statusCounts = useMemo(() => {
    const m = {};
    bills.forEach(b => { m[b.status] = (m[b.status] || 0) + 1; });
    return m;
  }, [bills]);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Folder header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-start gap-4 px-5 py-4 text-left transition-colors ${open ? 'bg-gray-900' : 'bg-gray-800 hover:bg-gray-750'}`}
      >
        <div className="mt-0.5 shrink-0">
          {open ? <ChevronDown className="w-4 h-4 text-gray-300"/> : <ChevronRight className="w-4 h-4 text-gray-300"/>}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Truck className="w-4 h-4 text-gray-300 shrink-0"/>
            <span className="font-extrabold text-white text-sm">{transport.name}</span>
            {transport.gstin && <span className="font-mono text-xs text-gray-400">{transport.gstin}</span>}
            <span className="text-xs font-bold text-gray-300 bg-gray-700 px-2 py-0.5 rounded-full">{bills.length} bill{bills.length !== 1 ? 's' : ''}</span>
            {Object.entries(statusCounts).map(([s, n]) => (
              <span key={s} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CFG[s]?.cls || 'bg-gray-100 text-gray-700'}`}>
                {STATUS_CFG[s]?.label || s}: {n}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span className="text-gray-400">Kaat: <span className="font-bold text-rose-400">{Rs(stats.total_kaat)}</span></span>
            <span className="text-gray-400">PF: <span className="font-bold text-teal-400">{Rs(stats.total_pf)}</span></span>
            <span className="text-gray-400">Bal.Transport: <span className="font-bold text-rose-300">{Rs(stats.balance_transport)}</span></span>
            <span className="text-gray-400">Bal.Us: <span className="font-bold text-teal-300">{Rs(stats.balance_us)}</span></span>
          </div>
        </div>
        <Link
          href={`/hub-management/cross-challan/crossing-bill/${encodeURIComponent(transport.gstin || transport.name)}`}
          onClick={e => e.stopPropagation()}
          className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Building2 className="w-3 h-3"/> View Page
        </Link>
      </button>

      {/* Bills list */}
      {open && (
        <div className="bg-white divide-y divide-gray-50">
          {bills.map(bill => <BillItem key={bill.id} bill={bill}/>)}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function AllBillsPage() {
  const { token } = useAuth();

  const [bills,        setBills]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(false);
  const [mounted,      setMounted]      = useState(false);

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [groupBy,      setGroupBy]      = useState('transport'); // 'transport' | 'date'

  useEffect(() => { setMounted(true); }, []);

  const fetchBills = useCallback(async (pg = 1, append = false) => {
    if (pg === 1) setLoading(true);
    try {
      const p = new URLSearchParams({ page: pg, page_size: 100 });
      if (filterStatus !== 'all') p.set('status', filterStatus);
      const res  = await fetch(`${API_BASE}/api/crossing-bill?${p}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      if (append) setBills(prev => [...prev, ...(json.data?.rows || [])]);
      else        setBills(json.data?.rows || []);
      setHasMore(json.data?.has_more || false);
      setPage(pg);
    } catch (e) { console.error('fetchBills:', e); }
    finally { setLoading(false); }
  }, [token, filterStatus]);

  useEffect(() => { if (mounted) fetchBills(1); }, [mounted, fetchBills]);

  // Filter by search
  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter(b =>
      (b.bill_no          || '').toLowerCase().includes(q) ||
      (b.transport_name   || '').toLowerCase().includes(q) ||
      (b.transport_gstin  || '').toLowerCase().includes(q)
    );
  }, [bills, search]);

  // Overall stats
  const overallStats = useMemo(() => filteredBills.reduce(
    (a, b) => ({
      kaat:     a.kaat     + (b.total_kaat              || 0),
      pf:       a.pf       + (b.total_pf                || 0),
      bal_t:    a.bal_t    + (b.balance_on_transport     || 0),
      bal_us:   a.bal_us   + (b.balance_on_us           || 0),
      bilties:  a.bilties  + (b.total_bilties            || 0),
      pohonch:  a.pohonch  + (b.total_pohonch            || 0),
    }),
    { kaat:0, pf:0, bal_t:0, bal_us:0, bilties:0, pohonch:0 }
  ), [filteredBills]);

  // Group by transport
  const transportGroups = useMemo(() => {
    const map = {};
    filteredBills.forEach(b => {
      const key = b.transport_gstin || b.transport_name || 'Unknown';
      if (!map[key]) map[key] = { name: b.transport_name || key, gstin: b.transport_gstin || '', bills: [] };
      map[key].bills.push(b);
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredBills]);

  // Group by month
  const monthGroups = useMemo(() => {
    const map = {};
    filteredBills.forEach(b => {
      const key = b.created_at ? format(new Date(b.created_at), 'MMMM yyyy') : 'Unknown';
      if (!map[key]) map[key] = { label: key, date: b.created_at || '', bills: [] };
      map[key].bills.push(b);
    });
    return Object.values(map).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredBills]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 p-4">
      <div className="w-full mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start gap-4 flex-wrap">
          <Link href="/hub-management/cross-challan"
            className="p-2 hover:bg-white rounded-xl shadow-sm border border-gray-200 shrink-0 mt-1">
            <ArrowLeft className="w-5 h-5 text-gray-700"/>
          </Link>
          <Link href="/hub-management/cross-challan/cross-challan-list"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm shrink-0 mt-1">
            <FileText className="w-4 h-4"/> Pohonch List
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900">All Crossing Bills</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {filteredBills.length} bills · {transportGroups.length} transports
            </p>
          </div>
          <button onClick={() => fetchBills(1)} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-50 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/> Refresh
          </button>
        </div>

        {/* ── Stats cards ── */}
        {!loading && filteredBills.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Bills',          value: filteredBills.length,          color: 'from-gray-600 to-gray-700' },
              { label: 'Transports',     value: transportGroups.length,        color: 'from-blue-500 to-blue-600' },
              { label: 'Total Kaat',     value: Rs(overallStats.kaat),         color: 'from-rose-500 to-rose-600' },
              { label: 'Total PF',       value: Rs(overallStats.pf),           color: 'from-teal-500 to-teal-600' },
              { label: 'Bal. Transport', value: Rs(overallStats.bal_t),        color: 'from-amber-500 to-amber-600' },
              { label: 'Bal. Us',        value: Rs(overallStats.bal_us),       color: 'from-purple-500 to-purple-600' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{c.label}</p>
                <p className={`text-base font-extrabold bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Search + filters ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search bill no, transport name, GSTIN…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600"/>
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400"/>
            {['all', 'draft', 'sent', 'partial_paid', 'paid', 'cancelled'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  filterStatus === s
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}>
                {s === 'all' ? 'All' : STATUS_CFG[s]?.label || s}
              </button>
            ))}
          </div>

          {/* Group by */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs font-semibold text-gray-500">Group:</span>
            {[{ v: 'transport', l: 'Transport' }, { v: 'date', l: 'Month' }].map(({ v, l }) => (
              <button key={v} onClick={() => setGroupBy(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${groupBy === v ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── Bill list ── */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto mb-3"/>
            <p className="text-gray-500 font-medium">Loading crossing bills…</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-14 h-14 text-gray-200 mx-auto mb-3"/>
            <p className="text-gray-500 font-semibold">No bills found</p>
            {search && <p className="text-gray-400 text-sm mt-1">Try clearing your search</p>}
          </div>
        ) : groupBy === 'transport' ? (
          <div className="space-y-3">
            {transportGroups.map((t, i) => (
              <TransportFolder key={t.gstin || t.name} transport={t} bills={t.bills} defaultOpen={i === 0}/>
            ))}
          </div>
        ) : (
          /* ── Date grouping ── */
          <div className="space-y-5">
            {monthGroups.map(mg => (
              <div key={mg.label} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <Calendar className="w-4 h-4 text-gray-500"/>
                  <h3 className="text-sm font-black text-gray-900">{mg.label}</h3>
                  <span className="text-xs text-gray-400">{mg.bills.length} bills</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {mg.bills.map(bill => <BillItem key={bill.id} bill={bill}/>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="text-center">
            <button onClick={() => fetchBills(page + 1, true)}
              className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
              Load more bills
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
