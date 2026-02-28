'use client';

import React from 'react';
import { ArrowLeft, DollarSign, Plus, List, Receipt, RefreshCw } from 'lucide-react';

export default function ChallanPageHeader({
  challanNo,
  onBack,
  onRefresh,
  onAddKaat,
  onShowKaatList,
  onShowKaatBills,
}) {
  return (
    <div className="mb-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-3 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Challan List</span>
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-xl shadow-lg">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Challan: {challanNo}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage bilty details and kaat for this challan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="bg-white border border-gray-200 text-gray-600 p-2.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onAddKaat}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Kaat
          </button>
          <button
            onClick={onShowKaatList}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 text-sm"
          >
            <List className="w-4 h-4" />
            Kaat Rates
          </button>
          <button
            onClick={onShowKaatBills}
            className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 text-sm"
            title="View saved kaat bills"
          >
            <Receipt className="w-4 h-4" />
            Kaat Bills
          </button>
        </div>
      </div>
    </div>
  );
}
