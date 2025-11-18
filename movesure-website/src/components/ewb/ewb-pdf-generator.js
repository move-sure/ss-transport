'use client';

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { X, Printer, Download, RefreshCw } from 'lucide-react';

const EWBPDFGenerator = ({ ewbData, onClose }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (ewbData) {
      generatePDFPreview();
    }
  }, [ewbData]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Generate QR Code
  const generateQRCode = async (text) => {
    try {
      const qrDataURL = await QRCode.toDataURL(text, {
        width: 200,
        margin: 1,
      });
      return qrDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dateString;
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0.00';
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Generate PDF
  const generatePDFPreview = async () => {
    try {
      setLoading(true);
      setIsGenerating(true);

      // Handle different data structures:
      // 1. Direct validation result: ewbData.data.data.results.message
      // 2. Cached validation result: ewbData.data (already has full structure)
      // 3. Direct API response: ewbData.data.results.message
      // 4. Raw message object: ewbData
      
      let message;
      
      // Check if it's a validation result wrapper
      if (ewbData.data) {
        // Check if data has nested data.results.message (from API)
        if (ewbData.data.data?.results?.message) {
          message = ewbData.data.data.results.message;
        }
        // Check if data has direct results.message (from cache or direct response)
        else if (ewbData.data.results?.message) {
          message = ewbData.data.results.message;
        }
        // Otherwise use data directly
        else {
          message = ewbData.data;
        }
      } 
      // Fallback to message property or entire object
      else {
        message = ewbData.message || ewbData;
      }
      
      console.log('EWB PDF Generator - Processing data:', message);
      
      if (!message || !message.eway_bill_number) {
        console.error('Invalid EWB data structure:', ewbData);
        throw new Error('Invalid E-Way Bill data. Missing required fields.');
      }
      
      // Generate QR Code
      const qrText = `EWB:${message.eway_bill_number}\nDate:${message.eway_bill_date}\nFrom:${message.place_of_consignor}\nTo:${message.place_of_consignee}`;
      const qrDataURL = await generateQRCode(qrText);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Add content to PDF
      addEWBContent(pdf, message, qrDataURL);

      // Generate blob and create URL
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('EWB Data structure:', ewbData);
      alert(`Failed to generate PDF: ${error.message}. Please check console for details.`);
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  const addEWBContent = (pdf, message, qrDataURL) => {
    const pageWidth = 210;
    const margin = 10;
    let yPos = 15;

    // Helper function to add text
    const addText = (text, x, y, options = {}) => {
      pdf.setFontSize(options.size || 10);
      pdf.setFont(options.font || 'helvetica', options.style || 'normal');
      pdf.text(text, x, y, options.align ? { align: options.align } : {});
    };

    // Helper function to draw line
    const drawLine = (x1, y1, x2, y2, thickness = 0.5) => {
      pdf.setLineWidth(thickness);
      pdf.line(x1, y1, x2, y2);
    };

    // Header - e-Way Bill
    pdf.setFillColor(240, 240, 240);
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    addText('e-Way Bill', pageWidth / 2, 12, { size: 20, style: 'bold', align: 'center' });
    
    // QR Code (top right)
    if (qrDataURL) {
      pdf.addImage(qrDataURL, 'PNG', pageWidth - 35, 5, 25, 25);
    }

    yPos = 20;
    
    // E-way Bill Details
    drawLine(margin, yPos, pageWidth - margin, yPos, 0.5);
    yPos += 5;
    
    addText('E-Way Bill Details', margin, yPos, { size: 11, style: 'bold' });
    yPos += 6;

    addText(`E-way Bill No.: ${message.eway_bill_number || 'N/A'}`, margin, yPos, { size: 10, style: 'bold' });
    addText(`Generated Date: ${formatDate(message.eway_bill_date)}`, pageWidth - margin - 60, yPos);
    yPos += 6;

    addText(`Mode: ${message.generate_mode || 'N/A'}`, margin, yPos);
    addText(`Valid Till: ${formatDate(message.eway_bill_valid_date) || 'N/A'}`, pageWidth - margin - 60, yPos);
    yPos += 6;

    addText(`Document Type: ${message.document_type || 'N/A'}`, margin, yPos);
    addText(`Transaction Type: ${message.transaction_type || 'N/A'}`, pageWidth - margin - 60, yPos);
    yPos += 6;

    addText(`Document No.: ${message.document_number || 'N/A'}`, margin, yPos);
    addText(`Document Date: ${formatDate(message.document_date)}`, pageWidth - margin - 60, yPos);
    yPos += 8;

    // Address Details
    drawLine(margin, yPos, pageWidth - margin, yPos, 1);
    yPos += 5;
    
    addText('Address Details', margin, yPos, { size: 11, style: 'bold' });
    yPos += 6;

    // From Section
    addText('From:', margin, yPos, { size: 10, style: 'bold' });
    yPos += 5;
    
    addText(`GSTIN: ${message.gstin_of_consignor || 'N/A'}`, margin + 5, yPos, { size: 9 });
    yPos += 4;
    
    addText(`Legal Name: ${message.legal_name_of_consignor || 'N/A'}`, margin + 5, yPos, { size: 9 });
    yPos += 4;
    
    const address1Lines = pdf.splitTextToSize(message.address1_of_consignor || 'N/A', 90);
    address1Lines.forEach((line, index) => {
      addText(line, margin + 5, yPos, { size: 9 });
      yPos += 4;
    });
    
    if (message.address2_of_consignor) {
      const address2Lines = pdf.splitTextToSize(message.address2_of_consignor, 90);
      address2Lines.forEach((line) => {
        addText(line, margin + 5, yPos, { size: 9 });
        yPos += 4;
      });
    }
    
    addText(`Place: ${message.place_of_consignor || 'N/A'}, ${message.state_of_consignor || 'N/A'}`, margin + 5, yPos, { size: 9 });
    addText(`PIN: ${message.pincode_of_consignor || 'N/A'}`, margin + 50, yPos, { size: 9 });
    yPos += 6;

    // To Section
    addText('To:', margin, yPos, { size: 10, style: 'bold' });
    yPos += 5;
    
    addText(`GSTIN: ${message.gstin_of_consignee || 'N/A'}`, margin + 5, yPos, { size: 9 });
    yPos += 4;
    
    addText(`Legal Name: ${message.legal_name_of_consignee || 'N/A'}`, margin + 5, yPos, { size: 9 });
    yPos += 4;
    
    const consigneeAddr1Lines = pdf.splitTextToSize(message.address1_of_consignee || 'N/A', 90);
    consigneeAddr1Lines.forEach((line) => {
      addText(line, margin + 5, yPos, { size: 9 });
      yPos += 4;
    });
    
    if (message.address2_of_consignee) {
      const consigneeAddr2Lines = pdf.splitTextToSize(message.address2_of_consignee, 90);
      consigneeAddr2Lines.forEach((line) => {
        addText(line, margin + 5, yPos, { size: 9 });
        yPos += 4;
      });
    }
    
    addText(`Place: ${message.place_of_consignee || 'N/A'}, ${message.actual_to_state_name || 'N/A'}`, margin + 5, yPos, { size: 9 });
    addText(`PIN: ${message.pincode_of_consignee || 'N/A'}`, margin + 50, yPos, { size: 9 });
    yPos += 8;

    // Goods Details
    drawLine(margin, yPos, pageWidth - margin, yPos, 1);
    yPos += 5;
    
    addText('Goods Details', margin, yPos, { size: 11, style: 'bold' });
    yPos += 6;

    // Item List Table Header
    const tableStartY = yPos;
    const colWidths = [10, 25, 65, 20, 20, 25, 25];
    const colX = [margin, margin + 10, margin + 35, margin + 100, margin + 120, margin + 140, margin + 165];
    
    pdf.setFillColor(220, 220, 220);
    pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
    
    addText('#', colX[0], yPos, { size: 8, style: 'bold' });
    addText('HSN', colX[1], yPos, { size: 8, style: 'bold' });
    addText('Description', colX[2], yPos, { size: 8, style: 'bold' });
    addText('Qty', colX[3], yPos, { size: 8, style: 'bold' });
    addText('Unit', colX[4], yPos, { size: 8, style: 'bold' });
    addText('Taxable Amt', colX[5], yPos, { size: 8, style: 'bold' });
    addText('Tax Rate', colX[6], yPos, { size: 8, style: 'bold' });
    
    yPos += 5;
    drawLine(margin, yPos, pageWidth - margin, yPos, 0.5);
    yPos += 4;

    // Item List
    const itemList = message.itemList || [];
    itemList.forEach((item, index) => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }

      addText(item.item_number?.toString() || (index + 1).toString(), colX[0], yPos, { size: 8 });
      addText(item.hsn_code?.toString() || 'N/A', colX[1], yPos, { size: 8 });
      
      const descLines = pdf.splitTextToSize(item.product_description || 'N/A', 60);
      descLines.forEach((line, idx) => {
        addText(line, colX[2], yPos + (idx * 4), { size: 8 });
      });
      
      addText(item.quantity?.toString() || '0', colX[3], yPos, { size: 8 });
      addText(item.unit_of_product || 'PCS', colX[4], yPos, { size: 8 });
      addText(formatCurrency(item.taxable_amount), colX[5], yPos, { size: 8 });
      addText(`${item.cgst_rate + item.sgst_rate || 0}%`, colX[6], yPos, { size: 8 });
      
      yPos += Math.max(4, descLines.length * 4);
      drawLine(margin, yPos, pageWidth - margin, yPos, 0.2);
      yPos += 4;
    });

    yPos += 2;

    // Tax Summary
    drawLine(margin, yPos, pageWidth - margin, yPos, 1);
    yPos += 5;
    
    addText('Tax Summary', margin, yPos, { size: 11, style: 'bold' });
    yPos += 6;

    const taxStartX = pageWidth - margin - 60;
    
    addText('Taxable Amount:', taxStartX - 40, yPos, { size: 9 });
    addText(formatCurrency(message.taxable_amount), taxStartX + 10, yPos, { size: 9, align: 'right' });
    yPos += 5;

    if (message.cgst_amount > 0) {
      addText('CGST:', taxStartX - 40, yPos, { size: 9 });
      addText(formatCurrency(message.cgst_amount), taxStartX + 10, yPos, { size: 9, align: 'right' });
      yPos += 5;
    }

    if (message.sgst_amount > 0) {
      addText('SGST:', taxStartX - 40, yPos, { size: 9 });
      addText(formatCurrency(message.sgst_amount), taxStartX + 10, yPos, { size: 9, align: 'right' });
      yPos += 5;
    }

    if (message.igst_amount > 0) {
      addText('IGST:', taxStartX - 40, yPos, { size: 9 });
      addText(formatCurrency(message.igst_amount), taxStartX + 10, yPos, { size: 9, align: 'right' });
      yPos += 5;
    }

    if (message.cess_amount > 0) {
      addText('Cess:', taxStartX - 40, yPos, { size: 9 });
      addText(formatCurrency(message.cess_amount), taxStartX + 10, yPos, { size: 9, align: 'right' });
      yPos += 5;
    }

    if (message.other_value > 0) {
      addText('Other:', taxStartX - 40, yPos, { size: 9 });
      addText(formatCurrency(message.other_value), taxStartX + 10, yPos, { size: 9, align: 'right' });
      yPos += 5;
    }

    drawLine(taxStartX - 40, yPos, taxStartX + 10, yPos, 0.5);
    yPos += 5;

    addText('Total Invoice Value:', taxStartX - 40, yPos, { size: 10, style: 'bold' });
    addText(formatCurrency(message.total_invoice_value), taxStartX + 10, yPos, { size: 10, style: 'bold', align: 'right' });
    yPos += 8;

    // Transportation Details
    drawLine(margin, yPos, pageWidth - margin, yPos, 1);
    yPos += 5;
    
    addText('Transportation Details', margin, yPos, { size: 11, style: 'bold' });
    yPos += 6;

    addText(`Transporter ID: ${message.transporter_id || 'N/A'}`, margin, yPos, { size: 9 });
    yPos += 5;

    addText(`Transporter Name: ${message.transporter_name || 'N/A'}`, margin, yPos, { size: 9 });
    yPos += 5;

    addText(`Approx Distance: ${message.transportation_distance || 0} KM`, margin, yPos, { size: 9 });
    yPos += 5;

    addText(`Supply Type: ${message.supply_type || 'N/A'}`, margin, yPos, { size: 9 });
    addText(`Sub Supply Type: ${message.sub_supply_type || 'N/A'}`, pageWidth / 2, yPos, { size: 9 });
    yPos += 8;

    // Footer
    yPos = 280;
    drawLine(margin, yPos, pageWidth - margin, yPos, 0.5);
    yPos += 4;
    
    addText('This is a system generated e-Way Bill', pageWidth / 2, yPos, { size: 8, align: 'center', style: 'italic' });
    addText(`Status: ${message.eway_bill_status || 'N/A'}`, margin, yPos, { size: 8 });
    addText(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - margin - 50, yPos, { size: 8 });
  };

  const downloadPDF = async () => {
    if (!pdfUrl) return;
    
    // Extract message same way as generatePDFPreview
    let message;
    if (ewbData.data) {
      if (ewbData.data.data?.results?.message) {
        message = ewbData.data.data.results.message;
      } else if (ewbData.data.results?.message) {
        message = ewbData.data.results.message;
      } else {
        message = ewbData.data;
      }
    } else {
      message = ewbData.message || ewbData;
    }
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `EWB_${message.eway_bill_number || 'document'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    if (!pdfUrl) return;

    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-lg font-semibold text-gray-900">Generating E-Way Bill PDF...</p>
            <p className="mt-2 text-sm text-gray-600">Please wait while we prepare your document</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">E-Way Bill PDF</h2>
            <p className="text-sm text-gray-600 mt-1">
              EWB: {(() => {
                if (ewbData.data) {
                  if (ewbData.data.data?.results?.message?.eway_bill_number) return ewbData.data.data.results.message.eway_bill_number;
                  if (ewbData.data.results?.message?.eway_bill_number) return ewbData.data.results.message.eway_bill_number;
                  if (ewbData.data.eway_bill_number) return ewbData.data.eway_bill_number;
                }
                return ewbData.message?.eway_bill_number || ewbData.eway_bill_number || 'N/A';
              })()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={generatePDFPreview}
              disabled={isGenerating}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-sm"
              title="Refresh PDF"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={downloadPDF}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center gap-2 shadow-sm"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={printPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 shadow-sm"
              title="Print PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="E-Way Bill PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-lg">No PDF available</p>
                <button
                  onClick={generatePDFPreview}
                  className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Generate PDF
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with keyboard shortcuts */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span>Keyboard shortcuts:</span>
              <span className="bg-white px-2 py-1 rounded border border-gray-300 font-mono">Ctrl+P</span>
              <span>Print</span>
            </div>
            <span className="text-gray-500">Generated: {new Date().toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EWBPDFGenerator;
