'use client';
import { X, Save, Check, Printer, Loader2 } from 'lucide-react';

export default function PdfPreviewModal({
  show, pdfUrl, onClose, onDownload, onSave,
  saving, lastSavedPohonch, selectedGrNos,
}) {
  if (!show || !pdfUrl) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-emerald-50">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Pohonch Print Preview</h3>
            <p className="text-sm text-gray-500">
              {selectedGrNos.size} bilties selected
              {lastSavedPohonch && (
                <span className="ml-2 inline-flex items-center gap-1 text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full text-xs">
                  <Save className="w-3 h-3" /> Saved as {lastSavedPohonch.pohonch_number}
                </span>
              )}
              {saving && <span className="ml-2 text-amber-600 text-xs"><Loader2 className="w-3 h-3 inline animate-spin mr-1" />Saving...</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSave}
              disabled={saving || !!lastSavedPohonch}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
                lastSavedPohonch ? 'bg-green-100 text-green-700 cursor-default' : saving ? 'bg-amber-100 text-amber-700 cursor-wait' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
              }`}
            >
              {lastSavedPohonch ? (
                <><Check className="w-4 h-4" /> Saved ({lastSavedPohonch.pohonch_number})</>
              ) : saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Save Pohonch</>
              )}
            </button>
            <button
              onClick={onDownload}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Download PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        {/* PDF Viewer */}
        <div className="flex-1 p-4 bg-gray-100">
          <iframe src={pdfUrl} className="w-full h-full rounded-lg border border-gray-200" title="Pohonch Print Preview" />
        </div>
      </div>
    </div>
  );
}
