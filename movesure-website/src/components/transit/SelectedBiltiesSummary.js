'use client';

import React from 'react';
import { Package } from 'lucide-react';

const SelectedBiltiesSummary = ({ selectedBilties, onClearAll }) => {
  if (selectedBilties.length === 0) return null;

  // Sort function for GR numbers to handle alphanumeric sorting properly
  const sortByGRNumber = (a, b) => {
    const grA = a.gr_no || '';
    const grB = b.gr_no || '';
    
    // Extract alphabetic prefix and numeric part
    const matchA = grA.match(/^([A-Za-z]*)(\d+)(.*)$/);
    const matchB = grB.match(/^([A-Za-z]*)(\d+)(.*)$/);
    
    if (!matchA && !matchB) return grA.localeCompare(grB);
    if (!matchA) return 1;
    if (!matchB) return -1;
    
    const [, prefixA, numberA, suffixA] = matchA;
    const [, prefixB, numberB, suffixB] = matchB;
    
    // First compare prefixes
    const prefixCompare = prefixA.localeCompare(prefixB);
    if (prefixCompare !== 0) return prefixCompare;
    
    // Then compare numbers numerically
    const numCompare = parseInt(numberA) - parseInt(numberB);
    if (numCompare !== 0) return numCompare;
    
    // Finally compare suffixes
    return suffixA.localeCompare(suffixB);
  };

  // Sort selected bilties by GR number
  const sortedSelectedBilties = [...selectedBilties].sort(sortByGRNumber);

  const totalPackages = sortedSelectedBilties.reduce((sum, b) => sum + (b.no_of_pkg || 0), 0);
  const totalAmount = sortedSelectedBilties.reduce((sum, b) => sum + (b.total || 0), 0);

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">        <div className="flex flex-wrap items-center gap-4">
          <span className="text-emerald-800 font-bold text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            SELECTED: {sortedSelectedBilties.length}
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