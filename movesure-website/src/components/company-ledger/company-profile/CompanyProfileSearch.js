'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export default function CompanyProfileSearch({ 
  searchTerm, 
  onSearchChange, 
  stakeholderFilter, 
  onFilterChange 
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, GST, mobile..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Stakeholder Filter */}
      <select
        value={stakeholderFilter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white min-w-[160px]"
      >
        <option value="ALL">All Types</option>
        <option value="CONSIGNOR">Consignors</option>
        <option value="CONSIGNEE">Consignees</option>
        <option value="TRANSPORT">Transport</option>
      </select>
    </div>
  );
}
