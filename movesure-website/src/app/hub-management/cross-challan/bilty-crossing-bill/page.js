'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../utils/auth';
import Navbar from '../../../../components/dashboard/navbar';
import { MONTHS, printAndUploadBill } from '../../../../components/hub-management/bilty-crossing-bill/billPdf';
import {
  ArrowLeft, Loader2, Search, Truck, X, Plus, Trash2, FileText, Printer, AlertCircle,
  CheckCircle2, Image as ImageIcon, RefreshCw, ExternalLink, Receipt,
} from 'lucide-react';

const API = 'https://api.movesure.io';
const Rs = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export default function BiltyCrossingBillPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  /* ── Builder state ── */
  const [tQuery, setTQuery] = useState('');
  const [tResults, setTResults] = useState([]);
  const [tLoading, setTLoading] = useState(false);
  const [tOpen, setTOpen] = useState(false);
  const [transporter, setTransporter] = useState(null); // { transport_name, transport_gstin }
  const tBoxRef = useRef(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [grInput, setGrInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [items, setItems] = useState([]); // gr-preview rows
  const grRef = useRef(null);

  const [creating, setCreating] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [preview, setPreview] = useState(null); // { url, bill }

  /* ── Existing bills ── */
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [busyBill, setBusyBill] = useState(null);

  const toast = (msg, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), type === 'error' ? 6000 : 3500);
  };

  /* 1. Transporter search (debounced) */
  useEffect(() => {
    const q = tQuery.trim();
    if (q.length < 2 || (transporter && q === transporter.transport_name)) { setTResults([]); return; }
    setTLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/bilty-crossing-bill/search-transporters?q=${encodeURIComponent(q)}&limit=20`, { headers });
        const j = await res.json();
        setTResults(j.data || []);
      } catch (_) { setTResults([]); }
      finally { setTLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [tQuery, transporter, headers]);

  useEffect(() => {
    const onDown = (e) => { if (tBoxRef.current && !tBoxRef.current.contains(e.target)) setTOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const pickTransporter = (t) => {
    setTransporter(t);
    setTQuery(t.transport_name);
    setTOpen(false);
    setTimeout(() => grRef.current?.focus(), 50);
  };

  /* 2. Add GR(s) — accepts one or many (comma / space / newline separated) */
  const addGrs = async () => {
    const grs = [...new Set(grInput.split(/[\s,]+/).map(g => g.trim().toUpperCase()).filter(Boolean))];
    if (!grs.length) return;
    setAdding(true);
    const failed = [];
    const dup = [];
    for (const gr of grs) {
      if (items.some(i => i.gr_no.toUpperCase() === gr)) { dup.push(gr); continue; }
      try {
        const res = await fetch(`${API}/api/bilty-crossing-bill/gr-preview/${encodeURIComponent(gr)}`, { headers });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.status === 'error') throw new Error(res.status === 404 ? 'not found' : (j.message || res.status));
        setItems(prev => (prev.some(i => i.gr_no === j.data.gr_no) ? prev : [...prev, j.data]));
      } catch (e) { failed.push(`${gr} (${e.message})`); }
    }
    setAdding(false);
    setGrInput('');
    if (dup.length) toast(`Already added: ${dup.join(', ')}`, 'info');
    if (failed.length) toast(`Could not add: ${failed.join(', ')}`, 'error');
    grRef.current?.focus();
  };

  const totals = useMemo(() => items.reduce((a, m) => ({
    kaat: a.kaat + (Number(m.kaat) || 0), pf: a.pf + (Number(m.pf) || 0), amount: a.amount + (Number(m.amount) || 0),
  }), { kaat: 0, pf: 0, amount: 0 }), [items]);

  /* Bills list */
  const loadBills = useCallback(async () => {
    setBillsLoading(true);
    try {
      const res = await fetch(`${API}/api/bilty-crossing-bill?is_active=true&page=1&page_size=50`, { headers });
      const j = await res.json();
      setBills(j.data?.rows || []);
    } catch (_) { setBills([]); }
    finally { setBillsLoading(false); }
  }, [headers]);
  useEffect(() => { loadBills(); }, [loadBills]);

  const printBill = async (bill) => {
    setBusyBill(bill.id);
    try {
      // Always print from the server's own copy of the bill
      const res = await fetch(`${API}/api/bilty-crossing-bill/${bill.id}`, { headers });
      const j = await res.json();
      if (!res.ok || j.status === 'error') throw new Error(j.message || 'Failed to load bill');
      const full = j.data;
      const { blobUrl, publicUrl } = await printAndUploadBill(full, { apiBase: API, token, userId: user?.id });
      setBills(prev => prev.map(b => (b.id === full.id ? { ...b, pdf_url: publicUrl } : b)));
      setPreview({ url: blobUrl, bill: full });
    } catch (e) { toast(`Print failed: ${e.message}`, 'error'); }
    finally { setBusyBill(null); }
  };

  /* 4. Create → 5/6. print + upload + save url */
  const createBill = async () => {
    if (!transporter || !items.length || !user?.id) return;
    if (!transporter.transport_gstin && !confirm('This transporter has no GSTIN on file. Create the bill anyway?')) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/bilty-crossing-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          transport_name: transporter.transport_name,
          transport_gstin: transporter.transport_gstin,
          bill_month: Number(month), bill_year: Number(year),
          gr_nos: items.map(i => i.gr_no),
          created_by: user.id,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 409) throw new Error(j.message || `A bill already exists for this transporter for ${MONTHS[month - 1]} ${year}. Delete it first to re-bill.`);
      if (!res.ok || j.status === 'error') throw new Error(j.message || `Create failed (${res.status})`);
      const bill = j.data;
      toast(j.message || `Bill ${bill.bill_no} created`);
      const w = j.warnings || j.data?.warnings;
      if (w?.no_kaat_data_gr_nos?.length) toast(`No kaat data (kaat/pf = 0): ${w.no_kaat_data_gr_nos.join(', ')}`, 'info');
      if (w?.unmatched_gr_nos?.length) toast(`Not found in bilty tables: ${w.unmatched_gr_nos.join(', ')}`, 'error');
      setItems([]);
      loadBills();
      await printBill(bill);
    } catch (e) { toast(e.message, 'error'); }
    finally { setCreating(false); }
  };

  const deleteBill = async (bill) => {
    if (!confirm(`Delete bill ${bill.bill_no}? This frees ${bill.transport_name} · ${MONTHS[bill.bill_month - 1]} ${bill.bill_year} for a new bill.`)) return;
    setBusyBill(bill.id);
    try {
      const res = await fetch(`${API}/api/bilty-crossing-bill/${bill.id}?updated_by=${user?.id || ''}`, { method: 'DELETE', headers });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.status === 'error') throw new Error(j.message || `Delete failed (${res.status})`);
      setBills(prev => prev.filter(b => b.id !== bill.id));
      toast(`Bill ${bill.bill_no} deleted`);
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusyBill(null); }
  };

  const closePreview = () => { if (preview?.url) URL.revokeObjectURL(preview.url); setPreview(null); };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const inputCls = 'w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/hub-management/cross-challan')}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white" aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Bilty Crossing Bill</h1>
              <p className="text-sm text-slate-500">Bill a transporter directly from bilties — no pohonch needed</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── Builder ── */}
          <section className="xl:col-span-2 bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70">
            <div className="p-5 border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Transporter */}
              <div ref={tBoxRef} className="relative md:col-span-2">
                <span className="block text-xs font-medium text-slate-500 mb-1">1. Transporter</span>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={tQuery}
                    onChange={e => { setTQuery(e.target.value); setTransporter(null); setTOpen(true); }}
                    onFocus={() => setTOpen(true)}
                    placeholder="Search name or GSTIN…" className={`${inputCls} pl-9 pr-9`} />
                  {tLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500 animate-spin" />}
                  {!tLoading && tQuery && (
                    <button onClick={() => { setTQuery(''); setTransporter(null); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                  )}
                </div>
                {transporter && (
                  <p className="mt-1 text-xs">
                    {transporter.transport_gstin
                      ? <span className="font-mono text-teal-700">GSTIN {transporter.transport_gstin}</span>
                      : <span className="text-amber-600">No GSTIN on file — prefer the entry with a GSTIN</span>}
                  </p>
                )}
                {tOpen && !transporter && tQuery.trim().length >= 2 && !tLoading && (
                  <div className="absolute z-30 mt-1 w-full rounded-xl bg-white shadow-xl ring-1 ring-slate-200 overflow-hidden">
                    {tResults.length === 0
                      ? <p className="px-4 py-3 text-sm text-slate-500">No transporter found</p>
                      : (
                        <ul className="max-h-72 overflow-y-auto py-1">
                          {tResults.map((t, i) => (
                            <li key={`${t.transport_name}-${t.transport_gstin}-${i}`}>
                              <button onClick={() => pickTransporter(t)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50">
                                <p className="text-sm font-medium text-slate-900">{t.transport_name}</p>
                                <p className={`text-xs font-mono ${t.transport_gstin ? 'text-slate-500' : 'text-amber-600'}`}>{t.transport_gstin || 'no GSTIN'}</p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                )}
              </div>
              {/* Period */}
              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">2. Month</span>
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className={inputCls}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">Year</span>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className={inputCls}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
            </div>

            {/* GR adder */}
            <div className="p-5 border-b border-slate-100">
              <span className="block text-xs font-medium text-slate-500 mb-1">3. Add bilties (GR no — paste several separated by space or comma)</span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input ref={grRef} value={grInput} onChange={e => setGrInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGrs(); } }}
                    placeholder="e.g. A14336  A14337" className={`${inputCls} pl-9 font-mono`} />
                </div>
                <button onClick={addGrs} disabled={adding || !grInput.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
                </button>
              </div>
            </div>

            {/* Running table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left">#</th>
                    <th className="px-4 py-2.5 text-left">GR No</th>
                    <th className="px-4 py-2.5 text-left">Bilty No</th>
                    <th className="px-4 py-2.5 text-left">Consignor</th>
                    <th className="px-4 py-2.5 text-left">Consignee</th>
                    <th className="px-4 py-2.5 text-left">Dest</th>
                    <th className="px-4 py-2.5 text-right">Kaat</th>
                    <th className="px-4 py-2.5 text-right">PF</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {items.map((m, i) => (
                    <tr key={m.gr_no} className={i % 2 ? 'bg-slate-50/50' : 'bg-white'}>
                      <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">{m.gr_no}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          {m.bilty_number
                            ? <span className="font-mono">{m.bilty_number}</span>
                            : <span className="text-xs text-amber-600">missing</span>}
                          {m.crossing_proof_url && (
                            <a href={m.crossing_proof_url} target="_blank" rel="noreferrer" title="View crossing proof photo"
                              className="text-teal-600 hover:text-teal-800"><ImageIcon className="w-3.5 h-3.5" /></a>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[180px] truncate" title={m.consignor_name}>{m.consignor_name || '—'}</td>
                      <td className="px-4 py-2.5 max-w-[180px] truncate font-medium text-slate-900" title={m.consignee_name}>{m.consignee_name || '—'}</td>
                      <td className="px-4 py-2.5">{m.destination || '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{Rs(m.kaat)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{Rs(m.pf)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-900">{Rs(m.amount)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => setItems(prev => prev.filter(x => x.gr_no !== m.gr_no))}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50" aria-label={`Remove ${m.gr_no}`}>
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr><td colSpan={10} className="py-14 text-center">
                      <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">Add GR numbers above — the bill builds up here before you save it.</p>
                    </td></tr>
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot className="bg-slate-50 font-semibold text-slate-900">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-slate-500">{items.length} bilties · Total</td>
                      <td className="px-4 py-3 text-right tabular-nums">{Rs(totals.kaat)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{Rs(totals.pf)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{Rs(totals.amount)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Create */}
            <div className="p-5 flex items-center justify-between gap-3 flex-wrap border-t border-slate-100">
              <p className="text-sm text-slate-500">
                {transporter ? <><b className="text-slate-900">{transporter.transport_name}</b> · {MONTHS[month - 1]} {year}</> : 'Pick a transporter to start'}
              </p>
              <div className="flex gap-2">
                {items.length > 0 && (
                  <button onClick={() => confirm('Clear all added bilties?') && setItems([])}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Clear</button>
                )}
                <button onClick={createBill} disabled={!transporter || !items.length || creating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 shadow-sm disabled:opacity-40">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Create Bill & Print
                </button>
              </div>
            </div>
          </section>

          {/* ── Existing bills ── */}
          <section className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 self-start overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Bills</h2>
              <button onClick={loadBills} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Refresh">
                <RefreshCw className={`w-4 h-4 ${billsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {billsLoading && !bills.length && <div className="py-10 text-center"><Loader2 className="w-5 h-5 mx-auto text-teal-600 animate-spin" /></div>}
              {!billsLoading && !bills.length && <p className="py-10 text-center text-sm text-slate-500">No bilty crossing bills yet</p>}
              {bills.map(b => (
                <div key={b.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-slate-900">{b.bill_no}</p>
                      <p className="text-sm text-slate-700 truncate">{b.transport_name}</p>
                      <p className="text-xs text-slate-400">{MONTHS[(b.bill_month || 1) - 1]} {b.bill_year} · {b.total_bilties} bilties</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">{Rs(b.total_amount)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <button onClick={() => printBill(b)} disabled={busyBill === b.id}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-200 bg-teal-50 hover:bg-teal-100 disabled:opacity-50">
                      {busyBill === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} Print
                    </button>
                    {b.pdf_url && (
                      <a href={b.pdf_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
                        <ExternalLink className="w-3.5 h-3.5" /> Saved PDF
                      </a>
                    )}
                    <button onClick={() => deleteBill(b)} disabled={busyBill === b.id}
                      className="ml-auto p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label={`Delete ${b.bill_no}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* PDF preview */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) closePreview(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="font-semibold text-slate-900">{preview.bill.bill_no}</h3>
                  <p className="text-xs text-slate-500">Saved to storage and linked to the bill</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={preview.url} download={`${preview.bill.bill_no}.pdf`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700">
                  <FileText className="w-4 h-4" /> Download
                </a>
                <button onClick={closePreview} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <iframe src={preview.url} className="flex-1 w-full border-0 bg-slate-100" title="Bill PDF" />
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 sm:w-96">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-start gap-2 rounded-xl bg-white px-4 py-3 text-sm shadow-lg ring-1 ${t.type === 'error' ? 'text-red-700 ring-red-200' : t.type === 'info' ? 'text-slate-700 ring-slate-200' : 'text-emerald-700 ring-emerald-200'}`}>
            {t.type === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <span className="flex-1">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
