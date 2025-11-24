'use client';

import { useState, useCallback } from 'react';
import supabase from '../../app/utils/supabase';

export const useConsignorRatesSearch = () => {
  const [consignors, setConsignors] = useState([]);
  const [filteredConsignors, setFilteredConsignors] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [selectedConsignor, setSelectedConsignor] = useState(null);
  const [consignorRates, setConsignorRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editRate, setEditRate] = useState('');

  // Comparison states
  const [compareMode, setCompareMode] = useState(false);
  const [compareConsignor, setCompareConsignor] = useState(null);
  const [compareRates, setCompareRates] = useState([]);
  const [compareSearchInput, setCompareSearchInput] = useState('');
  const [compareFilteredConsignors, setCompareFilteredConsignors] = useState([]);
  const [showCompareSuggestions, setShowCompareSuggestions] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);

  const fetchConsignors = useCallback(async () => {
    try {
      setDataLoading(true);
      const { data, error } = await supabase
        .from('consignors')
        .select('*')
        .order('company_name');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setConsignors(data || []);
    } catch (error) {
      console.error('Error fetching consignors:', error);
      setConsignors([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const handleSearchInput = (value) => {
    setSearchInput(value);
    
    if (!value.trim()) {
      setFilteredConsignors([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = consignors.filter(consignor =>
      consignor.company_name.toLowerCase().includes(value.toLowerCase()) ||
      (consignor.contact_person && consignor.contact_person.toLowerCase().includes(value.toLowerCase()))
    );

    setFilteredConsignors(filtered);
    setShowSuggestions(true);
  };

  const handleCompareSearchInput = (value) => {
    setCompareSearchInput(value);
    
    if (!value.trim()) {
      setCompareFilteredConsignors([]);
      setShowCompareSuggestions(false);
      return;
    }

    const filtered = consignors.filter(consignor =>
      consignor.id !== selectedConsignor?.id &&
      (consignor.company_name.toLowerCase().includes(value.toLowerCase()) ||
      (consignor.contact_person && consignor.contact_person.toLowerCase().includes(value.toLowerCase())))
    );

    setCompareFilteredConsignors(filtered);
    setShowCompareSuggestions(true);
  };

  const selectConsignor = async (consignor) => {
    setSelectedConsignor(consignor);
    setSearchInput(consignor.company_name);
    setShowSuggestions(false);
    await fetchConsignorRates(consignor.id);
  };

  const selectCompareConsignor = async (consignor) => {
    setCompareConsignor(consignor);
    setCompareSearchInput(consignor.company_name);
    setShowCompareSuggestions(false);
    await fetchCompareConsignorRates(consignor.id);
  };

  const fetchConsignorRates = async (consignorId) => {
    try {
      setLoading(true);
      
      const { data: ratesData, error: ratesError } = await supabase
        .from('rates')
        .select('*')
        .eq('consignor_id', consignorId)
        .order('city_id');

      if (ratesError) throw ratesError;

      if (!ratesData || ratesData.length === 0) {
        setConsignorRates([]);
        return;
      }

      const cityIds = [...new Set(ratesData.map(r => r.city_id))];
      const citiesResult = await supabase.from('cities').select('id, city_name, city_code').in('id', cityIds);

      const citiesMap = {};
      if (citiesResult.data) {
        citiesResult.data.forEach(city => {
          citiesMap[city.id] = city;
        });
      }

      const enrichedRates = ratesData.map(rate => ({
        ...rate,
        city: citiesMap[rate.city_id]
      })).sort((a, b) => (a.city?.city_name || '').localeCompare(b.city?.city_name || ''));

      setConsignorRates(enrichedRates);
    } catch (error) {
      console.error('Error fetching consignor rates:', error);
      setConsignorRates([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompareConsignorRates = async (consignorId) => {
    try {
      setCompareLoading(true);
      
      const { data: ratesData, error: ratesError } = await supabase
        .from('rates')
        .select('*')
        .eq('consignor_id', consignorId)
        .order('city_id');

      if (ratesError) throw ratesError;

      if (!ratesData || ratesData.length === 0) {
        setCompareRates([]);
        return;
      }

      const cityIds = [...new Set(ratesData.map(r => r.city_id))];
      const citiesResult = await supabase.from('cities').select('id, city_name, city_code').in('id', cityIds);

      const citiesMap = {};
      if (citiesResult.data) {
        citiesResult.data.forEach(city => {
          citiesMap[city.id] = city;
        });
      }

      const enrichedRates = ratesData.map(rate => ({
        ...rate,
        city: citiesMap[rate.city_id]
      })).sort((a, b) => (a.city?.city_name || '').localeCompare(b.city?.city_name || ''));

      setCompareRates(enrichedRates);
    } catch (error) {
      console.error('Error fetching compare rates:', error);
      setCompareRates([]);
    } finally {
      setCompareLoading(false);
    }
  };

  const startEdit = (rateId, currentRate) => {
    setEditingId(rateId);
    setEditRate(currentRate.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRate('');
  };

  const saveEdit = async (rateId) => {
    try {
      const newRate = parseFloat(editRate);
      if (isNaN(newRate) || newRate <= 0) {
        alert('Please enter a valid rate');
        return;
      }

      const { error } = await supabase
        .from('rates')
        .update({ rate: newRate })
        .eq('id', rateId);

      if (error) throw error;

      // Refresh the rates
      await fetchConsignorRates(selectedConsignor.id);
      if (compareConsignor) {
        await fetchCompareConsignorRates(compareConsignor.id);
      }
      
      cancelEdit();
    } catch (error) {
      console.error('Error updating rate:', error);
      alert('Error updating rate');
    }
  };

  const deleteRate = async (rateId) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
      const { error } = await supabase
        .from('rates')
        .delete()
        .eq('id', rateId);

      if (error) throw error;

      // Refresh the rates
      await fetchConsignorRates(selectedConsignor.id);
      if (compareConsignor) {
        await fetchCompareConsignorRates(compareConsignor.id);
      }
    } catch (error) {
      console.error('Error deleting rate:', error);
      alert('Error deleting rate');
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSelectedConsignor(null);
    setConsignorRates([]);
    setFilteredConsignors([]);
    setShowSuggestions(false);
    setEditingId(null);
    setEditRate('');
    clearComparison();
  };

  const clearComparison = () => {
    setCompareMode(false);
    setCompareConsignor(null);
    setCompareRates([]);
    setCompareSearchInput('');
    setCompareFilteredConsignors([]);
    setShowCompareSuggestions(false);
  };

  const enableCompareMode = () => {
    setCompareMode(true);
  };

  const downloadConsignorRatesCSV = () => {
    if (!selectedConsignor || consignorRates.length === 0) {
      alert('No rates to export');
      return;
    }

    const headers = ['City', 'City Code', 'Rate'];
    const rows = consignorRates.map(rate => [
      rate.city?.city_name || 'N/A',
      rate.city?.city_code || 'N/A',
      rate.rate
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedConsignor.company_name}_rates.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadComparisonCSV = () => {
    if (!selectedConsignor || !compareConsignor) {
      alert('Select two companies to compare');
      return;
    }

    // Get all unique cities
    const allCities = new Map();
    consignorRates.forEach(rate => {
      if (rate.city) {
        allCities.set(rate.city.id, rate.city);
      }
    });
    compareRates.forEach(rate => {
      if (rate.city) {
        allCities.set(rate.city.id, rate.city);
      }
    });

    const headers = ['City', 'City Code', selectedConsignor.company_name, compareConsignor.company_name, 'Difference'];
    const rows = Array.from(allCities.values())
      .sort((a, b) => a.city_name.localeCompare(b.city_name))
      .map(city => {
        const rate1 = consignorRates.find(r => r.city_id === city.id);
        const rate2 = compareRates.find(r => r.city_id === city.id);
        const r1 = rate1 ? parseFloat(rate1.rate) : 0;
        const r2 = rate2 ? parseFloat(rate2.rate) : 0;
        const diff = r1 && r2 ? (r1 - r2).toFixed(2) : '-';

        return [
          city.city_name,
          city.city_code,
          rate1 ? r1.toFixed(2) : 'N/A',
          rate2 ? r2.toFixed(2) : 'N/A',
          diff
        ];
      });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${selectedConsignor.company_name}_vs_${compareConsignor.company_name}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return {
    consignors,
    filteredConsignors,
    searchInput,
    selectedConsignor,
    consignorRates,
    loading,
    showSuggestions,
    dataLoading,
    editingId,
    editRate,
    compareMode,
    compareConsignor,
    compareRates,
    compareSearchInput,
    compareFilteredConsignors,
    showCompareSuggestions,
    compareLoading,
    fetchConsignors,
    handleSearchInput,
    handleCompareSearchInput,
    selectConsignor,
    selectCompareConsignor,
    startEdit,
    cancelEdit,
    saveEdit,
    deleteRate,
    clearSearch,
    clearComparison,
    enableCompareMode,
    downloadConsignorRatesCSV,
    downloadComparisonCSV,
    setShowSuggestions,
    setShowCompareSuggestions,
    setEditRate
  };
};
