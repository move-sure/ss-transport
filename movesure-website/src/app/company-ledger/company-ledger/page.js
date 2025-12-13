'use client';

import { BookOpen } from 'lucide-react';

export default function CompanyWiseLedgerPage() {
  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Company Wise Ledger</h1>
        <p className="text-gray-500">View ledger entries organized by company</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Company Wise Ledger</h3>
        <p className="text-gray-500">Select a company to view its ledger</p>
      </div>
    </div>
  );
}
