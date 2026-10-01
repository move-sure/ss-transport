'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle, Truck, Printer, RefreshCw } from 'lucide-react';
import supabase from '@/app/utils/supabase';
import { transportersApi, ledgerApi } from '@/components/hub-management/accounts/api';
import { formatINR, formatDate, FLOW_LABEL, OWES_LABEL } from '@/components/hub-management/accounts/helpers';
import BillsTable from '@/components/hub-management/accounts/BillsTable';

const norm = (v) => String(v || '').trim().toUpperCase();

// Statement entries come as { amount, entry_type: 'dr' | 'cr' }; older
// responses used dr_amount / cr_amount — support both.
const drOf = (e) => Number(e.dr_amount ?? (e.entry_type === 'dr' ? e.amount : 0)) || 0;
const crOf = (e) => Number(e.cr_amount ?? (e.entry_type === 'cr' ? e.amount : 0)) || 0;

// Find every transporter ledger for this GSTIN. Ledgers carry an optional
// gstin; when it's blank, fall back to the transports master (gst_number)
// and match the ledger by transport name.
async function findTransporters(gstin) {
  const res = await transportersApi.list();
  const all = res.data || [];

  const byGstin = all.filter((t) => norm(t.gstin) === gstin);
  if (byGstin.length) return byGstin;

  const { data: transports } = await supabase
    .from('transports')
    .select('transport_name')
    .ilike('gst_number', gstin);
  const names = new Set((transports || []).map((t) => norm(t.transport_name)).filter(Boolean));
  return all.filter((t) => names.has(norm(t.name)));
}

