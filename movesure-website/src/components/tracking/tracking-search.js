'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Package } from 'lucide-react';

const TrackingSearch = ({ onSelectBilty, bilties = [] }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [grSearch, setGrSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

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

  const filteredBilties = bilties.filter(b =>
    b.gr_no.toLowerCase().includes(grSearch.toLowerCase())
  );

  const displayedBilties = filteredBilties.slice(0, displayLimit);
  const hasMore = filteredBilties.length > displayLimit;

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 5 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setDisplayLimit(prev => prev + 50);
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
                SELECT BILTY ({filteredBilties.length} total, showing {displayedBilties.length})
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
                          <div className="text-xs font-bold text-indigo-600 truncate">{bilty.gr_no}</div>
                          <div className="text-xs text-black font-medium truncate">
                            {bilty.consignor_name} → {bilty.consignee_name}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            {new Date(bilty.bilty_date).toLocaleDateString()} | ₹{bilty.total?.toLocaleString()}
                          </div>
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
                      {isLoadingMore ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          Loading more...
                        </div>
                      ) : (
                        <div className="text-indigo-600 font-medium">
                          Scroll for more...
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : grSearch ? (
                <div className="px-3 py-2 text-xs text-gray-600 text-center">
                  No bilties found matching &quot;{grSearch}&quot;
                </div>
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
