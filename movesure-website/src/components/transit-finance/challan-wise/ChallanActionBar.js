'use client';

import React from 'react';
import { Zap, Save, Layers, XCircle, FileText, Loader2 } from 'lucide-react';

export default function ChallanActionBar({
  editMode,
  selectedBiltiesCount,
  autoApplyingKaat,
  savingKaatBill,
  onAutoKaatAll,
  onAutoKaatSelected,
  onSaveKaatBill,
  onBulkCreate,
  onCancelEdit,
  onViewKaatBills,
  challanTransitsCount,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-2.5 mb-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <span className="bg-gray-100 px-2 py-0.5 rounded-full">{challanTransitsCount} total bilties</span>
          {selectedBiltiesCount > 0 && (
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
              {selectedBiltiesCount} selected
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          {!editMode && (
            <>
              <button
                onClick={onAutoKaatAll}
                disabled={autoApplyingKaat || challanTransitsCount === 0}
                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Auto apply kaat rates to all bilties based on destination city"
              >
                {autoApplyingKaat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {autoApplyingKaat ? 'Applying...' : 'Auto Kaat All'}
              </button>

              {selectedBiltiesCount > 0 && (
                <button
                  onClick={onAutoKaatSelected}
                  disabled={autoApplyingKaat}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Auto apply kaat to selected bilties only"
                >
                  {autoApplyingKaat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Auto Kaat ({selectedBiltiesCount})
                </button>
              )}

              {onViewKaatBills && (
                <button
                  onClick={onViewKaatBills}
                  className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                  title="View saved kaat bills"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Kaat Bills
                </button>
              )}
            </>
          )}

          {editMode && onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Edit
            </button>
          )}

          <button
            onClick={onSaveKaatBill}
            disabled={selectedBiltiesCount === 0 || savingKaatBill}
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedBiltiesCount === 0 ? 'Select bilties first' : `${editMode ? 'Update' : 'Save'} ${selectedBiltiesCount} bilties`}
          >
            <Save className="w-3.5 h-3.5" />
            {editMode ? 'Update' : 'Save'} Bill {selectedBiltiesCount > 0 && `(${selectedBiltiesCount})`}
          </button>

          {!editMode && (
            <button
              onClick={onBulkCreate}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold shadow-md"
              title="Bulk create kaat bills for multiple transport admins"
            >
              <Layers className="w-3.5 h-3.5" />
              Bulk Create
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
