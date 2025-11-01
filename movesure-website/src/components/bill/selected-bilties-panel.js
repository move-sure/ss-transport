'use client';

import React, { memo, useState, useEffect } from 'react';
import { X, Trash2, FileText, Building, Download, Copy, Filter } from 'lucide-react';
import { format } from 'date-fns';
import supabase from '@/app/utils/supabase';
import { useAuth } from '@/app/utils/auth';
import BillOptions from './selected-bilties-panel/BillOptions';

const SelectedBiltiesPanel = memo(({ 
  selectedBilties = [], 
  onRemoveBilty,
  onClearAll,
  onDownloadCSV,
  onCopyToClipboard,
  onPrintBilties,
  onSaveAndPrint,
  isOpen,
  onToggle,
  branches = [],
  onFetchBranches
}) => {
  const { user } = useAuth();
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'paid', 'to-pay'
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Bill type and name selection state
  const [billType, setBillType] = useState('consignor'); // 'consignor', 'consignee', 'transport'
  const [customName, setCustomName] = useState('');
  const [removedBiltyIds, setRemovedBiltyIds] = useState(new Set());
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Temporary amount overrides for printing only
  const [amountOverrides, setAmountOverrides] = useState({});
  // Print template selection
  const [printTemplate, setPrintTemplate] = useState('portrait'); // 'portrait' or 'landscape'

  // Fetch branches on mount
  useEffect(() => {
    if (isOpen && onFetchBranches) {
      onFetchBranches();
    }
  }, [isOpen, onFetchBranches]);

  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (error) {
      return 'N/A';
    }
  };

  // Filter bilties based on payment mode and branches
  const getFilteredBilties = () => {
    let filtered = [...selectedBilties];

    // Filter by payment mode
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(bilty => {
        const payment = (bilty.payment_mode || bilty.payment_status || '').toLowerCase();
        return payment === paymentFilter;
      });
    }

    // Filter by branches
    if (selectedBranches.length > 0) {
      filtered = filtered.filter(bilty => {
        return selectedBranches.includes(bilty.branch_id);
      });
    }

    return filtered;
  };

  const filteredBilties = getFilteredBilties();

  // Get effective amount (override or original)
  const getEffectiveAmount = (bilty) => {
    const biltyKey = `${bilty.type}-${bilty.id}`;
    return amountOverrides[biltyKey] !== undefined 
      ? parseFloat(amountOverrides[biltyKey]) 
      : parseFloat(bilty.total || bilty.amount || 0);
  };

  // Handle amount change
  const handleAmountChange = (bilty, newAmount) => {
    const biltyKey = `${bilty.type}-${bilty.id}`;
    setAmountOverrides(prev => ({
      ...prev,
      [biltyKey]: newAmount
    }));
  };

  // Calculate totals for filtered bilties (using overridden amounts)
  const calculateTotals = () => {
    let totalAmount = 0;
    let paidAmount = 0;
    let toPayAmount = 0;

    filteredBilties.forEach(bilty => {
      const amount = getEffectiveAmount(bilty);
      totalAmount += amount;
      
      const paymentStatus = bilty.payment_mode || bilty.payment_status || '';
      
      if (paymentStatus.toLowerCase() === 'paid') {
        paidAmount += amount;
      } else if (paymentStatus.toLowerCase() === 'to-pay') {
        toPayAmount += amount;
      }
    });

    return { totalAmount, paidAmount, toPayAmount };
  };

  const totals = calculateTotals();

  // Get unique branches from selected bilties
  const getUniqueBranches = () => {
    const branchIds = [...new Set(selectedBilties.map(b => b.branch_id).filter(Boolean))];
    return branches.filter(branch => branchIds.includes(branch.id));
  };

  const availableBranches = getUniqueBranches();

  // Handle branch selection
  const handleBranchToggle = (branchId) => {
    setSelectedBranches(prev => {
      if (prev.includes(branchId)) {
        return prev.filter(id => id !== branchId);
      } else {
        return [...prev, branchId];
      }
    });
  };

  const handleSelectAllBranches = () => {
    if (selectedBranches.length === availableBranches.length) {
      setSelectedBranches([]);
    } else {
      setSelectedBranches(availableBranches.map(b => b.id));
    }
  };

  // Handle remove bilty - keep in UI but mark as deleted
  const handleRemoveBiltyWithAnimation = (bilty) => {
    const biltyKey = `${bilty.type}-${bilty.id}`;
    setRemovedBiltyIds(prev => new Set([...prev, biltyKey]));
    // Actually remove from parent after delay
    setTimeout(() => {
      onRemoveBilty(bilty);
    }, 3000);
  };

  // Handle blocked actions
  const handleBlockedAction = () => {
    setShowBlockedModal(true);
  };

  // Handle confirm print with bill options (directly from panel)
  const handleConfirmPrint = () => {
    if (filteredBilties.length === 0) {
      alert('No bilties match the selected filters');
      return;
    }
    // Apply amount overrides to bilties before printing
    const biltiesWithOverrides = filteredBilties.map(bilty => {
      const biltyKey = `${bilty.type}-${bilty.id}`;
      if (amountOverrides[biltyKey] !== undefined) {
        return {
          ...bilty,
          total: amountOverrides[biltyKey],
          amount: amountOverrides[biltyKey]
        };
      }
      return bilty;
    });
    onPrintBilties(biltiesWithOverrides, { billType, customName, printTemplate });
  };

  // Handle save and print
  const handleSaveAndPrintClick = () => {
    if (filteredBilties.length === 0) {
      alert('No bilties match the selected filters');
      return;
    }
    // Apply amount overrides to bilties before saving
    const biltiesWithOverrides = filteredBilties.map(bilty => {
      const biltyKey = `${bilty.type}-${bilty.id}`;
      if (amountOverrides[biltyKey] !== undefined) {
        return {
          ...bilty,
          total: amountOverrides[biltyKey],
          amount: amountOverrides[biltyKey]
        };
      }
      return bilty;
    });
    
    if (onSaveAndPrint) {
      onSaveAndPrint(biltiesWithOverrides, { billType, customName, printTemplate }, setIsSaving);
    }
  };

  // Handle download CSV with filters
  const handleDownloadCSVFiltered = () => {
    if (filteredBilties.length === 0) {
      alert('No bilties match the selected filters');
      return;
    }
    onDownloadCSV(filteredBilties);
  };

  // Handle copy with filters
  const handleCopyFiltered = () => {
    if (filteredBilties.length === 0) {
      alert('No bilties match the selected filters');
      return;
    }
    onCopyToClipboard(filteredBilties);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition hover:from-blue-500 hover:to-blue-500 z-40"
      >
        <FileText className="h-5 w-5" />
        <span>Selected ({selectedBilties.length})</span>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
  <div className="fixed inset-0 bg-blue-950/10 backdrop-blur-sm backdrop-saturate-150 z-50" onClick={onToggle}></div>
      
      {/* Selected bilties panel */}
      <div className="fixed inset-0 z-[51] flex items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto flex h-[96vh] w-[96vw] max-w-[1400px] flex-col overflow-hidden rounded-[32px] border border-blue-100 bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between border-b border-blue-100 px-7 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Selected bilties</h3>
                <p className="text-sm text-blue-500/80">Review consignments before generating a bill.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <span>{selectedBilties.length}</span>
                <span className="uppercase tracking-wide text-blue-400">total</span>
              </div>
              {(paymentFilter !== 'all' || selectedBranches.length > 0) && (
                <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <span>{filteredBilties.length}</span>
                  <span className="uppercase tracking-wide text-blue-400">filtered</span>
                </div>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 text-blue-500 transition hover:border-blue-400 hover:text-blue-700 ${showFilters ? 'bg-blue-50' : 'bg-white'}`}
                title="Toggle filters"
              >
                <Filter className="h-4 w-4" />
              </button>
              <button
                onClick={onToggle}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 text-blue-500 transition hover:border-blue-400 hover:text-blue-700"
                title="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {showFilters && (
            <section className="border-b border-blue-100 bg-blue-50/60 px-7 py-4">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Payment mode</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => setPaymentFilter('all')}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        paymentFilter === 'all'
                          ? 'border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/30'
                          : 'border-blue-100 bg-white text-blue-600 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      All ({selectedBilties.length})
                    </button>
                    <button
                      onClick={() => setPaymentFilter('paid')}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        paymentFilter === 'paid'
                          ? 'border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/30'
                          : 'border-blue-100 bg-white text-blue-600 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      Paid ({selectedBilties.filter(b => (b.payment_mode || b.payment_status || '').toLowerCase() === 'paid').length})
                    </button>
                    <button
                      onClick={() => setPaymentFilter('to-pay')}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        paymentFilter === 'to-pay'
                          ? 'border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/30'
                          : 'border-blue-100 bg-white text-blue-600 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      To pay ({selectedBilties.filter(b => (b.payment_mode || b.payment_status || '').toLowerCase() === 'to-pay').length})
                    </button>
                  </div>
                </div>

                {availableBranches.length > 0 && (
                  <div className="lg:w-1/2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Branches</p>
                      <button
                        onClick={handleSelectAllBranches}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        {selectedBranches.length === availableBranches.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availableBranches.map(branch => (
                        <button
                          key={branch.id}
                          onClick={() => handleBranchToggle(branch.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            selectedBranches.includes(branch.id)
                              ? 'border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/30'
                              : 'border-blue-100 bg-white text-blue-600 hover:border-blue-300 hover:text-blue-700'
                          }`}
                        >
                          {branch.branch_name || branch.branch_code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {(paymentFilter !== 'all' || selectedBranches.length > 0) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setPaymentFilter('all');
                      setSelectedBranches([]);
                    }}
                    className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:border-blue-300 hover:text-blue-800"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </section>
          )}

          {filteredBilties.length > 0 && (
            <section className="border-b border-blue-100 bg-blue-50/60 px-7 py-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-center shadow-sm shadow-blue-100/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Total amount</p>
                  <p className="mt-1 text-sm font-semibold text-blue-900">{formatCurrency(totals.totalAmount)}</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-center shadow-sm shadow-blue-100/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Paid</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">{formatCurrency(totals.paidAmount)}</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-center shadow-sm shadow-blue-100/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">To pay</p>
                  <p className="mt-1 text-sm font-semibold text-amber-700">{formatCurrency(totals.toPayAmount)}</p>
                </div>
              </div>
            </section>
          )}

          {filteredBilties.length > 0 && (
            <section className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-white px-7 py-3 text-xs font-semibold text-blue-600">
              <button
                onClick={handleBlockedAction}
                className="flex items-center gap-2 rounded-full border border-blue-100 px-3 py-1.5 transition hover:border-blue-200 hover:text-blue-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV export</span>
              </button>
              <button
                onClick={handleBlockedAction}
                className="flex items-center gap-2 rounded-full border border-blue-100 px-3 py-1.5 transition hover:border-blue-200 hover:text-blue-800"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy table</span>
              </button>
              <button
                onClick={onClearAll}
                className="ml-auto flex items-center gap-2 rounded-full border border-red-200 px-3 py-1.5 text-red-600 transition hover:border-red-300 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear all</span>
              </button>
            </section>
          )}

          <div className="flex flex-1 overflow-hidden">
            <section className="flex-1 overflow-y-auto px-7 py-5">
              {filteredBilties.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-blue-400">
                  <FileText className="h-12 w-12" />
                  <p className="text-sm font-medium text-blue-700">
                    {selectedBilties.length === 0 ? 'No bilties selected yet.' : 'No bilties match the current filters.'}
                  </p>
                  <p className="text-xs text-blue-500">
                    {selectedBilties.length === 0 ? 'Search and add bilties to start building a statement.' : 'Adjust the filters to widen your selection.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBilties.map((bilty, index) => {
                    const biltyKey = `${bilty.type}-${bilty.id}`;
                    const isDeleted = removedBiltyIds.has(biltyKey);
                    const paymentLabel = (bilty.payment_mode || bilty.payment_status || 'N/A').toUpperCase();

                    return (
                      <div
                        key={biltyKey}
                        className={`relative rounded-2xl border bg-white/95 p-5 transition ${
                          isDeleted
                            ? 'border-red-200 bg-red-50/80 opacity-70'
                            : 'border-blue-100 shadow-sm shadow-blue-100/40 hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        {isDeleted && (
                          <span className="absolute right-4 top-4 text-[11px] font-semibold uppercase tracking-wide text-red-600">
                            Removing...
                          </span>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-1 items-start gap-3">
                            <div className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${
                              isDeleted ? 'bg-blue-200' : 'bg-gradient-to-br from-blue-600 to-blue-500 shadow-inner shadow-blue-700/30'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                {bilty.type === 'regular' ? (
                                  <FileText className={`h-4 w-4 ${isDeleted ? 'text-blue-200' : 'text-blue-500'}`} />
                                ) : (
                                  <Building className={`h-4 w-4 ${isDeleted ? 'text-blue-200' : 'text-blue-500'}`} />
                                )}
                                <span className="text-sm font-semibold text-blue-900">{bilty.gr_no || 'N/A'}</span>
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                                  {bilty.type === 'regular' ? 'Regular' : 'Station'}
                                </span>
                              </div>
                              <div className="grid gap-2 text-xs text-blue-500/80 sm:grid-cols-2">
                                <div>
                                  <span className="font-semibold text-blue-700">From:&nbsp;</span>
                                  <span className="text-blue-900">{bilty.consignor_name || bilty.consignor || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-blue-700">To:&nbsp;</span>
                                  <span className="text-blue-900">{bilty.consignee_name || bilty.consignee || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-blue-700">City:&nbsp;</span>
                                  <span className="text-blue-900">{bilty.to_city_name || bilty.station_city_name || bilty.station || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-blue-700">Date:&nbsp;</span>
                                  <span className="text-blue-900">{formatDate(bilty.bilty_date || bilty.created_at)}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-blue-700">Packages:&nbsp;</span>
                                  <span className="text-blue-900">{bilty.no_of_pkg || bilty.no_of_packets || 0}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-blue-700">Weight:&nbsp;</span>
                                  <span className="text-blue-900">{bilty.wt || bilty.weight || 0} kg</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                  isDeleted
                                    ? 'bg-slate-200 text-slate-500'
                                    : paymentLabel === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                }`}
                                >
                                  {paymentLabel}
                                </span>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs font-semibold text-blue-500" htmlFor={`amount-${biltyKey}`}>
                                    Amount
                                  </label>
                                  <input
                                    id={`amount-${biltyKey}`}
                                    type="number"
                                    step="0.01"
                                    value={getEffectiveAmount(bilty)}
                                    onChange={(e) => handleAmountChange(bilty, e.target.value)}
                                    disabled={isDeleted}
                                    className={`w-24 rounded-md border px-2 py-1 text-right text-sm font-semibold transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                                      isDeleted
                                        ? 'border-blue-100 bg-blue-50 text-blue-300'
                                        : amountOverrides[biltyKey] !== undefined
                                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                                          : 'border-blue-100 bg-white text-blue-900'
                                    }`}
                                    title={isDeleted ? 'Cannot edit deleted bilty' : 'Temporary override for this bill only'}
                                  />
                                  {amountOverrides[biltyKey] !== undefined && !isDeleted && (
                                    <button
                                      onClick={() => {
                                        setAmountOverrides(prev => {
                                          const next = { ...prev };
                                          delete next[biltyKey];
                                          return next;
                                        });
                                      }}
                                      className="text-[11px] font-semibold text-blue-500 hover:text-blue-800"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveBiltyWithAnimation(bilty)}
                            disabled={isDeleted}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border text-blue-400 transition hover:text-red-600 ${
                              isDeleted ? 'cursor-not-allowed border-blue-100 text-blue-200' : 'border-blue-100 hover:border-red-200'
                            }`}
                            title={isDeleted ? 'Already removed' : 'Remove from selection'}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <BillOptions
              billType={billType}
              setBillType={setBillType}
              customName={customName}
              setCustomName={setCustomName}
              printTemplate={printTemplate}
              setPrintTemplate={setPrintTemplate}
              onPrint={handleConfirmPrint}
              onSaveAndPrint={handleSaveAndPrintClick}
              disabled={filteredBilties.length === 0}
              isSaving={isSaving}
            />
          </div>
        </div>
      </div>

      {/* Blocked Feature Modal */}
      {showBlockedModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md backdrop-saturate-150 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border-4 border-red-500">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-full">
                  <X className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Feature Blocked</h3>
                  <p className="text-xs text-red-100">This action is temporarily disabled</p>
                </div>
              </div>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="p-2 hover:bg-red-500 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-4">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  Contact EKLAVYA SINGH to enable this feature
                </p>
                <p className="text-xs text-red-700">
                  CSV download and copy features are currently disabled. Please use the print option to generate bills.
                </p>
              </div>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg hover:from-red-700 hover:to-red-800 transition-all"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

SelectedBiltiesPanel.displayName = 'SelectedBiltiesPanel';

export default SelectedBiltiesPanel;
