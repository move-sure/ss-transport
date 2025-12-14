'use client';

import React from 'react';
import { Search } from 'lucide-react';

export default function EmptySearchState() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-700 mb-2">Search Bilties</h3>
      <p className="text-sm text-gray-500">Use the filters above and click Search to find bilties</p>
    </div>
  );
}
