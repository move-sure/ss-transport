'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, FileText } from 'lucide-react';
import supabase from '@/app/utils/supabase';

const BillMasterModal = ({ isOpen, onClose, onSave, existingBill = null }) => {
  const [formData, setFormData] = useState({
    bill_number: '',
    bill_date: new Date().toISOString().slice(0, 10),
    party_name: '',
    billing_type: 'consignor',
    status: 'Draft'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (existingBill) {
      setFormData({
        bill_number: existingBill.bill_number || '',
        bill_date: existingBill.bill_date || new Date().toISOString().slice(0, 10),
        party_name: existingBill.party_name || '',
        billing_type: existingBill.billing_type || 'consignor',
        status: existingBill.status || 'Draft'
      });
    } else {
      // Generate auto bill number
      generateBillNumber();
    }
  }, [existingBill, isOpen]);

  const generateBillNumber = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      // Get last bill number for this month
      const { data, error } = await supabase
        .from('bill_master')
        .select('bill_number')
        .ilike('bill_number', `BILL-${year}${month}-%`)
        .order('bill_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      let sequence = 1;
      if (data && data.length > 0) {
        const lastBillNumber = data[0].bill_number;
        const lastSequence = parseInt(lastBillNumber.split('-')[2]);
        sequence = lastSequence + 1;
      }

      const billNumber = `BILL-${year}${month}-${String(sequence).padStart(4, '0')}`;
      setFormData(prev => ({ ...prev, bill_number: billNumber }));
    } catch (error) {
      console.error('Error generating bill number:', error);
      setError('Failed to generate bill number');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate
      if (!formData.bill_number || !formData.party_name) {
        throw new Error('Bill number and party name are required');
      }

      const billDate = new Date(formData.bill_date);
      const billData = {
        ...formData,
        bill_month: billDate.getMonth() + 1,
        bill_year: billDate.getFullYear()
      };

      let result;
      if (existingBill) {
        // Update existing
        const { data, error } = await supabase
          .from('bill_master')
          .update(billData)
          .eq('bill_id', existingBill.bill_id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('bill_master')
          .insert([billData])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      onSave(result);
      onClose();
    } catch (error) {
      console.error('Error saving bill master:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-bold">
                {existingBill ? 'Edit Bill Master' : 'Create New Bill'}
              </h2>
              <p className="text-sm text-blue-100">Enter bill header information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Bill Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bill Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.bill_number}
              onChange={(e) => handleInputChange('bill_number', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="BILL-202511-0001"
              required
            />
          </div>

          {/* Bill Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bill Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.bill_date}
              onChange={(e) => handleInputChange('bill_date', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Party Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.party_name}
              onChange={(e) => handleInputChange('party_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter party/consignor name"
              required
            />
          </div>

          {/* Billing Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Type
            </label>
            <select
              value={formData.billing_type}
              onChange={(e) => handleInputChange('billing_type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="consignor">Consignor</option>
              <option value="consignee">Consignee</option>
              <option value="transport">Transport</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Draft">Draft</option>
              <option value="Finalized">Finalized</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{existingBill ? 'Update Bill' : 'Create Bill'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BillMasterModal;
