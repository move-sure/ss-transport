'use client';

import React, { memo, useCallback } from 'react';
import { 
  FileText,
  MapPin,
  Package,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

const LedgerSearchTable = memo(({ 
  data = { regular: [], station: [] }, 
  loading,
  selectedBilties = [],
  onSelectBilty,
  onSelectAll,
  currentPage = 1,
  itemsPerPage = 50
}) => {
  
  // Calculate paginated data
  const allBilties = [...data.regular, ...data.station];
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = allBilties.slice(startIndex, startIndex + itemsPerPage);
  
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

  const getPaymentBadge = (bilty) => {
    const mode = bilty.payment_mode || bilty.payment_status || '';
    const colors = {
      'paid': 'bg-green-100 text-green-700',
      'to-pay': 'bg-yellow-100 text-yellow-700',
      'foc': 'bg-blue-100 text-blue-700'
    };
    return colors[mode.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const isSelected = (bilty) => {
    return selectedBilties.includes(`${bilty.type}-${bilty.id}`);
  };

  const allCurrentPageSelected = paginatedData.length > 0 && 
    paginatedData.every(bilty => isSelected(bilty));

  const handleSelectAllClick = () => {
    onSelectAll(paginatedData, allCurrentPageSelected);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-600">Searching bilties...</p>
      </div>
    );
  }

  if (allBilties.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-700 mb-1">No Results Found</h3>
        <p className="text-sm text-gray-500">Try adjusting your search filters</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Stats Bar */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Total: <strong className="text-gray-900">{allBilties.length}</strong> bilties
          </span>
          <span className="text-sm text-gray-600">
            Regular: <strong className="text-blue-600">{data.regular.length}</strong>
          </span>
          <span className="text-sm text-gray-600">
            Station: <strong className="text-purple-600">{data.station.length}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Selected: <strong className="text-green-600">{selectedBilties.length}</strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-700 text-white sticky top-0">
            <tr>
              <th className="px-3 py-2.5 text-left">
                <button 
                  onClick={handleSelectAllClick}
                  className="flex items-center gap-1 hover:text-blue-300 transition-colors"
                >
                  {allCurrentPageSelected ? (
                    <CheckSquare className="h-4 w-4 text-blue-300" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold">GR No</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold">Date</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold">Consignor</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold">Consignee</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold">City</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold">Pkgs</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold">Weight</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold">Payment</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold">Amount</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold">Pvt Marks</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold">Challan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((bilty, index) => {
              const selected = isSelected(bilty);
              const isRegular = bilty.type === 'regular';
              
              return (
                <tr 
                  key={`${bilty.type}-${bilty.id}`}
                  onClick={() => onSelectBilty(bilty)}
                  className={`cursor-pointer transition-colors ${
                    selected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 
                    index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'
                  }`}
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onSelectBilty(bilty)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                  </td>
                  
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <FileText className={`h-3.5 w-3.5 ${isRegular ? 'text-blue-500' : 'text-purple-500'}`} />
                      <div>
                        <div className="text-xs font-medium text-gray-900">{bilty.gr_no}</div>
                        <div className={`text-[10px] ${isRegular ? 'text-blue-500' : 'text-purple-500'}`}>
                          {isRegular ? 'Regular' : 'Station'}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-3 py-2 text-xs text-gray-700">
                    {formatDate(bilty.bilty_date || bilty.created_at)}
                  </td>
                  
                  <td className="px-3 py-2">
                    <div className="text-xs text-gray-900 max-w-28 truncate" title={bilty.consignor_name || bilty.consignor}>
                      {bilty.consignor_name || bilty.consignor || 'N/A'}
                    </div>
                  </td>
                  
                  <td className="px-3 py-2">
                    <div className="text-xs text-gray-900 max-w-28 truncate" title={bilty.consignee_name || bilty.consignee}>
                      {bilty.consignee_name || bilty.consignee || 'N/A'}
                    </div>
                  </td>
                  
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 text-xs text-gray-700">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="truncate max-w-20">
                        {bilty.to_city_name || bilty.station_city_name || bilty.station || 'N/A'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-3 py-2 text-center">
                    <span className="text-xs font-medium text-blue-600">
                      {bilty.no_of_pkg || bilty.packages || 0}
                    </span>
                  </td>
                  
                  <td className="px-3 py-2 text-center">
                    <span className="text-xs font-medium text-green-600">
                      {bilty.wt || bilty.weight || 0} kg
                    </span>
                  </td>
                  
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${getPaymentBadge(bilty)}`}>
                      {(bilty.payment_mode || bilty.payment_status || 'N/A').toUpperCase()}
                    </span>
                  </td>
                  
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs font-semibold text-gray-900">
                      {formatCurrency(bilty.total || bilty.grand_total || bilty.amount)}
                    </span>
                  </td>
                  
                  <td className="px-3 py-2">
                    <div className="text-xs text-gray-600 max-w-20 truncate" title={bilty.pvt_marks}>
                      {bilty.pvt_marks || '-'}
                    </div>
                  </td>
                  
                  <td className="px-3 py-2">
                    <div className="text-xs text-gray-700">
                      {bilty.challan_no || 'N/A'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

LedgerSearchTable.displayName = 'LedgerSearchTable';

export default LedgerSearchTable;
