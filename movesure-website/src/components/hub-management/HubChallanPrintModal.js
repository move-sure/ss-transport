'use client';

import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { kTotal } from './HubHelpers';

/*
 * Hub challan print (landscape A4): same columns as the challan page print
 * (GR, consignor / consignee, contents, pkg, weight, to-pay, paid, station, pvt mark)
 * plus each bilty's full kaat: transport (short code), rate, kaat, DD, bilty, labour, other, total kaat, PF,
 * and the crossing proof:  B: <transport bilty no>   C: <cross challan / pohonch no>.
 */

const n = (v) => parseFloat(v) || 0;
const money = (v) => (n(v) ? n(v).toFixed(2) : '');
const amt0 = (v) => (n(v) ? String(Math.round(n(v) * 100) / 100) : '');

// B: = the transport's bilty number is the proof, C: = a crossing challan (pohonch) is the proof
export function proofText(k, pohonchFromMap) {
  const parts = [];
  if (k?.bilty_number) parts.push(`B: ${k.bilty_number}`);
  const c = k?.pohonch_no || pohonchFromMap || k?.crossing_challan_no;
  if (c) parts.push(`C: ${c}`);
  return parts.join('\n');
}

function rateText(k) {
  if (!k) return '';
  if (k.rate_type === 'per_pkg' && n(k.rate_per_pkg)) return `${amt0(k.rate_per_pkg)}/pkg`;
  if (k.rate_type === 'per_kg' && n(k.rate_per_kg)) return `${amt0(k.rate_per_kg)}/kg`;
  if (n(k.rate_per_kg)) return `${amt0(k.rate_per_kg)}/kg`;
  if (n(k.rate_per_pkg)) return `${amt0(k.rate_per_pkg)}/pkg`;
  if (n(k.actual_kaat_rate)) return `${amt0(k.actual_kaat_rate)}`;
  return '';
}

