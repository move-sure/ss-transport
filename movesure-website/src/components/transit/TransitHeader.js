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
      {/* Improved Full Width Layout */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 w-full">
        
        {/* Left Section - Title and Branch Info */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:min-w-[300px]">
          <div className="flex items-center gap-2 text-white">
            <div className="bg-white/20 p-2 rounded-lg">
              <Truck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold">TRANSIT MANAGEMENT</span>
              <span className="text-xs text-white/80">{userBranch?.branch_name || 'Unknown Branch'}</span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-2 text-xs text-white/90 bg-white/10 px-3 py-1.5 rounded-lg">
            <span className="font-medium">{user?.username}</span>
            <span>•</span>
            <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
          </div>
        </div>
        
        {/* Center Section - Stats Cards - Full Width Usage */}
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-green-500/90 hover:bg-green-500 text-white px-3 py-3 rounded-lg text-center transition-colors shadow-sm backdrop-blur-sm">
            <Package className="w-5 h-5 mx-auto mb-1" />
            <div className="text-xs opacity-90 mb-1">Available</div>
            <div className="text-lg font-bold">{availableCount}</div>
          </div>
          
          <div className="bg-yellow-500/90 hover:bg-yellow-500 text-white px-3 py-3 rounded-lg text-center transition-colors shadow-sm backdrop-blur-sm">
            <Truck className="w-5 h-5 mx-auto mb-1" />
            <div className="text-xs opacity-90 mb-1">In Transit</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-bold">{transitBilties.length}</span>
              {selectedChallan?.is_dispatched && (
                <span className="px-1 bg-orange-200 text-orange-800 text-xs rounded font-bold">
                  DISP
                </span>
              )}
            </div>
          </div>
          
          <div className="bg-orange-500/90 hover:bg-orange-500 text-white px-3 py-3 rounded-lg text-center transition-colors shadow-sm backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 mx-auto mb-1" />
            <div className="text-xs opacity-90 mb-1">Weight (kg)</div>
            <div className="text-lg font-bold">{getTotalWeight()}</div>
          </div>
          
          <div className="bg-purple-500/90 hover:bg-purple-500 text-white px-3 py-3 rounded-lg text-center transition-colors shadow-sm backdrop-blur-sm">
            <FileText className="w-5 h-5 mx-auto mb-1" />
            <div className="text-xs opacity-90 mb-1">Selected</div>
            <div className="text-lg font-bold">{selectedBilties.length}</div>
          </div>
        </div>
        
        {/* Right Section - Action Buttons */}
        <div className="flex flex-col lg:flex-row gap-2 lg:min-w-[400px]">
          <button
            onClick={onPreviewLoadingChallan}
            disabled={bilties.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm justify-center lg:flex-1"
            title="Preview/Download all available bilties as PDF"
          >
            <Eye className="w-4 h-4" />
            <span>Loading Challan</span>
          </button>
          
          <button
            onClick={onPreviewChallanBilties}
            disabled={!selectedChallan || transitBilties.length === 0}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm justify-center lg:flex-1"
            title={`Preview/Download challan ${selectedChallan?.challan_no || ''} bilties as PDF`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden lg:inline">Challan </span>
            <span>{selectedChallan?.challan_no || 'Print'}</span>
          </button>
          
          <button
            onClick={onRefresh}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm justify-center lg:w-auto"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
        
      </div>
      
      {/* Additional Info Row for Mobile */}
      <div className="lg:hidden mt-3 pt-3 border-t border-white/20">
        <div className="flex items-center justify-center gap-3 text-xs text-white/90">
          <span className="font-medium">{user?.username}</span>
          <span>•</span>
          <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
        </div>
      </div>
    </div>
  );
};

export default TransitHeader;