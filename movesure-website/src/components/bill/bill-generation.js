'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import { generatePortraitBillPDF } from './portrait-bill-generator';
import { generateLandscapeBillPDF } from './landscape-bill-generator';

const BillGenerator = ({ selectedBilties = [], onClose, cities = [], filterDates = null, billOptions = null }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  // Format currency helper for display
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '0';
    const num = Math.round(parseFloat(amount));
    return num.toString();
  };

  // Calculate totals for display
  const calculateTotals = () => {
    let totalAmount = 0;
    let paidAmount = 0;
    let toPayAmount = 0;

    selectedBilties.forEach(bilty => {
      const amount = parseFloat(bilty.total || bilty.amount || 0);
      totalAmount += amount;
      
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
      if (!selectedBilties || selectedBilties.length === 0) {
        throw new Error('No bilties selected for PDF generation');
      }

      console.log('Starting PDF generation for bilties:', selectedBilties.length);
      
      // Check template selection
      const template = billOptions?.printTemplate || 'portrait';
      
      let url;
      if (template === 'landscape') {
        url = await generateLandscapeBillPDF(selectedBilties, cities, filterDates, billOptions);
      } else {
        url = await generatePortraitBillPDF(selectedBilties, cities, filterDates, billOptions);
      }
      
      setPdfUrl(url);
      console.log('PDF generated successfully!');
      
    } catch (error) {
      console.error('Detailed error in PDF generation:', error);
      alert('Error generating PDF: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfUrl) return;
    
    const firstBilty = selectedBilties[0];
    const consignorName = firstBilty?.type === 'station' ? 
      (firstBilty.consignor || 'Unknown') : 
      (firstBilty.consignor_name || 'Unknown');
    
    const cleanConsignorName = consignorName.replace(/[^a-zA-Z0-9]/g, '_');
    const currentDate = new Date().toISOString().slice(0, 10);
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${cleanConsignorName}_${currentDate}_Statement.pdf`;
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

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const { totalAmount, paidAmount, toPayAmount } = calculateTotals();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between shadow-lg">
          <div>
            <h2 className="text-2xl font-bold">Bill Generation</h2>
            <p className="text-sm text-blue-100 mt-1">
              Generating bill for {selectedBilties.length} bilty/bilties
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-lg font-medium text-gray-700">Generating PDF...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we create your bill</p>
          </div>
        )}

        {/* Content */}
        {!isGenerating && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Stats Bar */}
            <div className="flex-shrink-0 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-300">
              <div className="px-6 py-4">
                <div className="grid grid-cols-3 gap-4">
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
            </div>

            {/* PDF Preview */}
            {pdfUrl && (
              <div className="flex-1 bg-gray-100">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title="Monthly Consignment Statement Preview"
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
                    onClick={printPDF}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Printer className="h-5 w-5" />
                    <span className="font-medium">Print Statement</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillGenerator;
