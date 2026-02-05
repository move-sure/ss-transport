'use client';

import React from 'react';
import { Filter } from 'lucide-react';

export default function PDFFilterButtons({ filterType, onFilterChange }) {
  const filters = [
    { value: 'all', label: '🌍 All Rates', color: 'emerald' },
    { value: 'transport', label: '🚚 Transport', color: 'purple' },
    { value: 'city', label: '📍 City', color: 'blue' }
  ];

  const getButtonStyles = (filter) => {
    const isActive = filterType === filter.value;
    const colors = {
      emerald: isActive ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300',
      purple: isActive ? 'bg-purple-600 text-white border-purple-600 shadow-lg' : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300',
      blue: isActive ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
    };
    return colors[filter.color];
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-bold text-gray-700 mb-3">
        <Filter className="w-4 h-4 inline mr-1.5" />
        Filter By
      </label>
      <div className="grid grid-cols-3 gap-3">
        {filters.map(filter => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${getButtonStyles(filter)}`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
