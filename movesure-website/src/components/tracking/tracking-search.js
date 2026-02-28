'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, MapPin, Calendar, Truck, IndianRupee, Tag, FileText, Building2 } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const TrackingSearch = ({ onSelectBilty, user }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [grSearch, setGrSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [bilties, setBilties] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

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

  // Search bilties from database with debouncing
  useEffect(() => {
    const searchBilties = async () => {
      if (!user || !grSearch.trim()) {
        setBilties([]);
        setTotalCount(0);
        return;
      }

      setIsSearching(true);
      try {
        // Search both bilty + station_bilty_summary via single RPC call (system-wide)
        const { data, error } = await supabase.rpc('search_all_bilties', {
          p_search_term: grSearch.trim(),
          p_limit: displayLimit,
          p_offset: 0
        });

        if (error) {
          console.error('RPC error details:', error.message, error.code, error.hint, JSON.stringify(error));
          // Fallback: search bilty table directly if RPC function not found
          if (error.code === '42883' || error.message?.includes('function') || error.code === 'PGRST202') {
            console.warn('Falling back to direct table search...');
            const searchTerm = grSearch.trim();
            const searchPattern = `%${searchTerm}%`;

            const { data: biltyData, error: biltyError, count: biltyCount } = await supabase
              .from('bilty')
              .select('*', { count: 'exact' })
              .eq('is_active', true)
              .is('deleted_at', null)
              .or(`gr_no.ilike.${searchPattern},pvt_marks.ilike.${searchPattern},consignor_name.ilike.${searchPattern},consignee_name.ilike.${searchPattern},e_way_bill.ilike.${searchPattern},transport_name.ilike.${searchPattern},invoice_no.ilike.${searchPattern}`)
              .order('created_at', { ascending: false })
              .limit(displayLimit);

            if (biltyError) throw biltyError;

            const biltyResults = (biltyData || []).map(b => ({ ...b, source_type: 'REG', weight: b.wt }));

            const { data: stationData, error: stationError, count: stationCount } = await supabase
              .from('station_bilty_summary')
              .select('*', { count: 'exact' })
              .or(`gr_no.ilike.${searchPattern},pvt_marks.ilike.${searchPattern},consignor.ilike.${searchPattern},consignee.ilike.${searchPattern},e_way_bill.ilike.${searchPattern},transport_name.ilike.${searchPattern},station.ilike.${searchPattern}`)
              .order('created_at', { ascending: false })
              .limit(displayLimit);

            if (stationError) throw stationError;

            const stationResults = (stationData || []).map(s => ({
              ...s,
              source_type: 'MNL',
              consignor_name: s.consignor,
              consignee_name: s.consignee,
              bilty_date: s.created_at,
              payment_mode: s.payment_status,
              total: s.amount,
              no_of_pkg: s.no_of_packets,
              weight: s.weight,
              contain: s.contents,
              saving_option: 'SAVE',
              destination: s.station || ''
            }));

            const combined = [...biltyResults, ...stationResults]
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .slice(0, displayLimit);

            setBilties(combined);
            setTotalCount((biltyCount || 0) + (stationCount || 0));
            return;
          }
          throw error;
        }

        const results = data || [];
        const count = results.length > 0 ? results[0].total_count : 0;

        setBilties(results);
        setTotalCount(count);
      } catch (error) {
        console.error('Error searching bilties:', error);
        setBilties([]);
        setTotalCount(0);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchBilties();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [grSearch, user, displayLimit]);

  const displayedBilties = bilties;
  const hasMore = bilties.length < totalCount;

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 5 && hasMore && !isLoadingMore && !isSearching) {
      setIsLoadingMore(true);
      setDisplayLimit(prev => prev + 50);
      setTimeout(() => {
        setIsLoadingMore(false);
      }, 200);
    }
  };

  useEffect(() => {
    setDisplayLimit(50);
  }, [grSearch]);

  const handleKeyDown = (e) => {
    if (showDropdown && displayedBilties.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < displayedBilties.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : displayedBilties.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handleSelectBilty(displayedBilties[selectedIndex]);
          } else if (displayedBilties.length > 0) {
            handleSelectBilty(displayedBilties[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          setSelectedIndex(-1);
          break;
      }
    }
  };

  const handleSelectBilty = (bilty) => {
    onSelectBilty(bilty);
    setGrSearch('');
    setShowDropdown(false);
    setSelectedIndex(-1);
    setBilties([]);
    setTotalCount(0);
  };

  // Highlight matching text in search results
  const highlightMatch = (text, search) => {
    if (!text || !search) return text;
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-yellow-200 text-yellow-900 font-bold rounded-sm px-0.5">{text.slice(idx, idx + search.length)}</span>
        {text.slice(idx + search.length)}
      </>
    );
  };

  return (
    <div className="bg-white/95 p-3 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-3 py-2 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" />
          TRACK
        </div>

        <div className="relative flex-1" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              ref={inputRef}
              value={grSearch}
              onChange={(e) => {
                setGrSearch(e.target.value);
                setShowDropdown(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => {
                setShowDropdown(true);
                setDisplayLimit(50);
              }}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-3 py-2 text-slate-900 text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 hover:border-indigo-300"
              placeholder="Search GR No, Pvt Mark, Consignor, Consignee, E-Way Bill, Transport..."
              autoFocus
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {showDropdown && grSearch.trim() && (
            <div
              className="absolute z-30 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-[420px] overflow-y-auto"
              ref={dropdownRef}
              onScroll={handleScroll}
            >
              {/* Header */}
              <div className="px-3 py-2 bg-gradient-to-r from-slate-800 to-slate-700 text-white text-[10px] font-semibold rounded-t-xl sticky top-0 z-10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Search className="w-3 h-3" />
                  {isSearching ? 'Searching...' : `${totalCount} result${totalCount !== 1 ? 's' : ''} found`}
                </div>
                {displayedBilties.length > 0 && !isSearching && (
                  <span className="text-slate-300">showing {displayedBilties.length}</span>
                )}
              </div>

              {displayedBilties.length > 0 ? (
                <div className="p-1.5 space-y-1">
                  {displayedBilties.map((bilty, index) => (
                    <button
                      key={bilty.id}
                      onClick={() => handleSelectBilty(bilty)}
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
                            {highlightMatch(bilty.gr_no, grSearch.trim())}
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
                            bilty.saving_option === 'DRAFT'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
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
                            {highlightMatch(bilty.pvt_marks, grSearch.trim())}
                          </span>
                        </div>
                      )}

                      {/* Consignor → Consignee */}
                      <div className="text-xs text-slate-800 font-medium truncate mb-1">
                        {highlightMatch(bilty.consignor_name || '', grSearch.trim())}
                        <span className="text-slate-400 mx-1">→</span>
                        {highlightMatch(bilty.consignee_name || '', grSearch.trim())}
                      </div>

                      {/* Bottom row: meta info */}
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                        {bilty.destination && (
                          <span className="flex items-center gap-0.5 text-indigo-600 font-semibold">
                            <MapPin className="w-3 h-3" />
                            {highlightMatch(bilty.destination, grSearch.trim())}
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
                            EWB: {highlightMatch(bilty.e_way_bill, grSearch.trim())}
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
                          <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          Loading more...
                        </div>
                      ) : (
                        <span className="text-indigo-600 font-semibold">
                          ↓ Scroll for {totalCount - displayedBilties.length} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : isSearching ? (
                <div className="px-4 py-8 text-center">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs text-slate-500 font-medium">Searching across all bilties...</p>
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No bilties found for &quot;{grSearch}&quot;</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Try searching by GR No, Pvt Mark, Consignor, Consignee</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackingSearch;
