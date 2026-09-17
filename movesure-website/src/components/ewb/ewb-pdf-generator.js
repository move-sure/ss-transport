'use client';

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { X, Printer, Download, RefreshCw } from 'lucide-react';
import { generateQRCode, addEWBContent, extractEwbMessage } from './ewb-pdf-content';

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
      const message = extractEwbMessage(ewbData);

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

  const downloadPDF = async () => {
    if (!pdfUrl) return;
    
    const message = extractEwbMessage(ewbData);

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
              EWB: {extractEwbMessage(ewbData)?.eway_bill_number || 'N/A'}
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
