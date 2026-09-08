'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import {
  FileSearch, Loader2, RefreshCw, AlertCircle, CheckCircle2, XCircle,
  MapPin, Calendar, X, Truck, ChevronDown, ChevronRight, Search, ArrowRight, Info,
} from 'lucide-react';

const API_BASE = 'https://api.movesure.io';
const Rs = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const monthInputValue = (d) => format(d, 'yyyy-MM');
const monthRange = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number);
  const from = new Date(y, m - 1, 1);
  const to   = new Date(y, m, 0);
  return { from_date: format(from, 'yyyy-MM-dd'), to_date: format(to, 'yyyy-MM-dd') };
};
const fmtDateTime = (iso) => {
  if (!iso) return '-';
  try { return format(new Date(iso), 'dd MMM, HH:mm'); } catch { return iso; }
};
const fmtDate = (d) => {
  if (!d) return '-';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; }
};

/* ─── One bilty row ───────────────────────────────────────────────────────── */
function BiltyRow({ b, i }) {
  const hasProof = !!b.has_crossing_challan;
  const tagMismatch = b.kaat_pohonch_no && b.pohonch_number && b.kaat_pohonch_no !== b.pohonch_number;

  return (
    <tr className={`border-b border-gray-50 last:border-0 ${hasProof ? (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30') : 'bg-red-50/50'}`}>
      <td className="px-3 py-2 font-mono font-bold text-gray-800 whitespace-nowrap">{b.gr_no}</td>
      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
        <span className="inline-flex items-center gap-1"><MapPin className="w-2.5 h-2.5 text-gray-400" />{b.station || '-'}</span>
      </td>
      <td className="px-3 py-2 text-gray-700 truncate max-w-[130px]" title={b.consignor_name}>{b.consignor_name || '-'}</td>
      <td className="px-3 py-2 text-gray-700 truncate max-w-[130px]" title={b.consignee_name}>{b.consignee_name || '-'}</td>
      <td className="px-3 py-2 text-center text-gray-700">{b.packages ?? '-'}</td>
      <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">{b.weight != null ? `${b.weight} kg` : '-'}</td>
      <td className="px-3 py-2 text-right font-bold text-gray-800 whitespace-nowrap">{Rs(b.amount)}</td>
      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(b.bilty_date)}</td>
      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
        {b.dispatch_date
          ? <span title={`Dispatched ${fmtDateTime(b.dispatch_date)}`}>{fmtDateTime(b.dispatch_date)} <ArrowRight className="w-2.5 h-2.5 inline text-gray-300 mx-0.5" /> <span className="font-semibold text-gray-700">{fmtDate(b.arrival_date)}</span></span>
          : '-'}
      </td>
      <td className="px-3 py-2">
        {hasProof ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="w-2.5 h-2.5" /> {b.pohonch_number}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 whitespace-nowrap">
            <XCircle className="w-2.5 h-2.5" /> No proof
          </span>
        )}
        {tagMismatch && (
          <div className="mt-0.5 text-[9px] text-amber-600 flex items-center gap-1" title="bilty_wise_kaat.pohonch_no differs from the real covering pohonch — the real one wins">
            <Info className="w-2.5 h-2.5 shrink-0" /> tag: {b.kaat_pohonch_no}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-[10px] whitespace-nowrap">
        {b.is_billed
          ? <span className="text-emerald-600 font-mono font-bold">{b.bill_no || 'Billed'}</span>
          : hasProof
            ? <span className="text-amber-600 font-semibold">Unbilled</span>
            : <span className="text-gray-300">-</span>}
      </td>
    </tr>
  );
}

