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

  // Calculate totals for filtered bilties
  const calculateTotals = () => {
    let totalAmount = 0;
    let paidAmount = 0;
    let toPayAmount = 0;

    filteredBilties.forEach(bilty => {
      const amount = parseFloat(bilty.total || bilty.amount || 0);
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

  // Handle print with filters
  const handlePrintFiltered = () => {
    if (filteredBilties.length === 0) {
      alert('No bilties match the selected filters');
      return;
    }
    onPrintBilties(filteredBilties);
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
    <div className="fixed bottom-0 right-0 w-full md:w-2/3 lg:w-1/2 xl:w-1/3 h-2/3 bg-white shadow-2xl rounded-tl-2xl z-50 flex flex-col border-l-4 border-blue-600">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-tl-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6" />
          <div>
            <h3 className="text-lg font-bold">Selected Bilties</h3>
            <p className="text-xs text-blue-100">
              {selectedBilties.length} items selected
              {(paymentFilter !== 'all' || selectedBranches.length > 0) && 
                ` • ${filteredBilties.length} filtered`
              }
            </p>
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
            onClick={handlePrintFiltered}
            className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>
          <button
            onClick={handleDownloadCSVFiltered}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleCopyFiltered}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
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

      {/* Selected Bilties List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
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
            {filteredBilties.map((bilty, index) => (
              <div
                key={`${bilty.type}-${bilty.id}`}
                className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {bilty.type === 'regular' ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Building className="h-4 w-4 text-purple-500" />
                      )}
                      <span className="font-bold text-sm text-gray-900">{bilty.gr_no}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        bilty.type === 'regular' 
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
                        (bilty.payment_mode || bilty.payment_status) === 'paid' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {(bilty.payment_mode || bilty.payment_status || 'N/A').toUpperCase()}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(bilty.total || bilty.amount)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveBilty(bilty)}
                    className="ml-3 p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Remove bilty"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

SelectedBiltiesPanel.displayName = 'SelectedBiltiesPanel';

export default SelectedBiltiesPanel;
