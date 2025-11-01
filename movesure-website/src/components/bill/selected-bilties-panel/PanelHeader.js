'use client';

import React from 'react';
import { X, FileText, Filter } from 'lucide-react';

const PanelHeader = ({ 
  selectedCount, 
  filteredCount, 
  showFilters, 
  onToggleFilters, 
  onClose,
  hasActiveFilters 
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6" />
          <div>
            <h3 className="text-lg font-bold">Selected Bilties</h3>
            <p className="text-xs text-blue-100">Manage and customize your bill</p>
          </div>
        </div>
        {/* Total and Filtered Counts */}
        <div className="flex items-center space-x-4 pl-6 border-l border-blue-400">
          <div className="text-center">
            <p className="text-2xl font-bold">{selectedCount}</p>
            <p className="text-xs text-blue-100">Total Selected</p>
          </div>
          {hasActiveFilters && (
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-300">{filteredCount}</p>
              <p className="text-xs text-blue-100">Filtered</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleFilters}
          className={`p-2 rounded-full transition-colors ${
            showFilters ? 'bg-blue-500' : 'hover:bg-blue-500'
          }`}
          title="Toggle filters"
        >
          <Filter className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          className="p-2 hover:bg-blue-500 rounded-full transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default PanelHeader;
