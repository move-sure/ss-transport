'use client';

import React from 'react';
import { X, Loader2, Download } from 'lucide-react';
import { fmtN } from './transportReportUtils';

// ─── Single bilty row ─────────────────────────────────────────────────────────
function BiltyRow({ b, alt }) {
  const paid   = b.payment_mode === 'paid'   ? fmtN(b.total) : b.payment_mode === 'foc' ? 'FOC' : '';
  const toPay  = b.payment_mode === 'to-pay' ? fmtN(b.total) : '';
  const chg = 'border border-gray-200 px-1.5 py-[3px] text-right font-bold text-gray-900 text-[13px]';
  const txt = 'border border-gray-200 px-1.5 py-[3px] text-gray-600 text-[9px]';
  const dst = 'border border-gray-200 px-1.5 py-[3px] font-bold text-gray-900 whitespace-nowrap text-[13px]';

  return (
    <tr className={alt ? 'bg-gray-50' : 'bg-white'}>
      <td className="border border-gray-200 px-1.5 py-[3px] font-bold text-gray-900 whitespace-nowrap text-[11px]">{b.gr_no || ''}</td>
      <td className={dst}>{b.to_city || ''}</td>
      <td className={txt}>{b.consignor_name || ''}</td>
      <td className={txt}>{b.consignee_name || ''}</td>
      <td className={chg}>{paid}</td>
      <td className={chg}>{toPay}</td>
      <td className="border border-gray-200 px-1.5 py-[3px] text-center text-gray-600 text-[10px]">{b.no_of_pkg ?? ''}</td>
      <td className={txt}>{b.pvt_marks || ''}</td>
      <td className={chg}>{b.wt ?? ''}</td>
      <td className={chg}>{b.kaat_rate ?? ''}</td>
      <td className={chg}>{b.kaat != null ? fmtN(b.kaat) : ''}</td>
      <td className={chg}>{b.kaat_dd != null ? fmtN(b.kaat_dd) : ''}</td>
      <td className={chg}>{fmtN(b.total)}</td>
      <td className={chg}>{b.kaat_pf != null ? fmtN(b.kaat_pf) : ''}</td>
    </tr>
  );
}

const COLS = ['GR No', 'Destination', 'Consignor', 'Consignee', 'Paid', 'To-Pay', 'Pkgs', 'Pvt Mark', 'Wt', 'Rate', 'Kaat', 'Kaat DD', 'Total', 'Kaat PF'];
const COL_WIDTHS = ['5%','9%','4%','4%','6%','6%','3.5%','5%','6.5%','5.5%','7.5%','7.5%','8.5%','7.5%'];

