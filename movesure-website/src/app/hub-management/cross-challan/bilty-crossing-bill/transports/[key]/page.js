'use client';

import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, ChevronDown, ChevronRight, ExternalLink, RefreshCw, Download, BookOpen, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../../../../utils/auth';
import Navbar from '../../../../../../components/dashboard/navbar';
import {
  fetchAllBills, transportKey, totalsOf, netOf, periodLabel, Rs
} from '../../../../../../components/hub-management/bilty-crossing-bill/billsData';

// One transporter's bilty crossing bills as a ledger: bills by period with running totals,
// each bill expandable to its bilties (kaat / PF / amount per GR).
export default function TransportBillLedgerPage() {
  const { key: rawKey } = useParams();
  const key = decodeURIComponent(rawKey || '');
  const router = useRouter();
  const { token } = useAuth();
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState({}); // bill id -> expanded
  const [year, setYear] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const extra = key.startsWith('NAME:') ? {} : { transport_gstin: key };
      const all = await fetchAllBills(headers, extra);
      setBills(all.filter((b) => transportKey(b) === key));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [headers, key]);
  useEffect(() => { load(); }, [load]);

  const years = [...new Set(bills.map((b) => b.bill_year))].sort();
  const shown = useMemo(() => bills
    .filter((b) => !year || String(b.bill_year) === String(year))
    .sort((a, b) => (a.bill_year - b.bill_year) || (a.bill_month - b.bill_month) || String(a.bill_no).localeCompare(String(b.bill_no))),
  [bills, year]);
  const totals = totalsOf(shown);
  const first = bills[0];

  // running balance down the ledger
  let running = 0;
  const ledgerRows = shown.map((b) => { running += netOf(b); return { b, running }; });

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      ['Transporter', first?.transport_name || ''], ['GSTIN', first?.transport_gstin || ''], [],
      ['Bill No', 'Period', 'Bilties', 'Freight', 'Kaat', 'PF', 'Paid-bilty kaat', 'Net payable', 'Running net', 'PDF'],
      ...ledgerRows.map(({ b, running: r }) => [b.bill_no, periodLabel(b), b.total_bilties, b.total_amount, b.total_kaat, b.total_pf, b.total_paid_kaat || 0, netOf(b), r, b.pdf_url || '']),
      ['TOTAL', '', totals.bilties, totals.amount, totals.kaat, totals.pf, totals.paidKaat, totals.net, '', '']
    ];
    const blob = new Blob(['﻿' + lines.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilty_crossing_${(first?.transport_name || 'transport').replace(/[^a-z0-9]+/gi, '_')}${year ? `_${year}` : ''}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const card = 'bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 p-4';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="w-full px-4 sm:px-6 py-6">
        <button onClick={() => router.push('/hub-management/cross-challan/bilty-crossing-bill/transports')} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> All transporters
        </button>

        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow"><BookOpen className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{first?.transport_name || (loading ? 'Loading…' : 'Transporter')}</h1>
              <p className="text-sm text-slate-500 font-mono">{first?.transport_gstin || (key.startsWith('NAME:') ? 'No GSTIN' : key)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={(e) => setYear(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900">
              <option value="">All years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={exportCsv} disabled={!shown.length}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={load} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <div className={card}><p className="text-[11px] font-semibold uppercase text-slate-500">Bills</p><p className="text-2xl font-bold text-slate-900">{totals.bills}</p><p className="text-xs text-slate-400">{totals.bilties} bilties</p></div>
          <div className={card}><p className="text-[11px] font-semibold uppercase text-slate-500">Total PF</p><p className="text-2xl font-bold text-slate-900">{Rs(totals.pf)}</p></div>
          <div className={card}><p className="text-[11px] font-semibold uppercase text-slate-500">Total Kaat</p><p className="text-2xl font-bold text-slate-900">{Rs(totals.kaat)}</p><p className="text-xs text-rose-600">paid-bilty kaat {Rs(totals.paidKaat)}</p></div>
          <div className={card}><p className="text-[11px] font-semibold uppercase text-slate-500">Freight</p><p className="text-2xl font-bold text-slate-900">{Rs(totals.amount)}</p></div>
          <div className={`${card} ring-teal-300 bg-teal-50/60`}><p className="text-[11px] font-semibold uppercase text-teal-700">Net payable</p><p className="text-2xl font-bold text-teal-800">{Rs(totals.net)}</p><p className="text-xs text-teal-700">PF − paid-bilty kaat</p></div>
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
                <th className="px-3 py-3 w-8" />
                <th className="px-3 py-3 text-left">Period</th>
                <th className="px-3 py-3 text-left">Bill No</th>
                <th className="px-3 py-3 text-right">Bilties</th>
                <th className="px-3 py-3 text-right">Freight</th>
                <th className="px-3 py-3 text-right">Kaat</th>
                <th className="px-3 py-3 text-right">PF</th>
                <th className="px-3 py-3 text-right">Paid-bilty kaat</th>
                <th className="px-3 py-3 text-right">Net payable</th>
                <th className="px-3 py-3 text-right">Running net</th>
                <th className="px-3 py-3 text-center">PDF</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {loading && <tr><td colSpan={11} className="py-12 text-center"><Loader2 className="w-6 h-6 mx-auto text-teal-600 animate-spin" /></td></tr>}
              {!loading && !ledgerRows.length && <tr><td colSpan={11} className="py-12 text-center text-slate-500">No bills</td></tr>}
              {!loading && ledgerRows.map(({ b, running: r }) => {
                const isOpen = !!open[b.id];
                const items = Array.isArray(b.metadata) ? b.metadata : [];
                return (
                  <Fragment key={b.id}>
                    <tr className={`border-t border-slate-100 cursor-pointer ${isOpen ? 'bg-teal-50/40' : 'hover:bg-slate-50'}`}
                      onClick={() => setOpen((o) => ({ ...o, [b.id]: !o[b.id] }))}>
                      <td className="px-3 py-3 text-slate-400">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">{periodLabel(b)}</td>
                      <td className="px-3 py-3 font-mono text-slate-700">{b.bill_no}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{b.total_bilties}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{Rs(b.total_amount)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{Rs(b.total_kaat)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{Rs(b.total_pf)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-rose-700">{Number(b.total_paid_kaat) ? `− ${Rs(b.total_paid_kaat)}` : '—'}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-bold text-slate-900">{Rs(netOf(b))}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-teal-800">{Rs(r)}</td>
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {b.pdf_url
                          ? <a href={b.pdf_url} target="_blank" rel="noreferrer" className="inline-flex text-teal-700 hover:text-teal-900" title="Open bill PDF"><ExternalLink className="w-4 h-4" /></a>
                          : <span className="text-xs text-slate-400">—</span>}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50/70">
                        <td />
                        <td colSpan={10} className="px-3 pb-4 pt-1">
                          <table className="w-full text-xs bg-white rounded-lg ring-1 ring-slate-200 overflow-hidden">
                            <thead className="bg-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="px-2 py-2 text-left">#</th>
                                <th className="px-2 py-2 text-left">GR</th>
                                <th className="px-2 py-2 text-left">Bilty No</th>
                                <th className="px-2 py-2 text-left">Consignee</th>
                                <th className="px-2 py-2 text-left">Dest</th>
                                <th className="px-2 py-2 text-left">Mode</th>
                                <th className="px-2 py-2 text-right">Freight</th>
                                <th className="px-2 py-2 text-right">Kaat</th>
                                <th className="px-2 py-2 text-right">PF</th>
                                <th className="px-2 py-2 text-right">Settles</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {items.map((m, i) => {
                                const paid = m.payment_mode === 'paid';
                                const kd = m.kaat_detail;
                                return (
                                  <tr key={m.gr_no}>
                                    <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                                    <td className="px-2 py-1.5 font-mono font-semibold text-slate-900">{m.gr_no}</td>
                                    <td className="px-2 py-1.5 font-mono">
                                      {m.bilty_number || '—'}
                                      {m.crossing_proof_url && (
                                        <a href={m.crossing_proof_url} target="_blank" rel="noreferrer" className="ml-1 inline-flex text-teal-600" title="Crossing proof"><ImageIcon className="w-3 h-3" /></a>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5 max-w-[180px] truncate" title={m.consignee_name}>{m.consignee_name || '—'}</td>
                                    <td className="px-2 py-1.5">{m.destination || '—'}</td>
                                    <td className="px-2 py-1.5"><span className={`px-1.5 rounded font-bold text-[10px] ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{(m.payment_mode || '—').toUpperCase()}</span></td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{Rs(m.amount)}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">
                                      {Rs(m.kaat)}
                                      {kd?.rate ? <span className="block text-[9px] text-slate-400">@{kd.rate}/{kd.rate_type === 'per_pkg' ? 'pkg' : 'kg'}</span> : null}
                                    </td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{Rs(m.pf)}</td>
                                    <td className={`px-2 py-1.5 text-right tabular-nums font-semibold ${paid ? 'text-rose-700' : 'text-slate-900'}`}>
                                      {paid ? `− ${Rs(m.kaat)}` : Rs(m.pf)}
                                    </td>
                                  </tr>
                                );
                              })}
                              {!items.length && <tr><td colSpan={10} className="px-2 py-3 text-center text-slate-400">No bilties on this bill</td></tr>}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            {!loading && ledgerRows.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
                <tr>
                  <td />
                  <td colSpan={2} className="px-3 py-3 text-[11px] uppercase tracking-wider text-slate-500">Total {year || 'all years'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totals.bilties}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{Rs(totals.amount)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{Rs(totals.kaat)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{Rs(totals.pf)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-rose-700">− {Rs(totals.paidKaat)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-teal-800">{Rs(totals.net)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Click a bill to see its bilties. To-pay bilties settle by PF; paid bilties settle by kaat (deducted). Net payable = total PF − paid-bilty kaat.
        </p>
      </main>
    </div>
  );
}
