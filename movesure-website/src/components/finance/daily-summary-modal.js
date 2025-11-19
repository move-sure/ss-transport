import React from 'react';
import { X, Calendar, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react';

export default function DailySummaryModal({
  showModal,
  editingSummary,
  formData,
  formErrors,
  submitting,
  branches,
  onClose,
  onSubmit,
  onInputChange
}) {
  if (!showModal) return null;

  const closingBalance = 
    (parseFloat(formData.opening_balance) || 0) + 
    (parseFloat(formData.total_income) || 0) - 
    (parseFloat(formData.total_expense) || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold">
              {editingSummary ? 'Edit Daily Summary' : 'Add Daily Summary'}
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              {editingSummary ? 'Update the daily financial summary' : 'Record daily opening and closing balance'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6">
          <div className="space-y-4">
            {/* Branch Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Branch <span className="text-red-500">*</span>
              </label>
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={onInputChange}
                disabled={editingSummary}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                  formErrors.branch_id ? 'border-red-500' : 'border-gray-300'
                } ${editingSummary ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Select Branch</option>
                {branches && Array.isArray(branches) && branches.filter(b => b.is_active).map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name} - {branch.location}
                  </option>
                ))}
              </select>
              {formErrors.branch_id && (
                <p className="text-red-500 text-xs mt-1">{formErrors.branch_id}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="date"
                  name="summary_date"
                  value={formData.summary_date}
                  onChange={onInputChange}
                  disabled={editingSummary}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 ${
                    formErrors.summary_date ? 'border-red-500' : 'border-gray-300'
                  } ${editingSummary ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
              {formErrors.summary_date && (
                <p className="text-red-500 text-xs mt-1">{formErrors.summary_date}</p>
              )}
            </div>

            {/* Opening Balance */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Opening Balance <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  name="opening_balance"
                  value={formData.opening_balance}
                  onChange={onInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                    formErrors.opening_balance ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {!editingSummary && formData.branch_id && formData.summary_date && (
                formData.previousClosingDate ? (
                  <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                    <span>✓</span> Auto-filled from closing balance of {new Date(formData.previousClosingDate).toLocaleDateString('en-IN', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                ) : (
                  <p className="text-blue-600 text-xs mt-1 flex items-center gap-1">
                    <span>ℹ</span> No previous day record found. Starting with ₹0
                  </p>
                )
              )}
              {formErrors.opening_balance && (
                <p className="text-red-500 text-xs mt-1">{formErrors.opening_balance}</p>
              )}
            </div>

            {/* Total Income */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Total Income
              </label>
              <div className="relative">
                <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500" size={20} />
                <input
                  type="number"
                  name="total_income"
                  value={formData.total_income}
                  onChange={onInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                    formErrors.total_income ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {formErrors.total_income && (
                <p className="text-red-500 text-xs mt-1">{formErrors.total_income}</p>
              )}
            </div>

            {/* Total Expense */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Total Expense
              </label>
              <div className="relative">
                <TrendingDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-500" size={20} />
                <input
                  type="number"
                  name="total_expense"
                  value={formData.total_expense}
                  onChange={onInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                    formErrors.total_expense ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {formErrors.total_expense && (
                <p className="text-red-500 text-xs mt-1">{formErrors.total_expense}</p>
              )}
            </div>

            {/* Transaction Details */}
            {formData.branch_id && formData.summary_date && (formData.incomeTransactions?.length > 0 || formData.expenseTransactions?.length > 0) && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Transaction Details for Selected Date</h4>
                
                {/* Income Transactions */}
                {formData.incomeTransactions?.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="text-emerald-600" size={16} />
                      <h5 className="text-xs font-semibold text-emerald-700 uppercase">Income Transactions ({formData.incomeTransactions.length})</h5>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {formData.incomeTransactions.map((transaction, index) => (
                        <div key={transaction.id || index} className="bg-white rounded p-2 text-xs flex justify-between items-center border border-emerald-100">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{transaction.party_name}</p>
                            <p className="text-gray-500 text-xs">{transaction.receiver} • {transaction.payment_mode === 'cash' ? 'Cash' : 'Online'}</p>
                          </div>
                          <p className="font-bold text-emerald-600">₹{parseFloat(transaction.amount).toLocaleString('en-IN')}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-emerald-200 flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-700">Total Income:</span>
                      <span className="text-sm font-bold text-emerald-700">₹{parseFloat(formData.total_income || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}

                {/* Expense Transactions */}
                {formData.expenseTransactions?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="text-rose-600" size={16} />
                      <h5 className="text-xs font-semibold text-rose-700 uppercase">Expense Transactions ({formData.expenseTransactions.length})</h5>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {formData.expenseTransactions.map((transaction, index) => (
                        <div key={transaction.id || index} className="bg-white rounded p-2 text-xs flex justify-between items-center border border-rose-100">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{transaction.party_name}</p>
                            <p className="text-gray-500 text-xs">{transaction.sender} • {transaction.payment_mode === 'cash' ? 'Cash' : 'Online'}</p>
                          </div>
                          <p className="font-bold text-rose-600">₹{parseFloat(transaction.amount).toLocaleString('en-IN')}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-rose-200 flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-700">Total Expense:</span>
                      <span className="text-sm font-bold text-rose-700">₹{parseFloat(formData.total_expense || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Calculated Closing Balance */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border-2 border-indigo-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Closing Balance</p>
                  <p className="text-xs text-gray-500">
                    Opening + Income - Expense
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{closingBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {editingSummary ? 'Updating...' : 'Adding...'}
                </span>
              ) : (
                editingSummary ? 'Update Summary' : 'Add Summary'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
