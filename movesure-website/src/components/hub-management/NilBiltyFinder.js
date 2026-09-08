'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import {
  PackagePlus, Loader2, RefreshCw, AlertCircle, CheckCircle2,
  MapPin, Calendar, X, Package, ArrowRight, Info, Tag, Truck, Search,
} from 'lucide-react';

const API_BASE = 'https://api.movesure.io';
const Rs = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const monthInputValue = (d) => format(d, 'yyyy-MM');
const monthRange = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number);
  const from = new Date(y, m - 1, 1);
  const to   = new Date(y, m, 0); // last day of month
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

const fetchNilBilties = async ({ transportGstin, fromDate, toDate, stationName }) => {
  const p = new URLSearchParams({ transport_gstin: transportGstin, from_date: fromDate, to_date: toDate });
  if (stationName?.trim()) p.set('station_name', stationName.trim());
  const res  = await fetch(`${API_BASE}/api/crossing-bill/nil-bilties?${p}`);
  const json = await res.json();
  if (!res.ok || json.status === 'error') {
    if (res.status === 404) return { notFound: true };
    throw new Error(json.message || 'Failed to load nil bilties');
  }
  return { data: json.data };
};

/* ─── Bucket table (no_pohonch / pohonch_unbilled / pohonch_billed) ─────────── */
function BucketTable({ rows, tone = 'gray' }) {
  const toneCls = {
    red:    'bg-red-50 text-red-700 border-red-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-100',
    emerald:'bg-emerald-50 text-emerald-700 border-emerald-100',
    gray:   'bg-gray-50 text-gray-600 border-gray-100',
  }[tone];

  if (!rows?.length) return <p className="text-xs text-gray-400 italic py-3 text-center">Nothing here</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className={`border-b ${toneCls}`}>
            {['GR No', 'Challan', 'Consignor', 'Consignee', 'Pkg', 'Wt', 'Amount', 'Bilty Date', 'Dispatch → Arrival', 'Extra'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => (
            <tr key={`${b.gr_no}-${i}`} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
              <td className="px-3 py-2 font-mono font-bold text-gray-800">{b.gr_no}</td>
              <td className="px-3 py-2 text-gray-600">{b.challan_no || '-'}</td>
              <td className="px-3 py-2 text-gray-700 truncate max-w-[140px]" title={b.consignor_name}>{b.consignor_name || '-'}</td>
              <td className="px-3 py-2 text-gray-700 truncate max-w-[140px]" title={b.consignee_name}>{b.consignee_name || '-'}</td>
              <td className="px-3 py-2 text-center text-gray-700">{b.packages ?? '-'}</td>
              <td className="px-3 py-2 text-right text-gray-700">{b.weight != null ? `${b.weight} kg` : '-'}</td>
              <td className="px-3 py-2 text-right font-bold text-gray-800">{Rs(b.amount)}</td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(b.bilty_date)}</td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                {b.dispatch_date
                  ? <span title={`Dispatched ${fmtDateTime(b.dispatch_date)}`}>{fmtDateTime(b.dispatch_date)} <ArrowRight className="w-2.5 h-2.5 inline text-gray-300 mx-0.5" /> <span className="font-semibold text-gray-700">{fmtDate(b.arrival_date)}</span></span>
                  : '-'}
              </td>
              <td className="px-3 py-2 text-gray-500 text-[10px] whitespace-nowrap">
                {b.pohonch_number && <span className="font-mono">{b.pohonch_number}</span>}
                {b.bill_no && <span className="ml-1 font-mono text-emerald-600">{b.bill_no}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Boundary proof panel (just before / just after the window) ────────────── */
function BoundaryPanel({ label, block }) {
  if (!block) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <p className="text-[10px] font-bold text-slate-500 uppercase">{label} — cutoff {block.edge_date}</p>
      </div>
      <p className="text-[10px] text-slate-400 italic">{block.note}</p>
      {block.bilties?.length ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['GR No', 'Bilty Date', 'Dispatch', 'Arrival'].map(h => (
                  <th key={h} className="px-2.5 py-1.5 text-left text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.bilties.map((b, i) => (
                <tr key={`${b.gr_no}-${i}`} className="border-b border-slate-50 last:border-0">
                  <td className="px-2.5 py-1.5 font-mono font-bold text-slate-700">{b.gr_no}</td>
                  <td className="px-2.5 py-1.5 text-slate-500 whitespace-nowrap">{fmtDate(b.bilty_date)}</td>
                  <td className="px-2.5 py-1.5 text-slate-500 whitespace-nowrap">{fmtDateTime(b.dispatch_date)}</td>
                  <td className="px-2.5 py-1.5 text-slate-600 font-semibold whitespace-nowrap">{fmtDate(b.arrival_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[10px] text-slate-300 italic">No bilties found near this edge.</p>
      )}
    </div>
  );
}

/* ─── Create catch-up pohonch — preview + button, no free-text anywhere ─────── */
function CreateCatchupBar({ transportGstin, fromDate, toDate, noPohonch, userId, token, onCreated }) {
  const [creating, setCreating] = useState(false);
  const [error,    setError]    = useState(null);
  const [result,   setResult]   = useState(null);

  useEffect(() => { setResult(null); setError(null); }, [transportGstin, fromDate, toDate]);

  const nilCount    = noPohonch?.bilties?.length || 0;
  const nillMarker  = noPohonch?.suggested_pohonch_payload?.nill_marker;
  const challanNos  = noPohonch?.suggested_pohonch_payload?.challan_nos || [];

  const handleCreate = async () => {
    setCreating(true); setError(null);
    try {
      // Deliberately no station_name here — a catch-up pohonch must cover every
      // destination on the transport's dispatched challans, not one filtered city.
      const res = await fetch(`${API_BASE}/api/crossing-bill/nil-bilties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ transport_gstin: transportGstin, from_date: fromDate, to_date: toDate, created_by: userId }),
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Failed to create catch-up pohonch');
      setResult(json);
      onCreated?.(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  if (result) {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-sm font-black text-emerald-800">
            Pohonch <span className="font-mono">{result.pohonch_number}</span> created for {result.bilty_count} bilties.
          </p>
        </div>
        <p className="text-[11px] text-emerald-700 pl-6">
          Tagged <span className="font-mono font-bold">{result.kaat_marker}</span> on {result.kaat_marked_count} kaat rows.
          {result.kaat_missing_count > 0 && (
            <span className="text-amber-600 font-semibold"> {result.kaat_missing_count} GR(s) had no kaat row yet: {result.kaat_missing_gr_nos?.join(', ')}.</span>
          )}
        </p>
      </div>
    );
  }

  if (nilCount === 0) {
    return (
      <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Nothing to catch up — every dispatched bilty already has proof.
      </div>
    );
  }

  return (
    <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3">
      {/* Read-only preview — nothing here is user-editable */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-teal-300 rounded-lg text-[11px]">
          <Tag className="w-3 h-3 text-teal-500" />
          <span className="text-teal-500 font-semibold">This month&apos;s tag:</span>
          <span className="font-mono font-black text-teal-800">{nillMarker || '…'}</span>
        </span>
        <span className="text-[11px] text-teal-700 font-semibold">{nilCount} GRs · {Math.round(noPohonch.total_weight || 0)} kg · {Rs(noPohonch.total_amount)} · {noPohonch.total_packages || 0} pkgs</span>
      </div>
      {challanNos.length > 0 && (
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-teal-500 uppercase mt-0.5 shrink-0">Challans covered:</span>
          <div className="flex flex-wrap gap-1">
            {challanNos.map(c => (
              <span key={c} className="px-1.5 py-0.5 bg-white border border-teal-200 rounded text-[10px] font-mono font-bold text-teal-700">{c}</span>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={handleCreate} disabled={creating}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-sm font-black hover:opacity-90 disabled:opacity-50 shadow-sm"
      >
        {creating ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <><PackagePlus className="w-4 h-4" />Create Catch-up Pohonch ({nilCount} GRs)</>}
      </button>
      {error && <div className="flex items-center gap-1.5 text-[11px] text-red-600"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</div>}
    </div>
  );
}

/* ─── Inspect-by-destination — separate, explicitly read-only report ───────── */
function InspectByDestination({ transportGstin, fromDate, toDate }) {
  const [open,        setOpen]        = useState(false);
  const [stationName, setStationName] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [data,        setData]        = useState(null);

  const runSearch = async () => {
    if (!stationName.trim()) return;
    setLoading(true); setError(null);
    try {
      const r = await fetchNilBilties({ transportGstin, fromDate, toDate, stationName });
      if (r.notFound) { setData(null); setError('Unknown station, or nothing dispatched to it in this range.'); return; }
      setData(r.data);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <details className="group" open={open} onToggle={(e) => setOpen(e.target.open)}>
      <summary className="cursor-pointer text-[11px] font-bold text-gray-400 hover:text-gray-600 select-none flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5" />
        Inspect one destination (read-only — not for creating a pohonch)
      </summary>
      <div className="mt-2 space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text" value={stationName} onChange={e => setStationName(e.target.value)}
            placeholder="e.g. BAHRAICHE" onKeyDown={e => e.key === 'Enter' && runSearch()}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500 w-52"
          />
          <button
            onClick={runSearch} disabled={loading || !stationName.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Search
          </button>
        </div>

        {error && <p className="text-[11px] text-red-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</p>}

        {data && (
          <>
            {data.partial_scope_warning && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{data.partial_scope_warning} This view is for inspection only — use the main &ldquo;Create Catch-up Pohonch&rdquo; above (no station filter) to actually raise a pohonch, or every other destination on these same challans stays uncovered.</span>
              </div>
            )}
            <p className="text-[11px] font-bold text-gray-500">
              {data.totals.no_pohonch} nil bilty(s) for <span className="font-mono">{stationName.trim()}</span> in this range.
            </p>
            <BucketTable rows={data.no_pohonch?.bilties} tone="red" />
          </>
        )}
      </div>
    </details>
  );
}

/* ─── Nil Bilty Finder — modal, 90% viewport ─────────────────────────────── */
export default function NilBiltyFinder({ isOpen, onClose, transportGstin, transportName, userId, token, onPohonchCreated }) {
  const defaultMonth = useMemo(() => {
    const d = new Date();
    return monthInputValue(new Date(d.getFullYear(), d.getMonth() - 1, 1)); // previous full month
  }, []);

  const [month,   setMonth]   = useState(defaultMonth);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [result,  setResult]  = useState(null);

  const { from_date, to_date } = useMemo(() => monthRange(month), [month]);

  // Main scope — deliberately no station_name: this is what the whole transport is judged against.
  const fetchNil = useCallback(async () => {
    if (!transportGstin) return;
    setLoading(true); setError(null);
    try {
      const r = await fetchNilBilties({ transportGstin, fromDate: from_date, toDate: to_date });
      if (r.notFound) { setResult(null); setError('No dispatched bilties found for this transport in this range.'); return; }
      setResult(r.data);
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [transportGstin, from_date, to_date]);

  // Auto-run whenever the modal opens, or the month changes while open
  useEffect(() => { if (isOpen) fetchNil(); }, [isOpen, fetchNil]);

  if (!isOpen) return null;

  const noPohonch = result?.no_pohonch;
  const nilCount  = noPohonch?.bilties?.length || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[5vh] bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-gray-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <PackagePlus className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="text-base font-black text-white">Nil Bilty Finder — Catch-up Pohonch</h2>
              <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                {transportName && <><Truck className="w-3 h-3" />{transportName} · </>}
                <span className="font-mono">{transportGstin}</span>
              </p>
            </div>
            {nilCount > 0 && (
              <span className="ml-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {nilCount} nil
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Only input: month — no free-text pohonch/tag field anywhere */}
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />Month</label>
              <input
                type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              onClick={fetchNil} disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Searching…' : 'Refresh'}
            </button>
            <span className="text-[11px] text-gray-400 font-mono">{from_date} → {to_date} (1-day transit lag applied · all destinations)</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {loading && !result && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />Searching dispatched bilties…
            </div>
          )}

          {result && (
            <>
              {/* Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Dispatched (matching)', value: result.totals.dispatched_matching, cls: 'bg-gray-50 border-gray-100 text-gray-700' },
                  { label: 'No Pohonch (nil)',       value: result.totals.no_pohonch,          cls: 'bg-rose-50 border-rose-100 text-rose-700' },
                  { label: 'Pohonch, Unbilled',      value: result.totals.pohonch_unbilled,     cls: 'bg-amber-50 border-amber-100 text-amber-700' },
                  { label: 'Pohonch, Billed',        value: result.totals.pohonch_billed,       cls: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.cls}`}>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{s.label}</p>
                    <p className="text-xl font-black">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* No-pohonch bucket — the actionable one */}
              {nilCount > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    No Pohonch — every destination
                  </p>
                  <BucketTable rows={noPohonch.bilties} tone="red" />
                </div>
              )}

              {/* Create bar — preview + single action, never a free-text field */}
              <CreateCatchupBar
                transportGstin={transportGstin}
                fromDate={from_date}
                toDate={to_date}
                noPohonch={noPohonch}
                userId={userId}
                token={token}
                onCreated={(data) => { onPohonchCreated?.(data); fetchNil(); }}
              />

              {/* Secondary buckets */}
              {(result.pohonch_unbilled?.length > 0 || result.pohonch_billed?.length > 0) && (
                <details className="group">
                  <summary className="cursor-pointer text-[11px] font-bold text-gray-400 hover:text-gray-600 select-none">
                    Show pohonch already raised for this range ({(result.pohonch_unbilled?.length || 0) + (result.pohonch_billed?.length || 0)})
                  </summary>
                  <div className="mt-2 space-y-3">
                    {result.pohonch_unbilled?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Pohonch raised, not yet billed</p>
                        <BucketTable rows={result.pohonch_unbilled} tone="amber" />
                      </div>
                    )}
                    {result.pohonch_billed?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Pohonch raised &amp; billed</p>
                        <BucketTable rows={result.pohonch_billed} tone="emerald" />
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Boundary proof */}
              {result.boundary_proof && (
                <details className="group">
                  <summary className="cursor-pointer text-[11px] font-bold text-gray-400 hover:text-gray-600 select-none">
                    Boundary proof — why bilties just outside the window were excluded
                  </summary>
                  <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <BoundaryPanel label="Just before window" block={result.boundary_proof.before} />
                    <BoundaryPanel label="Just after window" block={result.boundary_proof.after} />
                  </div>
                </details>
              )}

              {/* Read-only, explicitly separate per-destination report */}
              <InspectByDestination transportGstin={transportGstin} fromDate={from_date} toDate={to_date} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
