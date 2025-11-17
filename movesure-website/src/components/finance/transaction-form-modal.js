import React from 'react';
import { X, Calendar, IndianRupee, User, FileText, RefreshCw, Check, Building2 } from 'lucide-react';

export default function TransactionFormModal({
  showModal,
  transactionType,
  editingTransaction,
  formData,
  formErrors,
  submitting,
  branches,
  onClose,
  onSubmit,
  onInputChange
}) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8">
        {/* Modal Header */}
        <div className={`sticky top-0 bg-gradient-to-r ${
          transactionType === 'income' 
            ? 'from-green-600 to-emerald-600' 
            : 'from-red-600 to-rose-600'
        } px-6 py-4 flex items-center justify-between`}>
          <h3 className="text-xl font-bold text-white">
            {editingTransaction 
              ? `Edit ${transactionType === 'income' ? 'Income' : 'Expense'}` 
              : `Add ${transactionType === 'income' ? 'Income' : 'Expense'}`}
          </h3>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={onSubmit} className="p-6">
          {/* Branch Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Branch <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={onInputChange}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium ${
                  formErrors.branch_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>
            {formErrors.branch_id && <p className="text-red-500 text-xs mt-1">{formErrors.branch_id}</p>}
          </div>

          {/* Transaction Date */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                name="transaction_date"
                value={formData.transaction_date}
                onChange={onInputChange}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium"
              />
            </div>
          </div>

          {/* Party Name */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Party Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                name="party_name"
                value={formData.party_name}
                onChange={onInputChange}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium ${
                  formErrors.party_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter party name"
              />
            </div>
            {formErrors.party_name && <p className="text-red-500 text-xs mt-1">{formErrors.party_name}</p>}
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={onInputChange}
                step="0.01"
                min="0"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium ${
                  formErrors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            {formErrors.amount && <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>}
          </div>

          {/* Payment Mode */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="payment_mode"
                  value="cash"
                  checked={formData.payment_mode === 'cash'}
                  onChange={onInputChange}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="ml-2 text-sm text-gray-700">Cash</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="payment_mode"
                  value="online"
                  checked={formData.payment_mode === 'online'}
                  onChange={onInputChange}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="ml-2 text-sm text-gray-700">Online</span>
              </label>
            </div>
          </div>

          {/* Receiver (Income) or Sender (Expense) */}
          {transactionType === 'income' ? (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Receiver <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="receiver"
                  value={formData.receiver}
                  onChange={onInputChange}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium ${
                    formErrors.receiver ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Who received the payment?"
                />
              </div>
              {formErrors.receiver && <p className="text-red-500 text-xs mt-1">{formErrors.receiver}</p>}
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sender <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="sender"
                  value={formData.sender}
                  onChange={onInputChange}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium ${
                    formErrors.sender ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Who made the payment?"
                />
              </div>
              {formErrors.sender && <p className="text-red-500 text-xs mt-1">{formErrors.sender}</p>}
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
              <textarea
                name="description"
                value={formData.description}
                onChange={onInputChange}
                rows="3"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium"
                placeholder="Add any notes or description..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                transactionType === 'income' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={18} />
                  {editingTransaction ? 'Update' : 'Add'} {transactionType === 'income' ? 'Income' : 'Expense'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
