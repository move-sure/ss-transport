import React from 'react';
import { X, MapPin, Phone, RefreshCw, Check } from 'lucide-react';

export default function BranchFormModal({
  showModal,
  editingBranch,
  formData,
  formErrors,
  submitting,
  onClose,
  onSubmit,
  onInputChange
}) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">
            {editingBranch ? 'Edit Branch' : 'Create New Branch'}
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={onSubmit} className="p-6">
          {/* Branch Name */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Branch Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="branch_name"
              value={formData.branch_name}
              onChange={onInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                formErrors.branch_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter branch name"
            />
            {formErrors.branch_name && (
              <p className="text-red-500 text-xs mt-1">{formErrors.branch_name}</p>
            )}
          </div>

          {/* Location */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={onInputChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  formErrors.location ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter location"
              />
            </div>
            {formErrors.location && (
              <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>
            )}
          </div>

          {/* Contact Number */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Contact Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                name="contact_number"
                value={formData.contact_number}
                onChange={onInputChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  formErrors.contact_number ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter 10-digit phone number"
                maxLength="10"
              />
            </div>
            {formErrors.contact_number && (
              <p className="text-red-500 text-xs mt-1">{formErrors.contact_number}</p>
            )}
          </div>

          {/* Active Status */}
          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={onInputChange}
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-3 text-sm font-semibold text-gray-700">Branch is Active</span>
            </label>
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
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={18} />
                  {editingBranch ? 'Update Branch' : 'Create Branch'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
