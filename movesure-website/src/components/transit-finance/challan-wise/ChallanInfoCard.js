'use client';

import React from 'react';
import { Truck, Calendar, User, MapPin, Package, Hash } from 'lucide-react';
import { format } from 'date-fns';

function InfoItem({ icon: Icon, iconColor, label, value }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`p-1.5 rounded-lg bg-${iconColor}-50`}>
        <Icon className={`w-3.5 h-3.5 text-${iconColor}-600`} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}</div>
        <div className="text-sm font-bold text-gray-900 truncate">{value || 'N/A'}</div>
      </div>
    </div>
  );
}

export default function ChallanInfoCard({ challan, branchName, biltyCount }) {
  if (!challan) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-3">
      <div className="flex items-center gap-4 px-4 py-3 flex-wrap">
        {/* Challan No */}
        <InfoItem
          icon={Hash}
          iconColor="blue"
          label="Challan"
          value={challan.challan_no}
        />

        <div className="h-8 w-px bg-gray-200 hidden sm:block" />

        {/* Status */}
        <div className="flex items-center">
          <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
            challan.is_dispatched 
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {challan.is_dispatched ? '✓ Dispatched' : '● Active'}
          </span>
        </div>

        <div className="h-8 w-px bg-gray-200 hidden sm:block" />

        {/* Branch */}
        <InfoItem
          icon={MapPin}
          iconColor="blue"
          label="Branch"
          value={branchName}
        />

        <div className="h-8 w-px bg-gray-200 hidden sm:block" />

        {/* Vehicle */}
        <InfoItem
          icon={Truck}
          iconColor="green"
          label="Vehicle"
          value={challan.truck?.truck_number}
        />

        <div className="h-8 w-px bg-gray-200 hidden sm:block" />

        {/* Driver */}
        <InfoItem
          icon={User}
          iconColor="orange"
          label="Driver"
          value={challan.driver?.name}
        />

        <div className="h-8 w-px bg-gray-200 hidden sm:block" />

        {/* Date */}
        <InfoItem
          icon={Calendar}
          iconColor="purple"
          label="Date"
          value={challan.date ? format(new Date(challan.date), 'dd MMM yyyy') : null}
        />

        <div className="h-8 w-px bg-gray-200 hidden sm:block" />

        {/* Bilty Count */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50">
            <Package className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Bilties</div>
            <div className="text-sm font-extrabold text-indigo-700">{biltyCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
