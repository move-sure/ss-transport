'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import Navbar from '../../../components/dashboard/navbar';
import { format } from 'date-fns';
import {
  Search, AlertCircle, RefreshCw, Hash, MapPin, User, Package, Calendar,
  CheckCircle2, Clock, Truck, Phone, Edit3, Save, X, Loader2, ArrowLeft,
  CircleDot, Box, Building2, Navigation, CheckCircle, ClipboardList,
  Tag, FileText, IndianRupee,
} from 'lucide-react';

export default function GRWiseManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Search / dropdown states
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Detail states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [grData, setGrData] = useState(null);       // merged bilty + transit
  const [kaatData, setKaatData] = useState(null);    // bilty_wise_kaat record
  const [branches, setBranches] = useState({});
  const [cities, setCities] = useState([]);
  const [updatingTransit, setUpdatingTransit] = useState({});

  // Kaat modal
  const [editingKaat, setEditingKaat] = useState(false);
  const [kaatForm, setKaatForm] = useState({});
  const [savingKaat, setSavingKaat] = useState(false);

  // Fetch branches & cities on mount
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [brRes, ciRes] = await Promise.all([
          supabase.from('branches').select('id, branch_name').eq('is_active', true),
          supabase.from('cities').select('id, city_name, city_code').order('city_name'),
        ]);
        const bMap = {};
        (brRes.data || []).forEach(b => { bMap[b.id] = b.branch_name; });
        setBranches(bMap);
        setCities(ciRes.data || []);
      } catch (err) {
        console.error('Error fetching lookups:', err);
      }
    };
    fetchLookups();
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search bilties using RPC with debounce (same pattern as tracking-search)
  useEffect(() => {
    const searchBilties = async () => {
      if (!user || !searchTerm.trim()) {
        setSuggestions([]);
        setTotalCount(0);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase.rpc('search_all_bilties', {
          p_search_term: searchTerm.trim(),
          p_limit: displayLimit,
          p_offset: 0,
        });

        if (error) {
          console.error('RPC error:', error);
          // Fallback: direct table search if RPC unavailable
          if (error.code === '42883' || error.message?.includes('function') || error.code === 'PGRST202') {
            const sp = `%${searchTerm.trim()}%`;
            const [biltyRes, stationRes] = await Promise.all([
              supabase.from('bilty').select('*', { count: 'exact' }).eq('is_active', true).is('deleted_at', null)
                .or(`gr_no.ilike.${sp},pvt_marks.ilike.${sp},consignor_name.ilike.${sp},consignee_name.ilike.${sp},e_way_bill.ilike.${sp},transport_name.ilike.${sp},invoice_no.ilike.${sp}`)
                .order('created_at', { ascending: false }).limit(displayLimit),
              supabase.from('station_bilty_summary').select('*', { count: 'exact' })
                .or(`gr_no.ilike.${sp},pvt_marks.ilike.${sp},consignor.ilike.${sp},consignee.ilike.${sp},e_way_bill.ilike.${sp},transport_name.ilike.${sp},station.ilike.${sp}`)
                .order('created_at', { ascending: false }).limit(displayLimit),
            ]);
            const biltyResults = (biltyRes.data || []).map(b => ({ ...b, source_type: 'REG', weight: b.wt }));
            const stationResults = (stationRes.data || []).map(s => ({
              ...s, source_type: 'MNL', consignor_name: s.consignor, consignee_name: s.consignee,
              bilty_date: s.created_at, payment_mode: s.payment_status, total: s.amount,
              no_of_pkg: s.no_of_packets, weight: s.weight, contain: s.contents, saving_option: 'SAVE', destination: s.station || '',
            }));
            const combined = [...biltyResults, ...stationResults].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, displayLimit);
            setSuggestions(combined);
            setTotalCount((biltyRes.count || 0) + (stationRes.count || 0));
            return;
          }
          throw error;
        }

        const results = data || [];
        setSuggestions(results);
        setTotalCount(results.length > 0 ? results[0].total_count : 0);
      } catch (err) {
        console.error('Error searching bilties:', err);
        setSuggestions([]);
        setTotalCount(0);
      } finally {
        setIsSearching(false);
      }
    };

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(searchBilties, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchTerm, user, displayLimit]);

  // Reset display limit when search term changes
  useEffect(() => { setDisplayLimit(50); }, [searchTerm]);

  const hasMore = suggestions.length < totalCount;

  const handleDropdownScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 5 && hasMore && !isLoadingMore && !isSearching) {
      setIsLoadingMore(true);
      setDisplayLimit(prev => prev + 50);
      setTimeout(() => setIsLoadingMore(false), 200);
    }
  };

  const handleKeyDown = (e) => {
    if (showDropdown && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); setSelectedIndex(p => p < suggestions.length - 1 ? p + 1 : 0); break;
        case 'ArrowUp': e.preventDefault(); setSelectedIndex(p => p > 0 ? p - 1 : suggestions.length - 1); break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) handleSelectSuggestion(suggestions[selectedIndex]);
          else if (suggestions.length > 0) handleSelectSuggestion(suggestions[0]);
          break;
        case 'Escape': e.preventDefault(); setShowDropdown(false); setSelectedIndex(-1); break;
      }
    }
  };

  // Highlight matching text
  const highlightMatch = (text, search) => {
    if (!text || !search) return text;
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return text;
    return (<>{text.slice(0, idx)}<span className="bg-yellow-200 text-yellow-900 font-bold rounded-sm px-0.5">{text.slice(idx, idx + search.length)}</span>{text.slice(idx + search.length)}</>);
  };

  // When user selects a suggestion from the dropdown
  const handleSelectSuggestion = (bilty) => {
    setShowDropdown(false);
    setSelectedIndex(-1);
    setSuggestions([]);
    setSearchTerm(bilty.gr_no);
    fetchGRDetails(bilty);
  };

  // Fetch full GR details from the selected bilty object + transit + kaat
  const fetchGRDetails = useCallback(async (bilty) => {
    if (!bilty?.gr_no) return;
    try {
      setLoading(true);
      setError(null);

      const trimmedGr = bilty.gr_no;

      // Fetch transit_details and bilty_wise_kaat in parallel
      const [transitRes, kaatRes] = await Promise.all([
        supabase.from('transit_details').select(`
          id, challan_no, gr_no, bilty_id, challan_book_id, from_branch_id, to_branch_id,
          is_out_of_delivery_from_branch1, out_of_delivery_from_branch1_date,
          is_delivered_at_branch2, delivered_at_branch2_date,
          is_out_of_delivery_from_branch2, out_of_delivery_from_branch2_date,
          is_delivered_at_destination, delivered_at_destination_date,
          out_for_door_delivery, out_for_door_delivery_date,
          delivery_agent_name, delivery_agent_phone, vehicle_number, remarks,
          created_at, updated_at
        `).eq('gr_no', trimmedGr).maybeSingle(),
        supabase.from('bilty_wise_kaat').select('*').eq('gr_no', trimmedGr).maybeSingle(),
      ]);

      const transit = transitRes.data;
      const kaat = kaatRes.data;
      const isMNL = bilty.source_type === 'MNL';

      // Build merged object from the RPC bilty data + transit
      const fb = transit ? (branches[transit.from_branch_id] || '-') : '-';
      const tb = transit ? (branches[transit.to_branch_id] || '-') : '-';

      const merged = {
        ...(transit || {}),
        source: isMNL ? 'station_bilty_summary' : 'bilty',
        bilty_id: bilty.id,
        gr_no: trimmedGr,
        from_branch_name: fb,
        to_branch_name: tb,
        consignor: bilty.consignor_name || '-',
        consignor_number: bilty.consignor_number || '',
        consignor_gst: bilty.consignor_gst || '',
        consignee: bilty.consignee_name || '-',
        consignee_number: bilty.consignee_number || '',
        consignee_gst: bilty.consignee_gst || '',
        destination: bilty.destination || '-',
        to_city_id: bilty.to_city_id || null,
        from_city_id: bilty.from_city_id || null,
        packets: bilty.no_of_pkg || 0,
        weight: bilty.weight || 0,
        rate: bilty.rate || 0,
        amount: bilty.total || 0,
        freight_amount: bilty.freight_amount || 0,
        payment: bilty.payment_mode || '-',
        delivery_type: bilty.delivery_type || '-',
        contain: bilty.contain || '-',
        e_way_bill: bilty.e_way_bill || '',
        pvt_marks: bilty.pvt_marks || '',
        bilty_date: bilty.bilty_date,
        transport_name: bilty.transport_name || '',
        transport_gst: bilty.transport_gst || '',
        transport_number: bilty.transport_number || '',
        invoice_no: bilty.invoice_no || '',
        invoice_value: bilty.invoice_value || 0,
        labour_charge: bilty.labour_charge || 0,
        bill_charge: bilty.bill_charge || 0,
        toll_charge: bilty.toll_charge || 0,
        dd_charge: bilty.dd_charge || 0,
        other_charge: bilty.other_charge || 0,
        pf_charge: bilty.pf_charge || 0,
        remark: bilty.remark || transit?.remarks || '',
        challan_no: bilty.challan_no || transit?.challan_no || '-',
        bilty_image: bilty.bilty_image || '',
        w_name: bilty.w_name || '',
        transit_bilty_image: bilty.transit_bilty_image || '',
        station: bilty.station || '',
      };

      setGrData(merged);
      setKaatData(kaat || null);
    } catch (err) {
      console.error('Error fetching GR details:', err);
      setError('Failed to load GR details. Please try again.');
      setGrData(null);
      setKaatData(null);
    } finally {
      setLoading(false);
    }
  }, [branches]);

  // Transit status update (same pattern as challan detail page)
  const updateTransitStatus = async (field, dateField) => {
    if (!user?.id || !grData?.id) return;
    const key = `${grData.id}-${field}`;
    if (updatingTransit[key]) return;
    if (!confirm(`Mark GR ${grData.gr_no} as "${field.replace(/_/g, ' ')}"?`)) return;

    try {
      setUpdatingTransit(p => ({ ...p, [key]: true }));
      const now = new Date().toISOString();
      const { error: e } = await supabase
        .from('transit_details')
        .update({ [field]: true, [dateField]: now, updated_by: user.id })
        .eq('id', grData.id);
      if (e) throw e;
      setGrData(p => ({ ...p, [field]: true, [dateField]: now }));
    } catch (e) {
      console.error(e);
      alert('Failed to update transit status.');
    } finally {
      setUpdatingTransit(p => ({ ...p, [key]: false }));
    }
  };

  // Open kaat modal
  const openKaatModal = () => {
    const k = kaatData || {};
    setKaatForm({
      pohonch_no: k.pohonch_no || '',
      bilty_number: k.bilty_number || '',
      kaat: k.kaat || 0,
      pf: k.pf || 0,
      actual_kaat_rate: k.actual_kaat_rate || 0,
      dd_chrg: k.dd_chrg || 0,
      bilty_chrg: k.bilty_chrg || 0,
      ewb_chrg: k.ewb_chrg || 0,
      labour_chrg: k.labour_chrg || 0,
      other_chrg: k.other_chrg || 0,
    });
    setEditingKaat(true);
  };

  // Save kaat form
  const saveKaatForm = async () => {
    if (!grData?.gr_no || !user?.id) return;
    setSavingKaat(true);
    try {
      const payload = {
        gr_no: grData.gr_no,
        challan_no: grData.challan_no || null,
        destination_city_id: grData.to_city_id || null,
        pohonch_no: kaatForm.pohonch_no || null,
        bilty_number: kaatForm.bilty_number || null,
        kaat: parseFloat(kaatForm.kaat) || 0,
        pf: parseFloat(kaatForm.pf) || 0,
        actual_kaat_rate: parseFloat(kaatForm.actual_kaat_rate) || 0,
        dd_chrg: parseFloat(kaatForm.dd_chrg) || 0,
        bilty_chrg: parseFloat(kaatForm.bilty_chrg) || 0,
        ewb_chrg: parseFloat(kaatForm.ewb_chrg) || 0,
        labour_chrg: parseFloat(kaatForm.labour_chrg) || 0,
        other_chrg: parseFloat(kaatForm.other_chrg) || 0,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };
      if (!kaatData) payload.created_by = user.id;

      const { data, error } = await supabase
        .from('bilty_wise_kaat')
        .upsert(payload, { onConflict: 'gr_no' })
        .select()
        .single();
      if (error) throw error;

      setKaatData(data);
      setEditingKaat(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save kaat data.');
    } finally {
      setSavingKaat(false);
    }
  };

  const kTotal = (k) => !k ? 0 : ['kaat','pf','dd_chrg','bilty_chrg','ewb_chrg','labour_chrg','other_chrg']
    .reduce((s, f) => s + (parseFloat(k[f]) || 0), 0);

  // Status helpers (same as challan detail page)
  const getStatus = (t) => {
    if (!t) return { l: 'No Transit', c: 'gray' };
    if (t.is_delivered_at_destination) return { l: 'Delivered', c: 'green' };
    if (t.out_for_door_delivery) return { l: 'Door Delivery', c: 'blue' };
    if (t.is_out_of_delivery_from_branch2) return { l: 'Out from B2', c: 'cyan' };
    if (t.is_delivered_at_branch2) return { l: 'At Branch 2', c: 'purple' };
    if (t.is_out_of_delivery_from_branch1) return { l: 'In Transit', c: 'amber' };
    return { l: 'Pending', c: 'gray' };
  };

  const stClr = {
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const isMNL = grData?.source === 'station_bilty_summary';
  const hasTransit = grData?.id && grData?.challan_no && grData?.challan_no !== '-';

  // KNP detection: Kanpur destination OR manual (station_bilty_summary) bilties → show "Delivered" action
  const isKnp = isMNL || (grData?.destination || '').toLowerCase().includes('kanpur');

  // Dedicated transit handlers (same as challan detail page)
  const handleDeliveredAtBranch2 = () => {
    if (!grData || grData.is_delivered_at_branch2) return;
    if (!confirm(`Mark GR ${grData.gr_no} as "Delivered"?`)) return;
    updateTransitStatus('is_delivered_at_branch2', 'delivered_at_branch2_date');
  };
  const handleOutFromBranch2 = () => {
    if (!grData || grData.is_out_of_delivery_from_branch2) return;
    if (!confirm(`Mark GR ${grData.gr_no} as "Out for Delivery"?`)) return;
    updateTransitStatus('is_out_of_delivery_from_branch2', 'out_of_delivery_from_branch2_date');
  };
  const handleOutForDoorDelivery = () => {
    if (!grData || grData.out_for_door_delivery) return;
    if (!confirm(`Mark GR ${grData.gr_no} as "Out for Door Delivery"?`)) return;
    updateTransitStatus('out_for_door_delivery', 'out_for_door_delivery_date');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/hub-management')} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
              <Hash className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">GR-wise Management</h1>
              <p className="text-xs text-gray-500">Search GR number to view bilty details, update transit & pohonch</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Search Section with Dropdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="relative" ref={searchRef}>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-3 py-2.5 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 flex-shrink-0">
                <Package className="w-3.5 h-3.5" />
                GR
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  ref={inputRef}
                  placeholder="Search GR No, Pvt Mark, Consignor, Consignee, E-Way Bill, Transport..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); setSelectedIndex(-1); }}
                  onFocus={() => { setShowDropdown(true); setDisplayLimit(50); }}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                  autoFocus
                />
                {isSearching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && searchTerm.trim() && (
              <div
                className="absolute z-40 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-[420px] overflow-y-auto"
                ref={dropdownRef}
                onScroll={handleDropdownScroll}
              >
                {/* Dropdown header */}
                <div className="px-3 py-2 bg-gradient-to-r from-slate-800 to-slate-700 text-white text-[10px] font-semibold rounded-t-xl sticky top-0 z-10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Search className="w-3 h-3" />
                    {isSearching ? 'Searching...' : `${totalCount} result${totalCount !== 1 ? 's' : ''} found`}
                  </div>
                  {suggestions.length > 0 && !isSearching && (
                    <span className="text-slate-300">showing {suggestions.length}</span>
                  )}
                </div>

                {suggestions.length > 0 ? (
                  <div className="p-1.5 space-y-1">
                    {suggestions.map((bilty, index) => (
                      <button
                        key={bilty.id}
                        onClick={() => handleSelectSuggestion(bilty)}
                        className={`w-full px-3 py-2.5 text-left rounded-lg transition-all duration-150 border ${
                          index === selectedIndex
                            ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        {/* Top row: GR + badges */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-extrabold text-indigo-700 tracking-tight">
                              {highlightMatch(bilty.gr_no, searchTerm.trim())}
                            </span>
                            {bilty.source_type === 'MNL' ? (
                              <span className="text-[8px] px-1.5 py-0.5 bg-orange-500 text-white font-bold rounded-md flex items-center gap-0.5 whitespace-nowrap">
                                <Building2 className="w-2.5 h-2.5" /> MANUAL
                              </span>
                            ) : (
                              <span className="text-[8px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded-md whitespace-nowrap">
                                REGULAR
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {bilty.challan_no && (
                              <span className="text-[8px] px-1.5 py-0.5 bg-teal-100 text-teal-700 font-bold rounded-md flex items-center gap-0.5 whitespace-nowrap">
                                <Truck className="w-2.5 h-2.5" /> {bilty.challan_no}
                              </span>
                            )}
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${
                              bilty.saving_option === 'DRAFT' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {bilty.saving_option}
                            </span>
                          </div>
                        </div>

                        {/* Pvt marks */}
                        {bilty.pvt_marks && (
                          <div className="flex items-center gap-1 mb-1">
                            <Tag className="w-3 h-3 text-purple-500 flex-shrink-0" />
                            <span className="text-[10px] font-bold text-purple-700 truncate">
                              {highlightMatch(bilty.pvt_marks, searchTerm.trim())}
                            </span>
                          </div>
                        )}

                        {/* Consignor → Consignee */}
                        <div className="text-xs text-slate-800 font-medium truncate mb-1">
                          {highlightMatch(bilty.consignor_name || '', searchTerm.trim())}
                          <span className="text-slate-400 mx-1">→</span>
                          {highlightMatch(bilty.consignee_name || '', searchTerm.trim())}
                        </div>

                        {/* Bottom meta */}
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                          {bilty.destination && (
                            <span className="flex items-center gap-0.5 text-indigo-600 font-semibold">
                              <MapPin className="w-3 h-3" />
                              {highlightMatch(bilty.destination, searchTerm.trim())}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(bilty.bilty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </span>
                          {bilty.total != null && (
                            <span className="flex items-center gap-0.5 font-bold text-slate-700">
                              <IndianRupee className="w-3 h-3" />
                              {Number(bilty.total).toLocaleString('en-IN')}
                            </span>
                          )}
                          {bilty.no_of_pkg != null && bilty.no_of_pkg > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Package className="w-3 h-3" /> {bilty.no_of_pkg} pkg
                            </span>
                          )}
                          {bilty.e_way_bill && (
                            <span className="flex items-center gap-0.5">
                              <FileText className="w-3 h-3" />
                              EWB: {highlightMatch(bilty.e_way_bill, searchTerm.trim())}
                            </span>
                          )}
                          {bilty.dispatch_date && (
                            <span className="flex items-center gap-0.5 text-teal-600 font-semibold">
                              <Truck className="w-3 h-3" />
                              Dispatched {new Date(bilty.dispatch_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}

                    {hasMore && (
                      <div className="px-3 py-2 text-[10px] text-center">
                        {isLoadingMore || isSearching ? (
                          <div className="flex items-center justify-center gap-1.5 text-slate-500">
                            <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            Loading more...
                          </div>
                        ) : (
                          <span className="text-indigo-600 font-semibold">↓ Scroll for {totalCount - suggestions.length} more</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : isSearching ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">Searching across all bilties...</p>
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">No bilties found for &quot;{searchTerm}&quot;</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Try searching by GR No, Pvt Mark, Consignor, Consignee, E-Way Bill</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="relative w-10 h-10 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-200" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            </div>
            <p className="mt-4 text-gray-500 text-sm">Loading details...</p>
          </div>
        )}

        {/* GR Details */}
        {!loading && grData && (
          <div className="space-y-4">
            {/* GR Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100 px-5 py-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Package className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">GR Number</p>
                      <p className="text-xl font-bold text-indigo-600">{grData.gr_no}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-gray-100 text-gray-700">
                      {isMNL ? 'MANUAL' : 'REGULAR'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const st = getStatus(hasTransit ? grData : null);
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${stClr[st.c]}`}>
                          <CircleDot className="h-3 w-3" />{st.l}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Bilty Info Grid */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <InfoRow icon={<Calendar className="h-3.5 w-3.5 text-gray-400" />} label="Bilty Date" value={grData.bilty_date ? format(new Date(grData.bilty_date), 'dd MMM yyyy') : '-'} />
                  <InfoRow icon={<MapPin className="h-3.5 w-3.5 text-blue-500" />} label="Destination" value={grData.destination || '-'} bold />
                  <InfoRow icon={<Truck className="h-3.5 w-3.5 text-gray-400" />} label="Delivery Type" value={grData.delivery_type || '-'} />
                  <InfoRow icon={<Package className="h-3.5 w-3.5 text-gray-400" />} label="Contain" value={grData.contain || '-'} />
                  <InfoRow icon={<Hash className="h-3.5 w-3.5 text-gray-400" />} label="E-Way Bill" value={grData.e_way_bill || '-'} />
                  <InfoRow icon={<ClipboardList className="h-3.5 w-3.5 text-gray-400" />} label="Challan No" value={grData.challan_no || '-'} />
                </div>
                <div className="space-y-3">
                  <InfoRow icon={<User className="h-3.5 w-3.5 text-indigo-500" />} label="Consignor" value={grData.consignor || '-'} bold />
                  {grData.consignor_number && <InfoRow icon={<Phone className="h-3.5 w-3.5 text-gray-400" />} label="Consignor Phone" value={grData.consignor_number} />}
                  <InfoRow icon={<User className="h-3.5 w-3.5 text-purple-500" />} label="Consignee" value={grData.consignee || '-'} bold />
                  {grData.consignee_number && <InfoRow icon={<Phone className="h-3.5 w-3.5 text-gray-400" />} label="Consignee Phone" value={grData.consignee_number} />}
                  {grData.transport_name && <InfoRow icon={<Truck className="h-3.5 w-3.5 text-gray-400" />} label="Transport" value={grData.transport_name} />}
                  {grData.pvt_marks && <InfoRow icon={<Hash className="h-3.5 w-3.5 text-gray-400" />} label="Pvt Marks" value={grData.pvt_marks} />}
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatBox label="Packets" value={grData.packets || 0} color="blue" />
              <StatBox label="Weight" value={`${parseFloat(grData.weight || 0).toFixed(1)} kg`} color="purple" />
              <StatBox label="Amount" value={`₹${parseFloat(grData.amount || 0).toLocaleString('en-IN')}`} color="green" />
              <StatBox label="Payment" value={grData.payment || '-'} color={grData.payment?.toLowerCase() === 'paid' ? 'green' : 'amber'} />
              <StatBox label="Freight" value={`₹${parseFloat(grData.freight_amount || 0).toLocaleString('en-IN')}`} color="blue" />
            </div>

            {/* Branch Info (only if transit exists) */}
            {hasTransit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg"><Building2 className="h-3.5 w-3.5 text-blue-600" /></div>
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase font-semibold">From Branch</p>
                      <p className="text-xs font-bold text-gray-900">{grData.from_branch_name}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 rounded-lg"><Building2 className="h-3.5 w-3.5 text-indigo-600" /></div>
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase font-semibold">To Branch</p>
                      <p className="text-xs font-bold text-gray-900">{grData.to_branch_name}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pohonch / Bilty Number & Kaat Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-violet-600" />
                  Pohonch / Bilty# & Kaat
                </h3>
                <button
                  onClick={openKaatModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-xs font-semibold border border-violet-200 hover:bg-violet-100 transition-colors"
                >
                  <Edit3 className="h-3 w-3" />
                  {kaatData ? 'Edit' : 'Add'}
                </button>
              </div>

              {kaatData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Pohonch No</p>
                      <p className="text-sm font-bold text-gray-900">{kaatData.pohonch_no || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Bilty Number</p>
                      <p className="text-sm font-bold text-gray-900">{kaatData.bilty_number || '-'}</p>
                    </div>
                    <div className="bg-violet-50 rounded-lg p-3">
                      <p className="text-[10px] text-violet-600 uppercase font-semibold mb-1">Total Kaat</p>
                      <p className="text-sm font-bold text-violet-700">₹{kTotal(kaatData).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Actual Rate</p>
                      <p className="text-sm font-bold text-gray-900">₹{parseFloat(kaatData.actual_kaat_rate || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  {/* Charge breakdown */}
                  <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                    {[
                      { l: 'Kaat', v: kaatData.kaat },
                      { l: 'PF', v: kaatData.pf },
                      { l: 'DD', v: kaatData.dd_chrg },
                      { l: 'Bilty', v: kaatData.bilty_chrg },
                      { l: 'EWB', v: kaatData.ewb_chrg },
                      { l: 'Labour', v: kaatData.labour_chrg },
                      { l: 'Other', v: kaatData.other_chrg },
                    ].map(c => (
                      <div key={c.l} className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-gray-500 uppercase">{c.l}</p>
                        <p className="text-xs font-bold text-gray-800">₹{parseFloat(c.v || 0).toFixed(0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No pohonch/bilty/kaat data added yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Click &ldquo;Add&rdquo; to enter pohonch number, bilty number & kaat charges.</p>
                </div>
              )}
            </div>

            {/* Transit Status */}
            {hasTransit ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-indigo-600" />
                    Transit Status
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {isKnp && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200">KNP</span>}
                    {isMNL && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200">MNL</span>}
                    {(() => { const st = getStatus(grData); return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stClr[st.c]}`}><CircleDot className="h-2.5 w-2.5 inline mr-0.5"/>{st.l}</span>; })()}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Step 1: Out from Branch 1 (read-only, set by dispatch) */}
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${grData.is_out_of_delivery_from_branch1 ? 'border-amber-500 bg-amber-50' : 'border-gray-300'}`}>
                      {grData.is_out_of_delivery_from_branch1 && <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-900">Out from Branch 1</p>
                      {grData.out_of_delivery_from_branch1_date && <p className="text-[10px] text-gray-500">{format(new Date(grData.out_of_delivery_from_branch1_date), 'dd MMM yyyy, hh:mm a')}</p>}
                    </div>
                    {grData.is_out_of_delivery_from_branch1
                      ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200"><CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5"/>Done</span>
                      : <span className="text-[10px] text-gray-400">Pending</span>}
                  </div>

                  {/* Step 2 & 3: Action buttons — KNP/MNL vs Others */}
                  <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-100 p-4">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase mb-3">Actions</p>
                    <div className="flex flex-wrap gap-2">
                      {isKnp ? (
                        <>
                          <ActionBtn
                            done={grData.is_delivered_at_branch2}
                            loading={updatingTransit[`${grData.id}-is_delivered_at_branch2`]}
                            onClick={handleDeliveredAtBranch2}
                            label="Delivered"
                            doneLabel="✓ Delivered"
                            color="green"
                          />
                          {(grData.delivery_type || '').toLowerCase() === 'door' && (
                            <ActionBtn
                              done={grData.out_for_door_delivery}
                              loading={updatingTransit[`${grData.id}-out_for_door_delivery`]}
                              onClick={handleOutForDoorDelivery}
                              label="Door Delivery"
                              doneLabel="✓ DD"
                              color="blue"
                            />
                          )}
                        </>
                      ) : (
                        <ActionBtn
                          done={grData.is_out_of_delivery_from_branch2}
                          loading={updatingTransit[`${grData.id}-is_out_of_delivery_from_branch2`]}
                          onClick={handleOutFromBranch2}
                          label="Out for Delivery"
                          doneLabel="✓ Out"
                          color="cyan"
                        />
                      )}
                    </div>
                  </div>

                  {/* Date stamps */}
                  {(grData.delivered_at_branch2_date || grData.out_of_delivery_from_branch2_date || grData.out_for_door_delivery_date || grData.delivered_at_destination_date) && (
                    <div className="flex flex-wrap gap-1.5">
                      {grData.delivered_at_branch2_date && (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 px-2 py-1 rounded-lg text-[10px] font-semibold border border-purple-100">
                          <CheckCircle2 className="h-3 w-3"/> B2: {format(new Date(grData.delivered_at_branch2_date), 'dd/MM HH:mm')}
                        </span>
                      )}
                      {grData.out_of_delivery_from_branch2_date && (
                        <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-600 px-2 py-1 rounded-lg text-[10px] font-semibold border border-cyan-100">
                          <Truck className="h-3 w-3"/> Out: {format(new Date(grData.out_of_delivery_from_branch2_date), 'dd/MM HH:mm')}
                        </span>
                      )}
                      {grData.out_for_door_delivery_date && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-semibold border border-blue-100">
                          <Truck className="h-3 w-3"/> DD: {format(new Date(grData.out_for_door_delivery_date), 'dd/MM HH:mm')}
                        </span>
                      )}
                      {grData.delivered_at_destination_date && (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded-lg text-[10px] font-semibold border border-green-100">
                          <CheckCircle className="h-3 w-3"/> Dlvd: {format(new Date(grData.delivered_at_destination_date), 'dd/MM HH:mm')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Delivery agent info */}
                  {(grData.delivery_agent_name || grData.vehicle_number) && (
                    <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {grData.delivery_agent_name && <InfoRow icon={<User className="h-3.5 w-3.5 text-gray-400" />} label="Delivery Agent" value={grData.delivery_agent_name} />}
                      {grData.delivery_agent_phone && <InfoRow icon={<Phone className="h-3.5 w-3.5 text-gray-400" />} label="Agent Phone" value={grData.delivery_agent_phone} />}
                      {grData.vehicle_number && <InfoRow icon={<Truck className="h-3.5 w-3.5 text-gray-400" />} label="Vehicle No" value={grData.vehicle_number} />}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-amber-700 font-medium">No transit details found for this GR</p>
                <p className="text-xs text-amber-600 mt-1">This GR has not been assigned to any challan yet.</p>
              </div>
            )}

            {/* Charges Breakdown (for regular bilties) */}
            {!isMNL && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-indigo-600" />
                  Charges Breakdown
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { l: 'Freight', v: grData.freight_amount },
                    { l: 'Labour', v: grData.labour_charge },
                    { l: 'Bill Chrg', v: grData.bill_charge },
                    { l: 'Toll', v: grData.toll_charge },
                    { l: 'DD Chrg', v: grData.dd_charge },
                    { l: 'Other', v: grData.other_charge },
                  ].map(c => (
                    <div key={c.l} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">{c.l}</p>
                      <p className="text-sm font-bold text-gray-800 mt-1">₹{parseFloat(c.v || 0).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
                {grData.remark && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Remark</p>
                    <p className="text-xs text-gray-700">{grData.remark}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!loading && !grData && !error && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Hash className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Search by GR Number</h3>
            <p className="text-gray-500 text-sm">Enter a GR number above to view bilty details, manage pohonch/bilty number & transit status</p>
          </div>
        )}
      </div>

      {/* KAAT MODAL (same as challan detail page) */}
      {editingKaat && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingKaat(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Kaat & Pohonch Management</h3>
                <p className="text-[10px] text-gray-500">GR: <b className="text-indigo-700">{grData?.gr_no}</b>
                  {grData?.destination && grData.destination !== '-' && (
                    <span className="ml-1">→ {grData.destination}</span>
                  )}
                </p>
              </div>
              <button onClick={() => setEditingKaat(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Pohonch or Bilty Number */}
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase mb-2">Identification</p>
                <div className="grid grid-cols-2 gap-3">
                  <KF label="Pohonch No" value={kaatForm.pohonch_no}
                    onChange={v => setKaatForm(p => ({ ...p, pohonch_no: v, bilty_number: v ? '' : p.bilty_number }))}
                    type="text" big disabled={!!kaatForm.bilty_number} />
                  <KF label="Bilty Number" value={kaatForm.bilty_number}
                    onChange={v => setKaatForm(p => ({ ...p, bilty_number: v, pohonch_no: v ? '' : p.pohonch_no }))}
                    type="text" big disabled={!!kaatForm.pohonch_no} />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Only one can be filled at a time.</p>
              </div>
              {/* Charges */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-bold text-gray-700 uppercase mb-2">Charges & Kaat</p>
                <div className="grid grid-cols-3 gap-2">
                  <KF label="Kaat (₹)" value={kaatForm.kaat} onChange={v => setKaatForm(p => ({ ...p, kaat: v }))} />
                  <KF label="PF (₹)" value={kaatForm.pf} onChange={v => setKaatForm(p => ({ ...p, pf: v }))} />
                  <KF label="Actual Rate" value={kaatForm.actual_kaat_rate} onChange={v => setKaatForm(p => ({ ...p, actual_kaat_rate: v }))} />
                  <KF label="DD Chrg (₹)" value={kaatForm.dd_chrg} onChange={v => setKaatForm(p => ({ ...p, dd_chrg: v }))} />
                  <KF label="Bilty Chrg (₹)" value={kaatForm.bilty_chrg} onChange={v => setKaatForm(p => ({ ...p, bilty_chrg: v }))} />
                  <KF label="EWB Chrg (₹)" value={kaatForm.ewb_chrg} onChange={v => setKaatForm(p => ({ ...p, ewb_chrg: v }))} />
                  <KF label="Labour (₹)" value={kaatForm.labour_chrg} onChange={v => setKaatForm(p => ({ ...p, labour_chrg: v }))} />
                  <KF label="Other (₹)" value={kaatForm.other_chrg} onChange={v => setKaatForm(p => ({ ...p, other_chrg: v }))} />
                </div>
              </div>
              {/* Total & Save */}
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-gray-500">Total Charges:</span>
                  <span className="ml-1 font-bold text-violet-700 text-base">
                    ₹{(['kaat', 'pf', 'dd_chrg', 'bilty_chrg', 'ewb_chrg', 'labour_chrg', 'other_chrg'].reduce((s, f) => s + (parseFloat(kaatForm[f]) || 0), 0)).toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingKaat(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={saveKaatForm} disabled={savingKaat}
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                    {savingKaat ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== HELPER COMPONENTS ===== */

function InfoRow({ icon, label, value, bold }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-gray-500 min-w-[90px]">{label}:</span>
      <span className={`text-xs ${bold ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} truncate`}>{value}</span>
    </div>
  );
}

function StatBox({ label, value, color }) {
  const cm = {
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className={`${cm[color] || cm.blue} rounded-xl p-3 text-center border border-white/60`}>
      <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function ActionBtn({ done, loading, onClick, label, doneLabel, color }) {
  const colors = {
    green: { active: 'bg-green-600 hover:bg-green-700 shadow-green-200', done: 'bg-green-100 text-green-700 border-green-200' },
    blue: { active: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200', done: 'bg-blue-100 text-blue-700 border-blue-200' },
    cyan: { active: 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-200', done: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    purple: { active: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200', done: 'bg-purple-100 text-purple-700 border-purple-200' },
    amber: { active: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200', done: 'bg-amber-100 text-amber-700 border-amber-200' },
  };
  const c = colors[color] || colors.green;

  if (done) {
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border ${c.done}`}>
        <CheckCircle2 className="h-3 w-3" />{doneLabel}
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-[11px] font-bold text-white shadow-sm transition-all disabled:opacity-40 ${c.active}`}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {label}
    </button>
  );
}

function KF({ label, value, onChange, type = 'number', big, disabled }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black font-semibold ${big ? 'px-3 py-2.5 text-base' : 'px-2.5 py-2 text-sm'} ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
        step={type === 'number' ? '0.01' : undefined}
        placeholder={type === 'text' ? `Enter ${label}...` : '0'}
        disabled={disabled}
      />
    </div>
  );
}
