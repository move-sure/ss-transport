'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../utils/auth';
import supabase from '../../../utils/supabase';
import Navbar from '../../../../components/dashboard/navbar';
import {
  Search, X, Loader2, ArrowLeft, Hash, MapPin, User, Package,
  FileText, Trash2, CheckCircle2, Plus, AlertCircle, Tag,
} from 'lucide-react';

export default function BulkUpdatePohonchPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Search states (same pattern as gr-wise-management)
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
  const searchTimeoutRef = useRef(null);

  // Collected GRs
  const [collectedGrs, setCollectedGrs] = useState([]);

  // Pohonch & bilty number assign
  const [pohonchNo, setPohonchNo] = useState('');
  const [biltyNumber, setBiltyNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // Cities lookup for resolving to_city_id for MNL bilties
  const [cities, setCities] = useState([]);
  const [allTransports, setAllTransports] = useState([]);

  useEffect(() => {
    Promise.all([
      supabase.from('cities').select('id, city_name, city_code').order('city_name'),
      supabase.from('transports').select('id, transport_name, gst_number').order('transport_name'),
    ]).then(([citiesRes, transportsRes]) => {
      setCities(citiesRes.data || []);
      setAllTransports(transportsRes.data || []);
    });
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

  // Search bilties using RPC with debounce
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
              no_of_pkg: s.no_of_packets, weight: s.weight, contain: s.contents, destination: s.station || '',
            }));
            const combined = [...biltyResults, ...stationResults].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, displayLimit);
            setSuggestions(combined);
            setTotalCount((biltyRes.count || 0) + (stationRes.count || 0));
            return;
          }
          throw error;
        }
        setSuggestions(data || []);
        setTotalCount((data || []).length > 0 ? data[0].total_count : 0);
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
          if (selectedIndex >= 0) addGrToList(suggestions[selectedIndex]);
          else if (suggestions.length > 0) addGrToList(suggestions[0]);
          break;
        case 'Escape': e.preventDefault(); setShowDropdown(false); setSelectedIndex(-1); break;
      }
    }
  };

  const highlightMatch = (text, search) => {
    if (!text || !search) return text;
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return text;
    return (<>{text.slice(0, idx)}<span className="bg-yellow-200 text-yellow-900 font-bold rounded-sm px-0.5">{text.slice(idx, idx + search.length)}</span>{text.slice(idx + search.length)}</>);
  };

  // Add selected GR to the collected list — also fetch existing kaat data
  const addGrToList = useCallback(async (bilty) => {
    if (!bilty?.gr_no) return;
    if (collectedGrs.some(g => g.gr_no === bilty.gr_no)) {
      setShowDropdown(false);
      setSearchTerm('');
      setSuggestions([]);
      return;
    }
    const isMNL = bilty.source_type === 'MNL';
    const toCityId = bilty.to_city_id || (isMNL && bilty.station
      ? (cities.find(c => c.city_code?.toLowerCase() === bilty.station?.toLowerCase())?.id || null)
      : null);

    // Fetch existing kaat record for this GR
    let existingKaat = null;
    try {
      const { data } = await supabase.from('bilty_wise_kaat').select('pohonch_no, bilty_number, transport_id').eq('gr_no', bilty.gr_no).maybeSingle();
      existingKaat = data;
    } catch {}

    // Resolve transport name from transport_id
    let transportName = '';
    if (existingKaat?.transport_id) {
      const t = allTransports.find(tr => String(tr.id) === String(existingKaat.transport_id));
      transportName = t?.transport_name || '';
    }

    setCollectedGrs(prev => [...prev, {
      gr_no: bilty.gr_no,
      consignor: bilty.consignor_name || '-',
      consignee: bilty.consignee_name || '-',
      destination: bilty.destination || bilty.station || '-',
      packets: bilty.no_of_pkg || 0,
      weight: bilty.weight || 0,
      amount: bilty.total || 0,
      payment: bilty.payment_mode || '-',
      challan_no: bilty.challan_no || '-',
      pvt_marks: bilty.pvt_marks || '-',
      to_city_id: toCityId,
      source_type: bilty.source_type,
      existing_pohonch: existingKaat?.pohonch_no || null,
      existing_bilty_number: existingKaat?.bilty_number || null,
      transport_name: transportName,
    }]);
    setShowDropdown(false);
    setSearchTerm('');
    setSuggestions([]);
    setSelectedIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [collectedGrs, cities, allTransports]);

  const removeGrFromList = (grNo) => {
    setCollectedGrs(prev => prev.filter(g => g.gr_no !== grNo));
  };

  const clearAll = () => setCollectedGrs([]);

  // Bulk assign pohonch (and optionally bilty number) to all collected GRs
  const bulkAssign = useCallback(async () => {
    if (!collectedGrs.length || !user?.id) return;
    if (!pohonchNo.trim() && !biltyNumber.trim()) { alert('Enter pohonch number or bilty number'); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const grNos = collectedGrs.map(g => g.gr_no);

      const { data: existingKaats } = await supabase
        .from('bilty_wise_kaat')
        .select('*')
        .in('gr_no', grNos);

      const existingMap = {};
      (existingKaats || []).forEach(k => { existingMap[k.gr_no] = k; });

      const upsertPayloads = collectedGrs.map(g => {
        const existing = existingMap[g.gr_no];
        return {
          gr_no: g.gr_no,
          challan_no: g.challan_no !== '-' ? g.challan_no : (existing?.challan_no || null),
          destination_city_id: g.to_city_id || existing?.destination_city_id || null,
          pohonch_no: pohonchNo.trim() || existing?.pohonch_no || null,
          bilty_number: biltyNumber.trim() || existing?.bilty_number || null,
          kaat: existing?.kaat || 0,
          pf: existing?.pf || 0,
          actual_kaat_rate: existing?.actual_kaat_rate || 0,
          dd_chrg: existing?.dd_chrg || 0,
          bilty_chrg: existing?.bilty_chrg || 0,
          ewb_chrg: existing?.ewb_chrg || 0,
          labour_chrg: existing?.labour_chrg || 0,
          other_chrg: existing?.other_chrg || 0,
          transport_id: existing?.transport_id || null,
          transport_hub_rate_id: existing?.transport_hub_rate_id || null,
          rate_type: existing?.rate_type || null,
          rate_per_kg: existing?.rate_per_kg || 0,
          rate_per_pkg: existing?.rate_per_pkg || 0,
          updated_by: user.id,
          updated_at: now,
          ...(existing ? {} : { created_by: user.id }),
        };
      });

      for (let i = 0; i < upsertPayloads.length; i += 100) {
        const batch = upsertPayloads.slice(i, i + 100);
        const { error } = await supabase.from('bilty_wise_kaat').upsert(batch, { onConflict: 'gr_no' });
        if (error) throw error;
      }

      const parts = [];
      if (pohonchNo.trim()) parts.push(`Pohonch "${pohonchNo.trim()}"`);
      if (biltyNumber.trim()) parts.push(`Bilty No "${biltyNumber.trim()}"`);
      alert(`${parts.join(' & ')} assigned to ${collectedGrs.length} GR(s) successfully!`);
      setCollectedGrs([]);
      setPohonchNo('');
      setBiltyNumber('');
    } catch (e) {
      console.error('Bulk assign error:', e);
      alert('Failed to assign: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }, [collectedGrs, pohonchNo, biltyNumber, user?.id]);

  if (!user) return null;

  const totalPkts = collectedGrs.reduce((s, g) => s + (parseInt(g.packets) || 0), 0);
  const totalWt = collectedGrs.reduce((s, g) => s + (parseFloat(g.weight) || 0), 0);
  const totalAmt = collectedGrs.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600"/>
              </button>
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
                <FileText className="h-5 w-5 text-white"/>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Bulk Update Pohonch / Bilty No</h1>
                <p className="text-xs text-gray-500">Search GRs, collect them, then assign pohonch or bilty number to all at once</p>
              </div>
            </div>
            {collectedGrs.length > 0 && (
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-600">
                <span className="font-bold text-indigo-700">{collectedGrs.length} GRs</span>
                <span className="text-gray-300">|</span>
                <span>{totalPkts} Pkts</span>
                <span className="text-gray-300">|</span>
                <span>{totalWt.toFixed(1)} kg</span>
                <span className="text-gray-300">|</span>
                <span className="font-semibold">₹{totalAmt.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* Search Bar */}
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); setSelectedIndex(-1); }}
              onFocus={() => { if (suggestions.length) setShowDropdown(true); }}
              onKeyDown={handleKeyDown}
              placeholder="Search GR No, Consignor, Consignee, Pvt Marks, E-Way Bill..."
              className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black bg-white shadow-sm"
              autoFocus
            />
            {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500 animate-spin"/>}
          </div>

          {/* Dropdown */}
          {showDropdown && searchTerm.trim() && (
            <div
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-80 overflow-y-auto"
              onScroll={handleDropdownScroll}
            >
              {isSearching && suggestions.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin"/>Searching...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
                  <AlertCircle className="h-4 w-4"/>No results found
                </div>
              ) : (
                <>
                  <div className="px-4 py-2 bg-gray-50 border-b text-[10px] text-gray-500 font-medium rounded-t-2xl">
                    {totalCount} result{totalCount !== 1 ? 's' : ''} — click to add to list
                  </div>
                  {suggestions.map((s, i) => {
                    const alreadyAdded = collectedGrs.some(g => g.gr_no === s.gr_no);
                    return (
                      <button
                        key={`${s.gr_no}-${i}`}
                        onClick={() => addGrToList(s)}
                        disabled={alreadyAdded}
                        className={`w-full text-left px-4 py-2.5 border-b border-gray-50 transition-colors ${
                          alreadyAdded ? 'bg-green-50 opacity-60 cursor-not-allowed' :
                          selectedIndex === i ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${s.source_type === 'REG' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                              {s.source_type}
                            </span>
                            <span className="text-sm font-bold text-gray-900">{highlightMatch(s.gr_no, searchTerm)}</span>
                            <span className="text-[10px] text-gray-400">→ {s.destination || '-'}</span>
                            {s.pvt_marks && s.pvt_marks !== '-' && <span className="text-[9px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-medium truncate max-w-[150px]">{highlightMatch(s.pvt_marks, searchTerm)}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-shrink-0">
                            <span>{s.no_of_pkg || 0} pkg</span>
                            <span>{parseFloat(s.weight || 0).toFixed(1)} kg</span>
                            {alreadyAdded && <CheckCircle2 className="h-3 w-3 text-green-500"/>}
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                          {highlightMatch(s.consignor_name || '-', searchTerm)} → {highlightMatch(s.consignee_name || '-', searchTerm)}
                          {s.challan_no && <span className="ml-2 text-gray-400">CH: {s.challan_no}</span>}
                        </div>
                      </button>
                    );
                  })}
                  {isLoadingMore && (
                    <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400">
                      <Loader2 className="h-3 w-3 animate-spin"/>Loading more...
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Collected GRs Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-xl"><FileText className="h-4 w-4 text-indigo-600"/></div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Collected GRs</h2>
                <p className="text-[10px] text-gray-500">{collectedGrs.length} GR{collectedGrs.length !== 1 ? 's' : ''} · {totalPkts} pkts · {totalWt.toFixed(1)} kg · ₹{totalAmt.toLocaleString('en-IN')}</p>
              </div>
            </div>
            {collectedGrs.length > 0 && (
              <button onClick={clearAll} className="text-[10px] font-semibold text-red-600 hover:text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-50 border border-red-200 transition-colors">
                <Trash2 className="h-3 w-3 inline mr-0.5"/>Clear All
              </button>
            )}
          </div>

          {collectedGrs.length === 0 ? (
            <div className="py-20 text-center">
              <Search className="h-10 w-10 text-gray-200 mx-auto mb-3"/>
              <p className="text-sm text-gray-400 font-medium">Search and add GRs above to collect them here</p>
              <p className="text-[10px] text-gray-300 mt-1">Then assign pohonch number or bilty number to all of them at once</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 w-8">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">GR No</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Pvt Marks</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Consignor</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Consignee</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Dest</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-500">Pkts</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-500">Wt</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500">Amt</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-500">Payment</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Challan</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Transport</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Existing Pohonch</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Existing Bilty No</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-500 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {collectedGrs.map((g, i) => (
                    <tr key={g.gr_no} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2 text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900">{g.gr_no}</span>
                          <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${g.source_type === 'REG' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{g.source_type}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-purple-700 font-medium max-w-[120px] truncate" title={g.pvt_marks}>{g.pvt_marks}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[130px] truncate" title={g.consignor}>{g.consignor}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[130px] truncate" title={g.consignee}>{g.consignee}</td>
                      <td className="px-3 py-2 text-gray-700 font-medium">{g.destination}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{g.packets}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{parseFloat(g.weight || 0).toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">₹{parseFloat(g.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-center">
                        {g.payment && g.payment !== '-' && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${g.payment.includes('PAID') && !g.payment.includes('TO') ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {g.payment}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">{g.challan_no}</td>
                      <td className="px-3 py-2">
                        {g.transport_name ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold border border-teal-200 truncate max-w-[140px] inline-block" title={g.transport_name}>{g.transport_name}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {g.existing_pohonch ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">{g.existing_pohonch}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {g.existing_bilty_number ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold border border-teal-200">{g.existing_bilty_number}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => removeGrFromList(g.gr_no)} className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <X className="h-3.5 w-3.5"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Assignment Section */}
          {collectedGrs.length > 0 && (
            <div className="px-4 py-4 border-t border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Pohonch Number</label>
                  <input
                    type="text"
                    value={pohonchNo}
                    onChange={e => setPohonchNo(e.target.value)}
                    placeholder="Enter pohonch number..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
                    onKeyDown={e => { if (e.key === 'Enter' && (pohonchNo.trim() || biltyNumber.trim())) bulkAssign(); }}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Bilty Number <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={biltyNumber}
                    onChange={e => setBiltyNumber(e.target.value)}
                    placeholder="Enter bilty number..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-300 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
                    onKeyDown={e => { if (e.key === 'Enter' && (pohonchNo.trim() || biltyNumber.trim())) bulkAssign(); }}
                  />
                </div>
                <button
                  onClick={bulkAssign}
                  disabled={saving || (!pohonchNo.trim() && !biltyNumber.trim())}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-all whitespace-nowrap"
                >
                  {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/>Assigning...</> : <><CheckCircle2 className="h-3.5 w-3.5"/>Assign to {collectedGrs.length} GR{collectedGrs.length > 1 ? 's' : ''}</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