// SS TRANSPORT CORPORATION -> SSTC, VISHWANATH TRANSPORT -> VT, S.S. TRANSPORT CO. -> SSTC
export function transportShort(name) {
  const words = String(name || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  return words.map((w) => (w.length <= 2 && !/[AEIOU]/.test(w) ? w : w[0])).join('');
}

const isPaid = (b) => String(b.payment || '').toLowerCase().startsWith('paid');
const isToPay = (b) => String(b.payment || '').toLowerCase().replace(/[\s_]/g, '-').startsWith('to-pay') || String(b.payment || '').toLowerCase() === 'topay';

// within a transport: station code A-Z, then GR in natural order
const challanSort = (a, b) => {
  const ca = (a.destination_code || a.destination || '').toUpperCase();
  const cb = (b.destination_code || b.destination || '').toUpperCase();
  if (ca !== cb) return ca.localeCompare(cb);
  return (a.gr_no || '').toUpperCase().localeCompare((b.gr_no || '').toUpperCase(), undefined, { numeric: true, sensitivity: 'base' });
};

export function buildHubChallanPdf({ challan, bilties, kaatData = {}, crossChallanMap = {}, transports = [], kanpurGrNos = [], usePrintDate = true, title = 'HUB CHALLAN' }) {
  const knpSet = new Set(kanpurGrNos);
  // Kanpur bilties are delivered by us: no kaat shown, not in kaat totals
  const isKnp = (b) => knpSet.has(b.gr_no) || /kanpur/i.test(b.destination || '');
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 8;
  const tName = Object.fromEntries((transports || []).map((t) => [t.id, t.transport_name]));
  const transportOf = (b) => {
    const k = kaatData[b.gr_no];
    return ((k && tName[k.transport_id]) || b.transport_name || '').toUpperCase().trim();
  };
  // transport name A-Z (bilties without a transport last), then station, then GR
  const rows = [...bilties].sort((a, b) => {
    const ta = transportOf(a);
    const tb = transportOf(b);
    if (ta !== tb) {
      if (!ta) return 1;
      if (!tb) return -1;
      return ta.localeCompare(tb);
    }
    return challanSort(a, b);
  });
  const first = rows[0] || {};
  const dateText = format(usePrintDate || !challan?.date ? new Date() : new Date(challan.date), 'dd-MM-yyyy');

  const addHeader = (pageNum) => {
    doc.setTextColor(0, 0, 0);
    if (pageNum === 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(title, pageWidth / 2, 13, { align: 'center' });
      doc.setFontSize(13);
      doc.text('S. S. TRANSPORT CORPORATION', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(11);
      doc.text(`Challan No: ${challan?.challan_no || ''}`, pageWidth - margin, 13, { align: 'right' });
      doc.setFontSize(9);
      doc.text(`Date: ${dateText}`, pageWidth - margin, 19, { align: 'right' });
      if (challan?.dispatch_date) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Dispatched: ${format(new Date(challan.dispatch_date), 'dd-MM-yyyy')}`, pageWidth - margin, 24, { align: 'right' });
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('TRANSPORT DETAILS:', margin, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      let y = 17;
      if (challan?.truck?.truck_number) { doc.text(`Truck No: ${challan.truck.truck_number}`, margin, y); y += 4.5; }
      if (challan?.driver?.name) { doc.text(`Driver: ${challan.driver.name}${challan.driver.mobile_number ? ` (${challan.driver.mobile_number})` : ''}`, margin, y); y += 4.5; }
      if (challan?.owner?.name) { doc.text(`Owner: ${challan.owner.name}`, margin, y); y += 4.5; }

      doc.setLineWidth(0.4);
      doc.line(margin, 32, pageWidth - margin, 32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`From: ${first.from_branch_name || challan?.branch_name || '-'}`, margin, 38);
      doc.text(`To: ${first.to_branch_name || '-'}`, pageWidth / 2, 38, { align: 'center' });
      doc.text(`Bilties: ${rows.length}`, pageWidth - margin, 38, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${title} (Continued)`, pageWidth / 2, 9, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Challan No: ${challan?.challan_no || ''}`, pageWidth - margin, 9, { align: 'right' });
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
    doc.text('Proof  B: transport bilty no   C: crossing challan no', margin, pageHeight - 4);
  };

  const tot = { pkg: 0, wt: 0, toPay: 0, paid: 0, kaat: 0, dd: 0, bilty: 0, lab: 0, oth: 0, total: 0, pf: 0 };
  const cnt = { toPay: 0, toPayPkg: 0, paid: 0, paidPkg: 0, paidZero: 0, paidZeroPkg: 0, knp: 0, knpPkg: 0, knpWt: 0 };
  const byTransport = {};

  const body = rows.map((b, i) => {
    const knp = isKnp(b);
    const k = knp ? null : kaatData[b.gr_no];
    const transport = ((knp ? kaatData[b.gr_no] : k) && tName[(knp ? kaatData[b.gr_no] : k).transport_id]) || b.transport_name || '';
    const kt = kTotal(k);
    const pkg = n(b.packets);
    tot.pkg += pkg;
    tot.wt += n(b.weight);
    if (isToPay(b)) { tot.toPay += n(b.amount); cnt.toPay += 1; cnt.toPayPkg += pkg; }
    if (isPaid(b)) {
      tot.paid += n(b.amount); cnt.paid += 1; cnt.paidPkg += pkg;
      if (!n(b.amount)) { cnt.paidZero += 1; cnt.paidZeroPkg += pkg; }
    }
    if (knp) { cnt.knp += 1; cnt.knpPkg += pkg; cnt.knpWt += n(b.weight); }
    if (k) {
      tot.kaat += n(k.kaat); tot.dd += n(k.dd_chrg); tot.bilty += n(k.bilty_chrg);
      tot.lab += n(k.labour_chrg); tot.oth += n(k.other_chrg); tot.total += kt; tot.pf += n(k.pf);
    }
    const tk = transport || 'NOT ASSIGNED';
    if (!knp) byTransport[tk] = byTransport[tk] || { bilties: 0, pkg: 0, wt: 0, kaat: 0, pf: 0 };
    if (!knp) Object.assign(byTransport[tk], {
      bilties: byTransport[tk].bilties + 1, pkg: byTransport[tk].pkg + pkg, wt: byTransport[tk].wt + n(b.weight),
      kaat: byTransport[tk].kaat + kt, pf: byTransport[tk].pf + n(k?.pf),
    });

    return [
      String(i + 1),
      (b.gr_no || '').toUpperCase(),
      `${(b.consignor || '').toUpperCase()}\n${(b.consignee || '').toUpperCase()}`,
      (b.contain && b.contain !== '-' ? b.contain : '').toUpperCase(),
      String(pkg || 0),
      String(Math.round(n(b.weight))),
      isToPay(b) ? money(b.amount) : '',
      isPaid(b) ? money(b.amount) : '',
      (b.destination_code || b.destination || '').toUpperCase(),
      b.pvt_marks ? `${String(b.pvt_marks).toUpperCase()}/${pkg || 0}` : `/${pkg || 0}`,
      transportShort(transport),
      rateText(k),
      amt0(k?.kaat),
      amt0(k?.dd_chrg),
      amt0(k?.bilty_chrg),
      amt0(k?.labour_chrg),
      amt0(k?.other_chrg),
      kt ? amt0(kt) : '',
      k && k.pf != null ? amt0(k.pf) : '',
      knp ? 'KANPUR' : proofText(k, crossChallanMap[b.gr_no]),
    ];
  });

  // widths add up to 281 (297 - 2 x 8)
  const columnStyles = {
    0: { halign: 'center', cellWidth: 7 },
    1: { halign: 'center', cellWidth: 15, fontStyle: 'bold', fontSize: 8 },
    2: { cellWidth: 51, fontSize: 6 },
    3: { cellWidth: 14, fontSize: 6 },
    4: { halign: 'center', cellWidth: 8 },
    5: { halign: 'center', cellWidth: 10 },
    6: { halign: 'right', cellWidth: 13 },
    7: { halign: 'right', cellWidth: 13 },
    8: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
    9: { cellWidth: 18, fontSize: 6 },
    10: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
    11: { halign: 'center', cellWidth: 12, fontSize: 6 },
    12: { halign: 'right', cellWidth: 12 },
    13: { halign: 'right', cellWidth: 9 },
    14: { halign: 'right', cellWidth: 9 },
    15: { halign: 'right', cellWidth: 9 },
    16: { halign: 'right', cellWidth: 9 },
    17: { halign: 'right', cellWidth: 12, fontStyle: 'bold' },
    18: { halign: 'right', cellWidth: 12, fontStyle: 'bold' },
    19: { cellWidth: 24, fontSize: 6.5, fontStyle: 'bold' },
  };

  const line = { lineColor: [0, 0, 0], textColor: [0, 0, 0], fillColor: [255, 255, 255] };
  autoTable(doc, {
    startY: 42,
    head: [['#', 'G.R. No.', 'Consignor / Consignee', 'Cont.', 'Pkg', 'Wt', 'To-Pay', 'Paid', 'Stn', 'Pvt.M',
      'Transport', 'Rate', 'Kaat', 'DD', 'Bilty', 'Lab', 'Oth', 'Tot Kaat', 'PF', 'Proof']],
    body,
    foot: [['', '', 'TOTAL', '', String(tot.pkg), String(Math.round(tot.wt)), tot.toPay.toFixed(2), tot.paid.toFixed(2), '', '',
      '', '', amt0(tot.kaat), amt0(tot.dd), amt0(tot.bilty), amt0(tot.lab), amt0(tot.oth),
      amt0(tot.total), amt0(tot.pf), '']],
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { ...line, fontSize: 6.5, cellPadding: 0.8, lineWidth: 0.15, valign: 'middle', overflow: 'linebreak' },
    headStyles: { ...line, fontSize: 6.5, fontStyle: 'bold', halign: 'center', lineWidth: 0.25 },
    footStyles: { ...line, fontSize: 6.5, fontStyle: 'bold', lineWidth: 0.25 },
    columnStyles,
    rowPageBreak: 'avoid',
    margin: { left: margin, right: margin, top: 13, bottom: 9 },
    didParseCell: (d) => {
      if (d.section === 'foot' && columnStyles[d.column.index]?.halign) d.cell.styles.halign = columnStyles[d.column.index].halign;
    },
    didDrawPage: (d) => addHeader(d.pageNumber),
  });

  // transport-wise kaat summary
  const tRows = Object.entries(byTransport).sort((a, b) => a[0].localeCompare(b[0]));
  let y = doc.lastAutoTable.finalY + 6;
  if (y > pageHeight - 40) { doc.addPage(); addHeader(doc.getNumberOfPages()); y = 16; }
  const summaryStartPage = doc.getNumberOfPages();
  autoTable(doc, {
    startY: y,
    head: [['Bilty summary', 'Bilties', 'Nags', 'Amount']],
    body: [
      ['Total bilties', String(rows.length), String(tot.pkg), (tot.toPay + tot.paid).toFixed(2)],
      ['To-Pay bilties', String(cnt.toPay), String(cnt.toPayPkg), tot.toPay.toFixed(2)],
      ['Paid bilties', String(cnt.paid), String(cnt.paidPkg), tot.paid.toFixed(2)],
      ['Paid bilties with no amount', String(cnt.paidZero), String(cnt.paidZeroPkg), '0.00'],
      ['Kanpur bilties (no kaat)', String(cnt.knp), String(cnt.knpPkg), ''],
    ],
    theme: 'grid',
    styles: { ...line, fontSize: 7.5, cellPadding: 1.2, lineWidth: 0.15 },
    headStyles: { ...line, fontStyle: 'bold', lineWidth: 0.25 },
    columnStyles: { 0: { cellWidth: 48, fontStyle: 'bold' }, 1: { halign: 'center', cellWidth: 16 }, 2: { halign: 'center', cellWidth: 16 }, 3: { halign: 'right', cellWidth: 22 } },
    tableWidth: 'wrap',
    margin: { left: pageWidth - margin - 102, right: margin, top: 13, bottom: 9 },
  });
  const billSumEnd = { page: doc.getCurrentPageInfo().pageNumber, y: doc.lastAutoTable.finalY };
  doc.setPage(summaryStartPage);

  autoTable(doc, {
    startY: y,
    head: [['Transport (Kanpur not incl.)', 'Bilties', 'Nags', 'Weight', 'Total Kaat', 'PF']],
    body: tRows.map(([t, v]) => [t === 'NOT ASSIGNED' ? t : `${transportShort(t)} - ${t.toUpperCase()}`, String(v.bilties), String(v.pkg), String(Math.round(v.wt)), amt0(v.kaat), amt0(v.pf)]),
    theme: 'grid',
    styles: { ...line, fontSize: 7, cellPadding: 1, lineWidth: 0.15 },
    headStyles: { ...line, fontStyle: 'bold', lineWidth: 0.25 },
    columnStyles: { 0: { cellWidth: 72 }, 1: { halign: 'center', cellWidth: 14 }, 2: { halign: 'center', cellWidth: 14 }, 3: { halign: 'center', cellWidth: 16 }, 4: { halign: 'right', cellWidth: 20 }, 5: { halign: 'right', cellWidth: 20 } },
    tableWidth: 'wrap',
    margin: { left: margin, right: margin, top: 13, bottom: 9 },
    didDrawPage: () => {
      const p = doc.getCurrentPageInfo().pageNumber;
      if (p > summaryStartPage) addHeader(p);
    },
  });

  let endY = doc.lastAutoTable.finalY;
  if (doc.getCurrentPageInfo().pageNumber === billSumEnd.page) endY = Math.max(endY, billSumEnd.y);
  if (endY + 18 > pageHeight - 8) { doc.addPage(); addHeader(doc.getNumberOfPages()); endY = 14; }
  const fy = endY + 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('For S. S. TRANSPORT CORPORATION', pageWidth - margin - 75, fy);
  doc.text('Authorized Signatory: ________________', pageWidth - margin - 75, fy + 6);
  return doc;
}

/** Preview + print/download. `sets` = { all, filtered, selected } bilty arrays from the hub page. */
export default function HubChallanPrintModal({ open, onClose, challan, sets, kaatData, crossChallanMap, transports, kanpurGrNos }) {
  const [scope, setScope] = useState('all');
  const [usePrintDate, setUsePrintDate] = useState(() => {
    try { return localStorage.getItem('hubChallan.usePrintDate') !== 'false'; } catch { return true; }
  });
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const bilties = useMemo(() => sets?.[scope] || [], [sets, scope]);
  const fileName = `Hub_Challan_${challan?.challan_no || ''}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;

  useEffect(() => {
    if (!open) return undefined;
    let u = null;
    setBusy(true); setErr('');
    try {
      const doc = buildHubChallanPdf({ challan, bilties, kaatData, crossChallanMap, transports, kanpurGrNos: [...(kanpurGrNos || [])], usePrintDate });
      u = URL.createObjectURL(doc.output('blob'));
      setUrl(u);
    } catch (e) { setErr(e.message || 'Could not build PDF'); setUrl(null); }
    setBusy(false);
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [open, challan, bilties, kaatData, crossChallanMap, transports, kanpurGrNos, usePrintDate]);

  if (!open) return null;

  const print = () => {
    if (!url) return;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => { iframe.contentWindow.print(); setTimeout(() => iframe.remove(), 60000); };
  };
  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
  };
  const toggleDate = () => setUsePrintDate((v) => {
    try { localStorage.setItem('hubChallan.usePrintDate', String(!v)); } catch { /* ignore */ }
    return !v;
  });

  const scopes = [
    ['all', `All (${sets?.all?.length || 0})`],
    ['filtered', `Shown (${sets?.filtered?.length || 0})`],
    ['selected', `Selected (${sets?.selected?.length || 0})`],
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg"><Printer className="h-4 w-4 text-indigo-600" /></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Hub challan print — {challan?.challan_no}</h3>
              <p className="text-[11px] text-gray-500">With kaat details and crossing proof (B: bilty no, C: crossing challan)</p>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto bg-gray-100 rounded-lg p-0.5">
            {scopes.map(([k, label]) => (
              <button key={k} onClick={() => setScope(k)} disabled={!sets?.[k]?.length}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold disabled:opacity-40 ${scope === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
            <input type="checkbox" checked={usePrintDate} onChange={toggleDate} className="w-3.5 h-3.5 accent-indigo-600" />
            Print today&apos;s date {!usePrintDate && challan?.date ? `(using ${format(new Date(challan.date), 'dd/MM/yyyy')})` : ''}
          </label>
          <button onClick={print} disabled={!url} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-40">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button onClick={download} disabled={!url} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 disabled:opacity-40">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="flex-1 bg-gray-100 rounded-b-2xl overflow-hidden flex items-center justify-center">
          {busy && <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />}
          {err && <p className="text-sm text-red-600">{err}</p>}
          {!busy && !err && url && <iframe src={url} title="Hub challan PDF" className="w-full h-full" />}
          {!busy && !err && !bilties.length && <p className="text-sm text-gray-500">No bilties to print.</p>}
        </div>
      </div>
    </div>
  );
}
