'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Eye, EyeOff, ExternalLink } from 'lucide-react';

export default function SearchHeader({ 
  selectedCount = 0, 
  showSelectedPanel, 
  onTogglePanel 
}) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-600 rounded-lg">
          <Search className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bill Search</h1>
          <p className="text-sm text-gray-500">Search bilties from all tables</p>
        </div>
      </div>
      
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/company-ledger/search/selected-search')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-md"
            title="View full details page"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View Details</span>
          </button>
          <button
            onClick={onTogglePanel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {showSelectedPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <Package className="h-4 w-4" />
            <span>{selectedCount} Selected</span>
          </button>
        </div>
      )}
    </div>
  );
}
