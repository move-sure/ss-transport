'use client';

import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { X, Printer, Download, Loader2 } from 'lucide-react';

/*
 * Labour ledger print (landscape A4) from GET /api/ledger/labour/{id}:
 *  - every voucher: date, voucher no, challan, weight, each labour charge, charges (Cr), paid (Dr),
 *    mode, running balance and the full narration
 *  - challan-wise summary: charges, paid and balance per challan (from the bills)
 * Filters: one challan or all, and a date range (with opening balance).
 */

export const CHARGES = [
  ['unloading', 'Unloading'],
  ['crossing', 'Crossing'],
  ['dala_munshiyana', 'Dala Munsh.'],
  ['labour_wage', 'Lab. Wage'],
  ['other_charge', 'Other'],
];

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => (n(v) ? n(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
const fmt0 = (v) => n(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dmy = (d) => {
  if (!d) return '';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return `${day}-${m}-${y}`;
};
// jsPDF's built-in font has no rupee sign or smart punctuation
const clean = (t) => String(t ?? '').replace(/₹/g, 'Rs.').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E\n]/g, '');
const balText = (v) => (Math.abs(v) < 0.005 ? 'Nil' : `${fmt0(Math.abs(v))} ${v > 0 ? 'Cr' : 'Dr'}`);

/** Rows ready to print. Balance sign: + = we owe the labourer (Cr), - = advance (Dr). */
export function prepareLabourRows(detail) {
  const bills = detail?.bills || [];
  const billById = Object.fromEntries(bills.map((b) => [b.id, b]));
  return (detail?.statement || []).map((s) => {
    const src = s.source || {};
    const bill = billById[s.bill_reference_id];
    const challan = src.challan_no || bill?.metadata?.challan_no || bill?.reference_no || '';
    const isCharge = s.entry_type === 'cr';
    const mode = src.payment_mode || (s.voucher_type === 'payment' ? 'payment' : '');
    return {
      ...s,
      date: s.voucher_date,
      challan,
      weight: isCharge ? n(src.weight ?? bill?.metadata?.weight) : 0,
      charges: Object.fromEntries(CHARGES.map(([k]) => [k, isCharge ? n(src[k] ?? bill?.metadata?.[k]) : 0])),
      cr: isCharge ? n(s.amount) : 0,
      dr: isCharge ? 0 : n(s.amount),
      mode: isCharge ? '' : String(mode).toUpperCase(),
      bank: src.bank_name || src.bank || '',
      runBal: (s.running_balance_type === 'dr' ? -1 : 1) * n(s.running_balance),
    };
  });
}

export function buildLabourLedgerPdf({ detail, rows, challan = '', from = '', to = '', branchName = '' }) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const W = 297;
  const H = 210;
  const M = 8;
  const name = detail?.ledger?.name || '';

  // opening balance = running balance just before the period (whole ledger only)
  let opening = 0;
  let list = rows;
  if (challan) list = list.filter((r) => r.challan === challan);
  if (!challan && from) {
    const before = rows.filter((r) => r.date < from);
    if (before.length) opening = before[before.length - 1].runBal;
  }
  if (from) list = list.filter((r) => r.date >= from);
  if (to) list = list.filter((r) => r.date <= to);

  const tot = { weight: 0, cr: 0, dr: 0, ...Object.fromEntries(CHARGES.map(([k]) => [k, 0])) };
  let bal = opening;
  const body = list.map((r) => {
    tot.weight += r.weight; tot.cr += r.cr; tot.dr += r.dr;
    CHARGES.forEach(([k]) => { tot[k] += r.charges[k]; });
    bal = challan ? bal + r.cr - r.dr : r.runBal;
    const narration = [r.narration, r.mode && `Mode: ${r.mode}${r.bank ? ` (${r.bank})` : ''}`].filter(Boolean).join('\n');
    return [
      dmy(r.date), r.voucher_no || '', r.challan, r.weight ? String(r.weight) : '',
      ...CHARGES.map(([k]) => fmt(r.charges[k])),
      fmt(r.cr), fmt(r.dr), balText(bal), clean(narration),
    ];
  });
  const closing = list.length ? bal : opening;

  const period = challan ? `Challan ${challan}` : from || to ? `${from ? dmy(from) : 'Start'} to ${to ? dmy(to) : 'Today'}` : 'All entries';

  const header = (page) => {
    doc.setTextColor(0, 0, 0);
    if (page === 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('S. S. TRANSPORT CORPORATION', W / 2, 12, { align: 'center' });
      doc.setFontSize(12);
      doc.text('LABOUR LEDGER', W / 2, 19, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Labourer: ${clean(name)}`, M, 27);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (branchName) doc.text(`Branch: ${clean(branchName)}`, M, 32);
      doc.text(`Period: ${period}`, M, 37);
      doc.text(`Printed: ${dmy(new Date().toISOString())} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, W - M, 12, { align: 'right' });

      // summary boxes
      const boxes = [
        ['Opening', balText(opening)],
        ['Total charges (Cr)', fmt0(tot.cr)],
        ['Total paid (Dr)', fmt0(tot.dr)],
        ['Closing balance', balText(closing)],
      ];
      const bw = 52;
      boxes.forEach(([label, value], i) => {
        const x = W - M - (boxes.length - i) * (bw + 2) + 2;
        doc.setDrawColor(0); doc.setLineWidth(0.25);
        doc.rect(x, 22, bw, 12);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(label, x + 2, 26);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(value, x + bw - 2, 32, { align: 'right' });
      });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`LABOUR LEDGER - ${clean(name)} (continued)`, M, 9);
      doc.setFont('helvetica', 'normal');
      doc.text(period, W - M, 9, { align: 'right' });
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Page ${page}`, W - M, H - 4, { align: 'right' });
    doc.text('Cr = we owe the labourer   Dr = paid / advance', M, H - 4);
  };

  const line = { lineColor: [0, 0, 0], textColor: [0, 0, 0], fillColor: [255, 255, 255] };
  // widths add up to 281
  const columnStyles = {
    0: { cellWidth: 17 },
    1: { cellWidth: 17 },
    2: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
    3: { cellWidth: 12, halign: 'right' },
    4: { cellWidth: 16, halign: 'right' },
    5: { cellWidth: 16, halign: 'right' },
    6: { cellWidth: 16, halign: 'right' },
    7: { cellWidth: 16, halign: 'right' },
    8: { cellWidth: 14, halign: 'right' },
    9: { cellWidth: 19, halign: 'right', fontStyle: 'bold' },
    10: { cellWidth: 19, halign: 'right', fontStyle: 'bold' },
    11: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    12: { cellWidth: 'auto' },
  };
  const openingRow = (!challan && from) ? [[{ content: `Opening balance as on ${dmy(from)}`, colSpan: 11, styles: { fontStyle: 'bold', halign: 'right' } }, balText(opening), '']] : [];

  autoTable(doc, {
    startY: 41,
    head: [['Date', 'Voucher', 'Challan', 'Weight', ...CHARGES.map(([, l]) => l), 'Charges (Cr)', 'Paid (Dr)', 'Balance', 'Narration']],
    body: [...openingRow, ...body],
    foot: [['TOTAL', '', '', tot.weight ? String(tot.weight) : '', ...CHARGES.map(([k]) => fmt(tot[k])), fmt0(tot.cr), fmt0(tot.dr), balText(closing), '']],
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { ...line, fontSize: 7.5, cellPadding: 1.1, lineWidth: 0.15, valign: 'middle', overflow: 'linebreak' },
    headStyles: { ...line, fontStyle: 'bold', fontSize: 7.5, halign: 'center', lineWidth: 0.25, fillColor: [235, 235, 235] },
    footStyles: { ...line, fontStyle: 'bold', fontSize: 7.5, lineWidth: 0.25, fillColor: [235, 235, 235] },
    columnStyles,
    rowPageBreak: 'avoid',
    margin: { left: M, right: M, top: 13, bottom: 9 },
    didParseCell: (d) => {
      if (d.section === 'foot' && columnStyles[d.column.index]?.halign) d.cell.styles.halign = columnStyles[d.column.index].halign;
    },
    didDrawPage: (d) => header(d.pageNumber),
  });
  if (!list.length) {
    doc.setFontSize(9);
    doc.text('No entries for this selection.', M, doc.lastAutoTable.finalY + 6);
  }

  // challan-wise summary from the bills
  const bills = (detail?.bills || []).filter((b) => !b.is_void && (!challan || (b.metadata?.challan_no || b.reference_no) === challan)
    && (!from || (b.reference_date || '') >= from) && (!to || (b.reference_date || '') <= to));
  if (bills.length) {
    let y = doc.lastAutoTable.finalY + 7;
    if (y > H - 35) { doc.addPage(); header(doc.getNumberOfPages()); y = 15; }
    const start = doc.getNumberOfPages();
    const st = { w: 0, amt: 0, paid: 0, bal: 0, ...Object.fromEntries(CHARGES.map(([k]) => [k, 0])) };
    const sBody = [...bills].sort((a, b) => String(a.reference_date).localeCompare(String(b.reference_date)) || String(a.reference_no).localeCompare(String(b.reference_no), undefined, { numeric: true }))
      .map((b) => {
        const m = b.metadata || {};
        const paid = n(b.bill_amount) - n(b.balance_amount);
        st.w += n(m.weight); st.amt += n(b.bill_amount); st.paid += paid; st.bal += n(b.balance_amount);
        CHARGES.forEach(([k]) => { st[k] += n(m[k]); });
        return [m.challan_no || b.reference_no || '', dmy(b.reference_date), m.weight ? String(m.weight) : '',
          ...CHARGES.map(([k]) => fmt(m[k])), fmt0(b.bill_amount), fmt(paid), fmt(b.balance_amount), b.is_settled ? 'PAID' : paid > 0 ? 'PART PAID' : 'DUE'];
      });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('CHALLAN-WISE SUMMARY', M, y - 1.5);
    autoTable(doc, {
      startY: y,
      head: [['Challan', 'Date', 'Weight', ...CHARGES.map(([, l]) => l), 'Total charges', 'Paid', 'Balance', 'Status']],
      body: sBody,
      foot: [['TOTAL', '', st.w ? String(st.w) : '', ...CHARGES.map(([k]) => fmt(st[k])), fmt0(st.amt), fmt0(st.paid), fmt0(st.bal), '']],
      showFoot: 'lastPage',
      theme: 'grid',
      styles: { ...line, fontSize: 7.5, cellPadding: 1.1, lineWidth: 0.15, halign: 'right' },
      headStyles: { ...line, fontStyle: 'bold', halign: 'center', lineWidth: 0.25, fillColor: [235, 235, 235] },
      footStyles: { ...line, fontStyle: 'bold', lineWidth: 0.25, fillColor: [235, 235, 235] },
      columnStyles: { 0: { halign: 'center', fontStyle: 'bold', cellWidth: 18 }, 1: { halign: 'center', cellWidth: 20 }, 11: { halign: 'center', cellWidth: 20, fontStyle: 'bold' } },
      tableWidth: 'wrap',
      margin: { left: M, right: M, top: 13, bottom: 9 },
      didDrawPage: () => { const p = doc.getCurrentPageInfo().pageNumber; if (p > start) header(p); },
    });
  }

  let fy = doc.lastAutoTable.finalY + 14;
  if (fy > H - 12) { doc.addPage(); header(doc.getNumberOfPages()); fy = 25; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Labourer signature: ________________', M, fy);
  doc.text('For S. S. TRANSPORT CORPORATION: ________________', W - M, fy, { align: 'right' });
  return doc;
}

/** Preview with challan + date filters, Print and Download. */
export default function LabourLedgerPrintModal({ open, onClose, detail, branchName }) {
  const rows = useMemo(() => prepareLabourRows(detail), [detail]);
  const challans = useMemo(() => {
    const set = new Set(rows.map((r) => r.challan).filter(Boolean));
    return [...set].sort((a, b) => String(b).localeCompare(String(a), undefined, { numeric: true }));
  }, [rows]);
  const [challan, setChallan] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open || !detail) return undefined;
    let u = null;
    try {
      const doc = buildLabourLedgerPdf({ detail, rows, challan, from, to, branchName });
      u = URL.createObjectURL(doc.output('blob'));
      setUrl(u); setErr('');
    } catch (e) { setErr(e.message || 'Could not build PDF'); setUrl(null); }
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [open, detail, rows, challan, from, to, branchName]);

  if (!open) return null;

  const safeName = String(detail?.ledger?.name || 'labour').replace(/[^\w-]+/g, '_');
  const fileName = `Labour_Ledger_${safeName}${challan ? `_Challan_${challan}` : ''}${from ? `_${from}` : ''}${to ? `_to_${to}` : ''}.pdf`;
  const print = () => {
    if (!url) return;
    const f = document.createElement('iframe');
    f.style.display = 'none';
    f.src = url;
    document.body.appendChild(f);
    f.onload = () => { f.contentWindow.print(); setTimeout(() => f.remove(), 60000); };
  };
  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
  };

  const input = 'px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-black focus:ring-2 focus:ring-emerald-500';
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mr-auto">
            <div className="p-1.5 bg-emerald-100 rounded-lg"><Printer className="h-4 w-4 text-emerald-700" /></div>
            <div>
              <h3 className="text-sm font-bold text-black">Labour ledger — {detail?.ledger?.name}</h3>
              <p className="text-[11px] text-gray-500">Charges, payments and narrations · landscape</p>
            </div>
          </div>
          <select value={challan} onChange={(e) => setChallan(e.target.value)} className={input}>
            <option value="">All challans</option>
            {challans.map((c) => <option key={c} value={c}>Challan {c}</option>)}
          </select>
          <label className="text-[11px] text-gray-600">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} />
          <label className="text-[11px] text-gray-600">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} />
          {(challan || from || to) && (
            <button onClick={() => { setChallan(''); setFrom(''); setTo(''); }} className="text-[11px] font-semibold text-gray-600 hover:underline">Clear</button>
          )}
          <button onClick={print} disabled={!url} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-40">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button onClick={download} disabled={!url} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 disabled:opacity-40">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="flex-1 bg-gray-100 rounded-b-2xl overflow-hidden flex items-center justify-center">
          {err ? <p className="text-sm text-red-600">{err}</p>
            : url ? <iframe src={url} title="Labour ledger PDF" className="w-full h-full" />
              : <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />}
        </div>
      </div>
    </div>
  );
}
