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
  onCopyToClipboard
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
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {hasSearched && totalResults > 0 && (
            <>
              <button
                onClick={onDownloadCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                title="Download as CSV"
              >
                <Download className="h-4 w-4" />
                <span className="font-medium">Download CSV</span>
              </button>
              
              <button
                onClick={onCopyToClipboard}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                title="Copy to Clipboard"
              >
                <Copy className="h-4 w-4" />
                <span className="font-medium">Copy</span>
              </button>
            </>
          )}
          
          <button
            onClick={onToggleFilters}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md border transition-colors ${
              showFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span className="font-medium">
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Search through both regular bilties and station bilty summaries using GR number, date range, and other filters.</p>
      </div>

      {loading && (
        <div className="mt-4 flex items-center space-x-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Searching...</span>
        </div>
      )}
    </div>
  );
}
