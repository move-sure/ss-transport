/**
 * Crossing Challan PDF Generator
 * Generates A4 portrait pages — upper half = Office Copy, lower half = Transport Copy.
 * Bilties are grouped by challan_no with challan header rows on top of each group.
 * No separate challan column — challan number appears as a spanning header row.
 * Station uses city_code (short code) instead of full city name.
 * 
 * Features:
 * - (E) marker on GR numbers that have e-way bill
 * - Transport GSTIN shown in header
 * - SS Transport Kanpur Office number: 8840952946 (prominent)
 * - Challan grouping with header rows
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ROWS_PER_HALF = 24; // max bilty rows per half (excluding challan headers)
const HALF_HEIGHT = 148; // mm — half of A4 portrait height

/**
 * Group bilties by challan_no, preserving order
 */
function groupByChallan(bilties) {
  const groups = {};
  const order = [];
  bilties.forEach(b => {
    const c = b.challan_no || 'Unknown';
    if (!groups[c]) { groups[c] = []; order.push(c); }
    groups[c].push(b);
  });
  return order.map(c => ({ challan: c, bilties: groups[c] }));
}

/**
 * Split grouped bilties into chunks that fit within ROWS_PER_HALF bilty rows.
 * Each chunk is an array of { challan, bilties } groups (may split a challan across chunks).
 * Returns: Array of { groups: [{challan, bilties}], totalBilties: number }
 */
function buildChunks(bilties) {
  const grouped = groupByChallan(bilties);
  const chunks = [];
  let currentGroups = [];
  let currentCount = 0;

  grouped.forEach(g => {
    let remaining = [...g.bilties];
    while (remaining.length > 0) {
      const space = ROWS_PER_HALF - currentCount;
      if (space <= 0) {
        // Push current chunk, start new
        chunks.push({ groups: currentGroups, totalBilties: currentCount });
        currentGroups = [];
        currentCount = 0;
        continue;
      }
      const take = remaining.slice(0, space);
      remaining = remaining.slice(space);
      currentGroups.push({ challan: g.challan, bilties: take });
      currentCount += take.length;
      if (currentCount >= ROWS_PER_HALF && remaining.length > 0) {
        chunks.push({ groups: currentGroups, totalBilties: currentCount });
        currentGroups = [];
        currentCount = 0;
      }
    }
  });
  if (currentGroups.length > 0) {
    chunks.push({ groups: currentGroups, totalBilties: currentCount });
  }
  return chunks;
}

/**
 * @param {Array} bilties  – enriched bilty objects (with destination_code field)
 * @param {Object} transport – selected transport
 * @param {boolean} preview – true → blob URL, false → download
 * @param {string} [pohonchNumber] – optional pohonch/cross challan number to display on PDF
 */
