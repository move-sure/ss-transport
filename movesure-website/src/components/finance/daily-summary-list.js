import React, { useState } from 'react';
import { Calendar, Building2, DollarSign, TrendingUp, TrendingDown, Edit, Trash2, Filter } from 'lucide-react';

export default function DailySummaryList({
  summaries,
  branches,
  formatCurrency,
  onEditSummary,
  onDeleteSummary
}) {
  const [filterBranch, setFilterBranch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Filter summaries
  const filteredSummaries = summaries.filter(summary => {
    if (filterBranch && summary.branch_id !== filterBranch) return false;
    if (filterMonth) {
      const summaryMonth = summary.summary_date.substring(0, 7); // YYYY-MM
      if (summaryMonth !== filterMonth) return false;
    }
    return true;
  });

  // Calculate totals
  const totals = filteredSummaries.reduce((acc, summary) => {
    acc.totalIncome += parseFloat(summary.total_income || 0);
    acc.totalExpense += parseFloat(summary.total_expense || 0);
    return acc;
  }, { totalIncome: 0, totalExpense: 0 });

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              <Filter size={14} className="inline mr-1" />
              Filter by Branch
            </label>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm text-gray-900"
            >
              <option value="">All Branches</option>
              {branches && Array.isArray(branches) && branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              <Calendar size={14} className="inline mr-1" />
              Filter by Month
            </label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm text-gray-900"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-green-600" size={16} />
              <span className="text-xs font-semibold text-green-700">Total Income</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-green-900">{formatCurrency(totals.totalIncome)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="text-red-600" size={16} />
              <span className="text-xs font-semibold text-red-700">Total Expense</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-red-900">{formatCurrency(totals.totalExpense)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="text-blue-600" size={16} />
              <span className="text-xs font-semibold text-blue-700">Net Balance</span>
            </div>
            <p className={`text-base sm:text-lg font-bold ${totals.totalIncome - totals.totalExpense >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              {formatCurrency(totals.totalIncome - totals.totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredSummaries.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No daily summaries found</h3>
          <p className="text-gray-600">
            {filterBranch || filterMonth ? 'Try adjusting your filters' : 'Start by adding your first daily summary'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Opening</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expense</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Closing</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSummaries.map((summary) => (
                <tr key={summary.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="mr-2 text-gray-400" size={16} />
                      {new Date(summary.summary_date).toLocaleDateString('en-IN', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="mr-2 text-gray-400" size={16} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {summary.branch_finance?.branch_name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {summary.branch_finance?.location || ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(summary.opening_balance)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-green-600">
                      +{formatCurrency(summary.total_income)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-red-600">
                      -{formatCurrency(summary.total_expense)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`text-sm font-bold ${
                      summary.closing_balance >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(summary.closing_balance)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditSummary(summary)}
                        className="p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Summary"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteSummary(summary.id, summary.summary_date)}
                        className="p-1.5 sm:p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Summary"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
