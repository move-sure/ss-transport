'use client';

import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Search, TrendingUp, TrendingDown, DollarSign, Calendar, FileText } from 'lucide-react';

export default function ChallanExpenseList({
  expenses,
  loading,
  onEditExpense,
  onDeleteExpense
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = expenses.filter(expense =>
      expense.challan_no?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'created_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [expenses, searchTerm, sortField, sortOrder]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const calculateTotalExpenses = (expense) => {
    return (
      parseFloat(expense.loading_labour || 0) +
      parseFloat(expense.unloading_labour || 0) +
      parseFloat(expense.driver_expense || 0) +
      parseFloat(expense.cell_tax || 0) +
      parseFloat(expense.grease || 0) +
      parseFloat(expense.uncle_g || 0) +
      parseFloat(expense.cc_other || 0) +
      parseFloat(expense.diesel || 0) +
      parseFloat(expense.crossing || 0)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by challan number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-semibold">Total Records</p>
              <p className="text-2xl font-bold text-blue-900">{filteredAndSortedExpenses.length}</p>
            </div>
            <FileText size={32} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-semibold">Total Profit</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(filteredAndSortedExpenses.reduce((sum, exp) => sum + parseFloat(exp.total_profit || 0), 0))}
              </p>
            </div>
            <TrendingUp size={32} className="text-green-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border-2 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-semibold">Total Expenses</p>
              <p className="text-2xl font-bold text-red-900">
                {formatCurrency(filteredAndSortedExpenses.reduce((sum, exp) => sum + calculateTotalExpenses(exp), 0))}
              </p>
            </div>
            <TrendingDown size={32} className="text-red-500" />
          </div>
        </div>
      </div>

      {/* Expense Cards */}
      {filteredAndSortedExpenses.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg font-semibold">No expenses found</p>
          <p className="text-gray-400 text-sm">Start by adding a new challan expense</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedExpenses.map((expense) => {
            const totalExpenses = calculateTotalExpenses(expense);
            
            return (
              <div
                key={expense.id}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left Section - Challan Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-indigo-100 p-2 rounded-lg">
                        <FileText size={20} className="text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{expense.challan_no}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(expense.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Expense Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                      {expense.loading_labour > 0 && (
                        <div className="bg-gray-50 px-2 py-1 rounded">
                          <span className="text-gray-600">Loading:</span>
                          <span className="font-semibold text-gray-800 ml-1">₹{expense.loading_labour}</span>
                        </div>
                      )}
                      {expense.unloading_labour > 0 && (
                        <div className="bg-gray-50 px-2 py-1 rounded">
                          <span className="text-gray-600">Unloading:</span>
                          <span className="font-semibold text-gray-800 ml-1">₹{expense.unloading_labour}</span>
                        </div>
                      )}
                      {expense.driver_expense > 0 && (
                        <div className="bg-gray-50 px-2 py-1 rounded">
                          <span className="text-gray-600">Driver:</span>
                          <span className="font-semibold text-gray-800 ml-1">₹{expense.driver_expense}</span>
                        </div>
                      )}
                      {expense.diesel > 0 && (
                        <div className="bg-gray-50 px-2 py-1 rounded">
                          <span className="text-gray-600">Diesel:</span>
                          <span className="font-semibold text-gray-800 ml-1">₹{expense.diesel}</span>
                        </div>
                      )}
                      {expense.grease > 0 && (
                        <div className="bg-gray-50 px-2 py-1 rounded">
                          <span className="text-gray-600">Grease:</span>
                          <span className="font-semibold text-gray-800 ml-1">₹{expense.grease}</span>
                        </div>
                      )}
                      {expense.uncle_g > 0 && (
                        <div className="bg-gray-50 px-2 py-1 rounded">
                          <span className="text-gray-600">Uncle G:</span>
                          <span className="font-semibold text-gray-800 ml-1">₹{expense.uncle_g}</span>
                        </div>
                      )}
                    </div>

                    {expense.remarks && (
                      <p className="mt-2 text-sm text-gray-600 italic">
                        Note: {expense.remarks}
                      </p>
                    )}
                  </div>

                  {/* Right Section - Summary & Actions */}
                  <div className="flex flex-col lg:items-end gap-3">
                    <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 text-sm">
                      <div className="bg-red-50 px-3 py-2 rounded-lg">
                        <p className="text-xs text-red-600 font-semibold">Total Expenses</p>
                        <p className="text-lg font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
                      </div>
                      <div className="bg-orange-50 px-3 py-2 rounded-lg">
                        <p className="text-xs text-orange-600 font-semibold">Total Kaat</p>
                        <p className="text-lg font-bold text-orange-700">{formatCurrency(expense.total_kaat)}</p>
                      </div>
                      <div className="bg-green-50 px-3 py-2 rounded-lg">
                        <p className="text-xs text-green-600 font-semibold">Profit</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(expense.total_profit)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditExpense(expense)}
                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold"
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteExpense(expense.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-semibold"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
