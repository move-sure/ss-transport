'use client';

import React, { useEffect, useState } from 'react';
import { Printer, X, FileText, Save } from 'lucide-react';
import PDFGenerator from './pdf-generation';

const PrintModal = ({ 
  isOpen, 
  onClose, 
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
          handlePrint();
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

  const handlePrint = () => {
    setShowPDFGenerator(true);
  };

  const closePDFGenerator = () => {
    setShowPDFGenerator(false);
    onClose();
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200">
        {/* Header with movesure.io branding */}
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-black mb-2">movesure.io</div>
          <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-blue-500 mx-auto rounded-full"></div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-3 text-black">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Bilty Saved Successfully!
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-8">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6 border border-purple-200">
            <div className="text-lg font-bold text-black mb-3 text-center">
              GR Number: <span className="text-purple-600">{biltyData?.gr_no}</span>
            </div>
            <div className="text-sm text-gray-700 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">From:</span> 
                <span className="text-black">{biltyData?.consignor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">To:</span> 
                <span className="text-black">{biltyData?.consignee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Route:</span> 
                <span className="text-black">{fromCityName} → {toCityName}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-3">
                <span className="font-bold">Total Amount:</span> 
                <span className="font-bold text-purple-600 text-lg">₹{biltyData?.total}</span>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 text-center mb-6 text-sm">
            Choose an action for your bilty document
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-4">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-4 rounded-xl hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-purple-300 flex items-center justify-center gap-3 shadow-lg transition-all transform hover:scale-[1.02] font-semibold"
            >
              <Printer className="w-6 h-6" />
              <div>
                <div className="text-lg">Print Bilty {showShortcuts && '(Enter)'}</div>
                <div className="text-xs opacity-90">Generate & Download PDF</div>
              </div>
            </button>

            {/* Save Only Button */}
            <button
              onClick={onSaveOnly}
              className="w-full bg-white border-2 border-purple-600 text-purple-600 px-6 py-4 rounded-xl hover:bg-purple-50 focus:outline-none focus:ring-4 focus:ring-purple-300 flex items-center justify-center gap-3 shadow-md transition-all transform hover:scale-[1.02] font-semibold"
            >
              <Save className="w-6 h-6" />
              <div>
                <div className="text-lg">Save Only {showShortcuts && '(Tab)'}</div>
                <div className="text-xs opacity-70">Save without printing</div>
              </div>
            </button>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-black transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Close {showShortcuts && '(Esc)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;