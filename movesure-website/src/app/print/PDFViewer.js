'use client';

import React, { useState } from 'react';
import { Globe, FileText, Printer } from 'lucide-react';
import { usePDFGenerator } from './usePDFGenerator';
import PrintHeader from './components/PrintHeader';
import PrintDetailsGrid from './components/PrintDetailsGrid';

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
  const {
    pdfUrl,
    loading,
    isGenerating,
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
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2">
            <button
              onClick={printPDF}
              disabled={!pdfReady || isGenerating}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-opacity-60"
            >
              <Printer className="h-5 w-5" />
              {isGenerating ? t('generating') : t('print')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
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
    </div>
  );
};

export default PDFViewer;
