import React, { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Calendar, DollarSign, User, CreditCard, Edit, Trash2, FileText } from 'lucide-react';

export default function TransactionsList({
  transactions,
  formatCurrency,
  onAddIncome,
  onAddExpense,
  onEditTransaction,
  onDeleteTransaction
}) {
  const [activeTab, setActiveTab] = useState('income');

  const currentTransactions = activeTab === 'income' ? transactions.income : transactions.expense;
  
  const totalIncome = transactions.income.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalExpense = transactions.expense.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {/* Header with Summary */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Income & Expense Tracker</h2>
          <div className="flex gap-2">
            <button
              onClick={onAddIncome}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-semibold shadow-md"
            >
              <Plus size={16} />
              <span className="sm:inline">Income</span>
            </button>
            <button
              onClick={onAddExpense}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-semibold shadow-md"
            >
              <Plus size={16} />
              <span className="sm:inline">Expense</span>
            </button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-green-600" size={16} />
              <span className="text-xs font-semibold text-green-700">Total Income</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-green-900">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="text-red-600" size={16} />
              <span className="text-xs font-semibold text-red-700">Total Expense</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-red-900">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="text-blue-600" size={16} />
              <span className="text-xs font-semibold text-blue-700">Net Balance</span>
            </div>
            <p className={`text-base sm:text-lg font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-900' : 'text-red-900'}`}>
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
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1 sm:gap-2">
            <TrendingUp size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Income</span> ({transactions.income.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex-1 px-4 sm:px-6 py-3 font-semibold transition-all text-sm sm:text-base ${
            activeTab === 'expense'
              ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1 sm:gap-2">
            <TrendingDown size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Expense</span> ({transactions.expense.length})
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
            No {activeTab} transactions yet
          </h3>
          <p className="text-gray-600 mb-6">
            Start by adding your first {activeTab} transaction
          </p>
          <button
            onClick={activeTab === 'income' ? onAddIncome : onAddExpense}
            className={`inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg transition-all ${
              activeTab === 'income' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'income' ? 'Receiver' : 'Sender'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="mr-2 text-gray-400" size={16} />
                      {new Date(transaction.transaction_date).toLocaleDateString('en-IN')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="mr-2 text-gray-400" size={16} />
                      <span className="text-sm font-medium text-gray-900">{transaction.party_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-bold ${
                      activeTab === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CreditCard className="mr-2 text-gray-400" size={16} />
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.payment_mode === 'cash'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {transaction.payment_mode === 'cash' ? 'Cash' : 'Online'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {transaction.receiver || transaction.sender || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-start max-w-xs">
                      {transaction.description ? (
                        <>
                          <FileText className="mr-2 text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                          <span className="line-clamp-2">{transaction.description}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">No description</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditTransaction(transaction, activeTab)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Transaction"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(transaction.id, activeTab)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Transaction"
                      >
                        <Trash2 size={18} />
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
