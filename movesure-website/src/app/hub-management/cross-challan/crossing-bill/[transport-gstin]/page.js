'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import supabase from '../../../../utils/supabase';
import { useAuth } from '../../../../utils/auth';
import KaatUpdateModal from '../../../../../components/hub-management/KaatUpdateModal';
import NilBiltyFinder from '../../../../../components/hub-management/NilBiltyFinder';
import TransportChallanReport from '../../../../../components/hub-management/TransportChallanReport';
import CrossChallanPrintModal, { useCrossChallanPrint } from '../../../../../components/transit-finance/pohonch-print/CrossChallanPrintModal';
import { generateCombinedPohonchPDF } from '../../../../../components/transit-finance/pohonch-print/pohonch-pdf-generator';
import { fetchFreshCrossChallanData } from '../../../../../components/transit-finance/pohonch-print/cross-challan-print-utils';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft, Loader2, RefreshCw, Plus, FileText, TrendingDown,
  ChevronDown, ChevronRight, Printer, X, MapPin, Calendar,
  CheckSquare, Square, CheckCircle2, AlertCircle, PenTool,
  User, Link2, Copy, Check, CreditCard, Banknote, RotateCcw,
  Search, ArrowUpDown, ArrowUp, ArrowDown, Trash2, PackagePlus, Lock, Zap, FileSearch,
} from 'lucide-react';

const API_BASE = 'https://api.movesure.io';
const Rs    = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const RsRaw = (n) => `Rs.${Math.round(n || 0).toLocaleString('en-IN')}`;
const pct   = (num, denom) => denom > 0 ? Math.min(100, Math.round((num / denom) * 100)) : 0;

/* ─── Crossing challan PDF (all pohonch of a bill) → storage → bill ─────────
   Builds ONE combined PDF of every pohonch in the bill, uploads it as
   `{bill_no}-challan.pdf` in the `crossing-bill` bucket and saves the public
   URL on the bill as `crossing_challan_url` (never touches bill_url). */
