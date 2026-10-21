'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, FileSpreadsheet, FileText, Download, Eye, X, Printer } from 'lucide-react';
import { ledgerApi } from './api';
import { formatDate, formatINR, todayLocalDate, FLOW_LABEL, OWES_LABEL } from './helpers';
import EditVoucherModal from './EditVoucherModal';
import { entryDr, entryCr, statementTotals, exportStatementCSV, buildStatementPDF, statementPdfFileName, parseBiltyNarration } from './statementExport';

const monthStart = () => `${todayLocalDate().slice(0, 8)}01`;

// Ledger statement: date filter, separate Dr / Cr columns with totals, running balance,
// Edit / Cancel per row, and CSV / PDF export of the selected range.
// `plain` drops the Dr/Cr suffix on balances (Cash, Bank, Income).
// `defaultCurrentMonth` starts the range at the 1st of this month -> today.
// `exportMeta` = { name, subtitle, gstin } printed on the PDF / CSV.
export default function StatementView({
  ledgerId, plain = false, initialFromDate = '', initialToDate = '', hideDateFilters = false,
  onTotals, userId, onChanged, defaultCurrentMonth = false, exportMeta
}) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(initialFromDate || (defaultCurrentMonth ? monthStart() : ''));
  const [toDate, setToDate] = useState(initialToDate || (defaultCurrentMonth ? todayLocalDate() : ''));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editVoucherId, setEditVoucherId] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const load = useCallback(async () => {
    if (!ledgerId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await ledgerApi.ledgers.statement(ledgerId, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setData(res.data);
      if (onTotals) {
        const { totalDr, totalCr } = statementTotals(res.data);
        onTotals({ totalDr, totalCr, entries: res.data?.entries || [] });
      }
    } catch (err) {
      setError(err.message || 'Failed to load statement');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const meta = exportMeta || { name: data?.name };
  // Transport ledgers: split the bilty narration into GR / challan / station / mode / freight / kaat / rate / dd columns
  const bc = !!meta?.biltyColumns;
  const preCols = bc ? 10 : 3; // columns before Dr
  const totalCols = preCols + 3 + (userId ? 1 : 0);
  const totals = statementTotals(data);
  const balSuffix = (type) => (!plain && type ? ` ${OWES_LABEL[type] || ''}` : '');

  const openPreview = () => {
    const pdf = buildStatementPDF(data, meta, fromDate, toDate);
    setPdfUrl(URL.createObjectURL(pdf.output('blob')));
  };
  const downloadPdf = () => buildStatementPDF(data, meta, fromDate, toDate).save(statementPdfFileName(meta, fromDate, toDate));
  const printPdf = () => {
    const frame = document.getElementById('statement-pdf-frame');
    try { frame?.contentWindow?.print(); } catch { window.open(pdfUrl, '_blank'); }
  };

  const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50';

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {!hideDateFilters && (
          <>
            <label className="text-sm text-black">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500" />
            <label className="text-sm text-black">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500" />
            <button onClick={() => { setFromDate(monthStart()); setToDate(todayLocalDate()); }}
              className="text-xs font-semibold text-emerald-700 hover:underline">This month</button>
            <button onClick={() => { setFromDate(''); setToDate(''); }}
              className="text-xs font-semibold text-gray-600 hover:underline">All dates</button>
          </>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={() => exportStatementCSV(data, meta, fromDate, toDate)} disabled={!data}
            className={`${btn} bg-white border-gray-200 text-black hover:bg-gray-50`}>
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> CSV
          </button>
          <button onClick={openPreview} disabled={!data}
            className={`${btn} bg-white border-gray-200 text-black hover:bg-gray-50`}>
            <Eye className="w-4 h-4 text-blue-700" /> PDF Preview
          </button>
          <button onClick={downloadPdf} disabled={!data}
            className={`${btn} bg-gray-900 border-gray-900 text-white hover:bg-black`}>
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></div>
      ) : data ? (
        <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-black text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold w-28">Date</th>
                <th className="text-left px-4 py-2.5 font-semibold w-28">Voucher No</th>
                {bc ? (
                  <>
                    <th className="text-left px-3 py-2.5 font-semibold">GR</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Challan</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Station</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Mode</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Freight</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Kaat</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Rate</th>
                    <th className="text-right px-3 py-2.5 font-semibold">DD</th>
                  </>
                ) : (
                  <th className="text-left px-4 py-2.5 font-semibold">Narration</th>
                )}
                <th className="text-right px-4 py-2.5 font-semibold w-36">{FLOW_LABEL.dr}</th>
                <th className="text-right px-4 py-2.5 font-semibold w-36">{FLOW_LABEL.cr}</th>
                <th className="text-right px-4 py-2.5 font-semibold w-40">Running Balance</th>
                {userId && <th className="px-4 py-2.5 w-28" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-black">
              <tr className="bg-gray-50/60 font-medium text-black">
                <td className="px-4 py-2.5" colSpan={preCols + 2}>Opening Balance</td>
                <td className="px-4 py-2.5 text-right">₹{formatINR(data.opening_balance)}{balSuffix(data.opening_balance_type)}</td>
                {userId && <td />}
              </tr>
              {(data.entries || []).map((e, i) => {
                const dr = entryDr(e);
                const cr = entryCr(e);
                const b = bc ? parseBiltyNarration(e.narration) : null;
                return (
                  <tr key={`${e.voucher_id || ''}-${i}`} className="hover:bg-gray-50 text-black">
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(e.date || e.voucher_date)}</td>
                    <td className="px-4 py-2.5">
                      {e.voucher_id ? (
                        <button onClick={() => router.push(`/hub-management/accounts/vouchers/${e.voucher_id}`)}
                          className="text-emerald-700 font-medium hover:underline">{e.voucher_no}</button>
                      ) : (e.voucher_no || '-')}
                    </td>
                    {bc && b ? (
                      <>
                        <td className="px-3 py-2.5 font-semibold">{b.gr}</td>
                        <td className="px-3 py-2.5">{b.challan || '-'}</td>
                        <td className="px-3 py-2.5">{b.station || '-'}</td>
                        <td className="px-3 py-2.5 text-xs uppercase">{b.mode}</td>
                        <td className="px-3 py-2.5 text-right">{b.freight != null ? `₹${formatINR(b.freight)}` : ''}</td>
                        <td className="px-3 py-2.5 text-right">{b.kaat != null ? `₹${formatINR(b.kaat)}` : ''}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{b.rate}</td>
                        <td className="px-3 py-2.5 text-right">{b.dd ? `₹${formatINR(b.dd)}` : ''}</td>
                      </>
                    ) : (
                      <td className="px-4 py-2.5 text-black" colSpan={bc ? 8 : 1}>{e.narration || '-'}</td>
                    )}
                    <td className="px-4 py-2.5 text-right font-medium text-emerald-700">{dr ? `₹${formatINR(dr)}` : ''}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-rose-700">{cr ? `₹${formatINR(cr)}` : ''}</td>
                    <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap">₹{formatINR(e.running_balance)}{balSuffix(e.running_balance_type)}</td>
                    {userId && (
                      <td className="px-4 py-2.5 text-right">
                        {e.voucher_id && (
                          <button onClick={() => setEditVoucherId(e.voucher_id)}
                            className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap">Edit / Cancel</button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {!data.entries?.length && (
                <tr><td colSpan={totalCols} className="text-center py-8 text-black">No entries in this range</td></tr>
              )}
              <tr className="bg-gray-50 font-semibold text-black border-t border-gray-200">
                <td className="px-4 py-2.5" colSpan={preCols}>Total</td>
                <td className="px-4 py-2.5 text-right text-emerald-700">₹{formatINR(totals.totalDr)}</td>
                <td className="px-4 py-2.5 text-right text-rose-700">₹{formatINR(totals.totalCr)}</td>
                <td colSpan={userId ? 2 : 1} />
              </tr>
              <tr className="bg-gray-50/60 font-semibold text-black">
                <td className="px-4 py-2.5" colSpan={preCols + 2}>Closing Balance</td>
                <td className="px-4 py-2.5 text-right">₹{formatINR(data.closing_balance)}{balSuffix(data.closing_balance_type)}</td>
                {userId && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      {/* PDF preview */}
      {pdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPdfUrl(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-black flex items-center gap-2"><FileText className="w-5 h-5" /> Statement — {meta?.name}</h3>
              <div className="flex gap-2">
                <button onClick={printPdf} className={`${btn} bg-white border-gray-200 text-black hover:bg-gray-50`}><Printer className="w-4 h-4" /> Print</button>
                <button onClick={downloadPdf} className={`${btn} bg-gray-900 border-gray-900 text-white hover:bg-black`}><Download className="w-4 h-4" /> Download</button>
                <button onClick={() => setPdfUrl(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
              </div>
            </div>
            <iframe id="statement-pdf-frame" src={pdfUrl} title="Statement PDF" className="flex-1 w-full rounded-b-2xl" />
          </div>
        </div>
      )}

      {editVoucherId && (
        <EditVoucherModal
          voucherId={editVoucherId}
          userId={userId}
          onClose={() => setEditVoucherId(null)}
          onDone={() => { setEditVoucherId(null); load(); onChanged?.(); }}
        />
      )}
    </div>
  );
}
