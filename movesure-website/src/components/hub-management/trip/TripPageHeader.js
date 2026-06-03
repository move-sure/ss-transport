'use client';

import React from 'react';
import { ArrowLeft, RefreshCw, Truck, User, Route, Send, Clock, PackageCheck } from 'lucide-react';

const STATUS_MAP = {
  pending:    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', Icon: Clock },
  dispatched: { bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200',  Icon: Send },
  received:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', Icon: PackageCheck },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const { Icon } = s;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full font-bold ${s.bg} ${s.text} border ${s.border}`}>
      <Icon className="h-3 w-3" />{status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function TripPageHeader({ trip, enrichedBilties, loading, onRefresh, onBulkCrossModal, router }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-[1800px] mx-auto px-3 sm:px-5 py-2">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/hub-management')} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Route className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-bold text-gray-900">Trip #{trip?.trip_no}</h1>
              {trip?.status && <StatusBadge status={trip.status} />}
              <span className="text-[10px] text-gray-400">·</span>
              {(trip?.truck_number || trip?.truck?.truck_number) && (
                <span className="text-[11px] text-gray-600 flex items-center gap-1">
                  <Truck className="h-3 w-3 text-blue-400" />
                  {trip.truck_number || trip.truck?.truck_number}
                </span>
              )}
              {(trip?.driver_name || trip?.driver?.name) && (
                <span className="text-[11px] text-gray-600 flex items-center gap-1">
                  <User className="h-3 w-3 text-gray-400" />
                  {trip.driver_name || trip.driver?.name}
                </span>
              )}
              <span className="text-[10px] text-gray-400">·</span>
              <span className="text-[11px] text-gray-500">
                {trip?.total_challan_count || 0} challans · {enrichedBilties.length} GRs
              </span>
            </div>
          </div>
          <button
            onClick={onBulkCrossModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[11px] font-bold rounded-lg hover:from-violet-600 hover:to-purple-700 shadow-sm"
          >
            <Truck className="h-3 w-3" />Bulk Cross Challan
          </button>
          <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-gray-100">
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
