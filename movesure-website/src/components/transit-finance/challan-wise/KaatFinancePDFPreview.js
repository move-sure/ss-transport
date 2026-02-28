'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { X, Download, Eye, FileText, Package, Truck } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  getCityNameById,
  getCityNameByCode,
  getCityIdByCode,
  formatCurrency,
  formatWeight
} from '../finance-bilty-helpers';

/**
 * KaatFinancePDFPreview - Full-screen PDF preview & downloader for kaat finance data.
 * Sorted alphabetically by station (destination city).
 * Columns: S.No, GR No, Station, Transport, Consignor, Consignee, Pkg, Weight, Total, Kaat, Pohonch, Bilty#, PF, Profit
 */
export default function KaatFinancePDFPreview({
  isOpen,
  onClose,
  challanTransits = [],
  allKaatData = {},
  transportLookup = {},
  cities = [],
  selectedChallan = null,
  footerTotals = {},
  getAdminNameForBilty,
}) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pdfViewerRef = useRef(null);

  // Helper: get city name
  const getCityName = useCallback((transit) => {
    const bilty = transit.bilty;
    const station = transit.station;
    if (bilty?.to_city_id) return getCityNameById(bilty.to_city_id, cities) || '';
    if (station?.station) return getCityNameByCode(station.station, cities) || station.station;
    return '';
  }, [cities]);

  // Helper: get transport display name for a transit row
  const getTransportDisplay = useCallback((transit) => {
    const kaatData = allKaatData[transit.gr_no];
    const kaatTransportId = kaatData?.transport_id;
    if (kaatTransportId && transportLookup[kaatTransportId]) {
      return transportLookup[kaatTransportId].transport_name || '';
    }
    return transit.bilty?.transport_name || transit.station?.transport_name || '';
  }, [allKaatData, transportLookup]);

  // Sorted data: alphabetically by station/city name, then by GR within each city
  const sortedTransits = useMemo(() => {
    return [...challanTransits].sort((a, b) => {
      const cityA = getCityName(a).toUpperCase();
      const cityB = getCityName(b).toUpperCase();
      if (cityA !== cityB) return cityA.localeCompare(cityB);
      const grA = (a.gr_no || '').toUpperCase();
      const grB = (b.gr_no || '').toUpperCase();
      return grA.localeCompare(grB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [challanTransits, getCityName]);

  // Compute kaat amount for a transit row
  const computeKaat = useCallback((transit) => {
    const kaatData = allKaatData[transit.gr_no];
    if (!kaatData) return 0;
    if (kaatData.kaat != null) return parseFloat(kaatData.kaat);
    const bilty = transit.bilty;
    const station = transit.station;
    const weight = parseFloat(bilty?.wt || station?.weight || 0);
    const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
    const rateKg = parseFloat(kaatData.rate_per_kg) || 0;
    const ratePkg = parseFloat(kaatData.rate_per_pkg) || 0;
    const effectiveWeight = Math.max(weight, 50);
    let kaatAmount = 0;
    if (kaatData.rate_type === 'per_kg') kaatAmount = effectiveWeight * rateKg;
    else if (kaatData.rate_type === 'per_pkg') kaatAmount = packages * ratePkg;
    else if (kaatData.rate_type === 'hybrid') kaatAmount = (effectiveWeight * rateKg) + (packages * ratePkg);
    kaatAmount += parseFloat(kaatData.bilty_chrg || 0) + parseFloat(kaatData.ewb_chrg || 0) + parseFloat(kaatData.labour_chrg || 0) + parseFloat(kaatData.other_chrg || 0);
    return kaatAmount;
  }, [allKaatData]);

  // Counts for summary
  const pohonchCount = useMemo(() => sortedTransits.filter(t => allKaatData[t.gr_no]?.pohonch_no).length, [sortedTransits, allKaatData]);
  const biltyNoCount = useMemo(() => sortedTransits.filter(t => allKaatData[t.gr_no]?.bilty_number).length, [sortedTransits, allKaatData]);

  // Generate PDF
  const generatePDFBlob = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 2;
      const usableWidth = pageWidth - margin * 2; // 293mm

      const addHeader = (pageNum) => {
        if (pageNum === 1) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('KAAT FINANCE REPORT', pageWidth / 2, 12, { align: 'center' });

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`Challan No: ${selectedChallan?.challan_no || 'N/A'}`, pageWidth - margin, 10, { align: 'right' });
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin, 15, { align: 'right' });

          if (selectedChallan?.truck) {
            doc.setFontSize(8);
            doc.text(`Truck: ${selectedChallan.truck.truck_number || 'N/A'}`, margin, 10);
          }
          if (selectedChallan?.driver) {
            doc.text(`Driver: ${selectedChallan.driver.name || 'N/A'}`, margin, 15);
          }

          doc.setFontSize(8);
          doc.text(`Total Bilties: ${sortedTransits.length}`, margin, 20);

          doc.setLineWidth(0.3);
          doc.line(margin, 23, pageWidth - margin, 23);
        } else {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('KAAT FINANCE REPORT (Continued)', pageWidth / 2, 10, { align: 'center' });
          doc.setFontSize(7);
          doc.text(`Challan: ${selectedChallan?.challan_no || ''}`, pageWidth - margin, 10, { align: 'right' });
        }
        doc.setFontSize(7);
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
      };

      addHeader(1);

      // Build table data - compute real totals from data
      let sumPkgs = 0, sumWt = 0, sumTotal = 0, sumKaat = 0, sumDd = 0, sumPf = 0, sumProfit = 0;

      // Column order: #, GR No, Station, Transport, Consignor, Consignee, Pkg, Wt, Total, Pay, DD, Kaat, PF, Profit, Pohonch, Bilty#
      const tableData = sortedTransits.map((transit, idx) => {
        const bilty = transit.bilty;
        const station = transit.station;
        const kaatData = allKaatData[transit.gr_no];
        const paymentMode = bilty?.payment_mode || station?.payment_status;
        const deliveryType = bilty?.delivery_type || station?.delivery_type || '';
        const hasDoor = deliveryType.toLowerCase().includes('door');
        const isPaidOrDD = paymentMode?.toLowerCase().includes('paid') || hasDoor;
        const totalAmount = isPaidOrDD ? 0 : parseFloat(bilty?.total || station?.amount || 0);
        const kaatAmount = computeKaat(transit);
        const ddChrg = kaatData?.dd_chrg ? parseFloat(kaatData.dd_chrg) : 0;
        const profit = kaatData ? totalAmount - kaatAmount - ddChrg : totalAmount - ddChrg;
        const pf = kaatData?.pf != null ? parseFloat(kaatData.pf) : 0;
        const pkg = bilty?.no_of_pkg || station?.no_of_packets || 0;
        const wt = parseFloat(bilty?.wt || station?.weight || 0);

        sumPkgs += pkg;
        sumWt += wt;
        sumTotal += totalAmount;
        sumKaat += kaatAmount;
        sumDd += ddChrg;
        sumPf += pf;
        sumProfit += profit;

        return [
          (idx + 1).toString(),
          (transit.gr_no || '').toUpperCase(),
          getCityName(transit).toUpperCase(),
          (getTransportDisplay(transit) || '').toUpperCase(),
          (bilty?.consignor_name || station?.consignor || '').toUpperCase(),
          (bilty?.consignee_name || station?.consignee || '').toUpperCase(),
          pkg.toString(),
          Math.round(wt).toString(),
          isPaidOrDD ? '0' : totalAmount.toFixed(0),
          (paymentMode?.toUpperCase() || '') + (hasDoor ? '/DD' : ''),
          hasDoor ? (ddChrg > 0 ? ddChrg.toFixed(0) : 'DD') : '',
          kaatAmount > 0 ? kaatAmount.toFixed(0) : '',
          pf !== 0 ? pf.toFixed(0) : '',
          profit !== 0 ? profit.toFixed(0) : '',
          kaatData?.pohonch_no || '',
          kaatData?.bilty_number || '',
        ];
      });

      // Column widths to fill usableWidth (293mm)
      // #(8) GR(20) Station(20) Transport(30) Consignor(30) Consignee(30) Pkg(11) Wt(13) Total(17) Pay(17) DD(13) Kaat(17) PF(14) Profit(17) Pohonch(18) Bilty#(18) = 293
      const colWidths = [8, 20, 20, 30, 30, 30, 11, 13, 17, 17, 13, 17, 14, 17, 18, 18];

      autoTable(doc, {
        startY: 27,
        head: [['#', 'GR No', 'Station', 'Transport', 'Consignor', 'Consignee', 'Pkg', 'Wt', 'Total', 'Pay', 'DD', 'Kaat', 'PF', 'Profit', 'Pohonch', 'Bilty#']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
        },
        styles: {
          fontSize: 6.5,
          cellPadding: 1,
          overflow: 'linebreak',
          valign: 'middle',
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
          lineColor: [0, 0, 0],
          lineWidth: 0.15,
          minCellHeight: 5.5,
          rowPageBreak: 'avoid',
        },
        columnStyles: {
          0:  { halign: 'center', cellWidth: colWidths[0], fontStyle: 'bold' },        // #
          1:  { halign: 'center', cellWidth: colWidths[1], fontStyle: 'bold', fontSize: 7.5 }, // GR
          2:  { halign: 'center', cellWidth: colWidths[2], fontStyle: 'bold' },        // Station
          3:  { cellWidth: colWidths[3], overflow: 'linebreak', fontSize: 6 },          // Transport
          4:  { cellWidth: colWidths[4], overflow: 'linebreak', fontSize: 6 },          // Consignor
          5:  { cellWidth: colWidths[5], overflow: 'linebreak', fontSize: 6 },          // Consignee
          6:  { halign: 'center', cellWidth: colWidths[6] },                            // Pkg
          7:  { halign: 'center', cellWidth: colWidths[7] },                            // Wt
          8:  { halign: 'right', cellWidth: colWidths[8] },                             // Total
          9:  { halign: 'center', cellWidth: colWidths[9], fontSize: 6 },               // Pay
          10: { halign: 'center', cellWidth: colWidths[10], fontStyle: 'bold' },         // DD
          11: { halign: 'right', cellWidth: colWidths[11], fontStyle: 'bold' },          // Kaat
          12: { halign: 'right', cellWidth: colWidths[12] },                             // PF
          13: { halign: 'right', cellWidth: colWidths[13], fontStyle: 'bold' },          // Profit
          14: { halign: 'center', cellWidth: colWidths[14] },                            // Pohonch
          15: { halign: 'center', cellWidth: colWidths[15] },                            // Bilty#
        },
        margin: { left: margin, right: margin },
        tableWidth: usableWidth,
        didDrawPage: (data) => {
          addHeader(data.pageNumber);
          if (data.pageNumber > 1) {
            data.table.startPageY = 15;
          }
        },
      });

      // Totals row
      const tableEndY = doc.lastAutoTable.finalY + 2;
      const totColStyles = {};
      colWidths.forEach((w, i) => {
        totColStyles[i] = { cellWidth: w, halign: i <= 5 ? 'center' : (i >= 8 ? 'right' : 'center') };
      });
      totColStyles[5] = { cellWidth: colWidths[5], halign: 'center', fontStyle: 'bold' };
      totColStyles[14] = { cellWidth: colWidths[14], halign: 'center' };
      totColStyles[15] = { cellWidth: colWidths[15], halign: 'center' };

      autoTable(doc, {
        startY: tableEndY,
        body: [[
          '', '', '', '', '', 'TOTAL',
          sumPkgs.toString(),
          Math.round(sumWt).toString(),
          sumTotal.toFixed(0),
          '',
          sumDd > 0 ? sumDd.toFixed(0) : '',
          sumKaat.toFixed(0),
          sumPf.toFixed(0),
          sumProfit.toFixed(0),
          pohonchCount + '/' + sortedTransits.length,
          biltyNoCount + '/' + sortedTransits.length,
        ]],
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          fontStyle: 'bold',
          cellPadding: 1.5,
          textColor: [0, 0, 0],
          fillColor: [245, 245, 245],
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
        },
        columnStyles: totColStyles,
        margin: { left: margin, right: margin },
        tableWidth: usableWidth,
      });

      // Summary at bottom
      const summaryY = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY:', margin, summaryY);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Total: Rs.' + sumTotal.toFixed(0) +
        '  |  Kaat: Rs.' + sumKaat.toFixed(0) +
        '  |  DD: Rs.' + sumDd.toFixed(0) +
        '  |  PF: Rs.' + sumPf.toFixed(0) +
        '  |  Profit: Rs.' + sumProfit.toFixed(0),
        margin, summaryY + 5
      );
      doc.text(
        'Pohonch: ' + pohonchCount + '/' + sortedTransits.length +
        '  |  Bilty#: ' + biltyNoCount + '/' + sortedTransits.length,
        margin, summaryY + 10
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Authorized Signatory: ____________________', pageWidth - margin - 80, summaryY + 5);

      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Error generating Kaat PDF:', err);
      setError(err.message || 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  }, [sortedTransits, allKaatData, transportLookup, cities, selectedChallan, footerTotals, computeKaat, getCityName, getTransportDisplay, pohonchCount, biltyNoCount]);

  const handleDownload = async () => {
    try {
      // Re-use the same generate logic but save directly
      await generatePDFBlob();
      if (pdfUrl) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Kaat_Finance_${selectedChallan?.challan_no || 'report'}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  useEffect(() => {
    if (isOpen) generatePDFBlob();
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-full max-h-full flex flex-col" style={{ backgroundColor: '#fbfaf9' }}>
        {/* Header */}
        <div className="p-2 sm:p-3 border-b border-purple-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-xl shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">Kaat Finance PDF</h3>
                <p className="text-purple-100 text-xs">Challan {selectedChallan?.challan_no} — {sortedTransits.length} bilties</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-purple-200">Bilties: <span className="font-bold text-white">{sortedTransits.length}</span></span>
              <span className="text-purple-200">Pohonch: <span className="font-bold text-white">{pohonchCount}/{sortedTransits.length}</span></span>
              <span className="text-purple-200">Bilty#: <span className="font-bold text-white">{biltyNoCount}/{sortedTransits.length}</span></span>
              <span className="text-purple-200">Profit: <span className="font-bold text-white">₹{(footerTotals.totalProfit || 0).toFixed(0)}</span></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={generatePDFBlob}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded flex items-center gap-1 transition-all disabled:opacity-50 text-xs font-semibold"
              >
                <Eye className="w-3 h-3" />
                {loading ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={handleDownload}
                disabled={loading || !pdfUrl}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded flex items-center gap-1 transition-all disabled:opacity-50 text-xs font-semibold shadow-lg"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded transition-all hover:scale-105"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 flex flex-col overflow-hidden p-2 bg-gray-50">
          <div className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-lg">
            {!loading && !error && pdfUrl && (
              <iframe
                ref={pdfViewerRef}
                src={pdfUrl}
                className="w-full h-full"
                title="Kaat Finance PDF Preview"
              />
            )}
            {!loading && !error && !pdfUrl && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <div className="text-lg font-semibold text-gray-800 mb-2">No Preview</div>
                  <button onClick={generatePDFBlob} className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold">
                    Generate Preview
                  </button>
                </div>
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-4" />
                  <div className="text-lg font-semibold text-gray-800">Generating PDF...</div>
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <div className="text-red-600 mb-4">{error}</div>
                  <button onClick={generatePDFBlob} className="bg-red-600 text-white px-4 py-2 rounded font-semibold">Try Again</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-gray-600 flex-wrap">
              <span>Challan: <strong className="text-purple-600">{selectedChallan?.challan_no}</strong></span>
              <span>Bilties: <strong>{sortedTransits.length}</strong></span>
              <span>Total: <strong>₹{(footerTotals.totalAmount || 0).toFixed(0)}</strong></span>
              <span>Kaat: <strong>₹{(footerTotals.totalKaat || 0).toFixed(0)}</strong></span>
              <span>PF: <strong>₹{(footerTotals.totalPf || 0).toFixed(0)}</strong></span>
              <span className={`font-bold ${(footerTotals.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Profit: ₹{(footerTotals.totalProfit || 0).toFixed(0)}
              </span>
              <span className="text-gray-400">|</span>
              <span>Pohonch: <strong>{pohonchCount}/{sortedTransits.length}</strong></span>
              <span>Bilty#: <strong>{biltyNoCount}/{sortedTransits.length}</strong></span>
            </div>
            <span className="text-gray-400">{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
