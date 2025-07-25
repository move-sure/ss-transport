'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, Printer, Eye, FileText, Package } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BillPDFPreview = ({ 
  isOpen, 
  onClose, 
  selectedBilties = [],
  userBranch = null,
}) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pdfViewerRef = useRef(null);

  // Generate PDF blob for preview
  const generatePDFBlob = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const doc = await generateBillPDFBlob(selectedBilties);

      // Convert to blob and create URL
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

    } catch (err) {
      console.error('Error generating PDF preview:', err);
      setError(err.message || 'Failed to generate PDF preview');
    } finally {
      setLoading(false);
    }
  }, [selectedBilties]);

  // Generate Bill PDF Blob
  const generateBillPDFBlob = async (billiesData) => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 8;
    
    // Sort bilties by GR number
    const sortedBilliesData = [...billiesData].sort((a, b) => {
      const grA = (a.gr_no || '').toUpperCase();
      const grB = (b.gr_no || '').toUpperCase();
      return grA.localeCompare(grB, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    // Add header function
    const addHeader = (pageNum) => {
      // Header section with company details
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('SS TRANSPORT', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Gandhi Market Dube Parao Aligarh - 202001', pageWidth / 2, 28, { align: 'center' });
      doc.text('Mob No: 9690293140, 8077834769', pageWidth / 2, 35, { align: 'center' });
      
      // Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('BILL', pageWidth / 2, 45, { align: 'center' });
      
      // Date and page info
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, margin, 52);
      doc.text(`Page ${pageNum}`, pageWidth - margin, 52, { align: 'right' });
      
      // Draw header line
      doc.setLineWidth(0.5);
      doc.line(margin, 55, pageWidth - margin, 55);
    };
    
    // Add first page header
    addHeader(1);
    
    // Calculate totals
    const totalAmount = sortedBilliesData.reduce((sum, bilty) => sum + (bilty.total || bilty.amount || 0), 0);
    const totalPackages = sortedBilliesData.reduce((sum, bilty) => sum + (bilty.no_of_pkg || 0), 0);
    const totalWeight = sortedBilliesData.reduce((sum, bilty) => sum + (bilty.wt || 0), 0);
    const toPaidAmount = sortedBilliesData.filter(b => (b.payment_mode || b.payment_status) === 'to-pay').reduce((sum, bilty) => sum + (bilty.total || bilty.amount || 0), 0);
    const paidAmount = sortedBilliesData.filter(b => (b.payment_mode || b.payment_status) === 'paid').reduce((sum, bilty) => sum + (bilty.total || bilty.amount || 0), 0);
    
    // Table data with serial numbers
    const tableData = sortedBilliesData.map((bilty, index) => [
      (index + 1).toString(), // S.No
      (bilty.gr_no || '').toUpperCase(),
      format(new Date(bilty.bilty_date || bilty.created_at), 'dd/MM/yyyy'),
      (bilty.consignor_name || bilty.consignor || '').toUpperCase(),
      (bilty.consignee_name || bilty.consignee || '').toUpperCase(),
      (bilty.from_city_name || bilty.from_city || '').toUpperCase(),
      (bilty.to_city_name || bilty.to_city || '').toUpperCase(),
      (bilty.transport_name || '').toUpperCase(),
      (bilty.payment_mode || bilty.payment_status || '').toUpperCase(),
      (bilty.no_of_pkg || 0).toString(),
      Math.round(bilty.wt || 0).toString(),
      `₹${(bilty.total || bilty.amount || 0).toFixed(2)}`,
      (bilty.e_way_bill || '').toUpperCase()
    ]);
    
    // Create main table
    autoTable(doc, {
      startY: 58,
      head: [['S.No', 'G.R. No.', 'Date', 'Consignor', 'Consignee', 'From', 'To', 'Transport', 'Pay Mode', 'Pkg', 'Wt(kg)', 'Amount', 'E-way Bill']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 1.5,
        overflow: 'linebreak',
        valign: 'middle',
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        minCellHeight: 6,
        rowPageBreak: 'avoid'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15, fontStyle: 'bold' }, // S.No
        1: { halign: 'center', cellWidth: 25, fontStyle: 'bold', fontSize: 9 }, // GR No
        2: { halign: 'center', cellWidth: 20 }, // Date
        3: { cellWidth: 35, overflow: 'linebreak', fontSize: 7.5 }, // Consignor
        4: { cellWidth: 35, overflow: 'linebreak', fontSize: 7.5 }, // Consignee
        5: { cellWidth: 20, overflow: 'linebreak' }, // From
        6: { cellWidth: 20, overflow: 'linebreak' }, // To
        7: { cellWidth: 25, overflow: 'linebreak' }, // Transport
        8: { halign: 'center', cellWidth: 18 }, // Pay Mode
        9: { halign: 'center', cellWidth: 15 }, // Pkg
        10: { halign: 'center', cellWidth: 18 }, // Weight
        11: { halign: 'right', cellWidth: 25 }, // Amount
        12: { halign: 'center', cellWidth: 25 } // E-way Bill
      },
      margin: { left: margin, right: margin },
      tableWidth: 'wrap',
      didDrawPage: (data) => {
        addHeader(data.pageNumber);
        if (data.pageNumber > 1) {
          data.settings.startY = 58;
        }
      }
    });
    
    // Add TOTAL row after table
    const tableEndY = doc.lastAutoTable.finalY + 5;
    
    autoTable(doc, {
      startY: tableEndY,
      body: [['', '', '', '', '', '', '', 'TOTAL', '', totalPackages.toString(), Math.round(totalWeight).toString(), `₹${totalAmount.toFixed(2)}`, '']],
      theme: 'grid',
      styles: { 
        fontSize: 10,
        fontStyle: 'bold',
        cellPadding: 3,
        textColor: [0, 0, 0],
        fillColor: [240, 240, 240],
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'center', cellWidth: 20 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
        8: { halign: 'center', cellWidth: 18 },
        9: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
        10: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
        11: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
        12: { halign: 'center', cellWidth: 25 }
      },
      margin: { left: margin, right: margin },
      tableWidth: 'wrap'
    });
    
    // Add payment summary
    const summaryY = doc.lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT SUMMARY:', margin, summaryY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Paid Amount: ₹${paidAmount.toFixed(2)}`, margin, summaryY + 8);
    doc.text(`Total To-Pay Amount: ₹${toPaidAmount.toFixed(2)}`, margin, summaryY + 16);
    doc.text(`Grand Total: ₹${totalAmount.toFixed(2)}`, margin, summaryY + 24);
    
    // Footer signature on last page
    const finalY = summaryY + 35;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('For SS TRANSPORT', pageWidth - margin - 60, finalY);
    doc.text('Authorized Signatory: ___________________', pageWidth - margin - 80, finalY + 8);
    
    return doc;
  };

  // Download PDF
  const handleDownload = async () => {
    try {
      const doc = await generateBillPDFBlob(selectedBilties);
      const filename = `bill_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to download PDF');
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  // Generate PDF when component opens
  useEffect(() => {
    if (isOpen && selectedBilties.length > 0) {
      generatePDFBlob();
    }
  }, [isOpen, selectedBilties, generatePDFBlob]);

  // Cleanup URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-full max-h-full m-4 flex flex-col" style={{ backgroundColor: '#fbfaf9' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-purple-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-xl shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Bill PDF Preview</h3>
              <p className="text-purple-100 text-sm">Generate and preview bill document</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-lg transition-all hover:scale-105"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Controls */}
          <div className="w-1/4 p-4 border-r-2 border-purple-200 bg-white overflow-y-auto">
            <div className="space-y-4">
              {/* Document Info Card */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Bill Info
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-gray-600">Type:</span>
                    <p className="text-purple-700 font-bold">Bill Summary</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Date:</span>
                    <p className="text-gray-800">{format(new Date(), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Total Bilties:</span>
                    <p className="text-purple-700 font-bold">{selectedBilties.length}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-black">Actions</h4>
                
                <button
                  onClick={generatePDFBlob}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  <Eye className="w-4 h-4" />
                  {loading ? 'Generating...' : 'Generate Preview'}
                </button>

                <button
                  onClick={handleDownload}
                  disabled={loading || error || !pdfUrl}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                
                <button
                  onClick={handlePrint}
                  disabled={loading || error || !pdfUrl}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>

              {/* Status Display */}
              {loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <div>
                      <div className="text-sm font-semibold text-blue-800">Generating PDF...</div>
                      <div className="text-xs text-blue-600">Please wait</div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-red-100 p-1 rounded">
                      <FileText className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-red-800">Error</div>
                      <div className="text-xs text-red-600">{error}</div>
                    </div>
                  </div>
                  <button
                    onClick={generatePDFBlob}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-semibold transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Summary Statistics */}
              {selectedBilties.length > 0 && (
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-3">
                  <h4 className="text-sm font-bold text-black mb-3">Summary</h4>
                  <div className="space-y-2">
                    <div className="bg-white rounded p-2 border border-gray-100">
                      <span className="text-xs font-semibold text-gray-600">Total Amount:</span>
                      <p className="text-lg font-bold text-purple-600">
                        ₹{selectedBilties.reduce((sum, bilty) => sum + (bilty.total || bilty.amount || 0), 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white rounded p-2 border border-gray-100">
                      <span className="text-xs font-semibold text-gray-600">To-Pay Amount:</span>
                      <p className="text-lg font-bold text-yellow-600">
                        ₹{selectedBilties.filter(b => (b.payment_mode || b.payment_status) === 'to-pay').reduce((sum, bilty) => sum + (bilty.total || bilty.amount || 0), 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white rounded p-2 border border-gray-100">
                      <span className="text-xs font-semibold text-gray-600">Paid Amount:</span>
                      <p className="text-lg font-bold text-green-600">
                        ₹{selectedBilties.filter(b => (b.payment_mode || b.payment_status) === 'paid').reduce((sum, bilty) => sum + (bilty.total || bilty.amount || 0), 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - PDF Preview */}
          <div className="w-3/4 p-4 bg-gray-50 overflow-hidden flex flex-col">
            <div className="mb-3">
              <h4 className="text-lg font-bold text-black flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                PDF Preview
              </h4>
              <p className="text-sm text-gray-600">Live preview of your bill document</p>
            </div>

            <div className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-lg">
              {!loading && !error && pdfUrl && (
                <iframe
                  ref={pdfViewerRef}
                  src={pdfUrl}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              )}

              {!loading && !error && !pdfUrl && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-600" />
                    </div>
                    <div className="text-lg font-semibold text-gray-800 mb-2">No Preview Available</div>
                    <div className="text-gray-600 mb-4">Click Generate Preview to view the PDF</div>
                    <button
                      onClick={generatePDFBlob}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold"
                    >
                      Generate Preview
                    </button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-4"></div>
                    <div className="text-lg font-semibold text-gray-800 mb-2">Generating Preview...</div>
                    <div className="text-purple-600">Please wait while we create your document</div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="text-lg font-semibold text-red-800 mb-2">Preview Error</div>
                    <div className="text-red-600 mb-4 text-sm">{error}</div>
                    <button
                      onClick={generatePDFBlob}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 text-gray-700">
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3 text-purple-600" />
                Selected Bilties: <span className="font-bold text-purple-600">{selectedBilties.length}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Total: <span className="font-bold text-green-600">₹{selectedBilties.reduce((sum, bilty) => sum + (bilty.total || bilty.amount || 0), 0).toFixed(2)}</span>
              </span>
            </div>
            
            <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
              Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillPDFPreview;
