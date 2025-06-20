'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import BiltySearchHeader from '../../components/search/bilty-search-header';
import BiltyFilterPanel from '../../components/search/SearchFilters';
import BiltySearchTable from '../../components/search/bilty-table';
import BiltyDetailsModal from '../../components/search/bilty-details-modal';
import PrintModal from '../../components/bilty/print-model';

export default function BiltySearch() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [allBilties, setAllBilties] = useState([]);
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
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Memoized filtered bilties - only recalculate when allBilties or filters change
  const filteredBilties = useMemo(() => {
    if (!allBilties.length) return [];
    
    let filtered = [...allBilties];
    
    // Apply filters
    if (filters.dateFrom) {
      filtered = filtered.filter(b => b.bilty_date >= filters.dateFrom);
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(b => b.bilty_date <= filters.dateTo);
    }
    
    if (filters.grNumber) {
      filtered = filtered.filter(b => 
        b.gr_no.toLowerCase().includes(filters.grNumber.toLowerCase())
      );
    }
    
    if (filters.consignorName) {
      filtered = filtered.filter(b => 
        b.consignor_name.toLowerCase().includes(filters.consignorName.toLowerCase())
      );
    }
    
    if (filters.consigneeName) {
      filtered = filtered.filter(b => 
        b.consignee_name?.toLowerCase().includes(filters.consigneeName.toLowerCase())
      );
    }
    
    if (filters.toCityId) {
      filtered = filtered.filter(b => b.to_city_id === filters.toCityId);
    }
    
    if (filters.paymentMode) {
      filtered = filtered.filter(b => b.payment_mode === filters.paymentMode);
    }
    
    if (filters.hasEwayBill === 'yes') {
      filtered = filtered.filter(b => b.e_way_bill && b.e_way_bill.trim() !== '');
    } else if (filters.hasEwayBill === 'no') {
      filtered = filtered.filter(b => !b.e_way_bill || b.e_way_bill.trim() === '');
    }
    
    if (filters.savingOption) {
      filtered = filtered.filter(b => b.saving_option === filters.savingOption);
    }
    
    if (filters.minAmount) {
      filtered = filtered.filter(b => (b.total || 0) >= parseFloat(filters.minAmount));
    }
    
    if (filters.maxAmount) {
      filtered = filtered.filter(b => (b.total || 0) <= parseFloat(filters.maxAmount));
    }
    
    return filtered;
  }, [allBilties, filters]);

  // Memoized stats
  const stats = useMemo(() => {
    const total = allBilties.length;
    const filtered = filteredBilties.length;
    const selected = selectedBilties.size;
    
    const totalAmount = allBilties.reduce((sum, b) => sum + (b.total || 0), 0);
    const selectedAmount = Array.from(selectedBilties).reduce((sum, id) => {
      const bilty = filteredBilties.find(b => b.id === id);
      return sum + (bilty?.total || 0);
    }, 0);
    
    return {
      total,
      filtered,
      selected,
      totalAmount,
      selectedAmount
    };
  }, [allBilties, filteredBilties, selectedBilties]);

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
  }, [filteredBilties]);

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
      setBranchData(branchRes.data);

      // Load all bilties (last 6 months by default)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);      const { data, error } = await supabase
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

      // Get unique staff IDs to fetch user data
      const staffIds = [...new Set(data?.map(bilty => bilty.staff_id).filter(Boolean))];
      
      let usersData = [];
      if (staffIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, username, name')
          .in('id', staffIds);
          
        if (!usersError) {
          usersData = users || [];
        }
      }

      // Combine bilty data with user data
      const biltiesWithUsers = data?.map(bilty => ({
        ...bilty,
        created_by_user: usersData.find(user => user.id === bilty.staff_id) || null
      })) || [];

      setAllBilties(biltiesWithUsers);
      
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
      const allIds = new Set(filteredBilties.map(b => b.id));
      setSelectedBilties(allIds);
      setSelectAll(true);
    }
  }, [selectAll, filteredBilties]);

  const handleBiltyDoubleClick = useCallback((bilty) => {
    setSelectedBiltyForDetails(bilty);
    setShowDetailsModal(true);
  }, []);

  const handleExportSelected = useCallback(() => {
    if (selectedBilties.size === 0) {
      alert('Please select bilties to export');
      return;
    }
    
    const selectedData = filteredBilties.filter(b => selectedBilties.has(b.id));
    exportToCSV(selectedData);
  }, [selectedBilties, filteredBilties]);
  const exportToCSV = (data) => {
    const headers = [
      'GR Number', 'Date', 'Consignor', 'Consignee', 'From City', 'To City',
      'Transport', 'Payment Mode', 'Packages', 'Weight', 'Rate', 'Amount',
      'E-Way Bill', 'Invoice No', 'Status', 'Challan Details', 'Created By', 'Created Date'
    ];
    
    const csvContent = [
      headers.join(','),
      ...data.map(bilty => [
        bilty.gr_no,
        format(new Date(bilty.bilty_date), 'dd/MM/yyyy'),
        `"${bilty.consignor_name}"`,
        `"${bilty.consignee_name || 'N/A'}"`,
        getFromCityName(),
        getCityName(bilty.to_city_id),
        `"${bilty.transport_name || 'N/A'}"`,
        bilty.payment_mode,
        bilty.no_of_pkg || 0,
        bilty.wt || 0,
        bilty.rate || 0,
        bilty.total || 0,
        bilty.e_way_bill || 'N/A',
        bilty.invoice_no || 'N/A',
        bilty.saving_option,
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
        />

        {/* Table Component */}
        <BiltySearchTable
          bilties={filteredBilties}
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