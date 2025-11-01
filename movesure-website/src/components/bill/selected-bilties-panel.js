'use client';

import React, { memo, useState, useEffect } from 'react';
import { X, Trash2, FileText, Building, Download, Copy, Printer, Filter } from 'lucide-react';
import { format } from 'date-fns';

const SelectedBiltiesPanel = memo(({ 
  selectedBilties = [], 
  onRemoveBilty,
  onClearAll,
  onDownloadCSV,
  onCopyToClipboard,
  onPrintBilties,
  isOpen,
  onToggle,
  branches = [],
  onFetchBranches
}) => {
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'paid', 'to-pay'
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Bill type and name selection state
  const [billType, setBillType] = useState('consignor'); // 'consignor', 'consignee', 'transport'
  const [customName, setCustomName] = useState('');
  const [removedBiltyIds, setRemovedBiltyIds] = useState(new Set());
  const [showBlockedModal, setShowBlockedModal] = useState(false);
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
        className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center space-x-2 z-40"
      >
        <FileText className="h-5 w-5" />
        <span className="font-medium">Selected ({selectedBilties.length})</span>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm backdrop-saturate-150 z-50" onClick={onToggle}></div>
      
      {/* Centered Panel - Much Bigger */}
      <div className="fixed inset-0 flex items-center justify-center z-[51] pointer-events-none">
        <div className="w-[95vw] h-[90vh] bg-white shadow-2xl rounded-2xl pointer-events-auto flex flex-col border-4 border-blue-600" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6" />
            <div>
              <h3 className="text-lg font-bold">Selected Bilties</h3>
              <p className="text-xs text-blue-100">Manage and customize your bill</p>
            </div>
          </div>
          {/* Total and Filtered Counts */}
          <div className="flex items-center space-x-4 pl-6 border-l border-blue-400">
            <div className="text-center">
              <p className="text-2xl font-bold">{selectedBilties.length}</p>
              <p className="text-xs text-blue-100">Total Selected</p>
            </div>
            {(paymentFilter !== 'all' || selectedBranches.length > 0) && (
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-300">{filteredBilties.length}</p>
                <p className="text-xs text-blue-100">Filtered</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-full transition-colors ${
              showFilters ? 'bg-blue-500' : 'hover:bg-blue-500'
            }`}
            title="Toggle filters"
          >
            <Filter className="h-5 w-5" />
          </button>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-blue-500 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
          <div className="space-y-3">
            {/* Payment Mode Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Payment Mode
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPaymentFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    paymentFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-blue-100'
                  }`}
                >
                  All ({selectedBilties.length})
                </button>
                <button
                  onClick={() => setPaymentFilter('paid')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    paymentFilter === 'paid'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-green-100'
                  }`}
                >
                  Paid ({selectedBilties.filter(b => (b.payment_mode || b.payment_status || '').toLowerCase() === 'paid').length})
                </button>
                <button
                  onClick={() => setPaymentFilter('to-pay')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    paymentFilter === 'to-pay'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-yellow-100'
                  }`}
                >
                  To Pay ({selectedBilties.filter(b => (b.payment_mode || b.payment_status || '').toLowerCase() === 'to-pay').length})
                </button>
              </div>
            </div>

            {/* Branch Filter */}
            {availableBranches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Filter by Branch
                  </label>
                  <button
                    onClick={handleSelectAllBranches}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {selectedBranches.length === availableBranches.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableBranches.map(branch => (
                    <button
                      key={branch.id}
                      onClick={() => handleBranchToggle(branch.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        selectedBranches.includes(branch.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
                      }`}
                    >
                      {branch.branch_name || branch.branch_code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {(paymentFilter !== 'all' || selectedBranches.length > 0) && (
              <button
                onClick={() => {
                  setPaymentFilter('all');
                  setSelectedBranches([]);
                }}
                className="w-full px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Totals Summary */}
      {filteredBilties.length > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-600 font-medium">Total Amount</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(totals.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium">Paid</p>
              <p className="text-sm font-bold text-green-700">{formatCurrency(totals.paidAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-yellow-600 font-medium">To Pay</p>
              <p className="text-sm font-bold text-yellow-700">{formatCurrency(totals.toPayAmount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {filteredBilties.length > 0 && (
        <div className="px-6 py-3 border-b border-gray-200 bg-white flex flex-wrap gap-2">
          <button
            onClick={handleBlockedAction}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors text-sm cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleBlockedAction}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors text-sm cursor-not-allowed"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy</span>
          </button>
          <button
            onClick={onClearAll}
            className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm ml-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      )}

      {/* Main Content Area - Two Columns */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column - Selected Bilties List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 border-r border-gray-200">
          {filteredBilties.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FileText className="h-16 w-16 mb-3" />
              <p className="text-sm font-medium">
                {selectedBilties.length === 0 ? 'No bilties selected' : 'No bilties match the filters'}
              </p>
              <p className="text-xs mt-1">
                {selectedBilties.length === 0 
                  ? 'Search and select bilties to add them here'
                  : 'Try adjusting your filters'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBilties.map((bilty, index) => {
                const biltyKey = `${bilty.type}-${bilty.id}`;
                const isDeleted = removedBiltyIds.has(biltyKey);
                
                return (
              <div
                key={biltyKey}
                className={`relative border rounded-lg p-3 transition-all duration-300 ${
                  isDeleted 
                    ? 'border-red-500 bg-red-50 opacity-60' 
                    : 'bg-white border-gray-200 hover:shadow-md'
                }`}
              >
                {/* Deleted Overlay */}
                {isDeleted && (
                  <>
                    <div className="absolute inset-0 bg-red-500 opacity-10 rounded-lg pointer-events-none"></div>
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10">
                      DELETED
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-0.5 bg-red-500 transform rotate-0"></div>
                    </div>
                  </>
                )}
                
                <div className={`flex items-start justify-between relative ${isDeleted ? 'line-through' : ''}`}>
                  {/* Index Number */}
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                      isDeleted 
                        ? 'bg-gray-400 text-white' 
                        : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {bilty.type === 'regular' ? (
                          <FileText className={`h-4 w-4 ${isDeleted ? 'text-gray-400' : 'text-blue-500'}`} />
                        ) : (
                          <Building className={`h-4 w-4 ${isDeleted ? 'text-gray-400' : 'text-purple-500'}`} />
                        )}
                        <span className={`font-bold text-sm ${isDeleted ? 'text-gray-500' : 'text-gray-900'}`}>{bilty.gr_no}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isDeleted 
                            ? 'bg-gray-200 text-gray-500'
                            : bilty.type === 'regular' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                        }`}>
                          {bilty.type === 'regular' ? 'Regular' : 'Station'}
                        </span>
                      </div>
                    
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">From:</span>{' '}
                          {bilty.consignor_name || bilty.consignor || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">To:</span>{' '}
                          {bilty.consignee_name || bilty.consignee || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">City:</span>{' '}
                          {bilty.to_city_name || bilty.station || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span>{' '}
                          {formatDate(bilty.bilty_date || bilty.created_at)}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          isDeleted
                            ? 'bg-gray-200 text-gray-500'
                            : (bilty.payment_mode || bilty.payment_status) === 'paid' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {(bilty.payment_mode || bilty.payment_status || 'N/A').toUpperCase()}
                        </span>
                        {/* Editable Amount Input */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-500">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={getEffectiveAmount(bilty)}
                            onChange={(e) => handleAmountChange(bilty, e.target.value)}
                            disabled={isDeleted}
                            className={`w-24 px-2 py-1 text-sm font-bold text-right border-2 rounded-md transition-all focus:outline-none focus:ring-2 ${
                              isDeleted 
                                ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                                : amountOverrides[`${bilty.type}-${bilty.id}`] !== undefined
                                  ? 'border-orange-400 bg-orange-50 text-orange-700 focus:ring-orange-300'
                                  : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-300'
                            }`}
                            title={isDeleted ? 'Cannot edit deleted bilty' : 'Click to edit amount for printing (temporary)'}
                          />
                          {amountOverrides[`${bilty.type}-${bilty.id}`] !== undefined && !isDeleted && (
                            <button
                              onClick={() => {
                                const biltyKey = `${bilty.type}-${bilty.id}`;
                                setAmountOverrides(prev => {
                                  const newOverrides = { ...prev };
                                  delete newOverrides[biltyKey];
                                  return newOverrides;
                                });
                              }}
                              className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                              title="Reset to original amount"
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
                    className={`ml-3 p-1.5 rounded-full transition-colors ${
                      isDeleted 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-red-500 hover:bg-red-50'
                    }`}
                    title={isDeleted ? 'Already deleted' : 'Remove bilty'}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
                );
              })}
          </div>
        )}
        </div>

        {/* Right Column - Bill Options */}
        <div className="w-[400px] bg-gradient-to-br from-purple-50 to-indigo-50 p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-200">
            {/* Bill Options Header */}
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-purple-200">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl">
                <Printer className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Bill Options</h3>
                <p className="text-xs text-gray-500">Customize your bill before printing</p>
              </div>
            </div>

            {/* Print Template Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Print Template
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPrintTemplate('portrait')}
                  className={`p-4 border-2 rounded-xl transition-all hover:shadow-md ${
                    printTemplate === 'portrait' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-center">
                    <div className={`mx-auto w-12 h-16 border-2 rounded mb-2 ${
                      printTemplate === 'portrait' ? 'border-blue-500' : 'border-gray-400'
                    }`}></div>
                    <span className="text-xs font-semibold text-gray-900">Portrait</span>
                    <p className="text-[10px] text-gray-500 mt-1">Standard</p>
                  </div>
                </button>
                <button
                  onClick={() => setPrintTemplate('landscape')}
                  className={`p-4 border-2 rounded-xl transition-all hover:shadow-md ${
                    printTemplate === 'landscape' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-center">
                    <div className={`mx-auto w-16 h-12 border-2 rounded mb-2 ${
                      printTemplate === 'landscape' ? 'border-blue-500' : 'border-gray-400'
                    }`}></div>
                    <span className="text-xs font-semibold text-gray-900">Landscape</span>
                    <p className="text-[10px] text-gray-500 mt-1">+ Consignor</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Bill Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Bill Type
              </label>
              <div className="space-y-3">
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${billType === 'consignor' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                  <input
                    type="radio"
                    name="billType"
                    value="consignor"
                    checked={billType === 'consignor'}
                    onChange={(e) => setBillType(e.target.value)}
                    className="w-5 h-5 text-purple-600 focus:ring-purple-500 focus:ring-2"
                  />
                  <span className="ml-3 text-sm font-semibold text-gray-900">Consignor Bill</span>
                </label>
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${billType === 'consignee' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                  <input
                    type="radio"
                    name="billType"
                    value="consignee"
                    checked={billType === 'consignee'}
                    onChange={(e) => setBillType(e.target.value)}
                    className="w-5 h-5 text-purple-600 focus:ring-purple-500 focus:ring-2"
                  />
                  <span className="ml-3 text-sm font-semibold text-gray-900">Consignee Bill</span>
                </label>
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${billType === 'transport' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                  <input
                    type="radio"
                    name="billType"
                    value="transport"
                    checked={billType === 'transport'}
                    onChange={(e) => setBillType(e.target.value)}
                    className="w-5 h-5 text-purple-600 focus:ring-purple-500 focus:ring-2"
                  />
                  <span className="ml-3 text-sm font-semibold text-gray-900">Transport Bill</span>
                </label>
              </div>
            </div>

            {/* Custom Name Input */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Custom Name (Optional)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter custom name for the bill"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm font-medium"
              />
              <p className="mt-2 text-xs text-gray-500">
                Leave empty to use default name from bill type
              </p>
            </div>

            {/* Print Button */}
            <button
              onClick={handleConfirmPrint}
              disabled={filteredBilties.length === 0}
              className="w-full py-4 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Printer className="h-5 w-5" />
              <span>Print Bill Now</span>
            </button>
          </div>
        </div>
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
