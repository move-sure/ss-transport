'use client';

import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Truck, Package, MapPin, Plus, AlertTriangle, CheckCircle, X, User, Phone, CreditCard, Search } from 'lucide-react';

const ChallanSelector = ({ 
  challans, 
  challanBooks, 
  selectedChallan, 
  setSelectedChallan,
  selectedChallanBook, 
  setSelectedChallanBook,
  onAddToTransit,
  saving,
  selectedBiltiesCount,
  branches = [],
  trucks,
  staff,
  transitBilties = []
}) => {
  const [showChallanDropdown, setShowChallanDropdown] = useState(false);
  const [showChallanBookDropdown, setShowChallanBookDropdown] = useState(false);
  const [challanSearchQuery, setChallanSearchQuery] = useState('');
  const [challanBookSearchQuery, setChallanBookSearchQuery] = useState('');
  
  const challanRef = useRef(null);
  const challanBookRef = useRef(null);
  const challanDropdownRef = useRef(null);
  const selectedChallanRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (challanRef.current && !challanRef.current.contains(event.target)) {
        setShowChallanDropdown(false);
        setChallanSearchQuery('');
      }
      if (challanBookRef.current && !challanBookRef.current.contains(event.target)) {
        setShowChallanBookDropdown(false);
        setChallanBookSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll to selected challan when dropdown opens
  useEffect(() => {
    if (showChallanDropdown && selectedChallanRef.current && challanDropdownRef.current) {
      setTimeout(() => {
        selectedChallanRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [showChallanDropdown]);

  // Separate dispatched and non-dispatched challans with search filter
  const filterChallans = (challanList) => {
    if (!challanSearchQuery.trim()) return challanList;
    const query = challanSearchQuery.toLowerCase();
    return challanList.filter(c => 
      c.challan_no?.toLowerCase().includes(query) ||
      c.truck?.truck_number?.toLowerCase().includes(query) ||
      c.driver?.name?.toLowerCase().includes(query) ||
      c.owner?.name?.toLowerCase().includes(query)
    );
  };

  const activeChallans = filterChallans(challans.filter(c => !c.is_dispatched));
  const dispatchedChallans = filterChallans(challans.filter(c => c.is_dispatched));

  // Filter challan books
  const filteredChallanBooks = challanBooks.filter(book => {
    if (!challanBookSearchQuery.trim()) return true;
    const query = challanBookSearchQuery.toLowerCase();
    const challanNumber = generateChallanNumber(book);
    const destinationBranch = getDestinationBranchName(book.id);
    return challanNumber.toLowerCase().includes(query) || destinationBranch.toLowerCase().includes(query);
  });

  // Calculate bilty counts from transit data
  const getTransitBiltyCounts = () => {
    if (!selectedChallan || !transitBilties) {
      return { regCount: 0, stnCount: 0, totalCount: 0 };
    }

    const regCount = transitBilties.filter(bilty => bilty.bilty_type === 'regular').length;
    const stnCount = transitBilties.filter(bilty => bilty.bilty_type === 'station').length;
    const totalCount = regCount + stnCount;

    return { regCount, stnCount, totalCount };
  };

  const { regCount, stnCount, totalCount } = getTransitBiltyCounts();

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return format(new Date(value), 'dd/MM/yyyy');
    } catch (error) {
      return '-';
    }
  };

  const generateChallanNumber = (challanBook) => {
    if (!challanBook) return '';
    const { prefix, current_number, digits, postfix } = challanBook;
    const paddedNumber = String(current_number).padStart(digits, '0');
    return `${prefix || ''}${paddedNumber}${postfix || ''}`;
  };

  const getDestinationBranchName = (challanBookId) => {
    const book = challanBooks.find(b => b.id === challanBookId);
    if (!book) return 'Unknown';
    
    const branch = branches.find(b => b.id === book.to_branch_id);
    return branch ? `${branch.branch_name} (${branch.branch_code})` : `Branch-${book.to_branch_id?.slice(0, 8)}`;
  };

  const handleChallanSelect = (challan) => {
    setSelectedChallan(challan);
    setShowChallanDropdown(false);
    setChallanSearchQuery('');
  };

  const handleChallanBookSelect = (book) => {
    setSelectedChallanBook(book);
    setShowChallanBookDropdown(false);
    setChallanBookSearchQuery('');
  };

  return (
    <div className="space-y-4 text-[13px] leading-5">
      <div className="rounded-xl border border-slate-200 bg-white/95 shadow-sm">
        <div className="border-b border-slate-200 px-3 py-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Truck className="h-4 w-4" />
            </span>
            Select Challan
          </h3>
        </div>

  <div className="space-y-4 px-3 py-3">
          <div className="relative" ref={challanRef}>
            <button
              onClick={() => setShowChallanDropdown((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="flex-1 min-w-0">
                {selectedChallan ? (
                  <>
                    <p className="truncate text-base font-semibold text-slate-900">{selectedChallan.challan_no || 'Challan'}</p>
                    <p className="truncate text-xs text-slate-500">
                      {formatDate(selectedChallan.date)} • {totalCount} bilties
                      {selectedChallan.is_dispatched ? ' • Dispatched' : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-slate-400">Choose a challan…</p>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 flex-shrink-0 text-indigo-500 transition-transform ${showChallanDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showChallanDropdown && (
              <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                {/* Search Box */}
                <div className="sticky top-0 z-20 border-b border-slate-200 bg-white p-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by challan, truck, driver..."
                      value={challanSearchQuery}
                      onChange={(e) => setChallanSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto" ref={challanDropdownRef}>
                  {challans.length === 0 ? (
                    <div className="px-3 py-8 text-center text-slate-500">
                      <Truck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="text-sm font-semibold">No challans available</p>
                      <p className="text-xs text-slate-400">Create a challan to begin assigning bilties.</p>
                    </div>
                  ) : activeChallans.length === 0 && dispatchedChallans.length === 0 ? (
                    <div className="px-3 py-8 text-center text-slate-500">
                      <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="text-sm font-semibold">No results found</p>
                      <p className="text-xs text-slate-400">Try a different search term.</p>
                    </div>
                  ) : (
                    <>
                      {activeChallans.length > 0 && (
                        <div>
                          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                            <CheckCircle className="h-3 w-3" /> Active ({activeChallans.length})
                          </div>
                          {activeChallans.map((challan) => {
                            const isCurrent = challan.id === selectedChallan?.id;

                            return (
                              <button
                                key={challan.id}
                                ref={isCurrent ? selectedChallanRef : null}
                                onClick={() => handleChallanSelect(challan)}
                                className={`flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-indigo-50 ${
                                  isCurrent ? 'bg-indigo-100 border-l-4 border-indigo-500' : 'bg-white'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-900">{challan.challan_no}</p>
                                  <p className="text-xs text-slate-500">{formatDate(challan.date)}</p>
                                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-indigo-500">
                                    <Package className="h-3 w-3" />
                                    {isCurrent ? totalCount : challan.total_bilty_count || 0} bilties
                                  </p>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">
                                  Active
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {dispatchedChallans.length > 0 && (
                        <div>
                          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-orange-100 bg-orange-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-orange-600">
                            <AlertTriangle className="h-3 w-3" /> Dispatched ({dispatchedChallans.length})
                          </div>
                          {dispatchedChallans.map((challan) => {
                            const isCurrent = challan.id === selectedChallan?.id;

                            return (
                              <button
                                key={challan.id}
                                ref={isCurrent ? selectedChallanRef : null}
                                onClick={() => handleChallanSelect(challan)}
                                className={`flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-orange-50 ${
                                  isCurrent ? 'bg-orange-100 border-l-4 border-orange-500' : 'bg-slate-50'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-700">{challan.challan_no}</p>
                                  <p className="text-xs text-slate-500">
                                    {formatDate(challan.date)}
                                    {challan.dispatch_date && ` • Dispatched ${formatDate(challan.dispatch_date)}`}
                                  </p>
                                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                    <Package className="h-3 w-3" />
                                    {challan.total_bilty_count || 0} bilties • read-only
                                  </p>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-[10px] font-semibold text-orange-600">
                                  Dispatched
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={challanBookRef}>
            <button
              onClick={() => setShowChallanBookDropdown((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="flex-1 min-w-0">
                {selectedChallanBook ? (
                  <>
                    <p className="truncate text-sm font-semibold text-slate-900">Next: {generateChallanNumber(selectedChallanBook)}</p>
                    <p className="truncate text-xs text-slate-500">To {getDestinationBranchName(selectedChallanBook.id)}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-slate-400">Choose a challan book…</p>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 flex-shrink-0 text-indigo-500 transition-transform ${showChallanBookDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showChallanBookDropdown && (
              <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                {/* Search Box */}
                <div className="sticky top-0 z-20 border-b border-slate-200 bg-white p-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search challan book..."
                      value={challanBookSearchQuery}
                      onChange={(e) => setChallanBookSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {filteredChallanBooks.length > 0 ? (
                    filteredChallanBooks.map((book) => {
                      const isCurrent = book.id === selectedChallanBook?.id;

                      return (
                        <button
                          key={book.id}
                          onClick={() => handleChallanBookSelect(book)}
                          className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left transition hover:bg-indigo-50 ${
                            isCurrent ? 'bg-indigo-100 border-l-4 border-indigo-500' : ''
                          }`}
                        >
                          <p className="truncate text-xs font-semibold text-slate-900">
                            {book.prefix || ''}{String(book.from_number).padStart(book.digits, '0')} -
                            {book.prefix || ''}{String(book.to_number).padStart(book.digits, '0')}{book.postfix || ''}
                          </p>
                          <p className="text-xs text-slate-500">Next: {generateChallanNumber(book)}</p>
                          <p className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500">
                            <MapPin className="h-3 w-3" /> To {getDestinationBranchName(book.id)}
                          </p>
                        </button>
                      );
                    })
                  ) : challanBooks.length === 0 ? (
                    <div className="px-3 py-5 text-center text-slate-500">
                      <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="text-sm font-semibold">No challan books found</p>
                      <p className="text-xs text-slate-400">Create a challan book to continue.</p>
                    </div>
                  ) : (
                    <div className="px-3 py-5 text-center text-slate-500">
                      <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="text-sm font-semibold">No results found</p>
                      <p className="text-xs text-slate-400">Try a different search term.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedChallan && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-500">Manual</p>
                  <p className="text-xl font-semibold text-slate-900">{stnCount}</p>
                  <p className="text-xs text-slate-500">MNL bilties</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Regular</p>
                  <p className="text-xl font-semibold text-slate-900">{regCount}</p>
                  <p className="text-xs text-slate-500">REG bilties</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-indigo-50/80 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600">Total</p>
                  <p className="text-xl font-semibold text-slate-900">{totalCount}</p>
                  <p className="text-xs text-slate-500">In transit</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <span className="font-semibold text-slate-900">Challan overview</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    selectedChallan.is_dispatched ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {selectedChallan.is_dispatched ? 'Dispatched' : 'Active'}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-indigo-500" />
                    <span className="font-medium text-slate-700">Truck</span>
                    <span className="text-slate-500">{selectedChallan.truck?.truck_number || 'Not assigned'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <User className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium text-slate-700">Driver</span>
                    <span className="text-slate-500">{selectedChallan.driver?.name || 'Not assigned'}</span>
                    {selectedChallan.driver?.mobile_number && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Phone className="h-3 w-3" />
                        {selectedChallan.driver.mobile_number}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                    <span className="font-medium text-slate-700">Owner</span>
                    <span className="text-slate-500">{selectedChallan.owner?.name || 'Not assigned'}</span>
                    {selectedChallan.owner?.mobile_number && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Phone className="h-3 w-3" />
                        {selectedChallan.owner.mobile_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    Created on {formatDate(selectedChallan.date)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/95 shadow-sm">
        <div className="px-3 py-3">
          <button
            onClick={onAddToTransit}
            disabled={!selectedChallan || !selectedChallanBook || selectedBiltiesCount === 0 || saving || selectedChallan?.is_dispatched}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Adding to transit…' : `Add ${selectedBiltiesCount} bilties to transit`}
          </button>

          <div className="mt-3 space-y-2 text-sm">
            {!selectedChallan && (
              <p className="flex items-center gap-2 text-rose-500">
                <X className="h-4 w-4" /> Select a challan first
              </p>
            )}
            {selectedChallan?.is_dispatched && (
              <p className="flex items-center gap-2 text-orange-500">
                <AlertTriangle className="h-4 w-4" /> Cannot add to a dispatched challan
              </p>
            )}
            {!selectedChallanBook && (
              <p className="flex items-center gap-2 text-rose-500">
                <X className="h-4 w-4" /> Select a challan book
              </p>
            )}
            {selectedBiltiesCount === 0 && (
              <p className="flex items-center gap-2 text-rose-500">
                <X className="h-4 w-4" /> Choose at least one bilty
              </p>
            )}
            {selectedChallan && !selectedChallan.is_dispatched && selectedChallanBook && selectedBiltiesCount > 0 && (
              <p className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="h-4 w-4" /> Ready to add to transit
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallanSelector;