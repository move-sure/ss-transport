import React, { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Calendar, DollarSign, User, CreditCard, Edit, Trash2, FileText, Layers, Building2, Filter } from 'lucide-react';

export default function TransactionsList({
  transactions,
  branches,
  formatCurrency,
  onAddIncome,
  onAddExpense,
  onAddBulkIncome,
  onAddBulkExpense,
  onEditTransaction,
  onDeleteTransaction
}) {
  const [activeTab, setActiveTab] = useState('income');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Filter transactions
  const filterTransactionsByBranchAndDate = (transactionsList) => {
    return transactionsList.filter(transaction => {
      if (filterBranch && transaction.branch_id !== filterBranch) return false;
      if (filterMonth) {
        const transactionMonth = transaction.transaction_date.substring(0, 7); // YYYY-MM
        if (transactionMonth !== filterMonth) return false;
      }
      return true;
    });
  };

  const filteredIncome = filterTransactionsByBranchAndDate(transactions.income);
  const filteredExpense = filterTransactionsByBranchAndDate(transactions.expense);

  const currentTransactions = activeTab === 'income' ? filteredIncome : filteredExpense;
  
  const totalIncome = filteredIncome.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalExpense = filteredExpense.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  return (
    <div className="overflow-hidden">
      {/* Header with Summary */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex gap-2">
            <div className="flex gap-1">
              <button
                onClick={onAddIncome}
                className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-emerald-600 text-white rounded-l-lg hover:bg-emerald-700 transition-all text-sm font-semibold shadow-md"
                title="Add Single Income"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Income</span>
              </button>
              <button
                onClick={onAddBulkIncome}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-emerald-700 text-white rounded-r-lg hover:bg-emerald-800 transition-all text-sm font-semibold shadow-md border-l border-emerald-500"
                title="Add Multiple Income Entries"
              >
                <Layers size={16} />
              </button>
            </div>
            <div className="flex gap-1">
              <button
                onClick={onAddExpense}
                className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-rose-600 text-white rounded-l-lg hover:bg-rose-700 transition-all text-sm font-semibold shadow-md"
                title="Add Single Expense"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Expense</span>
              </button>
              <button
                onClick={onAddBulkExpense}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-rose-700 text-white rounded-r-lg hover:bg-rose-800 transition-all text-sm font-semibold shadow-md border-l border-rose-500"
                title="Add Multiple Expense Entries"
              >
                <Layers size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-emerald-600" size={16} />
              <span className="text-xs font-semibold text-emerald-700">Total Income</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-emerald-900">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="text-rose-600" size={16} />
              <span className="text-xs font-semibold text-rose-700">Total Expense</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-rose-900">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="text-slate-600" size={16} />
              <span className="text-xs font-semibold text-slate-700">Net Balance</span>
            </div>
            <p className={`text-base sm:text-lg font-bold ${totalIncome - totalExpense >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
              {formatCurrency(totalIncome - totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 px-4 sm:px-6 py-3 font-semibold transition-all text-sm sm:text-base ${
            activeTab === 'income'
              ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1 sm:gap-2">
            <TrendingUp size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Income</span> ({filteredIncome.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex-1 px-4 sm:px-6 py-3 font-semibold transition-all text-sm sm:text-base ${
            activeTab === 'expense'
              ? 'text-rose-700 border-b-2 border-rose-600 bg-rose-50'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1 sm:gap-2">
            <TrendingDown size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Expense</span> ({filteredExpense.length})
          </span>
        </button>
      </div>

      {/* Transactions Table */}
      {currentTransactions.length === 0 ? (
        <div className="text-center py-16">
          {activeTab === 'income' ? (
            <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
          ) : (
            <TrendingDown className="mx-auto text-gray-400 mb-4" size={48} />
          )}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {activeTab} transactions found
          </h3>
          <p className="text-gray-600 mb-6">
            {filterBranch || filterMonth ? 'Try adjusting your filters' : `Start by adding your first ${activeTab} transaction`}
          </p>
          <button
            onClick={activeTab === 'income' ? onAddIncome : onAddExpense}
            className={`inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg transition-all shadow-md ${
              activeTab === 'income' 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            <Plus size={20} />
            Add {activeTab === 'income' ? 'Income' : 'Expense'}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'income' ? 'Receiver' : 'Sender'}
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Description</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center text-xs sm:text-sm text-gray-900">
                      <Calendar className="mr-1 sm:mr-2 text-gray-400" size={14} />
                      {new Date(transaction.transaction_date).toLocaleDateString('en-IN')}
                    </div>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="mr-1 sm:mr-2 text-gray-400" size={14} />
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{transaction.party_name}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <span className={`text-xs sm:text-sm font-bold ${
                      activeTab === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CreditCard className="mr-1 sm:mr-2 text-gray-400" size={14} />
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${
                        transaction.payment_mode === 'cash'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {transaction.payment_mode === 'cash' ? 'Cash' : 'Online'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                    {transaction.receiver || transaction.sender || 'N/A'}
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-start max-w-xs">
                      {transaction.description ? (
                        <>
                          <FileText className="mr-1 sm:mr-2 text-gray-400 flex-shrink-0 mt-0.5" size={14} />
                          <span className="line-clamp-2">{transaction.description}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">No description</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditTransaction(transaction, activeTab)}
                        className="p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Transaction"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(transaction.id, activeTab)}
                        className="p-1.5 sm:p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Transaction"
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
