import React, { useEffect, useState } from 'react';
import { X, IndianRupee, Calendar, User, CreditCard, FileText } from 'lucide-react';

export default function SalaryPaymentModal({
  showModal,
  editingPayment,
  formData,
  formErrors,
  submitting,
  users,
  onClose,
  onSubmit,
  onInputChange,
  getUnadjustedAdvances
}) {
  const [unadjustedAdvances, setUnadjustedAdvances] = useState([]);
  const [selectedAdvances, setSelectedAdvances] = useState([]);

  useEffect(() => {
    if (showModal && formData.user_id) {
      loadUnadjustedAdvances();
    }
  }, [showModal, formData.user_id]);

  const loadUnadjustedAdvances = async () => {
    const advances = await getUnadjustedAdvances(formData.user_id);
    setUnadjustedAdvances(advances);
    
    // Auto-calculate total advance deducted
    const total = advances.reduce((sum, adv) => sum + parseFloat(adv.amount), 0);
    onInputChange({ target: { name: 'total_advance_deducted', value: total.toString() } });
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <IndianRupee size={28} />
            {editingPayment ? 'Edit Salary Payment' : 'New Salary Payment'}
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
              disabled={editingPayment}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-green-500 transition-all ${
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
            {/* Salary Month */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Salary Month *
              </label>
              <input
                type="month"
                name="salary_month"
                value={formData.salary_month}
                onChange={onInputChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 ${
                  formErrors.salary_month ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.salary_month && (
                <p className="mt-1 text-sm text-red-600">{formErrors.salary_month}</p>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Payment Date *
              </label>
              <input
                type="date"
                name="payment_date"
                value={formData.payment_date}
                onChange={onInputChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 ${
                  formErrors.payment_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.payment_date && (
                <p className="mt-1 text-sm text-red-600">{formErrors.payment_date}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gross Salary */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <IndianRupee size={16} />
                Gross Salary *
              </label>
              <input
                type="number"
                name="gross_salary"
                value={formData.gross_salary}
                onChange={onInputChange}
                step="0.01"
                min="0"
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-green-500 transition-all ${
                  formErrors.gross_salary ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {formErrors.gross_salary && (
                <p className="mt-1 text-sm text-red-600">{formErrors.gross_salary}</p>
              )}
            </div>

            {/* Total Advance Deducted */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <IndianRupee size={16} />
                Advance Deducted
              </label>
              <input
                type="number"
                name="total_advance_deducted"
                value={formData.total_advance_deducted}
                onChange={onInputChange}
                step="0.01"
                min="0"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition-all"
                placeholder="0.00"
              />
            </div>

            {/* Net Salary Paid */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <IndianRupee size={16} />
                Net Salary Paid
              </label>
              <input
                type="number"
                name="net_salary_paid"
                value={formData.net_salary_paid}
                readOnly
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 font-semibold"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Unadjusted Advances Display */}
          {unadjustedAdvances.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <FileText size={16} />
                Pending Advances for This Employee
              </h4>
              <div className="space-y-2">
                {unadjustedAdvances.map(advance => (
                  <div key={advance.id} className="flex justify-between items-center bg-white p-2 rounded-lg">
                    <span className="text-sm text-gray-700">
                      {new Date(advance.advance_date).toLocaleDateString()} - {advance.reason || 'No reason'}
                    </span>
                    <span className="font-semibold text-yellow-700">
                      ₹{parseFloat(advance.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-yellow-300 flex justify-between items-center">
                  <span className="font-semibold text-yellow-800">Total Pending Advances:</span>
                  <span className="font-bold text-yellow-900 text-lg">
                    ₹{unadjustedAdvances.reduce((sum, adv) => sum + parseFloat(adv.amount), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <CreditCard size={16} />
              Payment Mode
            </label>
            <select
              name="payment_mode"
              value={formData.payment_mode}
              onChange={onInputChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition-all"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FileText size={16} />
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={onInputChange}
              rows="3"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition-all resize-none"
              placeholder="Additional notes (optional)"
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : editingPayment ? 'Update Payment' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
