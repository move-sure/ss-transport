'use client';

import { useState, useCallback } from 'react';
import { X, Download, Loader2, Printer, Maximize2, Minimize2, FileText } from 'lucide-react';

export default function KaatPDFPreview({ isOpen, onClose, pdfUrl, filename }) {
  const [downloading, setDownloading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = filename || 'kaat-rates.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handleOpenNewTab = () => {
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-md flex items-center justify-center">
      <div className={`bg-white shadow-2xl flex flex-col transition-all duration-300 ${
        fullscreen
          ? 'w-full h-full rounded-none'
          : 'w-[95vw] max-w-7xl h-[92vh] rounded-2xl m-4'
      }`}>

        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 shrink-0">

          {/* Left: Title + icon */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-teal-800 to-emerald-700 bg-clip-text text-transparent leading-tight">
                Kaat Rate PDF Preview
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Review before downloading • Landscape A4
              </p>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            {/* Fullscreen toggle */}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-teal-700 bg-white hover:bg-teal-50 rounded-lg border border-gray-200 hover:border-teal-300 transition-all duration-200"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-700 bg-white hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200"
              title="Print PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloading ? 'Saving...' : 'Download'}</span>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-200 mx-1" />

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors duration-200 text-gray-400 hover:text-red-600"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-200/60 p-3">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg shadow-inner bg-white border border-gray-300"
              title="Kaat Rate PDF Preview"
              style={{ minHeight: '400px' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading PDF...</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-between px-5 py-2 border-t border-gray-100 bg-gray-50/80 text-xs text-gray-400 shrink-0">
          <span>Kaat Rate List • SS Transport Corporation</span>
          <button
            onClick={handleOpenNewTab}
            className="text-teal-600 hover:text-teal-800 hover:underline transition-colors cursor-pointer"
          >
            Open in new tab ↗
          </button>
        </div>
      </div>
    </div>
  );
}
