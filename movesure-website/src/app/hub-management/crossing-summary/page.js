'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import Navbar from '../../../components/dashboard/navbar';

const API_BASE = 'https://api.movesure.io';
import TransportSearchSelect from '../../../components/hub-management/TransportSearchSelect';
import {
  ArrowLeft,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
  Truck,
  Calendar,
  IndianRupee,
  Weight,
  Building2,
  Hash,
  MapPin,
  Download,
  Send,
  Warehouse,
} from 'lucide-react';
import { format } from 'date-fns';

// ── Detect API response format ───────────────────────────────────────────────
// Old format: result.bilties (flat array), result.total, result.with_pohonch_count
// New format: result.with_pohonch / result.no_pohonch (grouped), result.summary.*
function isNewFormat(result) {
  return result.with_pohonch != null || result.no_pohonch != null;
}

// ── Flatten the new grouped API response into a flat bilties array ────────────
function flattenResult(result) {
  // Old format — return directly
  if (!isNewFormat(result)) {
    return result.bilties || [];
  }
  // New format — flatten grouped structure
  const list = [];
  const withPohonch = result.with_pohonch || {};
  // Natural sort: HC0001, HC0002, ... HC0009, HC0010
  const pohonchKeys = Object.keys(withPohonch).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });
  for (const key of pohonchKeys) {
    const group = withPohonch[key];
    for (const b of (group.regular || [])) list.push(b);
    for (const b of (group.manual  || [])) list.push(b);
  }
  const noPohonch = result.no_pohonch || {};
  for (const key of Object.keys(noPohonch)) {
    for (const b of (noPohonch[key] || [])) list.push(b);
  }
  return list;
}

// ── Read summary fields from either API format ────────────────────────────────
function getSummary(result) {
  if (isNewFormat(result) && result.summary) {
    return {
      total:          result.summary.total,
      with_pohonch:   result.summary.with_pohonch,
      without_pohonch: result.summary.without_pohonch,
      total_weight_kg: result.summary.total_weight_kg,
      total_freight:  result.summary.total_freight,
    };
  }
  // Old format
  return {
    total:          result.total,
    with_pohonch:   result.with_pohonch_count,
    without_pohonch: result.without_pohonch_count,
    total_weight_kg: null,
    total_freight:  null,
  };
}

const TODAY = new Date().toISOString().split('T')[0];
const FIRST_OF_MONTH = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .split('T')[0];

function fmtDateTime(dt) {
  if (!dt) return '—';
  try { return format(new Date(dt), 'dd MMM yy, hh:mm a'); } catch { return dt; }
}

