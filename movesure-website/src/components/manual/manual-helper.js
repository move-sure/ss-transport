'use client';

import { useState, useCallback, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

// Custom hook for Station Bilty Summary management
export const useStationBiltySummary = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // Reference data states
  const [cities, setCities] = useState([]);
  const [consignors, setConsignors] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [loadingReferenceData, setLoadingReferenceData] = useState(false);
  // Form data state
  const [formData, setFormData] = useState({
    station: '',
    gr_no: '',
    consignor: '',
    consignee: '',
    contents: '',
    no_of_packets: 0,
    weight: 0,
    payment_status: 'to-pay',
    amount: 0,
    pvt_marks: ''
  });

  // Load reference data (cities, consignors, consignees)
  const loadReferenceData = useCallback(async () => {
    try {
      setLoadingReferenceData(true);
      const [citiesRes, consignorsRes, consigneesRes] = await Promise.all([
        supabase.from('cities').select('*').order('city_name'),
        supabase.from('consignors').select('*').order('company_name'),
        supabase.from('consignees').select('*').order('company_name')
      ]);

      if (citiesRes.error) throw citiesRes.error;
      if (consignorsRes.error) throw consignorsRes.error;
      if (consigneesRes.error) throw consigneesRes.error;

      setCities(citiesRes.data || []);
      setConsignors(consignorsRes.data || []);
      setConsignees(consigneesRes.data || []);
    } catch (error) {
      console.error('Error loading reference data:', error);
      throw error;
    } finally {
      setLoadingReferenceData(false);
    }
  }, []);

  // Load reference data on component mount
  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // Validation function
  const validateForm = () => {
    const requiredFields = ['station', 'gr_no', 'consignor', 'consignee'];
    for (const field of requiredFields) {
      if (!formData[field]?.toString().trim()) {
        return `${field.replace('_', ' ')} is required`;
      }
    }
    
    if (formData.no_of_packets < 0) {
      return 'Number of packets cannot be negative';
    }
    
    if (formData.weight < 0) {
      return 'Weight cannot be negative';
    }
    
    if (formData.amount < 0) {
      return 'Amount cannot be negative';
    }
    
    return null;
  };

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData({
      station: '',
      gr_no: '',
      consignor: '',
      consignee: '',
      contents: '',
      no_of_packets: 0,
      weight: 0,
      payment_status: 'to-pay',
      amount: 0,
      pvt_marks: ''
    });
    setEditingId(null);
  }, []);

  // Load all summary data with pagination support
  const loadSummaryData = useCallback(async (limit = 50, offset = 0) => {
    try {
      setLoading(true);
      const { data, error, count } = await supabase
        .from('station_bilty_summary')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      setSummaryData(data || []);
      return { data: data || [], count: count || 0 };
    } catch (error) {
      console.error('Error loading summary data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Search function with debouncing
  const searchSummaries = useCallback(async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('station_bilty_summary')
        .select('*')
        .or(`station.ilike.%${term}%,gr_no.ilike.%${term}%,consignor.ilike.%${term}%,consignee.ilike.%${term}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching summaries:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchSummaries(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchSummaries]);

  // Save or update summary data
  const saveSummary = useCallback(async () => {
    try {
      setSaving(true);

      // Validate form
      const validationError = validateForm();
      if (validationError) {
        throw new Error(validationError);
      }

      // Prepare data for saving
      const saveData = {
        station: formData.station.toString().trim(),
        gr_no: formData.gr_no.toString().trim().toUpperCase(),
        consignor: formData.consignor.toString().trim(),
        consignee: formData.consignee.toString().trim(),
        contents: formData.contents?.toString().trim() || null,
        no_of_packets: parseInt(formData.no_of_packets) || 0,
        weight: parseFloat(formData.weight) || 0,
        payment_status: formData.payment_status || 'to-pay',
        amount: parseFloat(formData.amount) || 0,
        pvt_marks: formData.pvt_marks?.toString().trim() || null,
        updated_at: new Date().toISOString()
      };

      let result;

      if (editingId) {
        // Update existing record
        const { data, error } = await supabase
          .from('station_bilty_summary')
          .update(saveData)
          .eq('id', editingId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Check for duplicate GR number
        const { data: existing, error: duplicateError } = await supabase
          .from('station_bilty_summary')
          .select('id')
          .eq('gr_no', saveData.gr_no)
          .single();

        if (duplicateError && duplicateError.code !== 'PGRST116') {
          throw duplicateError;
        }

        if (existing) {
          throw new Error('GR Number already exists in station bilty summary');
        }

        // Insert new record
        const { data, error } = await supabase
          .from('station_bilty_summary')
          .insert([saveData])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Reset form and refresh data
      resetForm();
      await loadSummaryData();

      return result;
    } catch (error) {
      console.error('Error saving summary:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [formData, editingId, resetForm, loadSummaryData]);

  // Load data for editing
  const loadForEdit = useCallback((summary) => {
    setFormData({
      station: summary.station || '',
      gr_no: summary.gr_no || '',
      consignor: summary.consignor || '',
      consignee: summary.consignee || '',
      contents: summary.contents || '',
      no_of_packets: summary.no_of_packets || 0,
      weight: summary.weight || 0,
      payment_status: summary.payment_status || 'to-pay',
      amount: summary.amount || 0,
      pvt_marks: summary.pvt_marks || ''
    });
    setEditingId(summary.id);
  }, []);

  // Delete summary record
  const deleteSummary = useCallback(async (id) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('station_bilty_summary')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh data
      await loadSummaryData();
    } catch (error) {
      console.error('Error deleting summary:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadSummaryData]);

  // Get summary statistics
  const getSummaryStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('station_bilty_summary')
        .select('payment_status, amount, no_of_packets, weight');

      if (error) throw error;

      const stats = data.reduce((acc, item) => {
        acc.totalRecords++;
        acc.totalAmount += parseFloat(item.amount) || 0;
        acc.totalPackets += parseInt(item.no_of_packets) || 0;
        acc.totalWeight += parseFloat(item.weight) || 0;
        
        if (item.payment_status === 'paid') acc.paidCount++;
        else if (item.payment_status === 'to-pay') acc.toPayCount++;
        else if (item.payment_status === 'foc') acc.focCount++;

        return acc;
      }, {
        totalRecords: 0,
        totalAmount: 0,
        totalPackets: 0,
        totalWeight: 0,
        paidCount: 0,
        toPayCount: 0,
        focCount: 0
      });

      return stats;
    } catch (error) {
      console.error('Error getting summary stats:', error);
      return null;
    }
  }, []);

  // Export data to CSV
  const exportToCSV = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('station_bilty_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Create CSV content
      const headers = [
        'Station', 'GR No', 'Consignor', 'Consignee', 'Contents',
        'No of Packets', 'Weight', 'Payment Status', 'Amount', 'Pvt Marks',
        'Created At', 'Updated At'
      ];

      const csvContent = [
        headers.join(','),
        ...data.map(row => [
          `"${row.station || ''}"`,
          `"${row.gr_no || ''}"`,
          `"${row.consignor || ''}"`,
          `"${row.consignee || ''}"`,
          `"${row.contents || ''}"`,
          row.no_of_packets || 0,
          row.weight || 0,
          `"${row.payment_status || ''}"`,
          row.amount || 0,
          `"${row.pvt_marks || ''}"`,
          `"${new Date(row.created_at).toLocaleString()}"`,
          `"${new Date(row.updated_at).toLocaleString()}"`
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `station_bilty_summary_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }, []);
  return {
    // State
    loading,
    saving,
    searching,
    summaryData,
    searchResults,
    searchTerm,
    editingId,
    formData,
    cities,
    consignors,
    consignees,
    loadingReferenceData,

    // Actions
    setFormData,
    setSearchTerm,
    loadSummaryData,
    searchSummaries,
    saveSummary,
    loadForEdit,
    deleteSummary,
    resetForm,
    getSummaryStats,
    exportToCSV,
    validateForm,
    loadReferenceData
  };
};

// Payment status options
export const PAYMENT_STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'to-pay', label: 'To Pay', color: 'orange' },
  { value: 'foc', label: 'FOC (Free of Charge)', color: 'blue' }
];

// Utility function to format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

// Utility function to format weight
export const formatWeight = (weight) => {
  return `${(weight || 0).toFixed(3)} kg`;
};

// Utility function to get payment status badge color
export const getPaymentStatusColor = (status) => {
  const option = PAYMENT_STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.color : 'gray';
};