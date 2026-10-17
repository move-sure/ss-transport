// Template 2 (Modern, black & white) - alternate bilty print layout.
// Two copies on one A4 sheet (top copy + DRIVER copy), each inside its own 148.5mm half.
// Every block has a fixed box so nothing overlaps:
//   copy type (top centre)  y 6        header (logo + company + contacts, QR top-right)  y 8-28
//   date | from TO destination (code) | GR no   y 30-44
//   consignor | consignee   y 47-68      delivery bar   y 71-79
//   goods table + invoice & e-way bill  y 82-123
//   payment / delivery badge + charges panel (max 7 rows)  y 82-126
//   footer: bank, terms, care, signature  y 127-146
// Same input as template1 (+ optional `logo`); returns a jsPDF.

import { jsPDF } from 'jspdf';

const PAGE_W = 210;
const M = 8;                       // side margin
const RIGHT = PAGE_W - M;          // 202
const CONTENT_W = PAGE_W - M * 2;  // 194
const COPY_H = 148.5;              // half an A4 page

// Black & white palette (greys only)
const K = {
  black: [0, 0, 0],
  ink: [20, 20, 20],
  dark: [60, 60, 60],
  muted: [105, 105, 105],
  line: [170, 170, 170],
  soft: [242, 242, 242],
  white: [255, 255, 255]
};

const TERMS =
  "The consignment will not be diverted, re-routed or re-booked without the consignee's written permission " +
  "and will not be delivered without the original consignment note. Goods are booked at owner's risk. " +
  'We are not responsible for leakage or illegal goods. All subject to Aligarh jurisdiction.';

// ---------- drawing helpers ----------
const font = (pdf, size, style = 'normal', color = K.ink) => {
  pdf.setFont('helvetica', style);
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
};
const fill = (pdf, color) => pdf.setFillColor(...color);
const stroke = (pdf, color, width = 0.3) => { pdf.setDrawColor(...color); pdf.setLineWidth(width); };

// Shorten text with ".." so it fits in maxWidth (mm) at the current font
const fit = (pdf, text, maxWidth) => {
  let t = String(text ?? '');
  if (pdf.getTextWidth(t) <= maxWidth) return t;
  while (t.length > 1 && pdf.getTextWidth(`${t}..`) > maxWidth) t = t.slice(0, -1);
  return `${t}..`;
};

