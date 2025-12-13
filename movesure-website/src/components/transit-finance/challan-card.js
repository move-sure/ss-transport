'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Calendar, User, MapPin, Package, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function ChallanCard({ challan, branches }) {
  const router = useRouter();

  const getBranchName = (branchId) => {
    const branch = branches?.find(b => b.id === branchId);
    return branch?.branch_name || 'Unknown';
  };

  const handleClick = () => {
    router.push(`/transit-finance/${challan.challan_no}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-200 hover:border-blue-400 group"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-lg">{challan.challan_no}</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            challan.is_dispatched 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {challan.is_dispatched ? 'Dispatched' : 'Active'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Branch */}
        <div className="flex items-center gap-2 text-gray-700">
          <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm font-medium">{getBranchName(challan.branch_id)}</span>
        </div>

        {/* Vehicle */}
        <div className="flex items-center gap-2 text-gray-700">
          <Truck className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm">{challan.truck?.truck_number || 'N/A'}</span>
          {challan.truck?.truck_type && (
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
              {challan.truck.truck_type}
            </span>
          )}
        </div>

        {/* Driver & Owner */}
        <div className="flex items-center gap-2 text-gray-700">
          <User className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <span className="text-sm">{challan.driver?.name || 'N/A'}</span>
        </div>

        {/* Bilty Count */}
        <div className="flex items-center gap-2 text-gray-700">
          <Package className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span className="text-sm font-medium">{challan.total_bilty_count || 0} Bilties</span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-gray-600 pt-2 border-t border-gray-100">
          <Calendar className="w-4 h-4 text-purple-600" />
          <span className="text-xs">
            {challan.date ? format(new Date(challan.date), 'dd MMM yyyy') : 'N/A'}
          </span>
          {challan.dispatch_date && (
            <span className="text-xs text-green-600 ml-auto">
              Dispatched: {format(new Date(challan.dispatch_date), 'dd MMM')}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 rounded-b-xl flex items-center justify-between group-hover:bg-blue-50 transition-colors">
        <span className="text-sm text-gray-600">View Details</span>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
      </div>
    </div>
  );
}
