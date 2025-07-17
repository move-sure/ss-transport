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
import BillDetailsModal from '../../components/bill/bill-details-modal';
import PrintModal from '../../components/bilty/print-model';

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
    transportName: '',
    paymentMode: '',
    eWayBill: '',
    biltyType: 'all', // 'all', 'regular', 'station'
    minAmount: '',
    maxAmount: ''
  });

  // UI state
  const [selectedBilty, setSelectedBilty] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState({
    regular: [],
    station: [],
    totalCount: 0
  });
  const [hasSearched, setHasSearched] = useState(false);

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

      if (filters.transportName?.trim()) {
        query = query.ilike('transport_name', `%${filters.transportName.trim()}%`);
      }

      if (filters.paymentMode) {
        query = query.eq('payment_mode', filters.paymentMode);
      }

      if (filters.eWayBill?.trim()) {
        query = query.ilike('e_way_bill', `%${filters.eWayBill.trim()}%`);
      }

      if (filters.minAmount && !isNaN(filters.minAmount)) {
        query = query.gte('total', parseFloat(filters.minAmount));
      }

      if (filters.maxAmount && !isNaN(filters.maxAmount)) {
        query = query.lte('total', parseFloat(filters.maxAmount));
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query.limit(1000);

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
      
      // Get city names in a separate query if we have city IDs
      const biltyDataWithCities = await Promise.all(
        (data || []).map(async (bilty) => {
          let fromCityName = 'N/A';
          let toCityName = 'N/A';
          
          // Fetch city names if city IDs exist
          if (bilty.from_city_id) {
            try {
              const { data: fromCity } = await supabase
                .from('cities')
                .select('city_name')
                .eq('id', bilty.from_city_id)
                .single();
              fromCityName = fromCity?.city_name || 'N/A';
            } catch (error) {
              console.log('Error fetching from city:', error);
            }
          }
          
          if (bilty.to_city_id) {
            try {
              const { data: toCity } = await supabase
                .from('cities')
                .select('city_name')
                .eq('id', bilty.to_city_id)
                .single();
              toCityName = toCity?.city_name || 'N/A';
            } catch (error) {
              console.log('Error fetching to city:', error);
            }
          }
          
          return {
            ...bilty,
            type: 'regular',
            from_city_name: fromCityName,
            to_city_name: toCityName
          };
        })
      );
      
      return biltyDataWithCities;

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

      if (filters.eWayBill?.trim()) {
        query = query.ilike('e_way_bill', `%${filters.eWayBill.trim()}%`);
      }

      if (filters.minAmount && !isNaN(filters.minAmount)) {
        query = query.gte('amount', parseFloat(filters.minAmount));
      }

      if (filters.maxAmount && !isNaN(filters.maxAmount)) {
        query = query.lte('amount', parseFloat(filters.maxAmount));
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
      
      return data?.map(bilty => ({
        ...bilty,
        type: 'station'
      })) || [];

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
      transportName: '',
      paymentMode: '',
      eWayBill: '',
      biltyType: 'all',
      minAmount: '',
      maxAmount: ''
    };
    
    setSearchFilters(clearedFilters);
    setHasSearched(false);
    setSearchResults({
      regular: [],
      station: [],
      totalCount: 0
    });
  };

  const handleViewDetails = (bilty) => {
    setSelectedBilty(bilty);
    setShowDetailsModal(true);
  };

  const handlePrintBilty = (bilty) => {
    setPrintData(bilty);
    setShowPrintModal(true);
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
      'From City',
      'To City',
      'Transport Name',
      'Payment Mode',
      'E-Way Bill',
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
          bilty.from_city_name || bilty.from_city || 'N/A',
          bilty.to_city_name || bilty.to_city || 'N/A',
          bilty.transport_name || 'N/A',
          bilty.payment_mode || bilty.payment_status || 'N/A',
          bilty.e_way_bill || 'N/A',
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
    const allData = [...searchResults.regular, ...searchResults.station];
    const csvContent = convertToCSV(allData);
    
    if (!csvContent) {
      alert('No data to download');
      return;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bilty_search_results_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToClipboard = async () => {
    const allData = [...searchResults.regular, ...searchResults.station];
    const csvContent = convertToCSV(allData);
    
    if (!csvContent) {
      alert('No data to copy');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(csvContent);
      alert('Data copied to clipboard successfully!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = csvContent;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Data copied to clipboard successfully!');
      } catch (fallbackErr) {
        alert('Failed to copy to clipboard');
      }
      document.body.removeChild(textArea);
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BillSearchHeader 
          onToggleFilters={() => setShowFilters(!showFilters)}
          showFilters={showFilters}
          totalResults={searchResults.totalCount}
          loading={loading}
          hasSearched={hasSearched}
          onDownloadCSV={handleDownloadCSV}
          onCopyToClipboard={handleCopyToClipboard}
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
            onViewDetails={handleViewDetails}
            onPrintBilty={handlePrintBilty}
            biltyType={searchFilters.biltyType}
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

        {/* Modals */}
        {showDetailsModal && selectedBilty && (
          <BillDetailsModal
            bilty={selectedBilty}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedBilty(null);
            }}
            cities={cities}
          />
        )}

        {showPrintModal && printData && (
          <PrintModal
            biltyData={printData}
            branchData={branchData}
            onClose={() => {
              setShowPrintModal(false);
              setPrintData(null);
            }}
          />
        )}
      </div>
    </div>
  );
}