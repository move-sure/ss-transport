'use client';

import React from 'react';
import { Search, MapPin, X } from 'lucide-react';

export default function GodownSearchFilter({ 
  searchQuery, 
  onSearchChange, 
  selectedStation, 
  onStationChange, 
  stations 
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by GR Number, Private Marks, or Destination..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-slate-50 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Station Filter */}
        <div className="lg:w-80">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={selectedStation}
              onChange={(e) => onStationChange(e.target.value)}
              className="w-full pl-10 pr-8 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-slate-50 focus:bg-white appearance-none cursor-pointer"
            >
              <option value="">All Stations / Destinations</option>
              {stations.map((station, index) => (
                <option key={index} value={station}>
                  {station}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* Active Filters Display */}
      {(searchQuery || selectedStation) && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-slate-600 font-medium">Active Filters:</span>
            
            {searchQuery && (
              <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <Search className="w-3 h-3" />
                <span>Search: "{searchQuery}"</span>
                <button
                  onClick={() => onSearchChange('')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {selectedStation && (
              <div className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <MapPin className="w-3 h-3" />
                <span>Station: {selectedStation}</span>
                <button
                  onClick={() => onStationChange('')}
                  className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {(searchQuery || selectedStation) && (
              <button
                onClick={() => {
                  onSearchChange('');
                  onStationChange('');
                }}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium underline transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
