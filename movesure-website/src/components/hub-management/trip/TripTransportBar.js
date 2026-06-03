'use client';

import React from 'react';
import { Truck, Building2, Loader2 } from 'lucide-react';

export default function TripTransportBar({ stats, enrichedBiltiesCount, applyingHubRates, autoAssigning, onBulkApplyHubRates, onAutoAssign }) {
  const { assignedCount, autoCount } = stats;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-teal-50 rounded-lg">
          <Truck className="h-4 w-4 text-teal-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900">Transport Assignment</p>
          <p className="text-[10px] text-gray-500">
            <span className="text-teal-700 font-semibold">{assignedCount}</span> assigned ·{' '}
            <span className="text-amber-600 font-semibold">{autoCount}</span> auto-assignable
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onBulkApplyHubRates}
          disabled={applyingHubRates || enrichedBiltiesCount === 0}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 shadow-sm disabled:opacity-40"
        >
          {applyingHubRates
            ? <><Loader2 className="h-3 w-3 animate-spin" />Applying...</>
            : <><Building2 className="h-3 w-3" />Auto Kaat ({enrichedBiltiesCount})</>}
        </button>
        <button
          onClick={onAutoAssign}
          disabled={autoAssigning || autoCount === 0}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-teal-600 hover:to-emerald-700 shadow-sm disabled:opacity-40"
        >
          {autoAssigning
            ? <><Loader2 className="h-3 w-3 animate-spin" />Assigning...</>
            : <><Truck className="h-3 w-3" />Auto-Assign ({autoCount})</>}
        </button>
      </div>
    </div>
  );
}
