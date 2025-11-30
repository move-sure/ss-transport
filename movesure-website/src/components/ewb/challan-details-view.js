import React, { useMemo } from 'react';
import { Calendar, Truck, User, Package, CheckCircle, Clock, MapPin, Hash } from 'lucide-react';

function formatDate(value) {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (err) {
    return 'N/A';
  }
}

export default function ChallanDetailsView({ challanDetails }) {
  const branchLabel = challanDetails?.branch?.branch_name
    || challanDetails?.branch?.name
    || challanDetails?.branch?.code
    || 'N/A';

  if (!challanDetails) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Compact Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Hash className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Challan #{challanDetails.challan_no}</h2>
            <p className="text-xs text-slate-300">{branchLabel} • {formatDate(challanDetails.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            challanDetails.is_dispatched
              ? 'bg-green-500/20 text-green-200 border border-green-400/30'
              : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
          }`}>
            {challanDetails.is_dispatched ? (
              <><CheckCircle className="w-3 h-3" /> Dispatched</>
            ) : (
              <><Clock className="w-3 h-3" /> Pending</>
            )}
          </span>
        </div>
      </div>

      {/* Compact Details Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Truck */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <Truck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Truck</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{challanDetails.truck?.truck_number || 'N/A'}</p>
            </div>
          </div>

          {/* Driver */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <User className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Driver</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{challanDetails.driver?.driver_name || challanDetails.driver?.name || 'N/A'}</p>
            </div>
          </div>

          {/* Owner */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Owner</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{challanDetails.owner?.owner_name || challanDetails.owner?.name || 'N/A'}</p>
            </div>
          </div>

          {/* Total Bilties */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <Package className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Bilties</p>
              <p className="text-sm font-semibold text-slate-800">{challanDetails.total_bilty_count || 0}</p>
            </div>
          </div>

          {/* Created */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <Calendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Created</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{formatDate(challanDetails.created_at)}</p>
            </div>
          </div>

          {/* Branch */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Branch</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{branchLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
