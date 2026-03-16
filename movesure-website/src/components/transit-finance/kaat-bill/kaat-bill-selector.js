'use client';

import React, { useState } from 'react';
import { FileText, Check, Calendar, DollarSign, Package, Truck, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function KaatBillSelector({ 
  kaatBills, 
  groupedBillsByChallan = [],
  challanDetailsMap = {},
  selectedBills, 
  onToggleBill, 
  onSelectAll, 
  onDeselectAll,
  loading 
}) {
  const [collapsedChallans, setCollapsedChallans] = useState({});
  const allSelected = kaatBills.length > 0 && selectedBills.length === kaatBills.length;

  // Calculate totals
  const totalBilties = selectedBills.reduce((sum, bill) => sum + (bill.total_bilty_count || 0), 0);
  const totalKaatAmount = selectedBills.reduce((sum, bill) => sum + parseFloat(bill.total_kaat_amount || 0), 0);

  const toggleChallanCollapse = (challan) => {
    setCollapsedChallans(prev => ({ ...prev, [challan]: !prev[challan] }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-600 mt-4 font-medium">Loading kaat bills...</p>
      </div>
    );
  }

  if (kaatBills.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-700 mb-2">No Kaat Bills Found</h3>
        <p className="text-gray-500">
          Create kaat bills from the Transit Finance page first
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selection Header */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Select Kaat Bills — Grouped by Challan
              </h3>
              <p className="text-sm text-white/80 mt-1">
                {groupedBillsByChallan.length} challans, {kaatBills.length} total bills
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onSelectAll}
                disabled={allSelected}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              >
                Select All ({kaatBills.length})
              </button>
              <button
                onClick={onDeselectAll}
                disabled={selectedBills.length === 0}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>

        {/* Selection Stats */}
        {selectedBills.length > 0 && (
          <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <span className="text-indigo-700 font-semibold">
                  {selectedBills.length} of {kaatBills.length} bills selected
                </span>
                <span className="text-gray-600">
                  <Package className="w-4 h-4 inline mr-1" />
                  {totalBilties} bilties
                </span>
              </div>
              <span className="text-green-600 font-bold text-lg">
                ₹{totalKaatAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Grouped Bills List */}
        <div className="max-h-[600px] overflow-y-auto">
          {groupedBillsByChallan.map(([challanNo, bills]) => {
            const challanDetail = challanDetailsMap[challanNo];
            const dispatchDate = challanDetail?.dispatch_date || challanDetail?.date;
            const isCollapsed = collapsedChallans[challanNo];
            const challanSelectedCount = bills.filter(b => selectedBills.some(sb => sb.id === b.id)).length;
            const challanTotalAmount = bills.reduce((s, b) => s + parseFloat(b.total_kaat_amount || 0), 0);
            const challanTotalBilties = bills.reduce((s, b) => s + (b.total_bilty_count || 0), 0);

            return (
              <div key={challanNo} className="border-b-2 border-indigo-100 last:border-b-0">
                {/* Challan Header */}
                <div
                  onClick={() => toggleChallanCollapse(challanNo)}
                  className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-colors sticky top-0 z-10"
                >
                  <div className="flex items-center gap-3">
                    {isCollapsed
                      ? <ChevronRight className="w-5 h-5 text-indigo-500" />
                      : <ChevronDown className="w-5 h-5 text-indigo-500" />
                    }
                    <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-bold tracking-wide">
                      Challan {challanNo}
                    </span>
                    {dispatchDate && (
                      <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        Dispatch: {format(new Date(dispatchDate), 'dd MMM yyyy')}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 font-medium">
                      {bills.length} bill{bills.length !== 1 ? 's' : ''} • {challanTotalBilties} bilties
                    </span>
                    {challanSelectedCount > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                        {challanSelectedCount} selected
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-green-600 text-sm">
                    ₹{challanTotalAmount.toFixed(2)}
                  </span>
                </div>

                {/* Bills under this challan */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {bills.map((bill) => {
                      const isSelected = selectedBills.some(b => b.id === bill.id);

                      return (
                        <div
                          key={bill.id}
                          onClick={() => onToggleBill(bill)}
                          className={`px-4 py-3 pl-12 cursor-pointer transition-all hover:bg-gray-50 ${
                            isSelected ? 'bg-indigo-50/60 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Checkbox */}
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected 
                                ? 'bg-indigo-600 border-indigo-600' 
                                : 'border-gray-300 hover:border-indigo-400'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>

                            {/* Bill Details */}
                            <div className="flex-1 min-w-0 flex items-center gap-4 flex-wrap">
                              <span className="text-gray-900 font-semibold truncate text-sm">
                                {bill.transport_name || 'Unknown Transport'}
                              </span>
                              {bill.printed_yet && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                                  Printed
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Truck className="w-3.5 h-3.5" />
                                {bill.transport_gst || 'No GST'}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Package className="w-3.5 h-3.5" />
                                {bill.total_bilty_count} bilties
                              </span>
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="w-3.5 h-3.5" />
                                {bill.created_at ? format(new Date(bill.created_at), 'dd MMM yy') : '-'}
                              </span>
                            </div>

                            <span className="font-bold text-green-600 text-sm whitespace-nowrap">
                              ₹{parseFloat(bill.total_kaat_amount || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