/* ─── One challan group ───────────────────────────────────────────────────── */
function ChallanGroup({ c, open, onToggle, stationFilter }) {
  const bilties = stationFilter
    ? c.bilties.filter(b => (b.station || '').toUpperCase().includes(stationFilter))
    : c.bilties;

  if (stationFilter && bilties.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
          <span className="font-mono font-black text-gray-900 text-sm">{c.challan_no}</span>
          <span className="text-[11px] text-gray-400 whitespace-nowrap">
            {fmtDateTime(c.dispatch_date)} <ArrowRight className="w-2.5 h-2.5 inline mx-0.5" /> arrives {fmtDate(c.arrival_date)}
          </span>
          <span className="text-[11px] text-gray-500">{c.bilty_count} bilties</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {c.without_pohonch > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
              {c.without_pohonch} no proof
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              all covered
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['GR No', 'Station', 'Consignor', 'Consignee', 'Pkg', 'Wt', 'Amount', 'Bilty Date', 'Dispatch → Arrival', 'Proof', 'Billed'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bilties.map((b, i) => <BiltyRow key={`${b.gr_no}-${i}`} b={b} i={i} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Transport Challan Report — modal, 90% viewport ─────────────────────── */
export default function TransportChallanReport({ isOpen, onClose, transportGstin, transportName }) {
  const defaultMonth = useMemo(() => {
    const d = new Date();
    return monthInputValue(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const [month,          setMonth]          = useState(defaultMonth);
  const [stationFilter,  setStationFilter]  = useState('');
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [result,         setResult]         = useState(null);
  const [openChallans,   setOpenChallans]   = useState(new Set());
  const [onlyIssues,     setOnlyIssues]     = useState(false);

  const { from_date, to_date } = useMemo(() => monthRange(month), [month]);

  const fetchReport = useCallback(async () => {
    if (!transportGstin) return;
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ transport_gstin: transportGstin, from_date, to_date });
      const res  = await fetch(`${API_BASE}/api/crossing-bill/transport-challan-report?${p}`);
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Failed to load challan report');
      setResult(json.data);
      setOpenChallans(new Set((json.data?.challans || []).filter(c => c.without_pohonch > 0).map(c => c.challan_no)));
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [transportGstin, from_date, to_date]);

  useEffect(() => { if (isOpen) fetchReport(); }, [isOpen, fetchReport]);

  if (!isOpen) return null;

  const stationFilterUpper = stationFilter.trim().toUpperCase();
  const challansToShow = (result?.challans || []).filter(c => !onlyIssues || c.without_pohonch > 0);

  const toggleChallan = (no) => setOpenChallans(prev => { const n = new Set(prev); n.has(no) ? n.delete(no) : n.add(no); return n; });
  const expandAll   = () => setOpenChallans(new Set((result?.challans || []).map(c => c.challan_no)));
  const collapseAll = () => setOpenChallans(new Set());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[5vh] bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-gray-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSearch className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-black text-white">Transport Challan Report</h2>
              <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                {transportName && <><Truck className="w-3 h-3" />{transportName} · </>}
                <span className="font-mono">{transportGstin}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Controls */}
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />Month</label>
              <input
                type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />Station (display filter)</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text" value={stationFilter} onChange={e => setStationFilter(e.target.value)}
                  placeholder="All destinations" className="pl-8 pr-7 py-2 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500 w-52"
                />
                {stationFilter && (
                  <button onClick={() => setStationFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setOnlyIssues(v => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                onlyIssues ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" /> {onlyIssues ? 'Showing challans with issues only' : 'Show only challans missing proof'}
            </button>
            <button
              onClick={fetchReport} disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {result && <span className="text-[11px] text-gray-400 font-mono">{result.from_date} → {result.to_date} (1-day transit lag applied)</span>}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {loading && !result && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />Building report…
            </div>
          )}

          {result && (
            <>
              {/* Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Challans',        value: result.totals.challans,        cls: 'bg-gray-50 border-gray-100 text-gray-700' },
                  { label: 'Bilties',         value: result.totals.bilties,         cls: 'bg-sky-50 border-sky-100 text-sky-700' },
                  { label: 'With Proof',      value: result.totals.with_pohonch,    cls: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                  { label: 'Without Proof',   value: result.totals.without_pohonch, cls: result.totals.without_pohonch > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.cls}`}>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{s.label}</p>
                    <p className="text-xl font-black">{s.value}</p>
                  </div>
                ))}
              </div>

              {result.totals.without_pohonch === 0 && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Every bilty dispatched this month has real crossing-challan proof.
                </div>
              )}

              {/* Expand/collapse */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {challansToShow.length} challan{challansToShow.length !== 1 ? 's' : ''} shown
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={expandAll} className="text-[11px] font-bold text-sky-600 hover:text-sky-800">Expand all</button>
                  <span className="text-gray-300">·</span>
                  <button onClick={collapseAll} className="text-[11px] font-bold text-gray-500 hover:text-gray-700">Collapse all</button>
                </div>
              </div>

              {/* Challan groups */}
              <div className="space-y-2">
                {challansToShow.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-6 text-center">No challans match the current filters.</p>
                ) : (
                  challansToShow.map(c => (
                    <ChallanGroup
                      key={c.challan_no}
                      c={c}
                      open={openChallans.has(c.challan_no)}
                      onToggle={() => toggleChallan(c.challan_no)}
                      stationFilter={stationFilterUpper}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
