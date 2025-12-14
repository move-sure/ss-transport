'use client';

import { useState, useCallback, useMemo } from 'react';
import supabase from '../../../app/utils/supabase';

const initialFilters = {
  dateFrom: '',
  dateTo: '',
  grNumber: '',
  consignorName: '',
  consigneeName: '',
  pvtMarks: '',
  cityName: '',
  paymentMode: '',
  biltyType: 'all'
};

export default function useBiltySearch(user) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilters, setSearchFilters] = useState(initialFilters);
  const [searchResults, setSearchResults] = useState({ regular: [], station: [], totalCount: 0 });
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const handleFilterChange = useCallback((filterName, value) => {
    if (typeof filterName === 'object') {
      setSearchFilters(prev => ({ ...prev, ...filterName }));
    } else {
      setSearchFilters(prev => ({ ...prev, [filterName]: value }));
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchFilters(initialFilters);
    setHasSearched(false);
    setSearchResults({ regular: [], station: [], totalCount: 0 });
    setCurrentPage(1);
  }, []);

  const searchRegularBilties = async () => {
    let query = supabase
      .from('bilty')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (user?.branch_id) query = query.eq('branch_id', user.branch_id);
    if (searchFilters.grNumber?.trim()) query = query.ilike('gr_no', `%${searchFilters.grNumber.trim()}%`);

    if (searchFilters.dateFrom && searchFilters.dateTo) {
      query = query.gte('bilty_date', searchFilters.dateFrom).lte('bilty_date', searchFilters.dateTo);
    } else if (searchFilters.dateFrom) {
      query = query.gte('bilty_date', searchFilters.dateFrom);
    } else if (searchFilters.dateTo) {
      query = query.lte('bilty_date', searchFilters.dateTo);
    }

    if (searchFilters.consignorName?.trim()) query = query.ilike('consignor_name', `%${searchFilters.consignorName.trim()}%`);
    if (searchFilters.consigneeName?.trim()) query = query.ilike('consignee_name', `%${searchFilters.consigneeName.trim()}%`);
    if (searchFilters.pvtMarks?.trim()) query = query.ilike('pvt_marks', `%${searchFilters.pvtMarks.trim()}%`);

    if (searchFilters.cityName?.trim()) {
      const { data: matchingCities } = await supabase
        .from('cities')
        .select('id')
        .ilike('city_name', `%${searchFilters.cityName.trim()}%`);
      
      if (matchingCities?.length > 0) {
        query = query.in('to_city_id', matchingCities.map(c => c.id));
      } else {
        return [];
      }
    }

    if (searchFilters.paymentMode) query = query.eq('payment_mode', searchFilters.paymentMode);
    query = query.order('created_at', { ascending: false }).limit(5000);

    const { data, error } = await query;
    if (error) throw error;
    
    // Enrich with city names and challan numbers
    const cityIds = [...new Set((data || []).map(b => b.to_city_id).filter(Boolean))];
    const grNumbers = (data || []).map(b => b.gr_no).filter(Boolean);
    let cityMap = {}, challanMap = {};
    
    if (cityIds.length > 0) {
      const { data: citiesData } = await supabase.from('cities').select('id, city_name, city_code').in('id', cityIds);
      if (citiesData) cityMap = citiesData.reduce((m, c) => ({ ...m, [c.id]: { name: c.city_name, code: c.city_code } }), {});
    }
    
    if (grNumbers.length > 0) {
      const { data: transitData } = await supabase.from('transit_details').select('gr_no, challan_no').in('gr_no', grNumbers);
      if (transitData) challanMap = transitData.reduce((m, t) => ({ ...m, [t.gr_no]: t.challan_no }), {});
    }
    
    return (data || []).map(bilty => ({
      ...bilty,
      type: 'regular',
      to_city_name: cityMap[bilty.to_city_id]?.name || 'N/A',
      to_city_code: cityMap[bilty.to_city_id]?.code || 'N/A',
      challan_no: challanMap[bilty.gr_no] || 'N/A'
    }));
  };

  const searchStationBilties = async () => {
    let query = supabase.from('station_bilty_summary').select('*');

    if (searchFilters.grNumber?.trim()) query = query.ilike('gr_no', `%${searchFilters.grNumber.trim()}%`);

    if (searchFilters.dateFrom && searchFilters.dateTo) {
      query = query.gte('created_at', searchFilters.dateFrom).lte('created_at', searchFilters.dateTo);
    } else if (searchFilters.dateFrom) {
      query = query.gte('created_at', searchFilters.dateFrom);
    } else if (searchFilters.dateTo) {
      query = query.lte('created_at', searchFilters.dateTo);
    }

    if (searchFilters.consignorName?.trim()) query = query.ilike('consignor', `%${searchFilters.consignorName.trim()}%`);
    if (searchFilters.consigneeName?.trim()) query = query.ilike('consignee', `%${searchFilters.consigneeName.trim()}%`);
    if (searchFilters.pvtMarks?.trim()) query = query.ilike('pvt_marks', `%${searchFilters.pvtMarks.trim()}%`);

    if (searchFilters.cityName?.trim()) {
      const { data: matchingCities } = await supabase.from('cities').select('city_code').ilike('city_name', `%${searchFilters.cityName.trim()}%`);
      if (matchingCities?.length > 0) {
        query = query.in('station', matchingCities.map(c => c.city_code));
      } else {
        query = query.ilike('station', `%${searchFilters.cityName.trim()}%`);
      }
    }

    if (searchFilters.paymentMode) query = query.eq('payment_status', searchFilters.paymentMode);
    query = query.order('created_at', { ascending: false }).limit(5000);

    const { data, error } = await query;
    if (error) throw error;
    
    // Enrich with challan numbers and city names
    const grNumbers = (data || []).map(b => b.gr_no).filter(Boolean);
    const stationCodes = [...new Set((data || []).map(b => b.station).filter(Boolean))];
    let challanMap = {}, cityMap = {};
    
    if (grNumbers.length > 0) {
      const { data: transitData } = await supabase.from('transit_details').select('gr_no, challan_no').in('gr_no', grNumbers);
      if (transitData) challanMap = transitData.reduce((m, t) => ({ ...m, [t.gr_no]: t.challan_no }), {});
    }
    
    if (stationCodes.length > 0) {
      const { data: citiesData } = await supabase.from('cities').select('city_code, city_name').in('city_code', stationCodes);
      if (citiesData) cityMap = citiesData.reduce((m, c) => ({ ...m, [c.city_code]: c.city_name }), {});
    }
    
    return (data || []).map(bilty => ({
      ...bilty,
      type: 'station',
      challan_no: challanMap[bilty.gr_no] || 'N/A',
      station_city_name: cityMap[bilty.station] || bilty.station || 'N/A'
    }));
  };

  const performSearch = useCallback(async () => {
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
    } catch (err) {
      console.error('Search error:', err);
      setError(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [searchFilters, user]);

  const totalPages = useMemo(() => Math.ceil(searchResults.totalCount / itemsPerPage), [searchResults.totalCount, itemsPerPage]);

  const handlePageChange = useCallback((page) => setCurrentPage(page), []);
  
  const handleItemsPerPageChange = useCallback((value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  }, []);

  return {
    loading,
    error,
    searchFilters,
    searchResults,
    hasSearched,
    currentPage,
    itemsPerPage,
    totalPages,
    handleFilterChange,
    handleClearFilters,
    performSearch,
    handlePageChange,
    handleItemsPerPageChange
  };
}