// ─── Print Preview ────────────────────────────────────────────────────────────
export default function CrossingBillsPrintPreview({
  transportName,
  transportGst,
  fromDate,
  toDate,
  inclPohonchGroups,   // [{ key, bilties }]
  inclNoPohonch,       // [bilty, ...]
  onClose,
  onDownload,
  pdfLoading,
}) {
  const totalBilties =
    inclPohonchGroups.reduce((s, g) => s + g.bilties.length, 0) +
    inclNoPohonch.length;

  // ── Grand totals ───────────────────────────────────────────────────────────
  const allBilties = [
    ...inclPohonchGroups.flatMap(g => g.bilties),
    ...inclNoPohonch,
  ];
  const sumWt      = allBilties.reduce((s, b) => s + (b.wt      ?? 0), 0);
  const sumKaat    = allBilties.reduce((s, b) => s + (b.kaat    ?? 0), 0);
  const sumKaatDd  = allBilties.reduce((s, b) => s + (b.kaat_dd ?? 0), 0);
  const sumTotal   = allBilties.reduce((s, b) => s + (b.total   ?? 0), 0);
  const sumKaatPf  = allBilties.reduce((s, b) => s + (b.kaat_pf ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-200">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-gray-300 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            title="Close preview"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <p className="text-sm font-bold text-gray-900">Print Preview</p>
            <p className="text-xs text-gray-500">
              {transportName}&nbsp;·&nbsp;{fromDate} to {toDate}&nbsp;·&nbsp;
              <strong className="text-gray-700">{totalBilties}</strong> bilties
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={onDownload}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {pdfLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* ── Document preview ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto py-5">
        {/* Paper — takes full width with 8px gutter on each side */}
        <div className="bg-white shadow-2xl" style={{ margin: '0 8px' }}>

          {/* Document header */}
          <div className="text-center pt-5 pb-3 border-b-2 border-gray-300 px-2">
            <h1 className="text-3xl font-black text-gray-900 tracking-widest uppercase">SS TRANSPORT</h1>
            <p className="text-xs text-gray-600 mt-1.5 font-medium">
              {transportName}
              {transportGst && <span> &nbsp;|&nbsp; GSTIN: {transportGst}</span>}
              <span> &nbsp;|&nbsp; Period: {fromDate} to {toDate}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{totalBilties} bilties</p>
          </div>

          {/* ── Full-width table ───────────────────────────────────────────── */}
          <div className="px-2 py-3">
            <table
              className="w-full border-collapse"
              style={{ fontSize: '11px' }}
            >
              <thead>
                <tr className="bg-gray-900 text-white">
                  {COLS.map((h, i) => (
                    <th
                      key={h}
                      className="border border-gray-600 px-2 py-[5px] text-left whitespace-nowrap font-bold tracking-wide"
                      style={{ fontSize: '10px', width: COL_WIDTHS[i] }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {inclPohonchGroups.map(grp => {
                  const gWt     = grp.bilties.reduce((s, b) => s + (b.wt      ?? 0), 0);
                  const gKaat   = grp.bilties.reduce((s, b) => s + (b.kaat    ?? 0), 0);
                  const gKaatDd = grp.bilties.reduce((s, b) => s + (b.kaat_dd ?? 0), 0);
                  const gTotal  = grp.bilties.reduce((s, b) => s + (b.total   ?? 0), 0);
                  const gKaatPf = grp.bilties.reduce((s, b) => s + (b.kaat_pf ?? 0), 0);
                  const hc = [...new Set(grp.bilties.map(b => b.pohonch_number).filter(Boolean))].join(', ');
                  const sub = 'border border-gray-300 px-1.5 py-[4px] text-right font-black text-gray-900 text-[12px]';
                  return (
                    <React.Fragment key={grp.key}>
                      {/* Section header row */}
                      <tr className="bg-gray-200">
                        <td colSpan={14} className="border border-gray-400 px-3 py-[5px] font-bold text-gray-800 text-center" style={{ fontSize: '11px' }}>
                          Pohonch Number:&nbsp;{grp.key}
                          {hc && <>&nbsp;&nbsp;—&nbsp;&nbsp;Crossing Challan SS :&nbsp;{hc}</>}
                          &nbsp;&nbsp;—&nbsp;&nbsp;{grp.bilties.length}&nbsp;bilties
                        </td>
                      </tr>
                      {grp.bilties.map((b, i) => (
                        <BiltyRow key={`${b.gr_no}-${i}`} b={b} alt={i % 2 !== 0} />
                      ))}
                      {/* Per-group subtotal */}
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="border border-gray-300 px-2 py-[4px] font-bold text-gray-700 text-[10px] text-center">
                          Subtotal: {grp.key}&nbsp;({grp.bilties.length} bilties)
                        </td>
                        <td className="border border-gray-300 px-1.5 py-[4px]" />
                        <td className="border border-gray-300 px-1.5 py-[4px]" />
                        <td className="border border-gray-300 px-1.5 py-[4px]" />
                        <td className="border border-gray-300 px-1.5 py-[4px]" />
                        <td className={sub}>{fmtN(gWt)}</td>
                        <td className="border border-gray-300 px-1.5 py-[4px]" />
                        <td className={sub}>{fmtN(gKaat)}</td>
                        <td className={sub}>{fmtN(gKaatDd)}</td>
                        <td className={sub}>{fmtN(gTotal)}</td>
                        <td className={sub}>{fmtN(gKaatPf)}</td>
                      </tr>
                      {/* Gap spacer between groups */}
                      <tr><td colSpan={14} className="py-[5px] bg-gray-200" style={{ border: 'none' }} /></tr>
                    </React.Fragment>
                  );
                })}

                {inclNoPohonch.length > 0 && (() => {
                  const npWt     = inclNoPohonch.reduce((s, b) => s + (b.wt      ?? 0), 0);
                  const npKaat   = inclNoPohonch.reduce((s, b) => s + (b.kaat    ?? 0), 0);
                  const npKaatDd = inclNoPohonch.reduce((s, b) => s + (b.kaat_dd ?? 0), 0);
                  const npTotal  = inclNoPohonch.reduce((s, b) => s + (b.total   ?? 0), 0);
                  const npKaatPf = inclNoPohonch.reduce((s, b) => s + (b.kaat_pf ?? 0), 0);
                  const sub = 'border border-gray-300 px-1.5 py-[4px] text-right font-black text-gray-900 text-[12px]';
                  return (
                    <React.Fragment>
                      <tr className="bg-gray-200">
                        <td colSpan={14} className="border border-gray-400 px-3 py-[5px] font-bold text-gray-800 text-center" style={{ fontSize: '11px' }}>
                          No Pohonch Available&nbsp;&nbsp;—&nbsp;&nbsp;{inclNoPohonch.length}&nbsp;bilties
                        </td>
                      </tr>
                      {inclNoPohonch.map((b, i) => (
                        <BiltyRow key={`np-${b.gr_no}-${i}`} b={b} alt={i % 2 !== 0} />
                      ))}
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="border border-gray-300 px-2 py-[4px] font-bold text-gray-700 text-[10px] text-center">
                          Subtotal: No Pohonch&nbsp;({inclNoPohonch.length} bilties)
                        </td>
                        <td className="border border-gray-300 px-1.5 py-[4px]" />
                        <td className="border border-gray-300 px-1.5 py-[4px]" />
                        <td className="border border-gray-300 px-1.5 py-[4px]" />
                        <td className="border border-gray-300 px-1.5 py-[4px]" />
                        <td className={sub}>{fmtN(npWt)}</td>
                        <td className="border border-gray-300 px-1.5 py-[4px]" />
                        <td className={sub}>{fmtN(npKaat)}</td>
                        <td className={sub}>{fmtN(npKaatDd)}</td>
                        <td className={sub}>{fmtN(npTotal)}</td>
                        <td className={sub}>{fmtN(npKaatPf)}</td>
                      </tr>
                    </React.Fragment>
                  );
                })()}

                {/* ── Grand Totals row ──────────────────────────────────── */}
                <tr className="bg-gray-900 text-white">
                  <td colSpan={4} className="border border-gray-600 px-3 py-[9px] font-black text-[15px] text-center tracking-wide">
                    GRAND TOTAL &nbsp;({totalBilties} bilties)
                  </td>
                  <td className="border border-gray-600 px-3 py-[9px]" />{/* Paid */}
                  <td className="border border-gray-600 px-3 py-[9px]" />{/* To-Pay */}
                  <td className="border border-gray-600 px-3 py-[9px]" />{/* Pkgs */}
                  <td className="border border-gray-600 px-3 py-[9px]" />{/* Pvt Mark */}
                  <td className="border border-gray-600 px-3 py-[9px] text-right font-black text-[15px] text-white">{fmtN(sumWt)}</td>
                  <td className="border border-gray-600 px-3 py-[9px]" />{/* Rate */}
                  <td className="border border-gray-600 px-3 py-[9px] text-right font-black text-[15px] text-white">{fmtN(sumKaat)}</td>
                  <td className="border border-gray-600 px-3 py-[9px] text-right font-black text-[15px] text-white">{fmtN(sumKaatDd)}</td>
                  <td className="border border-gray-600 px-3 py-[9px] text-right font-black text-[15px] text-white">{fmtN(sumTotal)}</td>
                  <td className="border border-gray-600 px-3 py-[9px] text-right font-black text-[15px] text-white">{fmtN(sumKaatPf)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Authorized Signatures ───────────────────────────────────────── */}
          <div className="px-4 pt-6 pb-8 grid grid-cols-2 gap-8 border-t-2 border-gray-200">
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-16 border-b-2 border-gray-400" />
              <p className="text-xs font-bold text-gray-700 tracking-wide uppercase">Authorized Signatory</p>
              <p className="text-sm font-black text-gray-900 tracking-widest uppercase">SS TRANSPORT</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-16 border-b-2 border-gray-400" />
              <p className="text-xs font-bold text-gray-700 tracking-wide uppercase">Authorized Signatory</p>
              <p className="text-sm font-black text-gray-900 tracking-widest uppercase">{transportName || 'Transport'}</p>
              {transportGst && <p className="text-[10px] text-gray-500">{transportGst}</p>}
            </div>
          </div>

          {/* Document footer */}
          <div className="text-center pb-3 border-t border-gray-100 px-2">
            <p className="text-[10px] text-gray-400">Crossing Bills Report — SS TRANSPORT</p>
          </div>

        </div>
      </div>
    </div>
  );
}