const label = (pdf, text, x, y, opts) => {
  font(pdf, 6.3, 'bold', K.muted);
  pdf.text(text.toUpperCase(), x, y, opts);
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '');
const money = (n) => (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const paymentText = (mode, deliveryType) => {
  const m = (mode || '').toLowerCase();
  const text = m === 'paid' ? 'PAID' : m === 'freeofcost' ? 'FOC' : m === 'to-pay' ? 'TO PAY' : (mode || '').toUpperCase();
  return deliveryType === 'door-delivery' ? `${text} / DD` : text;
};

const idLine = (gst) => {
  const g = gst || '';
  if (g.startsWith('AD-')) return `AADHAR: ${g.replace('AD-', '')}`;
  if (g.toLowerCase().startsWith('pan')) return `PAN: ${g.substring(3)}`;
  return `GSTIN: ${g || '-'}`;
};

// ---------- one copy ----------
const drawCopy = (pdf, y0, copyType, d, showCharges) => {
  const { bilty, header, fromCity, toCity, transport, qrDataURL, signature, logo } = d;

  // ── Copy type, top centre (y 6) ───────────────────────────────
  font(pdf, 8, 'bold', K.black);
  const copyLabel = `${copyType} COPY`;
  pdf.text(copyLabel, PAGE_W / 2, y0 + 6, { align: 'center' });
  const copyW = pdf.getTextWidth(copyLabel) + 4;
  stroke(pdf, K.black, 0.3);
  pdf.line(PAGE_W / 2 - copyW / 2, y0 + 7, PAGE_W / 2 + copyW / 2, y0 + 7);

  // ── Header: logo + company (y 8-28) ───────────────────────────
  let textX = M;
  if (logo?.dataURL) {
    const h = 16;
    const w = Math.min(28, h * (logo.width / logo.height));
    try {
      pdf.addImage(logo.dataURL, 'PNG', M, y0 + 8.5, w, h);
      textX = M + w + 3;
    } catch { /* draw without logo */ }
  }
  const nameWidth = 180 - textX; // QR sits at x 184
  font(pdf, 15, 'bold', K.black);
  pdf.text(fit(pdf, (header?.transport_name || 'TRANSPORT').toUpperCase(), nameWidth), textX, y0 + 14.8);

  // address (1-2 lines) then GSTIN | Mob | website below it
  font(pdf, 7.3, 'normal', K.dark);
  const addr = pdf.splitTextToSize((header?.transport_address || '').replace(/\n/g, ', '), nameWidth).slice(0, 2);
  pdf.text(addr, textX, y0 + 19);
  const contacts = [
    `GSTIN: ${header?.gst || '-'}`,
    header?.mobile_number && `Mob: ${header.mobile_number}`,
    header?.website && header.website.replace(/^https?:\/\//, '').replace(/\/$/, '').toUpperCase()
  ].filter(Boolean).join('   |   ');
  font(pdf, 7.5, 'bold', K.black);
  pdf.text(fit(pdf, contacts, nameWidth), textX, y0 + (addr.length > 1 ? 25.3 : 23));

  // QR top-right
  if (qrDataURL) {
    try { pdf.addImage(qrDataURL, 'PNG', 184.5, y0 + 8.5, 17.5, 17.5); } catch { /* ignore bad image */ }
  }

  stroke(pdf, K.black, 0.9);
  pdf.line(M, y0 + 27, RIGHT, y0 + 27);
  stroke(pdf, K.black, 0.2);
  pdf.line(M, y0 + 28.2, RIGHT, y0 + 28.2);

  // ── Date | route | GR no (y 30-44) ────────────────────────────
  const sy = y0 + 30;
  label(pdf, 'Date', M + 1, sy + 4.3);
  font(pdf, 10.5, 'bold', K.black);
  pdf.text(fmtDate(bilty.bilty_date), M + 1, sy + 10.8);

  // FROM TO DESTINATION (CITY CODE)
  label(pdf, 'Route', M + 31, sy + 4.3);
  font(pdf, 10.5, 'bold', K.black);
  const code = toCity?.city_code ? ` (${toCity.city_code})` : '';
  const route = `${(fromCity?.city_name || '').toUpperCase()}  TO  ${(toCity?.city_name || '').toUpperCase()}${code}`;
  pdf.text(fit(pdf, route, 105), M + 31, sy + 10.8);

  // GR number box on the right
  const grX = 146;
  stroke(pdf, K.black, 0.8);
  pdf.roundedRect(grX, sy, RIGHT - grX, 14, 1.5, 1.5, 'S');
  label(pdf, 'GR Number', grX + 3, sy + 4.3);
  font(pdf, 15, 'bold', K.black);
  pdf.text(fit(pdf, bilty.gr_no || '', RIGHT - grX - 6), grX + 3, sy + 11.4);

  // ── Parties (y 47-68) ─────────────────────────────────────────
  const py = y0 + 47;
  const cardW = (CONTENT_W - 2) / 2; // 96
  const party = (x, title, name, gst, mob) => {
    stroke(pdf, K.line, 0.3);
    pdf.roundedRect(x, py, cardW, 21, 1.5, 1.5, 'S');
    fill(pdf, K.black);
    pdf.rect(x, py + 2.5, 1.1, 16, 'F');
    label(pdf, title, x + 4, py + 5);
    font(pdf, 10, 'bold', K.black);
    pdf.text(fit(pdf, (name || '-').toUpperCase(), cardW - 7), x + 4, py + 10.6);
    font(pdf, 7.6, 'normal', K.ink);
    pdf.text(fit(pdf, idLine(gst), cardW - 7), x + 4, py + 15);
    if (mob) pdf.text(fit(pdf, `Mob: ${mob}`, cardW - 7), x + 4, py + 18.8);
  };
  party(M, 'Consignor', bilty.consignor_name, bilty.consignor_gst, bilty.consignor_number);
  party(M + cardW + 2, 'Consignee', bilty.consignee_name, bilty.consignee_gst, bilty.consignee_number);


  // ── Delivery bar (y 71-79) ────────────────────────────────────
  const dy = y0 + 71;
  fill(pdf, K.soft);
  pdf.roundedRect(M, dy, CONTENT_W, 8, 1.2, 1.2, 'F');
  const tName = transport?.transport_name || bilty.transport_name || '-';
  const tGst = transport?.gst_number || bilty.transport_gst || '';
  const tMob = transport?.mob_number || bilty.transport_number || '';
  label(pdf, 'Delivery at', M + 3, dy + 5.2);
  font(pdf, 8.3, 'bold', K.black);
  pdf.text(fit(pdf, tName.toUpperCase(), 92), M + 20, dy + 5.3);
  font(pdf, 7.5, 'normal', K.ink);
  pdf.text(fit(pdf, `GSTIN: ${tGst || '-'}${tMob ? `   |   Mob: ${tMob}` : ''}`, 78), RIGHT - 3, dy + 5.3, { align: 'right' });

  // ── Goods table (y 82-100) ────────────────────────────────────
  const gy = y0 + 82;
  const gw = 126;
  const cols = [
    { title: 'Pvt Marks / Pkgs', w: 48, value: `${bilty.pvt_marks || '-'} / ${bilty.no_of_pkg ?? 0}` },
    { title: 'Content', w: 48, value: (bilty.contain || '-').toUpperCase() },
    { title: 'Weight', w: 30, value: `${bilty.wt ?? 0} KG` }
  ];
  fill(pdf, K.black);
  pdf.roundedRect(M, gy, gw, 7, 1.2, 1.2, 'F');
  pdf.rect(M, gy + 3.5, gw, 3.5, 'F');
  stroke(pdf, K.black, 0.4);
  pdf.rect(M, gy + 7, gw, 11, 'S');
  let cx = M;
  cols.forEach((col, i) => {
    font(pdf, 6.6, 'bold', K.white);
    pdf.text(col.title.toUpperCase(), cx + col.w / 2, gy + 4.8, { align: 'center' });
    font(pdf, i === 0 ? 12 : 10, 'bold', K.black);
    pdf.text(fit(pdf, col.value, col.w - 3), cx + col.w / 2, gy + 14.2, { align: 'center' });
    cx += col.w;
    if (i < cols.length - 1) {
      stroke(pdf, K.line, 0.3);
      pdf.line(cx, gy + 7, cx, gy + 18);
    }
  });

  // Invoice details + e-way bill (y 103-123)
  const iy = gy + 21;
  stroke(pdf, K.line, 0.3);
  pdf.roundedRect(M, iy, gw, 20, 1.2, 1.2, 'S');
  [
    ['Invoice No', bilty.invoice_no || '-'],
    ['Invoice Date', fmtDate(bilty.invoice_date) || '-'],
    ['Invoice Value', bilty.invoice_value ? `Rs. ${money(bilty.invoice_value)}` : '-']
  ].forEach(([t, v], i) => {
    const x = M + 4 + i * 42;
    label(pdf, t, x, iy + 4.8);
    font(pdf, 9, 'bold', K.black);
    pdf.text(fit(pdf, v, 38), x, iy + 9.4);
  });
  label(pdf, 'E-Way Bill', M + 4, iy + 14);
  font(pdf, 8.5, 'bold', K.black);
  pdf.text(fit(pdf, bilty.e_way_bill || '-', gw - 8), M + 4, iy + 18.2);

  // ── Payment badge + charges panel (x 138-202, y 82 - max 126) ─
  const chx = M + gw + 4;
  const chw = RIGHT - chx;
  const z = (v) => (showCharges ? Number(v) || 0 : 0);
  const freight = showCharges ? (bilty.freight_amount || Math.round((parseFloat(bilty.wt) || 0) * (parseFloat(bilty.rate) || 0))) : 0;
  const rows = [
    ['Freight', freight],
    ['Labour Charge', z(bilty.labour_charge)],
    ['Bilty Charge', z(bilty.bill_charge)],
    ['Toll Tax', z(bilty.toll_charge)],
    ['PF Charge', z(bilty.pf_charge)],
    ['Other Charge', z(bilty.other_charge)]
  ];
  if (z(bilty.dd_charge) > 0) rows.push(['Door Delivery', z(bilty.dd_charge)]);

  // payment / delivery badge (y 82-90)
  const pay = paymentText(bilty.payment_mode, bilty.delivery_type);
  stroke(pdf, K.black, 0.8);
  pdf.roundedRect(chx, gy, chw, 8, 1.2, 1.2, 'S');
  label(pdf, bilty.delivery_type === 'door-delivery' ? 'Payment / Delivery' : 'Payment', chx + 3, gy + 5.1);
  font(pdf, 11, 'bold', K.black);
  pdf.text(fit(pdf, pay, chw - 30), chx + chw - 3, gy + 5.7, { align: 'right' });

  const panelY = gy + 10;
  const rowH = 3.5;
  const totalH = 7.5;
  const panelH = rows.length * rowH + 1.5 + totalH;
  stroke(pdf, K.black, 0.4);
  pdf.roundedRect(chx, panelY, chw, panelH, 1.2, 1.2, 'S');
  rows.forEach(([t, v], i) => {
    const ry = panelY + 3.4 + i * rowH;
    font(pdf, 7.6, 'normal', K.dark);
    pdf.text(t, chx + 3, ry);
    font(pdf, 8.3, 'bold', K.black);
    pdf.text(money(v), chx + chw - 3, ry, { align: 'right' });
  });
  const ty = panelY + panelH - totalH;
  fill(pdf, K.black);
  pdf.roundedRect(chx, ty, chw, totalH, 1.2, 1.2, 'F');
  pdf.rect(chx, ty, chw, 4, 'F');
  font(pdf, 8, 'bold', K.white);
  pdf.text('TOTAL', chx + 3, ty + 5.1);
  font(pdf, 11.5, 'bold', K.white);
  pdf.text(fit(pdf, `Rs. ${money(showCharges ? bilty.total : 0)}`, chw - 18), chx + chw - 3, ty + 5.4, { align: 'right' });

  // ── Footer (y 127-146) ────────────────────────────────────────
  const fy = y0 + 127;
  stroke(pdf, K.line, 0.3);
  pdf.line(M, fy, RIGHT, fy);

  const banks = [
    header?.bank_act_no_1 && `A/C ${header.bank_act_no_1}  IFSC ${header.ifsc_code_1 || '-'}`,
    header?.bank_act_no_2 && `A/C ${header.bank_act_no_2}  IFSC ${header.ifsc_code_2 || '-'}`
  ].filter(Boolean);
  if (banks.length) {
    label(pdf, 'Bank', M, fy + 4.3);
    font(pdf, 7.2, 'bold', K.black);
    pdf.text(fit(pdf, banks.join('   |   '), 124), M + 9, fy + 4.4);
  }

  font(pdf, 5.9, 'normal', K.muted);
  pdf.text(pdf.splitTextToSize(TERMS, 134).slice(0, 3), M, fy + 8.3);

  const care = [header?.mobile_number && `Customer care: ${header.mobile_number}`,
    header?.website && header.website.replace(/^https?:\/\//, '').replace(/\/$/, '')].filter(Boolean).join('   |   ');
  if (care) {
    font(pdf, 7, 'bold', K.black);
    pdf.text(fit(pdf, care, 134), M, fy + 17.8);
  }

  // signature block (x 150-202)
  const sx = 150;
  const sMid = (sx + RIGHT) / 2;
  if (signature) {
    // The signature image is a transparent square whose ink sits in a band ~46%-60% of its height;
    // size it so that band is ~44mm wide and ends just above the signature line.
    const sz = 44;
    try { pdf.addImage(signature, 'PNG', sMid - sz / 2, fy + 14 - sz * 0.6, sz, sz); } catch { /* ignore */ }
  }
  stroke(pdf, K.black, 0.3);
  pdf.line(sx, fy + 15, RIGHT, fy + 15);
  font(pdf, 6.8, 'bold', K.black);
  pdf.text('AUTHORISED SIGNATORY', sMid, fy + 18.5, { align: 'center' });
};

/**
 * Build the bilty PDF (Modern black & white layout).
 * @param {object} input - { bilty, header, fromCity, toCity, transport, qrDataURL, signature, logo, options }
 *   logo = { dataURL, width, height } (see print-data.loadTemplateAssets)
 * @returns {jsPDF}
 */
export default function template2({ bilty, header, fromCity, toCity, transport = null, qrDataURL = null, signature = null, logo = null, options = {} }) {
  const { topCopyType = 'CONSIGNOR', zeroTopCharges = false, zeroDriverCharges = false } = options;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const data = { bilty, header, fromCity, toCity, transport, qrDataURL, signature, logo };

  drawCopy(pdf, 0, topCopyType, data, !zeroTopCharges);

  // cut line between the copies
  stroke(pdf, K.muted, 0.3);
  pdf.setLineDashPattern([2, 2], 0);
  pdf.line(M, COPY_H, RIGHT, COPY_H);
  pdf.setLineDashPattern([], 0);

  drawCopy(pdf, COPY_H, 'DRIVER', data, !zeroDriverCharges);
  return pdf;
}
