'use client';

/**
 * Shared Cross Challan Print Modal + Hook
 * 
 * Single print component for cross challan (pohonch) printing that:
 * - Always fetches fresh data from bilty_wise_kaat + bilty + station tables
 * - Updates pohonch metadata to stay in sync
 * - Provides PDF preview with download
 * 
 * Used by: hub management, cross-challan-list, recent-pohonch
 */

import React, { useState, useCallback } from 'react';
import { Loader2, FileText, X, Printer } from 'lucide-react';
import { generatePohonchPDF, generateCombinedPohonchPDF } from './pohonch-pdf-generator';
import { fetchFreshCrossChallanData } from './cross-challan-print-utils';

/**
 * Hook for cross challan printing functionality.
 * Returns state and handlers that can be wired to print buttons and the modal.
 * 
 * @param {Object} options
 * @param {Function} options.onDataRefreshed - Optional callback (pohonchNumber, updatedPohonch) => void
 *   Called after fresh data is fetched, so parent can update its local state
 */
export function useCrossChallanPrint({ onDataRefreshed } = {}) {
  const [printingPohonch, setPrintingPohonch] = useState(null);
  const [printingBatch, setPrintingBatch] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState(null);
  const [previewBatch, setPreviewBatch] = useState(null); // array of pohonch numbers when previewing a combined PDF

  const handlePrint = useCallback(async (pohonchNumber) => {
    if (!pohonchNumber) return;
    try {
      setPrintingPohonch(pohonchNumber);

      const { pohonch, bilties, transport } = await fetchFreshCrossChallanData(pohonchNumber);

      const url = generatePohonchPDF(bilties, transport, true, pohonchNumber);
      if (url) {
        setPreviewUrl(url);
        setPreviewName(pohonchNumber);
        setPreviewBatch(null);
      }

      // Notify parent so it can update local state with refreshed data
      if (onDataRefreshed) {
        onDataRefreshed(pohonchNumber, pohonch);
      }
    } catch (err) {
      alert(err.message || 'Failed to generate PDF');
    } finally {
      setPrintingPohonch(null);
    }
  }, [onDataRefreshed]);

  /**
   * Generate ONE combined PDF containing every selected pohonch's crossing challan,
   * in the order given, then preview it.
   */
  const handlePrintMultiple = useCallback(async (pohonchNumbers) => {
    const numbers = (pohonchNumbers || []).filter(Boolean);
    if (numbers.length === 0) return;

    if (numbers.length === 1) {
      return handlePrint(numbers[0]);
    }

    try {
      setPrintingBatch(true);
      const entries = [];
      for (const num of numbers) {
        const { pohonch, bilties, transport } = await fetchFreshCrossChallanData(num);
        entries.push({ bilties, transport, pohonchNumber: num });
        if (onDataRefreshed) onDataRefreshed(num, pohonch);
      }

      const url = generateCombinedPohonchPDF(entries, true);
      if (url) {
        setPreviewUrl(url);
        setPreviewName(`${numbers.length} Pohonch (Combined)`);
        setPreviewBatch(numbers);
      }
    } catch (err) {
      alert(err.message || 'Failed to generate combined PDF');
    } finally {
      setPrintingBatch(false);
    }
  }, [onDataRefreshed, handlePrint]);

  const handleDownload = useCallback(async () => {
    if (!previewName) return;
    try {
      if (previewBatch && previewBatch.length > 0) {
        const entries = [];
        for (const num of previewBatch) {
          const { bilties, transport } = await fetchFreshCrossChallanData(num);
          entries.push({ bilties, transport, pohonchNumber: num });
        }
        generateCombinedPohonchPDF(entries, false);
        return;
      }
      // Fetch fresh again for download to ensure latest data
      const { bilties, transport } = await fetchFreshCrossChallanData(previewName);
      generatePohonchPDF(bilties, transport, false, previewName);
    } catch (err) {
      alert('Download failed: ' + (err.message || 'Unknown error'));
    }
  }, [previewName, previewBatch]);

  const handleClose = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewName(null);
    setPreviewBatch(null);
  }, [previewUrl]);

  return {
    printingPohonch,
    printingBatch,
    previewUrl,
    previewName,
    handlePrint,
    handlePrintMultiple,
    handleDownload,
    handleClose,
  };
}

/**
 * Cross Challan PDF Preview Modal
 * 
 * Renders the print preview modal. Simply pass the values from useCrossChallanPrint hook.
 */
export default function CrossChallanPrintModal({
  previewUrl,
  previewName,
  onDownload,
  onClose,
}) {
  if (!previewUrl || !previewName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-100 rounded-xl">
              <FileText className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Crossing Challan: {previewName}</h3>
              <p className="text-[10px] text-gray-500">PDF Preview — showing latest data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold rounded-lg hover:from-violet-600 hover:to-purple-700 shadow-sm transition-all"
            >
              <Printer className="h-3 w-3" /> Download PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden p-4 bg-gray-100">
          <iframe
            src={previewUrl}
            className="w-full h-full rounded-lg border border-gray-200"
            title="Cross Challan PDF Preview"
          />
        </div>
      </div>
    </div>
  );
}
