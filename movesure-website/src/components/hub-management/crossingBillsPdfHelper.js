import { fmtN } from './transportReportUtils';

/**
 * Generates the Crossing Bills PDF and sets the blob URL.
 *
 * Columns: GR No | Pohonch Number | Bilty Date | Pkgs | Wt | DD | To-Pay (PF) | Paid (KAAT)
 *
 * To-Pay (PF)  = kaat_pf = total − (dd + kaat)   — shown only for to-pay bilties
 * Paid (KAAT)  = dd + kaat                        — shown only for paid/foc bilties
 * Net PF (grand total) = Σ To-Pay PF − Σ Paid KAAT
 */
export async function generateCrossingBillsPDF({
  result,
  selectedTransport,
  fromDate,
  toDate,
  billDate,
  pohonchGroups,
  noPohonchGroup,
  excludedGroups,
  excludedBilties,
  printFormat = 'pohonch',
  setShowModal,
  setPdfLoading,
  setPdfBlobUrl,
}) {
  setShowModal(false);
  setPdfLoading(true);

  try {
    const { jsPDF }              = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc     = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW   = doc.internal.pageSize.getWidth();   // 297mm landscape
    const marginX = 3;

    const transportName = result?.transport_name  || selectedTransport?.transport_name || '';
    const transportGst  = result?.transport_gstin || selectedTransport?.gst_number     || '';
    const dateRange     = `${fromDate}  to  ${toDate}`;
    const billDateFmt   = billDate
      ? new Date(billDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';

    const NUM_COLS = 8;

    // ── Column widths (sum = 22+50+26+14+22+22+65+70 = 291mm = 297−3−3) ─────
    const colStyles = {
      0: { cellWidth: 22, fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },                   // GR No
      1: { cellWidth: 50, fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 8 },                   // Pohonch Number
      2: { cellWidth: 26,                    textColor: [0, 0, 0], fontSize: 7.5 },                 // Bilty Date
      3: { cellWidth: 14, halign: 'center',  fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 8 },// Pkgs
      4: { cellWidth: 22, halign: 'right',   fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 8 },// Wt
      5: { cellWidth: 22, halign: 'right',   fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 8 },// DD
      6: { cellWidth: 65, halign: 'right',   fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },// To-Pay (PF)
      7: { cellWidth: 70, halign: 'right',   fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },// Paid (KAAT)
    };

    // ── Date formatter ────────────────────────────────────────────────────────
    const fmtDate = (d) => d
      ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
      : '—';

    // ── Row builder ───────────────────────────────────────────────────────────
    // To-Pay (PF): kaat_pf only for to-pay bilties
    // Paid (KAAT): dd + kaat only for paid/foc bilties
    const mapRow = (b) => {
      const dd      = Number(b.kaat_dd) || 0;
      const kaat    = Number(b.kaat)    || 0;
      const isPaid  = b.payment_mode === 'paid' || b.payment_mode === 'foc';
      const pfVal   = !isPaid ? fmtN(Number(b.kaat_pf) || 0) : '';
      const kaatVal = isPaid  ? fmtN(dd + kaat)              : '';
      return [
        b.gr_no || '',
        b.dest_pohonch_no || b.bilty_number || 'Not Provided Yet',
        fmtDate(b.bilty_date),
        b.no_of_pkg != null ? String(b.no_of_pkg) : '',
        b.wt        != null ? String(b.wt)        : '',
        dd !== 0 ? fmtN(dd) : '',
        pfVal,
        kaatVal,
      ];
    };

    // ── Aggregate totals helper ───────────────────────────────────────────────
    const calcTotals = (bilties) => ({
      pf:   bilties
              .filter(b => b.payment_mode === 'to-pay')
              .reduce((s, b) => s + (Number(b.kaat_pf) || 0), 0),
      kaat: bilties
              .filter(b => b.payment_mode === 'paid' || b.payment_mode === 'foc')
              .reduce((s, b) => s + (Number(b.kaat_dd) || 0) + (Number(b.kaat) || 0), 0),
      pkgs: bilties.reduce((s, b) => s + (b.no_of_pkg ?? 0), 0),
      wt:   bilties.reduce((s, b) => s + (Number(b.wt)      || 0), 0),
      dd:   bilties.reduce((s, b) => s + (Number(b.kaat_dd) || 0), 0),
    });

    // ── Shared styles ─────────────────────────────────────────────────────────
    const secStyle = {
      fillColor: [60, 60, 60], fontStyle: 'bold', halign: 'left',
      fontSize: 10, textColor: [255, 255, 255],
      cellPadding: { top: 3, bottom: 3, left: 4, right: 2 },
    };
    const subStyle = {
      fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0],
      fontSize: 7, halign: 'right', cellPadding: 1.2,
    };
    const spaceStyle = {
      fillColor: [215, 215, 215],
      cellPadding: { top: 0.5, bottom: 0.5, left: 0, right: 0 }, lineWidth: 0,
    };

    // ── Page header / footer ──────────────────────────────────────────────────
    const drawPageHeader = (data) => {
      if (data.pageNumber === 1) {
        doc.setFontSize(16); doc.setFont('helvetica', 'bold');
        doc.text('SS TRANSPORT', pageW / 2, 10, { align: 'center' });
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
        doc.text(
          `Transport: ${transportName}   |   GSTIN: ${transportGst}   |   Period: ${dateRange}   |   Bill Date: ${billDateFmt}`,
          pageW / 2, 16, { align: 'center' }
        );
        doc.setLineWidth(0.3); doc.setDrawColor(150, 150, 150);
        doc.line(0, 19, pageW, 19);
      }
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text(
        `Page ${data.pageNumber} / {pTotal}`,
        pageW - marginX, doc.internal.pageSize.getHeight() - 3, { align: 'right' }
      );
      doc.setTextColor(0, 0, 0);
    };

    // ── Signature + Notice ────────────────────────────────────────────────────
    const drawSignatureAndNotice = (baseY) => {
      const sigLineY = baseY + 32;
      const leftX    = marginX + 15;
      const rightX   = pageW / 2 + 15;
      const lineW    = pageW / 2 - 30;

      doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.5);
      doc.line(leftX,  sigLineY, leftX  + lineW, sigLineY);
      doc.line(rightX, sigLineY, rightX + lineW, sigLineY);

      doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('Authorized Signatory', leftX  + lineW / 2, sigLineY + 4, { align: 'center' });
      doc.text('Authorized Signatory', rightX + lineW / 2, sigLineY + 4, { align: 'center' });
      doc.setFontSize(9);
      doc.text('SS TRANSPORT',               leftX  + lineW / 2, sigLineY + 9, { align: 'center' });
      doc.text(transportName || 'Transport', rightX + lineW / 2, sigLineY + 9, { align: 'center' });
      if (transportGst) {
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.text(transportGst, rightX + lineW / 2, sigLineY + 13, { align: 'center' });
      }

      const noticeY = sigLineY + 22;
      doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.2);
      doc.line(marginX, noticeY - 3, pageW - marginX, noticeY - 3);
      doc.setFontSize(11); doc.setFont('helvetica', 'bolditalic'); doc.setTextColor(40, 40, 40);
      doc.text(
        'NOTICE: All pending Pohonch/POD copies against the attached Bilties must be submitted within 2 days from the date of bill receipt. Any discrepancy or non-delivery claim raised thereafter shall be treated as the responsibility of the receiving transport company.',
        pageW / 2, noticeY + 1, { align: 'center', maxWidth: pageW - marginX * 2 }
      );
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9.5);
      doc.text(
        'Notice: Attached bilties ki pending pahunch/POD copies bill milne ke 2 din ke andar jama karein. Baad mein kisi bhi kami ya maal na milne ki zimmedari sambandhi transport company ki mani jayegi.',
        pageW / 2, noticeY + 14, { align: 'center', maxWidth: pageW - marginX * 2 }
      );
      doc.setTextColor(0, 0, 0);
    };

    // ── Grand Total + Net PF table ────────────────────────────────────────────
    const drawTotalsTable = (bilties) => {
      const { pf, kaat, pkgs, wt, dd } = calcTotals(bilties);
      const netPf = pf - kaat;

      // Grand-total row: each cell aligns exactly with its column above
      const totStyle = {
        fillColor: [30, 30, 30], textColor: [255, 255, 255],
        fontStyle: 'bold', fontSize: 11, halign: 'right', cellPadding: 2.5, overflow: 'visible',
      };
      const labelStyle = { ...totStyle, halign: 'left', fontSize: 9 };

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY,
        margin: { left: marginX, right: marginX, top: 5 },
        body: [
          // Row 1 — one cell per column so values sit directly under headers
          [
            { content: `GRAND TOTAL`,           styles: { ...labelStyle, fontSize: 8 } },
            { content: `(${bilties.length} bilties)`, styles: { ...labelStyle, halign: 'center', fontSize: 8 } },
            { content: '',                       styles: { ...totStyle, halign: 'center' } },
            { content: String(pkgs),             styles: { ...totStyle, halign: 'center', fontSize: 12 } },
            { content: fmtN(wt),                 styles: { ...totStyle, fontSize: 12 } },
            { content: fmtN(dd),                 styles: { ...totStyle, fontSize: 12 } },
            { content: fmtN(pf),                 styles: { ...totStyle, fontSize: 13 } },
            { content: fmtN(kaat),               styles: { ...totStyle, fontSize: 13 } },
          ],
          // Row 2 — Net PF: formula on left, note on right corner
          [
            {
              content: `TOTAL  =  Rs. ${fmtN(netPf)}`,
              colSpan: 6,
              styles: {
                fillColor: [20, 20, 20], textColor: [255, 255, 255],
                fontStyle: 'bold', fontSize: 13, halign: 'center', cellPadding: 4, overflow: 'visible',
              },
            },
            {
              content: `TOTAL = PF - PAID\nPF Includes DD Chrg.`,
              colSpan: 2,
              styles: {
                fillColor: [20, 20, 20], textColor: [180, 180, 180],
                fontStyle: 'bold', fontSize: 7.5, halign: 'right', cellPadding: { top: 2, bottom: 2, left: 2, right: 3 }, overflow: 'visible',
              },
            },
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: [80, 80, 80], lineWidth: 0.2, overflow: 'visible' },
        columnStyles: colStyles,
      });
    };

    // ═══════════════════════════════════════════════════════════════════════
    // ── BILTY FORMAT (flat list, sorted by Pohonch / Bilty Number) ────────
    // ═══════════════════════════════════════════════════════════════════════
    if (printFormat === 'bilty') {
      const allBilties = [
        ...pohonchGroups.flatMap(g => g.bilties),
        ...(noPohonchGroup?.bilties || []),
      ].sort((a, b) => {
        const da = a.dest_pohonch_no || a.bilty_number || '';
        const db = b.dest_pohonch_no || b.bilty_number || '';
        if (da === '' && db !== '') return 1;
        if (da !== '' && db === '') return -1;
        const na = parseInt(da, 10), nb = parseInt(db, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return da.localeCompare(db);
      });

      if (allBilties.length === 0) { setPdfLoading(false); return; }

      autoTable(doc, {
        startY: 22,
        margin: { top: 4, left: marginX, right: marginX },
        head:   [['GR No', 'Pohonch Number', 'Bilty Date', 'Pkgs', 'Wt', 'DD', 'To-Pay (PF)', 'Paid (KAAT)']],
        body:   allBilties.map(mapRow),
        theme:  'grid',
        styles: { fontSize: 6, cellPadding: 1, textColor: [0, 0, 0], lineColor: [160, 160, 160], lineWidth: 0.1, overflow: 'linebreak' },
        headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5, cellPadding: 2.5 },
        columnStyles: colStyles,
        didDrawPage: (data) => drawPageHeader(data),
      });

      drawTotalsTable(allBilties);

      const bPageH  = doc.internal.pageSize.getHeight();
      const bFinalY = doc.lastAutoTable.finalY;
      const bBaseY  = (bFinalY + 90 > bPageH) ? (doc.addPage(), 15) : bFinalY;
      drawSignatureAndNotice(bBaseY);

      doc.putTotalPages('{pTotal}');
      setPdfBlobUrl(URL.createObjectURL(doc.output('blob')));
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ── POHONCH FORMAT (grouped by Pohonch Number) ────────────────────────
    // ═══════════════════════════════════════════════════════════════════════
    const inclPohonch   = pohonchGroups.filter(g => !excludedGroups.has(g.key));
    const inclNoPohonch = (noPohonchGroup?.bilties || []).filter(b => !excludedBilties.has(b.gr_no));

    if (inclPohonch.length === 0 && inclNoPohonch.length === 0) { setPdfLoading(false); return; }

    const body = [];

    for (const grp of inclPohonch) {
      // Section header
      body.push([{
        content: `Pohonch: ${grp.key}   —   ${grp.bilties.length} bilties`,
        colSpan: NUM_COLS,
        styles:  secStyle,
      }]);

      for (const b of grp.bilties) body.push(mapRow(b));

      // Per-group subtotal
      const { pf: gPf, kaat: gKaat, pkgs: gPkgs, wt: gWt, dd: gDD } = calcTotals(grp.bilties);
      body.push([
        { content: `Subtotal: ${grp.key}  (${grp.bilties.length})`, colSpan: 2, styles: { ...subStyle, halign: 'left' } },
        { content: '',            styles: subStyle },
        { content: String(gPkgs), styles: { ...subStyle, halign: 'center' } },
        { content: fmtN(gWt),     styles: subStyle },
        { content: fmtN(gDD),     styles: subStyle },
        { content: fmtN(gPf),     styles: subStyle },
        { content: fmtN(gKaat),   styles: subStyle },
      ]);

      body.push([{ content: '', colSpan: NUM_COLS, styles: spaceStyle }]);
    }

    if (inclNoPohonch.length > 0) {
      body.push([{
        content: `No Pohonch Available   —   ${inclNoPohonch.length} bilties`,
        colSpan: NUM_COLS,
        styles:  secStyle,
      }]);

      for (const b of inclNoPohonch) body.push(mapRow(b));

      const { pf: nPf, kaat: nKaat, pkgs: nPkgs, wt: nWt, dd: nDD } = calcTotals(inclNoPohonch);
      body.push([
        { content: `Subtotal: No Pohonch  (${inclNoPohonch.length})`, colSpan: 2, styles: { ...subStyle, halign: 'left' } },
        { content: '',            styles: subStyle },
        { content: String(nPkgs), styles: { ...subStyle, halign: 'center' } },
        { content: fmtN(nWt),     styles: subStyle },
        { content: fmtN(nDD),     styles: subStyle },
        { content: fmtN(nPf),     styles: subStyle },
        { content: fmtN(nKaat),   styles: subStyle },
      ]);
    }

    if (body.length === 0) { setPdfLoading(false); return; }

    autoTable(doc, {
      startY: 22,
      margin: { top: 4, left: marginX, right: marginX },
      head:   [['GR No', 'Pohonch Number', 'Bilty Date', 'Pkgs', 'Wt', 'DD', 'To-Pay (PF)', 'Paid (KAAT)']],
      body,
      theme:  'grid',
      styles: { fontSize: 6, cellPadding: 1, textColor: [0, 0, 0], lineColor: [160, 160, 160], lineWidth: 0.1, overflow: 'linebreak' },
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5, cellPadding: 2.5 },
      columnStyles: colStyles,
      didDrawPage: (data) => drawPageHeader(data),
    });

    const allB = [...inclPohonch.flatMap(g => g.bilties), ...inclNoPohonch];
    drawTotalsTable(allB);

    const pageH  = doc.internal.pageSize.getHeight();
    const finalY = doc.lastAutoTable.finalY;
    const baseY  = (finalY + 90 > pageH) ? (doc.addPage(), 15) : finalY;
    drawSignatureAndNotice(baseY);

    doc.putTotalPages('{pTotal}');
    setPdfBlobUrl(URL.createObjectURL(doc.output('blob')));

  } catch (err) {
    console.error('PDF generation failed:', err);
  } finally {
    setPdfLoading(false);
  }
}
