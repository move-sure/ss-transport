'use client';

import { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';

export default function KaatPDFPreview({ isOpen, onClose, pdfUrl, filename }) {
  const [downloading, setDownloading] = useState(false);

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
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-900 to-teal-800 bg-clip-text text-transparent">
              PDF Preview
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Review your Kaat Rates PDF before downloading
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors duration-200 text-gray-600 hover:text-red-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100 p-4">
          <iframe
            src={pdfUrl}
            className="w-full h-full rounded-lg shadow-lg bg-white"
            title="PDF Preview"
          />
        </div>
      </div>
    </div>
  );
}
