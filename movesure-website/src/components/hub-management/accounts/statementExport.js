// CSV / PDF export of a ledger statement (GET /ledgers/{id}/statement response).
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './helpers';

// Statement rows come as { entry_type, amount } (older shape: dr_amount / cr_amount)
export const entryDr = (e) => Number(e.dr_amount ?? (e.entry_type === 'dr' ? e.amount : 0)) || 0;
export const entryCr = (e) => Number(e.cr_amount ?? (e.entry_type === 'cr' ? e.amount : 0)) || 0;

// jsPDF's built-in fonts only cover Latin-1: '₹' prints as a stray '¹'. Use 'Rs.' and plain
// ASCII look-alikes in the PDF, and drop anything else the font can't draw.
const pdfText = (v) => String(v ?? '')
  .replace(/₹\s?/g, 'Rs. ')
  .replace(/[–—]/g, '-')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/…/g, '...')
  .replace(/[^\x00-\xFF]/g, '');

const money = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bal = (amount, type) => `${money(amount)} ${type ? type.toUpperCase() : ''}`.trim();
const periodText = (from, to) =>
  from || to ? `${from ? formatDate(from) : 'Start'} to ${to ? formatDate(to) : 'Today'}` : 'All dates';

const fileBase = (meta, from, to) =>
  `${(meta?.name || 'ledger').replace(/[^a-z0-9]+/gi, '_')}_${from || 'start'}_${to || 'today'}`;

export function statementTotals(data) {
  const entries = data?.entries || [];
  return {
    totalDr: entries.reduce((s, e) => s + entryDr(e), 0),
    totalCr: entries.reduce((s, e) => s + entryCr(e), 0)
  };
}

export function exportStatementCSV(data, meta, from, to) {
  const { totalDr, totalCr } = statementTotals(data);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    [`Ledger`, meta?.name || ''],
    [`Period`, periodText(from, to)],
    [],
    ['Date', 'Voucher No', 'Type', 'Narration', 'Debit (Dr)', 'Credit (Cr)', 'Balance'],
    ['', '', '', 'Opening Balance', '', '', bal(data.opening_balance, data.opening_balance_type)],
    ...(data.entries || []).map((e) => [
      formatDate(e.voucher_date || e.date), e.voucher_no || '', e.voucher_type || '', e.narration || '',
      entryDr(e) ? entryDr(e).toFixed(2) : '', entryCr(e) ? entryCr(e).toFixed(2) : '',
      bal(e.running_balance, e.running_balance_type)
    ]),
    ['', '', '', 'Total', totalDr.toFixed(2), totalCr.toFixed(2), ''],
    ['', '', '', 'Closing Balance', '', '', bal(data.closing_balance, data.closing_balance_type)]
  ];
  const csv = '﻿' + lines.map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileBase(meta, from, to)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// meta.landscape -> A4 landscape (wider narration column, e.g. transport ledgers)
export function buildStatementPDF(data, meta, from, to) {
  const landscape = !!meta?.landscape;
  const pdf = new jsPDF(landscape ? 'l' : 'p', 'mm', 'a4');
  const W = pdf.internal.pageSize.getWidth();
  const { totalDr, totalCr } = statementTotals(data);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text(pdfText(meta?.name || 'Ledger Statement'), 14, 16);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const sub = [meta?.subtitle, meta?.gstin ? `GSTIN: ${meta.gstin}` : null].filter(Boolean).join('   |   ');
  if (sub) pdf.text(pdfText(sub), 14, 21.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('LEDGER STATEMENT', W - 14, 16, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Period: ${periodText(from, to)}`, W - 14, 21.5, { align: 'right' });
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.line(14, 25, W - 14, 25);

  const body = [
    [{ content: 'Opening Balance', colSpan: 5, styles: { fontStyle: 'bold' } },
      { content: bal(data.opening_balance, data.opening_balance_type), styles: { fontStyle: 'bold', halign: 'right' } }],
    ...(data.entries || []).map((e) => [
      formatDate(e.voucher_date || e.date),
      pdfText(e.voucher_no),
      pdfText(e.narration),
      entryDr(e) ? money(entryDr(e)) : '',
      entryCr(e) ? money(entryCr(e)) : '',
      bal(e.running_balance, e.running_balance_type)
    ]),
    [{ content: 'Total', colSpan: 3, styles: { fontStyle: 'bold' } },
      { content: money(totalDr), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: money(totalCr), styles: { fontStyle: 'bold', halign: 'right' } }, ''],
    [{ content: 'Closing Balance', colSpan: 5, styles: { fontStyle: 'bold' } },
      { content: bal(data.closing_balance, data.closing_balance_type), styles: { fontStyle: 'bold', halign: 'right' } }]
  ];

  autoTable(pdf, {
    startY: 29,
    head: [['Date', 'Voucher', 'Narration', 'Debit (Dr)', 'Credit (Cr)', 'Balance']],
    body,
    theme: 'grid',
    styles: { fontSize: landscape ? 8.5 : 8, cellPadding: 1.8, textColor: 20, lineColor: 180, lineWidth: 0.1 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 20 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: landscape ? 30 : 25, halign: 'right' },
      4: { cellWidth: landscape ? 30 : 25, halign: 'right' },
      5: { cellWidth: landscape ? 34 : 28, halign: 'right' }
    },
    didDrawPage: () => {
      const H = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(7);
      pdf.setTextColor(120);
      pdf.text(`Generated ${new Date().toLocaleString('en-IN')}`, 14, H - 8);
      pdf.text(`Page ${pdf.getNumberOfPages()}`, W - 14, H - 8, { align: 'right' });
      pdf.setTextColor(0);
    }
  });
  return pdf;
}

export const statementPdfFileName = (meta, from, to) => `${fileBase(meta, from, to)}.pdf`;
