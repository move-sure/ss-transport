'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  
  // Refs for preventing stale search results and re-render issues
  const searchRequestIdRef = useRef(0);
  const isAdvancedSearchActiveRef = useRef(false);

  // Reference data states
  const [cities, setCities] = useState([]);
  const [transports, setTransports] = useState([]);
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
    branch_id: null,
    transport_id: null,
    transport_name: '',
    transport_gst: ''
  });

  // Load reference data (cities only)
  const loadReferenceData = useCallback(async () => {
    try {
      setLoadingReferenceData(true);
      const [citiesRes, transportsRes] = await Promise.all([
        supabase.from('cities').select('*').order('city_name'),
        supabase.from('transports').select('*')
      ]);

      if (citiesRes.error) throw citiesRes.error;
      if (transportsRes.error) throw transportsRes.error;

      setCities(citiesRes.data || []);
      setTransports(transportsRes.data || []);
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
      branch_id: null,
      transport_id: null,
      transport_name: '',
      transport_gst: ''
    });
    setEditingId(null);
  }, []);

  // ─────────────────────────────────────────────────
  // Helper: Get transit status label from transit record
  // ─────────────────────────────────────────────────
  const getTransitStatusLabel = (transit) => {
    if (!transit) return 'AVL';
    if (transit.is_delivered_at_destination) return 'DELIVERED';
    if (transit.out_for_door_delivery) return 'OUT_FOR_DELIVERY';
    if (transit.is_out_of_delivery_from_branch2) return 'OUT_FROM_HUB';
    if (transit.is_delivered_at_branch2) return 'AT_HUB';
    if (transit.is_out_of_delivery_from_branch1) return 'DISPATCHED';
    return 'IN_TRANSIT';
  };

  // ─────────────────────────────────────────────────
  // Helper: Enrich data with branch, user, and transit info
  // ─────────────────────────────────────────────────
  const enrichWithRelatedData = async (records) => {
    if (!records || records.length === 0) return records;

    const branchIds = [...new Set(records.map(i => i.branch_id).filter(Boolean))];
    const staffIds = [...new Set(records.map(i => i.staff_id).filter(Boolean))];
    const updaterIds = [...new Set(records.map(i => i.updated_by).filter(Boolean))];
    const allUserIds = [...new Set([...staffIds, ...updaterIds])];
    const grNos = [...new Set(records.map(i => i.gr_no).filter(Boolean))];

    // Check if transit data already comes from DB function
    const hasTransitFromDB = records[0]?.hasOwnProperty('transit_challan_no');

    // Fetch all related data in parallel
    const promises = [
      // Branch data
      branchIds.length > 0
        ? supabase.from('branches').select('id, branch_name, branch_code').in('id', branchIds).then(r => r.data || []).catch(() => [])
        : Promise.resolve([]),
      // User data
      allUserIds.length > 0
        ? supabase.from('users').select('id, name, username').in('id', allUserIds).then(r => r.data || []).catch(() => [])
        : Promise.resolve([]),
      // Transit details - only fetch if not already from DB function
      (!hasTransitFromDB && grNos.length > 0)
        ? supabase.from('transit_details')
            .select('gr_no, challan_no, is_out_of_delivery_from_branch1, is_delivered_at_branch2, is_out_of_delivery_from_branch2, is_delivered_at_destination, out_for_door_delivery')
            .in('gr_no', grNos)
            .then(r => r.data || []).catch(() => [])
        : Promise.resolve([])
    ];

    const [branchResult, userResult, transitResult] = await Promise.all(promises);

    const branchMap = branchResult.reduce((acc, b) => { acc[b.id] = b; return acc; }, {});
    const userMap = userResult.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
    const transitMap = transitResult.reduce((acc, t) => {
      acc[t.gr_no?.toUpperCase()] = t;
      return acc;
    }, {});

    // Fetch dispatch_date from challan_details for client-side fallback
    let challanMap = {};
    if (!hasTransitFromDB && transitResult.length > 0) {
      const challanNos = [...new Set(transitResult.map(t => t.challan_no).filter(Boolean))];
      if (challanNos.length > 0) {
        const challanResult = await supabase
          .from('challan_details')
          .select('challan_no, dispatch_date')
          .in('challan_no', challanNos)
          .then(r => r.data || []).catch(() => []);
        challanMap = challanResult.reduce((acc, c) => { acc[c.challan_no] = c; return acc; }, {});
      }
    }

    return records.map(item => {
      let transitInfo;

      if (hasTransitFromDB) {
        // Data from DB function already has dispatch_date from challan_details
        transitInfo = {
          transit_challan_no: item.transit_challan_no || null,
          transit_status: item.transit_status || 'AVL',
          transit_dispatch_date: item.transit_dispatch_date || null,
        };
      } else {
        const transit = transitMap[item.gr_no?.toUpperCase()] || null;
        if (transit) {
          transitInfo = {
            transit_challan_no: transit.challan_no || null,
            transit_status: getTransitStatusLabel(transit),
            // dispatch_date from challan_details, NOT from transit_details
            transit_dispatch_date: challanMap[transit.challan_no]?.dispatch_date || null,
          };
        } else {
          transitInfo = {
            transit_challan_no: null,
            transit_status: 'AVL',
            transit_dispatch_date: null,
          };
        }
      }

      return {
        ...item,
        branch: item.branch_id ? branchMap[item.branch_id] || null : null,
        creator: item.staff_id ? userMap[item.staff_id] || null : null,
        updater: item.updated_by ? userMap[item.updated_by] || null : null,
        ...transitInfo
      };
    });
  };

  // ─────────────────────────────────────────────────
  // Load all summary data with pagination support
  // ─────────────────────────────────────────────────
  const loadSummaryData = useCallback(async (limit = 50, offset = 0) => {
    try {
      setLoading(true);
      
      // Try DB function first (fast, includes transit join)
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('search_station_bilty_with_transit', {
          p_limit: limit,
          p_offset: offset
        });

        if (!rpcError && rpcData) {
          const totalCount = rpcData.length > 0 ? Number(rpcData[0].total_count) : 0;
          const enriched = await enrichWithRelatedData(rpcData);
          setSummaryData(enriched);
          return { data: enriched, count: totalCount };
        }
      } catch (rpcErr) {
        console.warn('RPC function not available, falling back to regular query:', rpcErr.message);
      }

      // Fallback: regular query + client-side transit fetch
      const { data, error, count } = await supabase
        .from('station_bilty_summary')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const enriched = await enrichWithRelatedData(data || []);
      setSummaryData(enriched);
      return { data: enriched, count: count || 0 };
    } catch (error) {
      console.error('Error loading summary data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────
  // Simple search function (searches ALL records)
  // ─────────────────────────────────────────────────
  const searchSummaries = useCallback(async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    // Track this request to prevent stale results
    const requestId = ++searchRequestIdRef.current;
    isAdvancedSearchActiveRef.current = false;

    try {
      setSearching(true);

      // Try DB function first - also searches in challan_no!
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('search_station_bilty_with_transit', {
          p_search_term: term,
          p_limit: 100
        });

        if (!rpcError && rpcData) {
          const enriched = await enrichWithRelatedData(rpcData);
          // Only update if this is still the latest request
          if (requestId === searchRequestIdRef.current) {
            setSearchResults(enriched);
          }
          return enriched;
        }
      } catch (rpcErr) {
        console.warn('RPC search not available, falling back:', rpcErr.message);
      }
      
      // Fallback: regular query
      const escapedTerm = term.replace(/[%_\\]/g, '\\$&');
      
      const { data, error } = await supabase
        .from('station_bilty_summary')
        .select('*')
        .or(`station.ilike.%${escapedTerm}%,gr_no.ilike.%${escapedTerm}%,consignor.ilike.%${escapedTerm}%,consignee.ilike.%${escapedTerm}%,pvt_marks.ilike.%${escapedTerm}%,contents.ilike.%${escapedTerm}%`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const enriched = await enrichWithRelatedData(data || []);
      // Only update if this is still the latest request
      if (requestId === searchRequestIdRef.current) {
        setSearchResults(enriched);
      }
      return enriched;
    } catch (error) {
      console.error('Error searching summaries:', error);
      if (requestId === searchRequestIdRef.current) {
        setSearchResults([]);
      }
      return [];
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setSearching(false);
      }
    }
  }, []);

  // ─────────────────────────────────────────────────
  // Advanced search with comprehensive filters
  // ─────────────────────────────────────────────────
  const advancedSearchSummaries = useCallback(async (filters) => {
    try {
      setSearching(true);
      // Mark advanced search as active so debounced effect won't clear results
      isAdvancedSearchActiveRef.current = true;
      searchRequestIdRef.current++;
      console.log('Advanced search filters received:', filters);
      
      // Try DB function first for fast search with transit join
      try {
        const rpcParams = { p_limit: 200 };

        if (filters.fromDate) rpcParams.p_from_date = filters.fromDate;
        if (filters.toDate) {
          const toDate = new Date(filters.toDate);
          toDate.setDate(toDate.getDate() + 1);
          rpcParams.p_to_date = toDate.toISOString().split('T')[0];
        }
        if (filters.grNumber) rpcParams.p_gr_number = filters.grNumber;
        if (filters.consignor) rpcParams.p_consignor = filters.consignor;
        if (filters.consignee) rpcParams.p_consignee = filters.consignee;
        if (filters.pvtMarks) rpcParams.p_pvt_marks = filters.pvtMarks;
        if (filters.paymentStatus) rpcParams.p_payment_status = filters.paymentStatus;
        if (filters.branchId) rpcParams.p_branch_id = filters.branchId;
        if (filters.station) rpcParams.p_station = filters.station;
        if (filters.transitStatus) rpcParams.p_transit_status = filters.transitStatus;
        if (filters.challanNo) rpcParams.p_challan_no = filters.challanNo;

        const { data: rpcData, error: rpcError } = await supabase.rpc('search_station_bilty_with_transit', rpcParams);

        if (!rpcError && rpcData) {
          const enriched = await enrichWithRelatedData(rpcData);
          setSearchResults(enriched);
          return enriched;
        }
      } catch (rpcErr) {
        console.warn('RPC advanced search not available, falling back:', rpcErr.message);
      }
      
      // Fallback: regular query (no transit filter support)
      let query = supabase
        .from('station_bilty_summary')
        .select('*');

      if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        toDate.setDate(toDate.getDate() + 1);
        query = query.lt('created_at', toDate.toISOString().split('T')[0]);
      }
      if (filters.grNumber) {
        query = query.ilike('gr_no', `%${filters.grNumber.replace(/[%_\\]/g, '\\$&')}%`);
      }
      if (filters.consignor) {
        query = query.ilike('consignor', `%${filters.consignor.replace(/[%_\\]/g, '\\$&')}%`);
      }
      if (filters.consignee) {
        query = query.ilike('consignee', `%${filters.consignee.replace(/[%_\\]/g, '\\$&')}%`);
      }
      if (filters.pvtMarks) {
        query = query.ilike('pvt_marks', `%${filters.pvtMarks.replace(/[%_\\]/g, '\\$&')}%`);
      }
      if (filters.contents) {
        query = query.ilike('contents', `%${filters.contents.replace(/[%_\\]/g, '\\$&')}%`);
      }
      if (filters.station) {
        query = query.ilike('station', `%${filters.station.replace(/[%_\\]/g, '\\$&')}%`);
      }
      if (filters.paymentStatus) query = query.eq('payment_status', filters.paymentStatus);
      if (filters.deliveryType) query = query.eq('delivery_type', filters.deliveryType);
      if (filters.branchId) query = query.eq('branch_id', filters.branchId);
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;

      let enriched = await enrichWithRelatedData(data || []);
      
      // Client-side transit status filtering (fallback when DB function unavailable)
      if (filters.transitStatus && filters.transitStatus !== 'all') {
        enriched = enriched.filter(item => {
          switch (filters.transitStatus) {
            case 'avl': return item.transit_status === 'AVL';
            case 'in_transit': return item.transit_status !== 'AVL' && item.transit_status !== 'DELIVERED';
            case 'delivered': return item.transit_status === 'DELIVERED';
            case 'at_hub': return item.transit_status === 'AT_HUB';
            case 'out_for_delivery': return item.transit_status === 'OUT_FOR_DELIVERY';
            default: return true;
          }
        });
      }

      // Client-side challan_no filtering (fallback)
      if (filters.challanNo) {
        const challanSearch = filters.challanNo.toLowerCase();
        enriched = enriched.filter(item => 
          item.transit_challan_no && item.transit_challan_no.toLowerCase().includes(challanSearch)
        );
      }
      
      setSearchResults(enriched);
      return enriched;
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
        // Basic search — override any advanced search
        isAdvancedSearchActiveRef.current = false;
        searchSummaries(searchTerm);
      } else if (!isAdvancedSearchActiveRef.current) {
        // Only clear results if NOT in advanced search mode
        // This prevents the bug where advanced search results vanish
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchSummaries]);

  // ─────────────────────────────────────────────────
  // Save or update summary data
  // ─────────────────────────────────────────────────
  const saveSummary = useCallback(async (currentUser = null) => {
    try {
      setSaving(true);

      const validationError = validateForm();
      if (validationError) {
        throw new Error(validationError);
      }

      const actualStaffId = formData.staff_id || currentUser?.id || null;
      const actualBranchId = formData.branch_id || currentUser?.branch_id || null;
      const currentUserId = currentUser?.id || null;

      console.log('Saving manual bilty with:', {
        staff_id: actualStaffId,
        branch_id: actualBranchId,
        current_user_id: currentUserId,
        editing: !!editingId,
        will_set_updated_by: editingId ? currentUserId : 'N/A (new record)'
      });

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
        staff_id: actualStaffId,
        branch_id: actualBranchId,
        transport_id: formData.transport_id || null,
        transport_name: formData.transport_name?.toString().trim() || null,
        transport_gst: formData.transport_gst?.toString().trim() || null,
        updated_at: new Date().toISOString()
      };

      let result;

      if (editingId) {
        saveData.updated_by = currentUserId;
        
        const { data, error } = await supabase
          .from('station_bilty_summary')
          .update(saveData)
          .eq('id', editingId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
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

        const { data, error } = await supabase
          .from('station_bilty_summary')
          .insert([saveData])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

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
      branch_id: summary.branch_id || null,
      transport_id: summary.transport_id || null,
      transport_name: summary.transport_name || '',
      transport_gst: summary.transport_gst || ''
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
        .select('payment_status, amount, no_of_packets, weight, branch_id');

      if (error) throw error;

      return data.reduce((acc, item) => {
        acc.totalRecords++;
        acc.totalAmount += parseFloat(item.amount) || 0;
        acc.totalPackets += parseInt(item.no_of_packets) || 0;
        acc.totalWeight += parseFloat(item.weight) || 0;
        
        if (item.payment_status === 'paid') acc.paidCount++;
        else if (item.payment_status === 'to-pay') acc.toPayCount++;
        else if (item.payment_status === 'foc') acc.focCount++;

        return acc;
      }, {
        totalRecords: 0, totalAmount: 0, totalPackets: 0, totalWeight: 0,
        paidCount: 0, toPayCount: 0, focCount: 0
      });
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

  // Clear search
  const clearSearch = useCallback(() => {
    isAdvancedSearchActiveRef.current = false;
    searchRequestIdRef.current++;
    setSearchTerm('');
    setSearchResults([]);
  }, []);

  return {
    loading, saving, searching,
    summaryData, searchResults, searchTerm,
    editingId, formData,
    cities, transports, loadingReferenceData,
    setFormData, setSearchTerm,
    loadSummaryData, searchSummaries,
    saveSummary, loadForEdit, deleteSummary,
    resetForm, getSummaryStats, exportToCSV,
    validateForm, loadReferenceData,
    advancedSearchSummaries, clearSearch
  };
};

// ═══════════════════════════════════════════════════
// Constants & Utilities
// ═══════════════════════════════════════════════════

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'to-pay', label: 'To Pay', color: 'orange' },
  { value: 'foc', label: 'FOC (Free of Charge)', color: 'blue' }
];

export const DELIVERY_TYPE_OPTIONS = [
  { value: 'godown', label: 'Godown' },
  { value: 'door', label: 'Door' }
];

// Transit status options for filters
export const TRANSIT_STATUS_OPTIONS = [
  { value: 'all', label: 'All Status', color: 'gray' },
  { value: 'avl', label: 'Available (AVL)', color: 'green' },
  { value: 'in_transit', label: 'In Transit', color: 'blue' },
  { value: 'at_hub', label: 'At Hub', color: 'purple' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'orange' },
  { value: 'delivered', label: 'Delivered', color: 'emerald' }
];

// Transit status display config (used in table badges)
export const TRANSIT_STATUS_CONFIG = {
  'AVL':              { label: 'AVL',              bg: 'bg-green-100',   text: 'text-green-800',   border: 'border-green-300',   dot: 'bg-green-500',   icon: '🟢' },
  'IN_TRANSIT':       { label: 'In Transit',       bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-300',    dot: 'bg-blue-500',    icon: '' },
  'DISPATCHED':       { label: 'Dispatched',       bg: 'bg-indigo-100',  text: 'text-indigo-800',  border: 'border-indigo-300',  dot: 'bg-indigo-500',  icon: '📦' },
  'AT_HUB':           { label: 'At Hub',           bg: 'bg-purple-100',  text: 'text-purple-800',  border: 'border-purple-300',  dot: 'bg-purple-500',  icon: '🏢' },
  'OUT_FROM_HUB':     { label: 'Out from Hub',     bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-300',   dot: 'bg-amber-500',   icon: '📤' },
  'OUT_FOR_DELIVERY': { label: 'Out for Delivery', bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  dot: 'bg-orange-500',  icon: '🛵' },
  'DELIVERED':        { label: 'Delivered',         bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500', icon: '✅' }
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

export const formatWeight = (weight) => {
  return `${(weight || 0).toFixed(3)} kg`;
};

export const getPaymentStatusColor = (status) => {
  const option = PAYMENT_STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.color : 'gray';
};
