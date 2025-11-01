'use client';

import React from 'react';
import { X } from 'lucide-react';

const BlockedModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md backdrop-saturate-150 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border-4 border-red-500">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-full">
              <X className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Feature Blocked</h3>
              <p className="text-xs text-red-100">This action is temporarily disabled</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-4">
            <p className="text-sm font-semibold text-red-900 mb-2">
              Contact EKLAVYA SINGH to enable this feature
            </p>
            <p className="text-xs text-red-700">
              CSV download and copy features are currently disabled. Please use the print option to generate bills.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg hover:from-red-700 hover:to-red-800 transition-all"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockedModal;