function fmt(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PayBadge({ mode }) {
  const map = {
    'to-pay': 'bg-amber-50 text-amber-700 border-amber-200',
    paid:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    foc:      'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[mode] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {mode || '—'}
    </span>
  );
}

export default function CrossingSummaryPage() {
  const { user, token } = useAuth();
  const router   = useRouter();

  // ── form state ─────────────────────────────────────────────────────────────
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [fromDate,   setFromDate]   = useState(FIRST_OF_MONTH);
  const [toDate,     setToDate]     = useState(TODAY);

  // ── results state ──────────────────────────────────────────────────────────
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [result,    setResult]    = useState(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filterMode,   setFilterMode]   = useState('all'); // all | with_pohonch | without_pohonch | has_crossing

  const tableRef = useRef(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!selectedTransport) {
      setError('Please select a transport from the dropdown.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedRows(new Set());

    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
      if (selectedTransport.gst_number) {
        params.set('transport_gstin', selectedTransport.gst_number.trim().toUpperCase());
      } else {
        params.set('transport_name', selectedTransport.transport_name.trim());
      }

      const res = await fetch(`${API_BASE}/api/bilty/transport-report?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        setError(data.message || 'Failed to fetch data.');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (gr) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(gr) ? next.delete(gr) : next.add(gr);
      return next;
    });
  };

  // ── filtered bilties ───────────────────────────────────────────────────────
  const bilties = result ? flattenResult(result) : [];
  const filtered = bilties.filter(b => {
    if (filterMode === 'with_pohonch')    return !!b.pohonch_number;
    if (filterMode === 'without_pohonch') return !b.pohonch_number;
    if (filterMode === 'has_crossing')    return b.has_crossing_challan;
    return true;
  });

  // ── summary totals ─────────────────────────────────────────────────────────
  const totals = filtered.reduce((acc, b) => {
    acc.pkg     += b.no_of_pkg    || 0;
    acc.wt      += Number(b.wt)   || 0;
    acc.freight += Number(b.total)|| 0;
    acc.kaat    += Number(b.kaat) || 0;
    return acc;
  }, { pkg: 0, wt: 0, freight: 0, kaat: 0 });

  const summary = result ? getSummary(result) : null;

  // ── Group filtered bilties by dest_pohonch_no (ascending numeric) ──────────
  const groupedByDest = React.useMemo(() => {
    const map = {};
    for (const b of filtered) {
      const key = b.dest_pohonch_no || 'NO_DEST';
      if (!map[key]) map[key] = [];
      map[key].push(b);
    }
    const keys = Object.keys(map).sort((a, b) => {
      if (a === 'NO_DEST') return 1;
      if (b === 'NO_DEST') return -1;
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    return keys.map(k => ({ key: k, bilties: map[k] }));
  }, [filtered]);

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!filtered.length) return;
    const cols = [
      'GR No','Date','Consignor','Consignee','From','To','Mode',
      'Pkgs','Wt','Freight','PF','DD','Labour','Bill','Toll','Other','Total',
      'Challan No','Challan Date','Dispatched','Dispatch Date','Received at Hub','Hub Timing',
      'Pohonch','Has Crossing','Crossing Challans','Dest Pohonch',
      'Kaat','Kaat PF','Kaat DD','Kaat Rate','Source',
    ];
    const rows = filtered.map(b => {
      const cd = b.challan_dispatch_date && typeof b.challan_dispatch_date === 'object'
        ? b.challan_dispatch_date : null;
      return [
        b.gr_no, b.bilty_date, b.consignor_name, b.consignee_name,
        b.from_city, b.to_city, b.payment_mode,
        b.no_of_pkg, b.wt, b.freight_amount, b.pf_charge, b.dd_charge,
        b.labour_charge, b.bill_charge, b.toll_charge, b.other_charge, b.total,
        b.challan_no || '',
        cd?.challan_date || '',
        cd ? (cd.is_dispatched ? 'Yes' : 'No') : '',
        cd?.dispatch_date || '',
        cd ? (cd.is_received_at_hub ? 'Yes' : 'No') : '',
        cd?.received_at_hub_timing || '',
        b.pohonch_number, b.has_crossing_challan ? 'Yes' : 'No', b.crossing_challans,
        b.dest_pohonch_no, b.kaat, b.kaat_pf, b.kaat_dd, b.kaat_rate, b.source,
      ].map(v => (v == null ? '' : String(v).replace(/,/g, ' '))).join(',');
    });

    const csv  = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `crossing-summary-${result?.transport_name || 'export'}-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 xl:px-10 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/hub-management')}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg shadow-teal-200/50">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Crossing Summary</h1>
              <p className="text-sm text-gray-500">Transport-wise bilty & kaat report</p>
            </div>
          </div>
          {result && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-all"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 xl:px-10 py-6 space-y-5">

        {/* ── Search Form ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Search Transport</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">

            {/* Transport searchable dropdown — spans 2 cols on xl */}
            <div className="space-y-1.5 xl:col-span-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Transport Name / GSTIN
              </label>
              <TransportSearchSelect
                value={selectedTransport}
                onChange={(t) => { setSelectedTransport(t); setResult(null); setError(null); }}
                placeholder="Type name or GSTIN to search…"
                disabled={loading}
              />
            </div>

            {/* From Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition-all text-gray-900"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition-all text-gray-900"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || !selectedTransport}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-all shadow-md shadow-teal-200/50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Searching…' : 'Search Bilties'}
            </button>
            {result && (
              <p className="text-sm text-gray-500">
                Found <span className="font-bold text-gray-900">{summary?.total}</span> bilties for{' '}
                <span className="font-bold text-teal-700">{result.transport_name}</span>
              </p>
            )}
          </div>
        </form>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {result && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              <SummaryCard label="Total Bilties"       value={summary?.total}                                            color="teal" />
              <SummaryCard label="With Pohonch"        value={summary?.with_pohonch}                                     color="indigo" />
              <SummaryCard label="Without Pohonch"     value={summary?.without_pohonch}                                  color="amber" />
              <SummaryCard label="From Bilty Table"    value={result.sources?.bilty_table}                               color="blue" />
              <SummaryCard label="From Station Table"  value={result.sources?.station_bilty_summary}                     color="purple" />
              <SummaryCard label="Total Weight (kg)"   value={summary?.total_weight_kg != null ? summary.total_weight_kg.toFixed(1) : totals.wt.toFixed(1)} color="gray" />
              <SummaryCard label="Total Freight"       value={`₹${fmt(summary?.total_freight ?? totals.freight)}`}       color="green" />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'all',              label: 'All',             count: bilties.length },
                { key: 'with_pohonch',     label: 'With Pohonch',    count: summary?.with_pohonch ?? 0 },
                { key: 'without_pohonch',  label: 'No Pohonch',      count: summary?.without_pohonch ?? 0 },
                { key: 'has_crossing',     label: 'Has Crossing',    count: bilties.filter(b => b.has_crossing_challan).length },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterMode(f.key)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    filterMode === f.key
                      ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200/50'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-700'
                  }`}
                >
                  {f.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    filterMode === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
              <span className="ml-auto text-sm text-gray-500 font-medium">
                Showing {filtered.length} of {bilties.length}
              </span>
            </div>

            {/* ── Grouped by Dest Pohonch ───────────────────────────────── */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-16 text-center">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No bilties match the current filter</p>
              </div>
            ) : (
              <div ref={tableRef} className="space-y-5">
                {groupedByDest.map(({ key, bilties: groupBilties }) => {
                  const grpTotals = groupBilties.reduce((a, b) => {
                    a.pkg     += b.no_of_pkg    || 0;
                    a.wt      += Number(b.wt)   || 0;
                    a.freight += Number(b.total) || 0;
                    a.kaat    += Number(b.kaat)  || 0;
                    return a;
                  }, { pkg: 0, wt: 0, freight: 0, kaat: 0 });

                  return (
                    <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
                      {/* Group heading */}
                      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-teal-600 rounded-xl shadow-md shadow-teal-200/60">
                            <Hash className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Dest Pohonch</p>
                            <p className="text-2xl font-black text-teal-800 leading-tight">
                              {key === 'NO_DEST' ? '— No Dest Pohonch —' : key}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Bilties</p>
                            <p className="text-lg font-black text-gray-800">{groupBilties.length}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Wt (kg)</p>
                            <p className="text-lg font-black text-gray-800">{grpTotals.wt.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Freight</p>
                            <p className="text-lg font-black text-gray-800">₹{fmt(grpTotals.freight)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-rose-400 uppercase font-bold">Kaat</p>
                            <p className="text-lg font-black text-rose-700">₹{fmt(grpTotals.kaat)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-6"></th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">GR No</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Consignor</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Consignee</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Route</th>
                              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mode</th>
                              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pkgs</th>
                              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Wt</th>
                              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Challan</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pohonch / Crossing</th>
                              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kaat</th>
                              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {groupBilties.map((b, idx) => {
                              const isExpanded = expandedRows.has(b.gr_no);
                              const cd = b.challan_dispatch_date && typeof b.challan_dispatch_date === 'object'
                                ? b.challan_dispatch_date : null;
                              return (
                                <React.Fragment key={`${b.gr_no}-${idx}`}>
                                  <tr
                                    className="hover:bg-teal-50/30 transition-colors cursor-pointer"
                                    onClick={() => toggleRow(b.gr_no)}
                                  >
                                    <td className="px-3 py-3 text-center">
                                      {isExpanded
                                        ? <ChevronUp className="h-3.5 w-3.5 text-teal-500 mx-auto" />
                                        : <ChevronDown className="h-3.5 w-3.5 text-gray-400 mx-auto" />}
                                    </td>
                                    <td className="px-3 py-3">
                                      <span className="font-bold text-indigo-600">{b.gr_no}</span>
                                      <div className="text-[10px] text-gray-400 uppercase">
                                        {(b.source === 'regular' || b.source === 'bilty') ? 'bilty' : 'station'}
                                      </div>
                                    </td>
                                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                                      {b.bilty_date ? format(new Date(b.bilty_date), 'dd MMM yy') : '—'}
                                    </td>
                                    <td className="px-3 py-3 max-w-[140px]">
                                      <p className="text-gray-800 font-medium text-xs truncate">{b.consignor_name || '—'}</p>
                                    </td>
                                    <td className="px-3 py-3 max-w-[140px]">
                                      <p className="text-gray-800 font-medium text-xs truncate">{b.consignee_name || '—'}</p>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                      <span className="text-[11px] text-gray-500">{b.from_city || '—'}</span>
                                      <span className="text-gray-300 mx-1">→</span>
                                      <span className="text-[11px] text-gray-500">{b.to_city || '—'}</span>
                                    </td>
                                    <td className="px-3 py-3 text-center"><PayBadge mode={b.payment_mode} /></td>
                                    <td className="px-3 py-3 text-center">
                                      <span className="text-xs font-semibold text-gray-700">{b.no_of_pkg ?? '—'}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                      <span className="text-xs text-gray-700 font-medium">{b.wt ?? '—'}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                      <span className="text-xs font-bold text-gray-900">₹{fmt(b.total)}</span>
                                    </td>
                                    {/* Challan */}
                                    <td className="px-3 py-3">
                                      {b.challan_no ? (
                                        <div>
                                          <span className="text-[11px] font-bold text-gray-700 font-mono">{b.challan_no}</span>
                                          {cd && (
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                              <div className="flex items-center gap-1">
                                                {cd.is_dispatched
                                                  ? <Send className="h-2.5 w-2.5 text-emerald-500" />
                                                  : <Calendar className="h-2.5 w-2.5 text-gray-400" />}
                                                <span className="text-[9px] text-gray-500">{cd.challan_date || '—'}</span>
                                              </div>
                                              {cd.is_received_at_hub && cd.received_at_hub_timing && (
                                                <div className="flex items-center gap-1">
                                                  <Warehouse className="h-2.5 w-2.5 text-teal-500" />
                                                  <span className="text-[9px] text-teal-600 font-medium">
                                                    {(() => { try { return format(new Date(cd.received_at_hub_timing), 'dd MMM yy'); } catch { return cd.received_at_hub_timing; } })()}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-gray-300 text-xs italic">—</span>
                                      )}
                                    </td>
                                    {/* Pohonch / Crossing */}
                                    <td className="px-3 py-3">
                                      <div className="space-y-1">
                                        {b.pohonch_number ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-bold border border-indigo-100">
                                            <Hash className="h-3 w-3" />{b.pohonch_number}
                                          </span>
                                        ) : (
                                          <span className="text-gray-300 text-xs italic">—</span>
                                        )}
                                        {b.bilty_number && (
                                          <p className="text-[10px] text-gray-500"><span className="font-semibold">Bilty:</span> {b.bilty_number}</p>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                      <span className={`text-xs font-bold ${b.kaat != null ? 'text-rose-600' : 'text-gray-300'}`}>
                                        {b.kaat != null ? `₹${fmt(b.kaat)}` : '—'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                      <span className="text-xs text-gray-500">
                                        {b.kaat_rate != null ? `${b.kaat_rate}` : '—'}
                                      </span>
                                    </td>
                                  </tr>

                                  {/* Expanded detail row */}
                                  {isExpanded && (
                                    <tr className="bg-teal-50/40">
                                      <td colSpan={14} className="px-6 py-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                          <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Charge Breakdown</p>
                                            <div className="space-y-1">
                                              <ChargeRow label="Freight"  val={b.freight_amount} />
                                              <ChargeRow label="PF"       val={b.pf_charge} />
                                              <ChargeRow label="DD"       val={b.dd_charge} />
                                              <ChargeRow label="Labour"   val={b.labour_charge} />
                                              <ChargeRow label="Bill"     val={b.bill_charge} />
                                              <ChargeRow label="Toll"     val={b.toll_charge} />
                                              <ChargeRow label="Other"    val={b.other_charge} />
                                              <div className="border-t border-gray-200 pt-1 mt-1">
                                                <ChargeRow label="Total"  val={b.total} bold />
                                              </div>
                                            </div>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Kaat Details</p>
                                            <div className="space-y-1">
                                              <ChargeRow label="Kaat"    val={b.kaat} />
                                              <ChargeRow label="Kaat PF" val={b.kaat_pf} />
                                              <ChargeRow label="Kaat DD" val={b.kaat_dd} />
                                              <div className="mt-2">
                                                <p className="text-gray-500"><span className="font-semibold">Rate:</span> {b.kaat_rate ?? '—'}</p>
                                              </div>
                                            </div>
                                            {b.crossing_challans && (
                                              <div className="mt-3">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Crossing Challans</p>
                                                <p className="font-mono text-gray-700 font-semibold">{b.crossing_challans}</p>
                                              </div>
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Challan Dispatch</p>
                                            {cd ? (
                                              <div className="space-y-1.5">
                                                <p className="text-gray-700 font-mono font-bold">{b.challan_no || '—'}</p>
                                                <p className="text-gray-500"><span className="font-semibold">Date:</span> {cd.challan_date || '—'}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                  {cd.is_dispatched
                                                    ? <><Send className="h-3 w-3 text-emerald-500" /><span className="text-emerald-700 font-semibold">Dispatched</span></>
                                                    : <><Calendar className="h-3 w-3 text-gray-400" /><span className="text-gray-500">Not dispatched</span></>}
                                                </div>
                                                {cd.is_dispatched && cd.dispatch_date && (
                                                  <p className="text-gray-500 text-[10px]">{fmtDateTime(cd.dispatch_date)}</p>
                                                )}
                                                <div className="flex items-center gap-1.5 mt-1">
                                                  {cd.is_received_at_hub
                                                    ? <><Warehouse className="h-3 w-3 text-teal-500" /><span className="text-teal-700 font-semibold">Received at Hub</span></>
                                                    : <><Warehouse className="h-3 w-3 text-gray-300" /><span className="text-gray-400">Not received</span></>}
                                                </div>
                                                {cd.is_received_at_hub && cd.received_at_hub_timing && (
                                                  <p className="text-gray-500 text-[10px]">{fmtDateTime(cd.received_at_hub_timing)}</p>
                                                )}
                                                {cd.total_bilty_count != null && (
                                                  <p className="text-gray-500 mt-1"><span className="font-semibold">Total bilties:</span> {cd.total_bilty_count}</p>
                                                )}
                                                {cd.remarks && <p className="text-gray-500 mt-1 italic">{cd.remarks}</p>}
                                              </div>
                                            ) : (
                                              <p className="text-gray-400 italic">{b.challan_no ? `Challan ${b.challan_no} — details not found` : 'No challan assigned'}</p>
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Contents / Transport</p>
                                            <p className="text-gray-700">{b.contain || '—'}</p>
                                            {b.pvt_marks && <><p className="text-[10px] font-bold text-gray-400 uppercase mt-2 mb-1">Pvt Marks</p><p className="text-gray-700">{b.pvt_marks}</p></>}
                                            {b.remark && <><p className="text-[10px] font-bold text-gray-400 uppercase mt-2 mb-1">Remarks</p><p className="text-gray-700">{b.remark}</p></>}
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-3 mb-1">Transport</p>
                                            <p className="text-gray-700 font-medium">{b.transport_name}</p>
                                            <p className="text-gray-500 font-mono text-[11px] mt-1">{b.transport_gst}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 mb-1">Source</p>
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                              (b.source === 'regular' || b.source === 'bilty')
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : 'bg-purple-50 text-purple-700 border-purple-200'
                                            }`}>
                                              {(b.source === 'regular' || b.source === 'bilty') ? 'bilty table' : 'station table'}
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                            {/* Group totals row */}
                            <tr className="bg-teal-50 border-t-2 border-teal-200 font-bold">
                              <td colSpan={7} className="px-3 py-2.5 text-right text-xs text-teal-700 uppercase tracking-wide">
                                Subtotal ({groupBilties.length})
                              </td>
                              <td className="px-3 py-2.5 text-center text-xs text-gray-900">{grpTotals.pkg}</td>
                              <td className="px-3 py-2.5 text-right text-xs text-gray-900">{grpTotals.wt.toFixed(1)}</td>
                              <td className="px-3 py-2.5 text-right text-xs text-gray-900">₹{fmt(grpTotals.freight)}</td>
                              <td colSpan={2} className="px-3 py-2.5"></td>
                              <td className="px-3 py-2.5 text-right text-xs text-rose-700">₹{fmt(grpTotals.kaat)}</td>
                              <td className="px-3 py-2.5"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards */}
                      <div className="lg:hidden divide-y divide-gray-100">
                        {groupBilties.map((b, idx) => {
                          const isExpanded = expandedRows.has(b.gr_no);
                          const cd = b.challan_dispatch_date && typeof b.challan_dispatch_date === 'object'
                            ? b.challan_dispatch_date : null;
                          return (
                            <div key={`${b.gr_no}-${idx}`} className="p-4">
                              <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleRow(b.gr_no)}>
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <Hash className="h-4 w-4 text-indigo-600" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-indigo-600 text-sm">{b.gr_no}</p>
                                    <p className="text-xs text-gray-500">{b.bilty_date ? format(new Date(b.bilty_date), 'dd MMM yy') : '—'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <PayBadge mode={b.payment_mode} />
                                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                <InfoChip icon={<Building2 className="h-3 w-3" />} label={b.consignor_name} />
                                <InfoChip icon={<Building2 className="h-3 w-3" />} label={b.consignee_name} />
                                <InfoChip icon={<MapPin className="h-3 w-3" />} label={`${b.from_city} → ${b.to_city}`} />
                                <InfoChip icon={<IndianRupee className="h-3 w-3" />} label={`₹${fmt(b.total)}`} bold />
                                {b.challan_no && <InfoChip icon={<FileText className="h-3 w-3" />} label={b.challan_no} />}
                                {b.pohonch_number && <InfoChip icon={<Hash className="h-3 w-3" />} label={b.pohonch_number} color="indigo" />}
                                {b.kaat != null && <InfoChip icon={<IndianRupee className="h-3 w-3" />} label={`Kaat ₹${fmt(b.kaat)}`} color="rose" />}
                              </div>
                              {b.crossing_challans && (
                                <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="text-[11px] font-semibold text-emerald-700">Crossing: {b.crossing_challans}</span>
                                </div>
                              )}
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs text-gray-600">
                                  <div>
                                    <p className="font-bold text-gray-400 uppercase text-[10px] mb-1">Charges</p>
                                    <p>Freight: ₹{fmt(b.freight_amount)}</p>
                                    <p>PF: ₹{fmt(b.pf_charge)}</p>
                                    <p>DD: ₹{fmt(b.dd_charge)}</p>
                                    <p>Labour: ₹{fmt(b.labour_charge)}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-400 uppercase text-[10px] mb-1">Kaat</p>
                                    <p>Kaat: ₹{fmt(b.kaat)}</p>
                                    <p>PF: ₹{fmt(b.kaat_pf)}</p>
                                    <p>DD: ₹{fmt(b.kaat_dd)}</p>
                                    <p>Rate: {b.kaat_rate ?? '—'}</p>
                                  </div>
                                  {cd && (
                                    <div className="col-span-2">
                                      <p className="font-bold text-gray-400 uppercase text-[10px] mb-1">Challan Dispatch</p>
                                      <p>Challan: <span className="font-mono font-bold">{b.challan_no || '—'}</span> · Date: {cd.challan_date || '—'}</p>
                                      <p className="mt-0.5">
                                        {cd.is_dispatched
                                          ? <span className="text-emerald-700 font-semibold">Dispatched {cd.dispatch_date ? `· ${fmtDateTime(cd.dispatch_date)}` : ''}</span>
                                          : <span className="text-gray-400">Not dispatched</span>}
                                      </p>
                                      <p className="mt-0.5">
                                        {cd.is_received_at_hub
                                          ? <span className="text-teal-700 font-semibold">Received at Hub {cd.received_at_hub_timing ? `· ${fmtDateTime(cd.received_at_hub_timing)}` : ''}</span>
                                          : <span className="text-gray-400">Not received at hub</span>}
                                      </p>
                                    </div>
                                  )}
                                  {b.contain && <div className="col-span-2"><p className="font-bold text-gray-400 uppercase text-[10px] mb-1">Contents</p><p>{b.contain}</p></div>}
                                  {b.remark  && <div className="col-span-2"><p className="font-bold text-gray-400 uppercase text-[10px] mb-1">Remark</p><p>{b.remark}</p></div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────────

function SummaryCard({ label, value, color }) {
  const colorMap = {
    teal:   'from-teal-500 to-emerald-600 shadow-teal-200/50',
    indigo: 'from-indigo-500 to-purple-600 shadow-indigo-200/50',
    amber:  'from-amber-500 to-orange-500 shadow-amber-200/50',
    blue:   'from-blue-500 to-cyan-600 shadow-blue-200/50',
    purple: 'from-purple-500 to-violet-600 shadow-purple-200/50',
    gray:   'from-gray-500 to-slate-600 shadow-gray-200/50',
    green:  'from-green-500 to-teal-600 shadow-green-200/50',
    rose:   'from-rose-500 to-pink-600 shadow-rose-200/50',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-4 flex items-center gap-3">
      <div className={`w-2 h-10 rounded-full bg-gradient-to-b ${colorMap[color] || colorMap.gray} shadow-lg`} />
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

function ChargeRow({ label, val, bold }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span>₹{val != null ? Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</span>
    </div>
  );
}

function InfoChip({ icon, label, bold, color }) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    rose:   'bg-rose-50 text-rose-700 border-rose-100',
  };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border truncate ${
      color ? colorMap[color] : 'bg-gray-50 text-gray-600 border-gray-100'
    } ${bold ? 'font-bold' : ''}`}>
      <span className="text-current opacity-60 shrink-0">{icon}</span>
      <span className="truncate text-[11px]">{label || '—'}</span>
    </div>
  );
}
