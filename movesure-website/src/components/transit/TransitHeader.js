'use client';

import React from 'react';
import { format } from 'date-fns';
import { Truck, Package, AlertCircle, RefreshCw, Eye, FileText, Home, Bug } from 'lucide-react';

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
  onDebugBilty
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
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-xl border-2 border-purple-300" style={{ backgroundColor: '#fbfaf9' }}>
      {/* Header Section */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
          {/* Left Section - Title and Branch Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 text-white mb-4">
              <div className="bg-white/20 p-2 rounded-lg">
                <Truck className="w-8 h-8" />
              </div>
              <span className="text-2xl font-bold">TRANSIT MANAGEMENT</span>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="bg-white border-2 border-purple-300 p-3 rounded-lg shadow-md">
                <span className="text-purple-600 font-bold block text-xs uppercase tracking-wide">BRANCH</span>
                <div className="font-bold text-base text-black">{userBranch?.branch_name || 'Unknown'}</div>
                <div className="text-xs text-purple-800">{getCityName(userBranch?.city_code || '')}</div>
              </div>
              <div className="bg-white border-2 border-purple-300 p-3 rounded-lg shadow-md">
                <span className="text-purple-600 font-bold block text-xs uppercase tracking-wide">USER</span>
                <div className="font-bold text-base text-black">{user?.username}</div>
                <div className="text-xs text-purple-800">{user?.email}</div>
              </div>
              <div className="bg-white border-2 border-purple-300 p-3 rounded-lg shadow-md">
                <span className="text-purple-600 font-bold block text-xs uppercase tracking-wide">DATE</span>
                <div className="font-bold text-base text-black">{format(new Date(), 'dd/MM/yyyy')}</div>
                <div className="text-xs text-purple-800">{format(new Date(), 'EEEE')}</div>
              </div>
              <div className="bg-white border-2 border-purple-300 p-3 rounded-lg shadow-md">
                <span className="text-purple-600 font-bold block text-xs uppercase tracking-wide">TIME</span>
                <div className="font-bold text-base text-black">{format(new Date(), 'HH:mm')}</div>
                <div className="text-xs text-purple-800">IST</div>
              </div>
            </div>
          </div>
          
          {/* Right Section - Stats and Actions */}
          <div className="flex flex-col gap-4">            {/* Stats Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-white border-2 border-green-400 text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg">
                <Package className="w-4 h-4 text-green-600" />
                Available: <span className="text-green-700">{bilties.length}</span>
              </div>
              <div className="bg-white border-2 border-yellow-400 text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg">
                <Truck className="w-4 h-4 text-yellow-600" />
                In Challan: <span className="text-yellow-700">{transitBilties.length}</span>
              </div>
              <div className="bg-white border-2 border-orange-400 text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg">
                <Package className="w-4 h-4 text-orange-600" />
                Weight: <span className="text-orange-700">{getTotalWeight()} kg</span>
              </div>
              <div className="bg-white border-2 border-purple-400 text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                Selected: <span className="text-purple-700">{selectedBilties.length}</span>
              </div>
            </div>
            
            {/* Action Buttons Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleDashboard}
                className="bg-white text-black border-2 border-purple-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-50 hover:border-purple-600 transition-all text-sm shadow-lg"
                title="Go to Dashboard"
              >
                <Home className="w-4 h-4 text-purple-600" />
                Dashboard
              </button>
              <button
                onClick={onPreviewLoadingChallan}
                disabled={bilties.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold border-2 border-green-700 flex items-center gap-2 hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                title="Preview/Download all available bilties as PDF"
              >
                <Eye className="w-4 h-4" />
                Loading Challan
              </button>
              <button
                onClick={onPreviewChallanBilties}
                disabled={!selectedChallan || transitBilties.length === 0}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold border-2 border-orange-700 flex items-center gap-2 hover:bg-orange-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                title={`Preview/Download challan ${selectedChallan?.challan_no || ''} bilties as PDF`}
              >
                <Eye className="w-4 h-4" />
                {selectedChallan ? `CHALLAN - ${selectedChallan.challan_no}` : 'CHALLAN'} Preview
              </button>              <button
                onClick={onRefresh}
                className="bg-white text-black border-2 border-purple-400 p-2 rounded-lg hover:bg-purple-50 hover:border-purple-600 transition-all shadow-lg"
                title="Refresh Data"
              >
                <RefreshCw className="w-5 h-5 text-purple-600" />
              </button>
              {onDebugBilty && (
                <button
                  onClick={() => onDebugBilty('A00013')}
                  className="bg-red-600 text-white border-2 border-red-700 px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700 transition-colors text-sm shadow-lg"
                  title="Debug A00013 bilty"
                >
                  <Bug className="w-4 h-4" />
                  Debug A00013
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransitHeader;