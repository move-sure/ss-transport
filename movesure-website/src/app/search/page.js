'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import BiltySearchHeader from '../../components/search/bilty-search-header';
import BiltyFilterPanel from '../../components/search/SearchFilters';
import CombinedBiltySearchTable from '../../components/search/combined-bilty-table';
import BiltyDetailsModal from '../../components/search/bilty-details-modal';
import PrintModal from '../../components/bilty/print-model';

export default function BiltySearch() {
  const { user } = useAuth();
  const router = useRouter();
    // Core state
  const [loading, setLoading] = useState(true);
  const [allBilties, setAllBilties] = useState([]);
  const [allStationBilties, setAllStationBilties] = useState([]);
  const [cities, setCities] = useState([]);
  const [branchData, setBranchData] = useState(null);
  const [error, setError] = useState(null);
  
  // Filter state with debounced updates
  const [filters, setFilters] = useState({
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
    maxAmount: ''
  });
  
  // Selection state
  const [selectedBilties, setSelectedBilties] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Modal states
  const [selectedBiltyForDetails, setSelectedBiltyForDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBilty, setSelectedBilty] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);  // Memoized filtered bilties - only recalculate when allBilties or filters change
  const filteredBilties = useMemo(() => {
    if (!allBilties.length) return [];
    
    return allBilties.filter(bilty => {
      // Date filters
      if (filters.dateFrom && bilty.bilty_date < filters.dateFrom) return false;
      if (filters.dateTo && bilty.bilty_date > filters.dateTo) return false;
      
      // Text filters
      if (filters.grNumber && !bilty.gr_no.toLowerCase().includes(filters.grNumber.toLowerCase())) return false;
      if (filters.consignorName && !bilty.consignor_name.toLowerCase().includes(filters.consignorName.toLowerCase())) return false;
      if (filters.consigneeName && !(bilty.consignee_name?.toLowerCase().includes(filters.consigneeName.toLowerCase()))) return false;
      
      // Select filters
      if (filters.toCityId && bilty.to_city_id !== filters.toCityId) return false;
      if (filters.paymentMode && bilty.payment_mode !== filters.paymentMode) return false;
      if (filters.savingOption && bilty.saving_option !== filters.savingOption) return false;
      
      // E-way bill filter
      if (filters.hasEwayBill === 'yes' && (!bilty.e_way_bill || bilty.e_way_bill.trim() === '')) return false;
      if (filters.hasEwayBill === 'no' && bilty.e_way_bill && bilty.e_way_bill.trim() !== '') return false;
      
      // Amount filters
      const total = bilty.total || 0;
      if (filters.minAmount && total < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && total > parseFloat(filters.maxAmount)) return false;
      
      return true;
    });
  }, [allBilties, filters]);

  // Memoized filtered station bilties
  const filteredStationBilties = useMemo(() => {
    if (!allStationBilties.length) return [];
    
    return allStationBilties.filter(bilty => {
      // Date filters (using created_at for station bilties)
      if (filters.dateFrom && bilty.created_at && bilty.created_at.split('T')[0] < filters.dateFrom) return false;
      if (filters.dateTo && bilty.created_at && bilty.created_at.split('T')[0] > filters.dateTo) return false;
      
      // Text filters
      if (filters.grNumber && !bilty.gr_no.toLowerCase().includes(filters.grNumber.toLowerCase())) return false;
      if (filters.consignorName && !(bilty.consignor || '').toLowerCase().includes(filters.consignorName.toLowerCase())) return false;
      if (filters.consigneeName && !(bilty.consignee || '').toLowerCase().includes(filters.consigneeName.toLowerCase())) return false;
      
      // Payment filter (payment_status for station bilties)
      if (filters.paymentMode && bilty.payment_status !== filters.paymentMode) return false;
      
      // E-way bill filter
      if (filters.hasEwayBill === 'yes' && (!bilty.e_way_bill || bilty.e_way_bill.trim() === '')) return false;
      if (filters.hasEwayBill === 'no' && bilty.e_way_bill && bilty.e_way_bill.trim() !== '') return false;
      
      // Amount filters (using amount field for station bilties)
      const amount = bilty.amount || 0;
      if (filters.minAmount && amount < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && amount > parseFloat(filters.maxAmount)) return false;
      
      return true;
    });
  }, [allStationBilties, filters]);
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
  }, [filteredBilties, filteredStationBilties]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load cities and branch data
      const [citiesRes, branchRes] = await Promise.all([
        supabase.from('cities').select('*').order('city_name'),
        supabase.from('branches').select('*').eq('id', user.branch_id).single()
      ]);

      setCities(citiesRes.data || []);
      setBranchData(branchRes.data);      // Load all bilties (last 6 months by default)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Load regular bilties
      const { data, error } = await supabase
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
        .gte('bilty_date', format(sixMonthsAgo, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      // Load station bilties
      const { data: stationData, error: stationError } = await supabase
        .from('station_bilty_summary')
        .select('*')
        .eq('branch_id', user.branch_id)
        .gte('created_at', format(sixMonthsAgo, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (stationError) {
        console.error('Station bilty error details:', stationError);
        // Don't throw error for station bilties, just log it
      }      // Get unique staff IDs to fetch user data (for both regular and station bilties)
      const regularStaffIds = data?.map(bilty => bilty.staff_id).filter(Boolean) || [];
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
        }
      }      // Combine bilty data with user data
      const biltiesWithUsers = data?.map(bilty => ({
        ...bilty,
        created_by_user: usersData.find(user => user.id === bilty.staff_id) || null
      })) || [];

      // Combine station bilty data with user data and check transit details efficiently
      const stationBiltiesWithUsers = (stationData || []).map(stationBilty => ({
        ...stationBilty,
        created_by_user: usersData.find(user => user.id === stationBilty.staff_id) || null,
        transit_details: [], // We'll check this separately if needed
        bilty_type: 'station' // Add identifier for station bilties
      }));

      // Check transit details for all station bilties at once
      if (stationBiltiesWithUsers.length > 0) {
        const stationGRNumbers = stationBiltiesWithUsers.map(b => b.gr_no);
        const { data: transitData } = await supabase
          .from('transit_details')
          .select('gr_no, challan_no')
          .in('gr_no', stationGRNumbers);

        // Map transit details back to station bilties
        stationBiltiesWithUsers.forEach(bilty => {
          const transitDetail = transitData?.find(t => t.gr_no === bilty.gr_no);
          if (transitDetail) {
            bilty.transit_details = [{ challan_no: transitDetail.challan_no }];
          }
        });
      }

      setAllBilties(biltiesWithUsers);
      setAllStationBilties(stationBiltiesWithUsers);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load bilties');
    } finally {
      setLoading(false);
    }
  };

  // Optimized filter change handler - no immediate re-render
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
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
      maxAmount: ''
    });
  }, []);

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
  }, [selectedBilties, filteredBilties, filteredStationBilties]);  const exportToCSV = (data) => {
    const headers = [
      'Type', 'GR Number', 'Date', 'Consignor', 'Consignee', 'From City', 'To City',
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
    const city = cities.find(c => c.id === cityId);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-2">
      <div className="max-w-full space-y-4">
        {/* Header Component */}
        <BiltySearchHeader 
          stats={stats}
          loading={loading}
          error={error}
          onRefresh={loadInitialData}
          selectedCount={selectedBilties.size}
          onExport={handleExportSelected}
        />

        {/* Filter Panel Component */}
        <BiltyFilterPanel
          filters={filters}
          cities={cities}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />        {/* Table Component */}
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
        />

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
  );
}