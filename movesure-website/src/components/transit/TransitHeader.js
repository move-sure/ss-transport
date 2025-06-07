'use client';

import React from 'react';
import { format } from 'date-fns';
import { Truck, Package, AlertCircle, RefreshCw, Eye, FileText } from 'lucide-react';

const TransitHeader = ({ 
  userBranch, 
  user, 
  bilties, 
  transitBilties, 
  selectedBilties, 
  selectedChallan,
  onRefresh,
  onPreviewLoadingChallan,
  onPreviewChallanBilties
}) => {
  const getCityName = (cityCode) => {
    return cityCode || 'Unknown';
  };

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-xl shadow-xl border border-blue-300">
      {/* Header Section */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
          {/* Left Section - Title and Branch Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 text-white mb-4">
              <Truck className="w-8 h-8" />
              <span className="text-2xl font-bold">TRANSIT MANAGEMENT</span>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-white">
              <div className="bg-white/10 p-3 rounded-lg">
                <span className="opacity-80 block text-xs uppercase tracking-wide">BRANCH</span>
                <div className="font-bold text-base">{userBranch?.branch_name || 'Unknown'}</div>
                <div className="text-xs opacity-90">{getCityName(userBranch?.city_code || '')}</div>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <span className="opacity-80 block text-xs uppercase tracking-wide">USER</span>
                <div className="font-bold text-base">{user?.username}</div>
                <div className="text-xs opacity-90">{user?.email}</div>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <span className="opacity-80 block text-xs uppercase tracking-wide">DATE</span>
                <div className="font-bold text-base">{format(new Date(), 'dd/MM/yyyy')}</div>
                <div className="text-xs opacity-90">{format(new Date(), 'EEEE')}</div>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <span className="opacity-80 block text-xs uppercase tracking-wide">TIME</span>
                <div className="font-bold text-base">{format(new Date(), 'HH:mm')}</div>
                <div className="text-xs opacity-90">IST</div>
              </div>
            </div>
          </div>
          
          {/* Right Section - Stats and Actions */}
          <div className="flex flex-col gap-4">
            {/* Stats Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-emerald-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-bold border border-emerald-600 flex items-center gap-2 text-sm">
                <Package className="w-4 h-4" />
                Available: {bilties.length}
              </div>
              <div className="bg-yellow-500/90 backdrop-blur-sm text-yellow-900 px-4 py-2 rounded-lg font-bold border border-yellow-600 flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4" />
                In Challan: {transitBilties.length}
              </div>
              <div className="bg-purple-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-bold border border-purple-600 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                Selected: {selectedBilties.length}
              </div>
            </div>
            
            {/* Action Buttons Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={onPreviewLoadingChallan}
                disabled={bilties.length === 0}
                className="bg-green-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-bold border border-green-700 flex items-center gap-2 hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Preview/Download all available bilties as PDF"
              >
                <Eye className="w-4 h-4" />
                Loading Challan
              </button>
              <button
                onClick={onPreviewChallanBilties}
                disabled={!selectedChallan || transitBilties.length === 0}
                className="bg-orange-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-bold border border-orange-700 flex items-center gap-2 hover:bg-orange-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Preview/Download challan ${selectedChallan?.challan_no || ''} bilties as PDF`}
              >
                <Eye className="w-4 h-4" />
                {selectedChallan ? `CHALLAN - ${selectedChallan.challan_no}` : 'CHALLAN'} Preview
              </button>
              <button
                onClick={onRefresh}
                className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/30 transition-colors border border-white/30"
                title="Refresh Data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransitHeader;