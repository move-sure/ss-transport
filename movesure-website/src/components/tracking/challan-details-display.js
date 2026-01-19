'use client';

import React from 'react';
import { Truck, User, Calendar, CheckCircle, XCircle, AlertCircle, Package, MapPin, Phone } from 'lucide-react';

const ChallanDetailsDisplay = ({ challanDetails, truck, driver, owner, destinationCity, fromCity }) => {
  if (!challanDetails) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-4 rounded-xl border-2 border-purple-300 mb-4 shadow-lg">
      {/* Header */}
      <div className="mb-4 pb-3 border-b-2 border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Challan Details</h3>
              <p className="text-xs text-gray-600">Complete challan information</p>
            </div>
          </div>
          
          {/* Dispatch Status Badge */}
          <div className={`px-4 py-2 rounded-xl border-2 shadow-md ${
            challanDetails.is_dispatched 
              ? 'bg-emerald-100 border-emerald-400' 
              : 'bg-orange-100 border-orange-400'
          }`}>
            <div className="flex items-center gap-2">
              {challanDetails.is_dispatched ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-orange-600" />
              )}
              <div>
                <div className={`text-sm font-bold ${
                  challanDetails.is_dispatched ? 'text-emerald-700' : 'text-orange-700'
                }`}>
                  {challanDetails.is_dispatched ? 'Dispatched' : 'Pending Dispatch'}
                </div>
                {challanDetails.dispatch_date && (
                  <div className="text-[10px] text-gray-600">
                    {new Date(challanDetails.dispatch_date).toLocaleDateString('en-IN', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {/* Challan Number - Featured */}
        <div className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-purple-600 to-indigo-600 p-4 rounded-xl shadow-xl border-2 border-purple-700">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-white" />
            <span className="text-xs font-bold text-purple-100 uppercase tracking-wider">Challan Number</span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {challanDetails.challan_no}
          </div>
        </div>

        {/* Challan Date */}
        <div className="bg-white p-4 rounded-xl shadow-md border-2 border-slate-200 hover:border-indigo-300 transition">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Challan Date</span>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {new Date(challanDetails.date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </div>

        {/* Total Bilties */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl shadow-md border-2 border-emerald-300 hover:shadow-lg transition">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Total Bilties</span>
          </div>
          <div className="text-2xl font-black text-emerald-900">
            {challanDetails.total_bilty_count || 0}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">
            Packages in challan
          </div>
        </div>

        {/* From Station */}
        {(fromCity || challanDetails.from_station) && (
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-xl shadow-md border-2 border-cyan-300 hover:shadow-lg transition">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-cyan-600" />
              <span className="text-xs font-bold text-cyan-700 uppercase tracking-wide">From</span>
            </div>
            <div className="text-lg font-bold text-cyan-900">
              {fromCity?.city_name || challanDetails.from_station || '-'}
            </div>
            {fromCity?.city_code && (
              <div className="text-[10px] text-cyan-600 font-semibold mt-1">
                Code: {fromCity.city_code}
              </div>
            )}
          </div>
        )}

        {/* Destination */}
        {(destinationCity || challanDetails.to_station) && (
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-4 rounded-xl shadow-md border-2 border-pink-300 hover:shadow-lg transition">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-pink-600" />
              <span className="text-xs font-bold text-pink-700 uppercase tracking-wide">Destination</span>
            </div>
            <div className="text-lg font-bold text-pink-900">
              {destinationCity?.city_name || challanDetails.to_station || '-'}
            </div>
            {destinationCity?.city_code && (
              <div className="text-[10px] text-pink-600 font-semibold mt-1">
                Code: {destinationCity.city_code}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vehicle & Personnel Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Truck Details */}
        {truck && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl shadow-md border-2 border-blue-300 hover:shadow-lg transition">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Truck Details</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-blue-600 font-semibold mb-1">Vehicle Number</div>
                <div className="text-lg font-black text-blue-900 tracking-tight">
                  {truck.truck_number}
                </div>
              </div>
              {truck.capacity && (
                <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
                  <div className="text-xs text-blue-600">Capacity:</div>
                  <div className="text-sm font-bold text-blue-900">{truck.capacity} Tons</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Driver Details */}
        {driver && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl shadow-md border-2 border-amber-300 hover:shadow-lg transition">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Driver</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-amber-600 font-semibold mb-1">Name</div>
                <div className="text-base font-bold text-amber-900">
                  {driver.name}
                </div>
              </div>
              {driver.mobile && (
                <a
                  href={`tel:${driver.mobile}`}
                  className="flex items-center gap-2 pt-2 border-t border-amber-200 text-amber-700 hover:text-amber-900 transition"
                >
                  <Phone className="w-3 h-3" />
                  <span className="text-sm font-semibold">{driver.mobile}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Owner Details */}
        {owner && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl shadow-md border-2 border-purple-300 hover:shadow-lg transition">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Owner</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-purple-600 font-semibold mb-1">Name</div>
                <div className="text-base font-bold text-purple-900">
                  {owner.name}
                </div>
              </div>
              {owner.mobile && (
                <a
                  href={`tel:${owner.mobile}`}
                  className="flex items-center gap-2 pt-2 border-t border-purple-200 text-purple-700 hover:text-purple-900 transition"
                >
                  <Phone className="w-3 h-3" />
                  <span className="text-sm font-semibold">{owner.mobile}</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Remarks Section */}
      {challanDetails.remarks && (
        <div className="mt-3 bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl border-2 border-yellow-300 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Important Remarks</span>
          </div>
          <div className="text-sm text-gray-900 leading-relaxed">
            {challanDetails.remarks}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallanDetailsDisplay;
