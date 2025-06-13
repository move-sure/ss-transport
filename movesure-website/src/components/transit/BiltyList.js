'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Package, Calendar, CreditCard, Trash2, CheckSquare, Square, Truck, Plus, X, Eye } from 'lucide-react';

const BiltyList = ({ 
  bilties, 
  stationBilties,
  transitBilties, 
  selectedBilties, 
  setSelectedBilties, 
  selectedTransitBilties,
  setSelectedTransitBilties,
  selectedChallan,
  onAddBiltyToTransit,
  onRemoveBiltyFromTransit,
  onBulkRemoveFromTransit,
  saving
}) => {  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filteredBilties, setFilteredBilties] = useState([]);
  const [filteredTransitBilties, setFilteredTransitBilties] = useState([]);
  
  // Transit bilty selection handler
  const handleTransitBiltySelect = (bilty) => {
    if (selectedChallan?.is_dispatched) return;
    
    setSelectedTransitBilties(prev => {
      const isSelected = prev.find(b => b.id === bilty.id && b.bilty_type === bilty.bilty_type);
      if (isSelected) {
        return prev.filter(b => !(b.id === bilty.id && b.bilty_type === bilty.bilty_type));
      } else {
        return [...prev, bilty];
      }
    });
  };

  // Select all transit bilties
  const handleSelectAllTransit = () => {
    if (selectedChallan?.is_dispatched) return;
    
    if (selectedTransitBilties.length === filteredTransitBilties.length && filteredTransitBilties.length > 0) {
      setSelectedTransitBilties([]);
    } else {
      setSelectedTransitBilties([...filteredTransitBilties]);
    }
  };
  // Sort function for GR numbers to handle alphanumeric sorting properly
  const sortByGRNumber = (a, b) => {
    const grA = a.gr_no || '';
    const grB = b.gr_no || '';
    
    // Extract alphabetic prefix and numeric part
    const matchA = grA.match(/^([A-Za-z]*)(\d+)(.*)$/);
    const matchB = grB.match(/^([A-Za-z]*)(\d+)(.*)$/);
    
    if (!matchA && !matchB) return grA.localeCompare(grB);
    if (!matchA) return 1;
    if (!matchB) return -1;
    
    const [, prefixA, numberA, suffixA] = matchA;
    const [, prefixB, numberB, suffixB] = matchB;
    
    // First compare prefixes
    const prefixCompare = prefixA.localeCompare(prefixB);
    if (prefixCompare !== 0) return prefixCompare;
    
    // Then compare numbers numerically
    const numCompare = parseInt(numberA) - parseInt(numberB);
    if (numCompare !== 0) return numCompare;
    
    // Finally compare suffixes
    return suffixA.localeCompare(suffixB);
  };
  // Filter bilties based on search and filters
  useEffect(() => {
    const applyFilters = (biltiesArray) => {
      const filtered = biltiesArray.filter(bilty => {
        const matchesSearch = !searchTerm || 
          bilty.gr_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bilty.consignor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bilty.consignee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (bilty.to_city_name && bilty.to_city_name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesPayment = filterPaymentMode === 'all' || bilty.payment_mode === filterPaymentMode;
        const matchesDate = !filterDate || bilty.bilty_date === filterDate;
        
        return matchesSearch && matchesPayment && matchesDate;
      });
      
      // Sort by GR number in ascending order
      return filtered.sort(sortByGRNumber);
    };

    // Combine both regular bilties and station bilties
    const allAvailableBilties = [...(bilties || []), ...(stationBilties || [])];
    setFilteredBilties(applyFilters(allAvailableBilties));
    setFilteredTransitBilties(applyFilters(transitBilties));
  }, [bilties, stationBilties, transitBilties, searchTerm, filterPaymentMode, filterDate]);  const handleBiltySelect = (bilty) => {
    // Only allow selection of regular bilties, not transit bilties, and not for dispatched challans
    if (bilty.in_transit || selectedChallan?.is_dispatched) return;
    
    setSelectedBilties(prev => {
      const isSelected = prev.find(b => b.id === bilty.id && b.bilty_type === bilty.bilty_type);
      if (isSelected) {
        return prev.filter(b => !(b.id === bilty.id && b.bilty_type === bilty.bilty_type));
      } else {
        return [...prev, bilty];
      }
    });  };

  const handleBiltyDoubleClick = (bilty) => {
    if (!selectedChallan || bilty.in_transit || selectedChallan?.is_dispatched) return;
    onAddBiltyToTransit?.(bilty);
  };
  const handleSelectAll = () => {
    if (selectedChallan?.is_dispatched) return;
    
    if (selectedBilties.length === filteredBilties.length && filteredBilties.length > 0) {
      setSelectedBilties([]);
    } else {
      // Set selected bilties to all filtered bilties (already sorted)
      setSelectedBilties([...filteredBilties]);
    }
  };

  const getPaymentModeColor = (mode) => {
    switch (mode) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'to-pay':
        return 'bg-yellow-100 text-yellow-800';
      case 'freeofcost':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">      {/* Challan Bilties Section - Show when challan is selected and has bilties */}
      {selectedChallan && filteredTransitBilties.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-yellow-300 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-500 to-amber-500 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Challan: {selectedChallan.challan_no} ({filteredTransitBilties.length})
                {selectedChallan.is_dispatched && (
                  <span className="bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    DISPATCHED
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {!selectedChallan.is_dispatched && filteredTransitBilties.length > 0 && (
                  <>
                    <button
                      onClick={handleSelectAllTransit}
                      className="bg-white/20 text-white px-3 py-1 rounded text-sm font-bold border border-white/30 flex items-center gap-1 hover:bg-white/30 transition-colors"
                    >
                      {selectedTransitBilties.length === filteredTransitBilties.length && filteredTransitBilties.length > 0 ? (
                        <CheckSquare className="w-3 h-3" />
                      ) : (
                        <Square className="w-3 h-3" />
                      )}
                      All
                    </button>
                    <button
                      onClick={onBulkRemoveFromTransit}
                      disabled={selectedTransitBilties.length === 0 || saving}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold border border-red-700 flex items-center gap-1 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove ({selectedTransitBilties.length})
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>          {/* Transit Bilties Table - No scroll, full height */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-yellow-50 sticky top-0 z-10">
                <tr>
                  {!selectedChallan.is_dispatched && (
                    <th className="px-2 py-2 text-left font-medium text-yellow-800 w-8">
                      <input
                        type="checkbox"
                        checked={selectedTransitBilties.length === filteredTransitBilties.length && filteredTransitBilties.length > 0}
                        onChange={handleSelectAllTransit}
                        className="rounded border-gray-300"
                      />
                    </th>
                  )}
                  <th className="px-2 py-2 text-left font-medium text-yellow-800 w-12">#</th>
                  <th className="px-2 py-2 text-left font-medium text-yellow-800 w-16">Type</th>
                  <th className="px-2 py-2 text-left font-medium text-yellow-800 w-24">GR No</th>
                  <th className="px-2 py-2 text-left font-medium text-yellow-800 w-20">Date</th>
                  <th className="px-2 py-2 text-left font-medium text-yellow-800 w-32">Consignor</th>
                  <th className="px-2 py-2 text-left font-medium text-yellow-800 w-32">Consignee</th>
                  <th className="px-2 py-2 text-left font-medium text-yellow-800 w-24">Destination</th>
                  <th className="px-2 py-2 text-left font-medium text-yellow-800 w-16">Payment</th>
                  <th className="px-2 py-2 text-left font-medium text-yellow-800 w-12">Pkgs</th>
                  <th className="px-2 py-2 text-left font-medium text-yellow-800 w-16">Weight</th>
                  <th className="px-2 py-2 text-left font-medium text-yellow-800 w-20">Amount</th>
                  {!selectedChallan.is_dispatched && (
                    <th className="px-2 py-2 text-left font-medium text-yellow-800 w-16">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-yellow-200">
                {filteredTransitBilties.map((bilty, index) => {
                  const isSelected = selectedTransitBilties.find(b => b.id === bilty.id && b.bilty_type === bilty.bilty_type);
                  return (
                    <tr 
                      key={`transit-${bilty.id}-${bilty.bilty_type}`} 
                      className={`hover:bg-yellow-50 transition-colors cursor-pointer ${isSelected ? 'bg-yellow-100' : ''}`}
                      onClick={() => !selectedChallan.is_dispatched && handleTransitBiltySelect(bilty)}
                    >
                      {!selectedChallan.is_dispatched && (
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleTransitBiltySelect(bilty);
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      <td className="px-2 py-2 text-gray-900">{index + 1}</td>
                      <td className="px-2 py-2">
                        <span className={`px-1 py-0.5 text-xs font-bold rounded ${
                          bilty.bilty_type === 'station' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {bilty.bilty_type === 'station' ? 'STN' : 'REG'}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-bold text-yellow-800 truncate">{bilty.gr_no}</div>
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {format(new Date(bilty.bilty_date), 'dd/MM')}
                      </td>
                      <td className="px-2 py-2 text-gray-900 truncate max-w-32" title={bilty.consignor_name}>
                        {bilty.consignor_name}
                      </td>
                      <td className="px-2 py-2 text-gray-900 truncate max-w-32" title={bilty.consignee_name}>
                        {bilty.consignee_name}
                      </td>
                      <td className="px-2 py-2 text-gray-600 truncate">
                        {bilty.to_city_name}
                      </td>
                      <td className="px-2 py-2">
                        <span className={`px-1 py-0.5 text-xs font-bold rounded ${getPaymentModeColor(bilty.payment_mode)}`}>
                          {bilty.payment_mode === 'paid' ? 'PD' : 
                           bilty.payment_mode === 'to-pay' ? 'TP' : 
                           bilty.payment_mode === 'freeofcost' ? 'FC' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-gray-900">{bilty.no_of_pkg}</td>
                      <td className="px-2 py-2 text-gray-900">{bilty.wt || 0}</td>
                      <td className="px-2 py-2 font-bold text-gray-900">₹{bilty.total}</td>
                      {!selectedChallan.is_dispatched && (
                        <td className="px-2 py-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveBiltyFromTransit?.(bilty);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white rounded p-1 transition-colors"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Regular Available Bilties Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Available Bilties ({filteredBilties.length})
            </h3>
            <button
              onClick={() => onAddBiltyToTransit?.(selectedBilties)}
              disabled={selectedBilties.length === 0 || !selectedChallan || selectedChallan?.is_dispatched}
              className="bg-white/20 text-white px-3 py-1 rounded text-sm font-bold border border-white/30 flex items-center gap-1 hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
              Add ({selectedBilties.length})
            </button>
          </div>
        </div>

        {/* Compact Filters */}
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
              />
            </div>
            <div className="relative">
              <CreditCard className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <select
                value={filterPaymentMode}
                onChange={(e) => setFilterPaymentMode(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="to-pay">To Pay</option>
                <option value="freeofcost">Free</option>
              </select>
            </div>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
              />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              disabled={selectedChallan?.is_dispatched}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-xs transition-colors disabled:opacity-50"
            >
              {selectedBilties.length === filteredBilties.length && filteredBilties.length > 0 ? (
                <CheckSquare className="w-3 h-3" />
              ) : (
                <Square className="w-3 h-3" />
              )}
              {selectedBilties.length === filteredBilties.length && filteredBilties.length > 0 
                ? 'Deselect All' 
                : `Select All (${filteredBilties.length})`
              }
            </button>
            
            {selectedBilties.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">{selectedBilties.length} selected</span>
                <button
                  onClick={() => setSelectedBilties([])}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-xs transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>        {/* Available Bilties Table - No scroll, full height */}
        <div className="overflow-x-auto">
          {filteredBilties.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-blue-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left w-8">
                    <button
                      onClick={handleSelectAll}
                      disabled={selectedChallan?.is_dispatched}
                      className="flex items-center gap-1 text-blue-800 font-medium disabled:opacity-50 text-sm"
                    >
                      {selectedBilties.length === filteredBilties.length && filteredBilties.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-12">#</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-16">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-24">GR No</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-20">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-32">Consignor</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-32">Consignee</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-24">Destination</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-16">Payment</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-12">Pkgs</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-16">Weight</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-20">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBilties.map((bilty, index) => {
                  const isSelected = selectedBilties.find(b => b.id === bilty.id);
                  return (
                    <tr 
                      key={bilty.id} 
                      className={`hover:bg-blue-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50' : ''
                      } ${selectedChallan?.is_dispatched ? 'opacity-50' : ''}`}
                      onClick={() => !selectedChallan?.is_dispatched && handleBiltySelect(bilty)}
                      onDoubleClick={() => handleBiltyDoubleClick(bilty)}
                      title={selectedChallan?.is_dispatched ? "Cannot modify dispatched challan" : "Double-click to add to challan"}
                    >
                      <td className="px-3 py-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!selectedChallan?.is_dispatched) {
                              handleBiltySelect(bilty);
                            }
                          }}
                          disabled={selectedChallan?.is_dispatched}
                          className="disabled:opacity-50"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-gray-900">{index + 1}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          bilty.bilty_type === 'station' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {bilty.bilty_type === 'station' ? 'STN' : 'REG'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold text-blue-800 truncate">{bilty.gr_no}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {format(new Date(bilty.bilty_date), 'dd/MM')}
                      </td>
                      <td className="px-3 py-2 text-gray-900 truncate max-w-32" title={bilty.consignor_name}>
                        {bilty.consignor_name}
                      </td>
                      <td className="px-3 py-2 text-gray-900 truncate max-w-32" title={bilty.consignee_name}>
                        {bilty.consignee_name}
                      </td>
                      <td className="px-3 py-2 text-gray-600 truncate">
                        {bilty.to_city_name}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${getPaymentModeColor(bilty.payment_mode)}`}>
                          {bilty.payment_mode === 'paid' ? 'PD' : 
                           bilty.payment_mode === 'to-pay' ? 'TP' : 
                           bilty.payment_mode === 'freeofcost' ? 'FC' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-900">{bilty.no_of_pkg}</td>
                      <td className="px-3 py-2 text-gray-900">{bilty.wt || 0}</td>
                      <td className="px-3 py-2 font-bold text-gray-900">₹{bilty.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <div className="text-lg font-semibold mb-1">No Bilties Found</div>
              <div className="text-gray-400 text-sm">
                {searchTerm || filterPaymentMode !== 'all' || filterDate
                  ? 'Try adjusting your filters'
                  : 'No available bilties'
                }
              </div>
            </div>
          )}
        </div>        {/* Compact Footer */}
        <div className="bg-blue-50 p-3 border-t border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>Tip:</strong> Click to select, double-click to add to challan
            {selectedChallan?.is_dispatched && (
              <span className="ml-2 text-red-600 font-bold">• Cannot modify dispatched challan</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiltyList;