'use client';

import { useState, useEffect, useCallback } from 'react';
import supabase from '../../app/utils/supabase';

// Custom hook for rates management
export const useRatesManager = () => {
  const [rates, setRates] = useState([]);
  const [filteredRates, setFilteredRates] = useState([]);
  const [branches, setBranches] = useState([]);
  const [cities, setCities] = useState([]);
  const [consignors, setConsignors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30);
  const [totalRates, setTotalRates] = useState(0);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState('all'); // 'all', 'default', 'consignor'
  const [isSearching, setIsSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    branch_id: '',
    city_id: '',
    consignor_id: '',
    rate: '',
    is_default: false
  });
  const [editingId, setEditingId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Fetch static data (branches, cities, consignors)
  const fetchStaticData = useCallback(async () => {
    try {
      setDataLoading(true);
      
      const [branchesResult, citiesResult, consignorsResult] = await Promise.allSettled([
        supabase.from('branches').select('*').eq('is_active', true).order('branch_name'),
        supabase.from('cities').select('*').order('city_name'),
        supabase.from('consignors').select('*').order('company_name')
      ]);

      if (branchesResult.status === 'fulfilled' && !branchesResult.value.error) {
        setBranches(branchesResult.value.data || []);
      } else {
        console.warn('Could not load branches, using empty array');
        setBranches([]);
      }

      if (citiesResult.status === 'fulfilled' && !citiesResult.value.error) {
        setCities(citiesResult.value.data || []);
      } else {
        console.warn('Could not load cities, using empty array');
        setCities([]);
      }

      if (consignorsResult.status === 'fulfilled' && !consignorsResult.value.error) {
        setConsignors(consignorsResult.value.data || []);
      } else {
        console.warn('Could not load consignors, using empty array');
        setConsignors([]);
      }

    } catch (error) {
      console.warn('Error fetching static data:', error);
      setBranches([]);
      setCities([]);
      setConsignors([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Fetch related data in batches for fallback scenarios
  const fetchRelatedDataInBatches = async (ratesData) => {
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < ratesData.length; i += batchSize) {
      const batch = ratesData.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (rate) => {
          try {
            const [branchRes, cityRes, consignorRes] = await Promise.allSettled([
              supabase.from('branches').select('branch_name, branch_code').eq('id', rate.branch_id).single(),
              supabase.from('cities').select('city_name, city_code').eq('id', rate.city_id).single(),
              rate.consignor_id ? 
                supabase.from('consignors').select('company_name').eq('id', rate.consignor_id).single() : 
                Promise.resolve({ status: 'fulfilled', value: { data: null } })
            ]);
            
            return {
              ...rate,
              branches: branchRes.status === 'fulfilled' ? branchRes.value.data : null,
              cities: cityRes.status === 'fulfilled' ? cityRes.value.data : null,
              consignors: consignorRes.status === 'fulfilled' ? consignorRes.value.data : null
            };
          } catch (err) {
            console.warn('Error fetching related data for rate:', rate.id, err);
            return rate;
          }
        })
      );
      results.push(...batchResults);
    }
    
    return results;
  };

  // Fetch paginated rates
  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      
      // First get total count
      const countResult = await supabase
        .from('rates')
        .select('*', { count: 'exact', head: true });
      
      if (!countResult.error) {
        setTotalRates(countResult.count || 0);
      }

      // Then fetch paginated data with relations
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error } = await supabase
        .from('rates')
        .select(`
          *,
          branches!rates_branch_id_fkey (branch_name, branch_code),
          cities!rates_city_id_fkey (city_name, city_code),
          consignors!rates_consignor_id_fkey (company_name)
        `)
        .range(from, to)
        .order('id', { ascending: false });

      if (error) {
        console.warn('Error in fetchRates with joins, trying fallback:', error);
        const { data: basicData, error: basicError } = await supabase
          .from('rates')
          .select('*')
          .range(from, to)
          .order('id', { ascending: false });
        
        if (basicError) {
          console.warn('Fallback query also failed:', basicError);
          setRates([]);
          return;
        }
        
        const ratesWithDetails = await fetchRelatedDataInBatches(basicData || []);
        setRates(ratesWithDetails || []);
        return;
      }
      
      setRates(data || []);
    } catch (error) {
      console.warn('Error fetching rates:', error);
      setRates([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  // Enhanced search function that searches across all rates
  const performSearch = useCallback(async (searchValue = searchTerm, filterType = searchFilter) => {
    if (!searchValue.trim()) {
      setFilteredRates([]);
      setIsSearching(false);
      return;
    }

    try {
      setSearchLoading(true);
      setIsSearching(true);
      
      // Strategy 1: Try simple search on rates table first
      let query = supabase.from('rates').select('*');

      // Apply filter-specific conditions
      if (filterType === 'default') {
        query = query.eq('is_default', true);
      } else if (filterType === 'consignor') {
        query = query.eq('is_default', false).not('consignor_id', 'is', null);
      }

      // Try to search by rate amount first (if it's a number)
      const numericValue = parseFloat(searchValue);
      if (!isNaN(numericValue)) {
        query = query.eq('rate', numericValue);
      }

      query = query.order('id', { ascending: false });
      
      const { data: basicResults, error: basicError } = await query;

      if (basicError) {
        console.warn('Basic search failed:', basicError);
        await fallbackSearch(searchValue, filterType);
        return;
      }

      // If numeric search found results, get their details and return
      if (!isNaN(numericValue) && basicResults && basicResults.length > 0) {
        const resultsWithDetails = await fetchRelatedDataInBatches(basicResults);
        setFilteredRates(resultsWithDetails || []);
        return;
      }

      // Strategy 2: Search in related tables and get matching IDs
      const searchLower = searchValue.toLowerCase();
      
      // Search branches
      const { data: matchingBranches } = await supabase
        .from('branches')
        .select('id')
        .or(`branch_name.ilike.%${searchValue}%,branch_code.ilike.%${searchValue}%`);

      // Search cities  
      const { data: matchingCities } = await supabase
        .from('cities')
        .select('id')
        .or(`city_name.ilike.%${searchValue}%,city_code.ilike.%${searchValue}%`);

      // Search consignors
      const { data: matchingConsignors } = await supabase
        .from('consignors')
        .select('id')
        .ilike('company_name', `%${searchValue}%`);

      // Collect all matching IDs
      const branchIds = matchingBranches?.map(b => b.id) || [];
      const cityIds = matchingCities?.map(c => c.id) || [];
      const consignorIds = matchingConsignors?.map(c => c.id) || [];

      // Strategy 3: Search rates using the matching IDs
      let searchQuery = supabase.from('rates').select('*');

      // Apply filter conditions
      if (filterType === 'default') {
        searchQuery = searchQuery.eq('is_default', true);
      } else if (filterType === 'consignor') {
        searchQuery = searchQuery.eq('is_default', false).not('consignor_id', 'is', null);
      }

      // Build OR conditions for matching IDs
      const conditions = [];
      if (branchIds.length > 0) {
        conditions.push(`branch_id.in.(${branchIds.join(',')})`);
      }
      if (cityIds.length > 0) {
        conditions.push(`city_id.in.(${cityIds.join(',')})`);
      }
      if (consignorIds.length > 0) {
        conditions.push(`consignor_id.in.(${consignorIds.join(',')})`);
      }

      if (conditions.length > 0) {
        searchQuery = searchQuery.or(conditions.join(','));
      } else {
        // If no matches found in related tables, return empty results
        setFilteredRates([]);
        return;
      }

      const { data: searchResults, error: searchError } = await searchQuery.order('id', { ascending: false });

      if (searchError) {
        console.warn('ID-based search failed:', searchError);
        await fallbackSearch(searchValue, filterType);
        return;
      }

      // Get full details for the found rates
      const resultsWithDetails = await fetchRelatedDataInBatches(searchResults || []);
      setFilteredRates(resultsWithDetails || []);

    } catch (error) {
      console.warn('Search error:', error);
      await fallbackSearch(searchValue, filterType);
    } finally {
      setSearchLoading(false);
    }
  }, [searchTerm, searchFilter]);

  // Improved fallback search method
  const fallbackSearch = async (searchValue, filterType) => {
    try {
      console.log('Using fallback search for:', searchValue);
      
      // Fetch all rates without joins first
      let query = supabase.from('rates').select('*');
      
      // Apply filter
      if (filterType === 'default') {
        query = query.eq('is_default', true);
      } else if (filterType === 'consignor') {
        query = query.eq('is_default', false).not('consignor_id', 'is', null);
      }

      const { data: allRates, error } = await query.order('id', { ascending: false });

      if (error) {
        console.error('Failed to fetch rates for fallback:', error);
        setFilteredRates([]);
        return;
      }

      if (!allRates || allRates.length === 0) {
        setFilteredRates([]);
        return;
      }

      // Get detailed information for all rates
      const ratesWithDetails = await fetchRelatedDataInBatches(allRates);
      
      // Filter based on search term
      const searchLower = searchValue.toLowerCase();
      const filteredData = ratesWithDetails.filter(rate => {
        return (
          (rate.branches?.branch_name?.toLowerCase().includes(searchLower)) ||
          (rate.branches?.branch_code?.toLowerCase().includes(searchLower)) ||
          (rate.cities?.city_name?.toLowerCase().includes(searchLower)) ||
          (rate.cities?.city_code?.toLowerCase().includes(searchLower)) ||
          (rate.consignors?.company_name?.toLowerCase().includes(searchLower)) ||
          (rate.rate.toString().includes(searchLower))
        );
      });

      setFilteredRates(filteredData);
      
    } catch (error) {
      console.error('Fallback search failed:', error);
      // Try one more time with just basic rates data
      try {
        const { data: basicRates, error: basicError } = await supabase
          .from('rates')
          .select('*')
          .order('id', { ascending: false });
          
        if (!basicError && basicRates) {
          // Filter by rate amount only as last resort
          const numericValue = parseFloat(searchValue);
          if (!isNaN(numericValue)) {
            const filtered = basicRates.filter(rate => rate.rate === numericValue);
            setFilteredRates(filtered);
          } else {
            setFilteredRates([]);
          }
        } else {
          setFilteredRates([]);
        }
      } catch (finalError) {
        console.error('Final fallback failed:', finalError);
        setFilteredRates([]);
      }
    }
  };

  // Handle search input change with debouncing
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    
    if (!value.trim()) {
      setFilteredRates([]);
      setIsSearching(false);
      return;
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      performSearch(value, searchFilter);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchFilter, performSearch]);

  // Handle filter change
  const handleFilterChange = useCallback((filterType) => {
    setSearchFilter(filterType);
    if (searchTerm.trim()) {
      performSearch(searchTerm, filterType);
    }
  }, [searchTerm, performSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setFilteredRates([]);
    setIsSearching(false);
    setSearchFilter('all');
  }, []);

  // Handle consignor change in form
  const handleConsignorChange = (consignorId) => {
    setFormData({
      ...formData,
      consignor_id: consignorId,
      is_default: !consignorId
    });
  };

  // Submit form (add/edit rate)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.branch_id || !formData.city_id || !formData.rate) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setSubmitLoading(true);

      const rateData = {
        branch_id: formData.branch_id,
        city_id: formData.city_id,
        consignor_id: formData.consignor_id || null,
        rate: parseFloat(formData.rate),
        is_default: !formData.consignor_id
      };

      if (editingId) {
        const { error } = await supabase
          .from('rates')
          .update(rateData)
          .eq('id', editingId);

        if (error) throw error;
        alert('Rate updated successfully!');
      } else {
        const { error } = await supabase
          .from('rates')
          .insert([rateData]);

        if (error) throw error;
        alert('Rate added successfully!');
      }

      setFormData({
        branch_id: '',
        city_id: '',
        consignor_id: '',
        rate: '',
        is_default: false
      });
      setEditingId(null);
      
      // Reset to first page and refresh
      setCurrentPage(1);
      await fetchRates();
      
      // If we were searching, refresh search results
      if (isSearching && searchTerm.trim()) {
        await performSearch();
      }
    } catch (error) {
      console.error('Error saving rate:', error);
      alert('Error saving rate: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Edit rate
  const handleEdit = (rate) => {
    setFormData({
      branch_id: rate.branch_id,
      city_id: rate.city_id,
      consignor_id: rate.consignor_id || '',
      rate: rate.rate.toString(),
      is_default: rate.is_default
    });
    setEditingId(rate.id);
  };

  // Delete rate
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Rate deleted successfully!');
      await fetchRates();
      
      // If we were searching, refresh search results
      if (isSearching && searchTerm.trim()) {
        await performSearch();
      }
    } catch (error) {
      console.error('Error deleting rate:', error);
      alert('Error deleting rate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setFormData({
      branch_id: '',
      city_id: '',
      consignor_id: '',
      rate: '',
      is_default: false
    });
    setEditingId(null);
  };

  // Download CSV export
  const downloadCSV = async () => {
    try {
      setExportLoading(true);
      
      const { count } = await supabase
        .from('rates')
        .select('*', { count: 'exact', head: true });

      if (count === 0) {
        alert('No data to export');
        return;
      }

      // Fetch all rates in batches for better performance
      const batchSize = 1000;
      let allRates = [];
      let currentBatch = 0;
      
      while (true) {
        const from = currentBatch * batchSize;
        const to = from + batchSize - 1;

        let { data, error } = await supabase
          .from('rates')
          .select(`
            *,
            branches!rates_branch_id_fkey (branch_name, branch_code),
            cities!rates_city_id_fkey (city_name, city_code),
            consignors!rates_consignor_id_fkey (company_name)
          `)
          .range(from, to)
          .order('id');

        if (error) {
          console.warn('Join query failed, using basic query:', error);
          const basicResult = await supabase
            .from('rates')
            .select('*')
            .range(from, to)
            .order('id');

          if (basicResult.error) {
            throw basicResult.error;
          }

          data = await fetchRelatedDataInBatches(basicResult.data || []);
        }

        if (!data || data.length === 0) {
          break;
        }

        allRates = [...allRates, ...data];
        currentBatch++;

        if (data.length < batchSize) {
          break;
        }
      }

      if (allRates.length === 0) {
        alert('No data found to export');
        return;
      }

      // Generate CSV content
      const headers = ['Sr. No.', 'Branch Name', 'Branch Code', 'City Name', 'City Code', 'Consignor', 'Rate', 'Type'];
      
      const csvRows = [
        headers.join(','),
        ...allRates.map((rate, index) => {
          const row = [
            index + 1,
            `"${(rate.branches?.branch_name || 'N/A').replace(/"/g, '""')}"`,
            `"${(rate.branches?.branch_code || 'N/A').replace(/"/g, '""')}"`,
            `"${(rate.cities?.city_name || 'N/A').replace(/"/g, '""')}"`,
            `"${(rate.cities?.city_code || 'N/A').replace(/"/g, '""')}"`,
            `"${(rate.consignors?.company_name || 'Default Rate').replace(/"/g, '""')}"`,
            rate.rate || 0,
            rate.is_default ? 'Default' : 'Specific'
          ];
          return row.join(',');
        })
      ];

      const csvContent = csvRows.join('\n');

      // Create and download file
      const blob = new Blob(['\uFEFF' + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = today.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `rates_export_${dateStr}_${timeStr}.csv`;
      
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`Successfully exported ${allRates.length} rates to ${filename}`);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Pagination functions
  const totalPages = Math.ceil(totalRates / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalRates);

  const goToPage = (page) => {
    setCurrentPage(page);
    clearSearch(); // Clear search when changing pages
  };

  return {
    // State
    rates,
    filteredRates,
    branches,
    cities,
    consignors,
    loading,
    dataLoading,
    searchLoading,
    exportLoading,
    submitLoading,
    
    // Search state
    searchTerm,
    searchFilter,
    isSearching,
    
    // Pagination
    currentPage,
    totalPages,
    totalRates,
    startItem,
    endItem,
    itemsPerPage,
    
    // Form state
    formData,
    editingId,
    
    // Functions
    fetchStaticData,
    fetchRates,
    handleSearchChange,
    handleFilterChange,
    clearSearch,
    performSearch,
    handleConsignorChange,
    handleSubmit,
    handleEdit,
    handleDelete,
    cancelEdit,
    downloadCSV,
    goToPage,
    setFormData
  };
};