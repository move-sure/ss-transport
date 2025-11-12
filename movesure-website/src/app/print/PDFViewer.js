'use client';

import React, { useState } from 'react';
import { Globe, FileText, Download, Printer, RefreshCw } from 'lucide-react';
import { usePDFGenerator } from './usePDFGenerator';
import PrintHeader from './components/PrintHeader';
import PrintDetailsGrid from './components/PrintDetailsGrid';
import PrintPDFModal from './components/PrintPDFModal';

const LoadingState = ({ t }) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
    <div className="rounded-2xl border border-indigo-100 bg-white px-10 py-12 text-center shadow-2xl">
      <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      <h3 className="text-2xl font-semibold text-slate-900">{t('generatingPDF')}</h3>
      <p className="mt-2 text-sm text-slate-500">{t('pleaseWait')}</p>
    </div>
  </div>
);

const PDFViewer = ({
  biltyData,
  branchData,
  fromCityName,
  toCityName,
  language,
  toggleLanguage,
  t
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    pdfUrl,
    loading,
    isGenerating,
    loadAllDataAndGeneratePreview,
    downloadPDF,
    printPDF
  } = usePDFGenerator(biltyData, branchData);

  const pdfReady = Boolean(pdfUrl);

  if (loading) {
    return <LoadingState t={t} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{t('biltyDetails')}</h1>
              <p className="text-xs text-slate-500 sm:text-sm">GR: SSTC-2025-26-{biltyData?.gr_no || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'en' ? 'हिंदी' : 'English'}</span>
            </button>
          </div>
        </div>

        {/* Action Bar in Header */}
        <div className="border-t border-slate-200 bg-slate-50/50 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600 sm:text-sm">
              {t('actionHelperText')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadAllDataAndGeneratePreview}
                disabled={isGenerating}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {isGenerating ? t('generating') : t('refreshPreview')}
              </button>

              <button
                onClick={downloadPDF}
                disabled={!pdfReady || isGenerating}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                <Download className="h-3.5 w-3.5" />
                {t('download')}
              </button>

              <button
                onClick={printPDF}
                disabled={!pdfReady || isGenerating}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                <Printer className="h-3.5 w-3.5" />
                {t('print')}
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                disabled={!pdfReady || isGenerating}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-opacity-60 sm:text-sm"
              >
                <FileText className="h-3.5 w-3.5" />
                Fullscreen
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
        {/* PDF Preview - Always visible */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
              {t('biltyPreview')}
            </h2>
            <p className="text-xs text-slate-500">{t('previewHelperText')}</p>
          </div>
          <div className="bg-slate-100">
            {pdfReady ? (
              <iframe
                src={pdfUrl}
                className="mx-auto h-[360px] w-full max-w-5xl rounded-b-2xl border-0 sm:h-[420px] lg:h-[480px]"
                title="Bilty PDF Preview"
              />
            ) : (
              <div className="flex h-[360px] items-center justify-center sm:h-[420px] lg:h-[480px]">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                  <p className="text-sm text-slate-600">{t('generatingPDF')}...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <PrintHeader
            biltyData={biltyData}
            branchData={branchData}
            fromCityName={fromCityName}
            toCityName={toCityName}
            t={t}
          />

          <PrintDetailsGrid biltyData={biltyData} toCityName={toCityName} t={t} />
        </div>
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-white/90">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col items-center gap-2 text-center text-sm text-slate-600 sm:flex-row sm:justify-between">
            <div>
              <p className="text-base font-semibold text-slate-900 sm:text-lg">S. S. Transport Corporation</p>
              <p className="text-xs text-slate-500 sm:text-sm">{t('reliableTransport')}</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-indigo-600 sm:text-sm">
              <a
                href="https://www.movesure.io"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:underline"
              >
                www.movesure.io
              </a>
              <span>•</span>
              <a href="tel:7668291228" className="transition hover:underline">
                {t('customerCare')}: 7668291228
              </a>
            </div>
          </div>
        </div>
      </footer>

      <PrintPDFModal
        isOpen={isModalOpen}
        pdfUrl={pdfUrl}
        onClose={() => setIsModalOpen(false)}
        downloadPDF={downloadPDF}
        printPDF={printPDF}
        t={t}
      />
    </div>
  );
};

export default PDFViewer;
