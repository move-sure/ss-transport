'use client';

import React, { useState } from 'react';
import { Search, SlidersHorizontal, Download, Copy, Printer, X, AlertCircle } from 'lucide-react';

export default function BillSearchHeader({ 
  onToggleFilters, 
  showFilters, 
  totalResults, 
  loading,
  hasSearched,
  onDownloadCSV,
  onCopyToClipboard,
  onPrintBilties,
  selectedBiltiesCount = 0
}) {
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Bill Search
            </h1>
          </div>
          
          {!loading && hasSearched && totalResults !== undefined && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                {totalResults} Results
              </span>
              {selectedBiltiesCount > 0 && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                  {selectedBiltiesCount} Selected
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {hasSearched && totalResults > 0 && (
            <>
              <button
                onClick={onPrintBilties}
                disabled={selectedBiltiesCount === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  selectedBiltiesCount > 0 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={selectedBiltiesCount > 0 ? `Print ${selectedBiltiesCount} selected bilties` : "Select bilties to print"}
              >
                <Printer className="h-4 w-4" />
                <span className="font-medium">
                  {selectedBiltiesCount > 0 ? `Print Selected (${selectedBiltiesCount})` : 'Print Bilties'}
                </span>
              </button>
              
              <button
                onClick={() => setShowBlockedModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                title={selectedBiltiesCount > 0 ? `Download ${selectedBiltiesCount} selected bilties as CSV` : "Download all results as CSV"}
              >
                <Download className="h-4 w-4" />
                <span className="font-medium">
                  {selectedBiltiesCount > 0 ? `Download Selected (${selectedBiltiesCount})` : 'Download CSV'}
                </span>
              </button>
              
              <button
                onClick={() => setShowBlockedModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                title={selectedBiltiesCount > 0 ? `Copy ${selectedBiltiesCount} selected bilties to clipboard` : "Copy all results to clipboard"}
              >
                <Copy className="h-4 w-4" />
                <span className="font-medium">
                  {selectedBiltiesCount > 0 ? `Copy Selected (${selectedBiltiesCount})` : 'Copy'}
                </span>
              </button>
            </>
          )}
          
          <button
            onClick={onToggleFilters}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              showFilters 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-medium">
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Searching...</span>
        </div>
      )}

      {/* Blocked Export Modal */}
      {showBlockedModal && (
        <div className="fixed inset-0 backdrop-blur-md backdrop-saturate-150 bg-slate-900/20 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-lg w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_45px_rgba(15,23,42,0.25)] border border-white/40 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="absolute inset-x-6 -top-2 h-1 rounded-full bg-gradient-to-r from-orange-400 via-rose-500 to-purple-500" aria-hidden="true"></div>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-rose-500 rounded-t-3xl p-6 pb-8 relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Service Blocked</h2>
                  <p className="text-orange-100 text-sm">सेवा बंद कर दी गई है</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* English Message */}
              <div className="bg-gradient-to-br from-orange-50 via-rose-50 to-white border border-orange-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">🇬🇧</span>
                  English
                </h3>
                <p className="text-orange-800 leading-relaxed text-[15px]">
                  Please contact <span className="font-bold text-red-600">EKLAVYA SINGH</span> for more information. 
                  This export/copy service has been temporarily disabled. Please use the <span className="font-semibold">Bill Search</span> feature for generating bills.
                </p>
              </div>

              {/* Hindi Message */}
              <div className="bg-gradient-to-br from-sky-50 via-indigo-50 to-white border border-sky-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">🇮🇳</span>
                  हिंदी
                </h3>
                <p className="text-blue-800 leading-relaxed text-[15px]">
                  कृपया अधिक जानकारी के लिए <span className="font-bold text-red-600">EKLAVYA SINGH</span> से संपर्क करें। 
                  यह एक्सपोर्ट/कॉपी सेवा अस्थायी रूप से बंद कर दी गई है। कृपया बिल बनाने के लिए <span className="font-semibold">बिल सर्च</span> सुविधा का उपयोग करें।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBlockedModal(false)}
                  className="flex-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:shadow-[0_15px_35px_rgba(79,70,229,0.35)] text-white font-semibold py-3.5 px-6 rounded-2xl transition-all"
                >
                  समझ गया / Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
