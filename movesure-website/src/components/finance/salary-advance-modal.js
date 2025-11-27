import React from 'react';
import { X, IndianRupee, Calendar, User, FileText } from 'lucide-react';

export default function SalaryAdvanceModal({
  showModal,
  editingAdvance,
  formData,
  formErrors,
  submitting,
  users,
  onClose,
  onSubmit,
  onInputChange
}) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <IndianRupee size={28} />
            {editingAdvance ? 'Edit Salary Advance' : 'New Salary Advance'}
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <User size={16} />
              Employee *
            </label>
            <select
              name="user_id"
              value={formData.user_id}
              onChange={onInputChange}
              disabled={editingAdvance}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all ${
                formErrors.user_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Employee</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.post || 'N/A'})
                </option>
              ))}
            </select>
            {formErrors.user_id && (
              <p className="mt-1 text-sm text-red-600">{formErrors.user_id}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Advance Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Advance Date *
              </label>
              <input
                type="date"
                name="advance_date"
                value={formData.advance_date}
                onChange={onInputChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all text-gray-900 ${
                  formErrors.advance_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.advance_date && (
                <p className="mt-1 text-sm text-red-600">{formErrors.advance_date}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <IndianRupee size={16} />
                Amount *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={onInputChange}
                step="0.01"
                min="0"
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all ${
                  formErrors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {formErrors.amount && (
                <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FileText size={16} />
              Reason
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={onInputChange}
              rows="3"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all resize-none"
              placeholder="Reason for advance (optional)"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : editingAdvance ? 'Update Advance' : 'Save Advance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
