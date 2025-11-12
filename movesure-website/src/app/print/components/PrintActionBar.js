'use client';

import React from 'react';
import { FileText, Download, Printer, RefreshCw } from 'lucide-react';

const PrintActionBar = ({
  onOpenPreview,
  downloadPDF,
  printPDF,
  regeneratePreview,
  pdfReady,
  isGenerating,
  t
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{t('quickActions')}</h3>
          <p className="text-xs text-slate-500 sm:text-sm">{t('actionHelperText')}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <button
            onClick={regeneratePreview}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            {isGenerating ? t('generating') : t('refreshPreview')}
          </button>

          <button
            onClick={onOpenPreview}
            disabled={!pdfReady || isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-opacity-60"
          >
            <FileText className="h-4 w-4" />
            {t('viewPDF')}
          </button>

          <button
            onClick={downloadPDF}
            disabled={!pdfReady || isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {t('download')}
          </button>

          <button
            onClick={printPDF}
            disabled={!pdfReady || isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            {t('print')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintActionBar;
