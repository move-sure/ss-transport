/**
 * Pohonch PDF Generator
 * Generates A4 landscape pages — each GR is ONE row in a table.
 * 20 GRs in upper half, same 20 GRs duplicated in lower half (Office / Transport copy).
 * All selected GRs in a single PDF.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ROWS_PER_HALF = 20;
const HALF_HEIGHT = 148; // mm — half of A4 portrait height

/**
 * @param {Array} bilties  – enriched bilty objects
 * @param {Object} transport – selected transport
 * @param {boolean} preview – true → blob URL, false → download
 */
export function generatePohonchPDF(bilties, transport, preview = true) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;

  const mx = 5; // 5mm margin each side — full page width

  // Split bilties into chunks of 20
  const chunks = [];
  for (let i = 0; i < bilties.length; i += ROWS_PER_HALF) {
    chunks.push(bilties.slice(i, i + ROWS_PER_HALF));
  }

  // Column definitions for autoTable
  const columns = [
    { header: '#',          dataKey: 'sno' },
    { header: 'C.NO',       dataKey: 'challan' },
    { header: 'GR No.',     dataKey: 'gr' },
    { header: 'P/B No.',    dataKey: 'pb' },
    { header: 'Consignor',  dataKey: 'consignor' },
    { header: 'Consignee',  dataKey: 'consignee' },
    { header: 'Station',    dataKey: 'dest' },
    { header: 'Pay',        dataKey: 'pay' },
    { header: 'Pkg',        dataKey: 'pkg' },
    { header: 'Wt',         dataKey: 'wt' },
    { header: 'Amt',        dataKey: 'amt' },
    { header: 'Kaat',       dataKey: 'kaat' },
    { header: 'DD',         dataKey: 'dd' },
    { header: 'PF',         dataKey: 'pf' },
  ];

  // Build row data from bilty object
  const buildRows = (chunk, startIdx) =>
    chunk.map((b, i) => ({
      sno:       String(startIdx + i + 1),
      challan:   String(b.challan_no || '-'),
      gr:        String(b.gr_no || '-'),
      pb:        String(b.pohonch_bilty || '-'),
      consignor: (b.consignor || '-').substring(0, 14),
      consignee: (b.consignee || '-').substring(0, 14),
      dest:      (b.destination || '-').substring(0, 9),
      pay:       b.is_paid ? 'PAID' : (b.payment_mode || '-').toUpperCase().substring(0, 6),
      pkg:       String(Math.round(b.packages || 0)),
      wt:        (b.weight || 0).toFixed(1),
      amt:       b.is_paid ? 'PAID' : String(Math.round(b.amount || 0)),
      kaat:      String(Math.round(b.kaat || 0)),
      dd:        b.dd > 0 ? String(Math.round(b.dd)) : '-',
      pf:        String(Math.round(b.pf || 0)),
    }));

  // Compute totals for a chunk
  const buildTotals = (chunk) => {
    let tPkg = 0, tWt = 0, tAmt = 0, tKaat = 0, tDD = 0, tPF = 0;
    chunk.forEach(b => {
      tPkg  += b.packages || 0;
      tWt   += b.weight || 0;
      tAmt  += b.is_paid ? 0 : (b.amount || 0);
      tKaat += b.kaat || 0;
      tDD   += b.dd || 0;
      tPF   += b.pf || 0;
    });
    return {
      sno: '', challan: '', gr: '', pb: '', consignor: '', consignee: '',
      dest: '', pay: 'TOTAL',
      pkg:  String(Math.round(tPkg)),
      wt:   tWt.toFixed(1),
      amt:  String(Math.round(tAmt)),
      kaat: String(Math.round(tKaat)),
      dd:   tDD > 0 ? String(Math.round(tDD)) : '-',
      pf:   String(Math.round(tPF)),
    };
  };

  const tableW = pageW - mx * 2; // 200mm usable

  // Column widths (mm) — sum = 200 to fill full width
  const colWidths = {
    sno: 5, challan: 10, gr: 11, pb: 14, consignor: 30, consignee: 30,
    dest: 18, pay: 14, pkg: 8, wt: 12, amt: 15, kaat: 12, dd: 8, pf: 12,
  };

  // Style config for autoTable
  const tableStyles = {
    fontSize: 8,
    cellPadding: { top: 0.8, bottom: 0.8, left: 0.6, right: 0.6 },
    lineWidth: 0.1,
    lineColor: [160, 160, 160],
    overflow: 'hidden',
    valign: 'middle',
  };

  const headStyles = {
    fillColor: [50, 50, 50],
    textColor: [255, 255, 255],
    fontSize: 7,
    fontStyle: 'bold',
    halign: 'center',
    cellPadding: { top: 1, bottom: 1, left: 0.4, right: 0.4 },
  };

  const columnStyles = {
    sno:       { halign: 'center', cellWidth: colWidths.sno },
    challan:   { halign: 'center', cellWidth: colWidths.challan },
    gr:        { halign: 'left',   cellWidth: colWidths.gr, fontStyle: 'bold' },
    pb:        { halign: 'left',   cellWidth: colWidths.pb },
    consignor: { halign: 'left',   cellWidth: colWidths.consignor },
    consignee: { halign: 'left',   cellWidth: colWidths.consignee },
    dest:      { halign: 'left',   cellWidth: colWidths.dest },
    pay:       { halign: 'center', cellWidth: colWidths.pay },
    pkg:       { halign: 'center', cellWidth: colWidths.pkg },
    wt:        { halign: 'right',  cellWidth: colWidths.wt },
    amt:       { halign: 'right',  cellWidth: colWidths.amt },
    kaat:      { halign: 'right',  cellWidth: colWidths.kaat },
    dd:        { halign: 'right',  cellWidth: colWidths.dd },
    pf:        { halign: 'right',  cellWidth: colWidths.pf, fontStyle: 'bold' },
  };

  /**
   * Draw one half-page block: header + table + totals + signature
   */
  const drawHalf = (chunk, yStart, globalStartIdx, copyLabel) => {
    // ── Header ──
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text('SS TRANSPORT COMPANY — POHONCH', pageW / 2, yStart + 5, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text(copyLabel, pageW - mx, yStart + 5, { align: 'right' });

    // Transport line
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Transport: ${transport?.transport_name || '-'}`, mx, yStart + 10);
    if (transport?.gst_number) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(`GST: ${transport.gst_number}`, mx + 85, yStart + 10);
    }
    if (transport?.mob_number) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(`Mob: ${transport.mob_number}`, mx + 150, yStart + 10);
    }

    // ── Table ──
    const rows = buildRows(chunk, globalStartIdx);
    const totals = buildTotals(chunk);
    const bodyWithTotals = [...rows, totals];

    autoTable(pdf, {
      columns,
      body: bodyWithTotals,
      startY: yStart + 12.5,
      tableWidth: tableW,
      margin: { left: mx, right: mx },
      styles: tableStyles,
      headStyles,
      columnStyles,
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === bodyWithTotals.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [235, 235, 235];
          data.cell.styles.fontSize = 8;
        }
      },
    });

    // ── Signature section ──
    const sigY = yStart + HALF_HEIGHT - 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(80, 80, 80);
    pdf.text('Receiver Sign: ____________________', mx, sigY);
    pdf.text('Date: ______________', mx + 75, sigY);
    pdf.text('Auth. Sign: ____________________', pageW - mx, sigY, { align: 'right' });
  };

  // ── Generate pages ──
  chunks.forEach((chunk, chunkIdx) => {
    if (chunkIdx > 0) pdf.addPage();

    const globalStartIdx = chunkIdx * ROWS_PER_HALF;

    // Upper half — Office Copy
    drawHalf(chunk, 0, globalStartIdx, 'OFFICE COPY');

    // Dashed separator at page midpoint
    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(0.3);
    pdf.setLineDashPattern([3, 2], 0);
    pdf.line(5, HALF_HEIGHT, pageW - 5, HALF_HEIGHT);
    pdf.setLineDashPattern([], 0);

    // Lower half — Transport Copy (identical data)
    drawHalf(chunk, HALF_HEIGHT, globalStartIdx, 'TRANSPORT COPY');
  });

  // ── Output ──
  if (preview) {
    const pdfBlob = pdf.output('blob');
    return URL.createObjectURL(pdfBlob);
  } else {
    const tName = (transport?.transport_name || 'Transport').replace(/[^a-zA-Z0-9]/g, '_');
    pdf.save(`Pohonch_${tName}_${bilties.length}bilties.pdf`);
    return null;
  }
}
