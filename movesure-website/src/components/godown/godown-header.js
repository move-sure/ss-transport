'use client';

import React from 'react';
import { 
  Package, 
  RefreshCw, 
  BarChart3, 
  Building,
  MapPin
} from 'lucide-react';

export default function GodownHeader({ stats, onRefresh, loading }) {
  return (
    <div className="mb-6">
      {/* Main Header */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">
                Godown Management
              </h1>
              <p className="text-slate-600 text-sm lg:text-base">
                Track and manage all bilty records for godown operations
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Bilties */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Total Bilties
              </p>
              <p className="text-xl lg:text-2xl font-bold text-slate-800">
                {stats.totalBilties.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Filtered Count */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Showing
              </p>
              <p className="text-xl lg:text-2xl font-bold text-slate-800">
                {stats.filteredCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Regular Bilties */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Building className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Regular
              </p>
              <p className="text-xl lg:text-2xl font-bold text-slate-800">
                {stats.regularCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Station Bilties */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Station
              </p>
              <p className="text-xl lg:text-2xl font-bold text-slate-800">
                {stats.stationCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Total Bags */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Package className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Total Bags
              </p>
              <p className="text-xl lg:text-2xl font-bold text-slate-800">
                {stats.totalBags.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
