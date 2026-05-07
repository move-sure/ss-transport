'use client';
import React, { useState, useMemo } from 'react';
import { X, Printer, Loader2, ArrowLeft } from 'lucide-react';
import { fmtN } from './transportReportUtils';

// Columns: GR No | Pohonch Number | Bilty Date | Pkgs | Wt | DD | Rate | To-Pay (PF) | Paid (KAAT)
const COLS = ['GR No', 'Pohonch Number', 'Bilty Date', 'Pkgs', 'Wt', 'DD', 'Rate', 'To-Pay (PF)', 'Paid (KAAT)'];
const COL_COUNT = COLS.length;

const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '';

// Single data row
function DataRow({ b }) {
  const isPaid  = b.payment_mode === 'paid' || b.payment_mode === 'foc';
  const dd      = Number(b.kaat_dd) || 0;
  const kaat    = Number(b.kaat)    || 0;
  const pfVal   = !isPaid ? fmtN(Number(b.kaat_pf) || 0) : '';
  const kaatVal = isPaid  ? fmtN(dd + kaat)               : '';

  return (
    <tr className={`border-b border-gray-100 text-xs ${isPaid ? 'bg-green-50' : 'bg-white hover:bg-gray-50'}`}>
      <td className="px-2 py-1.5 font-black text-gray-900 whitespace-nowrap">{b.gr_no}</td>
      <td className="px-2 py-1.5 font-semibold text-gray-800 whitespace-nowrap">
        {b.dest_pohonch_no || b.bilty_number
          ? (b.dest_pohonch_no || b.bilty_number)
          : <span className="text-gray-400 italic text-[10px]">Not Provided Yet</span>}
      </td>
      <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">{fmtDate(b.bilty_date)}</td>
      <td className="px-2 py-1.5 text-center text-gray-700 font-semibold">{b.no_of_pkg ?? ''}</td>
      <td className="px-2 py-1.5 text-right text-gray-700">{b.wt ?? ''}</td>
      <td className="px-2 py-1.5 text-right text-gray-700">{dd !== 0 ? fmtN(dd) : ''}</td>
      <td className="px-2 py-1.5 text-right text-gray-500">{b.kaat_rate ?? ''}</td>
      <td className="px-2 py-1.5 text-right font-bold text-blue-700 whitespace-nowrap">{pfVal}</td>
      <td className="px-2 py-1.5 text-right font-bold text-red-700 whitespace-nowrap">{kaatVal}</td>
    </tr>
  );
}

// Subtotal / Grand total row
function TotalsRow({ bilties, label, isGrand = false }) {
  const pf   = bilties
                 .filter(b => b.payment_mode === 'to-pay')
                 .reduce((s, b) => s + (Number(b.kaat_pf) || 0), 0);
  const paid = bilties
                 .filter(b => b.payment_mode === 'paid' || b.payment_mode === 'foc')
                 .reduce((s, b) => s + (Number(b.kaat_dd) || 0) + (Number(b.kaat) || 0), 0);
  const pkgs = bilties.reduce((s, b) => s + (Number(b.no_of_pkg) || 0), 0);
  const wt   = bilties.reduce((s, b) => s + (Number(b.wt)        || 0), 0);
  const dd   = bilties.reduce((s, b) => s + (Number(b.kaat_dd)   || 0), 0);
  const netPf = pf - paid;

  if (isGrand) {
    return (
      <>
        <tr className="bg-gray-800 text-white text-xs font-bold border-t-2 border-gray-600">
          <td colSpan={2} className="px-3 py-2 font-black text-sm">{label}</td>
          <td className="px-2 py-2"></td>
          <td className="px-2 py-2 text-center">{pkgs}</td>
          <td className="px-2 py-2 text-right">{fmtN(wt)}</td>
          <td className="px-2 py-2 text-right">{fmtN(dd)}</td>
          <td className="px-2 py-2 text-center text-gray-500">â€”</td>
          <td className="px-2 py-2 text-right text-blue-300">{fmtN(pf)}</td>
          <td className="px-2 py-2 text-right text-red-300">{fmtN(paid)}</td>
        </tr>
        <tr className="bg-gray-950 text-white text-sm font-black border-t border-gray-700">
          <td colSpan={COL_COUNT} className="px-4 py-3 text-center tracking-wide">
            NET PF &nbsp;=&nbsp; To-Pay PF - Paid KAAT &nbsp;=&nbsp;{' '}
            <span className="text-blue-300">{fmtN(pf)}</span>
            {' '}-{' '}
            <span className="text-red-300">{fmtN(paid)}</span>
            {' '}=&nbsp;
            <span className={`text-lg font-black ${netPf >= 0 ? 'text-white' : 'text-red-400'}`}>
              Rs. {fmtN(netPf)}
            </span>
          </td>
        </tr>
      </>
    );
  }

  return (
    <tr className="bg-gray-200 text-gray-800 text-xs font-bold border-y border-gray-300">
      <td colSpan={2} className="px-3 py-1.5 font-black text-gray-700">{label}</td>
      <td></td>
      <td className="px-2 py-1.5 text-center">{pkgs}</td>
      <td className="px-2 py-1.5 text-right">{fmtN(wt)}</td>
      <td className="px-2 py-1.5 text-right">{fmtN(dd)}</td>
      <td></td>
      <td className="px-2 py-1.5 text-right text-blue-700">{fmtN(pf)}</td>
      <td className="px-2 py-1.5 text-right text-red-700">{fmtN(paid)}</td>
    </tr>
  );
}

