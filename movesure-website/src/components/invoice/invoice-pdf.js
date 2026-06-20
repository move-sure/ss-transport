'use client';

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// ── Indian number-to-words ────────────────────────────────────────────────────
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function two(n) {
  return n < 20 ? ONES[n] : TENS[Math.floor(n/10)] + (n % 10 ? ' ' + ONES[n%10] : '');
}
function numberToWords(amount) {
  const n = Math.floor(Math.abs(amount));
  const p = Math.round((Math.abs(amount) - n) * 100);
  if (n === 0 && p === 0) return 'Zero Rupees Only';
  let w = '';
  if (n >= 10000000) w += two(Math.floor(n/10000000)) + ' Crore ';
  if (n % 10000000 >= 100000) w += two(Math.floor((n % 10000000)/100000)) + ' Lakh ';
  if (n % 100000 >= 1000) w += two(Math.floor((n % 100000)/1000)) + ' Thousand ';
  if (n % 1000 >= 100) w += ONES[Math.floor((n % 1000)/100)] + ' Hundred ';
  if (n % 100 > 0) w += two(n % 100) + ' ';
  w = w.trim() + ' Rupees';
  if (p > 0) w += ' and ' + two(p) + ' Paise';
  return w.trim() + ' Only';
}

// Use "Rs." — jsPDF standard fonts (Helvetica/Times) do NOT include the
// Unicode rupee symbol (U+20B9); it renders as garbage/superscript "1".
const RS = 'Rs.';
const fm = (n) => Number(n || 0).toFixed(2);