async function uploadCrossingChallanPdf(bill, { token, userId } = {}) {
  const nums = [...new Set((bill.pohonch_data || []).map(p => p.pohonch_number).filter(Boolean))];
  if (!nums.length) throw new Error('No pohonch in this bill');

  const entries = [];
  for (const num of nums) {
    try {
      const { bilties, transport } = await fetchFreshCrossChallanData(num);
      entries.push({ bilties, transport, pohonchNumber: num });
    } catch (e) {
      // Deleted / empty pohonch — skip it rather than failing the whole bill
      console.warn(`Challan PDF: skipped ${num} —`, e.message);
    }
  }
  if (!entries.length) throw new Error('None of the pohonch in this bill could be loaded');

  const blobUrl = generateCombinedPohonchPDF(entries, true);
  const blob    = await fetch(blobUrl).then(r => r.blob());
  URL.revokeObjectURL(blobUrl);

  const fn = `${bill.bill_no}-challan.pdf`;
  const { error: upErr } = await supabase.storage.from('crossing-bill')
    .upload(fn, blob, { contentType: 'application/pdf', upsert: true });
  if (upErr) throw new Error(upErr.message);
  const { data: ud } = supabase.storage.from('crossing-bill').getPublicUrl(fn);

  const res = await fetch(`${API_BASE}/api/crossing-bill/${bill.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ crossing_challan_url: ud.publicUrl, updated_by: userId }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.message || `Saving challan URL failed (${res.status})`);
  }
  return { url: ud.publicUrl, included: entries.length, total: nums.length };
}

/* Logo for the bill PDF — downscaled through a canvas so the 1350px source
   PNG doesn't bloat every uploaded bill. Cached after first load. */
let _logoCache = null;
async function loadBillLogo() {
  if (_logoCache) return _logoCache;
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i); i.onerror = reject; i.src = '/ss-logo.png';
    });
    const w = 260, h = Math.round(w * img.naturalHeight / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    _logoCache = { dataUrl: c.toDataURL('image/png'), ratio: h / w };
  } catch (e) { console.warn('Bill logo load failed:', e); _logoCache = null; }
  return _logoCache;
}

const BRAND  = [30, 41, 59];   // slate-800
const ACCENT = [204, 163, 60]; // SS gold

/* ─── Station rate list PDF ─────────────────────────────────────────────────
   Same look as the bill: page border, logo, SS name on top, transport name +
   GSTIN under it, then one row per station with its contracted rate. */
async function buildStationRatesPdf({ transportName, gstin, hubRates = [] }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mg = 10;
  const num = (v) => (v == null || v === '' ? null : Number(v));
  const money = (v) => (num(v) > 0 ? `Rs.${(+num(v).toFixed(2)).toLocaleString('en-IN')}` : '-');

  // One row per station from the contracted hub rates. A station is printed
  // only when it has BOTH a city code and a rate > 0 — anything else is skipped.
  const seen = new Set();
  const rows = [];
  hubRates.forEach(r => {
    const city = r.cityName || '';
    if (!city || seen.has(city) || !r.cityCode) return;
    const mode = r.pricing_mode;
    const rate = mode === 'per_pkg'
      ? `${money(r.rate_per_pkg)} / pkg`
      : mode === 'per_kg'
        ? `${money(r.rate_per_kg)} / kg`
        : [num(r.rate_per_kg) > 0 && `${money(r.rate_per_kg)} / kg`, num(r.rate_per_pkg) > 0 && `${money(r.rate_per_pkg)} / pkg`].filter(Boolean).join('  +  ') || '-';
    if (rate === '-' || rate.startsWith('- ')) return; // no usable rate
    seen.add(city);
    rows.push([city, r.cityCode, rate]);
  });
  rows.sort((a, b) => a[0].localeCompare(b[0]));

  /* ── Header box ── */
  const hy = 9, hh = 32;
  doc.setDrawColor(...BRAND); doc.setLineWidth(0.5);
  doc.roundedRect(mg, hy, pw - mg * 2, hh, 2, 2);
  doc.setFillColor(...ACCENT); doc.rect(mg + 0.5, hy + hh - 2, pw - mg * 2 - 1, 1.5, 'F');
  const logo = await loadBillLogo();
  if (logo) {
    const lw = 30, lh = Math.min(hh - 4, lw * logo.ratio);
    doc.addImage(logo.dataUrl, 'PNG', mg + 2, hy + (hh - 1.5 - lh) / 2, lw, lh);
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...BRAND);
  doc.text('SS TRANSPORT CORPORATION', pw / 2, hy + 9, { align: 'center' });
  doc.setFontSize(8.5); doc.setTextColor(...ACCENT);
  doc.text('STATION RATE LIST', pw / 2, hy + 15, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(40, 40, 40);
  doc.text(transportName || '', pw / 2, hy + 22, { align: 'center', maxWidth: pw - mg * 2 - 70 });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
  doc.text(`GSTIN: ${gstin || '—'}`, pw / 2, hy + 27, { align: 'center' });

  /* ── Details strip: transport · stations · date ── */
  const iy = hy + hh + 3, ih = 12;
  const info = [
    ['TRANSPORT', transportName || '—'],
    ['STATIONS', String(rows.length)],
    ['PRINTED', format(new Date(), 'dd MMM yyyy')],
  ];
  const iws = [(pw - mg * 2) * 0.56, (pw - mg * 2) * 0.18, (pw - mg * 2) * 0.26];
  doc.setFillColor(248, 250, 252); doc.setDrawColor(200, 205, 212); doc.setLineWidth(0.3);
  doc.rect(mg, iy, pw - mg * 2, ih, 'FD');
  let ix = mg;
  info.forEach(([k, v], i) => {
    if (i) doc.line(ix, iy, ix, iy + ih);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(110, 110, 110);
    doc.text(k, ix + 3, iy + 4.3);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
    doc.text(String(v), ix + 3, iy + 9.5, { maxWidth: iws[i] - 5 });
    ix += iws[i];
  });

  /* ── Rates table ── */
  autoTable(doc, {
    startY: iy + ih + 5,
    head: [['#', 'Station', 'Code', 'Rate']],
    body: rows.length ? rows.map((r, i) => [i + 1, ...r]) : [[{ content: 'No station rates set for this transport', colSpan: 4, styles: { halign: 'center' } }]],
    styles: { fontSize: 8.5, cellPadding: 2.4, textColor: [0, 0, 0], lineColor: [190, 190, 190], lineWidth: 0.15, valign: 'middle' },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, lineColor: BRAND, halign: 'center' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { fontStyle: 'bold', cellWidth: 90 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'right', fontStyle: 'bold', textColor: BRAND },
    },
    margin: { left: mg, right: mg, top: 12, bottom: 18 },
  });

  const ny = (doc.lastAutoTable?.finalY || 80) + 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
  doc.text('Rates are subject to change.', mg, ny);

  /* ── Signature ── */
  let sy = ny + 14;
  if (sy + 22 > ph - 18) { doc.addPage(); sy = 16; }
  const bw = 70, bx = pw - mg - bw;
  doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.3); doc.rect(bx, sy, bw, 22);
  doc.setDrawColor(180, 180, 180); doc.line(bx + 5, sy + 14, bx + bw - 5, sy + 14);
  doc.setFontSize(7); doc.setTextColor(100, 100, 100);
  doc.text('For SS TRANSPORT CORPORATION', bx + bw / 2, sy + 19, { align: 'center' });

  /* ── Border + footer on every page ── */
  const np = doc.internal.getNumberOfPages();
  for (let i = 1; i <= np; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND); doc.setLineWidth(0.6); doc.rect(4, 4, pw - 8, ph - 8);
    doc.setDrawColor(...ACCENT); doc.setLineWidth(0.2); doc.rect(5.5, 5.5, pw - 11, ph - 11);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
    doc.line(mg, ph - 14, pw - mg, ph - 14);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(140, 140, 140);
    doc.text('SS TRANSPORT CORPORATION', mg, ph - 10);
    doc.text(`${i}/${np}`, pw - mg, ph - 10, { align: 'right' });
  }
  return doc.output('bloburl');
}

/* ─── PDF builder ─────────────────────────────────────────────────────────── */
async function buildBillPdf(bill, pohonchMap = {}) {
  const { jsPDF }  = await import('jspdf');
  const autoTable  = (await import('jspdf-autotable')).default;
  const QRCode     = (await import('qrcode')).default;
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw   = doc.internal.pageSize.getWidth();
  const ph   = doc.internal.pageSize.getHeight();
  const mg   = 10;

  /* ── Header box: logo · company · transport · ledger QR ── */
  const hy = 9, hh = 32;
  doc.setDrawColor(...BRAND); doc.setLineWidth(0.5);
  doc.roundedRect(mg, hy, pw - mg * 2, hh, 2, 2);
  doc.setFillColor(...ACCENT); doc.rect(mg + 0.5, hy + hh - 2, pw - mg * 2 - 1, 1.5, 'F');

  const logo = await loadBillLogo();
  if (logo) {
    const lw = 30, lh = Math.min(hh - 4, lw * logo.ratio);
    doc.addImage(logo.dataUrl, 'PNG', mg + 2, hy + (hh - 1.5 - lh) / 2, lw, lh);
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...BRAND);
  doc.text('SS TRANSPORT CORPORATION', pw / 2, hy + 9, { align: 'center' });
  doc.setFontSize(8.5); doc.setTextColor(...ACCENT);
  doc.text('CROSSING BILL', pw / 2, hy + 15, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(40, 40, 40);
  doc.text(bill.transport_name || '', pw / 2, hy + 22, { align: 'center', maxWidth: pw - mg * 2 - 64 });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
  doc.text(`GSTIN: ${bill.transport_gstin || '—'}`, pw / 2, hy + 27, { align: 'center' });

  /* ── Top-right QR → public transport ledger (/transport-ledger/[gstin]) ── */
  if (bill.transport_gstin) {
    const ledgerUrl = `https://console.movesure.io/transport-ledger/${encodeURIComponent(String(bill.transport_gstin).trim().toUpperCase())}`;
    const hq = 22;
    const hx = pw - mg - hq - 3;
    try {
      const ledgerQr = await QRCode.toDataURL(ledgerUrl, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
      doc.addImage(ledgerQr, 'PNG', hx, hy + 2.5, hq, hq);
      doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND);
      doc.text('SCAN FOR LEDGER', hx + hq / 2, hy + hh - 4, { align: 'center' });
    } catch (e) { console.error('Ledger QR generation failed:', e); }
  }
  doc.setTextColor(0, 0, 0);

  /* ── Bill details strip ── */
  const iy = hy + hh + 3, ih = 12;
  const info = [
    ['BILL NO', bill.bill_no || '—'],
    ['PERIOD', [bill.from_date, bill.to_date].filter(Boolean).join('  to  ') || '—'],
    ['PRINTED', format(new Date(), 'dd MMM yyyy')],
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

  /* ── Summary line ── */
  const sy = iy + ih + 6;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
  doc.text(`Total Pohonch: ${bill.total_pohonch || 0}   |   Total Bilties: ${bill.total_bilties || 0}   |   Total Amount: ${RsRaw(bill.total_amount)}`, mg, sy);
  doc.setTextColor(0, 0, 0);

  /* ── Pohonch table ── */
  let grandBilties = 0, grandPkg = 0, grandWt = 0, grandTopayPf = 0, grandPaidKaat = 0, grandAmt = 0;

  const rows = (bill.pohonch_data || []).map((pd, i) => {
    const supaP   = pohonchMap[pd.pohonch_number] || {};
    const bilties = Array.isArray(supaP.bilty_metadata) ? supaP.bilty_metadata : [];

    const totalWt  = bilties.reduce((s, b) => s + (b.weight   || 0), 0);
    const totalPkg = bilties.reduce((s, b) => s + (b.packages || 0), 0);
    const totalAmt = bilties.reduce((s, b) => s + (b.amount   || 0), 0);
    // Helper: treat b.is_paid OR payment_mode==='paid' as paid
    const biltyIsPaid = (b) => b.is_paid || (b.payment_mode || '').toLowerCase() === 'paid';
    // TO-PAY PF: use stored b.pf for to-pay bilties (pf = amount − kaat − dd, already computed)
    const topayPf  = bilties.filter(b => !biltyIsPaid(b)).reduce((s, b) => s + (b.pf != null ? (b.pf || 0) : Math.max(0, (b.amount || 0) - (b.kaat || 0))), 0);
    // PAID Kaat: sum of kaat for paid bilties (kaat = weight × kaat_rate, stored on bilty)
    const paidKaat = bilties.filter(b =>  biltyIsPaid(b)).reduce((s, b) => s + (b.kaat || 0), 0);
    // P/B Nos: unique pohonch_bilty values from all bilties in this pohonch
    const pbNos    = [...new Set(bilties.map(b => b.pohonch_bilty).filter(Boolean))].join(', ') || '-';

    grandBilties  += pd.total_bilties || 0;
    grandPkg      += totalPkg;
    grandWt       += totalWt;
    grandTopayPf  += topayPf;
    grandPaidKaat += paidKaat;
    grandAmt      += totalAmt || pd.total_amount || 0;

    return [
      i + 1,
      pd.pohonch_number || '-',
      pbNos,
      pd.total_bilties || 0,
      Math.round(totalPkg) || 0,
      totalWt > 0 ? `${totalWt.toFixed(1)} kg` : '-',
      RsRaw(topayPf),
      RsRaw(paidKaat),
      RsRaw(totalAmt || pd.total_amount),
    ];
  });

  autoTable(doc, {
    startY: sy + 4,
    tableWidth: 'auto',
    head: [['#', 'Crossing Challan No', 'P/B No', 'Bilties', 'Pkgs', 'Weight', 'TO-PAY PF', 'PAID Kaat', 'Total Amt']],
    body: rows,
    foot: [[
      { content: 'TOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: String(grandBilties),         styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(Math.round(grandPkg)), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: `${grandWt.toFixed(1)} kg`,   styles: { fontStyle: 'bold', halign: 'right' } },
      { content: RsRaw(grandTopayPf),          styles: { fontStyle: 'bold', halign: 'right' } },
      { content: RsRaw(grandPaidKaat),         styles: { fontStyle: 'bold', halign: 'right' } },
      { content: RsRaw(grandAmt),              styles: { fontStyle: 'bold', halign: 'right' } },
    ]],
    showFoot: 'lastPage',
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [0,0,0], lineColor: [190,190,190], lineWidth: 0.15 },
    headStyles: { fillColor: BRAND, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7.5, lineColor: BRAND, lineWidth: 0.3 },
    footStyles: { fillColor: [241,245,249], textColor: BRAND, fontStyle: 'bold', lineColor: [180,180,180], lineWidth: 0.3 },
    alternateRowStyles: { fillColor: [248,250,252] },
    columnStyles: {
      0: { halign: 'center' },
      1: { fontStyle: 'bold' },
      2: { fontSize: 7 },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    },
    margin: { left: mg, right: mg, top: 12, bottom: 18 },
  });

  /* ── Net PF summary + Signatures — add new page if not enough room ── */
  const netPf      = grandTopayPf - grandPaidKaat;
  const tableEndY  = doc.lastAutoTable?.finalY || 130;
  const NEEDED     = 78; // mm: ~28 for net PF table + 8 gap + 42 for signatures + footer

  // If less than NEEDED mm remain on the page, start a fresh page instead of overlapping the table
  let balY;
  if (tableEndY + NEEDED > ph - 18) {
    doc.addPage();
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(120,120,120);
    doc.text(`${bill.bill_no}  —  ${bill.transport_name || ''}`, mg, 10);
    doc.setTextColor(0,0,0);
    balY = 16;
  } else {
    balY = tableEndY + 9;
  }

  autoTable(doc, {
    startY: balY,
    body: [
      ['TO-PAY PF',  RsRaw(grandTopayPf)],
      [`Less: PAID Kaat`,  `- ${RsRaw(grandPaidKaat)}`],
      ['Net Total PF',   RsRaw(netPf)],
    ],
    styles: { fontSize: 8, cellPadding: 2, textColor: [0,0,0] },
    bodyStyles: { lineColor: [200,200,200], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = BRAND;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize  = 9;
        data.cell.styles.lineColor = [160, 160, 160];
      }
    },
    theme: 'plain',
    margin: { left: mg, right: mg, top: 12, bottom: 18 },
  });

  /* ── 2 Signature boxes (always after net PF table, never overlapping) ── */
  const signY = (doc.lastAutoTable?.finalY || balY + 30) + 10;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(60,60,60);
  doc.text('Authorised Signatures', mg, signY);
  const bw = (pw - mg * 2 - 8) / 2;
  ['Prepared By', 'Authorised By'].forEach((lbl, i) => {
    const x = mg + i * (bw + 8), y = signY + 4;
    doc.setDrawColor(160,160,160); doc.setLineWidth(0.3); doc.rect(x, y, bw, 24);
    doc.setDrawColor(180,180,180); doc.setLineWidth(0.25); doc.line(x+5, y+15, x+bw-5, y+15);
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100);
    doc.text(lbl, x + bw/2, y+21, { align:'center' });
  });

  /* ── Digital Copies — bordered box with two QR cards below the signatures:
     left → this bill's PDF, right → the crossing challan PDF (all pohonch).
     Same names the uploads write ({bill_no}.pdf / {bill_no}-challan.pdf),
     resolved through getPublicUrl so they always match the real bucket.
     Skipped if bill_no is missing — ".../undefined.pdf" would just 404. ── */
  if (bill.bill_no) {
    const qrSize = 22, boxH = 36;
    let qrBoxY = signY + 4 + 24 + 7;
    if (qrBoxY + boxH > ph - 18) { doc.addPage(); qrBoxY = 14; }

    const boxW = pw - mg * 2;
    doc.setDrawColor(...BRAND); doc.setLineWidth(0.4);
    doc.roundedRect(mg, qrBoxY, boxW, boxH, 2, 2);
    // Title bar
    doc.setFillColor(...BRAND);
    doc.roundedRect(mg, qrBoxY, boxW, 6.5, 2, 2, 'F');
    doc.rect(mg, qrBoxY + 3, boxW, 3.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text('DIGITAL COPIES', mg + 4, qrBoxY + 4.6, { charSpace: 0.8 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    doc.text('Scan with any phone camera to open', mg + boxW - 4, qrBoxY + 4.6, { align: 'right' });

    const cards = [
      { file: `${bill.bill_no}.pdf`,         title: 'CROSSING BILL',     sub: 'View / download this bill' },
      { file: `${bill.bill_no}-challan.pdf`, title: 'CROSSING CHALLANS', sub: bill.total_pohonch ? `All ${bill.total_pohonch} pohonch of this bill` : 'All pohonch of this bill' },
    ];
    const cw = (boxW - 12) / 2, cy = qrBoxY + 9;
    for (let i = 0; i < cards.length; i++) {
      const c  = cards[i];
      const cx = mg + 4 + i * (cw + 4);
      const { data: ud } = supabase.storage.from('crossing-bill').getPublicUrl(c.file);
      doc.setDrawColor(200, 205, 212); doc.setLineWidth(0.3); doc.setFillColor(252, 252, 253);
      doc.roundedRect(cx, cy, cw, boxH - 12, 1.5, 1.5, 'FD');
      try {
        const qr = await QRCode.toDataURL(ud.publicUrl, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
        doc.addImage(qr, 'PNG', cx + 1.5, cy + 1, qrSize, qrSize);
      } catch (e) { console.error('QR generation failed:', e); }
      const tx = cx + qrSize + 5;
      doc.setFillColor(...ACCENT); doc.rect(tx, cy + 3, 1, 9, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
      doc.text(c.title, tx + 3, cy + 6.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
      doc.text(c.sub, tx + 3, cy + 11);
      doc.setFontSize(5); doc.setTextColor(150, 150, 150);
      doc.text(ud.publicUrl, tx, cy + 16, { maxWidth: cw - qrSize - 7 });
    }
    doc.setTextColor(0, 0, 0);
  }

  /* ── Page numbers ── */
  const np = doc.internal.getNumberOfPages();
  for (let i = 1; i <= np; i++) {
    doc.setPage(i);
    // Page border — outer brand line + inner gold hairline
    doc.setDrawColor(...BRAND); doc.setLineWidth(0.6); doc.rect(4, 4, pw - 8, ph - 8);
    doc.setDrawColor(...ACCENT); doc.setLineWidth(0.2); doc.rect(5.5, 5.5, pw - 11, ph - 11);
    doc.setDrawColor(200,200,200); doc.setLineWidth(0.2);
    doc.line(mg, ph - 14, pw - mg, ph - 14);
    doc.setFontSize(6.5); doc.setFont('helvetica','normal'); doc.setTextColor(140,140,140);
    doc.text('SS TRANSPORT CORPORATION', mg, ph - 10);
    doc.text(`${i}/${np}`, pw - mg, ph - 10, { align: 'right' });
  }
  return doc.output('bloburl');
}

/* ─── Status Badge ────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    draft:        { cls:'bg-gray-100 text-gray-700 border-gray-300',     label:'Draft' },
    sent:         { cls:'bg-blue-100 text-blue-700 border-blue-300',     label:'Sent' },
    partial_paid: { cls:'bg-amber-100 text-amber-700 border-amber-300',  label:'Partial Paid' },
    paid:         { cls:'bg-emerald-100 text-emerald-700 border-emerald-300', label:'Paid' },
    cancelled:    { cls:'bg-red-100 text-red-600 border-red-300',        label:'Cancelled' },
  };
  const s = cfg[status] || cfg.draft;
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${s.cls}`}>{s.label}</span>;
}

/* ─── Confirm Create Bill Modal ───────────────────────────────────────────── */
function ConfirmBillModal({ isOpen, onClose, selectedPohonch, transportGstin, transportName, userId, token, onCreated }) {
  const [fromDate,      setFromDate]      = useState('');
  const [toDate,        setToDate]        = useState('');
  const [creating,      setCreating]      = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error,         setError]         = useState(null);
  const [createdBill,   setCreatedBill]   = useState(null);
  const [pdfUrl,        setPdfUrl]        = useState(null);
  const [uploadError,   setUploadError]   = useState(null);

  useEffect(() => { if (isOpen) { setError(null); setCreatedBill(null); setPdfUrl(null); setUploadError(null); } }, [isOpen]);

  const preview = useMemo(() => selectedPohonch.reduce(
    (a, p) => ({ kaat:a.kaat+(p.total_kaat||0), pf:a.pf+(p.total_pf||0), bilties:a.bilties+(p.total_bilties||0), amount:a.amount+(p.total_amount||0), wt:a.wt+(p.total_weight||0) }),
    { kaat:0, pf:0, bilties:0, amount:0, wt:0 }
  ), [selectedPohonch]);

  const generateAndUpload = async (bill) => {
    setGeneratingPdf(true);
    setUploadError(null);
    try {
      const pohonchMap = {};
      selectedPohonch.forEach(p => { pohonchMap[p.pohonch_number] = p; });
      // The PDF's own QR code links to this bill's storage URL — that link only
      // resolves once the upload below actually succeeds, so don't hand the
      // "View / Download" link to the user until upload + save are confirmed.
      const url  = await buildBillPdf(bill, pohonchMap);
      const blob = await fetch(url).then(r => r.blob());
      const fn   = `${bill.bill_no}.pdf`;
      await supabase.storage.from('crossing-bill').upload(fn, blob, { contentType:'application/pdf', upsert:true });
      const { data: ud } = supabase.storage.from('crossing-bill').getPublicUrl(fn);
      await fetch(`${API_BASE}/api/crossing-bill/${bill.id}`, {
        method:'PUT',
        headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
        body: JSON.stringify({ bill_url: ud.publicUrl, updated_by: userId }),
      });
      setPdfUrl(url);
      // Crossing challan PDF (all pohonch) — background, doesn't block the bill link
      uploadCrossingChallanPdf(bill, { token, userId })
        .then(() => onCreated?.())
        .catch(e => console.error('Challan PDF upload:', e));
    } catch (e) {
      console.error('PDF upload:', e);
      setUploadError('PDF was created but failed to upload — its QR code link will not work until you retry (use "Print / View" on the bill row after closing this).');
    }
    finally { setGeneratingPdf(false); }
  };

  const handleCreate = async () => {
    setCreating(true); setError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/crossing-bill`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
        body: JSON.stringify({
          transport_gstin: transportGstin,
          transport_name:  transportName,
          from_date:       fromDate || undefined,
          to_date:         toDate   || undefined,
          pohonch_numbers: selectedPohonch.map(p => p.pohonch_number),
          created_by:      userId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to create bill');
      setCreatedBill(json.data);
      onCreated?.();
      generateAndUpload(json.data);
    } catch (e) { setError(e.message); }
    finally { setCreating(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900">
          <div>
            <h2 className="text-base font-black text-white">Create Crossing Bill</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{transportGstin}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl"><X className="h-5 w-5 text-white" /></button>
        </div>
        <div className="p-6 space-y-4">
          {createdBill ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-black text-emerald-800 text-base">{createdBill.bill_no} created!</p>
                  <p className="text-xs text-emerald-600 mt-0.5">{createdBill.total_pohonch} pohonch · {createdBill.total_bilties} bilties</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ l:'Kaat', v:Rs(createdBill.total_kaat), c:'text-rose-600' }, { l:'PF', v:Rs(createdBill.total_pf), c:'text-teal-700' }, { l:'Total', v:Rs(createdBill.total_amount), c:'text-gray-800' }].map(({l,v,c})=>(
                  <div key={l} className="bg-gray-50 rounded-xl border border-gray-200 p-3 text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{l}</p>
                    <p className={`text-sm font-black ${c}`}>{v}</p>
                  </div>
                ))}
              </div>
              {generatingPdf
                ? <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Generating &amp; uploading PDF…</div>
                : pdfUrl
                  ? <a href={pdfUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800"><Printer className="h-4 w-4" /> View / Download PDF</a>
                  : uploadError && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5"/>{uploadError}</div>
              }
              <button onClick={onClose} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Close</button>
            </div>
          ) : (
            <>
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                <p className="text-xs font-bold text-teal-600 uppercase mb-2">{selectedPohonch.length} pohonch selected · {preview.bilties} bilties · {preview.wt.toFixed(1)} kg</p>
                <div className="grid grid-cols-3 gap-3">
                  {[{ l:'Kaat', v:Rs(preview.kaat), c:'text-rose-600' }, { l:'PF', v:Rs(preview.pf), c:'text-teal-700' }, { l:'Total', v:Rs(preview.amount), c:'text-gray-800' }].map(({l,v,c})=>(
                    <div key={l} className="text-center">
                      <p className="text-[10px] text-teal-400 font-bold uppercase">{l}</p>
                      <p className={`text-sm font-black ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['From Date', fromDate, setFromDate], ['To Date', toDate, setToDate]].map(([lbl, val, set]) => (
                  <div key={lbl}>
                    <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">{lbl}</label>
                    <input type="date" value={val} onChange={e=>set(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                ))}
              </div>
              {error && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5"/>{error}</div>}
              <button onClick={handleCreate} disabled={creating}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                {creating ? <><Loader2 className="h-4 w-4 animate-spin"/>Creating Bill…</> : <><Plus className="h-4 w-4"/>Create Bill ({selectedPohonch.length} pohonch)</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Transaction Modal ───────────────────────────────────────────────────── */
function TransactionModal({ isOpen, bill, onClose, userId, token, onAdded }) {
  const [amount,  setAmount]  = useState('');
  const [type,    setType]    = useState('received_from_transport');
  const [date,    setDate]    = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mode,    setMode]    = useState('online');
  const [note,    setNote]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => { if (isOpen) { setAmount(''); setNote(''); setError(null); setDate(format(new Date(), 'yyyy-MM-dd')); } }, [isOpen]);

  if (!isOpen || !bill) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError('Amount must be > 0'); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/crossing-bill/${bill.id}/transaction`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
        body: JSON.stringify({ amount:parseFloat(amount), type, date, mode, note, recorded_by:userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed');
      onAdded?.(json.data);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900">
          <div><h2 className="text-base font-black text-white">Add Transaction</h2><p className="text-xs text-gray-400 font-mono">{bill.bill_no}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl"><X className="h-5 w-5 text-white"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[{ v:'received_from_transport', label:'Received from Transport', icon:Banknote }, { v:'paid_to_transport', label:'Paid to Transport', icon:CreditCard }].map(({v,label,icon:Icon})=>(
              <button key={v} type="button" onClick={()=>setType(v)}
                className={`py-3 px-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${type===v ? (v==='received_from_transport'?'bg-rose-500 border-rose-500 text-white':'bg-teal-600 border-teal-600 text-white') : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                <Icon className="h-4 w-4"/>{label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl text-xs">
            <div>
              <p className="text-gray-400 font-semibold mb-0.5">Kaat Balance</p>
              <p className="font-black text-rose-600 text-sm">{Rs(bill.balance_on_transport)}</p>
              <p className="text-gray-400 text-[10px]">of {Rs(bill.total_kaat)} total</p>
            </div>
            <div>
              <p className="text-gray-400 font-semibold mb-0.5">PF Balance</p>
              <p className="font-black text-teal-700 text-sm">{Rs(bill.balance_on_us)}</p>
              <p className="text-gray-400 text-[10px]">of {Rs(bill.total_pf)} total</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Amount *</label>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={e=>setAmount(e.target.value)}
              placeholder="0.00" required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500"/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Mode</label>
              <select value={mode} onChange={e=>setMode(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500">
                {['online','cash','cheque','upi'].map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Note (optional)</label>
            <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. First instalment"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          </div>
          {error && <div className="flex items-center gap-2 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin"/>Recording…</> : 'Record Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Bill Row ────────────────────────────────────────────────────────────── */
function BillRow({ bill, expanded, onToggle, onAddTx, userId, token, onBillUpdated, onDeleted, pohonchMap, crossChallanPrint, onPohonchDataLoaded }) {
  const [fullBill,       setFullBill]       = useState(null);
  const [loadingFull,    setLoadingFull]    = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingPdf,  setGeneratingPdf]  = useState(false);
  const [localPdfUrl,    setLocalPdfUrl]    = useState(bill.bill_url || null);
  const [challanUrl,     setChallanUrl]     = useState(bill.crossing_challan_url || null);
  const [challanBusy,    setChallanBusy]    = useState(false);
  const [copied,         setCopied]         = useState(false);

  // Inline edit state
  const [editing,     setEditing]     = useState(false);
  const [editFrom,    setEditFrom]    = useState(bill.from_date || '');
  const [editTo,      setEditTo]      = useState(bill.to_date   || '');
  const [editNotes,   setEditNotes]   = useState(bill.notes     || '');
  const [savingEdit,  setSavingEdit]  = useState(false);

  // Bill recalculate state
  const [billRecalculating, setBillRecalculating] = useState(false);
  const [billRecalcResult,  setBillRecalcResult]  = useState(null);

  // Bill delete state
  const [billDeleting, setBillDeleting] = useState(false);

  const handleDeleteBill = async () => {
    if (!confirm(
      `Delete crossing bill ${bill.bill_no}?\n\nThis will permanently delete the bill and unlink all ${bill.total_pohonch || 0} pohonch from it.\n\nThis action cannot be undone.`
    )) return;
    setBillDeleting(true);
    try {
      const res  = await fetch(`${API_BASE}/api/crossing-bill/${bill.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Delete failed');
      onDeleted?.(bill.id);
    } catch (e) { alert('Delete failed: ' + e.message); }
    finally { setBillDeleting(false); }
  };

  const handleBillRecalculate = async () => {
    setBillRecalculating(true);
    setBillRecalcResult(null);
    try {
      const res  = await fetch(`${API_BASE}/api/crossing-bill/${bill.id}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ updated_by: userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Recalculate failed');
      setBillRecalcResult({ diff: json.diff, new_totals: json.new_totals });
      if (json.data) {
        setFullBill(json.data);
        onBillUpdated?.({
          total_kaat:              json.data.total_kaat,
          total_pf:                json.data.total_pf,
          total_amount:            json.data.total_amount,
          total_bilties:           json.data.total_bilties,
          total_pohonch:           json.data.total_pohonch,
          total_paid_kaat:         json.data.total_paid_kaat,
          total_paid_to_transport: json.data.total_paid_to_transport,
          balance_on_transport:    json.data.balance_on_transport,
          balance_on_us:           json.data.balance_on_us,
        });

        // Totals just changed — the previously uploaded PDF (and its QR code)
        // now describes stale numbers. Regenerate + re-upload it immediately
        // instead of leaving that until someone happens to click Print/View.
        try {
          await handlePdf({ open: false, dataOverride: json.data });
        } catch (e) {
          console.error('PDF regenerate after recalculate failed:', e);
          alert('Bill recalculated, but regenerating the PDF failed — click "Print / View" to retry.\n\n' + e.message);
        }
      }
    } catch (e) { alert('Bill recalculate failed: ' + e.message); }
    finally { setBillRecalculating(false); }
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const res  = await fetch(`${API_BASE}/api/crossing-bill/${bill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ from_date: editFrom || null, to_date: editTo || null, updated_by: userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      onBillUpdated?.({ from_date: editFrom, to_date: editTo });
      setEditing(false);
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSavingEdit(false); }
  };

  // Pohonch management state
  const [removingPohonch, setRemovingPohonch] = useState(null);  // pohonch_number being removed
  const [refreshing,      setRefreshing]      = useState(false);

  const fetchFull = useCallback(async (updateParent = false) => {
    setLoadingFull(true);
    try {
      const res  = await fetch(`${API_BASE}/api/crossing-bill/${bill.id}`, { headers:token?{Authorization:`Bearer ${token}`}:{} });
      const json = await res.json();
      if (json.data) {
        setFullBill(json.data);
        if (updateParent) onBillUpdated?.({ ...json.data });
      }
    } catch (e) { console.error(e); }
    finally { setLoadingFull(false); }
  }, [bill.id, token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res  = await fetch(`${API_BASE}/api/crossing-bill/${bill.id}`, { headers:token?{Authorization:`Bearer ${token}`}:{} });
      const json = await res.json();
      if (json.data) {
        setFullBill(json.data);
        // Sync summary fields back to parent list
        onBillUpdated?.({
          total_kaat:             json.data.total_kaat,
          total_pf:               json.data.total_pf,
          total_amount:           json.data.total_amount,
          total_bilties:          json.data.total_bilties,
          total_pohonch:          json.data.total_pohonch,
          total_paid_kaat:        json.data.total_paid_kaat,
          total_paid_to_transport:json.data.total_paid_to_transport,
          balance_on_transport:   json.data.balance_on_transport,
          balance_on_us:          json.data.balance_on_us,
          status:                 json.data.status,
        });
      }
    } catch (e) { alert('Refresh failed: ' + e.message); }
    finally { setRefreshing(false); }
  };

  const handleRemovePohonch = async (pohonchNumber) => {
    if (!confirm(`Remove pohonch ${pohonchNumber} from bill ${bill.bill_no}?`)) return;
    setRemovingPohonch(pohonchNumber);
    try {
      const res  = await fetch(`${API_BASE}/api/crossing-bill/${bill.id}/remove-pohonch/${encodeURIComponent(pohonchNumber)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ updated_by: userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to remove pohonch');
      // Re-fetch full bill to reflect new totals + pohonch list
      await fetchFull(true);
    } catch (e) { alert(e.message); }
    finally { setRemovingPohonch(null); }
  };

  useEffect(() => { if (expanded && !fullBill) fetchFull(); }, [expanded]);

  // Lift pohonch_data up to the parent so it can lock already-billed pohonch from re-selection
  useEffect(() => {
    if (fullBill?.pohonch_data) onPohonchDataLoaded?.({ ...bill, ...fullBill });
    else if (bill?.pohonch_data) onPohonchDataLoaded?.(bill);
  }, [fullBill, bill, onPohonchDataLoaded]);

  const handleStatus = async (s) => {
    setUpdatingStatus(true);
    try {
      const res  = await fetch(`${API_BASE}/api/crossing-bill/${bill.id}`, {
        method:'PUT', headers:{'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})},
        body: JSON.stringify({ status:s, updated_by:userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      onBillUpdated?.({ status:s });
    } catch (e) { alert(e.message); }
    finally { setUpdatingStatus(false); }
  };

  // `pohonchMap` (prop, from the parent's `allPohonch`) only reflects whatever
  // was last loaded — it is NOT refreshed by this bill's own Recalc Bill, which
  // updates kaat/pf on the `pohonch` table directly. Fetching fresh rows here,
  // scoped to just this bill's pohonch numbers, is what makes the PDF's
  // per-row weight/pkg/PF/kaat (and the grand totals built from them) actually
  // current — falls back to the prop if the fetch fails for any reason.
  const fetchFreshPohonchMap = async (billData) => {
    const numbers = (billData?.pohonch_data || []).map(p => p.pohonch_number).filter(Boolean);
    if (!numbers.length) return pohonchMap;
    try {
      const { data, error } = await supabase.from('pohonch').select('*').in('pohonch_number', numbers);
      if (error) throw error;
      const map = {};
      (data || []).forEach(p => { map[p.pohonch_number] = p; });
      return map;
    } catch (e) {
      console.error('Failed to fetch fresh pohonch data for PDF:', e);
      return pohonchMap;
    }
  };

  // Actually uploads the freshly-built PDF and saves its url on the bill —
  // pulled out of handlePdf so a silent regenerate (after Recalc) can await
  // it directly instead of firing-and-forgetting like the manual click does.
  const uploadPdfAndSave = async (billData, url) => {
    const blob = await fetch(url).then(r => r.blob());
    const fn   = `${billData.bill_no}.pdf`;
    await supabase.storage.from('crossing-bill').upload(fn, blob, { contentType: 'application/pdf', upsert: true });
    const { data: ud } = supabase.storage.from('crossing-bill').getPublicUrl(fn);
    await fetch(`${API_BASE}/api/crossing-bill/${billData.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ bill_url: ud.publicUrl, updated_by: userId }),
    });
    onBillUpdated?.({ bill_url: ud.publicUrl });
    // Keep the crossing challan PDF in sync too — background, never blocks the bill PDF
    refreshChallanPdf(billData).catch(e => console.error('Challan PDF upload:', e));
  };

  const refreshChallanPdf = async (billData) => {
    setChallanBusy(true);
    try {
      const { url } = await uploadCrossingChallanPdf(billData, { token, userId });
      setChallanUrl(url);
      onBillUpdated?.({ crossing_challan_url: url });
      return url;
    } finally { setChallanBusy(false); }
  };

  // Open the stored challan PDF; generate + upload it first if it doesn't exist yet
  const handleChallanPdf = async ({ regenerate = false } = {}) => {
    if (challanUrl && !regenerate) { window.open(challanUrl, '_blank'); return; }
    const win = window.open('', '_blank'); // open now so the popup isn't blocked after the await
    try {
      const url = await refreshChallanPdf(fullBill || bill);
      if (win) win.location.href = `${url}?t=${Date.now()}`; else window.open(url, '_blank');
    } catch (e) {
      win?.close();
      alert('Challan PDF error: ' + e.message);
    }
  };

  // `dataOverride` lets a caller (Recalc Bill) hand over the just-recalculated
  // totals directly — `fullBill` state wouldn't be updated yet in the same tick.
  const handlePdf = async ({ open = false, dataOverride = null } = {}) => {
    setGeneratingPdf(true);
    try {
      let data = dataOverride || fullBill;
      if (!data) {
        const res  = await fetch(`${API_BASE}/api/crossing-bill/${bill.id}`, { headers:token?{Authorization:`Bearer ${token}`}:{} });
        const json = await res.json(); data = json.data; setFullBill(data);
      }
      const freshPohonchMap = await fetchFreshPohonchMap(data);
      const url = await buildBillPdf(data, freshPohonchMap);
      setLocalPdfUrl(url);
      if (open) {
        window.open(url, '_blank');
        // Upload in background — don't await so the tab opens immediately.
        uploadPdfAndSave(data, url).catch((e) => {
          console.error('PDF upload error:', e);
          // The tab already opened with a PDF whose QR code points at this
          // upload — surface the failure instead of leaving a silently dead link.
          alert(`PDF upload failed — the QR code in the PDF you just opened won't resolve until you retry "Print / View".\n\n${e.message}`);
        });
      } else {
        // Silent regenerate (e.g. right after Recalc Bill) — wait for the real
        // upload so the storage copy is guaranteed in sync before this returns,
        // and let the caller decide how to report a failure.
        await uploadPdfAndSave(data, url);
      }
    } catch (e) {
      if (open) alert('PDF error: ' + e.message);
      else throw e;
    }
    finally { setGeneratingPdf(false); }
  };

  const copyUrl = async () => {
    const url = localPdfUrl || bill.bill_url;
    if (url) { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(()=>setCopied(false), 2000); }
  };

  const nextStatuses = { draft:['sent','cancelled'], sent:['partial_paid','cancelled'], partial_paid:['paid','cancelled'], paid:[], cancelled:[] }[bill.status] || [];
  const statusLabel  = { sent:'Mark Sent', partial_paid:'Part. Paid', paid:'Mark Paid', cancelled:'Cancel' };
  const display      = { ...bill, ...(fullBill || {}) };

  // Payment progress
  const kaatPct = pct(bill.total_paid_kaat, bill.total_kaat);
  const pfPct   = pct(bill.total_paid_to_transport, bill.total_pf);

  const pdfLink = localPdfUrl;

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* ── Bill summary row ── */}
      <div className={`px-5 py-4 transition-colors ${expanded ? 'bg-slate-50' : 'hover:bg-gray-50/80'}`}>
        <div className="flex items-start gap-3 flex-wrap">
          <button onClick={onToggle} className="mt-1 text-gray-400 hover:text-gray-700 shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
          </button>

          <div className="flex-1 min-w-0 space-y-2">
            {/* Top row */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-black text-sm font-mono text-gray-900">{bill.bill_no}</span>
              <StatusBadge status={bill.status}/>
              {bill.from_date && <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-full">{bill.from_date} → {bill.to_date || '—'}</span>}
              {bill.created_at && <span className="text-[10px] text-gray-400">Created {format(new Date(bill.created_at), 'dd MMM yy')}</span>}
            </div>

            {/* Amounts row */}
            <div className="flex items-center gap-4 flex-wrap text-[11px]">
              <span className="text-gray-500">{bill.total_pohonch} pohonch · {bill.total_bilties} bilties</span>
              <span className="font-bold text-gray-700">Total: {Rs(bill.total_amount)}</span>
              <span className="font-bold text-rose-600">Kaat: {Rs(bill.total_kaat)}</span>
              <span className="font-bold text-teal-700">PF: {Rs(bill.total_pf)}</span>
            </div>

            {/* Payment progress */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {/* Kaat progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-500 font-semibold">Transport Payment (Kaat)</span>
                  <span className="font-black text-rose-600">{Rs(bill.total_paid_kaat)} / {Rs(bill.total_kaat)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all" style={{ width:`${kaatPct}%` }}/>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400">Remaining: <span className="font-bold text-rose-500">{Rs(bill.balance_on_transport)}</span></span>
                  <span className="text-gray-400">{kaatPct}% received</span>
                </div>
              </div>
              {/* PF progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-500 font-semibold">Our Payment (PF)</span>
                  <span className="font-black text-teal-700">{Rs(bill.total_paid_to_transport)} / {Rs(bill.total_pf)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all" style={{ width:`${pfPct}%` }}/>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400">Remaining: <span className="font-bold text-teal-600">{Rs(bill.balance_on_us)}</span></span>
                  <span className="text-gray-400">{pfPct}% paid</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <button onClick={handleRefresh} disabled={refreshing} title="Refresh bill data from server"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 disabled:opacity-50 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing?'animate-spin':''}`}/>
                {refreshing?'Syncing…':'Refresh'}
              </button>
              <button onClick={handleBillRecalculate} disabled={billRecalculating || bill.status === 'cancelled'}
                title="Recalculate bill totals from live pohonch data"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 disabled:opacity-50 transition-colors">
                <RotateCcw className={`w-3.5 h-3.5 ${billRecalculating?'animate-spin':''}`}/>
                {billRecalculating?'Recalculating…':'Recalc Bill'}
              </button>
              <button onClick={handleDeleteBill} disabled={billDeleting}
                title="Permanently delete this crossing bill"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 disabled:opacity-50 transition-colors">
                {billDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Trash2 className="w-3.5 h-3.5"/>}
                {billDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button onClick={()=>handlePdf({ open:true })} disabled={generatingPdf}
                title="Generate &amp; view bill PDF"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 disabled:opacity-50 transition-colors">
                {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Printer className="w-3.5 h-3.5"/>}
                {generatingPdf ? 'Generating…' : 'Print / View'}
              </button>
              <button onClick={()=>handleChallanPdf()} disabled={challanBusy}
                title={challanUrl ? 'Open saved crossing challan PDF (all pohonch)' : 'Generate & upload crossing challan PDF (all pohonch)'}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-200 disabled:opacity-50 transition-colors">
                {challanBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileText className="w-3.5 h-3.5"/>}
                {challanBusy ? 'Uploading…' : 'Challan PDF'}
              </button>
              {challanUrl && !challanBusy && (
                <button onClick={()=>handleChallanPdf({ regenerate:true })} title="Regenerate & re-upload challan PDF with latest data"
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-200">
                  <RotateCcw className="w-3.5 h-3.5"/>
                </button>
              )}
              {localPdfUrl && (
                <button onClick={copyUrl} title="Copy PDF URL"
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600"/> : <Copy className="w-3.5 h-3.5"/>}
                </button>
              )}
              {bill.status !== 'paid' && bill.status !== 'cancelled' && (
                <button onClick={onAddTx}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm">
                  <Plus className="w-3.5 h-3.5"/> Payment
                </button>
              )}
            </div>
            {/* Edit + Status transitions */}
            <div className="flex gap-1 flex-wrap justify-end">
              {/* Edit date range */}
              {bill.status !== 'cancelled' && !editing && (
                <button onClick={()=>{ setEditFrom(bill.from_date||''); setEditTo(bill.to_date||''); setEditing(true); }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-black border text-gray-600 border-gray-200 hover:bg-gray-50 transition-all">
                  Edit Dates
                </button>
              )}
              {nextStatuses.map(s => (
                <button key={s} onClick={()=>handleStatus(s)} disabled={updatingStatus}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${s==='cancelled'?'text-red-600 border-red-200 hover:bg-red-50':'text-blue-700 border-blue-200 hover:bg-blue-50'}`}>
                  {updatingStatus ? '…' : statusLabel[s] || s}
                </button>
              ))}
            </div>
            {/* PDF URL display */}
            {pdfLink && (
              <p className="text-[9px] text-gray-300 font-mono truncate max-w-[200px]" title={pdfLink}>{pdfLink}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Recalc result diff banner ── */}
      {billRecalcResult && (
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-200 flex items-center gap-3 flex-wrap">
          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0"/>
          <span className="text-xs font-bold text-amber-800">{bill.bill_no} recalculated</span>
          {billRecalcResult.diff && Object.entries({ Kaat: billRecalcResult.diff.kaat, PF: billRecalcResult.diff.pf, Amount: billRecalcResult.diff.amount }).map(([label, val]) =>
            val !== 0 && val != null ? (
              <span key={label} className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${val > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                {label}: {val > 0 ? '+' : ''}{Rs(val)}
              </span>
            ) : null
          )}
          {billRecalcResult.diff && billRecalcResult.diff.kaat === 0 && billRecalcResult.diff.pf === 0 && (
            <span className="text-xs text-gray-500 italic">No change in totals</span>
          )}
          <button onClick={() => setBillRecalcResult(null)} className="ml-auto p-1 hover:bg-amber-100 rounded-lg">
            <X className="w-3.5 h-3.5 text-amber-500"/>
          </button>
        </div>
      )}

      {/* ── Inline edit form ── */}
      {editing && (
        <div className="px-5 py-4 bg-amber-50 border-t border-amber-200">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-3">Edit Bill — {bill.bill_no}</p>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">From Date</label>
              <input type="date" value={editFrom} onChange={e=>setEditFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"/>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">To Date</label>
              <input type="date" value={editTo} onChange={e=>setEditTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"/>
            </div>
            <button onClick={handleSaveEdit} disabled={savingEdit}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 disabled:opacity-50">
              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Check className="w-3.5 h-3.5"/>}
              {savingEdit ? 'Saving…' : 'Save'}
            </button>
            <button onClick={()=>setEditing(false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50">
              <X className="w-3.5 h-3.5"/> Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="px-5 pb-5 bg-slate-50 border-t border-slate-200 space-y-5">
          {loadingFull ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4"><Loader2 className="h-4 w-4 animate-spin"/>Loading bill details…</div>
          ) : (
            <>
              {/* Pohonch table with manage actions */}
              {display.pohonch_data?.length > 0 && (
                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Pohonch in this bill ({display.pohonch_data.length})
                    </p>
                    <div className="flex items-center gap-2">
                      {bill.status === 'draft' && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                          Draft — pohonch can be removed
                        </span>
                      )}
                      {crossChallanPrint && display.pohonch_data?.length > 0 && (
                        <button
                          onClick={() => crossChallanPrint.handlePrintMultiple(display.pohonch_data.map(p => p.pohonch_number))}
                          disabled={crossChallanPrint.printingBatch}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                        >
                          {crossChallanPrint.printingBatch
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Generating…</>
                            : <><Printer className="w-3.5 h-3.5"/>Print All Pohonch ({display.pohonch_data.length})</>}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-gray-50 border-b border-gray-100">
                        {['#','Pohonch No.','Challans','Bilties','Kaat','PF','Total','Signed', bill.status==='draft'?'Remove':''].filter(Boolean).map(h=>(
                          <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {display.pohonch_data.map((p,i)=>(
                          <tr key={p.pohonch_number||i} className={`border-b border-gray-50 last:border-0 ${i%2===0?'bg-white':'bg-gray-50/30'}`}>
                            <td className="px-3 py-2 text-gray-400 font-medium text-center">{i+1}</td>
                            <td className="px-3 py-2 font-mono font-bold text-teal-700">{p.pohonch_number}</td>
                            <td className="px-3 py-2 text-gray-600 text-[10px]">{(p.challan_nos||[]).join(', ')||'-'}</td>
                            <td className="px-3 py-2 text-center text-black">{p.total_bilties}</td>
                            <td className="px-3 py-2 text-right text-rose-600 font-bold">{Rs(p.total_kaat)}</td>
                            <td className="px-3 py-2 text-right text-teal-700 font-bold">{Rs(p.total_pf)}</td>
                            <td className="px-3 py-2 text-right text-black font-bold">{Rs(p.total_amount)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_signed?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}>
                                {p.is_signed?'Signed':'Unsigned'}
                              </span>
                            </td>
                            {bill.status === 'draft' && (
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => handleRemovePohonch(p.pohonch_number)}
                                  disabled={removingPohonch === p.pohonch_number}
                                  title={`Remove ${p.pohonch_number} from this bill`}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 disabled:opacity-50 transition-colors">
                                  {removingPohonch === p.pohonch_number
                                    ? <Loader2 className="w-3 h-3 animate-spin"/>
                                    : <Trash2 className="w-3 h-3"/>}
                                  Remove
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Transactions */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Transaction History</p>
                {!display.transactions?.length ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-xl text-xs text-gray-400 italic">
                    No transactions recorded yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {display.transactions.map((tx, i)=>{
                      const isRcvd = tx.type === 'received_from_transport';
                      return (
                        <div key={tx.id||i}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${isRcvd?'bg-rose-50 border-rose-100':'bg-teal-50 border-teal-100'}`}>
                          <div className={`p-2 rounded-lg shrink-0 ${isRcvd?'bg-rose-100':'bg-teal-100'}`}>
                            {isRcvd ? <Banknote className="w-3.5 h-3.5 text-rose-600"/> : <CreditCard className="w-3.5 h-3.5 text-teal-600"/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold ${isRcvd?'text-rose-700':'text-teal-700'}`}>
                              {isRcvd ? 'Received from Transport' : 'Paid to Transport'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-gray-500">{tx.date}</span>
                              <span className="text-gray-400 capitalize bg-white px-1.5 py-0.5 rounded border border-gray-200">{tx.mode}</span>
                              {tx.note && <span className="text-gray-500 italic">— {tx.note}</span>}
                            </div>
                          </div>
                          <span className="font-black text-gray-900 shrink-0 text-sm">{Rs(tx.amount)}</span>
                        </div>
                      );
                    })}
                    {/* Running totals after transactions */}
                    <div className="grid grid-cols-2 gap-2 mt-1 p-3 bg-white rounded-xl border border-gray-200">
                      <div className="text-xs">
                        <p className="text-gray-400 font-semibold mb-0.5">Total Received</p>
                        <p className="font-black text-rose-600">{Rs(display.transactions.filter(t=>t.type==='received_from_transport').reduce((s,t)=>s+(t.amount||0),0))}</p>
                      </div>
                      <div className="text-xs">
                        <p className="text-gray-400 font-semibold mb-0.5">Total Paid Out</p>
                        <p className="font-black text-teal-700">{Rs(display.transactions.filter(t=>t.type==='paid_to_transport').reduce((s,t)=>s+(t.amount||0),0))}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ───────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, sub }) {
  const map = { teal:'from-teal-500 to-teal-600', rose:'from-rose-500 to-rose-600', amber:'from-amber-500 to-amber-600', purple:'from-purple-500 to-purple-600', emerald:'from-emerald-500 to-emerald-600', gray:'from-gray-600 to-gray-700' };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wide">{label}</p>
      <p className={`text-lg font-extrabold bg-gradient-to-r ${map[color]||map.teal} bg-clip-text text-transparent`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function CrossingBillTransportPage() {
  const rawParams = useParams();
  const gstin     = decodeURIComponent(rawParams['transport-gstin'] || '');
  const { user, token } = useAuth();

  const [allPohonch,      setAllPohonch]      = useState([]);
  const [loadingPohonch,  setLoadingPohonch]  = useState(true);
  const [bills,           setBills]           = useState([]);
  const [loadingBills,    setLoadingBills]    = useState(true);
  const [expandedBill,    setExpandedBill]    = useState(new Set());
  const [expandedPohonch, setExpandedPohonch] = useState(new Set());
  const [activeStation,   setActiveStation]   = useState(null);
  const [txBill,          setTxBill]          = useState(null);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [showNilFinder,   setShowNilFinder]   = useState(false);
  const [showChallanReport, setShowChallanReport] = useState(false);
  const [page,            setPage]            = useState(1);
  const [hasMore,         setHasMore]         = useState(false);
  const [mounted,         setMounted]         = useState(false);

  // Pohonch selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Pohonch already covered by an existing (non-cancelled) bill — locked from re-selection
  const [billedPohonchMap, setBilledPohonchMap] = useState(new Map()); // pohonch_number -> bill_no
  const handlePohonchDataLoaded = useCallback((billData) => {
    if (!billData || billData.status === 'cancelled' || !Array.isArray(billData.pohonch_data)) return;
    setBilledPohonchMap(prev => {
      let changed = false;
      const next = new Map(prev);
      billData.pohonch_data.forEach(p => {
        if (p?.pohonch_number && next.get(p.pohonch_number) !== billData.bill_no) {
          next.set(p.pohonch_number, billData.bill_no);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  // Recalculate state
  const [recalculating,     setRecalculating]     = useState(new Set()); // per-row loading
  const [bulkRecalculating, setBulkRecalculating] = useState(false);
  const [recalcResult,      setRecalcResult]      = useState(null);      // { type:'single'|'bulk', results }

  // Hub (contracted) kaat rates
  const [hubRates, setHubRates] = useState([]);

  // Kaat modal
  const [kaatModalOpen,    setKaatModalOpen]    = useState(false);
  const [kaatModalTab,     setKaatModalTab]     = useState('bulk');
  const [kaatModalBilties, setKaatModalBilties] = useState([]);
  const [kaatModalGstin,   setKaatModalGstin]   = useState('');
  const [syncing,          setSyncing]           = useState(false);

  const crossChallanPrint = useCrossChallanPrint({
    onDataRefreshed: (pohonchNumber, updatedPohonch) => {
      setAllPohonch(prev => prev.map(p => p.pohonch_number === pohonchNumber ? { ...p, ...updatedPohonch } : p));
    },
  });

  useEffect(() => { setMounted(true); }, []);

  const fetchPohonch = useCallback(async (silent = false) => {
    if (!silent) setLoadingPohonch(true);
    else         setSyncing(true);
    try {
      const { data, error } = await supabase
        .from('pohonch').select('*').eq('is_active', true)
        .ilike('transport_gstin', `%${gstin}%`).order('created_at', { ascending: false });
      if (error) throw error;
      setAllPohonch(data || []);
    } catch (e) { console.error('fetchPohonch:', e); }
    finally {
      if (!silent) setLoadingPohonch(false);
      else         setSyncing(false);
    }
  }, [gstin]);

  const fetchBills = useCallback(async (pg = 1) => {
    if (pg === 1) setLoadingBills(true);
    try {
      const p   = new URLSearchParams({ transport_gstin:gstin, page:pg, page_size:20 });
      const res = await fetch(`${API_BASE}/api/crossing-bill?${p}`, { headers:token?{Authorization:`Bearer ${token}`}:{} });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      if (pg === 1) setBills(json.data?.rows || []);
      else setBills(prev => [...prev, ...(json.data?.rows || [])]);
      setHasMore(json.data?.has_more || false);
      setPage(pg);
    } catch (e) { console.error('fetchBills:', e); }
    finally { setLoadingBills(false); }
  }, [gstin, token]);

  // Fetch contracted hub rates: transports → transport_hub_rates → cities
  const fetchHubRates = useCallback(async () => {
    try {
      // Find transport(s) matching this GSTIN
      const { data: transports } = await supabase
        .from('transports')
        .select('id')
        .ilike('gst_number', `%${gstin}%`);

      if (!transports?.length) return;

      const transportIds = transports.map(t => t.id);

      // Fetch active hub rates for this transport
      const { data: rates } = await supabase
        .from('transport_hub_rates')
        .select('*')
        .in('transport_id', transportIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!rates?.length) return;

      // Fetch destination cities
      const cityIds = [...new Set(rates.map(r => r.destination_city_id).filter(Boolean))];
      const { data: cities } = cityIds.length
        ? await supabase.from('cities').select('id, city_name, city_code').in('id', cityIds)
        : { data: [] };

      const cityMap = {};
      (cities || []).forEach(c => { cityMap[c.id] = c; });

      setHubRates(rates.map(r => ({
        ...r,
        cityName: (cityMap[r.destination_city_id]?.city_name || '').toUpperCase(),
        cityCode: cityMap[r.destination_city_id]?.city_code || '',
      })));
    } catch (e) { console.error('fetchHubRates:', e); }
  }, [gstin]);

  useEffect(() => { if (mounted) { fetchPohonch(); fetchBills(1); fetchHubRates(); } }, [mounted, fetchPohonch, fetchBills, fetchHubRates]);

  // Auto-expand all bills when they first load
  useEffect(() => {
    if (bills.length > 0) setExpandedBill(new Set(bills.map(b => b.id)));
  }, [bills.length]);

  // Auto-expand pohonch that contain bilties for the active station
  useEffect(() => {
    if (!activeStation) return;
    setExpandedPohonch(prev => {
      const next = new Set(prev);
      allPohonch.forEach(p => {
        if ((p.bilty_metadata || []).some(b => (b.destination || '').trim().toUpperCase() === activeStation))
          next.add(p.id);
      });
      return next;
    });
  }, [activeStation, allPohonch]);

  const transportName = useMemo(() => {
    if (allPohonch.length) return allPohonch[0].transport_name;
    if (bills.length)      return bills[0].transport_name;
    return gstin;
  }, [allPohonch, bills, gstin]);

  // Pohonch lookup map (number → pohonch) for PDF builder
  const pohonchMap = useMemo(() => {
    const m = {};
    allPohonch.forEach(p => { m[p.pohonch_number] = p; });
    return m;
  }, [allPohonch]);

  // Pohonch search + sort
  const [pohonchSearch, setPohonchSearch] = useState('');
  const [sortBy,        setSortBy]        = useState('created_at');
  const [sortDir,       setSortDir]       = useState('desc');

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const selectedPohonch = useMemo(() => allPohonch.filter(p => selectedIds.has(p.id)), [allPohonch, selectedIds]);

  // Unselected + filtered + sorted list
  const displayPohonch = useMemo(() => {
    const q = pohonchSearch.trim().toLowerCase();
    const unselected = allPohonch.filter(p => !selectedIds.has(p.id));
    const filtered = q
      ? unselected.filter(p =>
          (p.pohonch_number  || '').toLowerCase().includes(q) ||
          (p.challan_metadata || []).some(c => String(c).toLowerCase().includes(q)) ||
          (p.bilty_metadata  || []).some(b =>
            (b.pohonch_bilty || '').toLowerCase().includes(q) ||
            (b.gr_no         || '').toLowerCase().includes(q)
          )
        )
      : unselected;
    const getPbNo = (p) => (Array.isArray(p.bilty_metadata) ? p.bilty_metadata.map(b => b.pohonch_bilty).filter(Boolean)[0] || '' : '');
    return [...filtered].sort((a, b) => {
      // Unbilled (selectable) pohonch always float above locked/billed ones
      const aBilled = billedPohonchMap.has(a.pohonch_number);
      const bBilled = billedPohonchMap.has(b.pohonch_number);
      if (aBilled !== bBilled) return aBilled ? 1 : -1;

      let va = sortBy === '_pb_no' ? getPbNo(a) : a[sortBy];
      let vb = sortBy === '_pb_no' ? getPbNo(b) : b[sortBy];
      if (va == null) va = 0; if (vb == null) vb = 0;
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [allPohonch, selectedIds, pohonchSearch, sortBy, sortDir, billedPohonchMap]);

  const selectedTotals = useMemo(() => selectedPohonch.reduce(
    (a, p) => ({
      kaat: a.kaat + (p.total_kaat || 0),
      pf:   a.pf   + (p.total_pf   || 0),
      amt:  a.amt  + (p.total_amount || 0),
      bilties: a.bilties + (p.total_bilties || 0),
      wt:   a.wt   + (p.total_weight || 0),
    }),
    { kaat: 0, pf: 0, amt: 0, bilties: 0, wt: 0 }
  ), [selectedPohonch]);

  const toggleRow    = (id) => {
    const p = allPohonch.find(x => x.id === id);
    if (p && billedPohonchMap.has(p.pohonch_number)) return; // locked — already billed
    setSelectedIds(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  };
  const selectAll    = () => setSelectedIds(new Set(allPohonch.filter(p => !billedPohonchMap.has(p.pohonch_number)).map(p=>p.id)));
  const deselectAll  = () => setSelectedIds(new Set());

  // Safety net: if a pohonch gets marked billed after it was already selected (race on load), drop it
  useEffect(() => {
    if (billedPohonchMap.size === 0) return;
    setSelectedIds(prev => {
      const billedSelected = allPohonch.filter(p => prev.has(p.id) && billedPohonchMap.has(p.pohonch_number));
      if (!billedSelected.length) return prev;
      const next = new Set(prev);
      billedSelected.forEach(p => next.delete(p.id));
      return next;
    });
  }, [billedPohonchMap, allPohonch]);
  const toggleExpand = (id) => setExpandedPohonch(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  const handleStationClick = (city) => {
    setActiveStation(prev => prev === city ? null : city);
  };

  const billStats = useMemo(() => bills.reduce(
    (a,b) => ({
      total_kaat:        a.total_kaat        + (b.total_kaat              || 0),
      total_pf:          a.total_pf          + (b.total_pf                || 0),
      balance_transport: a.balance_transport + (b.balance_on_transport    || 0),
      balance_us:        a.balance_us        + (b.balance_on_us           || 0),
      total_paid_kaat:   a.total_paid_kaat   + (b.total_paid_kaat         || 0),
      total_paid_us:     a.total_paid_us     + (b.total_paid_to_transport || 0),
    }),
    { total_kaat:0, total_pf:0, balance_transport:0, balance_us:0, total_paid_kaat:0, total_paid_us:0 }
  ), [bills]);

  // Month-wise total PF for this transport — across ALL pohonch (billed or not), by pohonch creation month
  const monthlyPfStats = useMemo(() => {
    const map = {};
    allPohonch.forEach(p => {
      if (!p.created_at) return;
      const d   = new Date(p.created_at);
      const key = format(d, 'yyyy-MM');
      if (!map[key]) map[key] = { key, label: format(d, 'MMM yyyy'), pf: 0, kaat: 0, pohonchCount: 0, biltyCount: 0 };
      map[key].pf          += p.total_pf      || 0;
      map[key].kaat         += p.total_kaat    || 0;
      map[key].pohonchCount += 1;
      map[key].biltyCount   += p.total_bilties || 0;
    });
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key)); // newest month first
  }, [allPohonch]);

  // Build a lookup: cityName(uppercase) → best hub rate row for this transport
  const hubRatesByCity = useMemo(() => {
    const m = {};
    hubRates.forEach(r => {
      const key = r.cityName;
      if (!key) return;
      // prefer per_kg rates; keep first match per city
      if (!m[key]) m[key] = r;
    });
    return m;
  }, [hubRates]);

  const stationRates = useMemo(() => {
    const map = {};
    // Skip pohonch already covered by an existing bill (locked) — their kaat rate is settled,
    // so it shouldn't pull the actual/contract variance for a station out of whack.
    allPohonch.filter(p => !billedPohonchMap.has(p.pohonch_number)).forEach(p => {
      (p.bilty_metadata||[]).forEach(b => {
        const city = (b.destination||'').trim().toUpperCase();
        if (!city) return;
        if (!map[city]) map[city] = { city, rates:[], count:0, kaat:0, grNos:[] };
        map[city].count++;
        map[city].kaat += b.kaat||0;
        if (b.kaat_rate!=null) map[city].rates.push(parseFloat(b.kaat_rate));
        if (b.gr_no) map[city].grNos.push(b.gr_no);
      });
    });
    return Object.values(map)
      .map(c => {
        const avgRate = c.rates.length ? +(c.rates.reduce((a,b)=>a+b,0)/c.rates.length).toFixed(2) : null;
        const hub     = hubRatesByCity[c.city] || null;
        const contractedRate = hub
          ? (hub.pricing_mode === 'per_kg' ? hub.rate_per_kg : hub.pricing_mode === 'per_pkg' ? hub.rate_per_pkg : hub.rate_per_kg || hub.rate_per_pkg)
          : null;
        const variance = avgRate != null && contractedRate != null ? +(avgRate - contractedRate).toFixed(2) : null;
        return {
          city:c.city, count:c.count, avgRate, totalKaat:c.kaat,
          hub, contractedRate, variance, grNos: c.grNos,
        };
      })
      .sort((a,b)=>b.count-a.count);
  }, [allPohonch, hubRatesByCity, billedPohonchMap]);

  const [printingRates, setPrintingRates] = useState(false);
  const handlePrintRates = async () => {
    const win = window.open('', '_blank'); // open now so the popup isn't blocked after the await
    setPrintingRates(true);
    try {
      const url = await buildStationRatesPdf({ transportName, gstin, hubRates });
      if (win) win.location.href = url; else window.open(url, '_blank');
    } catch (e) {
      win?.close();
      alert('Rate list PDF error: ' + e.message);
    } finally { setPrintingRates(false); }
  };

  // Fix a station's bilties to the contracted kaat rate — POST /api/kaat/bulk-update-by-grs
  const [fixingStation, setFixingStation] = useState(null); // city currently being fixed
  const [fixResult,     setFixResult]     = useState(null); // { city, data } | { city, error }

  const handleFixStationRate = async (station) => {
    if (!station.contractedRate || !station.grNos?.length) return;
    if (!confirm(`Update kaat rate to ₹${station.contractedRate} for all ${station.grNos.length} bilties in ${station.city}?\n\nThis recalculates kaat + PF for each bilty from the contracted rate.`)) return;
    setFixingStation(station.city);
    setFixResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/kaat/bulk-update-by-grs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ gr_nos: station.grNos, new_kaat_rate: station.contractedRate }),
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Failed to update kaat rate');
      setFixResult({ city: station.city, data: json });
      await fetchPohonch(true); // refresh so rates/variance recompute from live data
    } catch (e) {
      setFixResult({ city: station.city, error: e.message });
    } finally {
      setFixingStation(null);
    }
  };

  // Pohonch IDs that have bilties for the active station (for highlight)
  const stationPohonchIds = useMemo(() => {
    if (!activeStation) return new Set();
    return new Set(
      allPohonch
        .filter(p => (p.bilty_metadata || []).some(b => (b.destination || '').trim().toUpperCase() === activeStation))
        .map(p => p.id)
    );
  }, [activeStation, allPohonch]);

  // Kaat modal helpers
  const mapBiltiesForKaat = (biltyMetadata) => (biltyMetadata||[]).map(b=>({
    gr_no:b.gr_no, to_city:b.destination, kaat:b.kaat, kaat_rate:b.kaat_rate,
    kaat_dd:b.dd, kaat_pf:b.pf, wt:b.weight, total:b.amount, consignor_name:b.consignor,
  }));

  const openKaatModal = () => {
    const rows = selectedPohonch;
    const gstins = [...new Set(rows.map(p=>p.transport_gstin).filter(Boolean))];
    setKaatModalGstin(gstins.length===1?gstins[0]:gstin);
    setKaatModalBilties(rows.flatMap(p=>mapBiltiesForKaat(p.bilty_metadata)));
    setKaatModalTab('bulk');
    setKaatModalOpen(true);
  };

  // Single pohonch recalculate — fetches fresh Supabase data after so all fields (incl. bilty_metadata) re-render
  const handleRecalculate = async (pohonch) => {
    setRecalculating(prev => new Set([...prev, pohonch.id]));
    setRecalcResult(null);
    try {
      const res  = await fetch(`${API_BASE}/api/pohonch/${pohonch.id}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ user_id: user?.id, force: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Recalculate failed');
      // Show diff result first
      setRecalcResult({ type: 'single', pohonch_number: json.pohonch_number, diff: json.diff, new_totals: json.new_totals });
      // Pull fresh data from Supabase — this updates bilty_metadata + totals so expanded rows re-render correctly
      await fetchPohonch(true);
    } catch (e) {
      alert('Recalculate failed: ' + e.message);
    } finally {
      setRecalculating(prev => { const n = new Set(prev); n.delete(pohonch.id); return n; });
    }
  };

  // Bulk recalculate selected pohonch
  const handleBulkRecalculate = async () => {
    if (!selectedPohonch.length) return;
    setBulkRecalculating(true);
    setRecalcResult(null);
    try {
      const res  = await fetch(`${API_BASE}/api/pohonch/bulk-recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          pohonch_numbers: selectedPohonch.map(p => p.pohonch_number),
          user_id: user?.id,
          force: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Bulk recalculate failed');
      setRecalcResult({ type: 'bulk', results: json.results || [], processed: json.processed, skipped: json.skipped_signed });
      // Silent refresh to pick up new totals
      await fetchPohonch(true);
    } catch (e) {
      alert('Bulk recalculate failed: ' + e.message);
    } finally {
      setBulkRecalculating(false);
    }
  };

  // Recalculate all pohonch for this transport
  const handleRecalculateAll = async () => {
    if (!allPohonch.length) return;
    if (!confirm(`Recalculate all ${allPohonch.length} pohonch for this transport?`)) return;
    setBulkRecalculating(true);
    setRecalcResult(null);
    try {
      const res  = await fetch(`${API_BASE}/api/pohonch/bulk-recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ transport_gstin: gstin, user_id: user?.id, force: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed');
      setRecalcResult({ type: 'bulk', results: json.results || [], processed: json.processed, skipped: json.skipped_signed });
      await fetchPohonch(true);
    } catch (e) {
      alert('Recalculate all failed: ' + e.message);
    } finally {
      setBulkRecalculating(false);
    }
  };

  const handleTxAdded = (updatedData) => {
    setBills(prev=>prev.map(b=>b.id===txBill?.id?{...b,...updatedData}:b));
    setTxBill(null);
  };

  const handleBillCreated = () => { fetchBills(1); fetchPohonch(); setSelectedIds(new Set()); };

  // Backfill: upload the crossing challan PDF for EVERY crossing bill in the
  // system (all transports) that doesn't have crossing_challan_url yet.
  const [challanSync, setChallanSync] = useState(null); // { done, total, failed, current }
  const syncAllChallanPdfs = async () => {
    if (challanSync) return;
    const all = [];
    try {
      for (let pg = 1; ; pg++) {
        const res  = await fetch(`${API_BASE}/api/crossing-bill?page=${pg}&page_size=100`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to load bills');
        all.push(...(json.data?.rows || []));
        if (!json.data?.has_more) break;
      }
    } catch (e) { alert('Could not load bills: ' + e.message); return; }

    const missing = all.filter(b => !b.crossing_challan_url && b.status !== 'cancelled');
    const redoAll = !missing.length
      ? confirm(`All ${all.length} bills already have a challan PDF. Regenerate all of them with latest data?`)
      : false;
    const todo = redoAll ? all.filter(b => b.status !== 'cancelled') : missing;
    if (!todo.length) return;
    if (!redoAll && !confirm(`Upload crossing challan PDF for ${todo.length} bill(s) (all transports)? Keep this tab open until it finishes.`)) return;

    const failed = [];
    setChallanSync({ done: 0, total: todo.length, failed: 0, current: '' });
    for (let i = 0; i < todo.length; i++) {
      const b = todo[i];
      setChallanSync(s => ({ ...s, current: b.bill_no }));
      try {
        const { url } = await uploadCrossingChallanPdf(b, { token, userId: user?.id });
        setBills(prev => prev.map(x => x.id === b.id ? { ...x, crossing_challan_url: url } : x));
      } catch (e) {
        console.error(`Challan PDF ${b.bill_no}:`, e);
        failed.push(`${b.bill_no}: ${e.message}`);
      }
      setChallanSync(s => ({ ...s, done: i + 1, failed: failed.length }));
    }
    setChallanSync(null);
    fetchBills(1);
    alert(`Challan PDFs uploaded: ${todo.length - failed.length}/${todo.length}` + (failed.length ? `\n\nFailed:\n${failed.join('\n')}` : ''));
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      <div className="w-full px-4 sm:px-6 py-4 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start gap-4 flex-wrap">
          <Link href="/hub-management/cross-challan/crossing-bill"
            className="p-2 hover:bg-white rounded-xl shadow-sm border border-gray-200 shrink-0 transition-colors mt-1"
            title="All Crossing Bills">
            <ArrowLeft className="w-5 h-5 text-gray-700"/>
          </Link>
          <Link href="/hub-management/cross-challan/cross-challan-list"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm shrink-0 transition-colors mt-1">
            <FileText className="w-4 h-4"/> Pohonch List
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{transportName}</h1>
            <p className="text-sm font-mono text-gray-500 mt-0.5">{gstin}</p>
          </div>
          <button onClick={()=>setShowNilFinder(true)}
            title="Find dispatched bilties with no pohonch proof, and create a catch-up pohonch"
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm font-semibold text-rose-700 hover:bg-rose-100 shadow-sm">
            <PackagePlus className="w-4 h-4"/> Nil Bilty Finder
          </button>
          <button onClick={()=>setShowChallanReport(true)}
            title="See every challan dispatched in a month, and every bilty on them, with proof status"
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-50 border border-sky-200 rounded-xl text-sm font-semibold text-sky-700 hover:bg-sky-100 shadow-sm">
            <FileSearch className="w-4 h-4"/> Challan Report
          </button>
          <button onClick={handleRecalculateAll} disabled={bulkRecalculating || !allPohonch.length}
            title="Recalculate all pohonch for this transport from live bilty data"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800 hover:bg-amber-100 shadow-sm disabled:opacity-50">
            <RotateCcw className={`w-4 h-4 ${bulkRecalculating?'animate-spin':''}`}/>
            {bulkRecalculating ? 'Recalculating…' : 'Recalc All'}
          </button>
          <button onClick={()=>{fetchPohonch();fetchBills(1);fetchHubRates();}} disabled={loadingPohonch}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-50 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loadingPohonch?'animate-spin':''}`}/> Refresh
          </button>
        </div>

        {/* ── Bill Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label:'Bills',            value:bills.length,                   color:'teal' },
            { label:'Total Kaat',       value:Rs(billStats.total_kaat),       color:'rose' },
            { label:'Total PF',         value:Rs(billStats.total_pf),         color:'teal' },
            { label:'Rcvd (Kaat)',       value:Rs(billStats.total_paid_kaat),  color:'emerald', sub:`Bal: ${Rs(billStats.balance_transport)}` },
            { label:'Paid (PF)',         value:Rs(billStats.total_paid_us),    color:'purple',  sub:`Bal: ${Rs(billStats.balance_us)}` },
            { label:'All Pohonch',       value:allPohonch.length,              color:'gray' },
          ].map(c=><StatCard key={c.label} {...c}/>)}
        </div>

        {/* ── Month-wise Total PF ── */}
        {monthlyPfStats.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600"/>
              <h2 className="text-sm font-bold text-gray-900">Month-wise Total PF</h2>
              <span className="text-xs text-gray-400">{transportName}</span>
            </div>
            <div className="overflow-x-auto">
              <div className="flex gap-3 px-5 py-4 min-w-max">
                {monthlyPfStats.map(m => (
                  <div key={m.key} className="shrink-0 w-40 rounded-xl border border-teal-100 bg-teal-50/40 px-3.5 py-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{m.label}</p>
                    <p className="text-lg font-black text-teal-800 mt-0.5">{Rs(m.pf)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">PF · {m.pohonchCount} pohonch · {m.biltyCount} bilties</p>
                    <p className="text-[10px] text-rose-500 font-semibold mt-0.5">Kaat: {Rs(m.kaat)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

          {/* ── Left: Station rates (actual + contracted) ── */}
          {(stationRates.length > 0 || hubRates.length > 0) && (
            <div className="xl:col-span-1 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden self-start">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600"/>
                <h2 className="text-sm font-bold text-gray-800">Station Rates</h2>
                <span className="text-xs text-gray-400 ml-auto">{stationRates.length} stations</span>
                <button onClick={handlePrintRates} disabled={printingRates} title="Print station rate list"
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 disabled:opacity-50">
                  {printingRates ? <Loader2 className="w-3 h-3 animate-spin"/> : <Printer className="w-3 h-3"/>} Print
                </button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"/>Actual avg</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Contracted</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Mismatch only</span>
              </div>

              <div className="divide-y divide-gray-50">
                {stationRates.map((s,i)=>{
                  const varPos    = s.variance != null && s.variance > 0;
                  const varNeg    = s.variance != null && s.variance < 0;
                  const modeLabel = s.hub?.pricing_mode === 'per_pkg' ? '/pkg' : '/kg';
                  const isActive  = activeStation === s.city;
                  return (
                    <div key={s.city}
                      onClick={() => handleStationClick(s.city)}
                      className={`px-4 py-3 cursor-pointer transition-colors ${isActive ? 'bg-indigo-50 border-l-4 border-indigo-500' : i%2===0?'bg-white hover:bg-gray-50':'bg-gray-50/20 hover:bg-gray-100/40'}`}>
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <p className="font-mono font-bold text-gray-800 text-xs">{s.city}</p>
                          <p className="text-[10px] text-gray-400">{s.count} bilties · {Rs(s.totalKaat)} kaat</p>
                        </div>
                        {s.hub && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border shrink-0 ml-2 ${
                            s.hub.pricing_mode==='per_kg'?'bg-blue-50 text-blue-700 border-blue-200'
                            :s.hub.pricing_mode==='per_pkg'?'bg-purple-50 text-purple-700 border-purple-200'
                            :'bg-orange-50 text-orange-700 border-orange-200'}`}>
                            {s.hub.pricing_mode==='per_kg'?'KG':s.hub.pricing_mode==='per_pkg'?'PKG':'Hybrid'}
                          </span>
                        )}
                      </div>
                      {s.variance===0 ? (
                        // Rates match — one calm confirmation, no red/rose noise
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3"/> Matches contract @{s.avgRate}{modeLabel}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {s.avgRate!=null
                            ? <span className={`rounded-lg px-2 py-1 text-[11px] font-black border ${
                                s.variance!=null ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}>Actual @{s.avgRate}/kg</span>
                            : <span className="text-[10px] text-gray-300 italic">no actual data</span>}
                          {s.contractedRate!=null
                            ? <span className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-[11px] font-black text-blue-700">Contract @{s.contractedRate}{modeLabel}</span>
                            : <span className="text-[10px] text-gray-300 italic">no contract</span>}
                          {s.variance!=null && (
                            <span className={`rounded-lg px-2 py-1 text-[11px] font-black border ${varPos?'bg-emerald-50 text-emerald-700 border-emerald-200':varNeg?'bg-red-50 text-red-600 border-red-200':'bg-gray-50 text-gray-600 border-gray-200'}`}>
                              {varPos?'+':''}{s.variance}
                            </span>
                          )}
                        </div>
                      )}
                      {s.variance!=null && s.variance!==0 && s.contractedRate!=null && s.grNos?.length>0 && (
                        <button
                          onClick={(e)=>{ e.stopPropagation(); handleFixStationRate(s); }}
                          disabled={fixingStation===s.city}
                          title={`Update all ${s.count} bilties in ${s.city} to the contracted rate ₹${s.contractedRate}`}
                          className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                          {fixingStation===s.city ? <Loader2 className="w-3 h-3 animate-spin"/> : <Zap className="w-3 h-3"/>}
                          {fixingStation===s.city ? 'Fixing…' : `Fix ${s.count} Bilties to Contract Rate (₹${s.contractedRate})`}
                        </button>
                      )}
                      {fixResult && fixResult.city===s.city && (
                        <div className={`mt-1.5 px-2 py-1 rounded-lg text-[10px] font-bold ${fixResult.error?'bg-red-50 text-red-600 border border-red-200':'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                          {fixResult.error
                            ? fixResult.error
                            : `✓ ${fixResult.data.updated_count} updated to ₹${fixResult.data.new_kaat_rate}${fixResult.data.pohonch_rows_synced>0?` · ${fixResult.data.pohonch_rows_synced} pohonch synced`:''}`}
                        </div>
                      )}
                      {s.hub && (s.hub.bilty_chrg>0||s.hub.ewb_chrg>0||s.hub.labour_chrg>0||s.hub.other_chrg>0||s.hub.min_charge>0) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {s.hub.min_charge>0    && <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">Min ₹{Math.round(s.hub.min_charge)}</span>}
                          {s.hub.bilty_chrg>0    && <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">Bilty ₹{Math.round(s.hub.bilty_chrg)}</span>}
                          {s.hub.ewb_chrg>0      && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">EWB ₹{Math.round(s.hub.ewb_chrg)}</span>}
                          {s.hub.labour_chrg>0   && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Labour ₹{Math.round(s.hub.labour_chrg)}</span>}
                          {s.hub.other_chrg>0    && <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">Other ₹{Math.round(s.hub.other_chrg)}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Hub-only stations — have a contract but no bilties yet */}
              {hubRates.filter(r=>r.cityName && !stationRates.find(s=>s.city===r.cityName)).map((r,i)=>(
                <div key={r.id} className={`flex items-center justify-between px-4 py-2.5 border-t border-gray-50 ${i%2===0?'bg-white':'bg-gray-50/20'}`}>
                  <div>
                    <p className="font-mono font-bold text-gray-400 text-xs">{r.cityName}</p>
                    <p className="text-[10px] text-gray-300">0 bilties</p>
                  </div>
                  <span className="text-[11px] font-black text-blue-400 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1">
                    @{r.pricing_mode==='per_kg'?r.rate_per_kg:r.rate_per_pkg}/{r.pricing_mode==='per_pkg'?'pkg':'kg'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Right: Pohonch list ── */}
          <div className={`${(stationRates.length>0||hubRates.length>0)?'xl:col-span-4':'xl:col-span-5'} bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden`}>

            {/* ── Header ── */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600"/>
                <h2 className="text-sm font-bold text-gray-900">Pohonch</h2>
                <span className="text-xs text-gray-500 font-medium">({allPohonch.length})</span>
                {loadingPohonch && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500"/>}
                {activeStation && (
                  <button onClick={()=>setActiveStation(null)}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-full hover:bg-indigo-200">
                    <MapPin className="w-3 h-3"/>{activeStation} <X className="w-3 h-3 ml-0.5"/>
                  </button>
                )}
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handleBulkRecalculate} disabled={bulkRecalculating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 disabled:opacity-50">
                    <RotateCcw className={`w-3.5 h-3.5 ${bulkRecalculating?'animate-spin':''}`}/>
                    {bulkRecalculating ? 'Recalculating…' : `Recalculate`}
                  </button>
                  <button onClick={openKaatModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">
                    <TrendingDown className="w-3.5 h-3.5"/> Update Kaat
                  </button>
                  <button onClick={()=>crossChallanPrint.handlePrintMultiple(selectedPohonch.map(p=>p.pohonch_number))}
                    disabled={crossChallanPrint.printingBatch}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-50">
                    {crossChallanPrint.printingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Printer className="w-3.5 h-3.5"/>}
                    {crossChallanPrint.printingBatch ? 'Generating…' : `Print Selected (${selectedIds.size})`}
                  </button>
                  <button onClick={()=>setShowConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg text-xs font-black shadow-md">
                    <Plus className="w-3.5 h-3.5"/> Create Bill ({selectedIds.size})
                  </button>
                </div>
              )}
            </div>

            {/* ── Search + Sort bar ── */}
            <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                <input
                  type="text"
                  value={pohonchSearch}
                  onChange={e=>setPohonchSearch(e.target.value)}
                  placeholder="Search by pohonch no, P/B no, challan, GR…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm text-black border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
                {pohonchSearch && (
                  <button onClick={()=>setPohonchSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5"/>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="font-semibold">Sort:</span>
                {[
                  { key:'created_at',    label:'Date' },
                  { key:'total_kaat',    label:'Kaat' },
                  { key:'total_pf',      label:'PF' },
                  { key:'total_bilties', label:'Bilties' },
                  { key:'total_packages',label:'Pkgs' },
                  { key:'total_amount',  label:'Amount' },
                  { key:'_pb_no',        label:'P/B No' },
                ].map(({ key, label }) => (
                  <button key={key} onClick={()=>toggleSort(key)}
                    className={`flex items-center gap-0.5 px-2.5 py-1 rounded-lg border font-semibold transition-colors ${sortBy===key?'bg-teal-600 text-white border-teal-600':'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>
                    {label}
                    {sortBy===key
                      ? sortDir==='asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>
                      : <ArrowUpDown className="w-3 h-3 opacity-40"/>}
                  </button>
                ))}
              </div>
            </div>

            {loadingPohonch && allPohonch.length===0 ? (
              <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2"/><p className="text-sm text-gray-600">Loading pohonch…</p></div>
            ) : allPohonch.length===0 ? (
              <div className="p-10 text-center"><FileText className="w-12 h-12 text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-500">No pohonch found for this transport</p></div>
            ) : (
              <>
                {/* ── Selected pohonch section ── */}
                {selectedIds.size > 0 && (
                  <>
                  <div className="border-b-2 border-indigo-200 bg-indigo-50/40">
                    <div className="flex items-center justify-between px-5 py-2.5 bg-indigo-100/70">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-black text-indigo-900">{selectedIds.size} Selected Pohonch</span>
                        <span className="text-xs font-semibold text-gray-700">Bilties: <strong className="text-black">{selectedTotals.bilties}</strong></span>
                        <span className="text-xs font-semibold text-gray-700">Wt: <strong className="text-black">{selectedTotals.wt.toFixed(1)} kg</strong></span>
                        <span className="text-xs font-bold text-rose-700">Kaat: {Rs(selectedTotals.kaat)}</span>
                        <span className="text-xs font-bold text-teal-800">PF: {Rs(selectedTotals.pf)}</span>
                        <span className="text-xs font-bold text-gray-900">Total: {Rs(selectedTotals.amt)}</span>
                      </div>
                      <button onClick={deselectAll} className="text-xs font-bold text-red-600 hover:text-red-800 underline">Clear All</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-indigo-100 border-b border-indigo-200">
                            <th className="px-3 py-2.5 w-8"/>
                            {[
                              { label:'Pohonch No.', align:'left' },
                              { label:'P/B No.',     align:'left' },
                              { label:'Challans',    align:'left' },
                              { label:'Bilties',     align:'center' },
                              { label:'Pkgs',        align:'center' },
                              { label:'Weight',      align:'right' },
                              { label:'Amount',      align:'right' },
                              { label:'Kaat',        align:'right' },
                              { label:'PF',          align:'right' },
                              { label:'Signed',      align:'center' },
                              { label:'Created',     align:'left' },
                            ].map(({ label, align }) => (
                              <th key={label} className={`px-3 py-2.5 text-[11px] font-bold text-indigo-800 uppercase text-${align}`}>{label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPohonch.map((p) => {
                            const challans = Array.isArray(p.challan_metadata)?p.challan_metadata:[];
                            const bilties  = Array.isArray(p.bilty_metadata)?p.bilty_metadata:[];
                            const isExpanded = expandedPohonch.has(p.id);
                            const totalPkg = bilties.reduce((s,b)=>s+(b.packages||0),0);
                            const totalWt  = bilties.reduce((s,b)=>s+(b.weight||0),0);
                            const paidKaat = bilties.filter(b=>b.is_paid||(b.payment_mode||'').toLowerCase()==='paid').reduce((s,b)=>s+(b.kaat||0),0);
                            const topayPf  = bilties.filter(b=>!(b.is_paid||(b.payment_mode||'').toLowerCase()==='paid')).reduce((s,b)=>s+(b.pf!=null?(b.pf||0):Math.max(0,(b.amount||0)-(b.kaat||0))),0);
                            return (
                              <React.Fragment key={p.id}>
                                <tr className="border-b border-indigo-100 bg-white hover:bg-indigo-50/40">
                                  <td className="px-3 py-2 text-center w-8">
                                    <button onClick={()=>toggleRow(p.id)} className="text-teal-600"><CheckSquare className="w-3.5 h-3.5"/></button>
                                  </td>
                                  <td className="px-3 py-2">
                                    <button onClick={()=>toggleExpand(p.id)} className="font-mono font-bold text-teal-700 flex items-center gap-1">
                                      {isExpanded?<ChevronDown className="w-3 h-3"/>:<ChevronRight className="w-3 h-3"/>}{p.pohonch_number}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-black text-xs">{[...new Set(bilties.map(b=>b.pohonch_bilty).filter(Boolean))].join(', ')||'-'}</td>
                                  <td className="px-3 py-2 text-black text-xs">{challans.join(', ')||'-'}</td>
                                  <td className="px-3 py-2 text-center text-black font-semibold">{p.total_bilties}</td>
                                  <td className="px-3 py-2 text-center text-black font-semibold">{Math.round(p.total_packages||0)}</td>
                                  <td className="px-3 py-2 text-right text-black">{(p.total_weight||0).toFixed(1)} kg</td>
                                  <td className="px-3 py-2 text-right text-black font-semibold">{Rs(p.total_amount)}</td>
                                  <td className="px-3 py-2 text-right text-rose-700 font-bold">{Rs(p.total_kaat)}</td>
                                  <td className="px-3 py-2 text-right text-teal-800 font-bold">{Rs(p.total_pf)}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_signed?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-600'}`}>
                                      {p.is_signed?'Signed':'Unsigned'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-600">{p.created_at?format(new Date(p.created_at),'dd/MM/yy'):'-'}</span>
                                      <button onClick={()=>crossChallanPrint.handlePrint(p.pohonch_number)} disabled={crossChallanPrint.printingPohonch===p.pohonch_number}
                                        className="inline-flex items-center px-1.5 py-1 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200" title="Print">
                                        {crossChallanPrint.printingPohonch===p.pohonch_number?<Loader2 className="w-3 h-3 animate-spin"/>:<Printer className="w-3 h-3"/>}
                                      </button>
                                      <button onClick={()=>handleRecalculate(p)} disabled={recalculating.has(p.id)}
                                        className="inline-flex items-center px-1.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 disabled:opacity-50" title="Recalculate">
                                        {recalculating.has(p.id)?<Loader2 className="w-3 h-3 animate-spin"/>:<RotateCcw className="w-3 h-3"/>}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {isExpanded && bilties.length>0 && (
                                  <tr><td colSpan={12} className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                    <div className="flex items-center gap-3 flex-wrap mb-2 pb-2 border-b border-slate-200 text-xs font-bold text-gray-700">
                                      <span>{p.pohonch_number} — {bilties.length} GRs</span>
                                      <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-lg text-black">Pkg: {Math.round(totalPkg)}</span>
                                      <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-lg text-black">Wt: {totalWt.toFixed(1)} kg</span>
                                      <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-lg">Paid Kaat: {Rs(paidKaat)}</span>
                                      <span className="bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded-lg">To-Pay PF: {Rs(topayPf)}</span>
                                    </div>
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                      <table className="w-full text-xs">
                                        <thead><tr className="bg-gray-100">{['#','GR No.','EWB','P/B No.','Challan','Consignor','Consignee','Dest','Pkg','Wt','Amt','Kaat','Rate','DD','PF','Paid','Del'].map(h=>(
                                          <th key={h} className={`px-2 py-1.5 text-left font-bold text-gray-700 text-[10px] ${activeStation&&h==='Dest'?'bg-indigo-100 text-indigo-700':''}`}>{h}</th>
                                        ))}</tr></thead>
                                        <tbody>{bilties.map((b,bi)=>{
                                          const isPaid = b.is_paid || (b.payment_mode||'').toLowerCase()==='paid';
                                          const isActiveCity = activeStation&&(b.destination||'').trim().toUpperCase()===activeStation;
                                          return (<tr key={b.gr_no||bi} className={`border-b border-gray-50 last:border-0 ${isActiveCity?'bg-indigo-50':bi%2===0?'bg-white':'bg-gray-50/50'}`}>
                                            <td className="px-2 py-1 text-black">{bi+1}</td>
                                            <td className="px-2 py-1 font-mono font-semibold text-teal-700">{b.gr_no||'-'}{b.e_way_bill&&<span className="text-green-600 font-bold ml-0.5 text-[9px]">(E)</span>}</td>
                                            <td className="px-2 py-1 text-[9px] font-mono text-black max-w-[60px] truncate">{b.e_way_bill||'-'}</td>
                                            <td className="px-2 py-1 text-black font-mono">{b.pohonch_bilty||'-'}</td>
                                            <td className="px-2 py-1 text-black">{b.challan_no||'-'}</td>
                                            <td className="px-2 py-1 text-black truncate max-w-[100px]">{b.consignor||'-'}</td>
                                            <td className="px-2 py-1 text-black truncate max-w-[100px]">{b.consignee||'-'}</td>
                                            <td className={`px-2 py-1 font-semibold ${isActiveCity?'text-indigo-700':'text-black'}`}>{b.destination||'-'}</td>
                                            <td className="px-2 py-1 text-center text-black">{Math.round(b.packages||0)}</td>
                                            <td className="px-2 py-1 text-right text-black">{(b.weight||0).toFixed(1)}</td>
                                            <td className="px-2 py-1 text-right font-medium text-black">{isPaid?'PAID':`₹${Math.round(b.amount||0)}`}</td>
                                            <td className="px-2 py-1 text-right text-rose-700">₹{Math.round(b.kaat||0)}</td>
                                            <td className="px-2 py-1 text-right text-black text-[10px]">{b.kaat_rate?`₹${b.kaat_rate}`:'-'}</td>
                                            <td className="px-2 py-1 text-right text-red-600">{b.dd>0?`-₹${Math.round(b.dd)}`:'-'}</td>
                                            <td className="px-2 py-1 text-right font-bold text-teal-800">₹{Math.round(b.pf||0)}</td>
                                            <td className="px-2 py-1 text-center"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isPaid?'bg-emerald-100 text-emerald-700':'bg-orange-100 text-orange-700'}`}>{isPaid?'PAID':'To-Pay'}</span></td>
                                            <td className="px-2 py-1 text-center">{(b.delivery_type||'').toLowerCase().includes('door')?<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Door</span>:<span className="text-[9px] text-gray-300">—</span>}</td>
                                          </tr>);
                                        })}</tbody>
                                      </table>
                                    </div>
                                  </td></tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-indigo-100/80 border-t-2 border-indigo-300 font-bold text-sm">
                            <td colSpan={4} className="px-3 py-3 text-right text-indigo-900 text-xs uppercase">Total ({selectedIds.size})</td>
                            <td className="px-3 py-3 text-center text-black">{selectedTotals.bilties}</td>
                            <td className="px-3 py-3 text-center text-black">{selectedPohonch.reduce((s,p)=>s+(p.total_packages||0),0)}</td>
                            <td className="px-3 py-3 text-right text-black">{selectedTotals.wt.toFixed(1)} kg</td>
                            <td className="px-3 py-3 text-right text-black font-bold">{Rs(selectedTotals.amt)}</td>
                            <td className="px-3 py-3 text-right text-rose-700 font-bold">{Rs(selectedTotals.kaat)}</td>
                            <td className="px-3 py-3 text-right text-teal-800 font-bold">{Rs(selectedTotals.pf)}</td>
                            <td colSpan={2}/>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </>
                )}

                {/* ── Gap + divider between selected and unselected ── */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-3 px-5 py-2 border-t-2 border-dashed border-gray-300 bg-white">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Remaining Pohonch ({displayPohonch.length})</span>
                  </div>
                )}

                {/* ── Unselected table header row (select-all + count) ── */}
                <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100">
                  <button onClick={selectedIds.size===allPohonch.length?deselectAll:selectAll} className="text-teal-600 hover:text-teal-800">
                    {selectedIds.size===allPohonch.length ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4 text-gray-400"/>}
                  </button>
                  <span className="text-xs font-semibold text-gray-700">
                    {displayPohonch.length} pohonch
                    {pohonchSearch ? ` matching "${pohonchSearch}"` : ''}
                    {selectedIds.size > 0 ? ` · ${selectedIds.size} selected above` : ''}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2.5 w-8"/>
                        {[
                          { label:'Pohonch No.', key:'pohonch_number',  align:'left' },
                          { label:'P/B No.',     key:'_pb_no',          align:'left' },
                          { label:'Challans',    key:null,              align:'left' },
                          { label:'Bilties',     key:'total_bilties',   align:'center' },
                          { label:'Pkgs',        key:'total_packages',  align:'center' },
                          { label:'Weight',      key:'total_weight',    align:'right' },
                          { label:'Amount',      key:'total_amount',   align:'right' },
                          { label:'Kaat',        key:'total_kaat',     align:'right' },
                          { label:'PF',          key:'total_pf',       align:'right' },
                          { label:'Signed',      key:null,             align:'center' },
                          { label:'Created',     key:'created_at',     align:'left' },
                        ].map(({ label, key, align }) => (
                          <th key={label}
                            onClick={key ? ()=>toggleSort(key) : undefined}
                            className={`px-3 py-2.5 text-[11px] font-bold text-gray-700 uppercase text-${align} ${key?'cursor-pointer hover:bg-gray-100 select-none':''}`}>
                            <span className="flex items-center gap-1 justify-start">
                              {label}
                              {key && (sortBy===key
                                ? sortDir==='asc' ? <ArrowUp className="w-3 h-3 text-teal-600"/> : <ArrowDown className="w-3 h-3 text-teal-600"/>
                                : <ArrowUpDown className="w-3 h-3 text-gray-300"/>)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayPohonch.map((p, i)=>{
                        const isExpanded   = expandedPohonch.has(p.id);
                        const inStation    = stationPohonchIds.has(p.id);
                        const challans     = Array.isArray(p.challan_metadata)?p.challan_metadata:[];
                        const bilties      = Array.isArray(p.bilty_metadata)?p.bilty_metadata:[];
                        const billedInNo   = billedPohonchMap.get(p.pohonch_number);
                        const isBilled     = !!billedInNo;

                        // Per-bilty stats for expanded summary
                        const totalPkg     = bilties.reduce((s,b)=>s+(b.packages||0),0);
                        const totalWt      = bilties.reduce((s,b)=>s+(b.weight||0),0);
                        const paidKaat     = bilties.filter(b=>b.is_paid).reduce((s,b)=>s+(b.kaat||0),0);
                        const topayPf      = bilties.filter(b=>!b.is_paid).reduce((s,b)=>s+(b.pf!=null?(b.pf||0):Math.max(0,(b.amount||0)-(b.kaat||0))),0);

                        return (
                          <React.Fragment key={p.id}>
                            <tr
                              onClick={()=>{ if (!isBilled) toggleRow(p.id); }}
                              title={isBilled ? `Already billed in ${billedInNo} — remove it from that bill first to re-select` : undefined}
                              className={`border-b border-gray-100 transition-colors ${
                                isBilled ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                                : `cursor-pointer hover:bg-indigo-50/40 ${
                                    activeStation && inStation ? 'bg-indigo-50 border-l-2 border-indigo-400'
                                    : isExpanded ? 'bg-teal-50/40'
                                    : i%2===0 ? 'bg-white' : 'bg-gray-50/30'
                                  }`
                              } select-none`}>
                              <td className="px-3 py-2.5 text-center" onClick={e=>e.stopPropagation()}>
                                {isBilled ? (
                                  <Lock className="w-3.5 h-3.5 text-gray-300 mx-auto" />
                                ) : (
                                  <button onClick={()=>toggleRow(p.id)} className="text-teal-600 hover:text-teal-800">
                                    <Square className="w-3.5 h-3.5 text-gray-300"/>
                                  </button>
                                )}
                              </td>
                              <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}>
                                <button onClick={()=>toggleExpand(p.id)}
                                  className="font-mono font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5"/> : <ChevronRight className="w-3.5 h-3.5"/>}
                                  {p.pohonch_number}
                                </button>
                                {isBilled && (
                                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full">
                                    <Lock className="w-2.5 h-2.5"/>Billed in {billedInNo}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-black text-xs">
                                {[...new Set(bilties.map(b=>b.pohonch_bilty).filter(Boolean))].join(', ') || '-'}
                              </td>
                              <td className="px-3 py-2.5 text-black text-xs">
                                {challans.length>3?`${challans.slice(0,3).join(', ')} +${challans.length-3}`:challans.join(', ')||'-'}
                              </td>
                              <td className="px-3 py-2.5 text-center text-black font-semibold">{p.total_bilties}</td>
                              <td className="px-3 py-2.5 text-center text-black font-semibold">{Math.round(p.total_packages||0)}</td>
                              <td className="px-3 py-2.5 text-right text-black">{(p.total_weight||0).toFixed(1)} kg</td>
                              <td className="px-3 py-2.5 text-right text-black font-semibold">{Rs(p.total_amount)}</td>
                              <td className="px-3 py-2.5 text-right text-rose-700 font-bold">{Rs(p.total_kaat)}</td>
                              <td className="px-3 py-2.5 text-right text-teal-800 font-bold">{Rs(p.total_pf)}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_signed?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-600'}`}>
                                  <PenTool className="w-2.5 h-2.5"/>{p.is_signed?'Signed':'Unsigned'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-black text-xs font-medium">{p.created_at?format(new Date(p.created_at),'dd/MM/yy'):'-'}</span>
                                  <button
                                    onClick={()=>crossChallanPrint.handlePrint(p.pohonch_number)}
                                    disabled={crossChallanPrint.printingPohonch===p.pohonch_number}
                                    className="inline-flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200"
                                    title="Print pohonch">
                                    {crossChallanPrint.printingPohonch===p.pohonch_number ? <Loader2 className="w-3 h-3 animate-spin"/> : <Printer className="w-3 h-3"/>}
                                  </button>
                                  <button
                                    onClick={()=>handleRecalculate(p)}
                                    disabled={recalculating.has(p.id)}
                                    className="inline-flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 disabled:opacity-50"
                                    title="Recalculate from live bilty data">
                                    {recalculating.has(p.id) ? <Loader2 className="w-3 h-3 animate-spin"/> : <RotateCcw className="w-3 h-3"/>}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* ── Expanded bilties with summary stats ── */}
                            {isExpanded && bilties.length>0 && (
                              <tr>
                                <td colSpan={12} className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                  {/* Summary stats bar */}
                                  <div className="flex items-center gap-3 flex-wrap mb-2 pb-2 border-b border-teal-200">
                                    <p className="text-[10px] font-bold text-teal-700">{p.pohonch_number} — {bilties.length} GRs</p>
                                    <span className="text-[10px] bg-white border border-teal-200 text-teal-700 px-2 py-0.5 rounded-lg font-bold">
                                      Pkg: {Math.round(totalPkg)}
                                    </span>
                                    <span className="text-[10px] bg-white border border-teal-200 text-teal-700 px-2 py-0.5 rounded-lg font-bold">
                                      Wt: {totalWt.toFixed(1)} kg
                                    </span>
                                    <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-lg font-bold">
                                      Paid Kaat: {Rs(paidKaat)}
                                    </span>
                                    <span className="text-[10px] bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded-lg font-bold">
                                      To-Pay PF: {Rs(topayPf)}
                                    </span>
                                    <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-600 px-2 py-0.5 rounded-lg font-bold">
                                      Total Kaat: {Rs(p.total_kaat)}
                                    </span>
                                    <span className="text-[10px] bg-teal-100 border border-teal-300 text-teal-800 px-2 py-0.5 rounded-lg font-bold">
                                      Total PF: {Rs(p.total_pf)}
                                    </span>
                                    <span className="text-[10px] text-gray-500 ml-auto">
                                      Challans: {challans.join(', ')||'-'}
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-gray-100">
                                          {['#','GR No.','EWB','P/B No.','Challan','Consignor','Consignee','Dest','Pkg','Wt','Amt','Kaat','Rate','DD','PF','Paid','Del'].map(h=>(
                                            <th key={h} className={`px-2 py-1.5 text-left font-bold text-gray-600 text-[10px] ${activeStation&&h==='Dest'?'bg-indigo-100 text-indigo-700':''}`}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {bilties.map((b,bi)=>{
                                          const isPaid = b.is_paid || (b.payment_mode||'').toLowerCase()==='paid';
                                          const isActiveCity = activeStation && (b.destination||'').trim().toUpperCase()===activeStation;
                                          return (
                                            <tr key={b.gr_no||bi} className={`border-b border-gray-50 last:border-0 ${isActiveCity?'bg-indigo-50':bi%2===0?'bg-white':'bg-gray-50/50'}`}>
                                              <td className="px-2 py-1 text-black">{bi+1}</td>
                                              <td className="px-2 py-1 font-mono font-semibold text-teal-700">
                                                {b.gr_no||'-'}{b.e_way_bill&&<span className="text-green-600 font-bold ml-0.5 text-[9px]">(E)</span>}
                                              </td>
                                              <td className="px-2 py-1 text-[9px] font-mono text-black max-w-[60px] truncate">{b.e_way_bill||'-'}</td>
                                              <td className="px-2 py-1 text-black font-mono">{b.pohonch_bilty||'-'}</td>
                                              <td className="px-2 py-1 text-black">{b.challan_no||'-'}</td>
                                              <td className="px-2 py-1 text-black truncate max-w-[100px]">{b.consignor||'-'}</td>
                                              <td className="px-2 py-1 text-black truncate max-w-[100px]">{b.consignee||'-'}</td>
                                              <td className={`px-2 py-1 font-semibold ${isActiveCity?'text-indigo-700':'text-black'}`}>{b.destination||'-'}</td>
                                              <td className="px-2 py-1 text-center text-black">{Math.round(b.packages||0)}</td>
                                              <td className="px-2 py-1 text-right text-black">{(b.weight||0).toFixed(1)}</td>
                                              <td className="px-2 py-1 text-right font-medium text-black">{isPaid?'PAID':`₹${Math.round(b.amount||0)}`}</td>
                                              <td className="px-2 py-1 text-right text-rose-600">₹{Math.round(b.kaat||0)}</td>
                                              <td className="px-2 py-1 text-right text-black text-[10px]">{b.kaat_rate?`₹${b.kaat_rate}`:'-'}</td>
                                              <td className="px-2 py-1 text-right text-red-500">{b.dd>0?`-₹${Math.round(b.dd)}`:'-'}</td>
                                              <td className="px-2 py-1 text-right font-bold text-teal-700">₹{Math.round(b.pf||0)}</td>
                                              <td className="px-2 py-1 text-center">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isPaid?'bg-emerald-100 text-emerald-700':'bg-orange-100 text-orange-600'}`}>
                                                  {isPaid?'PAID':'To-Pay'}
                                                </span>
                                              </td>
                                              <td className="px-2 py-1 text-center">
                                                {(b.delivery_type||'').toLowerCase().includes('door')
                                                  ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Door</span>
                                                  : <span className="text-[9px] text-gray-300">—</span>}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-sm">
                        <td colSpan={4} className="px-3 py-3 text-right text-black uppercase text-xs">Showing {displayPohonch.length} of {allPohonch.length}</td>
                        <td className="px-3 py-3 text-center text-black">{displayPohonch.reduce((s,p)=>s+(p.total_bilties||0),0)}</td>
                        <td className="px-3 py-3 text-center text-black">{displayPohonch.reduce((s,p)=>s+(p.total_packages||0),0)}</td>
                        <td className="px-3 py-3 text-right text-black">{displayPohonch.reduce((s,p)=>s+(p.total_weight||0),0).toFixed(1)} kg</td>
                        <td className="px-3 py-3 text-right text-black font-bold">{Rs(displayPohonch.reduce((s,p)=>s+(p.total_amount||0),0))}</td>
                        <td className="px-3 py-3 text-right text-rose-700 font-bold">{Rs(displayPohonch.reduce((s,p)=>s+(p.total_kaat||0),0))}</td>
                        <td className="px-3 py-3 text-right text-teal-800 font-bold">{Rs(displayPohonch.reduce((s,p)=>s+(p.total_pf||0),0))}</td>
                        <td colSpan={2}/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Crossing Bills list ── */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-teal-600"/>
              <h2 className="text-sm font-bold text-gray-800">Crossing Bills</h2>
              <span className="text-xs text-gray-400">({bills.length})</span>
            </div>
            <button onClick={syncAllChallanPdfs} disabled={!!challanSync}
              title="Generate & upload the crossing challan PDF (all pohonch) for every crossing bill in the system that doesn't have one"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-200 disabled:opacity-60">
              {challanSync ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileText className="w-3.5 h-3.5"/>}
              {challanSync
                ? `Uploading ${challanSync.done}/${challanSync.total}${challanSync.current ? ` · ${challanSync.current}` : ''}${challanSync.failed ? ` · ${challanSync.failed} failed` : ''}`
                : 'Upload All Challan PDFs'}
            </button>
          </div>

          {loadingBills && bills.length===0 ? (
            <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2"/><p className="text-sm text-gray-500">Loading crossing bills…</p></div>
          ) : bills.length===0 ? (
            <div className="p-10 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-2"/>
              <p className="text-gray-500 text-sm font-semibold">No crossing bills yet</p>
              <p className="text-gray-400 text-xs mt-1">Select pohonch above and click "Create Bill" to get started</p>
            </div>
          ) : (
            <div>
              {bills.map(bill=>(
                <BillRow
                  key={bill.id}
                  bill={bill}
                  expanded={expandedBill.has(bill.id)}
                  onToggle={()=>setExpandedBill(prev=>{ const n=new Set(prev); n.has(bill.id)?n.delete(bill.id):n.add(bill.id); return n; })}
                  onAddTx={()=>setTxBill(bill)}
                  userId={user?.id}
                  token={token}
                  pohonchMap={pohonchMap}
                  crossChallanPrint={crossChallanPrint}
                  onDeleted={(id)=>setBills(prev=>prev.filter(b=>b.id!==id))}
                  onBillUpdated={(updated)=>setBills(prev=>prev.map(b=>b.id===bill.id?{...b,...updated}:b))}
                  onPohonchDataLoaded={handlePohonchDataLoaded}
                />
              ))}
              {hasMore && (
                <div className="p-4 text-center">
                  <button onClick={()=>fetchBills(page+1)} disabled={loadingBills}
                    className="text-sm font-semibold text-teal-600 hover:text-teal-800 underline">
                    {loadingBills?'Loading…':'Load more bills'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <NilBiltyFinder
        isOpen={showNilFinder}
        onClose={()=>setShowNilFinder(false)}
        transportGstin={gstin}
        userId={user?.id}
        token={token}
        onPohonchCreated={() => { fetchPohonch(); fetchBills(1); }}
      />

      <TransportChallanReport
        isOpen={showChallanReport}
        onClose={()=>setShowChallanReport(false)}
        transportGstin={gstin}
        transportName={transportName}
      />

      <ConfirmBillModal
        isOpen={showConfirm}
        onClose={()=>setShowConfirm(false)}
        selectedPohonch={selectedPohonch}
        transportGstin={gstin}
        transportName={transportName}
        userId={user?.id}
        token={token}
        onCreated={handleBillCreated}
      />

      <TransactionModal
        isOpen={!!txBill}
        bill={txBill}
        onClose={()=>setTxBill(null)}
        userId={user?.id}
        token={token}
        onAdded={handleTxAdded}
      />

      {/* ── Recalculate result banner ── */}
      {recalcResult && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] w-full max-w-xl px-4">
          <div className="bg-white border border-amber-200 rounded-2xl shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0"/>
                <p className="text-sm font-black text-gray-900">
                  {recalcResult.type === 'single'
                    ? `${recalcResult.pohonch_number} recalculated`
                    : `Bulk recalculate: ${recalcResult.processed} updated${recalcResult.skipped ? `, ${recalcResult.skipped} skipped (signed)` : ''}`}
                </p>
              </div>
              <button onClick={()=>setRecalcResult(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400"/>
              </button>
            </div>

            {/* Single result diff */}
            {recalcResult.type === 'single' && recalcResult.diff && (
              <div className="flex items-center gap-3 flex-wrap">
                {Object.entries({
                  'Kaat': recalcResult.diff.kaat,
                  'PF':   recalcResult.diff.pf,
                  'Amt':  recalcResult.diff.amount,
                }).map(([label, val]) => val !== 0 && val != null && (
                  <span key={label} className={`text-xs font-bold px-2 py-1 rounded-lg border ${val>0?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-red-50 text-red-600 border-red-200'}`}>
                    {label}: {val>0?'+':''}{Rs(val)}
                  </span>
                ))}
                {recalcResult.new_totals && (
                  <>
                    <span className="text-[10px] text-gray-400 ml-1">New →</span>
                    <span className="text-xs text-rose-600 font-semibold">Kaat: {Rs(recalcResult.new_totals.total_kaat)}</span>
                    <span className="text-xs text-teal-700 font-semibold">PF: {Rs(recalcResult.new_totals.total_pf)}</span>
                  </>
                )}
              </div>
            )}

            {/* Bulk result rows */}
            {recalcResult.type === 'bulk' && recalcResult.results?.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {recalcResult.results.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg ${r.status==='updated'?'bg-emerald-50':'bg-gray-50'}`}>
                    <span className="font-mono font-bold text-gray-800">{r.pohonch_number}</span>
                    {r.status === 'updated' ? (
                      <div className="flex items-center gap-3">
                        {r.diff?.kaat !== 0 && <span className={`font-bold ${(r.diff?.kaat||0)>0?'text-emerald-600':'text-red-500'}`}>Kaat {(r.diff?.kaat||0)>0?'+':''}{Rs(r.diff?.kaat)}</span>}
                        {r.diff?.pf !== 0 && <span className={`font-bold ${(r.diff?.pf||0)>0?'text-emerald-600':'text-red-500'}`}>PF {(r.diff?.pf||0)>0?'+':''}{Rs(r.diff?.pf)}</span>}
                        {r.diff?.kaat === 0 && r.diff?.pf === 0 && <span className="text-gray-400 italic">no change</span>}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-[10px]">{r.reason || 'skipped'}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <CrossChallanPrintModal
        previewUrl={crossChallanPrint.previewUrl}
        previewName={crossChallanPrint.previewName}
        onDownload={crossChallanPrint.handleDownload}
        onClose={crossChallanPrint.handleClose}
      />

      <KaatUpdateModal
        isOpen={kaatModalOpen}
        onClose={()=>setKaatModalOpen(false)}
        tab={kaatModalTab}
        onTabChange={setKaatModalTab}
        transportGstin={kaatModalGstin}
        bilties={kaatModalBilties}
        token={token}
        onSuccess={()=>fetchPohonch(true)}
      />

      {syncing && (
        <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 bg-teal-700 text-white rounded-2xl shadow-xl text-sm font-semibold">
          <Loader2 className="w-4 h-4 animate-spin shrink-0"/>Syncing kaat data…
        </div>
      )}
    </div>
  );
}
