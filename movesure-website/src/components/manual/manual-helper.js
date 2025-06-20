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
    pvt_marks: '',
    delivery_type: 'godown',
    e_way_bill: '',
    staff_id: null,
    branch_id: null
  });

  // Load reference data (cities only)
  const loadReferenceData = useCallback(async () => {
    try {
      setLoadingReferenceData(true);
      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('*')
        .order('city_name');

      if (citiesError) throw citiesError;

      setCities(citiesData || []);
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
    const requiredFields = ['station', 'gr_no'];
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
      pvt_marks: '',
      delivery_type: 'godown',
      e_way_bill: '',
      staff_id: null,
      branch_id: null
    });
    setEditingId(null);
  }, []);  // Load all summary data with pagination support
  const loadSummaryData = useCallback(async (limit = 50, offset = 0) => {
    try {
      setLoading(true);
      
      // Use basic query first, then enrich with related data
      const { data, error, count } = await supabase
        .from('station_bilty_summary')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Enrich with branch and user data if records exist
      let enrichedData = data || [];
      
      if (enrichedData.length > 0) {
        // Get unique IDs for joins
        const branchIds = [...new Set(enrichedData.map(item => item.branch_id).filter(Boolean))];
        const staffIds = [...new Set(enrichedData.map(item => item.staff_id).filter(Boolean))];
        const updaterIds = [...new Set(enrichedData.map(item => item.updated_by).filter(Boolean))];
        
        // Fetch branch data
        let branchesMap = {};
        if (branchIds.length > 0) {
          try {
            const { data: branches } = await supabase
              .from('branches')
              .select('id, branch_name, branch_code')
              .in('id', branchIds);
            
            if (branches) {
              branchesMap = branches.reduce((acc, branch) => {
                acc[branch.id] = branch;
                return acc;
              }, {});
            }
          } catch (branchError) {
            console.warn('Error fetching branches:', branchError);
          }
        }
        
        // Fetch user data (creators and updaters)
        let usersMap = {};
        const allUserIds = [...new Set([...staffIds, ...updaterIds])];
        if (allUserIds.length > 0) {
          try {
            const { data: users } = await supabase
              .from('users')
              .select('id, name, username')
              .in('id', allUserIds);
            
            if (users) {
              usersMap = users.reduce((acc, user) => {
                acc[user.id] = user;
                return acc;
              }, {});
            }
          } catch (userError) {
            console.warn('Error fetching users:', userError);
          }
        }
        
        // Enrich the data
        enrichedData = enrichedData.map(item => ({
          ...item,
          branch: item.branch_id ? branchesMap[item.branch_id] || null : null,
          creator: item.staff_id ? usersMap[item.staff_id] || null : null,
          updater: item.updated_by ? usersMap[item.updated_by] || null : null
        }));
      }

      setSummaryData(enrichedData);
      return { data: enrichedData, count: count || 0 };
    } catch (error) {
      console.error('Error loading summary data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  // Simple search function (searches ALL records, not just paginated ones)
  const searchSummaries = useCallback(async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      
      // Search ALL records without pagination limits
      const { data, error } = await supabase
        .from('station_bilty_summary')
        .select('*')
        .or(`station.ilike.%${term}%,gr_no.ilike.%${term}%,consignor.ilike.%${term}%,consignee.ilike.%${term}%,pvt_marks.ilike.%${term}%,contents.ilike.%${term}%`)
        .order('created_at', { ascending: false })
        .limit(100); // Reasonable limit for search results

      if (error) throw error;

      // Enhance with branch and user data similar to loadSummaryData
      let enrichedData = data || [];
      
      if (enrichedData.length > 0) {
        const branchIds = [...new Set(enrichedData.map(item => item.branch_id).filter(Boolean))];
        const staffIds = [...new Set(enrichedData.map(item => item.staff_id).filter(Boolean))];
        const updatedByIds = [...new Set(enrichedData.map(item => item.updated_by).filter(Boolean))];
        const allUserIds = [...new Set([...staffIds, ...updatedByIds])];
        
        let branchMap = {};
        if (branchIds.length > 0) {
          try {
            const { data: branches } = await supabase
              .from('branches')
              .select('id, branch_name, branch_code')
              .in('id', branchIds);
            
            if (branches) {
              branchMap = branches.reduce((acc, branch) => {
                acc[branch.id] = branch;
                return acc;
              }, {});
            }
          } catch (error) {
            console.warn('Could not load branch data for search:', error);
          }
        }
        
        let userMap = {};
        if (allUserIds.length > 0) {
          try {
            const { data: users } = await supabase
              .from('users')
              .select('id, name, username')
              .in('id', allUserIds);
            
            if (users) {
              userMap = users.reduce((acc, user) => {
                acc[user.id] = user;
                return acc;
              }, {});
            }
          } catch (error) {
            console.warn('Could not load user data for search:', error);
          }
        }
        
        enrichedData = enrichedData.map(item => ({
          ...item,
          branch: item.branch_id ? branchMap[item.branch_id] || null : null,
          creator: item.staff_id ? userMap[item.staff_id] || null : null,
          updater: item.updated_by ? userMap[item.updated_by] || null : null
        }));
      }

      setSearchResults(enrichedData);
      return enrichedData;
    } catch (error) {
      console.error('Error searching summaries:', error);
      setSearchResults([]);
      return [];
    } finally {
      setSearching(false);
    }
  }, []);  // Advanced search function with comprehensive filters (searches ALL records)
  const advancedSearchSummaries = useCallback(async (filters) => {
    try {
      setSearching(true);
      
      console.log('Advanced search filters received:', filters);
      
      let query = supabase
        .from('station_bilty_summary')
        .select('*');

      // Build dynamic filters with proper AND logic
      
      // Date range filters
      if (filters.fromDate) {
        query = query.gte('created_at', filters.fromDate);
      }
      
      if (filters.toDate) {
        // Add one day to include the entire end date
        const toDate = new Date(filters.toDate);
        toDate.setDate(toDate.getDate() + 1);
        query = query.lt('created_at', toDate.toISOString().split('T')[0]);
      }
      
      // Text-based filters using ILIKE for case-insensitive search
      if (filters.grNumber) {
        query = query.ilike('gr_no', `%${filters.grNumber}%`);
      }
      
      if (filters.consignor) {
        query = query.ilike('consignor', `%${filters.consignor}%`);
      }
      
      if (filters.consignee) {
        query = query.ilike('consignee', `%${filters.consignee}%`);
      }
      
      if (filters.pvtMarks) {
        query = query.ilike('pvt_marks', `%${filters.pvtMarks}%`);
      }
      
      if (filters.contents) {
        query = query.ilike('contents', `%${filters.contents}%`);
      }
      
      if (filters.station) {
        query = query.ilike('station', `%${filters.station}%`);
      }
      
      // Exact match filters
      if (filters.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus);
      }
      
      if (filters.deliveryType) {
        query = query.eq('delivery_type', filters.deliveryType);
      }

      // Branch filter
      if (filters.branchId) {
        query = query.eq('branch_id', filters.branchId);
      }
      
      // Order by created_at descending
      query = query.order('created_at', { ascending: false });
      
      console.log('Executing advanced search query...');
      const { data, error } = await query;
      
      if (error) {
        console.error('Advanced search database error:', error);
        throw error;
      }

      console.log('Advanced search results:', data?.length || 0, 'records');
      
      // Enhance with branch and user data similar to other functions
      let enrichedData = data || [];
      
      if (enrichedData.length > 0) {
        const branchIds = [...new Set(enrichedData.map(item => item.branch_id).filter(Boolean))];
        const staffIds = [...new Set(enrichedData.map(item => item.staff_id).filter(Boolean))];
        const updatedByIds = [...new Set(enrichedData.map(item => item.updated_by).filter(Boolean))];
        const allUserIds = [...new Set([...staffIds, ...updatedByIds])];
        
        let branchMap = {};
        if (branchIds.length > 0) {
          try {
            const { data: branches } = await supabase
              .from('branches')
              .select('id, branch_name, branch_code')
              .in('id', branchIds);
            
            if (branches) {
              branchMap = branches.reduce((acc, branch) => {
                acc[branch.id] = branch;
                return acc;
              }, {});
            }
          } catch (error) {
            console.warn('Could not load branch data for advanced search:', error);
          }
        }
        
        let userMap = {};
        if (allUserIds.length > 0) {
          try {
            const { data: users } = await supabase
              .from('users')
              .select('id, name, username')
              .in('id', allUserIds);
            
            if (users) {
              userMap = users.reduce((acc, user) => {
                acc[user.id] = user;
                return acc;
              }, {});
            }
          } catch (error) {
            console.warn('Could not load user data for advanced search:', error);
          }
        }
        
        enrichedData = enrichedData.map(item => ({
          ...item,
          branch: item.branch_id ? branchMap[item.branch_id] || null : null,
          creator: item.staff_id ? userMap[item.staff_id] || null : null,
          updater: item.updated_by ? userMap[item.updated_by] || null : null
        }));
      }
      
      setSearchResults(enrichedData);
      return enrichedData;
    } catch (error) {
      console.error('Error in advanced search:', error);
      setSearchResults([]);
      return [];
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
  const saveSummary = useCallback(async (currentUser = null) => {
    try {
      setSaving(true);

      // Validate form
      const validationError = validateForm();
      if (validationError) {
        throw new Error(validationError);
      }      // Ensure we have proper user and branch IDs
      const actualStaffId = formData.staff_id || currentUser?.id || null;
      const actualBranchId = formData.branch_id || currentUser?.branch_id || null;
      
      // Get the current user ID for updates (this should be the person making the change)
      const currentUserId = currentUser?.id || null;      console.log('Saving manual bilty with:', {
        staff_id: actualStaffId, // Original creator ID
        branch_id: actualBranchId,
        current_user_id: currentUserId, // User performing current action
        editing: !!editingId,
        will_set_updated_by: editingId ? currentUserId : 'N/A (new record)'
      });

      // Prepare data for saving
      const saveData = {
        station: formData.station.toString().trim(),
        gr_no: formData.gr_no.toString().trim().toUpperCase(),
        consignor: formData.consignor?.toString().trim() || null,
        consignee: formData.consignee?.toString().trim() || null,
        contents: formData.contents?.toString().trim() || null,
        no_of_packets: parseInt(formData.no_of_packets) || 0,
        weight: parseFloat(formData.weight) || 0,
        payment_status: formData.payment_status || 'to-pay',
        amount: parseFloat(formData.amount) || 0,
        pvt_marks: formData.pvt_marks?.toString().trim() || null,
        delivery_type: formData.delivery_type || null,
        e_way_bill: formData.e_way_bill?.toString().trim() || null,
        staff_id: actualStaffId, // This remains the creator's ID
        branch_id: actualBranchId,
        updated_at: new Date().toISOString()
      };

      let result;      if (editingId) {
        // Update existing record - set updated_by to current user performing the update
        saveData.updated_by = currentUserId; // Use current user's ID, not creator's ID
        
        console.log('Updating record with updated_by:', currentUserId);
        
        const { data, error } = await supabase
          .from('station_bilty_summary')
          .update(saveData)
          .eq('id', editingId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Check for duplicate GR number - search ALL records
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
  }, [formData, editingId, resetForm, loadSummaryData, validateForm]);

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
      pvt_marks: summary.pvt_marks || '',
      delivery_type: summary.delivery_type || 'godown',
      e_way_bill: summary.e_way_bill || '',
      staff_id: summary.staff_id || null,
      branch_id: summary.branch_id || null
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

  // Get summary statistics (searches ALL records)
  const getSummaryStats = useCallback(async () => {
    try {
      // Use basic query for stats to avoid join issues - get ALL records
      const { data, error } = await supabase
        .from('station_bilty_summary')
        .select('payment_status, amount, no_of_packets, weight, branch_id');

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

  // Export data to CSV (exports ALL records)
  const exportToCSV = useCallback(async () => {
    try {
      // Export ALL records, not just paginated ones
      const { data, error } = await supabase
        .from('station_bilty_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Create CSV content
      const headers = [
        'Station', 'GR No', 'Consignor', 'Consignee', 'Contents',
        'No of Packets', 'Weight', 'Payment Status', 'Amount', 'Pvt Marks',
        'Delivery Type', 'E-Way Bill', 'Created At', 'Updated At'
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
          `"${row.delivery_type || ''}"`,
          `"${row.e_way_bill || ''}"`,
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

  // Clear search results and return to normal view
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
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
    loadReferenceData,
    advancedSearchSummaries,
    clearSearch
  };
};

// Payment status options
export const PAYMENT_STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'to-pay', label: 'To Pay', color: 'orange' },
  { value: 'foc', label: 'FOC (Free of Charge)', color: 'blue' }
];

// Delivery type options
export const DELIVERY_TYPE_OPTIONS = [
  { value: 'godown', label: 'Godown' },
  { value: 'door', label: 'Door' }
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