// Group header row
function GroupHeader({ label, count }) {
  return (
    <tr className="bg-gray-700 text-white">
      <td colSpan={COL_COUNT} className="px-4 py-2.5">
        <span className="font-black text-base">{label}</span>
        <span className="ml-3 text-xs font-normal text-gray-300 bg-gray-600 px-2 py-0.5 rounded-full">
          {count} bilties
        </span>
      </td>
    </tr>
  );
}

// Main preview component
export default function CrossingBillsPreviewTable({
  pohonchGroups,
  noPohonchGroup,
  excludedGroups,
  excludedBilties,
  printFormat,
  transportName,
  transportGst,
  fromDate,
  toDate,
  billDate,
  onClose,
  onBackToSettings,
  onPrint,
  pdfLoading,
}) {
  const inclPohonch   = (pohonchGroups   || []).filter(g => !excludedGroups.has(g.key));
  const inclNoPohonch = ((noPohonchGroup?.bilties) || []).filter(b => !excludedBilties.has(b.gr_no));
  const allIncluded   = [...inclPohonch.flatMap(g => g.bilties), ...inclNoPohonch];

  const biltyRows = useMemo(() => {
    const flat = [...inclPohonch.flatMap(g => g.bilties), ...inclNoPohonch];
    return flat.sort((a, b) => {
      const da = a.dest_pohonch_no || a.bilty_number || '';
      const db = b.dest_pohonch_no || b.bilty_number || '';
      if (da === '' && db !== '') return 1;
      if (da !== '' && db === '') return -1;
      const na = parseInt(da, 10), nb = parseInt(db, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return da.localeCompare(db);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pohonchGroups, noPohonchGroup, excludedGroups, excludedBilties]);

  const grandBilties = printFormat === 'bilty' ? biltyRows : allIncluded;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">

      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="h-4 w-px bg-gray-700" />
          <div>
            <p className="text-sm font-black text-white leading-tight">{transportName || 'Transport'}</p>
            <p className="text-[10px] text-gray-400">
              {fromDate} to {toDate}
              {billDate && <> &middot; Bill: {billDate}</>}
              {' \u00B7 '}
              {printFormat === 'bilty' ? 'Bilty Format' : 'Pohonch Format'}
              {' \u00B7 '}
              <span className="text-white font-bold">{grandBilties.length} bilties</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-bold hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {pdfLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Printer className="h-3.5 w-3.5" />}
            {pdfLoading ? 'Generating...' : 'Generate PDF'}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="shrink-0 flex flex-wrap items-center gap-4 px-4 py-2 bg-gray-800 border-b border-gray-700 text-[11px]">
        <span className="text-gray-400 font-semibold">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-700" />
          <span className="text-gray-300">To-Pay (PF) = kaat_pf for to-pay bilties</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-700" />
          <span className="text-gray-300">Paid (KAAT) = DD + KAAT for paid/foc bilties</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
          <span className="text-gray-300">Green = paid/foc rows</span>
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 780 }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-800 text-white text-[10px] uppercase tracking-wider">
              {COLS.map(c => (
                <th
                  key={c}
                  className={`px-2 py-2 font-bold whitespace-nowrap border-r border-gray-700 last:border-r-0 ${
                    c === 'Pkgs'                                             ? 'text-center' :
                    ['Wt','DD','Rate','To-Pay (PF)','Paid (KAAT)'].includes(c) ? 'text-right'  : 'text-left'
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {printFormat === 'bilty' ? (
              <>
                {biltyRows.map((b, i) => <DataRow key={`${b.gr_no}-${i}`} b={b} />)}
                {biltyRows.length === 0 && (
                  <tr><td colSpan={COL_COUNT} className="px-4 py-8 text-center text-gray-400 italic">No bilties to display.</td></tr>
                )}
                <TotalsRow bilties={biltyRows} label={`GRAND TOTAL - ${biltyRows.length} bilties`} isGrand />
              </>
            ) : (
              <>
                {inclPohonch.map(grp => (
                  <React.Fragment key={grp.key}>
                    <GroupHeader label={`Pohonch: ${grp.key}`} count={grp.bilties.length} />
                    {grp.bilties.map((b, i) => <DataRow key={`${b.gr_no}-${i}`} b={b} />)}
                    {grp.bilties.length === 0 && (
                      <tr><td colSpan={COL_COUNT} className="px-4 py-3 text-center text-gray-400 italic">No bilties.</td></tr>
                    )}
                    <TotalsRow bilties={grp.bilties} label={`Subtotal: ${grp.key} (${grp.bilties.length})`} />
                  </React.Fragment>
                ))}

                {inclNoPohonch.length > 0 && (
                  <React.Fragment key="__no_pohonch__">
                    <GroupHeader label="No Pohonch Available" count={inclNoPohonch.length} />
                    {inclNoPohonch.map((b, i) => <DataRow key={`${b.gr_no}-${i}`} b={b} />)}
                    <TotalsRow bilties={inclNoPohonch} label={`Subtotal: No Pohonch (${inclNoPohonch.length})`} />
                  </React.Fragment>
                )}

                {allIncluded.length === 0 && (
                  <tr><td colSpan={COL_COUNT} className="px-4 py-8 text-center text-gray-400 italic">No bilties to display.</td></tr>
                )}

                <TotalsRow bilties={grandBilties} label={`GRAND TOTAL - ${grandBilties.length} bilties`} isGrand />
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="shrink-0 px-4 py-2 bg-gray-900 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          <span className="font-bold text-white">{grandBilties.length}</span> bilties included in PDF
        </p>
      </div>

    </div>
  );
}
