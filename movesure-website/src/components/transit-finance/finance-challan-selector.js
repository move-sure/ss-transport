'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Truck, Calendar, User, Package, MapPin, Search, X, Loader2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function FinanceChallanSelector({ 
  challans, 
  selectedChallan, 
  setSelectedChallan,
  branches,
  transitDetails,
  hasMoreChallans = false,
  loadingMore = false,
  onLoadMore
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

  // Filter challans - ONLY SHOW DISPATCHED CHALLANS
  const filteredChallans = challans?.filter(challan => {
    // Only show dispatched challans
    if (!challan.is_dispatched) {
      return false;
    }

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
    <div className="bg-white rounded-xl shadow-lg p-3 relative" ref={dropdownRef}>
      {/* Selected Challan Display - Full Width Horizontal */}
      {selectedChallan ? (
        <div>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Challan Info */}
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-xs text-gray-600 font-medium">Challan</div>
                    <div className="text-lg font-bold text-blue-900">{selectedChallan.challan_no}</div>
                  </div>
                </div>
                
                <div className="h-10 w-px bg-gray-300"></div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    selectedChallan.is_dispatched 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedChallan.is_dispatched ? 'Dispatched' : 'Active'}
                  </span>
                </div>
                
                <div className="h-10 w-px bg-gray-300"></div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-xs text-gray-600">Branch</div>
                    <div className="text-sm font-semibold text-gray-900">{getBranchName(selectedChallan.branch_id)}</div>
                  </div>
                </div>
                
                <div className="h-10 w-px bg-gray-300"></div>
                
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-green-600" />
                  <div>
                    <div className="text-xs text-gray-600">Vehicle</div>
                    <div className="text-sm font-semibold text-gray-900">{selectedChallan.truck?.truck_number || 'N/A'}</div>
                  </div>
                </div>
                
                <div className="h-10 w-px bg-gray-300"></div>
                
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-600" />
                  <div>
                    <div className="text-xs text-gray-600">Driver</div>
                    <div className="text-sm font-semibold text-gray-900">{selectedChallan.driver?.name || 'N/A'}</div>
                  </div>
                </div>
                
                <div className="h-10 w-px bg-gray-300"></div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="text-xs text-gray-600">Date</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {selectedChallan.date ? format(new Date(selectedChallan.date), 'dd MMM yy') : 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div className="h-10 w-px bg-gray-300"></div>
                
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-xs text-gray-600">Bilties</div>
                    <div className="text-sm font-bold text-indigo-900">
                      {getChallanBiltyCount(selectedChallan.challan_no)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-2"
                >
                  Change
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                <button
                  onClick={clearSelection}
                  className="text-gray-400 hover:text-red-600 transition-colors p-2"
                  title="Clear Selection"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-between text-sm font-semibold"
        >
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            <span>Select a Challan to View Bilties</span>
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown - Absolute Positioned */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 border border-gray-200 rounded-lg bg-white shadow-xl max-h-[500px] overflow-hidden flex flex-col z-50">
          {/* Search and Filters - Compact */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search challan..."
                  className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>
              
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              >
                <option value="all">All Branches</option>
                {branches?.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[10px] text-gray-600 flex items-center justify-between">
              <span>{sortedChallans.length} challan(s) found • {challans?.filter(c => c.is_dispatched).length || 0} dispatched</span>
              {hasMoreChallans && (
                <span className="text-blue-600 font-semibold">
                  • More available (showing {challans?.length || 0})
                </span>
              )}
            </div>
          </div>

          {/* Challan List - Horizontal Grid */}
          <div className="overflow-y-auto flex-1 p-3">
            {sortedChallans.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No dispatched challans found</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  {sortedChallans.map(challan => {
                    const biltyCount = getChallanBiltyCount(challan.challan_no);
                    const isSelected = selectedChallan?.id === challan.id;

                    return (
                      <button
                        key={challan.id}
                        onClick={() => handleChallanSelect(challan)}
                        className={`p-3 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                          isSelected 
                            ? 'bg-blue-100 border-blue-600' 
                            : 'bg-white border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-bold text-gray-900 text-sm">
                            {challan.challan_no}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            challan.is_dispatched 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {challan.is_dispatched ? 'Disp' : 'Active'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-600 flex-shrink-0" />
                            <span className="truncate font-medium">{getBranchName(challan.branch_id)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Truck className="w-3 h-3 text-green-600 flex-shrink-0" />
                            <span className="truncate">{challan.truck?.truck_number || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-orange-600 flex-shrink-0" />
                            <span className="truncate">{challan.driver?.name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-purple-600" />
                              <span className="text-[10px]">
                                {challan.date ? format(new Date(challan.date), 'dd MMM yy') : 'N/A'}
                              </span>
                            </div>
                            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              {biltyCount} <Package className="w-2.5 h-2.5 inline" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Load More Button */}
                {hasMoreChallans && onLoadMore && (
                  <div className="flex justify-center pt-2 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadMore();
                      }}
                      disabled={loadingMore}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading More...
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-4 h-4" />
                          Load More Challans
                        </>
                      )}
                    </button>
                  </div>
                )}

                {!hasMoreChallans && sortedChallans.length > 0 && (
                  <div className="text-center text-xs text-gray-500 py-2 border-t border-gray-200">
                    All challans loaded ({sortedChallans.length} total)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
