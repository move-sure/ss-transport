'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Building2, User, FileText, MapPin, Phone, Loader2 } from 'lucide-react';

const INITIAL_FORM = {
  company_name: '',
  gst_num: '',
  pan: '',
  adhar: '',
  mobile_number: '',
  alternate_number: '',
  email: '',
  company_address: '',
  city: '',
  state: '',
  pincode: '',
  stakeholder_type: 'CONSIGNOR',
  outstanding_amount: 0
};

export default function CompanyProfileModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editProfile = null,
  importData = null,
  saving = false
}) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editProfile) {
      setFormData({
        ...INITIAL_FORM,
        ...editProfile
      });
    } else if (importData) {
      setFormData({
        ...INITIAL_FORM,
        company_name: importData.company_name || '',
        company_address: importData.company_add || '',
        mobile_number: importData.number || '',
        gst_num: importData.gst_num || '',
        pan: importData.pan || '',
        adhar: importData.adhar || '',
        stakeholder_type: importData.import_type || 'CONSIGNOR'
      });
    } else {
      setFormData(INITIAL_FORM);
    }
    setErrors({});
  }, [editProfile, importData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }
    if (!formData.stakeholder_type) {
      newErrors.stakeholder_type = 'Type is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Building2 className="h-6 w-6" />
            <h2 className="text-lg font-semibold">
              {editProfile ? 'Edit Company Profile' : 'Create Company Profile'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm ${errors.company_name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter company name"
                />
              </div>
              {errors.company_name && <p className="text-red-500 text-xs mt-1">{errors.company_name}</p>}
            </div>

            {/* Stakeholder Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                name="stakeholder_type"
                value={formData.stakeholder_type}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="CONSIGNOR">Consignor</option>
                <option value="CONSIGNEE">Consignee</option>
                <option value="TRANSPORT">Transport</option>
              </select>
            </div>

            {/* Outstanding Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Outstanding Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  name="outstanding_amount"
                  value={formData.outstanding_amount}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Tax & Identity
              </h3>
            </div>

            {/* GST */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <input
                type="text"
                name="gst_num"
                value={formData.gst_num}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm uppercase"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>

            {/* PAN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
              <input
                type="text"
                name="pan"
                value={formData.pan}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm uppercase"
                placeholder="AAAAA0000A"
              />
            </div>

            {/* Aadhar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
              <input
                type="text"
                name="adhar"
                value={formData.adhar}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="0000 0000 0000"
                maxLength={14}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                placeholder="company@example.com"
              />
            </div>

            {/* Divider */}
            <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Phone className="h-4 w-4" /> Contact Details
              </h3>
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                placeholder="9876543210"
              />
            </div>

            {/* Alternate Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Number</label>
              <input
                type="tel"
                name="alternate_number"
                value={formData.alternate_number}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                placeholder="9876543210"
              />
            </div>

            {/* Divider */}
            <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Address Details
              </h3>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
              <textarea
                name="company_address"
                value={formData.company_address}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                placeholder="Enter full address"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="City"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="State"
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="000000"
                maxLength={6}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {editProfile ? 'Update' : 'Create'} Profile
          </button>
        </div>
      </div>
    </div>
  );
}