export function generatePohonchPDF(bilties, transport, preview = true, pohonchNumber = '', existingDoc = null, startNewPage = false) {
  const pdf = existingDoc || new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const mx = 5; // 5mm margin each side

  const chunks = buildChunks(bilties);

  // To-Pay PF / Paid Kaat — same definition used on the crossing bill
  const RsRaw = (n) => `Rs.${Math.round(n || 0).toLocaleString('en-IN')}`;
  const isPaidBilty = (b) => b.is_paid || (b.payment_mode || '').toLowerCase() === 'paid';
  const topayPf  = bilties.filter(b => !isPaidBilty(b))
    .reduce((s, b) => s + (b.pf != null ? (b.pf || 0) : Math.max(0, (b.amount || 0) - (b.kaat || 0) - (b.dd || 0))), 0);
  const paidKaat = bilties.filter(isPaidBilty)
    .reduce((s, b) => s + (b.kaat || 0), 0);

  // Column definitions — clean table, no challan column
  const columns = [
    { header: '#',          dataKey: 'sno' },
    { header: 'GR No.',     dataKey: 'gr' },
    { header: 'P/B No.',    dataKey: 'pb' },
    { header: 'Consignor',  dataKey: 'consignor' },
    { header: 'Consignee',  dataKey: 'consignee' },
    { header: 'Station',    dataKey: 'dest' },
    { header: 'Pay',        dataKey: 'pay' },
    { header: 'Pkg',        dataKey: 'pkg' },
    { header: 'Wt',         dataKey: 'wt' },
    { header: 'Amt',        dataKey: 'amt' },
    { header: 'TP-KAAT',    dataKey: 'topayKaat' },
    { header: 'Paid Kaat',   dataKey: 'paidKaat' },
    { header: 'DD',         dataKey: 'dd' },
    { header: 'To-Pay PF',  dataKey: 'pf' },
  ];

  const tableW = pageW - mx * 2; // 200mm usable

  const colWidths = {
    sno: 6, gr: 16, pb: 14, consignor: 24, consignee: 24,
    dest: 14, pay: 17, pkg: 10, wt: 12, amt: 15, topayKaat: 12, paidKaat: 12, dd: 10, pf: 14,
  };

  const tableStyles = {
    fontSize: 7.5,
    cellPadding: { top: 0.8, bottom: 0.8, left: 0.5, right: 0.5 },
    lineWidth: 0.1,
    lineColor: [160, 160, 160],
    overflow: 'hidden',
    valign: 'middle',
  };

  const headStyles = {
    fillColor: [50, 50, 50],
    textColor: [255, 255, 255],
    fontSize: 6.5,
    fontStyle: 'bold',
    halign: 'center',
    cellPadding: { top: 1, bottom: 1, left: 0.4, right: 0.4 },
  };

  const columnStyles = {
    sno:       { halign: 'center', cellWidth: colWidths.sno },
    gr:        { halign: 'left',   cellWidth: colWidths.gr, fontStyle: 'bold' },
    pb:        { halign: 'left',   cellWidth: colWidths.pb },
    consignor: { halign: 'left',   cellWidth: colWidths.consignor },
    consignee: { halign: 'left',   cellWidth: colWidths.consignee },
    dest:      { halign: 'left',   cellWidth: colWidths.dest },
    pay:       { halign: 'center', cellWidth: colWidths.pay },
    pkg:       { halign: 'center', cellWidth: colWidths.pkg },
    wt:        { halign: 'right',  cellWidth: colWidths.wt },
    amt:       { halign: 'right',  cellWidth: colWidths.amt },
    topayKaat: { halign: 'right',  cellWidth: colWidths.topayKaat },
    paidKaat:  { halign: 'right',  cellWidth: colWidths.paidKaat },
    dd:        { halign: 'right',  cellWidth: colWidths.dd },
    pf:        { halign: 'right',  cellWidth: colWidths.pf, fontStyle: 'bold' },
  };

  /**
   * Build clean body rows (NO challan header rows).
   * Returns { body, totalIdx }
   */
  const buildBody = (groups, globalStartIdx) => {
    const body = [];
    let sno = globalStartIdx;

    groups.forEach(g => {
      g.bilties.forEach(b => {
        sno++;
        const grText = String(b.gr_no || '-');
        const hasEwb = !!(b.e_way_bill && b.e_way_bill.trim());
        const ddSuffix = (b.delivery_type || '').toLowerCase().includes('door') ? '/DD' : '';
        const isPaid = isPaidBilty(b);
        const payBase = isPaid ? 'PAID' : (b.payment_mode || '-').toUpperCase().replace('-', ' ');
        body.push({
          sno:       String(sno),
          gr:        hasEwb ? `${grText} (E)` : grText,
          pb:        String(b.pohonch_bilty || '-'),
          consignor: (b.consignor || '-').substring(0, 14),
          consignee: (b.consignee || '-').substring(0, 14),
          dest:      (b.destination_code || b.destination || '-').substring(0, 10),
          pay:       (payBase + ddSuffix).substring(0, 10),
          pkg:       String(Math.round(b.packages || 0)),
          wt:        (b.weight || 0).toFixed(1),
          amt:       isPaid ? 'PAID' : String(Math.round(b.amount || 0)),
          topayKaat: isPaid ? '-' : String(Math.round(b.kaat || 0)),
          paidKaat:  isPaid ? String(Math.round(b.kaat || 0)) : '-',
          dd:        b.dd > 0 ? String(Math.round(b.dd)) : '-',
          pf:        isPaid ? '-' : String(Math.round(b.pf || 0)),
          _hasEwb:   hasEwb,
        });
      });
    });

    // Grand total row
    let tPkg = 0, tWt = 0, tAmt = 0, tTopayKaat = 0, tPaidKaat = 0, tDD = 0, tPF = 0;
    groups.forEach(g => g.bilties.forEach(b => {
      const isPaid = isPaidBilty(b);
      tPkg       += b.packages || 0;
      tWt        += b.weight || 0;
      tAmt       += isPaid ? 0 : (b.amount || 0);
      tTopayKaat += isPaid ? 0 : (b.kaat || 0);
      tPaidKaat  += isPaid ? (b.kaat || 0) : 0;
      tDD        += b.dd || 0;
      tPF        += isPaid ? 0 : (b.pf || 0);
    }));
    const totalIdx = body.length;
    body.push({
      sno: '', gr: '', pb: '', consignor: '', consignee: '',
      dest: '', pay: 'TOTAL',
      pkg:       String(Math.round(tPkg)),
      wt:        tWt.toFixed(1),
      amt:       String(Math.round(tAmt)),
      topayKaat: String(Math.round(tTopayKaat)),
      paidKaat:  String(Math.round(tPaidKaat)),
      dd:        tDD > 0 ? String(Math.round(tDD)) : '-',
      pf:        String(Math.round(tPF)),
    });

    return { body, totalIdx };
  };

  /**
   * Draw one half-page block: header + challan info + table + signature
   */
  const drawHalf = (chunk, yStart, globalStartIdx, copyLabel) => {
    // ── Header Line 1: Company name ──
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text('SS TRANSPORT COMPANY — CROSSING CHALLAN', pageW / 2, yStart + 4.5, { align: 'center' });

    // Office number (left)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Office: 7521078294 / 9690293140', mx, yStart + 4.5);

    // Copy label (right)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(120, 120, 120);
    pdf.text(copyLabel, pageW - mx, yStart + 4.5, { align: 'right' });

    // ── Header Line 2: Transport | GSTIN (left) · Pohonch No (right, prominent) ──
    const tName = transport?.transport_name || '-';
    const gstin = transport?.gst_number || transport?.transport_gstin || '';
    const transportLine = gstin ? `${tName}  |  GSTIN: ${gstin}` : tName;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(transportLine, mx, yStart + 9.5);

    // Pohonch number — bold, dark, right-aligned on line 2
    if (pohonchNumber) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Pohonch No: ${pohonchNumber}`, pageW - mx, yStart + 9.5, { align: 'right' });
    } else if (transport?.mob_number) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(40, 40, 40);
      pdf.text(`Mob: ${transport.mob_number}`, pageW - mx, yStart + 9.5, { align: 'right' });
    }

    // ── Header Line 3: Challan numbers (left) · (E) legend (right) ──
    const challanNos = [...new Set(chunk.groups.map(g => g.challan))];
    const challanText = challanNos.length === 1
      ? `Challan No: ${challanNos[0]}`
      : `Challan Nos: ${challanNos.join(', ')}`;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(challanText, mx, yStart + 13.5);
    const challanTextW = pdf.getTextWidth(challanText);

    // (E) legend — small italic, right after challan text
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(5.5);
    pdf.setTextColor(100, 100, 100);
    pdf.text('(E) = E-Way Bill', mx + challanTextW + 4, yStart + 13.5);

    // To-Pay PF / Paid Kaat summary (right side, bold) — includes mob number if pohonch no. took its slot on line 2
    let summaryText = `To-Pay PF: ${RsRaw(topayPf)}   |   Paid Kaat: ${RsRaw(paidKaat)}`;
    if (pohonchNumber && transport?.mob_number) summaryText += `   |   Mob: ${transport.mob_number}`;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    pdf.text(summaryText, pageW - mx, yStart + 13.5, { align: 'right' });

    // ── Table (clean, no challan rows inside) ──
    const { body, totalIdx } = buildBody(chunk.groups, globalStartIdx);

    autoTable(pdf, {
      columns,
      body,
      startY: yStart + 15.5,
      tableWidth: tableW,
      margin: { left: mx, right: mx },
      styles: tableStyles,
      headStyles,
      columnStyles,
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section !== 'body') return;

        // Total row styling
        if (data.row.index === totalIdx) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [235, 235, 235];
          data.cell.styles.fontSize = 7.5;
        }

        // (E) marker — highlight GR cells green
        if (data.column.dataKey === 'gr' && data.row.index !== totalIdx) {
          const rowData = body[data.row.index];
          if (rowData?._hasEwb) {
            data.cell.styles.textColor = [0, 100, 50];
          }
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
    if (chunkIdx > 0 || startNewPage) pdf.addPage();

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
  if (existingDoc) {
    // Caller owns the document — appended pages only, no output here.
    return null;
  }
  if (preview) {
    const pdfBlob = pdf.output('blob');
    return URL.createObjectURL(pdfBlob);
  } else {
    const tName = (transport?.transport_name || 'Transport').replace(/[^a-zA-Z0-9]/g, '_');
    pdf.save(`CrossingChallan_${tName}_${bilties.length}bilties.pdf`);
    return null;
  }
}

/**
 * Generate ONE combined multi-pohonch PDF — appends each pohonch's
 * Office/Transport copy pages into a single jsPDF document, in order.
 * pohonchList: Array of { bilties, transport, pohonchNumber }
 */
export function generateCombinedPohonchPDF(pohonchList, preview = true) {
  if (!pohonchList || pohonchList.length === 0) return null;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  pohonchList.forEach((entry, idx) => {
    generatePohonchPDF(entry.bilties, entry.transport, true, entry.pohonchNumber, pdf, idx > 0);
  });

  if (preview) {
    const pdfBlob = pdf.output('blob');
    return URL.createObjectURL(pdfBlob);
  } else {
    const tName = (pohonchList[0].transport?.transport_name || 'Transport').replace(/[^a-zA-Z0-9]/g, '_');
    pdf.save(`CrossingChallans_${tName}_${pohonchList.length}pohonch.pdf`);
    return null;
  }
}
