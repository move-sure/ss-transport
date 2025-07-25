'use client';

import React from 'react';
import { Search, SlidersHorizontal, Download, Copy } from 'lucide-react';

export default function BillSearchHeader({ 
  onToggleFilters, 
  showFilters, 
  totalResults, 
  loading,
  hasSearched,
  onDownloadCSV,
  onCopyToClipboard,
  selectedBiltiesCount = 0
}) {
  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Bill Search
            </h1>
          </div>
          
          {!loading && hasSearched && totalResults !== undefined && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                {totalResults} Results
              </span>
              {selectedBiltiesCount > 0 && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                  {selectedBiltiesCount} Selected
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {hasSearched && totalResults > 0 && (
            <>
              <button
                onClick={onDownloadCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                title={selectedBiltiesCount > 0 ? `Download ${selectedBiltiesCount} selected bilties as CSV` : "Download all results as CSV"}
              >
                <Download className="h-4 w-4" />
                <span className="font-medium">
                  {selectedBiltiesCount > 0 ? `Download Selected (${selectedBiltiesCount})` : 'Download CSV'}
                </span>
              </button>
              
              <button
                onClick={onCopyToClipboard}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                title={selectedBiltiesCount > 0 ? `Copy ${selectedBiltiesCount} selected bilties to clipboard` : "Copy all results to clipboard"}
              >
                <Copy className="h-4 w-4" />
                <span className="font-medium">
                  {selectedBiltiesCount > 0 ? `Copy Selected (${selectedBiltiesCount})` : 'Copy'}
                </span>
              </button>
            </>
          )}
          
          <button
            onClick={onToggleFilters}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              showFilters 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-medium">
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Searching...</span>
        </div>
      )}
    </div>
  );
}
