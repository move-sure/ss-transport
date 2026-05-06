'use client';
import React, { useState, useMemo } from 'react';
import { X, Printer, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { fmtN } from './transportReportUtils';

// ─── Column headers ───────────────────────────────────────────────────────────
const COLS_POHONCH = ['GR No', 'Destination', 'Paid', 'To-Pay', 'Pkgs', 'Pvt Mark', 'Wt', 'Rate', 'DD', 'Kaat', 'Total', 'PF'];
const COLS_BILTY   = ['GR No', 'Bilty No', 'Destination', 'Paid', 'To-Pay', 'Pkgs', 'Pvt Mark', 'Wt', 'Rate', 'DD', 'Kaat', 'Total', 'PF'];

const RIGHT_COLS = new Set(['Paid', 'To-Pay', 'Wt', 'Rate', 'DD', 'Kaat', 'Total', 'PF']);
const CENTER_COLS = new Set(['Pkgs']);

// ─── Single data row ──────────────────────────────────────────────────────────
function DataRow({ b, format }) {
  const isPaid = b.payment_mode === 'paid' || b.payment_mode === 'foc';
  const dd     = Number(b.kaat_dd) || 0;
  const kaat   = Number(b.kaat)    || 0;
  const pf     = Number(b.kaat_pf) || 0;
  const total  = Number(b.total)   || 0;

  return (
    <tr className={`border-b border-gray-100 text-xs ${isPaid ? 'bg-emerald-50/60' : 'hover:bg-gray-50'}`}>
      <td className="px-2 py-1.5 font-bold text-gray-900 whitespace-nowrap">{b.gr_no}</td>
      {format === 'bilty' && (
        <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap font-mono">{b.dest_pohonch_no || b.bilty_number || '—'}</td>
      )}
      <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{b.to_city || '—'}</td>
      {/* Paid — show actual amount for paid/foc */}
      <td className="px-2 py-1.5 text-right font-semibold text-emerald-700">
        {isPaid ? fmtN(total) : ''}
      </td>
      {/* To-Pay — show actual amount for to-pay */}
      <td className="px-2 py-1.5 text-right font-semibold text-amber-700">
        {b.payment_mode === 'to-pay' ? fmtN(total) : ''}
      </td>
      <td className="px-2 py-1.5 text-center text-gray-600">{b.no_of_pkg ?? ''}</td>
      <td className="px-2 py-1.5 text-gray-500 max-w-[80px] truncate">{b.pvt_marks || ''}</td>
      <td className="px-2 py-1.5 text-right text-gray-600">{b.wt ?? ''}</td>
      <td className="px-2 py-1.5 text-right text-gray-600">{b.kaat_rate ?? ''}</td>
      <td className="px-2 py-1.5 text-right text-gray-600">{dd   !== 0 ? fmtN(dd)   : ''}</td>
      <td className="px-2 py-1.5 text-right text-gray-600">{kaat !== 0 ? fmtN(kaat) : ''}</td>
      {/* Total — always show actual amount */}
      <td className="px-2 py-1.5 text-right font-bold text-gray-900">{fmtN(total)}</td>
      <td className={`px-2 py-1.5 text-right font-semibold ${pf < 0 ? 'text-red-500' : 'text-gray-700'}`}>
        {fmtN(pf)}
      </td>
    </tr>
  );
}

// ─── Totals row (subtotal or grand total) ─────────────────────────────────────
function TotalsRow({ bilties, label, labelColSpan, isGrand = false }) {
  const paid  = bilties.filter(b => b.payment_mode === 'paid' || b.payment_mode === 'foc')
                        .reduce((s, b) => s + (Number(b.total) || 0), 0);
  const toPay = bilties.filter(b => b.payment_mode === 'to-pay')
                        .reduce((s, b) => s + (Number(b.total) || 0), 0);
  const pkgs  = bilties.reduce((s, b) => s + (Number(b.no_of_pkg) || 0), 0);
  const wt    = bilties.reduce((s, b) => s + (Number(b.wt)        || 0), 0);
  const dd    = bilties.reduce((s, b) => s + (Number(b.kaat_dd)   || 0), 0);
  const kaat  = bilties.reduce((s, b) => s + (Number(b.kaat)      || 0), 0);
  const total = bilties.reduce((s, b) => s + (Number(b.total)     || 0), 0);
  const pf    = bilties.reduce((s, b) => s + (Number(b.kaat_pf)   || 0), 0);

  if (isGrand) {
    return (
      <tr className="bg-gray-900 text-white text-xs font-bold border-t-2 border-gray-700">
        <td colSpan={labelColSpan} className="px-3 py-2.5 font-black tracking-wide">{label}</td>
        <td className="px-2 py-2.5 text-right text-emerald-300">{fmtN(paid)}</td>
        <td className="px-2 py-2.5 text-right text-amber-300">{fmtN(toPay)}</td>
        <td className="px-2 py-2.5 text-center">{pkgs}</td>
        <td></td>
        <td className="px-2 py-2.5 text-right">{fmtN(wt)}</td>
        <td></td>
        <td className="px-2 py-2.5 text-right">{fmtN(dd)}</td>
        <td className="px-2 py-2.5 text-right">{fmtN(kaat)}</td>
        <td className="px-2 py-2.5 text-right text-lg font-black">{fmtN(total)}</td>
        <td className={`px-2 py-2.5 text-right ${pf < 0 ? 'text-red-400' : ''}`}>{fmtN(pf)}</td>
      </tr>
    );
  }

  return (
    <tr className="bg-gray-200 text-gray-800 text-xs font-bold border-y border-gray-300">
      <td colSpan={labelColSpan} className="px-3 py-2 font-black text-gray-700">{label}</td>
      <td className="px-2 py-2 text-right text-emerald-700">{fmtN(paid)}</td>
      <td className="px-2 py-2 text-right text-amber-700">{fmtN(toPay)}</td>
      <td className="px-2 py-2 text-center">{pkgs}</td>
      <td></td>
      <td className="px-2 py-2 text-right">{fmtN(wt)}</td>
      <td></td>
      <td className="px-2 py-2 text-right">{fmtN(dd)}</td>
      <td className="px-2 py-2 text-right">{fmtN(kaat)}</td>
      <td className="px-2 py-2 text-right font-black">{fmtN(total)}</td>
      <td className={`px-2 py-2 text-right ${pf < 0 ? 'text-red-600' : ''}`}>{fmtN(pf)}</td>
    </tr>
  );
}

// ─── Group header row ─────────────────────────────────────────────────────────
function GroupHeader({ label, colCount, detail }) {
  return (
    <tr className="bg-gray-700 text-white border-y border-gray-600">
      <td colSpan={colCount} className="px-3 py-2 font-black text-sm">
        {label}
        {detail && <span className="ml-2 text-xs font-normal text-gray-300">{detail}</span>}
      </td>
    </tr>
  );
}

// ─── Main preview component ───────────────────────────────────────────────────
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
  const [showPaid, setShowPaid] = useState(true);

  // ── Included bilties after group/bilty exclusion ────────────────────────────
  const inclPohonch   = (pohonchGroups || []).filter(g => !excludedGroups.has(g.key));
  const inclNoPohonch = ((noPohonchGroup?.bilties) || []).filter(b => !excludedBilties.has(b.gr_no));

  const isPaidRow = (b) => b.payment_mode === 'paid' || b.payment_mode === 'foc';
  const filterPaid = (arr) => showPaid ? arr : arr.filter(b => !isPaidRow(b));

  const allIncluded  = [...inclPohonch.flatMap(g => g.bilties), ...inclNoPohonch];
  const paidCount    = allIncluded.filter(isPaidRow).length;
  const totalCount   = allIncluded.length;

  // ── Bilty format: sorted flat list ─────────────────────────────────────────
  const biltyRows = useMemo(() => {
    const flat = filterPaid(allIncluded);
    return [...flat].sort((a, b) => {
      const da = a.dest_pohonch_no || a.bilty_number || '';
      const db = b.dest_pohonch_no || b.bilty_number || '';
      if (da === '' && db !== '') return 1;
      if (da !== '' && db === '') return -1;
      const na = parseInt(da, 10), nb = parseInt(db, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return da.localeCompare(db);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pohonchGroups, noPohonchGroup, excludedGroups, excludedBilties, showPaid]);

  const cols       = printFormat === 'bilty' ? COLS_BILTY : COLS_POHONCH;
  const colCount   = cols.length;
  const visibleCount = printFormat === 'bilty'
    ? biltyRows.length
    : filterPaid(allIncluded).length;

  // ── Grand total bilties ─────────────────────────────────────────────────────
  const grandBilties = printFormat === 'bilty'
    ? biltyRows
    : filterPaid(allIncluded);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
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
              {fromDate} → {toDate}
              {billDate && <> · Bill: {billDate}</>}
              {' · '}
              {printFormat === 'bilty' ? 'Bilty Format' : 'Pohonch Format'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Paid rows toggle */}
          <button
            onClick={() => setShowPaid(p => !p)}
            title={showPaid ? 'Click to hide paid bilties' : 'Click to show paid bilties'}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              showPaid
                ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {showPaid ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {showPaid ? `Paid Visible (${paidCount})` : `Paid Hidden (${paidCount})`}
          </button>

          {/* Generate PDF */}
          <button
            onClick={onPrint}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-bold hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {pdfLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Printer className="h-3.5 w-3.5" />}
            {pdfLoading ? 'Generating…' : 'Generate PDF'}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-800 text-white text-[10px] uppercase tracking-wider">
              {cols.map(c => (
                <th
                  key={c}
                  className={`px-2 py-2 font-bold whitespace-nowrap border-r border-gray-700 last:border-r-0 ${
                    RIGHT_COLS.has(c)  ? 'text-right'  :
                    CENTER_COLS.has(c) ? 'text-center' : 'text-left'
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── Bilty format: flat sorted list ──────────────────────────── */}
            {printFormat === 'bilty' && (
              <>
                {biltyRows.map((b, i) => (
                  <DataRow key={`${b.gr_no}-${i}`} b={b} format="bilty" />
                ))}
                {biltyRows.length === 0 && (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-6 text-center text-gray-400 italic">
                      No bilties to display.
                    </td>
                  </tr>
                )}
                <TotalsRow
                  bilties={biltyRows}
                  label={`GRAND TOTAL  —  ${biltyRows.length} bilties`}
                  labelColSpan={3}
                  isGrand
                />
              </>
            )}

            {/* ── Pohonch format: grouped ──────────────────────────────────── */}
            {printFormat !== 'bilty' && (
              <>
                {inclPohonch.map(grp => {
                  const visiBilties = filterPaid(grp.bilties);
                  const hiddenCount = grp.bilties.length - visiBilties.length;
                  return (
                    <React.Fragment key={grp.key}>
                      <GroupHeader
                        label={`Pohonch: ${grp.key}`}
                        colCount={colCount}
                        detail={
                          hiddenCount > 0
                            ? `${visiBilties.length} shown · ${hiddenCount} paid hidden`
                            : `${grp.bilties.length} bilties`
                        }
                      />
                      {visiBilties.map((b, i) => (
                        <DataRow key={`${b.gr_no}-${i}`} b={b} format="pohonch" />
                      ))}
                      {visiBilties.length === 0 && (
                        <tr>
                          <td colSpan={colCount} className="px-4 py-3 text-center text-gray-400 italic text-xs">
                            All {grp.bilties.length} bilties are paid (hidden)
                          </td>
                        </tr>
                      )}
                      <TotalsRow
                        bilties={visiBilties}
                        label={`Subtotal: ${grp.key}  (${visiBilties.length})`}
                        labelColSpan={2}
                      />
                    </React.Fragment>
                  );
                })}

                {inclNoPohonch.length > 0 && (() => {
                  const visiNp     = filterPaid(inclNoPohonch);
                  const hiddenCount = inclNoPohonch.length - visiNp.length;
                  return (
                    <React.Fragment key="__no_pohonch__">
                      <GroupHeader
                        label="No Pohonch Available"
                        colCount={colCount}
                        detail={
                          hiddenCount > 0
                            ? `${visiNp.length} shown · ${hiddenCount} paid hidden`
                            : `${inclNoPohonch.length} bilties`
                        }
                      />
                      {visiNp.map((b, i) => (
                        <DataRow key={`${b.gr_no}-${i}`} b={b} format="pohonch" />
                      ))}
                      {visiNp.length === 0 && (
                        <tr>
                          <td colSpan={colCount} className="px-4 py-3 text-center text-gray-400 italic text-xs">
                            All {inclNoPohonch.length} bilties are paid (hidden)
                          </td>
                        </tr>
                      )}
                      <TotalsRow
                        bilties={visiNp}
                        label={`Subtotal: No Pohonch  (${visiNp.length})`}
                        labelColSpan={2}
                      />
                    </React.Fragment>
                  );
                })()}

                {grandBilties.length === 0 && inclPohonch.length === 0 && inclNoPohonch.length === 0 && (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-6 text-center text-gray-400 italic">
                      No bilties to display.
                    </td>
                  </tr>
                )}

                <TotalsRow
                  bilties={grandBilties}
                  label={`GRAND TOTAL  —  ${grandBilties.length} bilties`}
                  labelColSpan={2}
                  isGrand
                />
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Status bar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-gray-900 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          Showing <span className="font-bold text-white">{visibleCount}</span> of{' '}
          <span className="font-bold text-white">{totalCount}</span> bilties
          {!showPaid && paidCount > 0 && (
            <span className="ml-1.5 text-emerald-400">· {paidCount} paid bilties hidden</span>
          )}
        </p>
        <p className="text-xs text-gray-600 italic">
          Preview shows actual amounts · PDF will use PAID text for paid bilties
        </p>
      </div>

    </div>
  );
}
