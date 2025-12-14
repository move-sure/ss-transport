'use client';

import React from 'react';
import { 
  X, 
  Trash2, 
  FileText, 
  Package,
  Download,
  Copy,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';

export default function SelectedBiltiesPanel({ 
  selectedBilties = [],
  onRemove,
  onClearAll,
  onClose,
  onDownloadCSV,
  onCopyToClipboard,
  onPrint
}) {
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yy');
    } catch (error) {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  };

  // Calculate totals
  const totals = selectedBilties.reduce((acc, bilty) => {
    acc.packages += parseInt(bilty.no_of_pkg || bilty.packages || 0);
    acc.weight += parseFloat(bilty.wt || bilty.weight || 0);
    acc.amount += parseFloat(bilty.total || bilty.grand_total || bilty.amount || 0);
    return acc;
  }, { packages: 0, weight: 0, amount: 0 });

  if (selectedBilties.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Selected Bilties</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold">{selectedBilties.length}</div>
            <div className="text-xs text-white/80">Bilties</div>
          </div>
          <div className="bg-white/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold">{totals.packages}</div>
            <div className="text-xs text-white/80">Packages</div>
          </div>
          <div className="bg-white/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold">{formatCurrency(totals.amount)}</div>
            <div className="text-xs text-white/80">Amount</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 bg-gray-50 border-b border-gray-200 flex gap-2 flex-shrink-0">
        <button
          onClick={onDownloadCSV}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="h-4 w-4" />
          CSV
        </button>
        <button
          onClick={onCopyToClipboard}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Copy className="h-4 w-4" />
          Copy
        </button>
        <button
          onClick={onPrint}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      {/* Bilties List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {selectedBilties.map((bilty) => {
          const isRegular = bilty.type === 'regular';
          
          return (
            <div 
              key={`${bilty.type}-${bilty.id}`}
              className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className={`h-4 w-4 ${isRegular ? 'text-blue-500' : 'text-purple-500'}`} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{bilty.gr_no}</div>
                    <div className={`text-xs ${isRegular ? 'text-blue-500' : 'text-purple-500'}`}>
                      {isRegular ? 'Regular' : 'Station'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onRemove(bilty)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Consignor:</span>
                  <span className="ml-1 text-gray-800 truncate block">
                    {bilty.consignor_name || bilty.consignor || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Consignee:</span>
                  <span className="ml-1 text-gray-800 truncate block">
                    {bilty.consignee_name || bilty.consignee || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">City:</span>
                  <span className="ml-1 text-gray-800">
                    {bilty.to_city_name || bilty.station_city_name || bilty.station || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Amount:</span>
                  <span className="ml-1 font-medium text-green-600">
                    {formatCurrency(bilty.total || bilty.grand_total || bilty.amount)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <button
          onClick={onClearAll}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Clear All Selected
        </button>
      </div>
    </div>
  );
}
