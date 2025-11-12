'use client';

import React from 'react';
import { Truck, User, Calendar, CheckCircle, XCircle, AlertCircle, Package } from 'lucide-react';

const ChallanDetailsDisplay = ({ challanDetails, truck, driver, owner }) => {
  if (!challanDetails) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-3 rounded-lg border-2 border-purple-200 mb-4">
      <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
        <Package className="w-4 h-4 text-purple-600" />
        Challan Details
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Challan Number */}
        <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-3 rounded-lg shadow-md border-2 border-purple-300">
          <div className="flex items-center gap-1 mb-1">
            <Package className="w-4 h-4 text-purple-700" />
            <span className="text-xs font-bold text-purple-700 uppercase">Challan No</span>
          </div>
          <div className="text-2xl font-black text-purple-900">
            {challanDetails.challan_no}
          </div>
        </div>

        {/* Challan Date */}
        <div className="bg-white p-2 rounded shadow-sm border border-purple-100">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-purple-600" />
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Challan Date</span>
          </div>
          <div className="text-sm font-bold text-gray-900">
            {new Date(challanDetails.date).toLocaleDateString('en-IN')}
          </div>
        </div>

        {/* Dispatch Status */}
        <div className={`p-2 rounded shadow-sm border-2 ${challanDetails.is_dispatched ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'}`}>
          <div className="flex items-center gap-1 mb-1">
            {challanDetails.is_dispatched ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-orange-600" />
            )}
            <span className="text-[10px] font-semibold text-gray-600 uppercase">Dispatch Status</span>
          </div>
          <div className={`text-base font-bold ${challanDetails.is_dispatched ? 'text-green-700' : 'text-orange-700'}`}>
            {challanDetails.is_dispatched ? '✓ Dispatched' : 'Pending'}
          </div>
          {challanDetails.dispatch_date && (
            <div className="text-base font-bold text-gray-900 mt-1">
              {new Date(challanDetails.dispatch_date).toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </div>
          )}
        </div>

        {/* Total Bilties */}
        <div className="bg-white p-2 rounded shadow-sm border border-purple-100">
          <div className="flex items-center gap-1 mb-1">
            <Package className="w-3 h-3 text-purple-600" />
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Total Bilties</span>
          </div>
          <div className="text-sm font-bold text-gray-900">
            {challanDetails.total_bilty_count || 0}
          </div>
        </div>

        {/* Truck Details */}
        {truck && (
          <div className="bg-white p-2 rounded shadow-sm border border-purple-100">
            <div className="flex items-center gap-1 mb-1">
              <Truck className="w-3 h-3 text-purple-600" />
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Truck No</span>
            </div>
            <div className="text-sm font-bold text-gray-900">
              {truck.truck_number}
            </div>
            {truck.capacity && (
              <div className="text-[9px] text-gray-600 mt-0.5">
                {truck.capacity}T
              </div>
            )}
          </div>
        )}

        {/* Driver Details */}
        {driver && (
          <div className="bg-white p-2 rounded shadow-sm border border-purple-100">
            <div className="flex items-center gap-1 mb-1">
              <User className="w-3 h-3 text-purple-600" />
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Driver</span>
            </div>
            <div className="text-sm font-bold text-gray-900 truncate">
              {driver.name}
            </div>
            {driver.mobile && (
              <div className="text-[9px] text-gray-600 mt-0.5 truncate">
                📞 {driver.mobile}
              </div>
            )}
          </div>
        )}

        {/* Owner Details */}
        {owner && (
          <div className="bg-white p-2 rounded shadow-sm border border-purple-100">
            <div className="flex items-center gap-1 mb-1">
              <User className="w-3 h-3 text-purple-600" />
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Owner</span>
            </div>
            <div className="text-sm font-bold text-gray-900 truncate">
              {owner.name}
            </div>
            {owner.mobile && (
              <div className="text-[9px] text-gray-600 mt-0.5 truncate">
                📞 {owner.mobile}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remarks */}
      {challanDetails.remarks && (
        <div className="mt-2 p-2 bg-white rounded shadow-sm border border-purple-100">
          <div className="flex items-center gap-1 mb-1">
            <AlertCircle className="w-3 h-3 text-purple-600" />
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Remarks</span>
          </div>
          <div className="text-xs text-gray-900">
            {challanDetails.remarks}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallanDetailsDisplay;