export default function PublicTransportLedgerPage() {
  const params = useParams();
  const gstin = norm(decodeURIComponent(params['transport-gstin'] || ''));

  const [matches, setMatches] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState(null);

  const [detail, setDetail] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!gstin) return;
    (async () => {
      try {
        setLookupLoading(true);
        setLookupError(null);
        const found = await findTransporters(gstin);
        setMatches(found);
        setSelectedId(found[0]?.id || null);
      } catch (err) {
        setLookupError(err.message || 'Failed to look up transporter');
      } finally {
        setLookupLoading(false);
      }
    })();
  }, [gstin]);

  const load = useCallback(async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      const [d, s] = await Promise.all([
        transportersApi.get(selectedId),
        ledgerApi.ledgers.statement(selectedId, {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        }),
      ]);
      setDetail(d.data);
      setStatement(s.data);
    } catch (err) {
      setError(err.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [selectedId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const entries = statement?.entries || [];
  const totalIn = entries.reduce((s, e) => s + drOf(e), 0);
  const totalOut = entries.reduce((s, e) => s + crOf(e), 0);
  const bal = detail?.balance;

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white"><Truck className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-bold">{detail?.ledger?.name || 'Transport Ledger'}</h1>
              <p className="text-sm font-mono text-gray-600">GSTIN: {gstin || '—'}</p>
            </div>
          </div>
          <div className="flex gap-2 no-print">
            <button onClick={load} disabled={!selectedId || loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => window.print()} disabled={!detail}
              className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

        {lookupLoading ? (
          <div className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto text-emerald-600 animate-spin" /></div>
        ) : lookupError ? (
          <ErrorBox msg={lookupError} />
        ) : !matches.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
            <p className="font-semibold">No transport ledger found for this GSTIN</p>
            <p className="text-sm text-gray-600 mt-1">{gstin}</p>
          </div>
        ) : (
          <>
            {/* Same transporter can have a ledger in more than one branch */}
            {matches.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-4 no-print">
                {matches.map((m) => (
                  <button key={m.id} onClick={() => setSelectedId(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${selectedId === m.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    {m.name}{m.branch_name ? ` · ${m.branch_name}` : ''}
                  </button>
                ))}
              </div>
            )}

            {error && <ErrorBox msg={error} />}

            {loading && !detail ? (
              <div className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto text-emerald-600 animate-spin" /></div>
            ) : detail ? (
              <>
                {/* Balance cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <Card label="Current Balance"
                    value={bal?.balance > 0 ? `₹${formatINR(bal.balance)}` : 'Settled'}
                    sub={bal?.balance > 0 ? OWES_LABEL[bal.balance_type] : ''}
                    tone={bal?.balance_type === 'dr' ? 'text-emerald-700' : 'text-rose-700'} />
                  <Card label={`Total ${FLOW_LABEL.dr}`} value={`₹${formatINR(bal?.total_dr)}`} tone="text-emerald-700" />
                  <Card label={`Total ${FLOW_LABEL.cr}`} value={`₹${formatINR(bal?.total_cr)}`} tone="text-rose-700" />
                  <Card label="Open Bills" value={(detail.bills || []).filter((b) => !b.is_settled).length} />
                </div>

                <h3 className="text-sm font-semibold mb-2">Bills</h3>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
                  <BillsTable bills={detail.bills || []} loading={false} />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
                  <h3 className="text-sm font-semibold">Ledger Statement</h3>
                  <div className="flex items-center gap-2 flex-wrap no-print">
                    <label className="text-sm">From</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                    <label className="text-sm">To</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                    {(fromDate || toDate) && (
                      <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-xs font-semibold text-emerald-700 hover:underline">Clear</button>
                    )}
                  </div>
                </div>

                {statement && (
                  <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                          <th className="text-left px-4 py-2.5 font-semibold">Voucher No</th>
                          <th className="text-left px-4 py-2.5 font-semibold">Narration</th>
                          <th className="text-right px-4 py-2.5 font-semibold">{FLOW_LABEL.dr}</th>
                          <th className="text-right px-4 py-2.5 font-semibold">{FLOW_LABEL.cr}</th>
                          <th className="text-right px-4 py-2.5 font-semibold">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        <tr className="bg-gray-50/60 font-medium">
                          <td className="px-4 py-2.5" colSpan={5}>Opening Balance</td>
                          <td className="px-4 py-2.5 text-right">
                            ₹{formatINR(statement.opening_balance)} — {OWES_LABEL[statement.opening_balance_type] || ''}
                          </td>
                        </tr>
                        {entries.map((e, i) => (
                          <tr key={e.voucher_id || e.id || i} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">{formatDate(e.date || e.voucher_date)}</td>
                            <td className="px-4 py-2.5 font-medium">{e.voucher_no || '-'}</td>
                            <td className="px-4 py-2.5">{e.narration || '-'}</td>
                            <td className="px-4 py-2.5 text-right">{drOf(e) ? `₹${formatINR(drOf(e))}` : ''}</td>
                            <td className="px-4 py-2.5 text-right">{crOf(e) ? `₹${formatINR(crOf(e))}` : ''}</td>
                            <td className="px-4 py-2.5 text-right font-medium">
                              ₹{formatINR(e.running_balance)}{e.running_balance_type ? ` — ${OWES_LABEL[e.running_balance_type]}` : ''}
                            </td>
                          </tr>
                        ))}
                        {!entries.length && (
                          <tr><td colSpan={6} className="text-center py-8">No entries in this range</td></tr>
                        )}
                        <tr className="bg-gray-50/60 font-semibold">
                          <td className="px-4 py-2.5" colSpan={3}>Total</td>
                          <td className="px-4 py-2.5 text-right">₹{formatINR(totalIn)}</td>
                          <td className="px-4 py-2.5 text-right">₹{formatINR(totalOut)}</td>
                          <td />
                        </tr>
                        <tr className="bg-gray-50/60 font-semibold">
                          <td className="px-4 py-2.5" colSpan={5}>Closing Balance</td>
                          <td className="px-4 py-2.5 text-right">
                            ₹{formatINR(statement.closing_balance)} — {OWES_LABEL[statement.closing_balance_type] || ''}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-6 text-center">Generated by movesure.io · {new Date().toLocaleString('en-IN')}</p>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, sub, tone = 'text-black' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
      {sub && <p className="text-xs">{sub}</p>}
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {msg}
    </div>
  );
}
