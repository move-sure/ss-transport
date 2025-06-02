'use client';

import React from 'react';
import { Save, FileText, RotateCcw } from 'lucide-react';

const ActionButtonsSection = ({ 
  onSave, 
  onReset, 
  saving, 
  onSaveDraft,
  isEditMode = false,
  showShortcuts = false
}) => {
  return (
    <div className="flex justify-between items-center mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-blue-200">
      {/* Left side - Draft and Reset buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-sm font-bold hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition-all"
        >
          <FileText className="w-4 h-4" />
          DRAFT {showShortcuts && '(Ctrl+D)'}
        </button>
        
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg text-sm font-bold hover:from-gray-600 hover:to-gray-700 flex items-center gap-2 shadow-md transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          RESET {showShortcuts && '(Ctrl+N)'}
        </button>
      </div>

      {/* Right side - Save/Print button */}
      <button
        type="button"
        onClick={() => onSave(false)}
        disabled={saving}
        className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg text-lg font-bold hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all"
        tabIndex={30}
      >
        <Save className="w-5 h-5" />
        {saving ? 'SAVING...' : isEditMode ? 'UPDATE / PRINT' : 'SAVE / PRINT'} {showShortcuts && '(Ctrl+S)'}
      </button>
    </div>
  );
};

export default ActionButtonsSection;