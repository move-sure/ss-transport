'use client';

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { X, Printer, Download } from 'lucide-react';

const BillGenerator = ({ selectedBilties = [], onClose, cities = [] }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  // Get city name by ID
  const getCityName = (cityId) => {
    const city = cities?.find(c => c.id?.toString() === cityId?.toString());
    return city ? city.city_name : 'N/A';
  };

  // Format currency - integer only, no decimals, no superscript
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '0';
    const num = Math.round(parseFloat(amount)); // Round to nearest integer
    return num.toString(); // Simple string conversion, no formatting
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch {
      return 'N/A';
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalAmount = 0;
    let paidAmount = 0;
    let toPayAmount = 0;

    selectedBilties.forEach(bilty => {
      // Handle both regular and station bilty amount fields
      const amount = parseFloat(bilty.total || bilty.amount || 0);
      totalAmount += amount;
      
      // Handle both payment_mode and payment_status fields
      const paymentStatus = bilty.payment_mode || bilty.payment_status || '';
      
      if (paymentStatus.toLowerCase() === 'paid') {
        paidAmount += amount;
      } else if (paymentStatus.toLowerCase() === 'to-pay') {
        toPayAmount += amount;
      }
    });

    return { totalAmount, paidAmount, toPayAmount };
  };

  const generateBillPDF = async () => {
    setIsGenerating(true);
    
    try {
      // Safety checks
      if (!selectedBilties || selectedBilties.length === 0) {
        throw new Error('No bilties selected for PDF generation');
      }

      console.log('Starting PDF generation for bilties:', selectedBilties.length);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      let yPosition = 15;

      // Page border
      pdf.setLineWidth(1);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');

      // Header - SS TRANSPORT with better styling
      pdf.setFontSize(24);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(41, 128, 185);
      pdf.text('SS TRANSPORT', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      pdf.setFontSize(14);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text('HO : DUBE PARAO, GT ROAD, ALIGARH-202001, INDIA', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 7;
      pdf.setFontSize(12);
      pdf.setFont('times', 'normal');
      pdf.text('Customer Care No: +91-7668291228', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 6;
      pdf.text('Website: console.movesure.io/sstransport', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      
      // Double horizontal line
      pdf.setLineWidth(0.8);
      pdf.line(10, yPosition, pageWidth - 10, yPosition);
      pdf.setLineWidth(0.3);
      pdf.line(10, yPosition + 2, pageWidth - 10, yPosition + 2);
      yPosition += 12;

      // Bill Details Title with better styling
      pdf.setFontSize(18);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(41, 128, 185);
      pdf.text('PAYMENT BILL', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFontSize(14);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Payment to be done by Consignor to SS TRANSPORT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Get first consignor name (since all bills are for one client)
      const firstBilty = selectedBilties[0];
      const consignorName = firstBilty.type === 'station' ? 
        (firstBilty.consignor || 'N/A') : 
        (firstBilty.consignor_name || 'N/A');

      // Consignor details box
      pdf.setFillColor(248, 249, 250);
      pdf.rect(15, yPosition - 3, pageWidth - 30, 20, 'F');
      pdf.setLineWidth(0.5);
      pdf.rect(15, yPosition - 3, pageWidth - 30, 20, 'S');
      
      pdf.setFontSize(12);
      pdf.setFont('times', 'bold');
      pdf.text('CONSIGNOR: ', 20, yPosition + 5);
      pdf.setFont('times', 'normal');
      pdf.text(consignorName, 50, yPosition + 5);
      
      // Date range
      const dates = selectedBilties.map(b => new Date(b.bilty_date || b.created_at)).filter(d => !isNaN(d));
      const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
      const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();
      
      pdf.setFontSize(11);
      pdf.setFont('times', 'normal');
      pdf.text('Period: ' + minDate.toLocaleDateString('en-IN') + ' to ' + maxDate.toLocaleDateString('en-IN'), 20, yPosition + 12);
      
      const currentDate = new Date().toLocaleDateString('en-IN');
      const currentTime = new Date().toLocaleTimeString('en-IN');
      pdf.text('Generated on: ' + currentDate + ' at ' + currentTime, pageWidth - 20, yPosition + 12, { align: 'right' });
      
      yPosition += 25;

      // Table data preparation (without consignor column)
      const tableData = selectedBilties.map((bilty, index) => {
        const consigneeName = bilty.type === 'station' ? (bilty.consignee || 'N/A') : (bilty.consignee_name || 'N/A');
        const destination = bilty.type === 'regular' ? getCityName(bilty.to_city_id) : (bilty.station_name || bilty.station || 'N/A');
        const amount = bilty.total || bilty.amount || 0;
        const date = bilty.bilty_date || bilty.created_at || bilty.date;
        
        return [
          (index + 1).toString(),
          bilty.gr_no || 'N/A',
          formatDate(date),
          consigneeName,
          destination,
          (bilty.payment_mode || bilty.payment_status || 'N/A').toString().toUpperCase(),
          formatCurrency(amount), // Removed rupee symbol to avoid font issues
          bilty.pvt_marks || 'N/A'
        ];
      });

      // Table headers (without consignor)
      const tableHeaders = [
        'S.No',
        'GR Number',
        'Date',
        'Consignee',
        'Destination',
        'Payment Mode',
        'Amount (Rs.)',
        'Private Marks'
      ];

      // Enhanced table creation
      const cellHeight = 14; // Increased cell height for better text fitting
      const cellPadding = 2.5; // Reduced padding for more text space
      const startX = 10;
      const tableWidth = pageWidth - 20;
      const columnWidths = [15, 28, 22, 40, 30, 25, 30, 25]; // Removed consignor column
      
      // Adjust column widths to fit page
      const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
      const scaleFactor = tableWidth / totalWidth;
      const adjustedWidths = columnWidths.map(w => w * scaleFactor);
      
      // Draw table headers with better styling
      pdf.setFillColor(41, 128, 185);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('times', 'bold');
      
      // Header background with border
      pdf.rect(startX, yPosition, tableWidth, cellHeight, 'F');
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(startX, yPosition, tableWidth, cellHeight, 'S');
      
      // Header vertical borders
      let headerX = startX;
      adjustedWidths.forEach((width, index) => {
        if (index > 0) {
          pdf.setDrawColor(255, 255, 255);
          pdf.setLineWidth(0.3);
          pdf.line(headerX, yPosition, headerX, yPosition + cellHeight);
        }
        headerX += width;
      });
      
      // Header text
      headerX = startX;
      tableHeaders.forEach((header, index) => {
        const textX = headerX + adjustedWidths[index] / 2;
        const textY = yPosition + cellHeight / 2 + 2;
        pdf.text(header, textX, textY, { align: 'center' });
        headerX += adjustedWidths[index];
      });
      
      yPosition += cellHeight;
      
      // Draw table data with better styling
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.setFont('times', 'normal');
      
      tableData.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (yPosition + cellHeight > pageHeight - 60) {
          pdf.addPage();
          
          // Add page border on new page
          pdf.setLineWidth(1);
          pdf.setDrawColor(0, 0, 0);
          pdf.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');
          
          yPosition = 20;
        }
        
        // Alternate row colors
        if (rowIndex % 2 === 0) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(startX, yPosition, tableWidth, cellHeight, 'F');
        }
        
        // Row border
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.rect(startX, yPosition, tableWidth, cellHeight, 'S');
        
        // Cell vertical borders
        let cellX = startX;
        adjustedWidths.forEach((width, index) => {
          if (index > 0) {
            pdf.line(cellX, yPosition, cellX, yPosition + cellHeight);
          }
          cellX += width;
        });
        
        // Cell text with better formatting
        cellX = startX;
        row.forEach((cell, cellIndex) => {
          let textX, align;
          
          // Enhanced alignment based on column
          if (cellIndex === 0 || cellIndex === 2 || cellIndex === 5) {
            // Center align for S.No, Date, Payment Mode
            align = 'center';
            textX = cellX + adjustedWidths[cellIndex] / 2;
          } else if (cellIndex === 6) {
            // Right align for Amount
            align = 'right';
            textX = cellX + adjustedWidths[cellIndex] - cellPadding;
            pdf.setFont('times', 'bold'); // Bold for amounts
          } else {
            // Left align for names and other text
            align = 'left';
            textX = cellX + cellPadding;
          }
          
          const textY = yPosition + cellHeight / 2 + 1.5; // Better vertical centering
          
          // Enhanced text truncation with proper width calculation
          let displayText = String(cell || '');
          const maxWidth = adjustedWidths[cellIndex] - (2 * cellPadding);
          
          // More precise text width measurement
          pdf.setFont(cellIndex === 6 ? 'times' : 'times', cellIndex === 6 ? 'bold' : 'normal');
          
          // Smart truncation - ensure text fits within cell
          let textWidth = pdf.getTextWidth(displayText);
          if (textWidth > maxWidth && displayText.length > 3) {
            while (textWidth > maxWidth && displayText.length > 3) {
              displayText = displayText.slice(0, -1);
              textWidth = pdf.getTextWidth(displayText + '...');
            }
            displayText = displayText + '...';
          }
          
          pdf.text(displayText, textX, textY, { align: align });
          
          // Reset font for next cell
          if (cellIndex === 6) {
            pdf.setFont('times', 'normal');
          }
          
          cellX += adjustedWidths[cellIndex];
        });
        
        yPosition += cellHeight;
      });
      
      yPosition += 20;

      // Enhanced totals section
      const { totalAmount, paidAmount, toPayAmount } = calculateTotals();

      // Check if we need a new page for totals
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        
        // Add page border on new page
        pdf.setLineWidth(1);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');
        
        yPosition = 30;
      }

      // Enhanced totals section with better design
      const totalsBoxWidth = 80;
      const totalsX = pageWidth - totalsBoxWidth - 10;
      
      // Totals box with gradient-like effect
      pdf.setFillColor(41, 128, 185);
      pdf.rect(totalsX - 5, yPosition - 8, totalsBoxWidth, 45, 'F');
      
      pdf.setFillColor(248, 249, 250);
      pdf.rect(totalsX - 3, yPosition - 6, totalsBoxWidth - 4, 41, 'F');
      
      pdf.setLineWidth(1);
      pdf.setDrawColor(41, 128, 185);
      pdf.rect(totalsX - 5, yPosition - 8, totalsBoxWidth, 45, 'S');
      
      // Summary title
      pdf.setFontSize(14);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(41, 128, 185);
      pdf.text('PAYMENT SUMMARY', totalsX + totalsBoxWidth/2 - 2.5, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('times', 'normal');
      pdf.text('Total Bilties: ', totalsX, yPosition);
      pdf.setFont('times', 'bold');
      pdf.text(selectedBilties.length.toString(), totalsX + 35, yPosition);
      
      yPosition += 7;
      pdf.setFont('times', 'normal');
      pdf.text('Total Amount: ', totalsX, yPosition);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(220, 53, 69);
      pdf.text('Rs.' + formatCurrency(totalAmount), totalsX + 35, yPosition);
      
      yPosition += 7;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('times', 'normal');
      pdf.text('Paid Amount: ', totalsX, yPosition);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(40, 167, 69);
      pdf.text('Rs.' + formatCurrency(paidAmount), totalsX + 35, yPosition);
      
      yPosition += 7;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('times', 'normal');
      pdf.text('To Pay Amount: ', totalsX, yPosition);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(255, 193, 7);
      pdf.text('Rs.' + formatCurrency(toPayAmount), totalsX + 35, yPosition);

      // Enhanced footer
      const footerY = pageHeight - 50;
      
      // Footer separator with better styling
      pdf.setLineWidth(0.8);
      pdf.setDrawColor(41, 128, 185);
      pdf.line(10, footerY - 10, pageWidth - 10, footerY - 10);
      
      // Footer content with better layout
      pdf.setFontSize(11);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Authorized Signature', 20, footerY);
      
      pdf.setFontSize(13);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(41, 128, 185);
      pdf.text('RAJEEV SINGH', 20, footerY + 8);
      
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Owner - SS TRANSPORT CORPORATION', 20, footerY + 15);
      pdf.text('Mobile: +91-8077834769', 20, footerY + 22);
      
      // Company stamp area
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(pageWidth - 80, footerY - 5, 70, 25, 'S');
      pdf.setFontSize(9);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Company Seal & Signature', pageWidth - 75, footerY + 12, { align: 'left' });

      // Enhanced page numbering on all pages
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        // Page border on each page
        pdf.setLineWidth(1);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');
        
        // Enhanced page number
        pdf.setFontSize(9);
        pdf.setFont('times', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text('Page ' + i + ' of ' + pageCount, pageWidth - 25, 12);
        
        // No watermark - removed for clean professional look
      }

      // Generate PDF URL
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      
      console.log('PDF generated successfully!');
      
    } catch (error) {
      console.error('Detailed error in PDF generation:', error);
      console.error('Error stack:', error.stack);
      alert('Error generating PDF: ' + error.message + '. Please check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfUrl) return;
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `SS_Transport_Bilties_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    if (!pdfUrl) return;
    
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  useEffect(() => {
    if (selectedBilties.length > 0) {
      generateBillPDF();
    }
  }, [selectedBilties]);

  // Cleanup URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (selectedBilties.length === 0) {
    return null;
  }

  const { totalAmount, paidAmount, toPayAmount } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full h-full m-2 max-w-none overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Payment Bill - SS Transport
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedBilties.length} bilties selected for consignor payment
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
              <p className="text-lg text-gray-600">Generating Payment Bill...</p>
              <p className="text-sm text-gray-500 mt-2">Processing {selectedBilties.length} bilties</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Summary Bar */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 font-medium">Total Bilties</p>
                    <p className="text-xl font-bold text-gray-900">{selectedBilties.length}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 font-medium">Total Amount</p>
                    <p className="text-xl font-bold text-red-600">Rs.{formatCurrency(totalAmount)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 font-medium">Paid Amount</p>
                    <p className="text-xl font-bold text-green-600">Rs.{formatCurrency(paidAmount)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 font-medium">To Pay Amount</p>
                    <p className="text-xl font-bold text-yellow-600">Rs.{formatCurrency(toPayAmount)}</p>
                  </div>
                </div>
              </div>

              {/* PDF Preview - Full Width */}
              {pdfUrl && (
                <div className="flex-1 bg-gray-100">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full border-0"
                    title="Payment Bill Preview"
                    style={{ minHeight: '500px' }}
                  />
                </div>
              )}

              {/* Actions Bar */}
              {pdfUrl && (
                <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Ready for download or print</span>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={downloadPDF}
                      className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                      <Download className="h-5 w-5" />
                      <span className="font-medium">Download PDF</span>
                    </button>
                    <button
                      onClick={printPDF}
                      className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Printer className="h-5 w-5" />
                      <span className="font-medium">Print Bill</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillGenerator;
