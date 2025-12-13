'use client';

import { Clock } from 'lucide-react';

export default function RecentBillPage() {
  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recent Bills</h1>
        <p className="text-gray-500">View and manage recently created bills</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Recent Bills</h3>
        <p className="text-gray-500">Recent bill entries will appear here</p>
      </div>
    </div>
  );
}
