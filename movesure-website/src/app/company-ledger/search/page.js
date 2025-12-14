'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import { Search, Package, Eye, EyeOff } from 'lucide-react';
import LedgerSearchFilters from '../../../components/company-ledger/search/search-filters';
import LedgerSearchTable from '../../../components/company-ledger/search/search-table';
import SelectedBiltiesPanel from '../../../components/company-ledger/search/selected-panel';
import SearchPagination from '../../../components/company-ledger/search/search-pagination';

export default function LedgerSearchPage() {
  const { user, requireAuth } = useAuth();
  
  // Core state
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [error, setError] = useState(null);
  
  // Search state
  const [searchFilters, setSearchFilters] = useState({
    dateFrom: '',
    dateTo: '',
    grNumber: '',
    consignorName: '',
    consigneeName: '',
    pvtMarks: '',
    cityName: '',
    paymentMode: '',
    biltyType: 'all'
  });
  
  const [searchResults, setSearchResults] = useState({
    regular: [],
    station: [],
    totalCount: 0
  });
  
  const [hasSearched, setHasSearched] = useState(false);
  
  // Selection state
  const [selectedBilties, setSelectedBilties] = useState([]);
  const [selectedBiltiesData, setSelectedBiltiesData] = useState([]);
  const [showSelectedPanel, setShowSelectedPanel] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Check authentication
  useEffect(() => {
    if (!requireAuth()) return;
  }, [requireAuth]);

  // Fetch cities on mount
  useEffect(() => {
    if (user) {
      fetchCities();
    }
  }, [user]);

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

  const handleFilterChange = (filterName, value) => {
    if (typeof filterName === 'object') {
      setSearchFilters(prev => ({ ...prev, ...filterName }));
    } else {
      setSearchFilters(prev => ({ ...prev, [filterName]: value }));
    }
  };

  const handleClearFilters = () => {
    setSearchFilters({
      dateFrom: '',
      dateTo: '',
      grNumber: '',
      consignorName: '',
      consigneeName: '',
      pvtMarks: '',
      cityName: '',
      paymentMode: '',
      biltyType: 'all'
    });
    setHasSearched(false);
    setSearchResults({ regular: [], station: [], totalCount: 0 });
    setCurrentPage(1);
  };

  const performSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      setCurrentPage(1);

      const promises = [];
      
      if (searchFilters.biltyType === 'all' || searchFilters.biltyType === 'regular') {
        promises.push(searchRegularBilties());
      } else {
        promises.push(Promise.resolve([]));
      }
      
      if (searchFilters.biltyType === 'all' || searchFilters.biltyType === 'station') {
        promises.push(searchStationBilties());
      } else {
        promises.push(Promise.resolve([]));
      }

      const results = await Promise.allSettled(promises);
      
      const regularResults = results[0].status === 'fulfilled' ? results[0].value : [];
      const stationResults = results[1].status === 'fulfilled' ? results[1].value : [];
      
      setSearchResults({
        regular: regularResults,
        station: stationResults,
        totalCount: regularResults.length + stationResults.length
      });
      
    } catch (error) {
      console.error('Search error:', error);
      setError(`Search failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const searchRegularBilties = async () => {
    let query = supabase
      .from('bilty')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (user?.branch_id) {
      query = query.eq('branch_id', user.branch_id);
    }

    if (searchFilters.grNumber?.trim()) {
      query = query.ilike('gr_no', `%${searchFilters.grNumber.trim()}%`);
    }

    if (searchFilters.dateFrom && searchFilters.dateTo) {
      query = query.gte('bilty_date', searchFilters.dateFrom).lte('bilty_date', searchFilters.dateTo);
    } else if (searchFilters.dateFrom) {
      query = query.gte('bilty_date', searchFilters.dateFrom);
    } else if (searchFilters.dateTo) {
      query = query.lte('bilty_date', searchFilters.dateTo);
    }

    if (searchFilters.consignorName?.trim()) {
      query = query.ilike('consignor_name', `%${searchFilters.consignorName.trim()}%`);
    }

    if (searchFilters.consigneeName?.trim()) {
      query = query.ilike('consignee_name', `%${searchFilters.consigneeName.trim()}%`);
    }

    if (searchFilters.pvtMarks?.trim()) {
      query = query.ilike('pvt_marks', `%${searchFilters.pvtMarks.trim()}%`);
    }

    if (searchFilters.cityName?.trim()) {
      const { data: matchingCities } = await supabase
        .from('cities')
        .select('id')
        .ilike('city_name', `%${searchFilters.cityName.trim()}%`);
      
      if (matchingCities && matchingCities.length > 0) {
        const cityIds = matchingCities.map(city => city.id);
        query = query.in('to_city_id', cityIds);
      } else {
        return [];
      }
    }

    if (searchFilters.paymentMode) {
      query = query.eq('payment_mode', searchFilters.paymentMode);
    }

    query = query.order('created_at', { ascending: false }).limit(5000);

    const { data, error } = await query;
    if (error) throw error;
    
    // Get city names
    const cityIds = [...new Set((data || []).map(b => b.to_city_id).filter(Boolean))];
    let cityMap = {};
    
    if (cityIds.length > 0) {
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
    }
    
    // Get challan numbers
    const grNumbers = (data || []).map(b => b.gr_no).filter(Boolean);
    let challanMap = {};
    
    if (grNumbers.length > 0) {
      const { data: transitData } = await supabase
        .from('transit_details')
        .select('gr_no, challan_no')
        .in('gr_no', grNumbers);
      
      if (transitData) {
        challanMap = transitData.reduce((map, t) => {
          map[t.gr_no] = t.challan_no;
          return map;
        }, {});
      }
    }
    
    return (data || []).map(bilty => {
      const cityInfo = cityMap[bilty.to_city_id] || { name: 'N/A', code: 'N/A' };
      return {
        ...bilty,
        type: 'regular',
        to_city_name: cityInfo.name,
        to_city_code: cityInfo.code,
        challan_no: challanMap[bilty.gr_no] || 'N/A'
      };
    });
  };

  const searchStationBilties = async () => {
    let query = supabase.from('station_bilty_summary').select('*');

    if (searchFilters.grNumber?.trim()) {
      query = query.ilike('gr_no', `%${searchFilters.grNumber.trim()}%`);
    }

    if (searchFilters.dateFrom && searchFilters.dateTo) {
      query = query.gte('created_at', searchFilters.dateFrom).lte('created_at', searchFilters.dateTo);
    } else if (searchFilters.dateFrom) {
      query = query.gte('created_at', searchFilters.dateFrom);
    } else if (searchFilters.dateTo) {
      query = query.lte('created_at', searchFilters.dateTo);
    }

    if (searchFilters.consignorName?.trim()) {
      query = query.ilike('consignor', `%${searchFilters.consignorName.trim()}%`);
    }

    if (searchFilters.consigneeName?.trim()) {
      query = query.ilike('consignee', `%${searchFilters.consigneeName.trim()}%`);
    }

    if (searchFilters.pvtMarks?.trim()) {
      query = query.ilike('pvt_marks', `%${searchFilters.pvtMarks.trim()}%`);
    }

    if (searchFilters.cityName?.trim()) {
      const { data: matchingCities } = await supabase
        .from('cities')
        .select('city_code')
        .ilike('city_name', `%${searchFilters.cityName.trim()}%`);
      
      if (matchingCities && matchingCities.length > 0) {
        const cityCodes = matchingCities.map(city => city.city_code);
        query = query.in('station', cityCodes);
      } else {
        query = query.ilike('station', `%${searchFilters.cityName.trim()}%`);
      }
    }

    if (searchFilters.paymentMode) {
      query = query.eq('payment_status', searchFilters.paymentMode);
    }

    query = query.order('created_at', { ascending: false }).limit(5000);

    const { data, error } = await query;
    if (error) throw error;
    
    // Get challan numbers
    const grNumbers = (data || []).map(b => b.gr_no).filter(Boolean);
    const stationCodes = [...new Set((data || []).map(b => b.station).filter(Boolean))];
    let challanMap = {};
    let cityMap = {};
    
    if (grNumbers.length > 0) {
      const { data: transitData } = await supabase
        .from('transit_details')
        .select('gr_no, challan_no')
        .in('gr_no', grNumbers);
      
      if (transitData) {
        challanMap = transitData.reduce((map, t) => {
          map[t.gr_no] = t.challan_no;
          return map;
        }, {});
      }
    }
    
    if (stationCodes.length > 0) {
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
    }
    
    return (data || []).map(bilty => ({
      ...bilty,
      type: 'station',
      challan_no: challanMap[bilty.gr_no] || 'N/A',
      station_city_name: cityMap[bilty.station] || bilty.station || 'N/A'
    }));
  };

  // Selection handlers
  const handleSelectBilty = useCallback((bilty) => {
    const biltyKey = `${bilty.type}-${bilty.id}`;
    
    setSelectedBilties(prev => {
      if (prev.includes(biltyKey)) {
        return prev.filter(key => key !== biltyKey);
      }
      return [...prev, biltyKey];
    });
    
    setSelectedBiltiesData(prev => {
      const exists = prev.some(b => b.type === bilty.type && b.id === bilty.id);
      if (exists) {
        return prev.filter(b => !(b.type === bilty.type && b.id === bilty.id));
      }
      return [...prev, bilty];
    });
  }, []);

  const handleSelectAll = useCallback((pageData, allSelected) => {
    if (allSelected) {
      // Deselect all on current page
      const pageKeys = pageData.map(b => `${b.type}-${b.id}`);
      setSelectedBilties(prev => prev.filter(key => !pageKeys.includes(key)));
      setSelectedBiltiesData(prev => prev.filter(b => 
        !pageData.some(p => p.type === b.type && p.id === b.id)
      ));
    } else {
      // Select all on current page
      const newKeys = pageData.map(b => `${b.type}-${b.id}`);
      setSelectedBilties(prev => [...new Set([...prev, ...newKeys])]);
      setSelectedBiltiesData(prev => {
        const existingKeys = prev.map(b => `${b.type}-${b.id}`);
        const newBilties = pageData.filter(b => !existingKeys.includes(`${b.type}-${b.id}`));
        return [...prev, ...newBilties];
      });
    }
  }, []);

  const handleRemoveBilty = (bilty) => {
    const biltyKey = `${bilty.type}-${bilty.id}`;
    setSelectedBilties(prev => prev.filter(key => key !== biltyKey));
    setSelectedBiltiesData(prev => prev.filter(b => !(b.type === bilty.type && b.id === bilty.id)));
  };

  const handleClearAllSelected = () => {
    setSelectedBilties([]);
    setSelectedBiltiesData([]);
    setShowSelectedPanel(false);
  };

  // Export handlers
  const handleDownloadCSV = () => {
    if (selectedBiltiesData.length === 0) return;
    
    const headers = ['GR No', 'Type', 'Date', 'Consignor', 'Consignee', 'City', 'Packages', 'Weight', 'Payment', 'Amount', 'Pvt Marks', 'Challan'];
    
    const rows = selectedBiltiesData.map(b => [
      b.gr_no,
      b.type,
      b.bilty_date || b.created_at || '',
      b.consignor_name || b.consignor || '',
      b.consignee_name || b.consignee || '',
      b.to_city_name || b.station_city_name || b.station || '',
      b.no_of_pkg || b.packages || 0,
      b.wt || b.weight || 0,
      b.payment_mode || b.payment_status || '',
      b.total || b.grand_total || b.amount || 0,
      b.pvt_marks || '',
      b.challan_no || ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bilty_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleCopyToClipboard = async () => {
    if (selectedBiltiesData.length === 0) return;
    
    const text = selectedBiltiesData.map(b => 
      `${b.gr_no} | ${b.consignor_name || b.consignor} → ${b.consignee_name || b.consignee} | ${b.to_city_name || b.station_city_name || b.station} | ₹${b.total || b.grand_total || b.amount || 0}`
    ).join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Pagination
  const totalPages = useMemo(() => {
    return Math.ceil(searchResults.totalCount / itemsPerPage);
  }, [searchResults.totalCount, itemsPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  return (
    <div className="p-4 w-full h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-lg">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bill Search</h1>
            <p className="text-sm text-gray-500">Search bilties from all tables</p>
          </div>
        </div>
        
        {selectedBilties.length > 0 && (
          <button
            onClick={() => setShowSelectedPanel(!showSelectedPanel)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {showSelectedPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <Package className="h-4 w-4" />
            <span>{selectedBilties.length} Selected</span>
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Search Filters */}
      <LedgerSearchFilters
        filters={searchFilters}
        onFilterChange={handleFilterChange}
        onSearch={performSearch}
        onClearFilters={handleClearFilters}
        cities={cities}
        loading={loading}
      />

      {/* Results Table */}
      {hasSearched && (
        <>
          <LedgerSearchTable
            data={searchResults}
            loading={loading}
            selectedBilties={selectedBilties}
            onSelectBilty={handleSelectBilty}
            onSelectAll={handleSelectAll}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
          />
          
          {/* Pagination */}
          <SearchPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={searchResults.totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </>
      )}

      {/* Initial state */}
      {!hasSearched && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Search Bilties</h3>
          <p className="text-sm text-gray-500">Use the filters above and click Search to find bilties</p>
        </div>
      )}

      {/* Selected Panel */}
      {showSelectedPanel && (
        <SelectedBiltiesPanel
          selectedBilties={selectedBiltiesData}
          onRemove={handleRemoveBilty}
          onClearAll={handleClearAllSelected}
          onClose={() => setShowSelectedPanel(false)}
          onDownloadCSV={handleDownloadCSV}
          onCopyToClipboard={handleCopyToClipboard}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}
