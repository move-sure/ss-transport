'use client';
import { Package, CheckSquare, Square, Printer, Plus, Loader2 } from 'lucide-react';

export default function ResultsSummaryBar({
  selectedTransport, sbBilties, sbGroupedByChallan, sbTotals,
  selectedGrNos, selectedChallans, selectedCity, fromChallan, toChallan,
  selectAllBilties, deselectAllBilties,
  generating, onPrint, onOpenCreateModal,
}) {
  const { totalPkg, totalWt, totalAmt, totalKaat, totalDD, totalPF } = sbTotals;

  return (
    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl shadow-lg p-4 border border-teal-100">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-teal-600 p-2 rounded-lg">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-800">
              {selectedTransport?.transport_name || 'Results'}
              {selectedTransport?.gst_number && <span className="text-gray-500 font-normal text-sm ml-2">GST: {selectedTransport.gst_number}</span>}
            </div>
            <div className="text-sm text-gray-600">
              {sbBilties.length} bilties in {sbGroupedByChallan.length} challans
              {selectedChallans?.length > 0 && ` | Challans: ${selectedChallans.join(', ')}`}
              {selectedCity && ` | City: ${selectedCity.city_name}`}
              {(fromChallan || toChallan) && ` | Range: ${fromChallan || '...'} → ${toChallan || '...'}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
            <span className="text-gray-500">Pkg:</span> <span className="font-bold text-gray-800">{Math.round(totalPkg)}</span>
          </div>
          <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
            <span className="text-gray-500">Wt:</span> <span className="font-bold text-gray-800">{totalWt.toFixed(1)}</span>
          </div>
          <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
            <span className="text-gray-500">Amt:</span> <span className="font-bold text-gray-800">&#8377;{totalAmt.toFixed(0)}</span>
          </div>
          <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
            <span className="text-gray-500">Kaat:</span> <span className="font-bold text-emerald-700">&#8377;{totalKaat.toFixed(0)}</span>
          </div>
          {totalDD > 0 && (
            <div className="bg-white px-3 py-1.5 rounded-lg border border-red-200">
              <span className="text-gray-500">DD:</span> <span className="font-bold text-red-600">&#8377;{totalDD.toFixed(0)}</span>
            </div>
          )}
          <div className="bg-teal-600 text-white px-3 py-1.5 rounded-lg font-bold">
            PF: &#8377;{totalPF.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Selection Controls & Buttons */}
      <div className="mt-3 pt-3 border-t border-teal-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={selectAllBilties} className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-teal-100 transition-colors">
            <CheckSquare className="w-3.5 h-3.5" /> Select All
          </button>
          <button onClick={deselectAllBilties} className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
            <Square className="w-3.5 h-3.5" /> Deselect All
          </button>
          <span className="text-xs text-gray-500">
            {selectedGrNos.size} of {sbBilties.length} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateModal}
            disabled={selectedGrNos.size === 0}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Pohonch ({selectedGrNos.size})
          </button>
          <button
            onClick={onPrint}
            disabled={selectedGrNos.size === 0 || generating}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {generating ? 'Generating...' : `Print (${selectedGrNos.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
