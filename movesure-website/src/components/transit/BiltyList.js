'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Package, Calendar, CreditCard, Trash2, CheckSquare, Square, Truck, Plus, X, Eye, RefreshCw } from 'lucide-react';
import supabase from '../../app/utils/supabase';

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
  onRefresh, // Add refresh function prop
  saving,
  cities = [], // Add cities prop for mapping
  totalAvailableCount = 0, // Add total available count prop
  onFilteredCountChange // Add callback for filtered count
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [filterBiltyType, setFilterBiltyType] = useState('all');
  
  // Transit bilty filters
  const [transitSearchTerm, setTransitSearchTerm] = useState('');
  const [transitFilterPaymentMode, setTransitFilterPaymentMode] = useState('all');
  const [transitFilterDate, setTransitFilterDate] = useState('');
  const [transitFilterCity, setTransitFilterCity] = useState('all');
  const [transitFilterBiltyType, setTransitFilterBiltyType] = useState('all');
  
  const [filteredBilties, setFilteredBilties] = useState([]);
  const [filteredTransitBilties, setFilteredTransitBilties] = useState([]);
  const [fullyFilteredBilties, setFullyFilteredBilties] = useState([]);
  // City mapping function
  const getCityName = (cityCode) => {
    if (!cityCode) return '';
    const city = cities.find(c => c.city_code === cityCode);
    return city ? city.city_name : cityCode;
  };

  // City mapping by ID for regular bilties
  const getCityNameById = (cityId) => {
    if (!cityId) return '';
    const city = cities.find(c => c.id === cityId);
    return city ? city.city_name : '';
  };

  // Get display city for bilty (handles both regular and station bilties)
  const getBiltyDisplayCity = (bilty) => {
    // If to_city_name is already set and is a proper city name, use it
    if (bilty.to_city_name && bilty.to_city_name !== 'Unknown' && bilty.to_city_name.length > 2) {
      return bilty.to_city_name;
    }

    // For station bilties, try to map using city_code
    if (bilty.bilty_type === 'station' || bilty.source === 'station_bilty_summary') {
      const cityFromCode = getCityName(bilty.station || bilty.to_city_code);
      if (cityFromCode) return cityFromCode;
    }

    // For regular bilties, try to map using to_city_id
    if (bilty.to_city_id) {
      const cityFromId = getCityNameById(bilty.to_city_id);
      if (cityFromId) return cityFromId;
    }

    // Fallback to existing to_city_name or Unknown
    return bilty.to_city_name || 'Unknown';
  };
  
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

  // Sort function for destination city names alphabetically
  const sortByDestinationCity = (a, b) => {
    const cityA = getBiltyDisplayCity(a).toUpperCase();
    const cityB = getBiltyDisplayCity(b).toUpperCase();
    
    // First sort by destination city alphabetically
    const cityCompare = cityA.localeCompare(cityB);
    if (cityCompare !== 0) return cityCompare;
    
    // If same city, then sort by GR number
    const grA = a.gr_no || '';
    const grB = b.gr_no || '';
    
    // Extract alphabetic prefix and numeric part for GR number sorting
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
  };  // Filter bilties based on search and filters
  useEffect(() => {
    const applyFilters = (biltiesArray, searchTerm, paymentMode, date, city, biltyType, isTransitBilties = false) => {
      if (!biltiesArray || biltiesArray.length === 0) return [];
      
      const filtered = biltiesArray.filter(bilty => {
        const searchLower = searchTerm.toLowerCase();
        const biltyDisplayCity = getBiltyDisplayCity(bilty);
        
        // Filter out cancelled bilties
        const isCancelBilty = (bilty.consignor_name === 'CANCEL BILTY' || bilty.consignor === 'CANCEL BILTY');
        if (isCancelBilty && !isTransitBilties) {
          return false; // Don't show cancelled bilties in available list
        }
        
        const matchesSearch = !searchTerm || 
          (bilty.gr_no || '').toLowerCase().includes(searchLower) ||
          (bilty.consignor_name || bilty.consignor || '').toLowerCase().includes(searchLower) ||
          (bilty.consignee_name || bilty.consignee || '').toLowerCase().includes(searchLower) ||
          (biltyDisplayCity || '').toLowerCase().includes(searchLower) ||
          (bilty.pvt_marks || '').toLowerCase().includes(searchLower);
        
        const matchesPayment = paymentMode === 'all' || 
          bilty.payment_mode === paymentMode || 
          bilty.payment_status === paymentMode;
        
        const matchesDate = !date || 
          bilty.bilty_date === date || 
          (bilty.created_at && bilty.created_at.split('T')[0] === date);
        
        const matchesCity = city === 'all' || (biltyDisplayCity || '').toLowerCase().includes(city.toLowerCase());
        const matchesBiltyType = biltyType === 'all' || bilty.bilty_type === biltyType;
        
        return matchesSearch && matchesPayment && matchesDate && matchesCity && matchesBiltyType;
      });
      
      // Use destination city sorting for transit bilties, GR number sorting for available bilties
      return filtered.sort(isTransitBilties ? sortByDestinationCity : sortByGRNumber);
    };

    // Combine both regular bilties and station bilties
    const allAvailableBilties = [...(bilties || []), ...(stationBilties || [])];
    setFilteredBilties(applyFilters(allAvailableBilties, searchTerm, filterPaymentMode, filterDate, filterCity, filterBiltyType, false));
    setFilteredTransitBilties(applyFilters(transitBilties || [], transitSearchTerm, transitFilterPaymentMode, transitFilterDate, transitFilterCity, transitFilterBiltyType, true));
  }, [bilties, stationBilties, transitBilties, searchTerm, filterPaymentMode, filterDate, filterCity, filterBiltyType, transitSearchTerm, transitFilterPaymentMode, transitFilterDate, transitFilterCity, transitFilterBiltyType]);

  // Effect to filter out bilties whose gr_no exists in transit_details
  useEffect(() => {
    async function filterBiltiesByTransit() {
      if (!filteredBilties || filteredBilties.length === 0) {
        setFullyFilteredBilties([]);
        // Notify parent of the filtered count
        if (onFilteredCountChange) {
          onFilteredCountChange(0);
        }
        return;
      }
      // Get all gr_no from filteredBilties
      const grNos = filteredBilties.map(b => b.gr_no).filter(Boolean);
      if (grNos.length === 0) {
        setFullyFilteredBilties(filteredBilties);
        // Notify parent of the filtered count
        if (onFilteredCountChange) {
          onFilteredCountChange(filteredBilties.length);
        }
        return;
      }
      // Query transit_details for these gr_no
      const { data: transitRecords, error } = await supabase
        .from('transit_details')
        .select('gr_no')
        .in('gr_no', grNos);
      if (error) {
        // On error, fallback to showing all
        setFullyFilteredBilties(filteredBilties);
        // Notify parent of the filtered count
        if (onFilteredCountChange) {
          onFilteredCountChange(filteredBilties.length);
        }
        return;
      }
      const transitGRSet = new Set((transitRecords || []).map(t => t.gr_no));
      // Remove bilties whose gr_no is in transit_details
      const filtered = filteredBilties.filter(b => !transitGRSet.has(b.gr_no));
      setFullyFilteredBilties(filtered);
      
      // Notify parent of the filtered count
      if (onFilteredCountChange) {
        onFilteredCountChange(filtered.length);
      }
    }
    filterBiltiesByTransit();
  }, [filteredBilties]);

  const handleBiltySelect = (bilty) => {
    // Only allow selection of regular bilties, not transit bilties, and not for dispatched challans
    if (bilty.in_transit || selectedChallan?.is_dispatched) return;
    
    setSelectedBilties(prev => {
      const isSelected = prev.find(b => b.id === bilty.id && b.bilty_type === bilty.bilty_type);
      if (isSelected) {
        return prev.filter(b => !(b.id === bilty.id && b.bilty_type === bilty.bilty_type));
      } else {
        return [...prev, bilty];
      }
    });
  };

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
  // Get unique cities and bilty types for filter options
  const getAvailableCities = (biltiesArray) => {
    if (!biltiesArray || biltiesArray.length === 0) return [];
    const cities = [...new Set(biltiesArray.map(bilty => {
      return getBiltyDisplayCity(bilty);
    }).filter(Boolean))];
    return cities.sort();
  };

  const getAvailableBiltyTypes = (biltiesArray) => {
    if (!biltiesArray || biltiesArray.length === 0) return [];
    const types = [...new Set(biltiesArray.map(bilty => bilty.bilty_type).filter(Boolean))];
    return types.sort();
  };

  const availableCities = getAvailableCities([...(bilties || []), ...(stationBilties || [])]);
  const transitCities = getAvailableCities(transitBilties || []);
  const availableBiltyTypes = getAvailableBiltyTypes([...(bilties || []), ...(stationBilties || [])]);
  const transitBiltyTypes = getAvailableBiltyTypes(transitBilties || []);
  const getPaymentModeColor = (mode) => {
    switch (mode) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'to-pay':
        return 'bg-yellow-100 text-yellow-800';
      case 'freeofcost':
      case 'foc':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Challan Bilties Section - Show when challan is selected */}
      {selectedChallan && (
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
              </h3>              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRefresh?.('transit')}
                  disabled={saving}
                  className="bg-white/20 text-white px-3 py-1 rounded text-sm font-bold border border-white/30 flex items-center gap-1 hover:bg-white/30 transition-colors disabled:opacity-50"
                  title="Refresh transit bilties"
                >
                  <RefreshCw className={`w-3 h-3 ${saving ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                {!selectedChallan.is_dispatched && filteredTransitBilties.length > 0 && (
                  <>                    <button
                      onClick={handleSelectAllTransit}
                      disabled={selectedChallan?.is_dispatched}
                      className="bg-white/20 text-white px-3 py-1 rounded text-sm font-bold border border-white/30 flex items-center gap-1 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={selectedChallan?.is_dispatched ? "Cannot select bilties in dispatched challan" : "Select/Deselect all"}
                    >
                      {selectedTransitBilties.length === filteredTransitBilties.length && filteredTransitBilties.length > 0 ? (
                        <CheckSquare className="w-3 h-3" />
                      ) : (
                        <Square className="w-3 h-3" />
                      )}
                      {selectedChallan?.is_dispatched ? 'All (Locked)' : 'All'}
                    </button><button
                      onClick={onBulkRemoveFromTransit}
                      disabled={selectedTransitBilties.length === 0 || saving || selectedChallan?.is_dispatched}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold border border-red-700 flex items-center gap-1 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={selectedChallan?.is_dispatched ? "Cannot remove from dispatched challan" : "Remove selected bilties"}
                    >
                      <Trash2 className="w-3 h-3" />
                      {selectedChallan?.is_dispatched ? 'Locked' : `Remove (${selectedTransitBilties.length})`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Transit Bilties Filters */}
          <div className="p-2 border-b border-yellow-200 bg-yellow-50">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                <input
                  type="text"
                  placeholder="Search transit..."
                  value={transitSearchTerm}
                  onChange={(e) => setTransitSearchTerm(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 text-black bg-white"
                />
              </div>
              <select
                value={transitFilterPaymentMode}
                onChange={(e) => setTransitFilterPaymentMode(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 text-black bg-white"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="to-pay">To Pay</option>
                <option value="freeofcost">Free</option>
              </select>
              <select
                value={transitFilterCity}
                onChange={(e) => setTransitFilterCity(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 text-black bg-white"
              >
                <option value="all">All Cities</option>
                {transitCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <select
                value={transitFilterBiltyType}
                onChange={(e) => setTransitFilterBiltyType(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 text-black bg-white"
              >
                <option value="all">All Types</option>
                <option value="regular">REG</option>
                <option value="station">MNL</option>
              </select>
              <input
                type="date"
                value={transitFilterDate}
                onChange={(e) => setTransitFilterDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 text-black bg-white"
              />
            </div>
          </div>

          {/* Transit Bilties Table */}
          {filteredTransitBilties.length > 0 ? (
            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-sm min-w-max">
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
                    <th className="px-2 py-2 text-left font-medium text-yellow-800 w-28">Consignor</th>
                    <th className="px-2 py-2 text-left font-medium text-yellow-800 w-28">Consignee</th>
                    <th className="px-2 py-2 text-left font-medium text-yellow-800 w-26">Content</th>
                    <th className="px-2 py-2 text-left font-medium text-yellow-800 w-22">Destination</th>
                    <th className="px-2 py-2 text-left font-medium text-yellow-800 w-20">PVT Marks</th>
                    <th className="px-2 py-2 text-left font-medium text-yellow-800 w-16">Payment</th>                    <th className="px-2 py-2 text-left font-medium text-yellow-800 w-12">Pkgs</th>
                    <th className="px-2 py-2 text-left font-medium text-yellow-800 w-16">Weight</th>
                    <th className="px-2 py-2 text-left font-medium text-yellow-800 w-20">Amount</th>
                    {!selectedChallan?.is_dispatched && (
                      <th className="px-2 py-2 text-left font-medium text-yellow-800 w-16">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-yellow-200">                  {filteredTransitBilties.map((bilty, index) => {
                    const isSelected = selectedTransitBilties.find(b => b.id === bilty.id && b.bilty_type === bilty.bilty_type);
                    const isDispatched = bilty.is_dispatched || selectedChallan?.is_dispatched;
                    
                    return (
                      <tr 
                        key={`transit-${bilty.id}-${bilty.bilty_type}`} 
                        className={`hover:bg-yellow-50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-yellow-100' : ''
                        } ${isDispatched ? 'bg-gray-50 opacity-75' : ''}`}
                        onClick={() => !isDispatched && handleTransitBiltySelect(bilty)}
                      >
                        {!isDispatched && (
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
                        {isDispatched && (
                          <td className="px-2 py-2">
                            <span className="text-orange-600 text-xs font-bold">🔒</span>
                          </td>
                        )}
                        <td className="px-2 py-2 text-gray-900">{index + 1}</td>
                        <td className="px-2 py-2">
                          <span className={`px-1 py-0.5 text-xs font-bold rounded ${
                            bilty.bilty_type === 'station' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {bilty.bilty_type === 'station' ? 'MNL' : 'REG'}
                          </span>
                          {isDispatched && (
                            <span className="ml-1 px-1 py-0.5 text-xs font-bold rounded bg-orange-100 text-orange-800">
                              DISP
                            </span>
                          )}
                        </td><td className="px-2 py-2">
                          <div className="font-bold text-yellow-800 truncate">{bilty.gr_no}</div>
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {bilty.bilty_date ? format(new Date(bilty.bilty_date), 'dd/MM') : 
                           bilty.created_at ? format(new Date(bilty.created_at), 'dd/MM') : '-'}
                        </td>
                        <td className="px-2 py-2 text-gray-900 truncate max-w-28" title={bilty.consignor_name || bilty.consignor}>
                          {bilty.consignor_name || bilty.consignor}
                        </td>
                        <td className="px-2 py-2 text-gray-900 truncate max-w-28" title={bilty.consignee_name || bilty.consignee}>
                          {bilty.consignee_name || bilty.consignee}
                        </td>
                        <td className="px-2 py-2 text-gray-600 truncate max-w-26" title={bilty.contain || bilty.contents}>
                          {bilty.contain || bilty.contents || '-'}
                        </td>
                        <td className="px-2 py-2 text-gray-600 truncate max-w-22">
                          {getBiltyDisplayCity(bilty)}
                        </td>                        <td className="px-2 py-2 text-gray-600 truncate max-w-20" title={bilty.pvt_marks}>
                          {bilty.pvt_marks || '-'}
                        </td>
                        <td className="px-2 py-2">
                          <span className={`px-1 py-0.5 text-xs font-bold rounded ${getPaymentModeColor(bilty.payment_mode || bilty.payment_status)}`}>
                            {(bilty.payment_mode || bilty.payment_status) === 'paid' ? 'PD' : 
                             (bilty.payment_mode || bilty.payment_status) === 'to-pay' ? 'TP' : 
                             (bilty.payment_mode || bilty.payment_status) === 'freeofcost' || (bilty.payment_mode || bilty.payment_status) === 'foc' ? 'FC' : 'N/A'}
                          </span>
                        </td>                        <td className="px-2 py-2 text-gray-900">{bilty.no_of_pkg || bilty.no_of_packets}</td>
                        <td className="px-2 py-2 text-gray-900">{bilty.wt || bilty.weight || 0}</td>
                        <td className="px-2 py-2 font-bold text-gray-900">₹{bilty.total || bilty.amount}</td>
                        {!isDispatched && (
                          <td className="px-2 py-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveBiltyFromTransit?.(bilty);
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white rounded p-1 transition-colors"
                              title="Remove from Transit"
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
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <div className="text-lg font-semibold mb-1">No Transit Bilties Found</div>
              <div className="text-gray-400 text-sm">
                {transitSearchTerm || transitFilterPaymentMode !== 'all' || transitFilterDate || transitFilterCity !== 'all' || transitFilterBiltyType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No bilties in this challan'
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regular Available Bilties Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
          <div className="flex items-center justify-between">            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Available Bilties ({fullyFilteredBilties.length})
              {totalAvailableCount > 0 && (
                <span className="text-blue-200 text-sm font-normal">
                  • Total: {totalAvailableCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onRefresh?.('bilties')}
                disabled={saving}
                className="bg-white/20 text-white px-3 py-1 rounded text-sm font-bold border border-white/30 flex items-center gap-1 hover:bg-white/30 transition-colors disabled:opacity-50"
                title="Refresh available bilties"
              >
                <RefreshCw className={`w-3 h-3 ${saving ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleSelectAll}
                disabled={selectedChallan?.is_dispatched}
                className="bg-white/20 text-white px-3 py-1 rounded text-sm font-bold border border-white/30 flex items-center gap-1 hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                {selectedBilties.length === fullyFilteredBilties.length && fullyFilteredBilties.length > 0 ? (
                  <CheckSquare className="w-3 h-3" />
                ) : (
                  <Square className="w-3 h-3" />
                )}
                {selectedBilties.length === fullyFilteredBilties.length && fullyFilteredBilties.length > 0 
                  ? 'Deselect All' 
                  : `Select All (${fullyFilteredBilties.length})`
                }
              </button>
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
        </div>

        {/* Available Bilties Filters */}
        <div className="p-2 border-b border-blue-200 bg-blue-50">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                type="text"
                placeholder="Search available..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-6 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
              />
            </div>
            <select
              value={filterPaymentMode}
              onChange={(e) => setFilterPaymentMode(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="to-pay">To Pay</option>
              <option value="freeofcost">Free</option>
            </select>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
            >
              <option value="all">All Cities</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <select
              value={filterBiltyType}
              onChange={(e) => setFilterBiltyType(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
            >
              <option value="all">All Types</option>
              <option value="regular">REG</option>
              <option value="station">MNL</option>
            </select>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
            />
          </div>
        </div>

        {/* Selection Summary */}
        {selectedBilties.length > 0 && (
          <div className="p-3 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800 font-medium">{selectedBilties.length} bilties selected</span>
              <button
                onClick={() => setSelectedBilties([])}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Available Bilties Table */}
        <div className="overflow-x-auto min-w-full">
          {fullyFilteredBilties.length > 0 ? (
            <table className="w-full text-sm min-w-max">
              <thead className="bg-blue-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left w-8">
                    <button
                      onClick={handleSelectAll}
                      disabled={selectedChallan?.is_dispatched}
                      className="flex items-center gap-1 text-blue-800 font-medium disabled:opacity-50 text-sm"
                    >
                      {selectedBilties.length === fullyFilteredBilties.length && fullyFilteredBilties.length > 0 ? (
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
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-28">Consignor</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-28">Consignee</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-26">Content</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-22">Destination</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-20">PVT Marks</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-16">Payment</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-12">Pkgs</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-16">Weight</th>
                  <th className="px-3 py-2 text-left font-medium text-blue-800 w-20">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">                {fullyFilteredBilties.map((bilty, index) => {
                  const isSelected = selectedBilties.find(b => b.id === bilty.id);
                  return (
                    <tr 
                      key={bilty.id} 
                      className={`transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-100 border-l-4 border-blue-500' 
                          : 'hover:bg-gray-50'
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
                          {bilty.bilty_type === 'station' ? 'MNL' : 'REG'}
                        </span>
                      </td>                      <td className="px-3 py-2">
                        <div className="font-bold text-blue-800 truncate">{bilty.gr_no}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {bilty.bilty_date ? format(new Date(bilty.bilty_date), 'dd/MM') : 
                         bilty.created_at ? format(new Date(bilty.created_at), 'dd/MM') : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-900 truncate max-w-28" title={bilty.consignor_name || bilty.consignor}>
                        {bilty.consignor_name || bilty.consignor}
                      </td>
                      <td className="px-3 py-2 text-gray-900 truncate max-w-28" title={bilty.consignee_name || bilty.consignee}>
                        {bilty.consignee_name || bilty.consignee}
                      </td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-26" title={bilty.contain || bilty.contents}>
                        {bilty.contain || bilty.contents || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-22">
                        {getBiltyDisplayCity(bilty)}
                      </td>                      <td className="px-3 py-2 text-gray-600 truncate max-w-20" title={bilty.pvt_marks}>
                        {bilty.pvt_marks || '-'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${getPaymentModeColor(bilty.payment_mode || bilty.payment_status)}`}>
                          {(bilty.payment_mode || bilty.payment_status) === 'paid' ? 'PD' : 
                           (bilty.payment_mode || bilty.payment_status) === 'to-pay' ? 'TP' : 
                           (bilty.payment_mode || bilty.payment_status) === 'freeofcost' || (bilty.payment_mode || bilty.payment_status) === 'foc' ? 'FC' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-900">{bilty.no_of_pkg || bilty.no_of_packets}</td>
                      <td className="px-3 py-2 text-gray-900">{bilty.wt || bilty.weight || 0}</td>
                      <td className="px-3 py-2 font-bold text-gray-900">₹{bilty.total || bilty.amount}</td>
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
                {searchTerm || filterPaymentMode !== 'all' || filterDate || filterCity !== 'all' || filterBiltyType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No available bilties'
                }
              </div>
            </div>
          )}
        </div>

        {/* Compact Footer */}
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
