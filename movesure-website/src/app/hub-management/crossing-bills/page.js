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


  // ── Flatten & group bilties ────────────────────────────────────────────────
  const bilties = result ? flattenResult(result) : [];
  const groups  = useMemo(() => buildDestGroups(bilties), [bilties]);

  const pohonchGroups  = groups.filter(g => g.key !== 'NO_POHONCH');
  const noPohonchGroup = groups.find(g => g.key === 'NO_POHONCH');

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

  const includedCount = useMemo(() => {
    const pg = pohonchGroups
      .filter(g => !excludedGroups.has(g.key))
      .reduce((s, g) => s + g.bilties.length, 0);
    const np = (noPohonchGroup?.bilties || []).filter(b => !excludedBilties.has(b.gr_no)).length;
    return pg + np;
  }, [pohonchGroups, noPohonchGroup, excludedGroups, excludedBilties]);

  // ── Generate PDF ───────────────────────────────────────────────────────────
  const generatePDF = () => generateCrossingBillsPDF({
    result,
    selectedTransport,
    fromDate,
    toDate,
    pohonchGroups,
    noPohonchGroup,
    excludedGroups,
    excludedBilties,
    printFormat: printFormat || 'pohonch',
    setShowModal,
    setPdfLoading,
    setPdfBlobUrl,
  });


  // ── Render ─────────────────────────────────────────────────────────
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
              download={`crossing-bills-${fromDate}.pdf`}
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

            {/* Grouped preview */}
            <div className="space-y-4">
              {groups.map(({ key, bilties: gb }) => (
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
                    <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full">
                      {gb.length} bilties
                    </span>
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
                        {gb.map((b, i) => (
                          <tr key={`${b.gr_no}-${i}`} className="hover:bg-gray-50/60">
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
                        ))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

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

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

              {/* ── Format selector ─────────────────────────────────────────── */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Choose Print Format</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPrintFormat('pohonch')}
                    className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left ${
                      printFormat === 'pohonch' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <span className="font-black text-sm">Pohonch Format</span>
                    <span className={`text-xs ${printFormat === 'pohonch' ? 'text-gray-300' : 'text-gray-500'}`}>Grouped by Pohonch Number</span>
                  </button>
                  <button
                    onClick={() => setPrintFormat('bilty')}
                    className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left ${
                      printFormat === 'bilty' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <span className="font-black text-sm">Bilty Number Format</span>
                    <span className={`text-xs ${printFormat === 'bilty' ? 'text-gray-300' : 'text-gray-500'}`}>Flat list sorted by Bilty Number</span>
                  </button>
                </div>
              </div>

              {/* ── Pohonch groups (pohonch format only) ──────────────────────── */}
              {printFormat === 'pohonch' && pohonchGroups.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Pohonch Number Groups — click to include / exclude entire group
                  </p>
                  <div className="space-y-2">
                    {pohonchGroups.map(grp => {
                      const excluded = excludedGroups.has(grp.key);
                      return (
                        <div
                          key={grp.key}
                          className={`rounded-xl border transition-all ${excluded ? 'border-gray-200 bg-gray-50 opacity-50' : 'border-gray-300 bg-white'}`}
                        >
                          {/* Group toggle row */}
                          <button
                            className="w-full flex items-center gap-3 px-4 py-3 text-left"
                            onClick={() => toggleGroup(grp.key)}
                          >
                            <Checkbox checked={!excluded} />
                            <span className="text-lg font-black text-gray-900">{grp.key}</span>
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {grp.bilties.length} bilties
                            </span>
                            {excluded && (
                              <span className="ml-auto text-xs text-red-400 font-semibold italic">Excluded from print</span>
                            )}
                          </button>

                          {/* Bilty list inside group */}
                          {!excluded && (
                            <div className="px-4 pb-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                {grp.bilties.map((b, i) => (
                                  <div
                                    key={`${b.gr_no}-${i}`}
                                    className="flex items-center gap-2 bg-gray-50 px-2.5 py-1.5 rounded-lg text-xs"
                                  >
                                    <span className="font-bold text-gray-800 shrink-0">{b.gr_no}</span>
                                    <span className="text-gray-400">·</span>
                                    <span className="truncate text-gray-600 flex-1">{b.consignee_name}</span>
                                    <span className="shrink-0 text-gray-400 text-[10px]">{b.to_city}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── No-Pohonch bilties (pohonch format only) ──────────────── */}
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
                          ({(noPohonchGroup.bilties.length - excludedBilties.size)} included)
                        </span>
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setExcludedBilties(new Set(noPohonchGroup.bilties.map(b => b.gr_no)))}
                          className="text-xs text-gray-500 hover:text-gray-900 font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Exclude All
                        </button>
                        <button
                          onClick={() => setExcludedBilties(new Set())}
                          className="text-xs text-gray-500 hover:text-gray-900 font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Include All
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                      {noPohonchGroup.bilties.map((b, i) => {
                        const excl = excludedBilties.has(b.gr_no);
                        return (
                          <button
                            key={`${b.gr_no}-${i}`}
                            onClick={() => toggleBilty(b.gr_no)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${excl ? 'opacity-40' : ''}`}
                          >
                            <Checkbox checked={!excl} />
                            <span className="font-bold text-gray-800 text-xs w-16 shrink-0">{b.gr_no}</span>
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

              {/* ── Bilty format preview ──────────────────────────────────── */}
              {printFormat === 'bilty' && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-black text-gray-900 text-base">{bilties.length}</span>
                    <span className="ml-1.5">bilties will be printed in flat format, sorted by Bilty Number.</span>
                  </p>
                </div>
              )}
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
                  onClick={generatePDF}
                  disabled={!printFormat || (printFormat === 'pohonch' && includedCount === 0) || (printFormat === 'bilty' && bilties.length === 0) || pdfLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  {pdfLoading ? 'Generating…' : 'Open PDF Preview'}
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
