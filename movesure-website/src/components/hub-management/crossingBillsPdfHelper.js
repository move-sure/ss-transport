import { fmtN } from './transportReportUtils';

/**
 * Generates the Crossing Bills PDF and sets the blob URL.
 *
 * @param {object} opts
 * @param {object}   opts.result              - API result object
 * @param {object}   opts.selectedTransport   - Selected transport from TransportSearchSelect
 * @param {string}   opts.fromDate
 * @param {string}   opts.toDate
 * @param {string}   opts.billDate            - Bill date to print on the header
 * @param {Array}    opts.pohonchGroups        - All pohonch groups (key + bilties)
 * @param {object}   opts.noPohonchGroup       - No-pohonch group or undefined
 * @param {Set}      opts.excludedGroups       - Set of excluded group keys
 * @param {Set}      opts.excludedBilties      - Set of excluded gr_no strings
 * @param {Function} opts.setShowModal
 * @param {Function} opts.setPdfLoading
 * @param {Function} opts.setPdfBlobUrl
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
    const pageW   = doc.internal.pageSize.getWidth();
    const marginX = 3;

    const transportName = result?.transport_name  || selectedTransport?.transport_name || '';
    const transportGst  = result?.transport_gstin || selectedTransport?.gst_number     || '';
    const dateRange     = `${fromDate}  to  ${toDate}`;
    const billDateFmt   = billDate
      ? new Date(billDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';

    // ── Bilty Number format (flat, sorted by dest_pohonch_no) ────────────────
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

      // 13-col row: GR No, Bilty No, Destination, Paid, To-Pay, Pkgs, Pvt Mark, Wt, Rate, DD, Kaat, Total, PF
      const mapRowB = (b) => {
        const dd   = Number(b.kaat_dd) || 0;
        const kaat = Number(b.kaat)    || 0;
        const pf   = fmtN(Number(b.kaat_pf) || 0);
        return [
          b.gr_no          || '',
          b.dest_pohonch_no || b.bilty_number || '',
          b.to_city        || '',
          b.payment_mode === 'paid' ? 'PAID' : (b.payment_mode === 'foc' ? 'FOC' : ''),  // Paid
          b.payment_mode === 'to-pay' ? fmtN(b.total) : '',
          b.no_of_pkg != null ? String(b.no_of_pkg) : '',
          b.pvt_marks || '',
          b.wt        != null ? String(b.wt)        : '',
          b.kaat_rate != null ? String(b.kaat_rate) : '',
          dd   !== 0 ? fmtN(dd)   : '',  // DD
          kaat !== 0 ? fmtN(kaat) : '',  // Kaat
          (b.payment_mode === 'paid' || b.payment_mode === 'foc') ? 'PAID' : fmtN(b.total),
          pf,
        ];
      };

      // Column widths (13 cols): sum = 291mm (297 - 3 left - 3 right)
      const biltyColStyles = {
        0:  { cellWidth: 20, fontStyle: 'bold', textColor: [0,0,0], fontSize: 9 },                    // GR No
        1:  { cellWidth: 20, fontStyle: 'bold', textColor: [0,0,0], fontSize: 8 },                    // Bilty No
        2:  { cellWidth: 42, fontStyle: 'bold', textColor: [0,0,0], fontSize: 8 },                    // Destination
        3:  { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [0,0,0], fontSize: 9 },   // Paid
        4:  { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [0,0,0], fontSize: 9 },   // To-Pay
        5:  { cellWidth: 13, halign: 'center', fontStyle: 'bold', textColor: [0,0,0], fontSize: 8 },  // Pkgs
        6:  { cellWidth: 16, fontStyle: 'bold', textColor: [0,0,0], fontSize: 8 },                    // Pvt Mark
        7:  { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [0,0,0], fontSize: 9 },   // Wt
        8:  { cellWidth: 18, halign: 'right', fontStyle: 'bold', textColor: [0,0,0], fontSize: 9 },   // Rate
        9:  { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [0,0,0], fontSize: 9 },   // DD
        10: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [0,0,0], fontSize: 9 },   // Kaat
        11: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [0,0,0], fontSize: 9 },   // Total
        12: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [0,0,0], fontSize: 9 },   // PF
      };
      // Sum = 20+20+42+20+24+13+16+22+18+26+22+28+20 = 291

      autoTable(doc, {
        startY: 22,
        margin: { top: 4, left: marginX, right: marginX },
        head:   [['GR No', 'Bilty No', 'Destination', 'Paid', 'To-Pay', 'Pkgs', 'Pvt Mark', 'Wt', 'Rate', 'DD', 'Kaat', 'Total', 'PF']],
        body:   allBilties.map(mapRowB),
        theme:  'grid',
        styles: { fontSize: 6, cellPadding: 1, textColor: [0,0,0], lineColor: [160,160,160], lineWidth: 0.1, overflow: 'linebreak' },
        headStyles: { fillColor: [50,50,50], textColor: [255,255,255], fontStyle: 'bold', fontSize: 6.5 },
        columnStyles: biltyColStyles,
        didDrawPage: (data) => {
          if (data.pageNumber === 1) {
            doc.setFontSize(16); doc.setFont('helvetica', 'bold');
            doc.text('SS TRANSPORT', pageW / 2, 10, { align: 'center' });
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
            doc.text(`Transport: ${transportName}   |   GSTIN: ${transportGst}   |   Period: ${dateRange}   |   Bill Date: ${billDateFmt}`, pageW / 2, 16, { align: 'center' });
            doc.setLineWidth(0.3); doc.setDrawColor(150,150,150);
            doc.line(0, 19, pageW, 19);
          }
          // Page number bottom-right
          doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
          doc.text(`Page ${data.pageNumber} / {bTotal}`, pageW - marginX, doc.internal.pageSize.getHeight() - 3, { align: 'right' });
          doc.setTextColor(0, 0, 0);
        },
      });

      // Grand totals
      const bTotWt     = allBilties.reduce((s, b) => s + (Number(b.wt)      || 0), 0);
      const bTotPaid   = allBilties.filter(b => b.payment_mode === 'paid' || b.payment_mode === 'foc').reduce((s, b) => s + (Number(b.total) || 0), 0);
      const bTotToPay  = allBilties.filter(b => b.payment_mode === 'to-pay').reduce((s, b) => s + (Number(b.total) || 0), 0);
      const bTotPkgs   = allBilties.reduce((s, b) => s + (b.no_of_pkg ?? 0), 0);
      const bTotDD     = allBilties.reduce((s, b) => s + (Number(b.kaat_dd) || 0), 0);
      const bTotKaat   = allBilties.reduce((s, b) => s + (Number(b.kaat)    || 0), 0);
      const bTotTotal  = allBilties.filter(b => b.payment_mode === 'to-pay').reduce((s, b) => s + (Number(b.total) || 0), 0);
      const bTotKaatPf = allBilties.reduce((s, b) => s + (Number(b.kaat_pf) || 0), 0);
      const bTotStyle  = { fillColor: [20,20,20], textColor: [255,255,255], fontStyle: 'bold', fontSize: 8, halign: 'right', cellPadding: 2, overflow: 'visible' };

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY,
        margin: { left: marginX, right: marginX, top: 5 },
        body: [[
          { content: `GRAND TOTAL  (${allBilties.length} bilties)`, colSpan: 3, styles: { ...bTotStyle, halign: 'center', fontSize: 9 } },
          { content: '',               styles: bTotStyle },
          { content: fmtN(bTotToPay),  styles: bTotStyle },
          { content: String(bTotPkgs), styles: { ...bTotStyle, halign: 'center' } },
          { content: '',               styles: bTotStyle },
          { content: fmtN(bTotWt),     styles: bTotStyle },
          { content: '',               styles: bTotStyle },
          { content: fmtN(bTotDD),    styles: bTotStyle },  // DD
          { content: fmtN(bTotKaat),   styles: bTotStyle },  // Kaat
          { content: fmtN(bTotTotal),  styles: bTotStyle },
          { content: fmtN(bTotKaatPf), styles: bTotStyle },
        ]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: [80,80,80], lineWidth: 0.2, overflow: 'visible' },
        columnStyles: biltyColStyles,
      });

      // Signature + Notice: need ~90mm. If not enough room, add a new page.
      const bPageH   = doc.internal.pageSize.getHeight();
      const bFinalY  = doc.lastAutoTable.finalY;
      const bBaseY   = (bFinalY + 90 > bPageH) ? (doc.addPage(), 15) : bFinalY;

      // Signature
      const bSigY = bBaseY + 18;
      const bSigLineY = bSigY + 14;
      const bLeftX = marginX + 15, bRightX = pageW / 2 + 15, bLineW = pageW / 2 - 30;
      doc.setDrawColor(80,80,80); doc.setLineWidth(0.5);
      doc.line(bLeftX, bSigLineY, bLeftX + bLineW, bSigLineY);
      doc.line(bRightX, bSigLineY, bRightX + bLineW, bSigLineY);
      doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('Authorized Signatory', bLeftX + bLineW / 2, bSigLineY + 4, { align: 'center' });
      doc.text('Authorized Signatory', bRightX + bLineW / 2, bSigLineY + 4, { align: 'center' });
      doc.setFontSize(9);
      doc.text('SS TRANSPORT', bLeftX + bLineW / 2, bSigLineY + 9, { align: 'center' });
      doc.text(transportName || 'Transport', bRightX + bLineW / 2, bSigLineY + 9, { align: 'center' });
      if (transportGst) {
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.text(transportGst, bRightX + bLineW / 2, bSigLineY + 13, { align: 'center' });
      }

      // Notice
      const bNoticeY = bSigLineY + 22;
      doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.2);
      doc.line(marginX, bNoticeY - 3, pageW - marginX, bNoticeY - 3);
      doc.setFontSize(11); doc.setFont('helvetica', 'bolditalic'); doc.setTextColor(40, 40, 40);
      doc.text(
        'NOTICE: All pending Pohonch/POD copies against the attached Bilties must be submitted within 2 days from the date of bill receipt. Any discrepancy or non-delivery claim raised thereafter shall be treated as the responsibility of the receiving transport company.',
        pageW / 2, bNoticeY + 1, { align: 'center', maxWidth: pageW - marginX * 2 }
      );
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9.5);
      doc.text(
        'Notice: Attached bilties ki pending pahunch/POD copies bill milne ke 2 din ke andar jama karein. Baad mein kisi bhi kami ya maal na milne ki zimmedari sambandhi transport company ki mani jayegi.',
        pageW / 2, bNoticeY + 14, { align: 'center', maxWidth: pageW - marginX * 2 }
      );
      doc.setTextColor(0, 0, 0);

      doc.putTotalPages('{bTotal}');
      const pdfBlob = doc.output('blob');
      setPdfBlobUrl(URL.createObjectURL(pdfBlob));
      return; // skip pohonch format
    }

    const NUM_COLS      = 12;

    // ── Row builder (12 cols) ────────────────────────────────────────────────
    const mapRow = (b) => {
      const dd   = Number(b.kaat_dd) || 0;
      const kaat = Number(b.kaat)    || 0;
      const pf   = fmtN(Number(b.kaat_pf) || 0);
      return [
        b.gr_no          || '',
        b.to_city        || '',
        b.payment_mode === 'paid' ? 'PAID' : (b.payment_mode === 'foc' ? 'FOC' : ''),  // Paid
        b.payment_mode === 'to-pay' ? fmtN(b.total) : '',
        b.no_of_pkg != null ? String(b.no_of_pkg) : '',
        b.pvt_marks || '',
        b.wt        != null ? String(b.wt)        : '',
        b.kaat_rate != null ? String(b.kaat_rate) : '',
        dd   !== 0 ? fmtN(dd)   : '',  // DD
        kaat !== 0 ? fmtN(kaat) : '',  // Kaat
        (b.payment_mode === 'paid' || b.payment_mode === 'foc') ? 'PAID' : fmtN(b.total),
        pf,
      ];
    };

    // ── Styles ───────────────────────────────────────────────────────────────
    const secStyle = {
      fillColor:   [210, 210, 210],
      fontStyle:   'bold',
      halign:      'center',
      fontSize:    7,
      textColor:   [0, 0, 0],
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
    };
    const subStyle = {
      fillColor:   [230, 230, 230],
      fontStyle:   'bold',
      textColor:   [0, 0, 0],
      fontSize:    7,
      halign:      'right',
      cellPadding: 1.2,
    };
    const spaceStyle = {
      fillColor:   [215, 215, 215],
      cellPadding: { top: 0.5, bottom: 0.5, left: 0, right: 0 },
      lineWidth:   0,
    };

    // ── Build body rows ───────────────────────────────────────────────────────
    const inclPohonch   = pohonchGroups.filter(g => !excludedGroups.has(g.key));
    const inclNoPohonch = (noPohonchGroup?.bilties || []).filter(b => !excludedBilties.has(b.gr_no));

    if (inclPohonch.length === 0 && inclNoPohonch.length === 0) {
      setPdfLoading(false);
      return;
    }

    const body = [];

    for (const grp of inclPohonch) {
      const hc     = [...new Set(grp.bilties.map(b => b.pohonch_number).filter(Boolean))].join(', ');
      const hcPart = hc ? `  —  Crossing Challan SS : ${hc}` : '';

      body.push([{
        content: `Pohonch Number: ${grp.key}${hcPart}  —  ${grp.bilties.length} bilties`,
        colSpan: NUM_COLS,
        styles:  secStyle,
      }]);

      for (const b of grp.bilties) body.push(mapRow(b));

      // Per-group subtotal
      const gToPay  = grp.bilties.filter(b => b.payment_mode === 'to-pay').reduce((s, b) => s + (Number(b.total) || 0), 0);
      const gPaid   = grp.bilties.filter(b => b.payment_mode === 'paid' || b.payment_mode === 'foc').reduce((s, b) => s + (Number(b.total) || 0), 0);
      const gPkgs   = grp.bilties.reduce((s, b) => s + (b.no_of_pkg ?? 0), 0);
      const gWt     = grp.bilties.reduce((s, b) => s + (Number(b.wt)      || 0), 0);
      const gDD     = grp.bilties.reduce((s, b) => s + (Number(b.kaat_dd) || 0), 0);
      const gKaat   = grp.bilties.reduce((s, b) => s + (Number(b.kaat)    || 0), 0);
      const gTotal  = grp.bilties.filter(b => b.payment_mode === 'to-pay').reduce((s, b) => s + (Number(b.total) || 0), 0);
      const gKaatPf = grp.bilties.reduce((s, b) => s + (Number(b.kaat_pf) || 0), 0);

      body.push([
        { content: `Subtotal: ${grp.key}  (${grp.bilties.length})`, colSpan: 2, styles: { ...subStyle, halign: 'center' } },
        { content: '',            styles: subStyle },
        { content: fmtN(gToPay),  styles: subStyle },
        { content: String(gPkgs), styles: { ...subStyle, halign: 'center' } },
        { content: '',            styles: subStyle },
        { content: fmtN(gWt),     styles: subStyle },
        { content: '',            styles: subStyle },  // Rate
        { content: fmtN(gDD),     styles: subStyle },  // DD
        { content: fmtN(gKaat),   styles: subStyle },  // Kaat
        { content: fmtN(gTotal),  styles: subStyle },
        { content: fmtN(gKaatPf), styles: subStyle },
      ]);

      // Spacer row between groups
      body.push([{ content: '', colSpan: NUM_COLS, styles: spaceStyle }]);
    }

    if (inclNoPohonch.length > 0) {
      body.push([{
        content: `No Pohonch Available   —   ${inclNoPohonch.length} bilties`,
        colSpan: NUM_COLS,
        styles:  secStyle,
      }]);

      for (const b of inclNoPohonch) body.push(mapRow(b));

      const npToPay  = inclNoPohonch.filter(b => b.payment_mode === 'to-pay').reduce((s, b) => s + (Number(b.total) || 0), 0);
      const npPaid   = inclNoPohonch.filter(b => b.payment_mode === 'paid' || b.payment_mode === 'foc').reduce((s, b) => s + (Number(b.total) || 0), 0);
      const npPkgs   = inclNoPohonch.reduce((s, b) => s + (b.no_of_pkg ?? 0), 0);
      const npWt     = inclNoPohonch.reduce((s, b) => s + (Number(b.wt)      || 0), 0);
      const npDD     = inclNoPohonch.reduce((s, b) => s + (Number(b.kaat_dd) || 0), 0);
      const npKaat   = inclNoPohonch.reduce((s, b) => s + (Number(b.kaat)    || 0), 0);
      const npTotal  = inclNoPohonch.filter(b => b.payment_mode === 'to-pay').reduce((s, b) => s + (Number(b.total) || 0), 0);
      const npKaatPf = inclNoPohonch.reduce((s, b) => s + (Number(b.kaat_pf) || 0), 0);

      body.push([
        { content: `Subtotal: No Pohonch  (${inclNoPohonch.length})`, colSpan: 2, styles: { ...subStyle, halign: 'center' } },
        { content: '',             styles: subStyle },
        { content: fmtN(npToPay),  styles: subStyle },
        { content: String(npPkgs), styles: { ...subStyle, halign: 'center' } },
        { content: '',             styles: subStyle },
        { content: fmtN(npWt),     styles: subStyle },
        { content: '',             styles: subStyle },  // Rate
        { content: fmtN(npDD),     styles: subStyle },  // DD
        { content: fmtN(npKaat),   styles: subStyle },  // Kaat
        { content: fmtN(npTotal),  styles: subStyle },
        { content: fmtN(npKaatPf), styles: subStyle },
      ]);
    }

    if (body.length === 0) { setPdfLoading(false); return; }

    // ── Main table ────────────────────────────────────────────────────────────
    autoTable(doc, {
      startY: 22,
      margin: { top: 4, left: marginX, right: marginX },
      head:   [['GR No', 'Destination', 'Paid', 'To-Pay', 'Pkgs', 'Pvt Mark', 'Wt', 'Rate', 'DD', 'Kaat', 'Total', 'PF']],
      body,
      theme:  'grid',
      styles: {
        fontSize:    6,
        cellPadding: 1,
        textColor:   [0, 0, 0],
        lineColor:   [160, 160, 160],
        lineWidth:   0.1,
        overflow:    'linebreak',
      },
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize:  6.5,
      },
      // Column widths scaled to sum exactly to 297mm (full A4 landscape width).
      // Old total was 224mm → scale factor ≈ 1.326
      columnStyles: {
        0:  { cellWidth: 20, fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },                   // GR No
        1:  { cellWidth: 45, fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 8 },                   // Destination
        2:  { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },  // Paid
        3:  { cellWidth: 25, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },  // To-Pay
        4:  { cellWidth: 13, halign: 'center', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 8 }, // Pkgs
        5:  { cellWidth: 20, fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 8 },                   // Pvt Mark
        6:  { cellWidth: 23, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },  // Wt
        7:  { cellWidth: 18, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },  // Rate
        8:  { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },  // DD
        9:  { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },  // Kaat
        10: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },  // Total
        11: { cellWidth: 27, halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 9 },  // PF
      },                                                                                                 // Sum = 20+45+20+25+13+20+23+18+28+22+30+27 = 291mm
      didDrawPage: (data) => {
        if (data.pageNumber === 1) {
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('SS TRANSPORT', pageW / 2, 10, { align: 'center' });
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `Transport: ${transportName}   |   GSTIN: ${transportGst}   |   Period: ${dateRange}   |   Bill Date: ${billDateFmt}`,
            pageW / 2, 16, { align: 'center' }
          );
          doc.setLineWidth(0.3);
          doc.setDrawColor(150, 150, 150);
          doc.line(0, 19, pageW, 19);
        }
        // Page number bottom-right
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
        doc.text(`Page ${data.pageNumber} / {pTotal}`, pageW - marginX, doc.internal.pageSize.getHeight() - 3, { align: 'right' });
        doc.setTextColor(0, 0, 0);
      },
    });

    // ── Grand totals row ──────────────────────────────────────────────────────
    const allB = [
      ...inclPohonch.flatMap(g => g.bilties),
      ...inclNoPohonch,
    ];
    const totToPay  = allB.filter(b => b.payment_mode === 'to-pay').reduce((s, b) => s + (Number(b.total) || 0), 0);
    const totPaid   = allB.filter(b => b.payment_mode === 'paid' || b.payment_mode === 'foc').reduce((s, b) => s + (Number(b.total) || 0), 0);
    const totPkgs   = allB.reduce((s, b) => s + (b.no_of_pkg ?? 0), 0);
    const totWt     = allB.reduce((s, b) => s + (Number(b.wt)      || 0), 0);
    const totDD     = allB.reduce((s, b) => s + (Number(b.kaat_dd) || 0), 0);
    const totKaat   = allB.reduce((s, b) => s + (Number(b.kaat)    || 0), 0);
    const totTotal  = allB.filter(b => b.payment_mode === 'to-pay').reduce((s, b) => s + (Number(b.total) || 0), 0);
    const totKaatPf = allB.reduce((s, b) => s + (Number(b.kaat_pf) || 0), 0);

    const totalsStyle = {
      fillColor:   [20, 20, 20],
      textColor:   [255, 255, 255],
      fontStyle:   'bold',
      fontSize:    8,
      halign:      'right',
      cellPadding: 2,
      overflow:    'visible',
    };
    const totalsRow = [
      { content: `GRAND TOTAL  (${allB.length} bilties)`, colSpan: 2, styles: { ...totalsStyle, halign: 'center', fontSize: 9 } },
      { content: '',             styles: totalsStyle },
      { content: fmtN(totToPay),  styles: totalsStyle },
      { content: String(totPkgs), styles: { ...totalsStyle, halign: 'center' } },
      { content: '',              styles: totalsStyle },  // Pvt Mark
      { content: fmtN(totWt),     styles: totalsStyle },
      { content: '',              styles: totalsStyle },  // Rate
      { content: fmtN(totDD),     styles: totalsStyle },  // DD
      { content: fmtN(totKaat),   styles: totalsStyle },  // Kaat
      { content: fmtN(totTotal),  styles: totalsStyle },
      { content: fmtN(totKaatPf), styles: totalsStyle },
    ];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY,
      margin: { left: marginX, right: marginX, top: 5 },
      body:   [totalsRow],
      theme:  'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [80, 80, 80], lineWidth: 0.2, overflow: 'visible' },
      columnStyles: {
        0:  { cellWidth: 20 },
        1:  { cellWidth: 45 },
        2:  { cellWidth: 20 },
        3:  { cellWidth: 25 },
        4:  { cellWidth: 13 },
        5:  { cellWidth: 20 },
        6:  { cellWidth: 23 },
        7:  { cellWidth: 18 },
        8:  { cellWidth: 22 },
        9:  { cellWidth: 28 },
        10: { cellWidth: 30 },
        11: { cellWidth: 27 },
      },
    });

    // Signature + Notice: need ~90mm. If not enough room, add a new page.
    const pageH   = doc.internal.pageSize.getHeight();
    const finalY  = doc.lastAutoTable.finalY;
    const baseY   = (finalY + 90 > pageH) ? (doc.addPage(), 15) : finalY;

    // ── Signature section ─────────────────────────────────────────────────────
    const sigY     = baseY + 18;
    const sigLineY = sigY + 14;
    const leftX    = marginX + 15;
    const rightX   = pageW / 2 + 15;
    const lineW    = pageW / 2 - 30;

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.5);
    doc.line(leftX,  sigLineY, leftX  + lineW, sigLineY);
    doc.line(rightX, sigLineY, rightX + lineW, sigLineY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Signatory', leftX  + lineW / 2, sigLineY + 4, { align: 'center' });
    doc.text('Authorized Signatory', rightX + lineW / 2, sigLineY + 4, { align: 'center' });

    doc.setFontSize(9);
    doc.text('SS TRANSPORT',                   leftX  + lineW / 2, sigLineY + 9, { align: 'center' });
    doc.text(transportName || 'Transport',     rightX + lineW / 2, sigLineY + 9, { align: 'center' });
    if (transportGst) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(transportGst, rightX + lineW / 2, sigLineY + 13, { align: 'center' });
    }

    // ── Notice ────────────────────────────────────────────────────────────────
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

    // ── Output ────────────────────────────────────────────────────────────────
    doc.putTotalPages('{pTotal}');
    const pdfBlob = doc.output('blob');
    const pdfUrl  = URL.createObjectURL(pdfBlob);
    setPdfBlobUrl(pdfUrl);

  } catch (err) {
    console.error('PDF generation failed:', err);
  } finally {
    setPdfLoading(false);
  }
}
