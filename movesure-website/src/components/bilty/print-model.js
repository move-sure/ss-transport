'use client';

import React, { useEffect, useState } from 'react';
import { Printer, X, FileText, Download } from 'lucide-react';
import PDFGenerator from './pdf-generation';

const PrintModal = ({ 
  isOpen, 
  onClose, 
  onPrint, 
  onSaveOnly,
  biltyData,
  branchData,
  fromCityName,
  toCityName,
  showShortcuts
}) => {
  const [showPDFGenerator, setShowPDFGenerator] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handlePrintPDF();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          onSaveOnly();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onSaveOnly, onClose]);

  const handlePrintPDF = () => {
    setShowPDFGenerator(true);
  };

  const handleWebPrint = () => {
    onPrint(); // This will use the existing web print functionality
  };

  const closePDFGenerator = () => {
    setShowPDFGenerator(false);
    onClose(); // Close the main modal when PDF generator closes
  };

  if (!isOpen) return null;

  // Show PDF Generator if requested
  if (showPDFGenerator) {
    return (
      <PDFGenerator
        biltyData={biltyData}
        branchData={branchData}
        fromCityName={fromCityName}
        toCityName={toCityName}
        onClose={closePDFGenerator}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-blue-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
            <FileText className="w-5 h-5 text-green-600" />
            Bilty Saved Successfully!
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border border-blue-200">
            <div className="text-sm font-bold text-gray-900 mb-2">
              GR Number: <span className="text-blue-600">{biltyData?.gr_no}</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>From:</strong> {biltyData?.consignor_name}</div>
              <div><strong>To:</strong> {biltyData?.consignee_name}</div>
              <div><strong>Route:</strong> {fromCityName} → {toCityName}</div>
              <div><strong>Amount:</strong> <span className="font-bold text-green-600">₹{biltyData?.total}</span></div>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 text-center mb-4">
            Choose your preferred printing option:
          </p>

          {/* Print Options */}
          <div className="grid grid-cols-1 gap-3">
            {/* PDF Download Option */}
            <button
              onClick={handlePrintPDF}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Download className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Generate PDF {showShortcuts && '(Enter)'}</div>
                <div className="text-xs opacity-90">Professional format with QR codes (Recommended)</div>
              </div>
            </button>

            {/* Web Print Option */}
            <button
              onClick={handleWebPrint}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Printer className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Web Print</div>
                <div className="text-xs opacity-90">Browser print (Basic format)</div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSaveOnly}
            className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-md transition-all"
          >
            Save Only {showShortcuts && '(Tab)'}
          </button>
        </div>

        <div className="mt-3 text-center">
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Close {showShortcuts && '(Esc)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;