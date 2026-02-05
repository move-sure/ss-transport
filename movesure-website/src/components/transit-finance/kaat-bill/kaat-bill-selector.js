'use client';

import React from 'react';
import { FileText, Check, Calendar, DollarSign, Package, Truck } from 'lucide-react';
import { format } from 'date-fns';

export default function KaatBillSelector({ 
  kaatBills, 
  selectedBills, 
  onToggleBill, 
  onSelectAll, 
  onDeselectAll,
  loading 
}) {
  const allSelected = kaatBills.length > 0 && selectedBills.length === kaatBills.length;
  const someSelected = selectedBills.length > 0 && selectedBills.length < kaatBills.length;

  // Calculate totals
  const totalBilties = selectedBills.reduce((sum, bill) => sum + (bill.total_bilty_count || 0), 0);
  const totalKaatAmount = selectedBills.reduce((sum, bill) => sum + parseFloat(bill.total_kaat_amount || 0), 0);

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
                Select Kaat Bills for Consolidated Print
              </h3>
              <p className="text-sm text-white/80 mt-1">
                Choose the bills you want to include in the consolidated PDF
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

        {/* Bills List */}
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {kaatBills.map((bill) => {
            const isSelected = selectedBills.some(b => b.id === bill.id);
            
            return (
              <div
                key={bill.id}
                onClick={() => onToggleBill(bill)}
                className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${
                  isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
                    isSelected 
                      ? 'bg-indigo-600 border-indigo-600' 
                      : 'border-gray-300 hover:border-indigo-400'
                  }`}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>

                  {/* Bill Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
                        {bill.challan_no}
                      </span>
                      <span className="text-gray-900 font-semibold truncate">
                        {bill.transport_name || 'Unknown Transport'}
                      </span>
                      {bill.printed_yet && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                          Printed
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{bill.created_at ? format(new Date(bill.created_at), 'dd MMM yyyy') : '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span>{bill.total_bilty_count} bilties</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{bill.transport_gst || 'No GST'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="font-bold text-green-600">₹{parseFloat(bill.total_kaat_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
