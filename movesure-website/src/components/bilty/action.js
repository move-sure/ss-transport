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
    <div className="flex justify-between items-center mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border-2 border-purple-200 shadow-lg">
      {/* Left side - Draft button */}
      <div className="flex gap-4">        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          tabIndex="-1"
          className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-bold hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 border-2 border-amber-400"
        >
          <FileText className="w-5 h-5" />
          DRAFT {showShortcuts && '(Ctrl+D)'}
        </button>
      </div>

      {/* Right side - Reset button */}      <button
        type="button"
        onClick={onReset}
        tabIndex="-1"
        className="px-8 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl text-sm font-bold hover:from-gray-600 hover:to-gray-700 flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 border-2 border-gray-400"
      >
        <RotateCcw className="w-5 h-5" />
        RESET {showShortcuts && '(Ctrl+N)'}
      </button>
    </div>
  );
};

export default ActionButtonsSection;