'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import supabase from '../../app/utils/supabase';

export default function KaatBillPDFPreview({ bill, printFormData, onClose, onDownloadComplete }) {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [kaatDetails, setKaatDetails] = useState([]);

  useEffect(() => {
    generatePDFPreview();
  }, [bill]);

  const generatePDFPreview = async () => {
    try {
      setLoading(true);

      // Fetch kaat data and bilty data separately
      const [kaatResult, biltyResult, stationResult] = await Promise.all([
        supabase
          .from('bilty_wise_kaat')
          .select('*')
          .in('gr_no', bill.gr_numbers || []),
        
        supabase
          .from('bilty')
          .select('*')
          .in('gr_no', bill.gr_numbers || [])
          .eq('is_active', true),
        
        supabase
          .from('station_bilty_summary')
          .select('*')
          .in('gr_no', bill.gr_numbers || [])
      ]);

      if (kaatResult.error) throw kaatResult.error;

      console.log('Kaat data:', kaatResult.data);
      console.log('Bilty data:', biltyResult.data);
      console.log('Station data:', stationResult.data);

      // Create maps with ORIGINAL GR numbers (preserve case)
      const kaatMap = {};
      const biltyMap = {};
      const stationMap = {};

      (kaatResult.data || []).forEach(k => {
        kaatMap[k.gr_no] = k;
      });

      (biltyResult.data || []).forEach(b => {
        biltyMap[b.gr_no] = b;
      });

      (stationResult.data || []).forEach(s => {
        stationMap[s.gr_no] = s;
      });

      // Combine data using bill's GR numbers
      const enrichedData = (bill.gr_numbers || []).map(grNo => {
        const kaat = kaatMap[grNo];
        const bilty = biltyMap[grNo];
        const station = stationMap[grNo];
        
        return {
          gr_no: grNo,
          kaat: kaat || null,
          bilty: bilty || null,
          station: station || null
        };
      });

      console.log('Enriched data:', enrichedData);
      setKaatDetails(enrichedData);

      // Generate PDF
      const doc = generateKaatBillPDF(bill, enrichedData, printFormData);
      
      // Convert to blob URL for preview
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      
      setLoading(false);
    } catch (err) {
      console.error('Error generating PDF preview:', err);
      alert('Failed to generate PDF preview: ' + err.message);
      onClose();
    }
  };

  const generateKaatBillPDF = (bill, enrichedData, formData) => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 10;

    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('S. S. TRANSPORT CORPORATION', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(12);
    doc.text('KAAT BILL', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Challan No: ${bill.challan_no}`, margin, 28);
    doc.text(`Date: ${format(new Date(formData.bill_date), 'dd/MM/yyyy')}`, pageWidth - margin, 28, { align: 'right' });

    doc.setTextColor(0, 0, 0);

    // Transport Details
    let yPos = 45;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Transport Details:', margin, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Name: ${formData.transport_name || 'N/A'}`, margin, yPos);
    
    yPos += 5;
    if (formData.transport_gst) {
      doc.text(`GST: ${formData.transport_gst}`, margin, yPos);
      yPos += 5;
    }
    
    if (formData.transport_number) {
      doc.text(`Phone: ${formData.transport_number}`, margin, yPos);
      yPos += 5;
    }

    yPos += 5;

    // Bilty Details Table
    const tableData = enrichedData.map((item, index) => {
      const bilty = item.bilty;
      const station = item.station;
      const kaat = item.kaat;
      
      const weight = parseFloat(bilty?.wt || station?.weight || 0);
      const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
      const rateKg = parseFloat(kaat?.rate_per_kg) || 0;
      const ratePkg = parseFloat(kaat?.rate_per_pkg) || 0;

      let kaatAmount = 0;
      if (kaat) {
        if (kaat.rate_type === 'per_kg') {
          kaatAmount = weight * rateKg;
        } else if (kaat.rate_type === 'per_pkg') {
          kaatAmount = packages * ratePkg;
        } else if (kaat.rate_type === 'hybrid') {
          kaatAmount = (weight * rateKg) + (packages * ratePkg);
        }
      }

      return [
        (index + 1).toString(),
        item.gr_no || 'N/A',
        bilty?.bilty_date ? format(new Date(bilty.bilty_date), 'dd/MM/yy') : 
        station?.created_at ? format(new Date(station.created_at), 'dd/MM/yy') : '-',
        (bilty?.consignor_name || station?.consignor || 'N/A').substring(0, 20),
        (bilty?.consignee_name || station?.consignee || 'N/A').substring(0, 20),
        packages.toString(),
        weight.toFixed(2),
        kaat?.rate_type === 'per_kg' || kaat?.rate_type === 'hybrid' ? rateKg.toFixed(2) : '-',
        kaat?.rate_type === 'per_pkg' || kaat?.rate_type === 'hybrid' ? ratePkg.toFixed(2) : '-',
        kaatAmount.toFixed(2)
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['S.No', 'GR No.', 'Date', 'Consignor', 'Consignee', 'Pkg', 'Weight', 'Rate/Kg', 'Rate/Pkg', 'Kaat Amt']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 22 },
        2: { halign: 'center', cellWidth: 18 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 'auto' },
        5: { halign: 'center', cellWidth: 12 },
        6: { halign: 'right', cellWidth: 18 },
        7: { halign: 'right', cellWidth: 18 },
        8: { halign: 'right', cellWidth: 18 },
        9: { halign: 'right', cellWidth: 20, fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });

    // Total Row
    const finalY = doc.lastAutoTable.finalY;
    autoTable(doc, {
      startY: finalY,
      body: [['', '', '', '', 'TOTAL', bill.total_bilty_count, '', '', '', bill.total_kaat_amount]],
      theme: 'grid',
      styles: {
        fontSize: 9,
        fontStyle: 'bold',
        fillColor: [240, 240, 240],
        cellPadding: 2
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 22 },
        2: { halign: 'center', cellWidth: 18 },
        3: { cellWidth: 'auto' },
        4: { halign: 'right', cellWidth: 'auto' },
        5: { halign: 'center', cellWidth: 12 },
        6: { halign: 'right', cellWidth: 18 },
        7: { halign: 'right', cellWidth: 18 },
        8: { halign: 'right', cellWidth: 18 },
        9: { halign: 'right', cellWidth: 20, fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });

    // Footer
    const footerY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('For S. S. TRANSPORT CORPORATION', pageWidth - margin, footerY, { align: 'right' });
    doc.text('Authorized Signatory', pageWidth - margin, footerY + 15, { align: 'right' });

    return doc;
  };

  const handleDownload = async () => {
    try {
      // Generate fresh PDF for download
      const doc = generateKaatBillPDF(bill, kaatDetails, printFormData);
      
      // Update printed_yet flag in database
      const { error } = await supabase
        .from('kaat_bill_master')
        .update({ printed_yet: true })
        .eq('id', bill.id);

      if (error) {
        console.error('Error updating printed_yet flag:', error);
      }

      // Download the PDF
      doc.save(`Kaat_Bill_${bill.challan_no}_${printFormData.transport_name.replace(/\s+/g, '_')}_${format(new Date(printFormData.bill_date), 'yyyyMMdd')}.pdf`);

      // Notify parent component
      if (onDownloadComplete) {
        onDownloadComplete();
      }

      alert('✅ PDF downloaded successfully!');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Kaat Bill Preview</h2>
            <p className="text-sm text-white/80 mt-1">
              {printFormData.transport_name} - Challan {bill.challan_no}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <button
                onClick={handleDownload}
                className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 overflow-hidden p-2 bg-gray-100 min-h-0">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-semibold">Generating PDF Preview...</p>
              </div>
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg shadow-lg border-0"
              title="Kaat Bill PDF Preview"
              style={{ minHeight: '70vh' }}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-gray-50 rounded-b-2xl border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div>
              Total Bilties: <span className="font-semibold text-gray-900">{bill.total_bilty_count}</span>
            </div>
            <div>
              Total Kaat Amount: <span className="font-semibold text-gray-900">₹{parseFloat(bill.total_kaat_amount).toFixed(2)}</span>
            </div>
            <div>
              {bill.printed_yet ? (
                <span className="text-green-600 font-semibold">✓ Already Printed</span>
              ) : (
                <span className="text-orange-600 font-semibold">Not Printed Yet</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
