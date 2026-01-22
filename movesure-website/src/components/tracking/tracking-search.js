'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Package } from 'lucide-react';
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
        // Get user's branch
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('branch_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;

        // Search bilties
        const { data, error, count } = await supabase
          .from('bilty')
          .select('*', { count: 'exact' })
          .eq('branch_id', userData.branch_id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .ilike('gr_no', `%${grSearch}%`)
          .order('bilty_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(displayLimit);

        if (error) throw error;

        // Fetch transit details and destination for each bilty
        const biltiesWithDetails = await Promise.all(
          (data || []).map(async (bilty) => {
            const promises = [];
            
            // Fetch transit details
            promises.push(
              supabase
                .from('transit_details')
                .select('challan_no, dispatch_date')
                .eq('gr_no', bilty.gr_no)
                .single()
            );
            
            // Fetch destination city if to_city_id exists
            if (bilty.to_city_id) {
              promises.push(
                supabase
                  .from('cities')
                  .select('city_name')
                  .eq('id', bilty.to_city_id)
                  .single()
              );
            } else {
              promises.push(Promise.resolve({ data: null }));
            }
            
            const [transitResult, cityResult] = await Promise.all(promises);
            
            return {
              ...bilty,
              destination: cityResult.data?.city_name || null,
              transit_details: transitResult.data || null
            };
          })
        );

        setBilties(biltiesWithDetails);
        setTotalCount(count || 0);
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

  return (
    <div className="bg-white/95 p-3 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold rounded shadow-sm flex items-center gap-1.5">
          <Package className="w-3 h-3" />
          TRACK BILTY
        </div>

        <div className="relative flex-1 max-w-md" ref={searchRef}>
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
            className="w-full px-3 py-1.5 text-slate-900 text-sm font-semibold border border-slate-300 rounded bg-white shadow-sm placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition-colors duration-200 hover:border-indigo-300"
            placeholder="🔍 Search GR Number..."
            autoFocus
          />

          {showDropdown && (
            <div
              className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded shadow-lg max-h-80 overflow-y-auto"
              ref={dropdownRef}
              onScroll={handleScroll}
            >
              <div className="p-2 bg-indigo-500 text-white text-[10px] font-semibold rounded-t sticky top-0 z-10">
                <Search className="w-3 h-3 inline mr-1" />
                {isSearching ? 'Searching...' : `SELECT BILTY (${totalCount} total, showing ${displayedBilties.length})`}
              </div>
              {displayedBilties.length > 0 ? (
                <>
                  {displayedBilties.map((bilty, index) => (
                    <button
                      key={bilty.id}
                      onClick={() => handleSelectBilty(bilty)}
                      className={`w-full px-3 py-2 text-left hover:bg-indigo-50 border-b border-slate-100 transition-colors ${
                        index === selectedIndex ? 'bg-indigo-100' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Private Mark on Top */}
                          {bilty.private_mark && (
                            <div className="text-[9px] font-bold text-purple-600 mb-0.5 truncate">
                              🏷️ {bilty.private_mark}
                            </div>
                          )}
                          
                          {/* GR Number */}
                          <div className="text-xs font-bold text-indigo-600 truncate">{bilty.gr_no}</div>
                          
                          {/* Consignor → Consignee */}
                          <div className="text-xs text-black font-medium truncate">
                            {bilty.consignor_name} → {bilty.consignee_name}
                          </div>
                          
                          {/* Destination */}
                          {bilty.destination && (
                            <div className="text-[10px] text-indigo-700 font-semibold mt-0.5 truncate">
                              📍 To: {bilty.destination}
                            </div>
                          )}
                          
                          {/* Date and Amount */}
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            {new Date(bilty.bilty_date).toLocaleDateString()} | ₹{bilty.total?.toLocaleString()}
                          </div>
                          
                          {/* Challan Details - Small */}
                          {bilty.transit_details && bilty.transit_details.challan_no && (
                            <div className="text-[9px] text-teal-700 font-medium mt-0.5 bg-teal-50 px-1.5 py-0.5 rounded inline-block">
                              🚚 Challan: {bilty.transit_details.challan_no}
                              {bilty.transit_details.dispatch_date && (
                                <span className="ml-1 text-teal-800 font-semibold">
                                  | Dispatched: {new Date(bilty.transit_details.dispatch_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                          bilty.saving_option === 'DRAFT'
                            ? 'bg-yellow-200 text-amber-800 border border-yellow-300'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {bilty.saving_option}
                        </div>
                      </div>
                    </button>
                  ))}
                  {hasMore && (
                    <div className="px-3 py-2 text-[10px] text-gray-600 text-center border-b border-slate-100">
                      {isLoadingMore || isSearching ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          Loading more...
                        </div>
                      ) : (
                        <div className="text-indigo-600 font-medium">
                          Scroll for more... ({totalCount - displayedBilties.length} more)
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : grSearch ? (
                isSearching ? (
                  <div className="px-3 py-2 text-xs text-gray-600 text-center flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    Searching database...
                  </div>
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-600 text-center">
                    No bilties found matching &quot;{grSearch}&quot;
                  </div>
                )
              ) : (
                <div className="px-3 py-2 text-xs text-gray-600 text-center">
                  Start typing to search bilties...
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
