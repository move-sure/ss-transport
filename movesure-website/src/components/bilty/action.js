'use client';

import React from 'react';
import { Save, FileText, RotateCcw } from 'lucide-react';

const ActionButtonsSection = ({ 
  onReset, 
  onSaveDraft,
  saving = false,
  showShortcuts = false
}) => {
  return (
    <div className="flex justify-between items-center mt-3 p-3 bg-white/95 rounded-lg border border-slate-200 shadow-sm">
      {/* Left side - Draft button */}
      <div className="flex gap-2">        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          tabIndex="-1"
          className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-sm font-bold hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 border-2 border-amber-400"
        >
          <FileText className="w-4 h-4" />
          DRAFT {showShortcuts && '(Ctrl+D)'}
        </button>
      </div>

      {/* Right side - Reset button */}      <button
        type="button"
        onClick={onReset}
        tabIndex="-1"
        className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg text-sm font-bold hover:from-gray-600 hover:to-gray-700 flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 border-2 border-gray-400"
      >
        <RotateCcw className="w-4 h-4" />
        RESET {showShortcuts && '(Ctrl+N)'}
      </button>
    </div>
  );
};

export default ActionButtonsSection;
