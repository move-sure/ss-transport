'use client';

import React, { useEffect, useRef } from 'react';
import { Download, X, RefreshCw, Printer, FileText, Eye, Package, DollarSign, TruckIcon } from 'lucide-react';

const PDFViewerUI = ({
  biltyData,
  fromCityData,
  toCityData,
  pdfUrl,
  loading,
  isGenerating,
  onClose,
  onRefresh,
  onPrint,
  onDownload,
  isMobile = false
}) => {
  const printButtonRef = useRef(null);

  // Auto-focus print button when modal opens
  useEffect(() => {
    if (printButtonRef.current && pdfUrl) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        printButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pdfUrl]);

  // Handle keyboard events - Tab and Enter both trigger print
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If Tab is pressed and Print button is focused, trigger print
      if (e.key === 'Tab' && document.activeElement === printButtonRef.current && pdfUrl) {
        e.preventDefault();
        onPrint();
      }
      // Enter key will work naturally with button focus
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pdfUrl, onPrint]);
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex flex-col z-50">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Bilty PDF</h3>
                <p className="text-xs text-indigo-100">GR: {biltyData.gr_no}</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              disabled={isGenerating}
              className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={onDownload}
              disabled={!pdfUrl}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        {/* Mobile PDF Viewer */}
        <div className="flex-1 bg-gray-100 overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#zoom=100`}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center">
                <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-indigo-600" />
                </div>
                <div className="text-lg font-bold text-gray-800 mb-2">
                  {isGenerating ? 'Generating PDF...' : 'PDF Preview'}
                </div>
                <div className="text-sm text-gray-600">
                  {isGenerating ? 'Please wait...' : 'Click refresh to generate'}
                </div>
                {isGenerating && (
                  <div className="mt-4">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop UI
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-gray-900/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  Bilty Document
                  <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-mono">
                    {biltyData.gr_no}
                  </span>
                </h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-indigo-100">
                  <span className="flex items-center gap-1">
                    <TruckIcon className="w-4 h-4" />
                    {fromCityData?.city_name || 'N/A'} → {toCityData?.city_name || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    ₹{biltyData.total?.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    {biltyData.no_of_pkg || 0} Pkg
                  </span>
                </div>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                disabled={isGenerating}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2 border border-white/20"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Refresh'}</span>
              </button>
              
              <button
                ref={printButtonRef}
                onClick={onPrint}
                disabled={!pdfUrl}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:bg-gray-400 flex items-center gap-2 shadow-lg focus:ring-4 focus:ring-green-300 focus:outline-none"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
              
              <button
                onClick={onDownload}
                disabled={!pdfUrl}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:bg-gray-400 flex items-center gap-2 shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
              
              <button
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white p-2 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden bg-gray-50">
          
          {/* Left Sidebar - Document Info */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-4">
              
              {/* Document Status */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${pdfUrl ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`}></div>
                  <h4 className="font-bold text-gray-800">Document Status</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-semibold ${pdfUrl ? 'text-green-600' : 'text-orange-600'}`}>
                      {pdfUrl ? '✓ Ready' : isGenerating ? 'Generating...' : 'Not Generated'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-semibold text-gray-800">
                      {new Date(biltyData.bilty_date).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Consignor & Consignee */}
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                    Consignor (From)
                  </div>
                  <div className="font-bold text-sm text-gray-900 mb-1 truncate">
                    {biltyData.consignor_name || 'N/A'}
                  </div>
                  {biltyData.consignor_number && (
                    <div className="text-xs text-gray-600">📱 {biltyData.consignor_number}</div>
                  )}
                  {biltyData.consignor_gst && (
                    <div className="text-xs text-gray-500 truncate">GST: {biltyData.consignor_gst}</div>
                  )}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                    Consignee (To)
                  </div>
                  <div className="font-bold text-sm text-gray-900 mb-1 truncate">
                    {biltyData.consignee_name || 'N/A'}
                  </div>
                  {biltyData.consignee_number && (
                    <div className="text-xs text-gray-600">📱 {biltyData.consignee_number}</div>
                  )}
                  {biltyData.consignee_gst && (
                    <div className="text-xs text-gray-500 truncate">GST: {biltyData.consignee_gst}</div>
                  )}
                </div>
              </div>

              {/* Package Details */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">
                  Package Information
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Packages</div>
                    <div className="font-bold text-lg text-purple-600">{biltyData.no_of_pkg || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Weight</div>
                    <div className="font-bold text-lg text-purple-600">{biltyData.wt || 0} kg</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Rate</div>
                    <div className="font-bold text-lg text-purple-600">₹{biltyData.rate || 0}</div>
                  </div>
                </div>
                {biltyData.contain && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <div className="text-xs text-gray-600 mb-1">Contents</div>
                    <div className="text-sm font-medium text-gray-800">{biltyData.contain}</div>
                  </div>
                )}
              </div>

              {/* Charges Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                  Charges Breakdown
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Freight</span>
                    <span className="font-semibold">₹{biltyData.freight_amount || 0}</span>
                  </div>
                  {biltyData.labour_charge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Labour</span>
                      <span className="font-semibold">₹{biltyData.labour_charge}</span>
                    </div>
                  )}
                  {biltyData.bill_charge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bill Charge</span>
                      <span className="font-semibold">₹{biltyData.bill_charge}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 mt-2 border-t-2 border-indigo-200">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-indigo-600 text-lg">₹{biltyData.total || 0}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className={`rounded-lg p-3 ${
                biltyData.payment_mode?.toLowerCase() === 'paid' 
                  ? 'bg-green-100 border border-green-300' 
                  : 'bg-orange-100 border border-orange-300'
              }`}>
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-600 mb-1">Payment Status</div>
                  <div className={`text-lg font-bold ${
                    biltyData.payment_mode?.toLowerCase() === 'paid' ? 'text-green-700' : 'text-orange-700'
                  }`}>
                    {biltyData.payment_mode?.toUpperCase() || 'TO PAY'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - PDF Preview */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 m-4 bg-white border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg">
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#zoom=110`}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="text-center p-8">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <FileText className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                      {isGenerating ? 'Generating Your Document...' : 'PDF Preview'}
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {isGenerating 
                        ? 'Please wait while we prepare your bilty document with all the details.'
                        : 'Click the refresh button above to generate and preview your bilty document.'
                      }
                    </p>
                    {isGenerating && (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-indigo-600 font-semibold text-lg">Generating...</span>
                      </div>
                    )}
                    {!isGenerating && (
                      <button
                        onClick={onRefresh}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2 mx-auto shadow-lg"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Generate PDF Now
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${pdfUrl ? 'bg-green-500' : 'bg-orange-500'} animate-pulse shadow-lg`}></div>
                <span className="font-semibold text-gray-700">
                  {pdfUrl ? 'Document Ready' : isGenerating ? 'Generating...' : 'Not Generated'}
                </span>
              </div>
              <span className="text-gray-600">
                <span className="font-medium">GR:</span> {biltyData.gr_no}
              </span>
              <span className="text-gray-600">
                <span className="font-medium">Amount:</span> ₹{biltyData.total?.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono">Ctrl+P</kbd>
                Browser print
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono">Enter</kbd>
                Direct PDF print
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewerUI;
