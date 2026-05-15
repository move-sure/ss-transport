'use client';

import React from 'react';
import { CreditCard, TrendingUp } from 'lucide-react';

export default function PaymentStatus({ paymentStatus, advanceAmount, remainingAmount, totalAmount, notes }) {
  const statusColors = {
    PENDING: 'bg-red-50 border-red-200 text-red-700',
    PARTIAL: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    PAID: 'bg-green-50 border-green-200 text-green-700',
    FOC: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  const statusBgColor = statusColors[paymentStatus] || statusColors.PENDING;
  const paidPercentage = totalAmount > 0 ? ((advanceAmount / totalAmount) * 100) : 0;

  // Light green background if notes is "All Paid"
  const cardBgColor = notes === 'All Paid' ? 'bg-green-50' : 'bg-gray-50';
  const cardBorderColor = notes === 'All Paid' ? 'border-green-200' : 'border-gray-200';

  return (
    <div className={`p-2.5 rounded-lg border ${cardBgColor} ${cardBorderColor}`}>
      {/* Status Badge */}
      <div className={`p-1.5 rounded border mb-2 text-xs ${statusBgColor}`}>
        <div className="font-semibold text-black">{paymentStatus}</div>
      </div>

      {/* Amount Details */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-black font-semibold">Total:</span>
          <span className="font-bold text-black">₹{(totalAmount || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black font-semibold">Advance:</span>
          <span className="font-bold text-green-700">₹{(advanceAmount || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black font-semibold">Remaining:</span>
          <span className="font-bold text-red-700">₹{(remainingAmount || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-xs font-bold text-black">{paidPercentage.toFixed(0)}% Paid</span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-green-600 h-full transition-all duration-300"
            style={{ width: `${Math.min(paidPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Notes Section */}
      {notes && (
        <div className="mt-2 pt-2 border-t border-gray-300">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-black">Notes:</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              notes === 'All Paid'
                ? 'bg-green-200 text-green-800'
                : 'bg-yellow-200 text-yellow-800'
            }`}>
              {notes}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
