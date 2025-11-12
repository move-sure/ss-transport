'use client';

import React from 'react';
import { FileText, Download, Printer, X } from 'lucide-react';

const PrintPDFModal = ({ isOpen, pdfUrl, onClose, downloadPDF, printPDF, t }) => {
  if (!isOpen || !pdfUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-2 sm:p-4">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:h-[90vh]">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-slate-900">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold sm:text-lg">{t('biltyPreview')}</h3>
              <p className="text-xs text-slate-500 sm:text-sm">{t('previewHelperText')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 bg-slate-100">
          <iframe src={pdfUrl} title="Bilty PDF" className="h-full w-full" />
        </div>

        <footer className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6">
          <button
            onClick={downloadPDF}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <Download className="h-4 w-4" />
            {t('download')}
          </button>
          <button
            onClick={printPDF}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50"
          >
            <Printer className="h-4 w-4" />
            {t('print')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PrintPDFModal;
