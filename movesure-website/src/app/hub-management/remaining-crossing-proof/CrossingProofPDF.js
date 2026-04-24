'use client';

import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { X, Download, Loader2 } from 'lucide-react';

export function generateCrossingProofPDF(group) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // 297mm
  const margin = 10;
  const tableW = pageW - 2 * margin; // 277mm

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Remaining Crossing Proof', margin, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  const transportLabel =
    group.transport_names?.length === 1
      ? group.transport_names[0]
      : group.transport_names?.join(', ') || '-';
  doc.text(`Transport : ${transportLabel}`, margin, 21);
  doc.text(`GSTIN     : ${group.gst_number || '-'}`, margin, 27);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })}`,
    pageW - margin,
    14,
    { align: 'right' }
  );
  doc.setFont('helvetica', 'normal');

  // ── Divider ──────────────────────────────────────────────────────────────
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(margin, 33, pageW - margin, 33);

  let startY = 39;

  // ── Challans ─────────────────────────────────────────────────────────────
  const challans = group.challans || [];
  challans.forEach((challan, ci) => {
    // Challan sub-heading
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    const challanLabel =
      challan.challan_no === 'NO_CHALLAN' ? 'No Challan' : challan.challan_no;
    doc.text(
      `Challan: ${challanLabel}   |   Bilties: ${challan.bilty_count}   |   Wt: ${challan.total_weight} kg   |   Amt: Rs.${(challan.total_amount || 0).toLocaleString('en-IN')}${challan.total_kaat > 0 ? `   |   Kaat: Rs.${challan.total_kaat}` : ''}`,
      margin,
      startY
    );
    startY += 5;

    const rows = (challan.bilties || []).map((b) => [
      b.serial ?? '',
      b.gr_no ?? '-',
      b.consignor_name ?? '-',
      b.consignee_name ?? '-',
      b.station || b.city_name || '-',
      b.no_of_pkg ?? '-',
      b.weight ?? '-',
      b.freight_amount ? `Rs.${Number(b.freight_amount).toLocaleString('en-IN')}` : '-',
      b.kaat > 0 ? `Rs.${b.kaat}` : '-',
      b.payment_mode ?? '-',
      b.pohonch_no ?? 'MISSING',
      b.bilty_number ?? 'MISSING',
      b.bilty_date
        ? new Date(b.bilty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        : '-',
    ]);

    // Column widths summing exactly to tableW (277mm)
    // #(6) GRNo(20) Cons(42) Consee(42) Station(28) Pkg(8) Wt(12) Freight(20) Kaat(16) PM(16) Pohonch(22) BiltyNo(23) Date(22) = 277
    autoTable(doc, {
      startY,
      head: [['#', 'GR No', 'Consignor', 'Consignee', 'Station', 'Pkg', 'Wt', 'Freight', 'Kaat', 'PM', 'Pohonch', 'Crossing-Bilty', 'Date']],
      body: rows,
      margin: { left: margin, right: margin },
      tableWidth: tableW,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        overflow: 'linebreak',
        textColor: [0, 0, 0],
        lineColor: [180, 180, 180],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [25, 25, 20],
        textColor: [250, 250, 250],
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0:  { cellWidth: 6 },
        1:  { cellWidth: 20 },
        2:  { cellWidth: 42 },
        3:  { cellWidth: 42 },
        4:  { cellWidth: 28 },
        5:  { cellWidth: 8,  halign: 'center' },
        6:  { cellWidth: 12, halign: 'center' },
        7:  { cellWidth: 20, halign: 'right' },
        8:  { cellWidth: 16, halign: 'right' },
        9:  { cellWidth: 16, halign: 'center' },
        10: { cellWidth: 22 },
        11: { cellWidth: 23 },
        12: { cellWidth: 22 },
      },
      didParseCell(data) {
        if (data.section === 'body' && (data.column.index === 10 || data.column.index === 11)) {
          if (data.cell.raw === 'MISSING') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [0, 0, 0];
          }
        }
      },
      willDrawPage(hookData) {
        if (hookData.pageNumber > 1) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(80);
          doc.text(`${transportLabel} | ${group.gst_number}`, margin, 8);
          doc.setTextColor(0);
        }
      },
    });

    startY = doc.lastAutoTable.finalY + 8;

    // Page break between challans if needed
    if (ci < challans.length - 1 && startY > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      startY = 15;
    }
  });

  // ── Footer on each page ──────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(
      `Page ${i} of ${totalPages}   |   Movesure Transport`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    );
    doc.setTextColor(0);
  }

  return doc;
}

// ── Modal Preview Component ──────────────────────────────────────────────────
export default function CrossingProofPDFModal({ group, onClose }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [generating, setGenerating] = useState(true);
  const urlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setGenerating(true);

    // Give the browser a tick to paint the modal shell first
    const timer = setTimeout(() => {
      const doc = generateCrossingProofPDF(group);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      if (!cancelled) {
        urlRef.current = url;
        setPdfUrl(url);
        setGenerating(false);
      }
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [group]);

  const handleDownload = () => {
    const doc = generateCrossingProofPDF(group);
    const name =
      group.transport_names?.length === 1
        ? group.transport_names[0].replace(/\s+/g, '_')
        : group.gst_number;
    doc.save(`crossing-proof-${name}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-6xl h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <div>
            <p className="font-bold text-gray-900 text-base">
              {group.transport_names?.length === 1
                ? group.transport_names[0]
                : group.gst_number}
            </p>
            <p className="text-xs text-gray-500">{group.gst_number} — Crossing Proof PDF</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 bg-gray-100 overflow-hidden">
          {generating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">Generating PDF…</p>
              </div>
            </div>
          ) : (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              className="w-full h-full border-0"
              title="Crossing Proof PDF Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
}
