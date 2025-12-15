'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Package, AlertCircle } from 'lucide-react';

export default function EditItemModal({ 
  item, 
  isOpen, 
  onClose, 
  onSave,
  saving = false 
}) {
  const [formData, setFormData] = useState({
    rate: '',
    labour_rate: '',
    freight_amount: '',
    labour_charge: '',
    bill_charge: '',
    toll_charge: '',
    dd_charge: '',
    other_charge: '',
  });

  const [errors, setErrors] = useState({});

  // Initialize form with item data
  useEffect(() => {
    if (item) {
      setFormData({
        rate: item.rate || '',
        labour_rate: item.labour_rate || '',
        freight_amount: item.freight_amount || '',
        labour_charge: item.labour_charge || '',
        bill_charge: item.bill_charge || '',
        toll_charge: item.toll_charge || '',
        dd_charge: item.dd_charge || '',
        other_charge: item.other_charge || '',
      });
      setErrors({});
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const bilty = item.biltyData || {};
  const biltyType = (item.bilty_type || '').toLowerCase();
  const isRegular = biltyType === 'regular';

  // Handle input change
  const handleChange = (field, value) => {
    // Allow empty or valid number
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Calculate total
  const calculateTotal = () => {
    const freight = parseFloat(formData.freight_amount) || 0;
    const labour = parseFloat(formData.labour_charge) || 0;
    const bill = parseFloat(formData.bill_charge) || 0;
    const toll = parseFloat(formData.toll_charge) || 0;
    const dd = parseFloat(formData.dd_charge) || 0;
    const other = parseFloat(formData.other_charge) || 0;
    return freight + labour + bill + toll + dd + other;
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Rate is required
    if (!formData.rate || parseFloat(formData.rate) < 0) {
      newErrors.rate = 'Valid rate is required';
    }
    
    // Freight is required
    if (!formData.freight_amount || parseFloat(formData.freight_amount) < 0) {
      newErrors.freight_amount = 'Valid freight is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validateForm()) return;

    const total = calculateTotal();
    
    onSave({
      id: item.id,
      rate: parseFloat(formData.rate) || 0,
      labour_rate: parseFloat(formData.labour_rate) || 0,
      freight_amount: parseFloat(formData.freight_amount) || 0,
      labour_charge: parseFloat(formData.labour_charge) || 0,
      bill_charge: parseFloat(formData.bill_charge) || 0,
      toll_charge: parseFloat(formData.toll_charge) || 0,
      dd_charge: parseFloat(formData.dd_charge) || 0,
      other_charge: parseFloat(formData.other_charge) || 0,
      total_amount: total,
    });
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-semibold">Edit Bill Item</h2>
              <p className="text-xs text-blue-100">GR No: {item.gr_no} • {isRegular ? 'Regular' : 'Station'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Read-only Bilty Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Bilty Information (Read-only)
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="text-xs text-gray-500">Consignor</label>
                <p className="font-medium text-gray-800 truncate">{bilty.consignor_name || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Consignee</label>
                <p className="font-medium text-gray-800 truncate">{bilty.consignee_name || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Packages</label>
                <p className="font-medium text-gray-800">{bilty.no_of_pkg || bilty.no_of_packets || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Weight</label>
                <p className="font-medium text-gray-800">{bilty.wt || bilty.weight || '-'} kg</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Pvt Marks</label>
                <p className="font-medium text-gray-800 truncate">{bilty.pvt_marks || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Contents</label>
                <p className="font-medium text-gray-800 truncate">{bilty.contain || bilty.contents || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Payment Mode</label>
                <p className="font-medium text-gray-800">{bilty.payment_mode || bilty.payment_status || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Delivery Type</label>
                <p className="font-medium text-gray-800">{bilty.delivery_type || '-'}</p>
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
              Editable Charges (Bill Item)
            </h3>
            
            {/* Rates Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Rate <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="text"
                    value={formData.rate}
                    onChange={(e) => handleChange('rate', e.target.value)}
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.rate ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.rate && <p className="text-xs text-red-500 mt-1">{errors.rate}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Labour Rate</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="text"
                    value={formData.labour_rate}
                    onChange={(e) => handleChange('labour_rate', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Charges Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Freight <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="text"
                    value={formData.freight_amount}
                    onChange={(e) => handleChange('freight_amount', e.target.value)}
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.freight_amount ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.freight_amount && <p className="text-xs text-red-500 mt-1">{errors.freight_amount}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Labour Charge</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="text"
                    value={formData.labour_charge}
                    onChange={(e) => handleChange('labour_charge', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bill Charge</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="text"
                    value={formData.bill_charge}
                    onChange={(e) => handleChange('bill_charge', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Toll Charge</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="text"
                    value={formData.toll_charge}
                    onChange={(e) => handleChange('toll_charge', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">DD Charge</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="text"
                    value={formData.dd_charge}
                    onChange={(e) => handleChange('dd_charge', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Other Charge</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="text"
                    value={formData.other_charge}
                    onChange={(e) => handleChange('other_charge', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Calculated Total</span>
                <span className="text-xl font-bold text-green-700">{formatCurrency(calculateTotal())}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Freight + Labour + Bill + Toll + DD + Other
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
