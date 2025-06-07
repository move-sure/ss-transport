'use client';

import React from 'react';
import { Package } from 'lucide-react';

const SelectedBiltiesSummary = ({ selectedBilties, onClearAll }) => {
  if (selectedBilties.length === 0) return null;

  const totalPackages = selectedBilties.reduce((sum, b) => sum + (b.no_of_pkg || 0), 0);
  const totalAmount = selectedBilties.reduce((sum, b) => sum + (b.total || 0), 0);

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-emerald-800 font-bold text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            SELECTED: {selectedBilties.length}
          </span>
          <span className="text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg font-semibold text-sm">
            Packages: {totalPackages}
          </span>
          <span className="text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg font-semibold text-sm">
            Amount: ₹{totalAmount}
          </span>
        </div>
        <button
          onClick={onClearAll}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold"
        >
          Clear All
        </button>
      </div>
    </div>
  );
};

export default SelectedBiltiesSummary;