// ── Main generator ────────────────────────────────────────────────────────────
export async function generateInvoicePDF(data) {
  const {
    invoice_no = '', invoice_date, due_date, invoice_type = 'TAX_INVOICE',
    seller_name = '', seller_gstin = '', seller_pan = '',
    seller_address = '', seller_state = '', seller_state_code = '',
    buyer_name = '', buyer_gstin = '', buyer_pan = '', buyer_aadhar_number = '',
    billing_address = '', buyer_state = '', buyer_state_code = '',
    transport_name = '', gr_no = '', e_way_bill = '',
    po_number = '', po_date = '', supply_type = 'B2B', place_of_supply = '',
    pvt_marks = '', is_reverse_charge = false,
    line_items = [],
    total_cgst = 0, total_sgst = 0, total_igst = 0,
    taxable_amount = 0, total_amount = 0, round_off = 0,
    bank_name = '', bank_account_no = '', bank_ifsc = '',
    bank_branch = '', upi_id = '',
    notes = '', terms_and_conditions = '',
  } = data;

  const pdf = new jsPDF('p', 'mm', 'a4');

  // ── Page constants ──
  const PW = 210, PH = 297;
  const ML = 7, MR = 7, MT = 7;
  const CW = PW - ML - MR;          // 196 mm
  const BOTTOM = PH - MT;           // 290 mm

  // ── QR code ──
  let qrImg = null;
  try {
    qrImg = await QRCode.toDataURL(
      `Invoice: ${invoice_no}\nDate: ${fmtDate(invoice_date)}\nFrom: ${seller_name}\nTo: ${buyer_name}\nAmt: Rs.${fm(total_amount)}`,
      { width: 120, margin: 1 }
    );
  } catch (_) {}

  // ── Helpers ──
  const sf = (sz, wt = 'normal', fam = 'helvetica') => { pdf.setFont(fam, wt); pdf.setFontSize(sz); };
  const t  = (s, x, y, opts = {}) => pdf.text(String(s ?? ''), x, y, opts);
  const hl = (y, x1 = ML, x2 = ML + CW, lw = 0.25) => { pdf.setLineWidth(lw); pdf.line(x1, y, x2, y); };
  const vl = (x, y1, y2, lw = 0.2)  => { pdf.setLineWidth(lw); pdf.line(x, y1, x, y2); };
  const fb = (x, y, w, h, r, g, b)  => { pdf.setFillColor(r, g, b); pdf.rect(x, y, w, h, 'F'); };
  function fmtDate(d) { try { return new Date(d).toLocaleDateString('en-GB'); } catch { return d || ''; } }

  const hasIGST  = Number(total_igst) > 0;
  const titleLabel = {
    TAX_INVOICE:'TAX INVOICE', BILL_OF_SUPPLY:'BILL OF SUPPLY',
    PROFORMA:'PROFORMA INVOICE', CREDIT_NOTE:'CREDIT NOTE',
    DEBIT_NOTE:'DEBIT NOTE', DELIVERY_CHALLAN:'DELIVERY CHALLAN',
  }[invoice_type] || 'INVOICE';

  // ── Column defs (widths must sum exactly to CW=196) ──
  // CGST+SGST: 12 cols
  const cgstCols = [
    { h:'Sl',          w:7,  a:'center' },
    { h:'Description', w:38, a:'left'   },
    { h:'HSN/SAC',     w:15, a:'center' },
    { h:'Qty',         w:10, a:'center' },
    { h:'Unit',        w:10, a:'center' },
    { h:'Rate',        w:16, a:'right'  },
    { h:'Taxable',     w:18, a:'right'  },
    { h:'CGST%',       w:10, a:'center' },
    { h:'CGST Amt',    w:16, a:'right'  },
    { h:'SGST%',       w:10, a:'center' },
    { h:'SGST Amt',    w:16, a:'right'  },
    { h:'Total',       w:30, a:'right'  },
  ]; // 7+38+15+10+10+16+18+10+16+10+16+30 = 196 ✓

  // IGST: 10 cols
  const igstCols = [
    { h:'Sl',          w:7,  a:'center' },
    { h:'Description', w:44, a:'left'   },
    { h:'HSN/SAC',     w:16, a:'center' },
    { h:'Qty',         w:11, a:'center' },
    { h:'Unit',        w:11, a:'center' },
    { h:'Rate',        w:20, a:'right'  },
    { h:'Taxable',     w:22, a:'right'  },
    { h:'IGST%',       w:13, a:'center' },
    { h:'IGST Amt',    w:18, a:'right'  },
    { h:'Total',       w:34, a:'right'  },
  ]; // 7+44+16+11+11+20+22+13+18+34 = 196 ✓

  const COLS = hasIGST ? igstCols : cgstCols;

  // ── Y cursor (tracks downward content) ──
  let y = MT;

  // ─────────────────────────────────────────────────────────────
  // 1. TITLE BAR
  // ─────────────────────────────────────────────────────────────
  const titleH = 10;
  fb(ML, y, CW, titleH, 28, 78, 168);
  pdf.setTextColor(255, 255, 255);
  sf(13, 'bold'); t(titleLabel, ML + CW/2, y + 6.8, { align:'center' });
  pdf.setTextColor(0, 0, 0);
  y += titleH;

  // ─────────────────────────────────────────────────────────────
  // 2. SELLER (left) | INVOICE META (right)
  // ─────────────────────────────────────────────────────────────
  const half = CW / 2;   // 98 mm each side

  // Build meta rows first so we can size the section
  const metaItems = [
    { l:'Invoice No.',     v: invoice_no || '—' },
    { l:'Invoice Date',    v: fmtDate(invoice_date) },
    { l:'Due Date',        v: fmtDate(due_date) },
    { l:'Supply Type',     v: supply_type },
    { l:'Place of Supply', v: place_of_supply || '—' },
    ...(pvt_marks         ? [{ l:'Pvt Marks',      v: pvt_marks }]   : []),
    ...(is_reverse_charge ? [{ l:'Reverse Charge',  v: 'Yes' }]      : []),
    ...(po_number         ? [{ l:"Buyer's P.O.",    v: po_number }]   : []),
    ...(gr_no             ? [{ l:'GR / Ref No.',    v: gr_no }]       : []),
  ];
  // Each meta row needs ~8mm for larger font; section minimum 46mm
  const s1H = Math.max(46, metaItems.length * 8);

  // Seller (left)
  sf(9.5, 'bold');
  t(seller_name, ML + 2, y + 7);
  sf(7.5, 'normal');
  const addrW = pdf.splitTextToSize(seller_address, half - 6);
  addrW.slice(0, 3).forEach((l, i) => t(l, ML + 2, y + 13 + i * 4));
  let sy = y + 13 + Math.min(3, addrW.length) * 4 + 1;
  if (seller_gstin)     { sf(7,'bold'); t('GSTIN:', ML+2, sy); sf(7,'normal'); t(seller_gstin, ML+16, sy); sy += 4.5; }
  if (seller_pan)       { sf(7,'bold'); t('PAN:',   ML+2, sy); sf(7,'normal'); t(seller_pan,   ML+12, sy); sy += 4.5; }
  if (seller_state_code){ sf(7,'bold'); t('State Code:', ML+2, sy); sf(7,'normal'); t(seller_state_code, ML+22, sy); }

  // Invoice meta (right half) — bigger font, even row height
  const rx = ML + half + 3;
  const mRowH = s1H / metaItems.length;
  let mry = y + mRowH * 0.6;
  metaItems.forEach(({ l, v }) => {
    sf(8.5, 'bold');   t(l + ':', rx, mry);
    sf(8.5, 'normal'); t(v,       rx + 38, mry);
    hl(mry + 2, ML + half, ML + CW, 0.12);
    mry += mRowH;
  });

  vl(ML + half, y, y + s1H);
  hl(y + s1H, ML, ML + CW, 0.3);
  y += s1H;

  // ─────────────────────────────────────────────────────────────
  // 3. BUYER (left, dynamic) | TRANSPORT (right)
  // ─────────────────────────────────────────────────────────────
  // Calculate buyer content height dynamically
  const bAddr = billing_address ? pdf.splitTextToSize(billing_address, half - 6) : [];
  let buyerLineCount = 2; // label + name
  if (buyer_gstin)         buyerLineCount++;
  if (buyer_aadhar_number) buyerLineCount++;
  if (buyer_state_code || buyer_state) buyerLineCount++;
  buyerLineCount += Math.min(2, bAddr.length);

  const dRows = [
    ...(transport_name ? [{ l:'Transport',   v: transport_name }] : []),
    ...(e_way_bill     ? [{ l:'E-Way Bill',  v: e_way_bill }]     : []),
    ...(gr_no && !po_number ? [{ l:'GR No.', v: gr_no }]         : []),
    ...(po_date        ? [{ l:'P.O. Date',   v: fmtDate(po_date) }] : []),
  ];

  const s2H = Math.max(32, buyerLineCount * 5.5 + 4, dRows.length * 6 + 8);
  const secY2 = y;

  // Buyer label + name
  sf(7, 'bold');   t('Consignee / Bill To:', ML+2, y+5);
  sf(9.5, 'bold'); t(buyer_name, ML+2, y+11);

  // Dynamic detail lines (all near the name)
  let by = y + 17;
  const bline = (label, val, labelW = 22) => {
    if (!val) return;
    sf(7, 'bold');   t(label + ':', ML+2, by);
    sf(7, 'normal'); t(val,         ML + labelW, by);
    by += 5;
  };
  bline('GSTIN',      buyer_gstin,         16);
  bline('Aadhaar',    buyer_aadhar_number, 20);
  if (buyer_state || buyer_state_code) {
    bline('State',
      [buyer_state, buyer_state_code ? `(${buyer_state_code})` : ''].filter(Boolean).join(' '),
      14);
  }
  if (bAddr.length > 0) {
    sf(7, 'normal');
    bAddr.slice(0, 2).forEach((l, i) => t(l, ML+2, by + i * 4));
    by += Math.min(2, bAddr.length) * 4;
  }

  // Transport / dispatch (right half)
  let dry = secY2 + 6;
  dRows.forEach(({ l, v }) => {
    sf(7.5, 'bold');   t(l+':', rx, dry);
    sf(7.5, 'normal'); t(v,     rx + 26, dry);
    dry += 6;
  });

  vl(ML + half, secY2, secY2 + s2H);
  hl(secY2 + s2H, ML, ML + CW, 0.3);
  y = secY2 + s2H;

  // ─────────────────────────────────────────────────────────────
  // 4. LINE ITEMS TABLE HEADER
  // ─────────────────────────────────────────────────────────────
  const thH = 10;
  fb(ML, y, CW, thH, 232, 238, 250);
  let cx = ML;
  COLS.forEach((col, i) => {
    sf(6.5, 'bold');
    const tw = col.w - 3;
    const lines = pdf.splitTextToSize(col.h, tw);
    const startY = y + (thH / 2) - ((lines.length - 1) * 1.8);
    lines.forEach((ln, li) => {
      const tx2 = col.a === 'right' ? cx + col.w - 2 : col.a === 'left' ? cx + 2 : cx + col.w / 2;
      t(ln, tx2, startY + li * 3.5, { align: col.a === 'right' ? 'right' : col.a === 'left' ? 'left' : 'center' });
    });
    if (i < COLS.length - 1) vl(cx + col.w, y, y + thH, 0.2);
    cx += col.w;
  });
  hl(y + thH, ML, ML + CW, 0.3);
  y += thH;

  // ─────────────────────────────────────────────────────────────
  // 5. LINE ITEMS ROWS
  // ─────────────────────────────────────────────────────────────
  line_items.forEach((item, idx) => {
    const taxable  = Number(item.taxable_amount  || 0);
    const cgstAmt  = Number(item.cgst_amount     || 0);
    const sgstAmt  = Number(item.sgst_amount     || 0);
    const igstAmt  = Number(item.igst_amount     || 0);
    const lineTotal= Number(item.total_amount    || 0);
    const gstRate  = Number(item.gst_rate        || 0);
    const pvtMarks = item.pvt_marks || '';

    // Row is taller when pvt_marks is present (extra sub-line under description)
    const rowH = pvtMarks ? 13 : 9;

    const vals = hasIGST ? [
      String(idx + 1), item.item_name || '', item.hsn_sac_code || '',
      fm(item.quantity), item.unit || 'NOS', fm(item.rate),
      fm(taxable), `${gstRate}%`, fm(igstAmt), fm(lineTotal),
    ] : [
      String(idx + 1), item.item_name || '', item.hsn_sac_code || '',
      fm(item.quantity), item.unit || 'NOS', fm(item.rate),
      fm(taxable), `${gstRate/2}%`, fm(cgstAmt), `${gstRate/2}%`, fm(sgstAmt), fm(lineTotal),
    ];

    if (idx % 2 === 1) fb(ML, y, CW, rowH, 249, 251, 255);

    let cx2 = ML;
    vals.forEach((val, ci) => {
      const col = COLS[ci];
      sf(7.5, 'normal');
      const tx2 = col.a === 'right' ? cx2 + col.w - 2 : col.a === 'left' ? cx2 + 2 : cx2 + col.w / 2;
      if (ci === 1) {
        // Item name on first line
        const wrapped = pdf.splitTextToSize(val, col.w - 3);
        wrapped.slice(0, 1).forEach((wl) => t(wl, tx2, y + 4.5, { align: 'left' }));
        // Pvt marks as grey sub-line
        if (pvtMarks) {
          sf(6.5, 'normal'); pdf.setTextColor(100, 100, 100);
          t(`Pvt: ${pvtMarks}`, tx2, y + 9, { align: 'left' });
          pdf.setTextColor(0, 0, 0);
        }
      } else {
        t(val, tx2, y + rowH/2 + 1.5, { align: col.a === 'right' ? 'right' : col.a === 'center' ? 'center' : 'left' });
      }
      if (ci < COLS.length - 1) vl(cx2 + col.w, y, y + rowH, 0.15);
      cx2 += col.w;
    });

    hl(y + rowH, ML, ML + CW, idx === line_items.length - 1 ? 0.3 : 0.15);
    y += rowH;
  });

  // ── Save where items end ──────────────────────────────────────
  const itemsEndY = y;

  // ─────────────────────────────────────────────────────────────
  // Pre-calculate the heights of the bottom block so we can
  // anchor it above the bank section, leaving natural white space
  // between the items table and the summary.
  // ─────────────────────────────────────────────────────────────
  const gstW   = Math.round(CW * 0.62);
  const totW   = CW - gstW;
  const totX   = ML + gstW;

  const gstThH  = 8;
  const gstRowH = 7;
  const gstTotH = 7;
  const gstBlockH = gstThH + line_items.length * gstRowH + gstTotH;

  const totRows = [
    { label:'Taxable Amount', val:`${RS}${fm(taxable_amount)}`, bold:true },
    ...(hasIGST
      ? [{ label:'IGST', val:`${RS}${fm(total_igst)}` }]
      : [
          { label:'CGST', val:`${RS}${fm(total_cgst)}` },
          { label:'SGST', val:`${RS}${fm(total_sgst)}` },
        ]),
    ...(Number(round_off) !== 0 ? [{ label:'Round Off', val:`${RS}${fm(round_off)}` }] : []),
  ];
  const totRowH  = 8;
  const totBodyH = totRows.length * totRowH;
  const gtH      = Math.max(gstBlockH - totBodyH, 10);
  const parallelH = Math.max(gstBlockH, totBodyH + gtH);
  const awH       = 9;
  const finalBlockH = parallelH + awH;

  // ─────────────────────────────────────────────────────────────
  // ANCHOR MATH — place the summary block right above bank section
  // ─────────────────────────────────────────────────────────────
  const footerH  = 8;
  const termsH   = terms_and_conditions
    ? (7 + Math.min(5, pdf.splitTextToSize(terms_and_conditions, CW - 6).length) * 3.5)
    : 0;
  const bankQrH  = 58;
  const bankStart = BOTTOM - footerH - termsH - bankQrH;

  // Where the GST+totals block should start: anchored above bank,
  // but never overlapping items (push down if too many items).
  const secTop = Math.max(itemsEndY, bankStart - finalBlockH);

  // Draw a separator line right below items (always visible)
  hl(itemsEndY, ML, ML + CW, 0.3);

  // ─────────────────────────────────────────────────────────────
  // 6. GST SUMMARY (left ~62%) | TOTALS (right ~38%)
  //    Starts at secTop — anchored above bank details
  // ─────────────────────────────────────────────────────────────
  y = secTop;

  // GST column defs
  const gstCols = hasIGST ? [
    { h:'HSN/SAC',        w: Math.round(gstW*0.17), a:'center' },
    { h:'Taxable (Rs.)',  w: Math.round(gstW*0.27), a:'right'  },
    { h:'IGST Rate',      w: Math.round(gstW*0.18), a:'center' },
    { h:'IGST Amt (Rs.)', w: gstW - Math.round(gstW*0.62), a:'right' },
  ] : [
    { h:'HSN/SAC',           w: Math.round(gstW*0.15), a:'center' },
    { h:'Taxable (Rs.)',     w: Math.round(gstW*0.22), a:'right'  },
    { h:'CGST Rate',         w: Math.round(gstW*0.13), a:'center' },
    { h:'CGST Amt (Rs.)',    w: Math.round(gstW*0.17), a:'right'  },
    { h:'SGST Rate',         w: Math.round(gstW*0.13), a:'center' },
    { h:'SGST Amt (Rs.)',    w: gstW - Math.round(gstW*0.80), a:'right' },
  ];
  const gstSum = gstCols.reduce((a, c) => a + c.w, 0);
  gstCols[gstCols.length-1].w += (gstW - gstSum);

  fb(ML, y, gstW, gstThH, 232, 238, 250);
  let gcx = ML;
  gstCols.forEach((gc, gi) => {
    sf(6.5, 'bold');
    const gtx = gc.a === 'right' ? gcx + gc.w - 2 : gcx + gc.w/2;
    t(gc.h, gtx, y + 5, { align: gc.a === 'right' ? 'right' : 'center' });
    if (gi < gstCols.length-1) vl(gcx + gc.w, y, y + gstThH, 0.15);
    gcx += gc.w;
  });
  hl(y + gstThH, ML, ML + gstW, 0.25);
  let gy = y + gstThH;

  line_items.forEach((item, idx) => {
    const taxable = Number(item.taxable_amount || 0);
    const cgst    = Number(item.cgst_amount    || 0);
    const sgst    = Number(item.sgst_amount    || 0);
    const igst    = Number(item.igst_amount    || 0);
    const rate    = Number(item.gst_rate       || 0);

    if (idx % 2 === 1) fb(ML, gy, gstW, gstRowH, 249, 251, 255);

    const gVals = hasIGST
      ? [item.hsn_sac_code||'', fm(taxable), `${rate}%`, fm(igst)]
      : [item.hsn_sac_code||'', fm(taxable), `${rate/2}%`, fm(cgst), `${rate/2}%`, fm(sgst)];

    let gcx2 = ML;
    gVals.forEach((val, gi) => {
      const gc = gstCols[gi];
      sf(7.5, 'normal');
      const gtx = gc.a === 'right' ? gcx2 + gc.w - 2 : gcx2 + gc.w/2;
      t(val, gtx, gy + gstRowH/2 + 1.5, { align: gc.a === 'right' ? 'right' : 'center' });
      if (gi < gstCols.length-1) vl(gcx2 + gc.w, gy, gy + gstRowH, 0.12);
      gcx2 += gc.w;
    });
    hl(gy + gstRowH, ML, ML + gstW, idx === line_items.length-1 ? 0.25 : 0.12);
    gy += gstRowH;
  });

  // GST total row
  fb(ML, gy, gstW, gstTotH, 220, 228, 245);
  sf(7.5, 'bold');
  let gcx3 = ML;
  gstCols.forEach((gc, gi) => {
    let val = '';
    if (gi === 0) val = 'Total';
    else if (gi === 1) val = fm(taxable_amount);
    else if (!hasIGST && gi === 3) val = fm(total_cgst);
    else if (!hasIGST && gi === 5) val = fm(total_sgst);
    else if (hasIGST && gi === 3) val = fm(total_igst);
    if (val) {
      const gtx = gc.a === 'right' ? gcx3 + gc.w - 2 : gcx3 + gc.w/2;
      t(val, gtx, gy + gstTotH/2 + 1.5, { align: gc.a === 'right' ? 'right' : gc.a === 'center' ? 'center' : 'left' });
    }
    if (gi < gstCols.length-1) vl(gcx3 + gc.w, gy, gy + gstTotH, 0.15);
    gcx3 += gc.w;
  });
  hl(gy + gstTotH, ML, ML + gstW, 0.3);
  gy += gstTotH;

  // Totals block (right, parallel)
  let ty = secTop;
  totRows.forEach(({ label, val, bold }) => {
    sf(7.5, bold ? 'bold' : 'normal');
    t(label, totX + 3, ty + totRowH/2 + 1.5);
    sf(7.5, 'bold');
    t(val, totX + totW - 3, ty + totRowH/2 + 1.5, { align:'right' });
    hl(ty + totRowH, totX, totX + totW, 0.15);
    ty += totRowH;
  });

  // Grand total fills remaining height to align with GST block bottom
  fb(totX, ty, totW, gtH, 28, 78, 168);
  pdf.setTextColor(255, 255, 255);
  sf(8,   'bold'); t('Grand Total',            totX + 4,        ty + gtH/2 + 0.5);
  sf(9.5, 'bold'); t(`${RS}${fm(total_amount)}`, totX + totW - 3, ty + gtH/2 + 0.5, { align:'right' });
  pdf.setTextColor(0, 0, 0);
  ty += gtH;

  y = Math.max(gy, ty);
  vl(totX, secTop, y);
  hl(y, ML, ML + CW, 0.3);

  // ─────────────────────────────────────────────────────────────
  // 7. AMOUNT IN WORDS
  // ─────────────────────────────────────────────────────────────
  fb(ML, y, CW, awH, 248, 249, 250);
  sf(7.5, 'bold');   t('Amount in Words:', ML+2, y+6);
  sf(7.5, 'normal'); t(numberToWords(Number(total_amount)), ML+37, y+6);
  hl(y + awH, ML, ML + CW, 0.3);
  y += awH;

  // ─────────────────────────────────────────────────────────────
  // 8. BANK DETAILS + QR — anchored at bankStart
  // ─────────────────────────────────────────────────────────────
  y = Math.max(y, bankStart);

  const bankW    = Math.round(CW * 0.58);
  const qrBlockW = CW - bankW;
  vl(ML + bankW, y, y + bankQrH);

  sf(8, 'bold'); t('Bank Details', ML+2, y+7);
  let bankY = y + 13;
  const bankLine = (label, val) => {
    if (!val) return;
    sf(7,'bold');   t(label, ML+2, bankY);
    sf(7,'normal'); t(val,   ML+28, bankY);
    bankY += 5;
  };
  bankLine('Bank Name   :', bank_name);
  bankLine('Account No. :', bank_account_no);
  bankLine('IFSC Code   :', bank_ifsc);
  bankLine('Branch      :', bank_branch);
  if (upi_id) bankLine('UPI ID      :', upi_id);
  if (notes) {
    bankY += 2;
    sf(7,'bold'); t('Notes:', ML+2, bankY);
    sf(6.5,'normal');
    pdf.splitTextToSize(notes, bankW - 6).slice(0,3).forEach((l, i) => t(l, ML+2, bankY+4+i*3.2));
  }

  if (qrImg) {
    const qrSz = 30;
    pdf.addImage(qrImg, 'PNG', ML + bankW + (qrBlockW - qrSz)/2, y + 3, qrSz, qrSz);
    sf(6, 'normal'); t('Scan to verify', ML + bankW + qrBlockW/2, y + qrSz + 6, { align:'center' });
  }
  sf(7, 'bold');   t('For ' + seller_name, ML + bankW + 3, y + bankQrH - 12);
  sf(6.5,'normal'); t('Authorised Signatory', ML + bankW + 3, y + bankQrH - 5);

  hl(y + bankQrH, ML, ML + CW, 0.3);
  y += bankQrH;

  // ─────────────────────────────────────────────────────────────
  // 9. TERMS & CONDITIONS (right after bank, before footer)
  // ─────────────────────────────────────────────────────────────
  if (terms_and_conditions && termsH > 0) {
    sf(7, 'bold');   t('Terms & Conditions:', ML+2, y+5);
    sf(6.5,'normal');
    const tcLines = pdf.splitTextToSize(terms_and_conditions, CW - 6);
    tcLines.slice(0, 5).forEach((l, i) => t(l, ML+2, y+10+i*3.5));
    hl(y + termsH, ML, ML + CW, 0.25);
    y += termsH;
  }

  // ─────────────────────────────────────────────────────────────
  // 10. FOOTER (at very bottom)
  // ─────────────────────────────────────────────────────────────
  fb(ML, BOTTOM - footerH, CW, footerH, 248, 249, 250);
  sf(6.5,'normal'); pdf.setTextColor(110, 110, 110);
  t('This is a computer generated invoice.', ML+2, BOTTOM - footerH/2 + 1);
  t('Subject to Aligarh Jurisdiction.', ML+CW-2, BOTTOM - footerH/2 + 1, { align:'right' });
  pdf.setTextColor(0, 0, 0);

  // ─────────────────────────────────────────────────────────────
  // OUTER BORDER — full A4 height, drawn last
  // ─────────────────────────────────────────────────────────────
  pdf.setLineWidth(0.5);
  pdf.rect(ML, MT, CW, BOTTOM - MT);

  return pdf;
}
