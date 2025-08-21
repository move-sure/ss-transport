'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Navbar from '../../components/dashboard/navbar';
import BiltySearchHeader from '../../components/search/bilty-search-header';
import BiltyFilterPanel from '../../components/search/SearchFilters';
import CombinedBiltySearchTable from '../../components/search/combined-bilty-table';
import BiltyDetailsModal from '../../components/search/bilty-details-modal';
import PrintModal from '../../components/bilty/print-model';

export default function BiltySearch() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Debounce timer ref for performance optimization
  const debounceTimerRef = useRef(null);
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allBilties, setAllBilties] = useState([]);
  const [allStationBilties, setAllStationBilties] = useState([]);
  const [cities, setCities] = useState([]);
  const [branchData, setBranchData] = useState(null);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [hasMoreRegular, setHasMoreRegular] = useState(true);
  const [hasMoreStation, setHasMoreStation] = useState(true);
  const [regularOffset, setRegularOffset] = useState(0);
  const [stationOffset, setStationOffset] = useState(0);
  const [isFiltered, setIsFiltered] = useState(false);
  
  const INITIAL_LOAD_SIZE = 100; // Per table
  const LOAD_MORE_SIZE = 50; // Per table
  
  // Separate pending filters (user input) from applied filters (actual search)
  const [pendingFilters, setPendingFilters] = useState({
    dateFrom: '',
    dateTo: '',
    grNumber: '',
    consignorName: '',
    consigneeName: '',
    toCityId: '',
    paymentMode: '',
    hasEwayBill: '',
    savingOption: '',
    minAmount: '',
    maxAmount: '',
    pvtMarks: '' // Fixed field name to match database
  });

  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    grNumber: '',
    consignorName: '',
    consigneeName: '',
    toCityId: '',
    paymentMode: '',
    hasEwayBill: '',
    savingOption: '',
    minAmount: '',
    maxAmount: '',
    pvtMarks: '' // Fixed field name to match database
  });
  
  // Selection state
  const [selectedBilties, setSelectedBilties] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Pagination for display
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  
  // Modal states
  const [selectedBiltyForDetails, setSelectedBiltyForDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBilty, setSelectedBilty] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);  

  // Memoized filtered bilties - OPTIMIZED WITH PRIVATE MARK SEARCH
  const filteredBilties = useMemo(() => {
    if (!allBilties.length) return [];
    
    return allBilties.filter(bilty => {
      // Date filters
      if (appliedFilters.dateFrom && bilty.bilty_date < appliedFilters.dateFrom) return false;
      if (appliedFilters.dateTo && bilty.bilty_date > appliedFilters.dateTo) return false;
      
      // Text filters - optimized with early returns
      if (appliedFilters.grNumber && !bilty.gr_no.toLowerCase().includes(appliedFilters.grNumber.toLowerCase())) return false;
      if (appliedFilters.consignorName && !bilty.consignor_name.toLowerCase().includes(appliedFilters.consignorName.toLowerCase())) return false;
      if (appliedFilters.consigneeName && !(bilty.consignee_name?.toLowerCase().includes(appliedFilters.consigneeName.toLowerCase()))) return false;
      
      // Private mark search - fixed field name
      if (appliedFilters.pvtMarks && !(bilty.pvt_marks?.toLowerCase().includes(appliedFilters.pvtMarks.toLowerCase()))) return false;
      
      // FIXED: City filter with proper type conversion
      if (appliedFilters.toCityId) {
        const filterCityId = appliedFilters.toCityId.toString();
        const biltyCityId = bilty.to_city_id?.toString();
        if (biltyCityId !== filterCityId) return false;
      }
      
      // Payment and other filters
      if (appliedFilters.paymentMode && bilty.payment_mode !== appliedFilters.paymentMode) return false;
      if (appliedFilters.savingOption && bilty.saving_option !== appliedFilters.savingOption) return false;
      
      // E-way bill filter
      if (appliedFilters.hasEwayBill === 'yes' && (!bilty.e_way_bill || bilty.e_way_bill.trim() === '')) return false;
      if (appliedFilters.hasEwayBill === 'no' && bilty.e_way_bill && bilty.e_way_bill.trim() !== '') return false;
      
      // Amount filters
      const total = bilty.total || 0;
      if (appliedFilters.minAmount && total < parseFloat(appliedFilters.minAmount)) return false;
      if (appliedFilters.maxAmount && total > parseFloat(appliedFilters.maxAmount)) return false;
      
      return true;
    });
  }, [allBilties, appliedFilters]);

  // Memoized filtered station bilties - OPTIMIZED WITH PRIVATE MARK SEARCH
  const filteredStationBilties = useMemo(() => {
    if (!allStationBilties.length) return [];
    
    return allStationBilties.filter(bilty => {
      // Date filters (using created_at for station bilties)
      if (appliedFilters.dateFrom && bilty.created_at) {
        const biltyDate = bilty.created_at.split('T')[0];
        if (biltyDate < appliedFilters.dateFrom) return false;
      }
      if (appliedFilters.dateTo && bilty.created_at) {
        const biltyDate = bilty.created_at.split('T')[0];
        if (biltyDate > appliedFilters.dateTo) return false;
      }
      
      // Text filters - optimized with early returns
      if (appliedFilters.grNumber && !bilty.gr_no?.toLowerCase().includes(appliedFilters.grNumber.toLowerCase())) return false;
      if (appliedFilters.consignorName && !(bilty.consignor || '').toLowerCase().includes(appliedFilters.consignorName.toLowerCase())) return false;
      if (appliedFilters.consigneeName && !(bilty.consignee || '').toLowerCase().includes(appliedFilters.consigneeName.toLowerCase())) return false;
      
      // Private mark search for station bilties - fixed field name
      if (appliedFilters.pvtMarks && !(bilty.pvt_marks?.toLowerCase().includes(appliedFilters.pvtMarks.toLowerCase()))) return false;
      
      // FIXED: City filter for station bilties
      // Station bilties should be filtered by the 'station' field matching the selected city name
      if (appliedFilters.toCityId) {
        const selectedCity = cities.find(c => c.id?.toString() === appliedFilters.toCityId?.toString());
        if (selectedCity) {
          // Check if station name matches the selected city name (case insensitive)
          const stationName = (bilty.station || '').toLowerCase();
          const cityName = selectedCity.city_name.toLowerCase();
          const cityCode = (selectedCity.city_code || '').toLowerCase();
          
          // Station bilties should match if station name contains city name or city code
          if (!stationName.includes(cityName) && !stationName.includes(cityCode)) {
            return false;
          }
        }
      }
      
      // Payment filter with proper mapping
      if (appliedFilters.paymentMode) {
        const paymentModeMapping = {
          'to-pay': 'to-pay',
          'paid': 'paid',
          'freeofcost': 'foc'
        };
        const expectedStationPayment = paymentModeMapping[appliedFilters.paymentMode];
        if (expectedStationPayment && bilty.payment_status !== expectedStationPayment) return false;
        if (!expectedStationPayment && bilty.payment_status !== appliedFilters.paymentMode) return false;
      }
      
      // E-way bill filter
      if (appliedFilters.hasEwayBill === 'yes' && (!bilty.e_way_bill || bilty.e_way_bill.trim() === '')) return false;
      if (appliedFilters.hasEwayBill === 'no' && bilty.e_way_bill && bilty.e_way_bill.trim() !== '') return false;
      
      // Amount filters
      const amount = bilty.amount || 0;
      if (appliedFilters.minAmount && amount < parseFloat(appliedFilters.minAmount)) return false;
      if (appliedFilters.maxAmount && amount > parseFloat(appliedFilters.maxAmount)) return false;
      
      return true;
    });
  }, [allStationBilties, appliedFilters, cities]);

  // Memoized stats
  const stats = useMemo(() => {
    const total = allBilties.length + allStationBilties.length;
    const filtered = filteredBilties.length + filteredStationBilties.length;
    const selected = selectedBilties.size;
    
    const totalAmount = allBilties.reduce((sum, b) => sum + (b.total || 0), 0) + 
                       allStationBilties.reduce((sum, b) => sum + (b.amount || 0), 0);
    const selectedAmount = Array.from(selectedBilties).reduce((sum, id) => {
      const bilty = filteredBilties.find(b => b.id === id);
      const stationBilty = filteredStationBilties.find(b => b.id === id);
      return sum + (bilty?.total || 0) + (stationBilty?.amount || 0);
    }, 0);
    
    return {
      total,
      filtered,
      selected,
      totalAmount,
      selectedAmount
    };
  }, [allBilties, allStationBilties, filteredBilties, filteredStationBilties, selectedBilties]);

  // Load initial data
  useEffect(() => {
    if (user && user.branch_id) {
      loadInitialData();
    }
  }, [user]);

  // Clear selection when filtered data changes
  useEffect(() => {
    setSelectedBilties(new Set());
    setSelectAll(false);
    setCurrentPage(1); // Reset to first page when filters change
  }, [filteredBilties, filteredStationBilties]);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsFiltered(false);
      
      // Reset pagination state
      setRegularOffset(0);
      setStationOffset(0);
      setHasMoreRegular(true);
      setHasMoreStation(true);
      
      // Load cities and branch data
      const [citiesRes, branchRes] = await Promise.all([
        supabase.from('cities').select('*').order('city_name'),
        supabase.from('branches').select('*').eq('id', user.branch_id).single()
      ]);

      setCities(citiesRes.data || []);
      setBranchData(branchRes.data);      

      // Load initial limited data (100 records each)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      // Load regular bilties - LIMITED TO 100
      const { data, error, count } = await supabase
        .from('bilty')
        .select(`
          *,
          transit_details(
            id,
            challan_no,
            gr_no
          )
        `, { count: 'exact' })
        .eq('branch_id', user.branch_id)
        .eq('is_active', true)
        .gte('bilty_date', format(oneYearAgo, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false })
        .range(0, INITIAL_LOAD_SIZE - 1);

      if (error) {
        console.error('Regular bilty error details:', error);
        throw new Error(`Failed to load regular bilties: ${error.message}`);
      }

      // Check if there are more regular bilties
      setHasMoreRegular((count || 0) > INITIAL_LOAD_SIZE);
      setRegularOffset(INITIAL_LOAD_SIZE);

      // Load station bilties - LIMITED TO 100
      const { data: stationData, error: stationError, count: stationCount } = await supabase
        .from('station_bilty_summary')
        .select('*', { count: 'exact' })
        .gte('created_at', format(oneYearAgo, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false })
        .range(0, INITIAL_LOAD_SIZE - 1);

      if (stationError) {
        console.error('Station bilty error details:', stationError);
        console.warn('Station bilties could not be loaded, continuing with regular bilties only');
      }

      // Check if there are more station bilties
      setHasMoreStation((stationCount || 0) > INITIAL_LOAD_SIZE);
      setStationOffset(INITIAL_LOAD_SIZE);

      console.log('Loaded regular bilties:', data?.length || 0, 'of', count || 0);
      console.log('Loaded station bilties:', stationData?.length || 0, 'of', stationCount || 0);

      // Get unique staff IDs to fetch user data
      const regularStaffIds = data?.map(bilty => bilty.staff_id).filter(Boolean) || [];
      const stationStaffIds = stationData?.map(bilty => bilty.staff_id).filter(Boolean) || [];
      const allStaffIds = [...new Set([...regularStaffIds, ...stationStaffIds])];
      
      // Process data using helper function
      await processAndSetBiltyData(data || [], stationData || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load bilties');
    } finally {
      setLoading(false);
    }
  };

  // Handle pending filter changes (user input) with performance optimization
  const handleFilterChange = useCallback((newFilters) => {
    setPendingFilters(newFilters);
  }, []);

  // Handle search button click - apply pending filters with full database search
  const handleSearch = useCallback(async () => {
    console.log('Applying filters:', pendingFilters);
    
    // Check if any filter is applied
    const hasFilters = Object.values(pendingFilters).some(value => value !== '');
    
    if (hasFilters) {
      // Full database search when filters are applied
      setLoading(true);
      setIsFiltered(true);
      
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        // Load ALL regular bilties for filtering
        const { data: allRegularData, error: regularError } = await supabase
          .from('bilty')
          .select(`
            *,
            transit_details(
              id,
              challan_no,
              gr_no
            )
          `)
          .eq('branch_id', user.branch_id)
          .eq('is_active', true)
          .gte('bilty_date', format(oneYearAgo, 'yyyy-MM-dd'))
          .order('created_at', { ascending: false });

        // Load ALL station bilties for filtering
        const { data: allStationData, error: stationError } = await supabase
          .from('station_bilty_summary')
          .select('*')
          .gte('created_at', format(oneYearAgo, 'yyyy-MM-dd'))
          .order('created_at', { ascending: false });

        if (regularError) throw regularError;
        
        // Process the data same as before
        await processAndSetBiltyData(allRegularData || [], allStationData || []);
        
        console.log('Loaded ALL data for filtering - Regular:', allRegularData?.length || 0, 'Station:', allStationData?.length || 0);
        
      } catch (error) {
        console.error('Error loading filtered data:', error);
        setError(error.message || 'Failed to load filtered data');
      } finally {
        setLoading(false);
      }
    } else {
      // No filters applied, just update applied filters
      setIsFiltered(false);
    }
    
    // Debug city filter
    if (pendingFilters.toCityId) {
      const selectedCity = cities.find(c => c.id?.toString() === pendingFilters.toCityId?.toString());
      console.log('Selected city for filtering:', selectedCity);
      console.log('Will filter regular bilties by to_city_id:', pendingFilters.toCityId);
      console.log('Will filter station bilties by station name containing:', selectedCity?.city_name);
    }
    
    setAppliedFilters(pendingFilters);
  }, [pendingFilters, cities, user]);

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    const emptyFilters = {
      dateFrom: '',
      dateTo: '',
      grNumber: '',
      consignorName: '',
      consigneeName: '',
      toCityId: '',
      paymentMode: '',
      hasEwayBill: '',
      savingOption: '',
      minAmount: '',
      maxAmount: '',
      pvtMarks: '' // Fixed field name
    };
    setPendingFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setIsFiltered(false);
    
    // Reload initial data
    if (user && user.branch_id) {
      loadInitialData();
    }
  }, [user]);

  const handleSelectBilty = useCallback((biltyId) => {
    setSelectedBilties(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(biltyId)) {
        newSelected.delete(biltyId);
      } else {
        newSelected.add(biltyId);
      }
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedBilties(new Set());
      setSelectAll(false);
    } else {
      const allRegularIds = filteredBilties.map(b => b.id);
      const allStationIds = filteredStationBilties.map(b => b.id);
      const allIds = new Set([...allRegularIds, ...allStationIds]);
      setSelectedBilties(allIds);
      setSelectAll(true);
    }
  }, [selectAll, filteredBilties, filteredStationBilties]);

  const handleBiltyDoubleClick = useCallback((bilty) => {
    setSelectedBiltyForDetails(bilty);
    setShowDetailsModal(true);
  }, []);

  const handleExportSelected = useCallback(() => {
    if (selectedBilties.size === 0) {
      alert('Please select bilties to export');
      return;
    }
    
    const selectedRegularBilties = filteredBilties.filter(b => selectedBilties.has(b.id));
    const selectedStationBilties = filteredStationBilties.filter(b => selectedBilties.has(b.id));
    
    exportToCSV([...selectedRegularBilties, ...selectedStationBilties]);
  }, [selectedBilties, filteredBilties, filteredStationBilties]);  

  const exportToCSV = (data) => {
    const headers = [
      'Type', 'GR Number', 'Date', 'Consignor', 'Consignee', 'Private Mark', 'From City', 'To City',
      'Transport', 'Payment Mode', 'Packages', 'Weight', 'Rate', 'Amount',
      'E-Way Bill', 'Invoice No', 'Status', 'Challan Details', 'Created By', 'Created Date'
    ];
    
    const csvContent = [
      headers.join(','),
      ...data.map(bilty => [
        bilty.bilty_type === 'station' ? 'STATION' : 'REGULAR',
        bilty.gr_no,
        bilty.bilty_type === 'station' 
          ? format(new Date(bilty.created_at), 'dd/MM/yyyy')
          : format(new Date(bilty.bilty_date), 'dd/MM/yyyy'),
        bilty.bilty_type === 'station' 
          ? `"${bilty.consignor || 'N/A'}"` 
          : `"${bilty.consignor_name}"`,
        bilty.bilty_type === 'station' 
          ? `"${bilty.consignee || 'N/A'}"` 
          : `"${bilty.consignee_name || 'N/A'}"`,
        `"${bilty.pvt_marks || 'N/A'}"`, // Fixed field name for private marks
        bilty.bilty_type === 'station' 
          ? `"${bilty.station || 'N/A'}"` 
          : getFromCityName(),
        bilty.bilty_type === 'station' 
          ? 'N/A' 
          : getCityName(bilty.to_city_id),
        bilty.bilty_type === 'station' 
          ? 'N/A' 
          : `"${bilty.transport_name || 'N/A'}"`,
        bilty.bilty_type === 'station' 
          ? bilty.payment_status 
          : bilty.payment_mode,
        bilty.bilty_type === 'station' 
          ? bilty.no_of_packets || 0 
          : bilty.no_of_pkg || 0,
        bilty.bilty_type === 'station' 
          ? bilty.weight || 0 
          : bilty.wt || 0,
        bilty.bilty_type === 'station' 
          ? 'N/A' 
          : bilty.rate || 0,
        bilty.bilty_type === 'station' 
          ? bilty.amount || 0 
          : bilty.total || 0,
        bilty.e_way_bill || 'N/A',
        bilty.bilty_type === 'station' 
          ? 'N/A' 
          : bilty.invoice_no || 'N/A',
        bilty.bilty_type === 'station' 
          ? bilty.payment_status 
          : bilty.saving_option,
        bilty.transit_details && bilty.transit_details.length > 0 ? bilty.transit_details[0].challan_no : 'AVL',
        bilty.created_by_user ? (bilty.created_by_user.name || bilty.created_by_user.username) : 'N/A',
        format(new Date(bilty.created_at), 'dd/MM/yyyy HH:mm')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bilties_${format(new Date(), 'ddMMyyyy_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper functions
  const getCityName = useCallback((cityId) => {
    const city = cities.find(c => c.id?.toString() === cityId?.toString());
    return city ? city.city_name : 'N/A';
  }, [cities]);

  const getFromCityName = useCallback(() => {
    const city = cities.find(c => c.city_code === branchData?.city_code);
    return city ? city.city_name : 'N/A';
  }, [cities, branchData]);

  // Action handlers
  const handleEdit = useCallback((bilty) => {
    localStorage.setItem('editBiltyData', JSON.stringify({
      biltyId: bilty.id,
      grNo: bilty.gr_no,
      editMode: true
    }));
    router.push('/bilty');
  }, [router]);

  const handlePrint = useCallback((bilty) => {
    setSelectedBilty(bilty);
    setShowPrintModal(true);
  }, []);

  const handleWebPrint = useCallback(() => {
    setShowPrintModal(false);
    window.print();
  }, []);

  const handleSaveOnly = useCallback(() => {
    setShowPrintModal(false);
  }, []);

  // Helper function to process and set bilty data
  const processAndSetBiltyData = async (regularData, stationData) => {
    // Get unique staff IDs to fetch user data
    const regularStaffIds = regularData?.map(bilty => bilty.staff_id).filter(Boolean) || [];
    const stationStaffIds = stationData?.map(bilty => bilty.staff_id).filter(Boolean) || [];
    const allStaffIds = [...new Set([...regularStaffIds, ...stationStaffIds])];
    
    let usersData = [];
    if (allStaffIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, name')
        .in('id', allStaffIds);
        
      if (!usersError) {
        usersData = users || [];
      } else {
        console.warn('Could not load user data:', usersError);
      }
    }      

    // Combine bilty data with user data
    const biltiesWithUsers = regularData?.map(bilty => ({
      ...bilty,
      created_by_user: usersData.find(user => user.id === bilty.staff_id) || null
    })) || [];

    // Combine station bilty data with user data
    const stationBiltiesWithUsers = (stationData || []).map(stationBilty => ({
      ...stationBilty,
      created_by_user: usersData.find(user => user.id === stationBilty.staff_id) || null,
      transit_details: [],
      bilty_type: 'station',
      id: stationBilty.id,
      gr_no: stationBilty.gr_no || '',
      consignor: stationBilty.consignor || '',
      consignee: stationBilty.consignee || '',
      amount: stationBilty.amount || 0,
      payment_status: stationBilty.payment_status || 'unknown',
      e_way_bill: stationBilty.e_way_bill || '',
      created_at: stationBilty.created_at
    }));

    // Check transit details for station bilties
    if (stationBiltiesWithUsers.length > 0) {
      try {
        const stationGRNumbers = stationBiltiesWithUsers.map(b => b.gr_no).filter(Boolean);
        
        if (stationGRNumbers.length > 0) {
          const { data: transitData, error: transitError } = await supabase
            .from('transit_details')
            .select('gr_no, challan_no')
            .in('gr_no', stationGRNumbers);

          if (!transitError && transitData) {
            stationBiltiesWithUsers.forEach(bilty => {
              const transitDetail = transitData.find(t => t.gr_no === bilty.gr_no);
              if (transitDetail) {
                bilty.transit_details = [{ challan_no: transitDetail.challan_no }];
              }
            });
          }
        }
      } catch (transitError) {
        console.warn('Could not load transit details for station bilties:', transitError);
      }
    }

    setAllBilties(biltiesWithUsers);
    setAllStationBilties(stationBiltiesWithUsers);
    
    console.log('Final regular bilties count:', biltiesWithUsers.length);
    console.log('Final station bilties count:', stationBiltiesWithUsers.length);
  };

  // Load more data function
  const loadMoreData = async () => {
    if (loadingMore || isFiltered || (!hasMoreRegular && !hasMoreStation)) return;
    
    setLoadingMore(true);
    
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const promises = [];
      
      // Load more regular bilties if available
      if (hasMoreRegular) {
        promises.push(
          supabase
            .from('bilty')
            .select(`
              *,
              transit_details(
                id,
                challan_no,
                gr_no
              )
            `, { count: 'exact' })
            .eq('branch_id', user.branch_id)
            .eq('is_active', true)
            .gte('bilty_date', format(oneYearAgo, 'yyyy-MM-dd'))
            .order('created_at', { ascending: false })
            .range(regularOffset, regularOffset + LOAD_MORE_SIZE - 1)
        );
      }
      
      // Load more station bilties if available
      if (hasMoreStation) {
        promises.push(
          supabase
            .from('station_bilty_summary')
            .select('*', { count: 'exact' })
            .gte('created_at', format(oneYearAgo, 'yyyy-MM-dd'))
            .order('created_at', { ascending: false })
            .range(stationOffset, stationOffset + LOAD_MORE_SIZE - 1)
        );
      }
      
      const results = await Promise.all(promises);
      let regularResult = null;
      let stationResult = null;
      
      if (hasMoreRegular && hasMoreStation) {
        [regularResult, stationResult] = results;
      } else if (hasMoreRegular) {
        [regularResult] = results;
      } else if (hasMoreStation) {
        [stationResult] = results;
      }
      
      // Process regular bilties
      if (regularResult && !regularResult.error) {
        const newRegularData = regularResult.data || [];
        const newRegularWithUsers = await processNewBiltyData(newRegularData, 'regular');
        
        setAllBilties(prev => [...prev, ...newRegularWithUsers]);
        setRegularOffset(prev => prev + LOAD_MORE_SIZE);
        setHasMoreRegular(newRegularData.length === LOAD_MORE_SIZE);
        
        console.log('Loaded more regular bilties:', newRegularData.length);
      }
      
      // Process station bilties
      if (stationResult && !stationResult.error) {
        const newStationData = stationResult.data || [];
        const newStationWithUsers = await processNewBiltyData(newStationData, 'station');
        
        setAllStationBilties(prev => [...prev, ...newStationWithUsers]);
        setStationOffset(prev => prev + LOAD_MORE_SIZE);
        setHasMoreStation(newStationData.length === LOAD_MORE_SIZE);
        
        console.log('Loaded more station bilties:', newStationData.length);
      }
      
    } catch (error) {
      console.error('Error loading more data:', error);
      setError('Failed to load more data');
    } finally {
      setLoadingMore(false);
    }
  };

  // Helper to process new bilty data
  const processNewBiltyData = async (data, type) => {
    const staffIds = data.map(bilty => bilty.staff_id).filter(Boolean);
    let usersData = [];
    
    if (staffIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, name')
        .in('id', staffIds);
      usersData = users || [];
    }
    
    if (type === 'regular') {
      return data.map(bilty => ({
        ...bilty,
        created_by_user: usersData.find(user => user.id === bilty.staff_id) || null
      }));
    } else {
      // Station bilties
      const stationBiltiesWithUsers = data.map(stationBilty => ({
        ...stationBilty,
        created_by_user: usersData.find(user => user.id === stationBilty.staff_id) || null,
        transit_details: [],
        bilty_type: 'station',
        id: stationBilty.id,
        gr_no: stationBilty.gr_no || '',
        consignor: stationBilty.consignor || '',
        consignee: stationBilty.consignee || '',
        amount: stationBilty.amount || 0,
        payment_status: stationBilty.payment_status || 'unknown',
        e_way_bill: stationBilty.e_way_bill || '',
        created_at: stationBilty.created_at
      }));
      
      // Add transit details
      if (stationBiltiesWithUsers.length > 0) {
        try {
          const stationGRNumbers = stationBiltiesWithUsers.map(b => b.gr_no).filter(Boolean);
          
          if (stationGRNumbers.length > 0) {
            const { data: transitData } = await supabase
              .from('transit_details')
              .select('gr_no, challan_no')
              .in('gr_no', stationGRNumbers);

            if (transitData) {
              stationBiltiesWithUsers.forEach(bilty => {
                const transitDetail = transitData.find(t => t.gr_no === bilty.gr_no);
                if (transitDetail) {
                  bilty.transit_details = [{ challan_no: transitDetail.challan_no }];
                }
              });
            }
          }
        } catch (transitError) {
          console.warn('Could not load transit details for new station bilties:', transitError);
        }
      }
      
      return stationBiltiesWithUsers;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      <div className="p-2">
        <div className="max-w-full space-y-4">
        {/* Header Component */}
        <BiltySearchHeader 
          stats={stats}
          loading={loading}
          error={error}
          onRefresh={loadInitialData}
          selectedCount={selectedBilties.size}
          onExport={handleExportSelected}
          selectedBilties={selectedBilties}
          filteredBilties={filteredBilties}
          filteredStationBilties={filteredStationBilties}
          cities={cities}
          branchData={branchData}
          isFiltered={isFiltered}
          hasMore={hasMoreRegular || hasMoreStation}
          onLoadMore={loadMoreData}
          loadingMore={loadingMore}
        />

        {/* Filter Panel Component */}
        <BiltyFilterPanel
          filters={pendingFilters}
          cities={cities}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          onSearch={handleSearch}
          appliedFilters={appliedFilters}
        />        

        {/* Table Component */}
        <CombinedBiltySearchTable
          regularBilties={filteredBilties}
          stationBilties={filteredStationBilties}
          loading={loading}
          error={error}
          selectedBilties={selectedBilties}
          selectAll={selectAll}
          getCityName={getCityName}
          getFromCityName={getFromCityName}
          onSelectBilty={handleSelectBilty}
          onSelectAll={handleSelectAll}
          onBiltyDoubleClick={handleBiltyDoubleClick}
          onEdit={handleEdit}
          onPrint={handlePrint}
          onRefresh={loadInitialData}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
        />

        {/* Pagination Controls */}
        {(filteredBilties.length + filteredStationBilties.length > itemsPerPage) && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-600">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBilties.length + filteredStationBilties.length)} - {Math.min(currentPage * itemsPerPage, filteredBilties.length + filteredStationBilties.length)} of {filteredBilties.length + filteredStationBilties.length} bilties
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil((filteredBilties.length + filteredStationBilties.length) / itemsPerPage)) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  {Math.ceil((filteredBilties.length + filteredStationBilties.length) / itemsPerPage) > 5 && (
                    <>
                      <span className="px-2 text-slate-500">...</span>
                      <button
                        onClick={() => setCurrentPage(Math.ceil((filteredBilties.length + filteredStationBilties.length) / itemsPerPage))}
                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                          currentPage === Math.ceil((filteredBilties.length + filteredStationBilties.length) / itemsPerPage)
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {Math.ceil((filteredBilties.length + filteredStationBilties.length) / itemsPerPage)}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil((filteredBilties.length + filteredStationBilties.length) / itemsPerPage)))}
                  disabled={currentPage === Math.ceil((filteredBilties.length + filteredStationBilties.length) / itemsPerPage)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        <BiltyDetailsModal
          bilty={selectedBiltyForDetails}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          getCityName={getCityName}
          getFromCityName={getFromCityName}
          onEdit={handleEdit}
          onPrint={handlePrint}
        />

        {/* Print Modal */}
        <PrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          onPrint={handleWebPrint}
          onSaveOnly={handleSaveOnly}
          biltyData={selectedBilty}
          branchData={branchData}
          fromCityName={getFromCityName()}
          toCityName={selectedBilty ? getCityName(selectedBilty.to_city_id) : ''}
          showShortcuts={false}
        />
        </div>
      </div>
    </div>
  );
}