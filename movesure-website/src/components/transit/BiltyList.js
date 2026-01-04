'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Package, Trash2, CheckSquare, Square, Truck, Plus, X, RefreshCw, Download, Lock } from 'lucide-react';
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
  
  // Sorting states for available bilties
  const [availableSortConfig, setAvailableSortConfig] = useState({ key: null, direction: null });
  
  // Sorting states for transit bilties
  const [transitSortConfig, setTransitSortConfig] = useState({ key: null, direction: null });
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
  
  // Handle column sorting with three states: asc -> desc -> none
  const handleSort = (key, isTransit = false) => {
    const sortConfig = isTransit ? transitSortConfig : availableSortConfig;
    const setSortConfig = isTransit ? setTransitSortConfig : setAvailableSortConfig;
    
    let direction = 'asc';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null; // Reset to no sort
      }
    }
    
    setSortConfig({ key, direction });
  };
  
  // Get sort icon
  const getSortIcon = (key, isTransit = false) => {
    const sortConfig = isTransit ? transitSortConfig : availableSortConfig;
    
    if (sortConfig.key !== key) {
      return <span className="ml-1 text-slate-400">⇅</span>;
    }
    
    if (sortConfig.direction === 'asc') {
      return <span className="ml-1 text-indigo-600">↑</span>;
    }
    
    if (sortConfig.direction === 'desc') {
      return <span className="ml-1 text-indigo-600">↓</span>;
    }
    
    return <span className="ml-1 text-slate-400">⇅</span>;
  };
  
  // Apply sorting to bilties array
  const applySorting = (biltiesArray, sortConfig) => {
    if (!sortConfig.direction || !sortConfig.key) {
      return biltiesArray;
    }
    
    return [...biltiesArray].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'gr_no':
          return sortConfig.direction === 'asc' 
            ? sortByGRNumber(a, b)
            : sortByGRNumber(b, a);
        
        case 'date':
          aValue = new Date(a.bilty_date || a.created_at || 0);
          bValue = new Date(b.bilty_date || b.created_at || 0);
          break;
        
        case 'consignor':
          aValue = (a.consignor_name || a.consignor || '').toLowerCase();
          bValue = (b.consignor_name || b.consignor || '').toLowerCase();
          break;
        
        case 'consignee':
          aValue = (a.consignee_name || a.consignee || '').toLowerCase();
          bValue = (b.consignee_name || b.consignee || '').toLowerCase();
          break;
        
        case 'destination':
          aValue = getBiltyDisplayCity(a).toLowerCase();
          bValue = getBiltyDisplayCity(b).toLowerCase();
          break;
        
        case 'payment':
          aValue = (a.payment_mode || a.payment_status || '').toLowerCase();
          bValue = (b.payment_mode || b.payment_status || '').toLowerCase();
          break;
        
        case 'packages':
          aValue = parseInt(a.no_of_pkg || a.no_of_packets || 0);
          bValue = parseInt(b.no_of_pkg || b.no_of_packets || 0);
          break;
        
        case 'weight':
          aValue = parseFloat(a.wt || a.weight || 0);
          bValue = parseFloat(b.wt || b.weight || 0);
          break;
        
        case 'amount':
          aValue = parseFloat(a.total || a.amount || 0);
          bValue = parseFloat(b.total || b.amount || 0);
          break;
        
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
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
      
      // Apply sorting
      const sorted = applySorting(filtered, availableSortConfig);
      setFullyFilteredBilties(sorted);
      
      // Notify parent of the filtered count
      if (onFilteredCountChange) {
        onFilteredCountChange(sorted.length);
      }
    }
    filterBiltiesByTransit();
  }, [filteredBilties, availableSortConfig, onFilteredCountChange]);

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

  const availableCities = getAvailableCities([...(bilties || []), ...(stationBilties || [])]);
  const transitCities = getAvailableCities(transitBilties || []);
  const getPaymentModeColor = (mode) => {
    switch (mode) {
      case 'paid':
        return 'border border-emerald-200 bg-emerald-50 text-emerald-600';
      case 'to-pay':
        return 'border border-amber-200 bg-amber-50 text-amber-600';
      case 'freeofcost':
      case 'foc':
        return 'border border-sky-200 bg-sky-50 text-sky-600';
      default:
        return 'border border-slate-200 bg-slate-50 text-slate-600';
    }
  };

  const getPaymentModeDisplay = (bilty) => {
    const paymentMode = bilty.payment_mode || bilty.payment_status || '';
    const deliveryType = bilty.delivery_type || '';
    
    // If door delivery, append "/DD" suffix
    if (deliveryType.toLowerCase().includes('door')) {
      return `${paymentMode.toUpperCase()}/DD`;
    }
    
    // For godown or any other delivery type, just show payment mode
    return paymentMode.toUpperCase();
  };

  const isChallanLocked = Boolean(selectedChallan?.is_dispatched);

  // Calculate totals for filtered bilties
  const calculateTotals = (biltiesArray) => {
    return biltiesArray.reduce((acc, bilty) => {
      const weight = parseFloat(bilty.wt || bilty.weight || 0);
      const packages = parseInt(bilty.no_of_pkg || bilty.no_of_packets || 0);
      const amount = parseFloat(bilty.total || bilty.amount || 0);
      
      return {
        totalWeight: acc.totalWeight + weight,
        totalPackages: acc.totalPackages + packages,
        totalAmount: acc.totalAmount + amount
      };
    }, { totalWeight: 0, totalPackages: 0, totalAmount: 0 });
  };

  const availableTotals = calculateTotals(fullyFilteredBilties);
  const transitTotals = calculateTotals(filteredTransitBilties);

  // Apply sorting to bilties for display
  const sortedAvailableBilties = applySorting(fullyFilteredBilties, availableSortConfig);
  const sortedTransitBilties = applySorting(filteredTransitBilties, transitSortConfig);

  // Builds consistent row styling so selection visibly highlights the full row.
  const getRowClassNames = (isSelected, isLocked) => {
    const baseClasses = 'transition-colors border-b border-slate-200 last:border-b-0';
    const stateClasses = isLocked
      ? 'cursor-not-allowed bg-slate-50/70 opacity-70'
      : 'cursor-pointer bg-white hover:bg-indigo-50';
    const selectedClasses = isSelected
      ? 'selected-row border-indigo-300 ring-1 ring-indigo-200 bg-indigo-50 shadow-[inset_0_0_0_1px_rgba(79,70,229,0.25)]'
      : '';
    return `${baseClasses} ${stateClasses} ${selectedClasses}`.trim();
  };

  // CSV export for transit bilties
  const handleExportTransitCSV = () => {
    if (!selectedChallan || !sortedTransitBilties.length) {
      alert('No bilties to export for this challan.');
      return;
    }
    // Define columns to export (matching table headers)
    const headers = [
      'Type', 'GR No', 'Date', 'Consignor', 'Consignee', 'Content', 'Destination', 'PVT Marks', 'Payment', 'Pkgs', 'Weight', 'Amount'
    ];
    const rows = sortedTransitBilties.map(bilty => [
      bilty.bilty_type === 'station' || bilty.source === 'station_bilty_summary' ? 'MNL' : 'REG',
      bilty.gr_no || '',
      bilty.bilty_date || bilty.created_at || '',
      bilty.consignor_name || bilty.consignor || '',
      bilty.consignee_name || bilty.consignee || '',
      bilty.contain || bilty.contents || '',
      getBiltyDisplayCity(bilty),
      bilty.pvt_marks || '',
      bilty.payment_mode || bilty.payment_status || '',
      bilty.no_of_pkg || bilty.no_of_packets || '',
      bilty.wt || bilty.weight || '',
      bilty.freight_amount || bilty.amount || ''
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `challan_${selectedChallan.challan_no}_bilties.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="space-y-5 w-full">
      {selectedChallan && (
        <div className="rounded-xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Truck className="h-4 w-4" />
              </span>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                  <span>{selectedChallan.challan_no ? `Challan ${selectedChallan.challan_no}` : 'Challan'}</span>
                  <span className="text-xs font-medium text-slate-500">({filteredTransitBilties.length} bilties)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-600">
                    <Package className="h-3 w-3" />
                    {filteredTransitBilties.length} in transit
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                    <CheckSquare className="h-3 w-3" />
                    {selectedTransitBilties.length} selected
                  </span>
                  {isChallanLocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-orange-600">
                      <Lock className="h-3 w-3" />
                      Dispatched
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onRefresh?.('transit')}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                title="Refresh transit bilties"
              >
                <RefreshCw className={`h-3 w-3 ${saving ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleExportTransitCSV}
                disabled={!filteredTransitBilties.length}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                title="Export transit bilties to CSV"
              >
                <Download className="h-3 w-3" />
                Export
              </button>
              {!isChallanLocked && filteredTransitBilties.length > 0 && (
                <>
                  <button
                    onClick={handleSelectAllTransit}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50"
                    title="Select or deselect all"
                  >
                    {selectedTransitBilties.length === filteredTransitBilties.length && filteredTransitBilties.length > 0 ? (
                      <CheckSquare className="h-3 w-3" />
                    ) : (
                      <Square className="h-3 w-3" />
                    )}
                    All
                  </button>
                  <button
                    onClick={onBulkRemoveFromTransit}
                    disabled={selectedTransitBilties.length === 0 || saving}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Remove selected bilties from transit"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove ({selectedTransitBilties.length})
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search transit..."
                  value={transitSearchTerm}
                  onChange={(e) => setTransitSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <select
                value={transitFilterPaymentMode}
                onChange={(e) => setTransitFilterPaymentMode(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="to-pay">To Pay</option>
                <option value="freeofcost">Free of Cost</option>
              </select>
              <select
                value={transitFilterCity}
                onChange={(e) => setTransitFilterCity(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="all">All Cities</option>
                {transitCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <select
                value={transitFilterBiltyType}
                onChange={(e) => setTransitFilterBiltyType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="all">All Types</option>
                <option value="regular">Regular</option>
                <option value="station">Manual</option>
              </select>
              <input
                type="date"
                value={transitFilterDate}
                onChange={(e) => setTransitFilterDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          {filteredTransitBilties.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-slate-200 text-[13px] leading-5">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    <th className="w-10 px-2.5 py-2.5 text-left">
                      {!isChallanLocked && (
                        <input
                          type="checkbox"
                          checked={selectedTransitBilties.length === filteredTransitBilties.length && filteredTransitBilties.length > 0}
                          onChange={handleSelectAllTransit}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      )}
                    </th>
                    <th className="px-2.5 py-2.5 text-left">#</th>
                    <th className="px-2.5 py-2.5 text-left">Type</th>
                    <th className="px-2.5 py-2.5 text-left cursor-pointer hover:bg-slate-100" onClick={() => handleSort('gr_no', false)}>
                      <div className="flex items-center">GR No{getSortIcon('gr_no', false)}</div>
                    </th>
                    <th className="px-2.5 py-2.5 text-left cursor-pointer hover:bg-slate-100" onClick={() => handleSort('date', false)}>
                      <div className="flex items-center">Date{getSortIcon('date', false)}</div>
                    </th>
                    <th className="px-2.5 py-2.5 text-left cursor-pointer hover:bg-slate-100" onClick={() => handleSort('consignor', false)}>
                      <div className="flex items-center">Consignor{getSortIcon('consignor', false)}</div>
                    </th>
                    <th className="px-2.5 py-2.5 text-left cursor-pointer hover:bg-slate-100" onClick={() => handleSort('consignee', false)}>
                      <div className="flex items-center">Consignee{getSortIcon('consignee', false)}</div>
                    </th>
                    <th className="px-2.5 py-2.5 text-left">Content</th>
                    <th className="px-2.5 py-2.5 text-left cursor-pointer hover:bg-slate-100" onClick={() => handleSort('destination', false)}>
                      <div className="flex items-center">Destination{getSortIcon('destination', false)}</div>
                    </th>
                    <th className="px-2.5 py-2.5 text-left">PVT Marks</th>
                    <th className="px-2.5 py-2.5 text-left cursor-pointer hover:bg-slate-100" onClick={() => handleSort('payment', false)}>
                      <div className="flex items-center">Payment{getSortIcon('payment', false)}</div>
                    </th>
                    <th className="px-2.5 py-2.5 text-left cursor-pointer hover:bg-slate-100" onClick={() => handleSort('packages', false)}>
                      <div className="flex items-center">Pkgs{getSortIcon('packages', false)}</div>
                    </th>
                    <th className="px-2.5 py-2.5 text-left cursor-pointer hover:bg-slate-100" onClick={() => handleSort('weight', false)}>
                      <div className="flex items-center">Weight{getSortIcon('weight', false)}</div>
                    </th>
                    <th className="px-2.5 py-2.5 text-left cursor-pointer hover:bg-slate-100" onClick={() => handleSort('amount', false)}>
                      <div className="flex items-center">Amount{getSortIcon('amount', false)}</div>
                    </th>
                    {!isChallanLocked && (
                      <th className="px-2.5 py-2.5 text-left">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white [&_.selected-row>td]:bg-indigo-100/80">
                  {sortedTransitBilties.map((bilty, index) => {
                    const isSelected = selectedTransitBilties.find(b => b.id === bilty.id && b.bilty_type === bilty.bilty_type);
                    const isRowLocked = isChallanLocked || bilty.is_dispatched;

                    return (
                      <tr
                        key={`transit-${bilty.id}-${bilty.bilty_type}`}
                        className={getRowClassNames(Boolean(isSelected), isRowLocked)}
                        onClick={() => {
                          if (!isRowLocked) {
                            handleTransitBiltySelect(bilty);
                          }
                        }}
                      >
                        <td className="px-2.5 py-2.5">
                          {isRowLocked ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
                              <Lock className="h-3 w-3" />
                              Locked
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleTransitBiltySelect(bilty);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          )}
                        </td>
                        <td className="px-2.5 py-2.5 text-slate-700">{index + 1}</td>
                        <td className="px-2.5 py-2.5">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            bilty.bilty_type === 'station' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {bilty.bilty_type === 'station' ? 'MNL' : 'REG'}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5">
                          <span className="font-semibold text-slate-900">{bilty.gr_no || '-'}</span>
                        </td>
                        <td className="px-2.5 py-2.5 text-slate-600">
                          {bilty.bilty_date
                            ? format(new Date(bilty.bilty_date), 'dd/MM')
                            : bilty.created_at
                              ? format(new Date(bilty.created_at), 'dd/MM')
                              : '-'}
                        </td>
                        <td className="px-2.5 py-2.5 text-slate-700" title={bilty.consignor_name || bilty.consignor}>
                          {bilty.consignor_name || bilty.consignor || '-'}
                        </td>
                        <td className="px-2.5 py-2.5 text-slate-700" title={bilty.consignee_name || bilty.consignee}>
                          {bilty.consignee_name || bilty.consignee || '-'}
                        </td>
                        <td className="px-2.5 py-2.5 text-slate-500" title={bilty.contain || bilty.contents}>
                          {bilty.contain || bilty.contents || '-'}
                        </td>
                        <td className="px-2.5 py-2.5 text-slate-500">
                          {getBiltyDisplayCity(bilty)}
                        </td>
                        <td className="px-2.5 py-2.5 text-slate-500" title={bilty.pvt_marks}>
                          {bilty.pvt_marks || '-'}
                        </td>
                        <td className="px-2.5 py-2.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getPaymentModeColor(bilty.payment_mode || bilty.payment_status)}`}>
                            {getPaymentModeDisplay(bilty)}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5 text-slate-700">{bilty.no_of_pkg || bilty.no_of_packets || '-'}</td>
                        <td className="px-2.5 py-2.5 text-slate-700">{bilty.wt || bilty.weight || 0}</td>
                        <td className="px-2.5 py-2.5 font-semibold text-slate-900">₹{bilty.total || bilty.amount || 0}</td>
                        {!isChallanLocked && (
                          <td className="px-2.5 py-2.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveBiltyFromTransit?.(bilty);
                              }}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                              title="Remove from transit"
                            >
                              <X className="h-3 w-3" />
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {filteredTransitBilties.length > 0 && (
                  <tfoot className="bg-gradient-to-r from-indigo-50 to-blue-50 border-t-2 border-indigo-200">
                    <tr className="font-bold text-slate-900">
                      <td className="px-2.5 py-3" colSpan="11">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-indigo-600" />
                          <span className="text-sm">Totals:</span>
                        </div>
                      </td>
                      <td className="px-2.5 py-3 text-sm font-bold text-indigo-700">{transitTotals.totalPackages}</td>
                      <td className="px-2.5 py-3 text-sm font-bold text-indigo-700">{transitTotals.totalWeight.toFixed(2)}</td>
                      <td className="px-2.5 py-3 text-sm font-bold text-indigo-700">₹{transitTotals.totalAmount.toFixed(2)}</td>
                      {!isChallanLocked && <td className="px-2.5 py-3"></td>}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-slate-500">
              <Truck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No transit bilties</p>
              <p className="text-xs text-slate-400">
                {transitSearchTerm || transitFilterPaymentMode !== 'all' || transitFilterDate || transitFilterCity !== 'all' || transitFilterBiltyType !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Add bilties to this challan to see them here.'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white/95 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Package className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                <span>Available Bilties</span>
                <span className="text-xs font-medium text-slate-500">{fullyFilteredBilties.length} filtered</span>
                {totalAvailableCount > 0 && (
                  <span className="text-xs font-medium text-slate-400">Total pool: {totalAvailableCount}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-600">
                  <CheckSquare className="h-3 w-3" />
                  {selectedBilties.length} selected
                </span>
                {isChallanLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-orange-600">
                    <Lock className="h-3 w-3" />
                    Dispatched challan
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onRefresh?.('bilties')}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
              title="Refresh available bilties"
            >
              <RefreshCw className={`h-3 w-3 ${saving ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleSelectAll}
              disabled={isChallanLocked || fullyFilteredBilties.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {selectedBilties.length === fullyFilteredBilties.length && fullyFilteredBilties.length > 0 ? (
                <CheckSquare className="h-3 w-3" />
              ) : (
                <Square className="h-3 w-3" />
              )}
              {selectedBilties.length === fullyFilteredBilties.length && fullyFilteredBilties.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={() => onAddBiltyToTransit?.(selectedBilties)}
              disabled={selectedBilties.length === 0 || !selectedChallan || isChallanLocked}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              <Plus className="h-3 w-3" />
              Add ({selectedBilties.length})
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search available..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <select
              value={filterPaymentMode}
              onChange={(e) => setFilterPaymentMode(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="to-pay">To Pay</option>
              <option value="freeofcost">Free of Cost</option>
            </select>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">All Cities</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <select
              value={filterBiltyType}
              onChange={(e) => setFilterBiltyType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">All Types</option>
              <option value="regular">Regular</option>
              <option value="station">Manual</option>
            </select>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        {selectedBilties.length > 0 && (
          <div className="border-b border-indigo-100 bg-indigo-50/70 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-indigo-700">{selectedBilties.length} bilties selected</span>
              <button
                onClick={() => setSelectedBilties([])}
                className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 transition hover:text-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                Clear selection
              </button>
            </div>
          </div>
        )}

  <div className="overflow-x-auto">
          {fullyFilteredBilties.length > 0 ? (
            <table className="min-w-full border border-slate-200 text-[13px] leading-5">
              <thead className="bg-slate-50">
                <tr className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  <th className="w-10 px-2.5 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={selectedBilties.length === fullyFilteredBilties.length && fullyFilteredBilties.length > 0}
                      onChange={handleSelectAll}
                      disabled={isChallanLocked}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-2.5 py-2.5 text-left">#</th>
                  <th className="px-2.5 py-2.5 text-left">Type</th>
                  <th className="px-2.5 py-2.5 text-left">GR No</th>
                  <th className="px-2.5 py-2.5 text-left">Date</th>
                  <th className="px-2.5 py-2.5 text-left">Consignor</th>
                  <th className="px-2.5 py-2.5 text-left">Consignee</th>
                  <th className="px-2.5 py-2.5 text-left">Content</th>
                  <th className="px-2.5 py-2.5 text-left">Destination</th>
                  <th className="px-2.5 py-2.5 text-left">PVT Marks</th>
                  <th className="px-2.5 py-2.5 text-left">Payment</th>
                  <th className="px-2.5 py-2.5 text-left">Pkgs</th>
                  <th className="px-2.5 py-2.5 text-left">Weight</th>
                  <th className="px-2.5 py-2.5 text-left">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white [&_.selected-row>td]:bg-indigo-100/80">
                {sortedAvailableBilties.map((bilty, index) => {
                  const isSelected = selectedBilties.find(b => b.id === bilty.id && b.bilty_type === bilty.bilty_type);

                  return (
                    <tr
                      key={`${bilty.id}-${bilty.gr_no}`}
                      className={getRowClassNames(Boolean(isSelected), isChallanLocked)}
                      onClick={() => {
                        if (!isChallanLocked) {
                          handleBiltySelect(bilty);
                        }
                      }}
                      onDoubleClick={() => {
                        if (!isChallanLocked) {
                          handleBiltyDoubleClick(bilty);
                        }
                      }}
                      title={isChallanLocked ? 'Cannot modify a dispatched challan' : 'Double-click to add to the selected challan'}
                    >
                      <td className="px-2.5 py-2.5">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (!isChallanLocked) {
                              handleBiltySelect(bilty);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isChallanLocked}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-700">{index + 1}</td>
                      <td className="px-2.5 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          bilty.bilty_type === 'station' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {bilty.bilty_type === 'station' ? 'MNL' : 'REG'}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5">
                        <span className="font-semibold text-slate-900">{bilty.gr_no || '-'}</span>
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-600">
                        {bilty.bilty_date
                          ? format(new Date(bilty.bilty_date), 'dd/MM')
                          : bilty.created_at
                            ? format(new Date(bilty.created_at), 'dd/MM')
                            : '-'}
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-700" title={bilty.consignor_name || bilty.consignor}>
                        {bilty.consignor_name || bilty.consignor || '-'}
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-700" title={bilty.consignee_name || bilty.consignee}>
                        {bilty.consignee_name || bilty.consignee || '-'}
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-500" title={bilty.contain || bilty.contents}>
                        {bilty.contain || bilty.contents || '-'}
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-500">
                        {getBiltyDisplayCity(bilty)}
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-500" title={bilty.pvt_marks}>
                        {bilty.pvt_marks || '-'}
                      </td>
                      <td className="px-2.5 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getPaymentModeColor(bilty.payment_mode || bilty.payment_status)}`}>
                          {getPaymentModeDisplay(bilty)}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-700">{bilty.no_of_pkg || bilty.no_of_packets || '-'}</td>
                      <td className="px-2.5 py-2.5 text-slate-700">{bilty.wt || bilty.weight || 0}</td>
                      <td className="px-2.5 py-2.5 font-semibold text-slate-900">₹{bilty.total || bilty.amount || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
              {fullyFilteredBilties.length > 0 && (
                <tfoot className="bg-gradient-to-r from-emerald-50 to-green-50 border-t-2 border-emerald-200">
                  <tr className="font-bold text-slate-900">
                    <td className="px-2.5 py-3" colSpan="11">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm">Totals:</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-3 text-sm font-bold text-emerald-700">{availableTotals.totalPackages}</td>
                    <td className="px-2.5 py-3 text-sm font-bold text-emerald-700">{availableTotals.totalWeight.toFixed(2)}</td>
                    <td className="px-2.5 py-3 text-sm font-bold text-emerald-700">₹{availableTotals.totalAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            <div className="px-6 py-8 text-center text-slate-500">
              <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">No bilties match the current filters</p>
              <p className="text-xs text-slate-400">Adjust your filters or refresh the list to load the latest data.</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Tip: click once to select, double-click to add to the selected challan.
          {isChallanLocked && <span className="ml-2 font-semibold text-orange-500">Dispatched challans are read-only.</span>}
        </div>
      </div>
    </div>
  );
};

export default BiltyList;
