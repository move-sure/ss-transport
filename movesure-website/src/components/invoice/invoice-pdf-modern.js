'use client';

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// ── Indian number-to-words (duplicated small helper — kept local so this
// template has no dependency on invoice-pdf.js internals) ──────────────────
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

const RS = 'Rs.';
const fm = (n) => Number(n || 0).toFixed(2);

// ── Modern template: cards + flowing layout, indigo accent ──────────────────
export async function generateInvoicePDFModern(data) {
  const {
    invoice_no = '', invoice_date, due_date, invoice_type = 'TAX_INVOICE',
    seller_name = '', seller_gstin = '', seller_pan = '',
    seller_address = '', seller_state_code = '',
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

  const PW = 210, PH = 297;
  const ML = 10, MR = 10, MT = 10;
  const CW = PW - ML - MR;
  const BOTTOM = PH - MT;

  let qrImg = null;
  try {
    qrImg = await QRCode.toDataURL(
      `Invoice: ${invoice_no}\nDate: ${fmtDate(invoice_date)}\nFrom: ${seller_name}\nTo: ${buyer_name}\nAmt: Rs.${fm(total_amount)}`,
      { width: 120, margin: 1 }
    );
  } catch (_) {}

  const sf = (sz, wt = 'normal', fam = 'helvetica') => { pdf.setFont(fam, wt); pdf.setFontSize(sz); };
  const t  = (s, x, y, opts = {}) => pdf.text(String(s ?? ''), x, y, opts);
  const hl = (y, x1 = ML, x2 = ML + CW, lw = 0.2) => {
    pdf.setDrawColor(210, 210, 210);
    pdf.setLineWidth(lw);
    pdf.line(x1, y, x2, y);
    pdf.setDrawColor(0, 0, 0);
  };
  const fb = (x, y, w, h, r, g, b) => { pdf.setFillColor(r, g, b); pdf.rect(x, y, w, h, 'F'); };
  // style 'F' colors the fill, 'S' colors the stroke — set whichever the style uses,
  // then restore a neutral draw color so later hl() calls aren't tinted.
  const rr = (x, y, w, h, r2, style, cr, cg, cb) => {
    if ([cr, cg, cb].every((v) => v !== undefined)) {
      if (style === 'F') pdf.setFillColor(cr, cg, cb);
      else pdf.setDrawColor(cr, cg, cb);
    }
    pdf.roundedRect(x, y, w, h, r2, r2, style);
    pdf.setDrawColor(0, 0, 0);
  };
  function fmtDate(d) { try { return new Date(d).toLocaleDateString('en-GB'); } catch { return d || ''; } }

  const hasIGST = Number(total_igst) > 0;
  const titleLabel = {
    TAX_INVOICE:'TAX INVOICE', BILL_OF_SUPPLY:'BILL OF SUPPLY',
    PROFORMA:'PROFORMA INVOICE', CREDIT_NOTE:'CREDIT NOTE',
    DEBIT_NOTE:'DEBIT NOTE', DELIVERY_CHALLAN:'DELIVERY CHALLAN',
  }[invoice_type] || 'INVOICE';

  // Palette
  const INDIGO = [67, 56, 202];      // header band
  const INDIGO_LIGHT = [238, 240, 253];
  const INDIGO_BORDER = [199, 204, 245];
  const SLATE = [71, 85, 105];
  const SLATE_LIGHT = [248, 250, 252];

  let y = MT;

  // ─────────────────────────────────────────────────────────────
  // 1. HEADER BAND
  // ─────────────────────────────────────────────────────────────
  const bandH = 26;
  rr(ML, y, CW, bandH, 3, 'F', ...INDIGO);
  pdf.setTextColor(255, 255, 255);
  sf(13, 'bold'); t(seller_name, ML + 5, y + 9);
  sf(7.5, 'normal');
  const sellerLine = [seller_gstin && `GSTIN: ${seller_gstin}`, seller_pan && `PAN: ${seller_pan}`, seller_state_code && `State: ${seller_state_code}`]
    .filter(Boolean).join('   ');
  t(sellerLine, ML + 5, y + 15);
  const addrW = pdf.splitTextToSize(seller_address, CW * 0.6);
  t(addrW.slice(0, 1)[0] || '', ML + 5, y + 20.5);

  sf(12, 'bold'); t(titleLabel, ML + CW - 5, y + 9, { align: 'right' });
  sf(7.5, 'normal');
  t(`Invoice #: ${invoice_no || '—'}`, ML + CW - 5, y + 15, { align: 'right' });
  t(`Date: ${fmtDate(invoice_date)}${due_date ? '   Due: ' + fmtDate(due_date) : ''}`, ML + CW - 5, y + 20, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
  y += bandH + 5;

  // ─────────────────────────────────────────────────────────────
  // 2. BILL TO (left card) | INVOICE DETAILS (right card)
  // ─────────────────────────────────────────────────────────────
  const gap = 4;
  const leftW = Math.round(CW * 0.52);
  const rightW = CW - leftW - gap;
  const rightX = ML + leftW + gap;

  const bAddr = billing_address ? pdf.splitTextToSize(billing_address, leftW - 8) : [];
  let leftLines = 2 + Math.min(2, bAddr.length);
  if (buyer_gstin) leftLines++;
  if (buyer_pan) leftLines++;
  if (buyer_aadhar_number) leftLines++;
  if (buyer_state || buyer_state_code) leftLines++;
  const leftH = Math.max(30, leftLines * 4.6 + 8);

  const metaRows = [
    { l: 'Supply Type', v: supply_type },
    { l: 'Place of Supply', v: place_of_supply || '—' },
    ...(pvt_marks ? [{ l: 'Pvt Marks', v: pvt_marks }] : []),
    ...(is_reverse_charge ? [{ l: 'Reverse Charge', v: 'Yes' }] : []),
    ...(po_number ? [{ l: "Buyer's P.O.", v: po_number }] : []),
    ...(po_date ? [{ l: 'P.O. Date', v: fmtDate(po_date) }] : []),
    ...(gr_no ? [{ l: 'GR / Ref No.', v: gr_no }] : []),
    ...(transport_name ? [{ l: 'Transport', v: transport_name }] : []),
    ...(e_way_bill ? [{ l: 'E-Way Bill', v: e_way_bill }] : []),
  ];
  const rightH = Math.max(leftH, metaRows.length * 4.6 + 10);
  const cardH = Math.max(leftH, rightH);

  // Left card
  rr(ML, y, leftW, cardH, 2, 'S', ...INDIGO_BORDER);
  fb(ML, y, 2, cardH, ...INDIGO);
  sf(7, 'bold'); pdf.setTextColor(...INDIGO); t('BILL TO', ML + 5, y + 6);
  pdf.setTextColor(0, 0, 0);
  sf(9, 'bold'); t(buyer_name, ML + 5, y + 12);
  let ly = y + 12;
  sf(7, 'normal');
  bAddr.slice(0, 2).forEach((l, i) => { ly += 4.2; t(l, ML + 5, ly); });
  const bline = (label, val) => {
    if (!val) return;
    ly += 4.4;
    sf(6.8, 'bold'); t(label + ':', ML + 5, ly);
    sf(6.8, 'normal'); t(val, ML + 22, ly);
  };
  bline('GSTIN', buyer_gstin);
  bline('PAN', buyer_pan);
  bline('Aadhaar', buyer_aadhar_number);
  if (buyer_state || buyer_state_code) {
    bline('State', [buyer_state, buyer_state_code ? `(${buyer_state_code})` : ''].filter(Boolean).join(' '));
  }

  // Right card
  rr(rightX, y, rightW, cardH, 2, 'S', ...INDIGO_BORDER);
  fb(rightX, y, 2, cardH, ...INDIGO);
  sf(7, 'bold'); pdf.setTextColor(...INDIGO); t('INVOICE DETAILS', rightX + 5, y + 6);
  pdf.setTextColor(0, 0, 0);
  let ry = y + 6;
  metaRows.forEach(({ l, v }) => {
    ry += 4.6;
    sf(6.8, 'bold'); t(l + ':', rightX + 5, ry);
    sf(6.8, 'normal'); t(String(v), rightX + rightW * 0.45, ry);
  });

  y += cardH + 6;

  // ─────────────────────────────────────────────────────────────
  // 3. ITEMS TABLE — compact columns, combined GST column
  // ─────────────────────────────────────────────────────────────
  const cols = [
    { h: 'Sl', w: 8, a: 'center' },
    { h: 'Item / Service', w: 52, a: 'left' },
    { h: 'HSN', w: 18, a: 'center' },
    { h: 'Qty', w: 12, a: 'center' },
    { h: 'Rate', w: 20, a: 'right' },
    { h: 'Taxable', w: 24, a: 'right' },
    { h: hasIGST ? 'IGST' : 'GST', w: 32, a: 'center' },
    { h: 'Total', w: 24, a: 'right' },
  ]; // 8+52+18+12+20+24+32+24 = 190

  const thH = 8;
  rr(ML, y, CW, thH, 1.5, 'F', ...INDIGO_LIGHT);
  let cx = ML;
  cols.forEach((col) => {
    sf(7, 'bold'); pdf.setTextColor(...INDIGO);
    const tx = col.a === 'right' ? cx + col.w - 3 : col.a === 'left' ? cx + 3 : cx + col.w / 2;
    t(col.h, tx, y + thH / 2 + 1.5, { align: col.a });
    cx += col.w;
  });
  pdf.setTextColor(0, 0, 0);
  y += thH;

  line_items.forEach((item, idx) => {
    const taxable = Number(item.taxable_amount || 0);
    const cgstAmt = Number(item.cgst_amount || 0);
    const sgstAmt = Number(item.sgst_amount || 0);
    const igstAmt = Number(item.igst_amount || 0);
    const gstRate = Number(item.gst_rate || 0);
    const lineTotal = Number(item.total_amount || 0);
    const rowH = 7.5;

    if (idx % 2 === 1) fb(ML, y, CW, rowH, ...SLATE_LIGHT);

    const gstCell = hasIGST
      ? `${gstRate}%  (${RS}${fm(igstAmt)})`
      : `${gstRate}%  (${RS}${fm(cgstAmt + sgstAmt)})`;

    const vals = [
      String(idx + 1), item.item_name || '', item.hsn_sac_code || '—',
      fm(item.quantity), fm(item.rate), fm(taxable), gstCell, fm(lineTotal),
    ];

    let cx2 = ML;
    vals.forEach((val, ci) => {
      const col = cols[ci];
      sf(7, 'normal');
      const tx2 = col.a === 'right' ? cx2 + col.w - 3 : col.a === 'left' ? cx2 + 3 : cx2 + col.w / 2;
      if (ci === 1) {
        const wrapped = pdf.splitTextToSize(val, col.w - 5);
        t(wrapped[0] || '', tx2, y + rowH / 2 + 1.5, { align: 'left' });
      } else {
        t(val, tx2, y + rowH / 2 + 1.5, { align: col.a });
      }
      cx2 += col.w;
    });
    hl(y + rowH, ML, ML + CW, 0.12);
    y += rowH;
  });

  y += 4;

  // ─────────────────────────────────────────────────────────────
  // 4. GST BREAKUP (compliance) — compact card
  // ─────────────────────────────────────────────────────────────
  const gstCols = hasIGST ? [
    { h: 'HSN/SAC', w: 30, a: 'center' },
    { h: 'Taxable (Rs.)', w: 45, a: 'right' },
    { h: 'IGST Rate', w: 25, a: 'center' },
    { h: 'IGST Amt (Rs.)', w: CW - 100, a: 'right' },
  ] : [
    { h: 'HSN/SAC', w: 26, a: 'center' },
    { h: 'Taxable (Rs.)', w: 38, a: 'right' },
    { h: 'CGST', w: 30, a: 'center' },
    { h: 'SGST', w: 30, a: 'center' },
    { h: 'Total Tax (Rs.)', w: CW - 124, a: 'right' },
  ];
  const gstH = 7;
  rr(ML, y, CW, gstH, 1.5, 'F', ...SLATE_LIGHT);
  let gcx = ML;
  gstCols.forEach((gc) => {
    sf(6.5, 'bold'); pdf.setTextColor(...SLATE);
    const gtx = gc.a === 'right' ? gcx + gc.w - 3 : gcx + gc.w / 2;
    t(gc.h, gtx, y + gstH / 2 + 1.3, { align: gc.a });
    gcx += gc.w;
  });
  pdf.setTextColor(0, 0, 0);
  y += gstH;

  const gstRowH = 6;
  line_items.forEach((item, idx) => {
    const taxable = Number(item.taxable_amount || 0);
    const cgst = Number(item.cgst_amount || 0);
    const sgst = Number(item.sgst_amount || 0);
    const igst = Number(item.igst_amount || 0);
    const rate = Number(item.gst_rate || 0);
    const gVals = hasIGST
      ? [item.hsn_sac_code || '', fm(taxable), `${rate}%`, fm(igst)]
      : [item.hsn_sac_code || '', fm(taxable), `${rate / 2}%`, `${rate / 2}%`, fm(cgst + sgst)];
    let gcx2 = ML;
    gVals.forEach((val, gi) => {
      const gc = gstCols[gi];
      sf(6.8, 'normal');
      const gtx = gc.a === 'right' ? gcx2 + gc.w - 3 : gcx2 + gc.w / 2;
      t(val, gtx, y + gstRowH / 2 + 1.3, { align: gc.a });
      gcx2 += gc.w;
    });
    hl(y + gstRowH, ML, ML + CW, 0.1);
    y += gstRowH;
  });

  const itemsEndY = y;

  // ─────────────────────────────────────────────────────────────
  // Pre-calculate the heights of everything below the tables so the
  // whole totals/bank/terms block can be anchored to the bottom of
  // the page — leaving open white space between it and the tables,
  // instead of it trailing immediately after the item rows.
  // ─────────────────────────────────────────────────────────────
  const totRows = [
    { label: 'Taxable Amount', val: `${RS}${fm(taxable_amount)}` },
    ...(hasIGST
      ? [{ label: 'IGST', val: `${RS}${fm(total_igst)}` }]
      : [
          { label: 'CGST', val: `${RS}${fm(total_cgst)}` },
          { label: 'SGST', val: `${RS}${fm(total_sgst)}` },
        ]),
    ...(Number(round_off) !== 0 ? [{ label: 'Round Off', val: `${RS}${fm(round_off)}` }] : []),
  ];
  const totCardW = Math.round(CW * 0.42);
  const totCardX = ML + CW - totCardW;
  const totRowH = 5.5;
  const grandH = 10;
  const totCardH = totRows.length * totRowH + grandH + 6;

  const bankCardH = 34;
  const footerH = 8;
  const notesH = notes ? 5 : 0;
  const termsH = terms_and_conditions
    ? (8 + Math.min(3, pdf.splitTextToSize(terms_and_conditions, CW - 6).length) * 3.5)
    : 0;

  const bottomBlockH = totCardH + 6 + bankCardH + 5 + notesH + termsH;
  const secTop = Math.max(itemsEndY + 5, BOTTOM - footerH - bottomBlockH);

  y = secTop;

  // ─────────────────────────────────────────────────────────────
  // 5. AMOUNT IN WORDS (left) | TOTALS CARD (right)
  // ─────────────────────────────────────────────────────────────
  const wordsW = CW - totCardW - 6;
  sf(7, 'bold'); t('Amount in Words', ML + 2, y + 5);
  sf(7.5, 'normal');
  pdf.splitTextToSize(numberToWords(Number(total_amount)), wordsW).slice(0, 3)
    .forEach((l, i) => t(l, ML + 2, y + 10 + i * 4));

  rr(totCardX, y, totCardW, totCardH, 2, 'S', ...INDIGO_BORDER);
  let tty = y + 5;
  totRows.forEach(({ label, val }) => {
    sf(7.2, 'normal'); t(label, totCardX + 4, tty);
    sf(7.2, 'bold'); t(val, totCardX + totCardW - 4, tty, { align: 'right' });
    tty += totRowH;
  });
  rr(totCardX, tty, totCardW, grandH, 0, 'F', ...INDIGO);
  pdf.setTextColor(255, 255, 255);
  sf(8, 'bold'); t('Grand Total', totCardX + 4, tty + grandH / 2 + 1.5);
  sf(9.5, 'bold'); t(`${RS}${fm(total_amount)}`, totCardX + totCardW - 4, tty + grandH / 2 + 1.5, { align: 'right' });
  pdf.setTextColor(0, 0, 0);

  y += totCardH + 6;

  // ─────────────────────────────────────────────────────────────
  // 6. BANK DETAILS + QR CARD
  // ─────────────────────────────────────────────────────────────
  rr(ML, y, CW, bankCardH, 2, 'S', ...INDIGO_BORDER);
  sf(7.5, 'bold'); pdf.setTextColor(...INDIGO); t('BANK DETAILS', ML + 5, y + 6);
  pdf.setTextColor(0, 0, 0);

  // QR sits on the left under the heading; bank detail lines start clear of it.
  const qrSz = 20;
  const bankTextX = ML + 5 + qrSz + 8;
  if (qrImg) {
    pdf.addImage(qrImg, 'PNG', ML + 5, y + 9, qrSz, qrSz);
    sf(6, 'normal'); t('Scan to verify', ML + 5 + qrSz / 2, y + 9 + qrSz + 3, { align: 'center' });
  }

  let bky = y + 6;
  const bankLine = (label, val) => {
    if (!val) return;
    bky += 4.6;
    sf(6.8, 'bold'); t(label, bankTextX, bky);
    sf(6.8, 'normal'); t(val, bankTextX + 26, bky);
  };
  bankLine('Bank Name', bank_name);
  bankLine('Account No.', bank_account_no);
  bankLine('IFSC Code', bank_ifsc);
  bankLine('Branch', bank_branch);
  if (upi_id) bankLine('UPI ID', upi_id);

  sf(7.5, 'bold'); t('For ' + seller_name, ML + CW - 5, y + bankCardH - 12, { align: 'right' });
  sf(6.5, 'normal'); t('Authorised Signatory', ML + CW - 5, y + bankCardH - 5, { align: 'right' });

  y += bankCardH + 5;

  if (notes) {
    sf(7, 'bold'); t('Notes:', ML + 2, y);
    sf(6.8, 'normal');
    const nLines = pdf.splitTextToSize(notes, CW - 20);
    t(nLines[0] || '', ML + 18, y);
    y += notesH;
  }

  // ─────────────────────────────────────────────────────────────
  // 7. TERMS & CONDITIONS
  // ─────────────────────────────────────────────────────────────
  if (terms_and_conditions) {
    sf(7, 'bold'); t('Terms & Conditions:', ML + 2, y + 3);
    sf(6.5, 'normal');
    const tcLines = pdf.splitTextToSize(terms_and_conditions, CW - 6);
    tcLines.slice(0, 3).forEach((l, i) => t(l, ML + 2, y + 7.5 + i * 3.5));
    y += termsH;
  }

  // ─────────────────────────────────────────────────────────────
  // 8. FOOTER (pinned to bottom)
  // ─────────────────────────────────────────────────────────────
  fb(ML, BOTTOM - footerH, CW, footerH, ...SLATE_LIGHT);
  sf(6.5, 'normal'); pdf.setTextColor(...SLATE);
  t('This is a computer generated invoice.', ML + 4, BOTTOM - footerH / 2 + 1);
  t('Subject to Aligarh Jurisdiction.', ML + CW - 4, BOTTOM - footerH / 2 + 1, { align: 'right' });
  pdf.setTextColor(0, 0, 0);

  // ─────────────────────────────────────────────────────────────
  // OUTER BORDER — full page frame, drawn last
  // ─────────────────────────────────────────────────────────────
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(ML, MT, CW, BOTTOM - MT);

  return pdf;
}
