'use client';

import { Search } from 'lucide-react';

export default function SearchPage() {
  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-gray-500">Search bills, companies, and ledger entries</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Search</h3>
        <p className="text-gray-500">Search functionality will appear here</p>
      </div>
    </div>
  );
}
