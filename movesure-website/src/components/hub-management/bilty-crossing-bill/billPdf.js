import supabase from '../../../app/utils/supabase';

/* Bilty Crossing Bill PDF — same look as the crossing bill: page border,
   logo header, details strip, line-item table, totals, signatures, QR to
   the uploaded copy, footer inside the border. */

const BRAND = [30, 41, 59];
const ACCENT = [204, 163, 60];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const RsRaw = (n) => `Rs.${Math.round(n || 0).toLocaleString('en-IN')}`;

let logoCache = null;
async function loadLogo() {
  if (logoCache) return logoCache;
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i); i.onerror = reject; i.src = '/ss-logo.png';
    });
    const w = 260, h = Math.round(w * img.naturalHeight / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    logoCache = { dataUrl: c.toDataURL('image/png'), ratio: h / w };
  } catch (_) { logoCache = null; }
  return logoCache;
}

export const pdfFileName = (bill) => `${bill.bill_no}.pdf`;

export async function buildBiltyCrossingBillPdf(bill) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const QRCode = (await import('qrcode')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mg = 10;
  const items = Array.isArray(bill.metadata) ? bill.metadata : [];
  const period = `${MONTHS[(bill.bill_month || 1) - 1]} ${bill.bill_year || ''}`;

  /* ── Header ── */
  const hy = 9, hh = 32;
  doc.setDrawColor(...BRAND); doc.setLineWidth(0.5);
  doc.roundedRect(mg, hy, pw - mg * 2, hh, 2, 2);
  doc.setFillColor(...ACCENT); doc.rect(mg + 0.5, hy + hh - 2, pw - mg * 2 - 1, 1.5, 'F');
  const logo = await loadLogo();
  if (logo) {
    const lw = 30, lh = Math.min(hh - 4, lw * logo.ratio);
    doc.addImage(logo.dataUrl, 'PNG', mg + 2, hy + (hh - 1.5 - lh) / 2, lw, lh);
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...BRAND);
  doc.text('SS TRANSPORT CORPORATION', pw / 2, hy + 9, { align: 'center' });
  doc.setFontSize(8.5); doc.setTextColor(...ACCENT);
  doc.text('BILTY CROSSING BILL', pw / 2, hy + 15, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(40, 40, 40);
  doc.text(bill.transport_name || '', pw / 2, hy + 22, { align: 'center', maxWidth: pw - mg * 2 - 70 });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
  doc.text(`GSTIN: ${bill.transport_gstin || '—'}`, pw / 2, hy + 27, { align: 'center' });

  /* ── Details strip ── */
  const iy = hy + hh + 3, ih = 12;
  const info = [
    ['BILL NO', bill.bill_no || '—'],
    ['PERIOD', period],
    ['BILTIES', String(bill.total_bilties ?? items.length)],
    ['PRINTED', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
  ];
  const iw = (pw - mg * 2) / info.length;
  doc.setFillColor(248, 250, 252); doc.setDrawColor(200, 205, 212); doc.setLineWidth(0.3);
  doc.rect(mg, iy, pw - mg * 2, ih, 'FD');
  info.forEach(([k, v], i) => {
    const x = mg + i * iw;
    if (i) doc.line(x, iy, x, iy + ih);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(110, 110, 110);
    doc.text(k, x + 3, iy + 4.3);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
    doc.text(String(v), x + 3, iy + 9.5, { maxWidth: iw - 5 });
  });

  /* ── Line items ── */
  autoTable(doc, {
    startY: iy + ih + 5,
    head: [['#', 'GR No', 'Bilty No', 'Consignor', 'Consignee', 'Destination', 'Kaat', 'PF', 'Amount']],
    body: items.map((m, i) => [
      i + 1, m.gr_no || '-', m.bilty_number || '-',
      (m.consignor_name || '-').slice(0, 26), (m.consignee_name || '-').slice(0, 26), m.destination || '-',
      RsRaw(m.kaat), RsRaw(m.pf), RsRaw(m.amount),
    ]),
    foot: [[
      { content: 'TOTAL', colSpan: 6, styles: { halign: 'right' } },
      { content: RsRaw(bill.total_kaat), styles: { halign: 'right' } },
      { content: RsRaw(bill.total_pf), styles: { halign: 'right' } },
      { content: RsRaw(bill.total_amount), styles: { halign: 'right' } },
    ]],
    showFoot: 'lastPage',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [0, 0, 0], lineColor: [190, 190, 190], lineWidth: 0.15, valign: 'middle' },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', lineColor: BRAND },
    footStyles: { fillColor: [241, 245, 249], textColor: BRAND, fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', cellWidth: 18 },
      2: { cellWidth: 17 },
      5: { cellWidth: 22 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
    },
    margin: { left: mg, right: mg, top: 12, bottom: 18 },
  });

  /* ── Signatures ── */
  let y = (doc.lastAutoTable?.finalY || 80) + 10;
  if (y + 30 > ph - 18) { doc.addPage(); y = 16; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(60, 60, 60);
  doc.text('Authorised Signatures', mg, y);
  const bw = (pw - mg * 2 - 8) / 2;
  ['Prepared By', 'Authorised By'].forEach((lbl, i) => {
    const x = mg + i * (bw + 8);
    doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.3); doc.rect(x, y + 4, bw, 22);
    doc.setDrawColor(180, 180, 180); doc.line(x + 5, y + 18, x + bw - 5, y + 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
    doc.text(lbl, x + bw / 2, y + 23, { align: 'center' });
  });

  /* ── QR → this bill's own uploaded PDF ── */
  if (bill.bill_no) {
    let qy = y + 32;
    if (qy + 26 > ph - 18) { doc.addPage(); qy = 14; }
    const { data: ud } = supabase.storage.from('crossing-bill').getPublicUrl(pdfFileName(bill));
    doc.setDrawColor(...BRAND); doc.setLineWidth(0.4);
    doc.roundedRect(mg, qy, pw - mg * 2, 26, 2, 2);
    try {
      const qr = await QRCode.toDataURL(ud.publicUrl, { width: 200, margin: 1 });
      doc.addImage(qr, 'PNG', mg + 2, qy + 2, 22, 22);
    } catch (_) { /* skip QR */ }
    doc.setFillColor(...ACCENT); doc.rect(mg + 27, qy + 6, 1, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
    doc.text('DIGITAL COPY', mg + 30, qy + 9.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
    doc.text('Scan to view / download this bill', mg + 30, qy + 14);
    doc.setFontSize(5.5); doc.setTextColor(150, 150, 150);
    doc.text(ud.publicUrl, mg + 30, qy + 19, { maxWidth: pw - mg * 2 - 34 });
  }

  /* ── Border + footer ── */
  const np = doc.internal.getNumberOfPages();
  for (let i = 1; i <= np; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND); doc.setLineWidth(0.6); doc.rect(4, 4, pw - 8, ph - 8);
    doc.setDrawColor(...ACCENT); doc.setLineWidth(0.2); doc.rect(5.5, 5.5, pw - 11, ph - 11);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(mg, ph - 14, pw - mg, ph - 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(140, 140, 140);
    doc.text('SS TRANSPORT CORPORATION', mg, ph - 10);
    doc.text(`${i}/${np}`, pw - mg, ph - 10, { align: 'right' });
  }
  return doc.output('blob');
}

/** Build → upload to the crossing-bill bucket → save pdf_url on the bill. Returns { blobUrl, publicUrl }. */
export async function printAndUploadBill(bill, { apiBase, token, userId }) {
  const blob = await buildBiltyCrossingBillPdf(bill);
  const fn = pdfFileName(bill);
  const { error: upErr } = await supabase.storage.from('crossing-bill')
    .upload(fn, blob, { contentType: 'application/pdf', upsert: true });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
  const { data: ud } = supabase.storage.from('crossing-bill').getPublicUrl(fn);
  const res = await fetch(`${apiBase}/api/bilty-crossing-bill/${bill.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ pdf_url: ud.publicUrl, updated_by: userId }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.message || `Saving PDF link failed (${res.status})`);
  }
  return { blobUrl: URL.createObjectURL(blob), publicUrl: ud.publicUrl };
}
