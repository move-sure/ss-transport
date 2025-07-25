'use client';                                                                                                                                                             

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Navbar from '../../components/dashboard/navbar';
import BillSearchHeader from '../../components/bill/bill-search-header';
import BillFilterPanel from '../../components/bill/bill-filters';
import BillSearchTable from '../../components/bill/bill-search-table';

export default function BillSearch() {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  
  // Debounce timer ref for performance optimization
  const debounceTimerRef = useRef(null);
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [regularBilties, setRegularBilties] = useState([]);
  const [stationBilties, setStationBilties] = useState([]);
  const [cities, setCities] = useState([]);
  const [branchData, setBranchData] = useState(null);
  const [error, setError] = useState(null);
  
  // Search and filter state
  const [searchFilters, setSearchFilters] = useState({
    dateFrom: '',
    dateTo: '',
    grNumber: '',
    consignorName: '',
    consigneeName: '',
    pvtMarks: '',
    cityName: '',
    paymentMode: '',
    eWayBill: '',
    biltyType: 'all' // 'all', 'regular', 'station'
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState({
    regular: [],
    station: [],
    totalCount: 0
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBilties, setSelectedBilties] = useState([]);

  // Check authentication
  useEffect(() => {
    if (!requireAuth()) {
      return;
    }
  }, [requireAuth]);

  // Initialize data
  useEffect(() => {
    if (user) {
      initializeData();
    }
  }, [user]);

  const initializeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchCities(),
        fetchBranchData()
        // Removed initial search - only search when user clicks search button
      ]);
      
    } catch (error) {
      console.error('Failed to initialize data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('city_name');
      
      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchBranchData = async () => {
    try {
      if (!user?.branch_id) return;
      
      // First try to get branch data, but don't fail if table doesn't exist
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', user.branch_id)
        .maybeSingle();
      
      if (error) {
        console.log('Branch table not found or error fetching branch data:', error);
        // Set a default branch data if table doesn't exist
        setBranchData({
          id: user.branch_id,
          name: 'Default Branch',
          address: '',
          phone: '',
          email: ''
        });
        return;
      }
      
      setBranchData(data);
    } catch (error) {
      console.error('Error fetching branch data:', error);
      // Set default data on error
      setBranchData({
        id: user?.branch_id || 'default',
        name: 'Default Branch',
        address: '',
        phone: '',
        email: ''
      });
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback((filters) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      performSearch(filters);
    }, 300);
  }, []);

  const performSearch = async (filters = searchFilters) => {
    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const promises = [];
      
      // Search regular bilties if needed
      if (filters.biltyType === 'all' || filters.biltyType === 'regular') {
        promises.push(searchRegularBilties(filters));
      } else {
        promises.push(Promise.resolve([]));
      }
      
      // Search station bilties if needed
      if (filters.biltyType === 'all' || filters.biltyType === 'station') {
        promises.push(searchStationBilties(filters));
      } else {
        promises.push(Promise.resolve([]));
      }

      const results = await Promise.allSettled(promises);
      
      // Handle results, even if some queries failed
      const regularResults = results[0].status === 'fulfilled' ? results[0].value : [];
      const stationResults = results[1].status === 'fulfilled' ? results[1].value : [];
      
      // Log any failures
      if (results[0].status === 'rejected') {
        console.error('Regular bilties search failed:', results[0].reason);
      }
      if (results[1].status === 'rejected') {
        console.error('Station bilties search failed:', results[1].reason);
      }
      
      setSearchResults({
        regular: regularResults,
        station: stationResults,
        totalCount: regularResults.length + stationResults.length
      });
      
      // Show warning if some searches failed
      if (results.some(result => result.status === 'rejected')) {
        setError('Some search operations failed. Results may be incomplete. Please check if the database tables exist.');
      }
      
    } catch (error) {
      console.error('Search error:', error);
      setError(`Search failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const searchRegularBilties = async (filters) => {
    try {
      let query = supabase
        .from('bilty')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null);

      // Apply branch filter if user has branch_id
      if (user?.branch_id) {
        query = query.eq('branch_id', user.branch_id);
      }

      // Apply filters
      if (filters.grNumber?.trim()) {
        query = query.ilike('gr_no', `%${filters.grNumber.trim()}%`);
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query
          .gte('bilty_date', filters.dateFrom)
          .lte('bilty_date', filters.dateTo);
      } else if (filters.dateFrom) {
        query = query.gte('bilty_date', filters.dateFrom);
      } else if (filters.dateTo) {
        query = query.lte('bilty_date', filters.dateTo);
      }

      if (filters.consignorName?.trim()) {
        query = query.ilike('consignor_name', `%${filters.consignorName.trim()}%`);
      }

      if (filters.consigneeName?.trim()) {
        query = query.ilike('consignee_name', `%${filters.consigneeName.trim()}%`);
      }

      if (filters.pvtMarks?.trim()) {
        query = query.ilike('pvt_marks', `%${filters.pvtMarks.trim()}%`);
      }

      // Handle city name filter - get city IDs that match the name
      if (filters.cityName?.trim()) {
        try {
          const { data: matchingCities } = await supabase
            .from('cities')
            .select('id')
            .ilike('city_name', `%${filters.cityName.trim()}%`);
          
          if (matchingCities && matchingCities.length > 0) {
            const cityIds = matchingCities.map(city => city.id);
            query = query.in('to_city_id', cityIds);
          } else {
            // If no cities match, return empty result
            return [];
          }
        } catch (error) {
          console.log('Error filtering by city name:', error);
        }
      }

      if (filters.paymentMode) {
        query = query.eq('payment_mode', filters.paymentMode);
      }

      if (filters.eWayBill?.trim()) {
        query = query.ilike('e_way_bill', `%${filters.eWayBill.trim()}%`);
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query.limit(1000);

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
      
      // Get city names, challan numbers and dispatch dates in optimized queries
      const grNumbers = (data || []).map(bilty => bilty.gr_no).filter(Boolean);
      
      let cityMap = {};
      let challanMap = {};
      let dispatchDateMap = {};
      
      // Get all unique city IDs for fetching city names
      const cityIds = [...new Set((data || []).map(bilty => bilty.to_city_id).filter(Boolean))];
      
      // Fetch city names in bulk
      if (cityIds.length > 0) {
        try {
          const { data: citiesData } = await supabase
            .from('cities')
            .select('id, city_name, city_code')
            .in('id', cityIds);
          
          if (citiesData) {
            cityMap = citiesData.reduce((map, city) => {
              map[city.id] = { name: city.city_name, code: city.city_code };
              return map;
            }, {});
          }
        } catch (error) {
          console.log('Error fetching cities for regular bilties:', error);
        }
      }
      
      // Fetch challan numbers and dispatch dates
      if (grNumbers.length > 0) {
        try {
          // First get challan numbers from transit_details
          const { data: transitData } = await supabase
            .from('transit_details')
            .select('gr_no, challan_no')
            .in('gr_no', grNumbers);
          
          if (transitData) {
            const challanNumbers = [...new Set(transitData.map(t => t.challan_no).filter(Boolean))];
            
            // Build challan map
            challanMap = transitData.reduce((map, transit) => {
              map[transit.gr_no] = transit.challan_no;
              return map;
            }, {});
            
            // Fetch dispatch dates from challan_details
            if (challanNumbers.length > 0) {
              const { data: challanDetailsData } = await supabase
                .from('challan_details')
                .select('challan_no, dispatch_date')
                .in('challan_no', challanNumbers);
              
              if (challanDetailsData) {
                dispatchDateMap = challanDetailsData.reduce((map, challan) => {
                  map[challan.challan_no] = challan.dispatch_date;
                  return map;
                }, {});
              }
            }
          }
        } catch (error) {
          console.log('Error fetching challan numbers and dispatch dates:', error);
        }
      }
      
      return (data || []).map(bilty => {
        const cityInfo = cityMap[bilty.to_city_id] || { name: 'N/A', code: 'N/A' };
        const challanNo = challanMap[bilty.gr_no] || 'N/A';
        const dispatchDate = dispatchDateMap[challanNo] || null;
        
        return {
          ...bilty,
          type: 'regular',
          to_city_name: cityInfo.name,
          to_city_code: cityInfo.code,
          challan_no: challanNo,
          dispatch_date: dispatchDate
        };
      });

    } catch (error) {
      console.error('Error searching regular bilties:', error);
      throw error;
    }
  };

  const searchStationBilties = async (filters) => {
    try {
      let query = supabase
        .from('station_bilty_summary')
        .select('*');

      // Apply branch filter if user has branch_id
      if (user?.branch_id) {
        query = query.eq('branch_id', user.branch_id);
      }

      // Apply filters
      if (filters.grNumber?.trim()) {
        query = query.ilike('gr_no', `%${filters.grNumber.trim()}%`);
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query
          .gte('created_at', filters.dateFrom)
          .lte('created_at', filters.dateTo);
      } else if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      } else if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters.consignorName?.trim()) {
        query = query.ilike('consignor', `%${filters.consignorName.trim()}%`);
      }

      if (filters.consigneeName?.trim()) {
        query = query.ilike('consignee', `%${filters.consigneeName.trim()}%`);
      }

      if (filters.pvtMarks?.trim()) {
        query = query.ilike('pvt_marks', `%${filters.pvtMarks.trim()}%`);
      }

      // Handle city name filter for station bilties - search by both city name and city code
      if (filters.cityName?.trim()) {
        // First get matching city codes for the entered city name
        try {
          const { data: matchingCities } = await supabase
            .from('cities')
            .select('city_code')
            .ilike('city_name', `%${filters.cityName.trim()}%`);
          
          if (matchingCities && matchingCities.length > 0) {
            // Search by matching city codes in station field
            const cityCodes = matchingCities.map(city => city.city_code);
            query = query.in('station', cityCodes);
          } else {
            // Also search directly in station field in case it contains city names
            query = query.ilike('station', `%${filters.cityName.trim()}%`);
          }
        } catch (error) {
          console.log('Error filtering station bilties by city name:', error);
          // Fallback to direct station field search
          query = query.ilike('station', `%${filters.cityName.trim()}%`);
        }
      }

      if (filters.eWayBill?.trim()) {
        query = query.ilike('e_way_bill', `%${filters.eWayBill.trim()}%`);
      }

      // Apply payment status filter (map payment_mode to payment_status)
      if (filters.paymentMode) {
        query = query.eq('payment_status', filters.paymentMode);
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query.limit(1000);

      if (error) {
        console.error('Supabase station query error:', error);
        throw error;
      }
      
      // Get challan numbers, city names and dispatch dates for all station bilties in optimized queries
      const grNumbers = (data || []).map(bilty => bilty.gr_no).filter(Boolean);
      const stationCodes = [...new Set((data || []).map(bilty => bilty.station).filter(Boolean))];
      
      let challanMap = {};
      let cityMap = {};
      let dispatchDateMap = {};
      
      // Fetch challan numbers and dispatch dates
      if (grNumbers.length > 0) {
        try {
          // First get challan numbers from transit_details
          const { data: transitData } = await supabase
            .from('transit_details')
            .select('gr_no, challan_no')
            .in('gr_no', grNumbers);
          
          if (transitData) {
            const challanNumbers = [...new Set(transitData.map(t => t.challan_no).filter(Boolean))];
            
            // Build challan map
            challanMap = transitData.reduce((map, transit) => {
              map[transit.gr_no] = transit.challan_no;
              return map;
            }, {});
            
            // Fetch dispatch dates from challan_details
            if (challanNumbers.length > 0) {
              const { data: challanDetailsData } = await supabase
                .from('challan_details')
                .select('challan_no, dispatch_date')
                .in('challan_no', challanNumbers);
              
              if (challanDetailsData) {
                dispatchDateMap = challanDetailsData.reduce((map, challan) => {
                  map[challan.challan_no] = challan.dispatch_date;
                  return map;
                }, {});
              }
            }
          }
        } catch (error) {
          console.log('Error fetching challan numbers and dispatch dates for station bilties:', error);
        }
      }
      
      // Fetch city names for station codes
      if (stationCodes.length > 0) {
        try {
          const { data: citiesData } = await supabase
            .from('cities')
            .select('city_code, city_name')
            .in('city_code', stationCodes);
          
          if (citiesData) {
            cityMap = citiesData.reduce((map, city) => {
              map[city.city_code] = city.city_name;
              return map;
            }, {});
          }
        } catch (error) {
          console.log('Error fetching city names for station bilties:', error);
        }
      }
      
      return (data || []).map(bilty => {
        const challanNo = challanMap[bilty.gr_no] || 'N/A';
        const dispatchDate = dispatchDateMap[challanNo] || null;
        
        return {
          ...bilty,
          type: 'station',
          challan_no: challanNo,
          dispatch_date: dispatchDate,
          station_city_name: cityMap[bilty.station] || bilty.station || 'N/A'
        };
      });

    } catch (error) {
      console.error('Error searching station bilties:', error);
      throw error;
    }
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = {
      ...searchFilters,
      [filterName]: value
    };
    
    setSearchFilters(newFilters);
    // Removed auto search on filter change - only search when user clicks search button
  };

  const handleSearch = () => {
    performSearch();
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      dateFrom: '',
      dateTo: '',
      grNumber: '',
      consignorName: '',
      consigneeName: '',
      pvtMarks: '',
      cityName: '',
      paymentMode: '',
      eWayBill: '',
      biltyType: 'all'
    };
    
    setSearchFilters(clearedFilters);
    setHasSearched(false);
    setSearchResults({
      regular: [],
      station: [],
      totalCount: 0
    });
    setSelectedBilties([]);
  };

  // Selection handlers
  const handleSelectBilty = (bilty) => {
    const biltyId = `${bilty.type}-${bilty.id}`;
    setSelectedBilties(prev => {
      if (prev.includes(biltyId)) {
        return prev.filter(id => id !== biltyId);
      } else {
        return [...prev, biltyId];
      }
    });
  };

  const handleSelectAll = () => {
    const allBiltyIds = [
      ...searchResults.regular.map(bilty => `regular-${bilty.id}`),
      ...searchResults.station.map(bilty => `station-${bilty.id}`)
    ];
    
    if (selectedBilties.length === allBiltyIds.length) {
      setSelectedBilties([]);
    } else {
      setSelectedBilties(allBiltyIds);
    }
  };

  const getSelectedBilties = () => {
    const allBilties = [
      ...searchResults.regular.map(bilty => ({ ...bilty, type: 'regular' })),
      ...searchResults.station.map(bilty => ({ ...bilty, type: 'station' }))
    ];
    
    return allBilties.filter(bilty => 
      selectedBilties.includes(`${bilty.type}-${bilty.id}`)
    );
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    // Define headers based on bilty type
    const headers = [
      'Type',
      'GR Number',
      'Date',
      'Consignor',
      'Consignee',
      'Destination City',
      'City Code',
      'Payment Mode',
      'Private Marks',
      'Challan No',
      'Amount'
    ];
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(bilty => {
        const row = [
          bilty.type || 'N/A',
          bilty.gr_no || 'N/A',
          bilty.bilty_date || bilty.created_at || 'N/A',
          bilty.consignor_name || bilty.consignor || 'N/A',
          bilty.consignee_name || bilty.consignee || 'N/A',
          bilty.to_city_name || bilty.station || 'N/A',
          bilty.to_city_code || 'N/A',
          bilty.payment_mode || bilty.payment_status || 'N/A',
          bilty.pvt_marks || 'N/A',
          bilty.challan_no || 'N/A',
          bilty.total || bilty.amount || 0
        ];
        
        // Escape commas and quotes in CSV data
        return row.map(field => {
          const stringField = String(field);
          if (stringField.includes(',') || stringField.includes('"')) {
            return `"${stringField.replace(/"/g, '""')}"`;
          }
          return stringField;
        }).join(',');
      })
    ].join('\n');
    
    return csvContent;
  };

  const handleDownloadCSV = () => {
    const selectedData = getSelectedBilties();
    const dataToDownload = selectedData.length > 0 ? selectedData : [...searchResults.regular, ...searchResults.station];
    const csvContent = convertToCSV(dataToDownload);
    
    if (!csvContent) {
      alert('No data to download');
      return;
    }
    
    const fileName = selectedData.length > 0 
      ? `selected_bilties_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`
      : `bilty_search_results_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to get city name
  const getCityName = (cityId) => {
    const city = cities?.find(c => c.id?.toString() === cityId?.toString());
    return city ? city.city_name : 'N/A';
  };

  const handleCopyToClipboard = async () => {
    const selectedData = getSelectedBilties();
    
    if (selectedData.length === 0) {
      alert('Please select bilties to copy');
      return;
    }
    
    const headers = [
      'SN.NO',
      'GR_NO',
      'CONSIGNOR',
      'CONSIGNEE',
      'CONTENT',
      'NO_OF_PACKAGES',
      'WEIGHT',
      'TO_PAY',
      'PAID',
      'STATION',
      'PVT_MARK',
      'DATE'
    ];
    
    const tabContent = [
      headers.join('\t'),
      ...selectedData.map((bilty, index) => {
        const row = [
          index + 1, // SN.NO
          bilty.gr_no || 'N/A',
          bilty.type === 'station' 
            ? (bilty.consignor || 'N/A') 
            : (bilty.consignor_name || 'N/A'),
          bilty.type === 'station' 
            ? (bilty.consignee || 'N/A') 
            : (bilty.consignee_name || 'N/A'),
          bilty.type === 'station' 
            ? (bilty.contents || 'N/A') 
            : (bilty.contain || 'N/A'),
          bilty.type === 'station' 
            ? (bilty.no_of_packets || 0) 
            : (bilty.no_of_pkg || 0),
          bilty.type === 'station' 
            ? (bilty.weight || 0) 
            : (bilty.wt || 0),
          // TO_PAY column
          bilty.type === 'station' 
            ? (bilty.payment_status === 'to-pay' ? (bilty.amount || 0) : 0)
            : (bilty.payment_mode === 'to-pay' ? (bilty.total || 0) : 0),
          // PAID column
          bilty.type === 'station' 
            ? (bilty.payment_status === 'paid' ? (bilty.amount || 0) : 0)
            : (bilty.payment_mode === 'paid' ? (bilty.total || 0) : 0),
          bilty.type === 'station' 
            ? (bilty.station || 'N/A') 
            : getCityName(bilty.to_city_id),
          bilty.pvt_marks || 'N/A',
          // DATE column - use created_at for station bilties, bilty_date for regular bilties
          bilty.type === 'station' 
            ? (bilty.created_at ? new Date(bilty.created_at).toLocaleDateString('en-GB') : 'N/A')
            : (bilty.bilty_date ? new Date(bilty.bilty_date).toLocaleDateString('en-GB') : 'N/A')
        ];
        
        // Clean each field to ensure proper tab-separated format for Excel
        return row.map(field => {
          let cleanField = String(field || '').trim();
          // Remove any tabs, newlines, carriage returns, and replace commas with spaces
          cleanField = cleanField.replace(/[\t\n\r,]/g, ' ');
          // Remove multiple spaces
          cleanField = cleanField.replace(/\s+/g, ' ');
          // Remove any remaining problematic characters except basic ones
          cleanField = cleanField.replace(/[^\w\s\-\.\/]/g, '');
          return cleanField;
        }).join('\t');
      })
    ].join('\n');
    
    try {
      await navigator.clipboard.writeText(tabContent);
      alert(`Successfully copied ${selectedData.length} bilty records to clipboard! You can now paste this data into Excel.`);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy data to clipboard. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="w-full px-4 py-8">
        <BillSearchHeader 
          onToggleFilters={() => setShowFilters(!showFilters)}
          showFilters={showFilters}
          totalResults={searchResults.totalCount}
          loading={loading}
          hasSearched={hasSearched}
          onDownloadCSV={handleDownloadCSV}
          onCopyToClipboard={handleCopyToClipboard}
          selectedBiltiesCount={selectedBilties.length}
        />

        {showFilters && (
          <BillFilterPanel
            filters={searchFilters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onClearFilters={handleClearFilters}
            cities={cities}
            loading={loading}
          />
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {hasSearched && (
          <BillSearchTable
            regularBilties={searchResults.regular}
            stationBilties={searchResults.station}
            loading={loading}
            biltyType={searchFilters.biltyType}
            onSelectBilty={handleSelectBilty}
            onSelectAll={handleSelectAll}
            selectedBilties={selectedBilties}
          />
        )}

        {!hasSearched && !loading && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start Your Search</h3>
            <p className="text-gray-500 mb-4">Use the filters above and click the search button to find bilties.</p>
          </div>
        )}
      </div>
    </div>
  );
}