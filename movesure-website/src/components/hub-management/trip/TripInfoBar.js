'use client';

import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, Navigation, Clock, MapPin, PackageCheck, Hash, Send } from 'lucide-react';

export default function TripInfoBar({ trip, stats, kanpurCount, router }) {
  const { deliveredCount, inTransitCount, pendingCount, totalPkts, totalWt, totalAmt } = stats;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="font-bold text-gray-800">{totalPkts} Pkts</span>
        <span className="text-gray-400">·</span>
        <span>{totalWt.toFixed(1)}kg</span>
        <span className="text-gray-400">·</span>
        <span className="font-semibold">₹{totalAmt.toLocaleString('en-IN')}</span>
        <span className="text-gray-300 hidden sm:inline">|</span>
        <span className="text-green-600 font-semibold"><CheckCircle className="h-3 w-3 inline mr-0.5" />{deliveredCount}</span>
        <span className="text-amber-600 font-semibold"><Navigation className="h-3 w-3 inline mr-0.5" />{inTransitCount}</span>
        <span className="text-gray-500 font-semibold"><Clock className="h-3 w-3 inline mr-0.5" />{pendingCount}</span>
        <span className="text-orange-600 font-semibold"><MapPin className="h-3 w-3 inline mr-0.5" />{kanpurCount}</span>
        {trip?.dispatch_date && (
          <span className="text-blue-600 ml-2">
            <Send className="h-3 w-3 inline mr-0.5" />
            Dispatched: {format(new Date(trip.dispatch_date), 'dd MMM yy, hh:mm a')}
          </span>
        )}
        {trip?.received_date && (
          <span className="text-emerald-600 ml-2">
            <PackageCheck className="h-3 w-3 inline mr-0.5" />
            Received: {format(new Date(trip.received_date), 'dd MMM yy, hh:mm a')}
          </span>
        )}
      </div>

      {/* Challan chips */}
      {trip?.challans?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
          <span className="text-[10px] text-gray-400 font-medium self-center">Challans:</span>
          {trip.challans.map(c => (
            <button
              key={c.id}
              onClick={() => router.push(`/hub-management/${c.challan_no}`)}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Hash className="h-2.5 w-2.5" />{c.challan_no}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
