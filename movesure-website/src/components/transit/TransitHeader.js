'use client';

import React from 'react';
import { format } from 'date-fns';
import { Truck, Package, AlertCircle, RefreshCw, Eye, FileText, Home } from 'lucide-react';

const TransitHeader = ({ 
  userBranch, 
  user, 
  bilties, 
  transitBilties, 
  selectedBilties, 
  selectedChallan,
  onRefresh,
  onPreviewLoadingChallan,
  onPreviewChallanBilties,
  availableCount // filtered count from BiltyList
}) => {
  const getCityName = (cityCode) => {
    return cityCode || 'Unknown';
  };

  // Calculate total weight of bilties in challan
  const getTotalWeight = () => {
    return transitBilties.reduce((total, bilty) => {
      return total + (parseFloat(bilty.wt) || 0);
    }, 0).toFixed(2);
  };

  const handleDashboard = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg border border-purple-300 p-4 w-full">
      {/* Full Width Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 w-full">
        {/* Left Section - Title and Quick Info */}
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2 text-white">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold">TRANSIT</span>
          </div>
          
          <div className="hidden md:flex items-center gap-3 text-xs text-white/90">
            <span>{userBranch?.branch_name || 'Unknown'}</span>
            <span>•</span>
            <span>{user?.username}</span>
            <span>•</span>
            <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
          </div>
        </div>
        
        {/* Right Section - Stats and Actions - Full Width */}
        <div className="flex flex-col gap-2 flex-1 lg:flex-none">
          {/* Stats Row with Labels - Full Width */}
          <div className="flex items-center justify-between lg:justify-end gap-2 w-full">
            <div className="bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm flex-1 lg:flex-none min-w-[100px]">
              <Package className="w-4 h-4" />
              <div className="flex flex-col">
                <span className="text-xs opacity-90">Available</span>
                <span className="text-sm font-bold">{availableCount}</span>
              </div>
            </div>
            <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm flex-1 lg:flex-none min-w-[100px]">
              <Truck className="w-4 h-4" />
              <div className="flex flex-col">
                <span className="text-xs opacity-90">In Challan</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold">{transitBilties.length}</span>
                  {selectedChallan?.is_dispatched && (
                    <span className="px-1 bg-orange-200 text-orange-800 text-xs rounded font-bold">
                      DISP
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm flex-1 lg:flex-none min-w-[100px]">
              <Package className="w-4 h-4" />
              <div className="flex flex-col">
                <span className="text-xs opacity-90">Weight</span>
                <span className="text-sm font-bold">{getTotalWeight()}kg</span>
              </div>
            </div>
            <div className="bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm flex-1 lg:flex-none min-w-[100px]">
              <AlertCircle className="w-4 h-4" />
              <div className="flex flex-col">
                <span className="text-xs opacity-90">Selected</span>
                <span className="text-sm font-bold">{selectedBilties.length}</span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons Row - Full Width */}
          <div className="flex items-center justify-between lg:justify-end gap-2 w-full">
            <button
              onClick={onPreviewLoadingChallan}
              disabled={bilties.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex-1 lg:flex-none justify-center min-w-[120px]"
              title="Preview/Download all available bilties as PDF"
            >
              <Eye className="w-4 h-4" />
              <span>Loading Challan</span>
            </button>
            <button
              onClick={onPreviewChallanBilties}
              disabled={!selectedChallan || transitBilties.length === 0}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex-1 lg:flex-none justify-center min-w-[120px]"
              title={`Preview/Download challan ${selectedChallan?.challan_no || ''} bilties as PDF`}
            >
              <FileText className="w-4 h-4" />
              <span>Challan {selectedChallan ? selectedChallan.challan_no : 'Print'}</span>
            </button>
            <button
              onClick={onRefresh}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm flex-1 lg:flex-none justify-center min-w-[120px]"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs font-medium">Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransitHeader;