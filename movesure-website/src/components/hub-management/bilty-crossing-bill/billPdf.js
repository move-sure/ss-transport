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

/* Per-GR details the bill rows don't carry: bilty date and the bilty's own PDF (kaat / weight come
   from the API's kaat_detail). Regular bilties come from `bilty`, manual ones from `station_bilty_summary`. */
const chunk = (arr, n = 200) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
export async function loadBiltyDetails(items) {
  const isManual = (m) => m.source_table === 'station_bilty_summary';
  const reg = [...new Set(items.filter((m) => !isManual(m)).map((m) => m.gr_no).filter(Boolean))];
  const man = [...new Set(items.filter(isManual).map((m) => m.gr_no).filter(Boolean))];
  const out = {};
  const put = (gr, v) => { out[gr] = { ...(out[gr] || {}), ...v }; };

  await Promise.all([
    ...chunk(reg).map(async (grs) => {
      const { data } = await supabase.from('bilty').select('gr_no, bilty_date, pdf_bucket, wt, no_of_pkg').in('gr_no', grs).eq('is_active', true);
      (data || []).forEach((b) => put(b.gr_no, { date: b.bilty_date, pdf: b.pdf_bucket, weight: b.wt, packages: b.no_of_pkg }));
    }),
    ...chunk(man).map(async (grs) => {
      const { data } = await supabase.from('station_bilty_summary').select('gr_no, created_at, weight, no_of_packets').in('gr_no', grs);
      (data || []).forEach((b) => put(b.gr_no, { date: b.created_at, weight: b.weight, packages: b.no_of_packets }));
    }),
  ]);
  return out;
}

/* Proof link per bilty row: the bilty's own uploaded PDF, else the transport's crossing-proof
   photo, else the bilty print page. */
function proofLink(m, d) {
  if (m.source_table !== 'station_bilty_summary' && d?.pdf) return { url: d.pdf, kind: 'PDF' };
  if (m.crossing_proof_url) return { url: m.crossing_proof_url, kind: 'PROOF' };
  return m.gr_no ? { url: `https://console.movesure.io/print/${encodeURIComponent(m.gr_no)}`, kind: 'LINK' } : null;
}

export const fmtBiltyDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '-');

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

  /* ── Line items (with a proof QR per bilty) ── */
  const details = await loadBiltyDetails(items);
  const links = items.map((m) => proofLink(m, details[m.gr_no]));
  const qrs = await Promise.all(links.map((l) => (l
    ? QRCode.toDataURL(l.url, { width: 120, margin: 0, errorCorrectionLevel: 'M' }).catch(() => null)
    : Promise.resolve(null))));
  const QR_COL = 9;
  const QR_SIZE = 13;

  autoTable(doc, {
    startY: iy + ih + 5,
    head: [['#', 'Date', 'GR No', 'Bilty No', 'Consignee', 'Destination', 'Kaat', 'PF', 'Amount', 'Proof']],
    body: items.map((m, i) => [
      i + 1, fmtBiltyDate(details[m.gr_no]?.date), m.gr_no || '-', m.bilty_number || '-',
      (m.consignee_name || '-').slice(0, 34), m.destination || '-',
      RsRaw(m.kaat), RsRaw(m.pf), RsRaw(m.amount), '',
    ]),
    foot: [[
      { content: 'TOTAL', colSpan: 6, styles: { halign: 'right' } },
      { content: RsRaw(bill.total_kaat), styles: { halign: 'right' } },
      { content: RsRaw(bill.total_pf), styles: { halign: 'right' } },
      { content: RsRaw(bill.total_amount), styles: { halign: 'right' } },
      '',
    ]],
    showFoot: 'lastPage',
    styles: { fontSize: 7, cellPadding: 1.6, textColor: [0, 0, 0], lineColor: [190, 190, 190], lineWidth: 0.15, valign: 'middle' },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', lineColor: BRAND },
    footStyles: { fillColor: [241, 245, 249], textColor: BRAND, fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 17 },
      2: { fontStyle: 'bold', cellWidth: 17 },
      3: { cellWidth: 16 },
      5: { cellWidth: 24 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
      [QR_COL]: { cellWidth: QR_SIZE + 4, minCellHeight: QR_SIZE + 4, halign: 'center' },
    },
    // draw the proof QR inside its cell, with a tiny label (PDF / PROOF / LINK) under it
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== QR_COL) return;
      const img = qrs[data.row.index];
      if (!img) return;
      const { x, y: cy, width, height } = data.cell;
      const size = Math.min(QR_SIZE, width - 2, height - 4);
      doc.addImage(img, 'PNG', x + (width - size) / 2, cy + 1, size, size);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5); doc.setTextColor(110, 110, 110);
      doc.text(links[data.row.index].kind, x + width / 2, cy + size + 2.6, { align: 'center' });
      doc.setTextColor(0, 0, 0);
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
