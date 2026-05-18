'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import Navbar from '../../../components/dashboard/navbar';
import TransportSearchSelect from '../../../components/hub-management/TransportSearchSelect';
import {
  ArrowLeft, Search, Loader2, AlertCircle,
  Package, Hash, Printer, X, Building2, Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  flattenResult,
  buildDestGroups,
  buildTransportParams,
  fmtN,
  fmtDisp,
} from '../../../components/hub-management/transportReportUtils';

import { generateCrossingBillsPDF } from '../../../components/hub-management/crossingBillsPdfHelper';
import CrossingBillsPreviewTable from '../../../components/hub-management/CrossingBillsPreviewTable';
import PrintColumnSelector from '../../../components/hub-management/PrintColumnSelector';
import { DEFAULT_SELECTED_COLS } from '../../../components/hub-management/crossingBillsColumns';

const API_BASE    = 'https://api.movesure.io';
const TODAY       = new Date().toISOString().split('T')[0];
const FIRST_MONTH = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

// ─── Checkbox UI primitive ────────────────────────────────────────────────────
function Checkbox({ checked }) {
  return checked ? (
    <span className="h-4 w-4 rounded border-2 border-gray-900 bg-gray-900 shrink-0 flex items-center justify-center">
      <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 5 4.5 9 11 1" />
      </svg>
    </span>
  ) : (
    <span className="h-4 w-4 rounded border-2 border-gray-300 bg-white shrink-0" />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CrossingBillsPage() {
  useAuth();
  const { token } = useAuth();
  const router = useRouter();

  const [selectedTransport, setSelectedTransport] = useState(null);
  const [fromDate, setFromDate]     = useState(FIRST_MONTH);
  const [toDate, setToDate]         = useState(TODAY);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [result, setResult]         = useState(null);

  const [showModal, setShowModal]         = useState(false);
  const [excludedGroups, setExcludedGroups]   = useState(new Set());
  const [excludedBilties, setExcludedBilties] = useState(new Set());
  const [pdfLoading, setPdfLoading]       = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl]       = useState(null);
  const [printFormat, setPrintFormat]     = useState(null); // 'pohonch' | 'bilty'
  const [billDate, setBillDate]           = useState(TODAY);
  const [showPreview, setShowPreview]     = useState(false);
  const [selectedCols, setSelectedCols]   = useState(DEFAULT_SELECTED_COLS);
  const [searchQuery, setSearchQuery]     = useState('');


  // ── Flatten & group bilties ────────────────────────────────────────────────
  const bilties = result ? flattenResult(result) : [];
  const groups  = useMemo(() => buildDestGroups(bilties), [bilties]);

  const pohonchGroups  = groups.filter(g => g.key !== 'NO_POHONCH');
  const noPohonchGroup = groups.find(g => g.key === 'NO_POHONCH');

  // ── Search filter ─────────────────────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map(g => ({
        ...g,
        bilties: g.bilties.filter(b =>
          (b.gr_no            || '').toLowerCase().includes(q) ||
          (b.dest_pohonch_no  || '').toLowerCase().includes(q) ||
          (b.bilty_number     || '').toLowerCase().includes(q) ||
          (b.consignor_name   || '').toLowerCase().includes(q) ||
          (b.consignee_name   || '').toLowerCase().includes(q) ||
          (b.to_city          || '').toLowerCase().includes(q) ||
          (b.payment_mode     || '').toLowerCase().includes(q) ||
          (b.contain          || b.contents || '').toLowerCase().includes(q) ||
          (b.bilty_date       || '').includes(q)
        ),
      }))
      .filter(g => g.bilties.length > 0);
  }, [groups, searchQuery]);

  const totalFilteredBilties = useMemo(
    () => filteredGroups.reduce((s, g) => s + g.bilties.length, 0),
    [filteredGroups]
  );

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!selectedTransport) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const params = buildTransportParams(selectedTransport, fromDate, toDate);
      const res  = await fetch(`${API_BASE}/api/bilty/transport-report?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok || data.status === 'error') throw new Error(data.message || 'API error');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openModal = () => {
    setExcludedGroups(new Set());
    setExcludedBilties(new Set());
    setPrintFormat(null);
    setShowModal(true);
  };

  const toggleGroup = (key) =>
    setExcludedGroups(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const toggleBilty = (grNo) =>
    setExcludedBilties(prev => {
      const n = new Set(prev);
      n.has(grNo) ? n.delete(grNo) : n.add(grNo);
      return n;
    });

  const toggleCol = (id) =>
    setSelectedCols(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const moveColUp = (id) =>
    setSelectedCols(prev => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const newCols = [...prev];
      [newCols[idx - 1], newCols[idx]] = [newCols[idx], newCols[idx - 1]];
      return newCols;
    });

  const moveColDown = (id) =>
    setSelectedCols(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const newCols = [...prev];
      [newCols[idx], newCols[idx + 1]] = [newCols[idx + 1], newCols[idx]];
      return newCols;
    });

  const includedCount = useMemo(() => {
    const pg = pohonchGroups
      .filter(g => !excludedGroups.has(g.key))
      .reduce((s, g) => s + g.bilties.filter(b => !excludedBilties.has(b.gr_no)).length, 0);
    const np = (noPohonchGroup?.bilties || []).filter(b => !excludedBilties.has(b.gr_no)).length;
    return pg + np;
  }, [pohonchGroups, noPohonchGroup, excludedGroups, excludedBilties]);

  // Stations gathered from bilties in non-excluded pohonch groups + no-pohonch group
  const pohonchStations = useMemo(() => {
    const visible = [
      ...pohonchGroups.filter(g => !excludedGroups.has(g.key)).flatMap(g => g.bilties),
      ...(noPohonchGroup?.bilties || []),
    ];
    const map = new Map();
    for (const b of visible) {
      const st = b.to_city || b.destination || 'Unknown';
      if (!map.has(st)) map.set(st, []);
      map.get(st).push(b);
    }
    return [...map.entries()]
      .map(([name, bs]) => ({ name, bs }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pohonchGroups, noPohonchGroup, excludedGroups]);

  const toggleStationBilties = (stBilties) => {
    const allSel = stBilties.every(b => !excludedBilties.has(b.gr_no));
    setExcludedBilties(prev => {
      const n = new Set(prev);
      if (allSel) stBilties.forEach(b => n.add(b.gr_no));
      else        stBilties.forEach(b => n.delete(b.gr_no));
      return n;
    });
  };

  // ── Generate PDF ───────────────────────────────────────────────────────────
  const generatePDF = () => generateCrossingBillsPDF({
    result,
    selectedTransport,
    fromDate,
    toDate,
    billDate,
    pohonchGroups,
    noPohonchGroup,
    excludedGroups,
    excludedBilties,
    printFormat: printFormat || 'pohonch',
    selectedCols,
    setShowModal,
    setPdfLoading,
    setPdfBlobUrl,
  });


  // ── Render ─────────────────────────────────────────────────────────
  // If preview table is open, show it fullscreen
  if (showPreview) {
    return (
      <CrossingBillsPreviewTable
        pohonchGroups={pohonchGroups}
        noPohonchGroup={noPohonchGroup}
        excludedGroups={excludedGroups}
        excludedBilties={excludedBilties}
        printFormat={printFormat || 'pohonch'}
        transportName={result?.transport_name}
        transportGst={result?.transport_gst}
        fromDate={fromDate}
        toDate={toDate}
        billDate={billDate}
        selectedCols={selectedCols}
        onClose={() => setShowPreview(false)}
        onBackToSettings={() => { setShowPreview(false); setShowModal(true); }}
        onPrint={() => { setShowPreview(false); generatePDF(); }}
        onToggleBilty={toggleBilty}
        pdfLoading={pdfLoading}
      />
    );
  }

  // If PDF blob is ready, show fullscreen iframe viewer
  if (pdfBlobUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-gray-700">
          <p className="text-sm font-bold text-white">
            PDF Preview  ·  {result?.transport_name}
          </p>
          <div className="flex items-center gap-2">
            <a
              href={pdfBlobUrl}
              download={(() => {
                const name = (result?.transport_name || 'TRANSPORT')
                  .toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');
                const fmt = (d) => { const [,m,dy] = d.split('-'); return `${dy}-${m}`; };
                return `${name}__${fmt(fromDate)}__${fmt(toDate)}.pdf`;
              })()}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
            >
              Download PDF
            </a>
            <button
              onClick={() => { URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); }}
              className="px-4 py-1.5 bg-gray-700 text-white rounded-lg text-xs font-bold hover:bg-gray-600 transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>
        {/* Full-width iframe */}
        <iframe
          src={pdfBlobUrl}
          className="flex-1 w-full"
          style={{ border: 'none' }}
          title="PDF Preview"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 xl:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Crossing Based Bills</h1>
            <p className="text-xs text-gray-500">Generate & print transport bilty reports grouped by Pohonch Number</p>
          </div>
        </div>
        {result && (
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print Bills
          </button>
        )}
      </div>

      <div className="px-4 sm:px-6 xl:px-10 py-6 space-y-5">

        {/* ── Search Form ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Search Transport</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5 xl:col-span-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Transport Name / GSTIN</label>
              <TransportSearchSelect
                value={selectedTransport}
                onChange={(t) => { setSelectedTransport(t); setResult(null); setError(null); }}
                placeholder="Type name or GSTIN to search…"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">From Date</label>
              <input
                type="date" value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-400/40 focus:border-gray-500 transition-all text-gray-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">To Date</label>
              <input
                type="date" value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-400/40 focus:border-gray-500 transition-all text-gray-900"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading || !selectedTransport}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Loading…' : 'Search'}
            </button>
          </div>
        </form>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {result && (
          <>
            {/* Summary chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryChip label="Total Bilties"   value={bilties.length} />
              <SummaryChip label="Pohonch Numbers" value={pohonchGroups.length} />
              <SummaryChip label="With Pohonch"    value={pohonchGroups.reduce((s, g) => s + g.bilties.length, 0)} />
              <SummaryChip label="No Pohonch"      value={noPohonchGroup?.bilties.length ?? 0} />
            </div>

            {/* Search bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by GR No, Consignor, Consignee, City, Mode, Content…"
                  className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-400/40 focus:border-gray-600 transition-all text-gray-900 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2 text-xs text-gray-500">
                {searchQuery ? (
                  <>
                    <span className="font-bold text-gray-900 text-sm">{totalFilteredBilties}</span>
                    <span>of {bilties.length} bilties match</span>
                    <span className="text-gray-300">·</span>
                    <span className="font-semibold text-gray-700">{filteredGroups.length} group{filteredGroups.length !== 1 ? 's' : ''}</span>
                  </>
                ) : (
                  <span className="text-gray-400 italic">Sorted by date ascending</span>
                )}
              </div>
            </div>

            {/* Grouped preview */}
            <div className="space-y-4">
              {filteredGroups.length === 0 && searchQuery && (
                <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center">
                  <Search className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-500">No bilties match</p>
                  <p className="text-xs text-gray-400 mt-1">"{searchQuery}"</p>
                  <button onClick={() => setSearchQuery('')} className="mt-3 text-xs font-semibold text-gray-600 hover:text-gray-900 underline">Clear search</button>
                </div>
              )}
              {filteredGroups.map(({ key, bilties: gb }) => (
                <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
                  {/* Group heading */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-gray-800 rounded-lg">
                        <Hash className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-base font-black text-gray-900">
                        {key === 'NO_POHONCH' ? 'No Pohonch Available' : key}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {gb[0]?.bilty_date && (
                        <span className="text-[10px] text-gray-400 font-medium">
                          {format(new Date(gb[0].bilty_date), 'dd MMM yy')}
                          {gb.length > 1 && gb[gb.length-1]?.bilty_date && gb[0].bilty_date !== gb[gb.length-1].bilty_date
                            ? ` – ${format(new Date(gb[gb.length-1].bilty_date), 'dd MMM yy')}`
                            : ''}
                        </span>
                      )}
                      <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full">
                        {gb.length} bilties
                      </span>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {['GR No', 'Bilty No', 'Date', 'Consignor', 'Consignee', 'Destination', 'Mode', 'Pkgs', 'Wt', 'Total', 'Kaat'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {gb.map((b, i) => {
                          const q = searchQuery.trim().toLowerCase();
                          const highlight = q && (
                            (b.gr_no          || '').toLowerCase().includes(q) ||
                            (b.consignor_name || '').toLowerCase().includes(q) ||
                            (b.consignee_name || '').toLowerCase().includes(q) ||
                            (b.to_city        || '').toLowerCase().includes(q)
                          );
                          return (
                            <tr key={`${b.gr_no}-${i}`} className={`hover:bg-gray-50/60 ${highlight ? 'bg-yellow-50' : ''}`}>
                              <td className="px-3 py-2 font-bold text-gray-800 whitespace-nowrap">{b.gr_no}</td>
                              <td className="px-3 py-2 font-mono text-gray-700 whitespace-nowrap">{b.dest_pohonch_no || b.bilty_number || '—'}</td>
                              <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                                {b.bilty_date ? format(new Date(b.bilty_date), 'dd MMM yy') : '—'}
                              </td>
                              <td className="px-3 py-2 text-gray-600 max-w-[130px] truncate">{b.consignor_name || '—'}</td>
                              <td className="px-3 py-2 text-gray-600 max-w-[130px] truncate">{b.consignee_name || '—'}</td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{b.to_city || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  b.payment_mode === 'paid'   ? 'bg-emerald-100 text-emerald-700' :
                                  b.payment_mode === 'to-pay' ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {b.payment_mode || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center text-gray-600">{b.no_of_pkg ?? '—'}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{b.wt ?? '—'}</td>
                              <td className="px-3 py-2 text-right font-bold text-gray-800">₹{fmtDisp(b.total)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-rose-600">
                                {b.kaat != null ? `₹${fmtDisp(b.kaat)}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Print Preview Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] h-[95vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Print Preview</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {result?.transport_name}&nbsp;&nbsp;·&nbsp;&nbsp;{fromDate} to {toDate}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body — independently scrolling columns on wide screens */}
            <div className="flex-1 overflow-y-auto lg:overflow-hidden lg:flex">

                {/* ── LEFT COLUMN: Settings ──────────────────────────────── */}
                <div className="px-6 py-4 lg:w-[42%] xl:w-[36%] lg:overflow-y-auto lg:border-r lg:border-gray-200 space-y-5">

                  {/* Bill Date picker */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bill Date</p>
                    <input
                      type="date"
                      value={billDate}
                      onChange={e => setBillDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
                    />
                  </div>

                  {/* Format selector */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Choose Print Format</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPrintFormat('pohonch')}
                        className={`relative flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 transition-all text-left ${
                          printFormat === 'pohonch'
                            ? 'border-gray-900 bg-gray-900 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm'
                        }`}
                      >
                        {printFormat === 'pohonch' && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-gray-900 block" />
                          </span>
                        )}
                        <span className={`font-black text-sm ${printFormat === 'pohonch' ? 'text-white' : 'text-gray-900'}`}>Pohonch Format</span>
                        <span className={`text-[11px] font-medium ${printFormat === 'pohonch' ? 'text-gray-300' : 'text-gray-600'}`}>Grouped by Pohonch Number</span>
                      </button>
                      <button
                        onClick={() => setPrintFormat('bilty')}
                        className={`relative flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 transition-all text-left ${
                          printFormat === 'bilty'
                            ? 'border-gray-900 bg-gray-900 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm'
                        }`}
                      >
                        {printFormat === 'bilty' && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-gray-900 block" />
                          </span>
                        )}
                        <span className={`font-black text-sm ${printFormat === 'bilty' ? 'text-white' : 'text-gray-900'}`}>Bilty Format</span>
                        <span className={`text-[11px] font-medium ${printFormat === 'bilty' ? 'text-gray-300' : 'text-gray-600'}`}>Flat list sorted by Bilty No.</span>
                      </button>
                    </div>
                  </div>

                  {/* Column selector */}
                  <PrintColumnSelector selectedCols={selectedCols} onToggle={toggleCol} onMoveUp={moveColUp} onMoveDown={moveColDown} />
                </div>

                {/* ── RIGHT COLUMN: Bilty selection ──────────────────────── */}
                <div className="px-6 py-4 lg:flex-1 lg:overflow-y-auto space-y-5">

                  {/* Station-wise bulk select — pohonch format only */}
                  {printFormat === 'pohonch' && pohonchStations.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          Bulk Select by Station
                        </p>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {pohonchStations.length} station{pohonchStations.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
                        {pohonchStations.map(({ name, bs }) => {
                          const selCount = bs.filter(b => !excludedBilties.has(b.gr_no)).length;
                          const allSel  = selCount === bs.length;
                          const noneSel = selCount === 0;
                          return (
                            <button
                              key={name}
                              onClick={() => toggleStationBilties(bs)}
                              title={allSel ? `Deselect all bilties from ${name}` : `Select all bilties from ${name}`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                                allSel
                                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200'
                                  : noneSel
                                  ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200'
                                  : 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                              }`}
                            >
                              {name}
                              <span className={`px-1.5 rounded-full text-[10px] font-black ${
                                allSel ? 'bg-emerald-600 text-white' : noneSel ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                              }`}>
                                {selCount}/{bs.length}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Pohonch groups — pohonch format only */}
                  {printFormat === 'pohonch' && pohonchGroups.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          Pohonch Groups — toggle group or individual bilties
                        </p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setExcludedGroups(new Set(pohonchGroups.map(g => g.key)));
                              setExcludedBilties(new Set([
                                ...pohonchGroups.flatMap(g => g.bilties.map(b => b.gr_no)),
                                ...(noPohonchGroup?.bilties || []).map(b => b.gr_no),
                              ]));
                            }}
                            className="text-[10px] text-gray-500 hover:text-gray-900 font-bold px-2 py-1 rounded hover:bg-gray-200 transition-colors uppercase tracking-wider"
                          >
                            Exclude All
                          </button>
                          <button
                            onClick={() => { setExcludedGroups(new Set()); setExcludedBilties(new Set()); }}
                            className="text-[10px] text-gray-500 hover:text-gray-900 font-bold px-2 py-1 rounded hover:bg-gray-200 transition-colors uppercase tracking-wider"
                          >
                            Include All
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {pohonchGroups.map(grp => {
                          const groupExcluded = excludedGroups.has(grp.key);
                          const grNos = grp.bilties.map(b => b.gr_no);
                          const includedInGrp = grp.bilties.filter(b => !excludedBilties.has(b.gr_no)).length;
                          const dates = grp.bilties.map(b => b.bilty_date).filter(d => d);
                          const sortedDates = [...dates].sort();
                          const minDate = sortedDates.length ? format(new Date(sortedDates[0]), 'dd MMM yy') : '';
                          const maxDate = sortedDates.length ? format(new Date(sortedDates[sortedDates.length - 1]), 'dd MMM yy') : '';
                          const dateRange = minDate === maxDate ? minDate : `${minDate} - ${maxDate}`;

                          return (
                            <div
                              key={grp.key}
                              className={`rounded-2xl border-2 transition-all ${groupExcluded ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-300 bg-white shadow-sm'}`}
                            >
                              {/* Group header */}
                              <div className="flex items-stretch border-b border-gray-100">
                                <button
                                  className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-tl-2xl"
                                  onClick={() => toggleGroup(grp.key)}
                                >
                                  <Checkbox checked={!groupExcluded} />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-base font-black text-gray-900 block truncate">{grp.key}</span>
                                    {dateRange && <span className="text-xs text-gray-500 font-medium">{dateRange}</span>}
                                  </div>
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                                    groupExcluded
                                      ? 'bg-gray-200 text-gray-500'
                                      : includedInGrp === grp.bilties.length
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : includedInGrp === 0
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {groupExcluded ? `0/${grp.bilties.length}` : `${includedInGrp}/${grp.bilties.length}`}
                                  </span>
                                </button>
                                {!groupExcluded && grp.bilties.length > 1 && (
                                  <div className="flex items-center gap-1 px-2 border-l border-gray-100">
                                    <button
                                      onClick={() => setExcludedBilties(prev => {
                                        const n = new Set(prev);
                                        grNos.forEach(g => n.add(g));
                                        return n;
                                      })}
                                      className="text-[10px] text-gray-500 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                      title="Exclude all bilties in this group"
                                    >
                                      None
                                    </button>
                                    <button
                                      onClick={() => setExcludedBilties(prev => {
                                        const n = new Set(prev);
                                        grNos.forEach(g => n.delete(g));
                                        return n;
                                      })}
                                      className="text-[10px] text-gray-500 hover:text-emerald-700 font-bold px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
                                      title="Include all bilties in this group"
                                    >
                                      All
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Bilty list inside group — clickable to toggle */}
                              {!groupExcluded && (
                                <div className="p-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-2">
                                    {grp.bilties.map((b, i) => {
                                      const excl = excludedBilties.has(b.gr_no);
                                      return (
                                        <button
                                          key={`${b.gr_no}-${i}`}
                                          onClick={() => toggleBilty(b.gr_no)}
                                          className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs border transition-colors text-left ${
                                            excl
                                              ? 'bg-red-50 border-red-200 opacity-50'
                                              : 'bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-gray-200'
                                          }`}
                                        >
                                          <span className="pt-0.5"><Checkbox checked={!excl} /></span>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <span className={`font-bold text-gray-900 ${excl ? 'line-through' : ''}`}>{b.gr_no}</span>
                                              <span className="text-gray-400">·</span>
                                              <span className={`text-gray-600 font-medium truncate ${excl ? 'line-through' : ''}`}>
                                                {b.consignee_name || 'N/A'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500 mt-0.5">
                                              <span className="text-[10px]">{b.to_city || 'N/A'}</span>
                                              {b.bilty_date && <span className="text-[10px]">• {format(new Date(b.bilty_date), 'dd MMM yy')}</span>}
                                              {b.total != null && <span className="text-[10px] font-bold text-gray-700 ml-auto">₹{fmtDisp(b.total)}</span>}
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* No-Pohonch bilties — pohonch format only */}
                  {printFormat === 'pohonch' && noPohonchGroup && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                        No Pohonch Available — click individual bilties to exclude
                      </p>
                      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                          <span className="text-sm font-bold text-gray-700">
                            Bilties without Pohonch
                            <span className="ml-2 text-xs font-semibold text-gray-400">
                              ({noPohonchGroup.bilties.filter(b => !excludedBilties.has(b.gr_no)).length}/{noPohonchGroup.bilties.length} included)
                            </span>
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setExcludedBilties(prev => {
                                const n = new Set(prev);
                                noPohonchGroup.bilties.forEach(b => n.add(b.gr_no));
                                return n;
                              })}
                              className="text-xs text-gray-500 hover:text-gray-900 font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Exclude All
                            </button>
                            <button
                              onClick={() => setExcludedBilties(prev => {
                                const n = new Set(prev);
                                noPohonchGroup.bilties.forEach(b => n.delete(b.gr_no));
                                return n;
                              })}
                              className="text-xs text-gray-500 hover:text-gray-900 font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Include All
                            </button>
                          </div>
                        </div>

                        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                          {noPohonchGroup.bilties.map((b, i) => {
                            const excl = excludedBilties.has(b.gr_no);
                            return (
                              <button
                                key={`${b.gr_no}-${i}`}
                                onClick={() => toggleBilty(b.gr_no)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${excl ? 'opacity-40' : ''}`}
                              >
                                <Checkbox checked={!excl} />
                                <span className={`font-bold text-gray-800 text-xs w-16 shrink-0 ${excl ? 'line-through' : ''}`}>{b.gr_no}</span>
                                <span className="text-xs text-gray-600 truncate flex-1">{b.consignor_name}</span>
                                <span className="text-xs text-gray-400 shrink-0">→</span>
                                <span className="text-xs text-gray-600 shrink-0">{b.to_city}</span>
                                <span className="text-xs font-bold text-gray-700 ml-1 shrink-0">₹{fmtDisp(b.total)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bilty format hint */}
                  {printFormat === 'bilty' && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-6">
                      <p className="text-sm text-gray-700">
                        <span className="font-black text-gray-900 text-base">{bilties.length}</span>
                        <span className="ml-1.5">bilties will be printed in flat format, sorted by Bilty Number.</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Use <span className="font-bold">Preview Table</span> below to exclude individual bilties before printing.
                      </p>
                    </div>
                  )}

                  {/* Empty-state hint when no format selected */}
                  {!printFormat && (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-5 py-10 text-center">
                      <Printer className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-500">Choose a print format</p>
                      <p className="text-xs text-gray-400 mt-1">Select Pohonch or Bilty format to configure bilties</p>
                    </div>
                  )}
                </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 shrink-0 flex items-center justify-between bg-gray-50 rounded-b-2xl">
              <p className="text-sm text-gray-600">
                <span className="font-black text-gray-900 text-base">{includedCount}</span>
                <span className="ml-1.5">bilties will be printed</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowModal(false); setShowPreview(true); }}
                  disabled={!printFormat}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <Eye className="h-4 w-4" />
                  Preview Table
                </button>
                <button
                  onClick={generatePDF}
                  disabled={!printFormat || (printFormat === 'pohonch' && includedCount === 0) || (printFormat === 'bilty' && bilties.length === 0) || pdfLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  {pdfLoading ? 'Generating…' : 'Generate PDF'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// ─── Summary chip ─────────────────────────────────────────────────────────────
function SummaryChip({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 px-5 py-3.5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
    </div>
  );
}
