'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Truck, Calendar, User, Package, MapPin, Search, X } from 'lucide-react';
import { format } from 'date-fns';

export default function FinanceChallanSelector({ 
  challans, 
  selectedChallan, 
  setSelectedChallan,
  branches,
  transitDetails
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get branch name
  const getBranchName = (branchId) => {
    const branch = branches?.find(b => b.id === branchId);
    return branch?.branch_name || 'Unknown';
  };

  // Get bilty count for challan from transit details
  const getChallanBiltyCount = (challanNo) => {
    if (!transitDetails) return 0;
    return transitDetails.filter(t => t.challan_no === challanNo).length;
  };

  // Filter challans
  const filteredChallans = challans?.filter(challan => {
    // Branch filter
    if (filterBranch !== 'all' && challan.branch_id !== filterBranch) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        challan.challan_no?.toLowerCase().includes(query) ||
        challan.truck?.truck_number?.toLowerCase().includes(query) ||
        challan.driver?.name?.toLowerCase().includes(query) ||
        getBranchName(challan.branch_id).toLowerCase().includes(query)
      );
    }

    return true;
  }) || [];

  // Sort by date (most recent first)
  const sortedChallans = [...filteredChallans].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );

  const handleChallanSelect = (challan) => {
    setSelectedChallan(challan);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const clearSelection = () => {
    setSelectedChallan(null);
    setSearchQuery('');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-2" ref={dropdownRef}>
      {/* Header - Compact */}
      <div className="mb-2">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
          <Truck className="w-4 h-4 text-blue-600" />
          Challan
        </h3>
      </div>

      {/* Selected Challan Display - Compact */}
      {selectedChallan ? (
        <div className="mb-2">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-2 border border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-blue-900">
                  {selectedChallan.challan_no}
                </span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  selectedChallan.is_dispatched 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedChallan.is_dispatched ? 'Dispatched' : 'Active'}
                </span>
              </div>
              <button
                onClick={clearSelection}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1 text-gray-700">
                <MapPin className="w-3 h-3 text-blue-600" />
                <span className="font-medium truncate">{getBranchName(selectedChallan.branch_id)}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-700">
                <Truck className="w-3 h-3 text-green-600" />
                <span className="truncate">{selectedChallan.truck?.truck_number || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-700">
                <User className="w-3 h-3 text-orange-600" />
                <span className="truncate">{selectedChallan.driver?.name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-700">
                <Calendar className="w-3 h-3 text-purple-600" />
                <span className="text-[11px]">
                  {selectedChallan.date 
                    ? format(new Date(selectedChallan.date), 'dd MMM yy')
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-700">
                <Package className="w-3 h-3 text-indigo-600" />
                <span className="font-semibold">
                  {getChallanBiltyCount(selectedChallan.challan_no)} Bilties
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full mt-2 bg-blue-600 text-white px-2 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all flex items-center justify-between text-sm font-semibold"
        >
          <span>Select</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown - Compact */}
      {showDropdown && (
        <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-xl max-h-[500px] overflow-hidden flex flex-col">
          {/* Search and Filters - Compact */}
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search challan..."
                className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>
            
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            >
              <option value="all">All Branches</option>
              {branches?.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name}
                </option>
              ))}
            </select>

            <div className="mt-1 text-[10px] text-gray-600">
              {sortedChallans.length} of {challans?.length || 0}
            </div>
          </div>

          {/* Challan List - Compact */}
          <div className="overflow-y-auto flex-1">
            {sortedChallans.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Package className="w-8 h-8 mx-auto mb-1 text-gray-400" />
                <p className="text-xs">No challans</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {sortedChallans.map(challan => {
                  const biltyCount = getChallanBiltyCount(challan.challan_no);
                  const isSelected = selectedChallan?.id === challan.id;

                  return (
                    <button
                      key={challan.id}
                      onClick={() => handleChallanSelect(challan)}
                      className={`w-full p-2 hover:bg-blue-50 transition-colors text-left ${
                        isSelected ? 'bg-blue-100 border-l-2 border-l-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="font-bold text-gray-900 text-xs mb-0.5">
                            {challan.challan_no}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-600">
                            <MapPin className="w-2 h-2" />
                            <span className="truncate max-w-[100px]">{getBranchName(challan.branch_id)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                            challan.is_dispatched 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {challan.is_dispatched ? 'Disp' : 'Active'}
                          </span>
                          <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full text-[9px] font-semibold">
                            {biltyCount}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-600">
                        <div className="flex items-center gap-1 truncate">
                          <Truck className="w-2 h-2 flex-shrink-0" />
                          <span className="truncate">{challan.truck?.truck_number || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <User className="w-2 h-2 flex-shrink-0" />
                          <span className="truncate">{challan.driver?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-2 text-[9px]">
                          <Calendar className="w-2 h-2" />
                          <span>
                            {challan.date 
                              ? format(new Date(challan.date), 'dd MMM yy')
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats - Compact */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-blue-50 rounded-lg p-1.5">
            <div className="text-[10px] text-blue-600 font-semibold">Total</div>
            <div className="text-sm font-bold text-blue-900">
              {challans?.length || 0}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-1.5">
            <div className="text-[10px] text-green-600 font-semibold">Dispatched</div>
            <div className="text-sm font-bold text-green-900">
              {challans?.filter(c => c.is_dispatched).length || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
