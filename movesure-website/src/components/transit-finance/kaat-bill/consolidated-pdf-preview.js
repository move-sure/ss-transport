'use client';

import React, { useState } from 'react';
import { X, Download, Loader2, CheckCircle } from 'lucide-react';

export default function ConsolidatedPDFPreview({ 
  isOpen, 
  onClose, 
  pdfUrl, 
  selectedBillsCount,
  totalBilties,
  totalKaatAmount,
  onDownload 
}) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !pdfUrl) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (onDownload) {
        await onDownload();
      } else {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Consolidated_Kaat_Bill_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download PDF: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex items-center justify-center p-1">
      <div className="bg-white rounded-xl shadow-2xl w-[99vw] h-[99vh] flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-xl flex-shrink-0">
          <div className="text-white flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <div>
              <h2 className="text-base font-bold">Consolidated Kaat Bill Preview</h2>
              <p className="text-xs text-white/80">
                {selectedBillsCount} bills • {totalBilties} bilties • ₹{parseFloat(totalKaatAmount || 0).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-1.5 bg-white text-indigo-600 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloading ? 'Downloading...' : 'Download'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors duration-200 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer - Maximized */}
        <div className="flex-1 overflow-hidden bg-gray-200 p-1 min-h-0">
          <iframe
            src={pdfUrl}
            className="w-full h-full rounded bg-white"
            title="Consolidated Kaat Bill PDF Preview"
            style={{ minHeight: '85vh' }}
          />
        </div>
      </div>
    </div>
  );
}
