'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function ChallanExpenseFormModal({
  showModal,
  editingExpense,
  formData,
  formErrors,
  loading,
  challans,
  onClose,
  onSubmit,
  onInputChange
}) {
  const [showChallanDropdown, setShowChallanDropdown] = useState(false);
  const [challanSearch, setChallanSearch] = useState('');
  const challanInputRef = useRef(null);
  const submitButtonRef = useRef(null);

  useEffect(() => {
    if (showModal && editingExpense) {
      setChallanSearch(editingExpense.challan_no || '');
    } else if (showModal) {
      setChallanSearch('');
    }
  }, [showModal, editingExpense]);

  const handleChallanInputChange = (value) => {
    setChallanSearch(value);
    onInputChange('challan_no', value);
    setShowChallanDropdown(true);
  };

  const handleChallanInputClick = () => {
    setShowChallanDropdown(true);
  };

  const handleChallanSelect = (challan) => {
    setChallanSearch(challan.challan_no);
    onInputChange('challan_no', challan.challan_no);
    setShowChallanDropdown(false);
  };

  const filteredChallans = challans.filter(challan =>
    challan.is_dispatched === true &&
    challan.challan_no.toLowerCase().includes(challanSearch.toLowerCase())
  );

  // Calculate total expenses
  const totalExpenses = 
    parseFloat(formData.loading_labour || 0) +
    parseFloat(formData.unloading_labour || 0) +
    parseFloat(formData.driver_expense || 0) +
    parseFloat(formData.cell_tax || 0) +
    parseFloat(formData.grease || 0) +
    parseFloat(formData.uncle_g || 0) +
    parseFloat(formData.cc_other || 0) +
    parseFloat(formData.diesel || 0) +
    parseFloat(formData.crossing || 0);

  const handleSubmitButtonKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      submitButtonRef.current?.click();
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-700 text-white p-6 rounded-t-2xl flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign size={28} />
            {editingExpense ? 'Edit Challan Expense' : 'Add Challan Expense'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          {/* Challan Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Challan Number *
            </label>
            <div className="relative">
              <input
                ref={challanInputRef}
                type="text"
                value={challanSearch}
                onChange={(e) => handleChallanInputChange(e.target.value)}
                onFocus={() => setShowChallanDropdown(true)}
                onClick={handleChallanInputClick}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                  formErrors.challan_no ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Search dispatched challan number"
                disabled={loading}
              />
              {formErrors.challan_no && (
                <p className="text-red-500 text-xs mt-1">{formErrors.challan_no}</p>
              )}
              
              {/* Challan Dropdown */}
              {showChallanDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border-2 border-slate-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredChallans.length > 0 ? (
                    filteredChallans.map((challan) => (
                      <button
                        key={challan.id}
                        type="button"
                        onClick={() => handleChallanSelect(challan)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-semibold text-gray-800">{challan.challan_no}</div>
                        <div className="text-xs text-gray-500">
                          Dispatch Date: {new Date(challan.dispatch_date || challan.date).toLocaleDateString('en-IN')}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-center text-gray-500">
                      <p className="text-sm">No dispatched challans found</p>
                      <p className="text-xs mt-1">Only dispatched challans are shown</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Expense Fields - Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Loading Labour */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Loading Labour
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.loading_labour}
                  onChange={(e) => onInputChange('loading_labour', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Unloading Labour */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Unloading Labour
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unloading_labour}
                  onChange={(e) => onInputChange('unloading_labour', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Driver Expense */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Driver Expense
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.driver_expense}
                  onChange={(e) => onInputChange('driver_expense', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Cell Tax */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cell Tax
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cell_tax}
                  onChange={(e) => onInputChange('cell_tax', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Grease - Default 200 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Grease (Default: ₹200)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.grease}
                  onChange={(e) => onInputChange('grease', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Uncle G - Default 300 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Uncle G (Default: ₹300)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.uncle_g}
                  onChange={(e) => onInputChange('uncle_g', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* CC Other */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                CC Other
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cc_other}
                  onChange={(e) => onInputChange('cc_other', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Diesel */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Diesel
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.diesel}
                  onChange={(e) => onInputChange('diesel', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Crossing */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Crossing
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.crossing}
                  onChange={(e) => onInputChange('crossing', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Total Expenses Display */}
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-800">Total Expenses:</span>
              <span className="text-2xl font-bold text-slate-700">
                ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Financial Summary Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Kaat */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <TrendingDown size={16} className="text-gray-500" />
                Total Kaat
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_kaat}
                  onChange={(e) => onInputChange('total_kaat', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Total PF */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <TrendingDown size={16} className="text-gray-500" />
                Total PF
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_pf}
                  onChange={(e) => onInputChange('total_pf', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Total Profit */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <TrendingUp size={16} className="text-gray-500" />
                Total Profit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_profit}
                  onChange={(e) => onInputChange('total_profit', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => onInputChange('remarks', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={3}
              placeholder="Add any additional notes..."
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              ref={submitButtonRef}
              type="submit"
              onKeyDown={handleSubmitButtonKeyDown}
              className="px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-all font-semibold flex items-center gap-2 shadow-lg disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  {editingExpense ? 'Update Expense' : 'Save Expense'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
