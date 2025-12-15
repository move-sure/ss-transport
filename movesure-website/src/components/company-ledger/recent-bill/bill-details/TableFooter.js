'use client';

import React from 'react';

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
};

export default function TableFooter({ totals, itemCount }) {
  return (
    <div className="bg-slate-100 border-t border-gray-200 px-3 py-2.5 flex-shrink-0">
      <div className="flex items-center justify-end gap-6 text-sm">
        <span className="text-gray-600 font-medium">Total ({itemCount} items):</span>
        <span className="font-bold text-blue-600">{totals.pkgs} Pkgs</span>
        <span className="font-bold text-teal-600">{totals.weight.toFixed(1)} kg</span>
        <span className="font-medium text-gray-700">Freight: {formatCurrency(totals.freight)}</span>
        <span className="font-medium text-gray-700">Labour: {formatCurrency(totals.labour)}</span>
        <span className="font-bold text-green-700 text-base">{formatCurrency(totals.amount)}</span>
      </div>
    </div>
  );
}
