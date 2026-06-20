'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Printer, Download, RefreshCw, FileText } from 'lucide-react';
import { generateInvoicePDF } from './invoice-pdf';

export default function InvoicePrintModal({ isOpen, onClose, invoiceData }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsMobile(/android|iphone|ipad|ipod|mobile/i.test(ua) || window.innerWidth < 768);
  }, []);

  const generate = useCallback(async () => {
    if (!invoiceData) return;
    setLoading(true);
    try {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const pdf = await generateInvoicePDF(invoiceData);
      const blob = pdf.output('blob');
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setLoading(false);
    }
  }, [invoiceData]);

  useEffect(() => {
    if (isOpen && invoiceData) generate();
    if (!isOpen) { if (pdfUrl) URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
  }, [isOpen, invoiceData]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Enter' && pdfUrl) { e.preventDefault(); printPDF(); }
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.ctrlKey && e.key === 'p' && pdfUrl) { e.preventDefault(); printPDF(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, pdfUrl, onClose]);

  const printPDF = () => {
    if (!pdfUrl) return;
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.src = pdfUrl;
    document.body.appendChild(frame);
    frame.onload = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => document.body.removeChild(frame), 1000);
      } catch {
        window.open(pdfUrl, '_blank');
        document.body.removeChild(frame);
      }
    };
  };

  const downloadPDF = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `Invoice_${invoiceData?.invoice_no || 'download'}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      {/* Header bar */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Invoice Preview</p>
            <p className="text-xs opacity-80">{invoiceData?.invoice_no || '—'} · {invoiceData?.buyer_name || ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={downloadPDF} disabled={!pdfUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <button onClick={printPDF} disabled={!pdfUrl}
            className="flex items-center gap-2 px-4 py-1.5 bg-white text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 shadow-sm">
            <Printer className="h-4 w-4" />
            Print (Enter)
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors ml-1">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* PDF viewer */}
      <div className="flex-1 overflow-auto bg-gray-700 flex items-start justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-white">
            <RefreshCw className="h-10 w-10 animate-spin text-blue-300" />
            <p className="text-sm font-medium">Generating invoice PDF...</p>
          </div>
        ) : pdfUrl ? (
          isMobile ? (
            <div className="text-center text-white mt-16 space-y-4">
              <FileText className="h-16 w-16 mx-auto text-blue-300" />
              <p className="text-lg font-semibold">PDF Ready</p>
              <p className="text-sm opacity-70">PDF preview is not supported on mobile.<br />Use the buttons below.</p>
              <div className="flex gap-3 justify-center mt-6">
                <button onClick={downloadPDF}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm">
                  <Download className="h-4 w-4" /> Download PDF
                </button>
                <button onClick={printPDF}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-blue-700 rounded-xl font-bold text-sm">
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              className="w-full max-w-4xl shadow-2xl rounded-sm"
              style={{ height: 'calc(100vh - 64px)', border: 'none' }}
              title="Invoice PDF Preview"
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-300">
            <FileText className="h-12 w-12 text-gray-500" />
            <p className="text-sm">No PDF generated yet</p>
            <button onClick={generate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
              Generate PDF
            </button>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {pdfUrl && !loading && (
        <div className="flex-shrink-0 bg-gray-900 text-gray-400 text-xs text-center py-2">
          Press <kbd className="bg-gray-700 text-white px-1.5 py-0.5 rounded text-xs mx-1">Enter</kbd> to print ·
          Press <kbd className="bg-gray-700 text-white px-1.5 py-0.5 rounded text-xs mx-1">Esc</kbd> to close
        </div>
      )}
    </div>
  );
}
