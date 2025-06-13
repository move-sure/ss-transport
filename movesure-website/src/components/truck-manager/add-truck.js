'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Truck } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const TruckForm = ({ truck, staff, onSave, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    truck_number: '',
    truck_type: '',
    tyre_count: '',
    brand: '',
    year_of_manufacturing: '',
    rc_number: '',
    insurance_number: '',
    permit_number: '',
    owner_id: '',
    fuel_type: 'diesel',
    loading_capacity: '',
    current_location: '',
    is_active: true,
    is_available: true
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (truck) {
      setFormData({
        truck_number: truck.truck_number || '',
        truck_type: truck.truck_type || '',
        tyre_count: truck.tyre_count || '',
        brand: truck.brand || '',
        year_of_manufacturing: truck.year_of_manufacturing || '',
        rc_number: truck.rc_number || '',
        insurance_number: truck.insurance_number || '',
        permit_number: truck.permit_number || '',
        owner_id: truck.owner_id || '',
        fuel_type: truck.fuel_type || 'diesel',
        loading_capacity: truck.loading_capacity || '',
        current_location: truck.current_location || '',
        is_active: truck.is_active !== undefined ? truck.is_active : true,
        is_available: truck.is_available !== undefined ? truck.is_available : true
      });
    }
  }, [truck]);
  const validateForm = () => {
    const newErrors = {};

    if (!formData.truck_number.trim()) {
      newErrors.truck_number = 'Truck number is required';
    }

    if (!formData.truck_type.trim()) {
      newErrors.truck_type = 'Truck type is required';
    }

    if (formData.year_of_manufacturing && 
        (formData.year_of_manufacturing < 1900 || formData.year_of_manufacturing > new Date().getFullYear())) {
      newErrors.year_of_manufacturing = 'Invalid manufacturing year';
    }

    if (formData.loading_capacity && formData.loading_capacity <= 0) {
      newErrors.loading_capacity = 'Loading capacity must be greater than 0';
    }

    if (formData.tyre_count && (formData.tyre_count < 4 || formData.tyre_count > 22)) {
      newErrors.tyre_count = 'Tyre count must be between 4 and 22';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      // Prepare data for saving - match the database schema exactly
      const saveData = {
        truck_number: formData.truck_number.trim().toUpperCase(),
        truck_type: formData.truck_type || null,
        tyre_count: formData.tyre_count ? parseInt(formData.tyre_count) : null,
        brand: formData.brand || null,
        year_of_manufacturing: formData.year_of_manufacturing ? parseInt(formData.year_of_manufacturing) : null,
        rc_number: formData.rc_number || null,
        insurance_number: formData.insurance_number || null,
        permit_number: formData.permit_number || null,
        owner_id: formData.owner_id || null,
        fuel_type: formData.fuel_type || 'diesel',
        loading_capacity: formData.loading_capacity ? parseFloat(formData.loading_capacity) : null,
        current_location: formData.current_location || null,
        is_active: formData.is_active,
        is_available: formData.is_available
      };

      if (truck) {
        // Update existing truck
        const { data, error } = await supabase
          .from('trucks')
          .update(saveData)
          .eq('id', truck.id)
          .select('*')
          .single();

        if (error) throw error;
        
        onSave(data);
        alert('Truck updated successfully!');
      } else {
        // Create new truck
        const { data, error } = await supabase
          .from('trucks')
          .insert([saveData])
          .select('*')
          .single();

        if (error) throw error;
        
        onSave(data);
        alert('Truck created successfully!');
      }

    } catch (error) {
      console.error('Error saving truck:', error);
      
      // Handle specific database errors
      if (error.code === '23505') {
        setErrors({ truck_number: 'Truck number already exists' });
      } else if (error.code === '23503') {
        setErrors({ owner_id: 'Selected owner does not exist' });
      } else {
        alert('Error saving truck: ' + (error.message || 'Please try again.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const truckTypes = [
    'Container Truck',
    'Flatbed Truck',
    'Refrigerated Truck',
    'Tanker Truck',
    'Dump Truck',
    'Pickup Truck',
    'Mini Truck',
    'Heavy Truck',
    'Medium Truck',
    'Light Truck'
  ];

  const fuelTypes = [
    'diesel',
    'petrol',
    'cng',
    'electric',
    'hybrid'
  ];
  // Mock staff data for demo - use real staff data passed as props
  const availableStaff = staff || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Truck className="w-7 h-7" />
              {truck ? 'Edit Truck Details' : 'Add New Truck'}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Basic Information
                </h3>
              </div>

              {/* Truck Number */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Truck Number *
                </label>
                <input
                  type="text"
                  value={formData.truck_number}
                  onChange={(e) => handleChange('truck_number', e.target.value.toUpperCase())}
                  className={`w-full px-4 py-3 text-black font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.truck_number ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white hover:border-blue-400'
                  }`}
                  placeholder="MH01AB1234"
                />
                {errors.truck_number && (
                  <p className="text-red-600 text-sm mt-1 font-medium">{errors.truck_number}</p>
                )}
              </div>

              {/* Truck Type */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Truck Type *
                </label>
                <select
                  value={formData.truck_type}
                  onChange={(e) => handleChange('truck_type', e.target.value)}
                  className={`w-full px-4 py-3 text-black font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.truck_type ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white hover:border-blue-400'
                  }`}
                >
                  <option value="" className="text-gray-500">Select truck type</option>
                  {truckTypes.map(type => (
                    <option key={type} value={type} className="text-black">{type}</option>
                  ))}
                </select>
                {errors.truck_type && (
                  <p className="text-red-600 text-sm mt-1 font-medium">{errors.truck_type}</p>
                )}
              </div>              {/* Brand */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Brand (Optional)
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                  className="w-full px-4 py-3 text-black font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-blue-400 transition-colors"
                  placeholder="Tata, Ashok Leyland, etc."
                />
              </div>              {/* Year of Manufacturing */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Year of Manufacturing (Optional)
                </label>
                <input
                  type="number"
                  value={formData.year_of_manufacturing}
                  onChange={(e) => handleChange('year_of_manufacturing', e.target.value)}
                  className={`w-full px-4 py-3 text-black font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.year_of_manufacturing ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white hover:border-blue-400'
                  }`}
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear()}
                />
                {errors.year_of_manufacturing && (
                  <p className="text-red-600 text-sm mt-1 font-medium">{errors.year_of_manufacturing}</p>
                )}
              </div>              {/* Tyre Count */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Tyre Count (Optional)
                </label>
                <input
                  type="number"
                  value={formData.tyre_count}
                  onChange={(e) => handleChange('tyre_count', e.target.value)}
                  className={`w-full px-4 py-3 text-black font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.tyre_count ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white hover:border-blue-400'
                  }`}
                  placeholder="6, 10, 14, etc."
                  min="4"
                  max="22"
                />
                {errors.tyre_count && (
                  <p className="text-red-600 text-sm mt-1 font-medium">{errors.tyre_count}</p>
                )}
              </div>

              {/* Fuel Type */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Fuel Type
                </label>
                <select
                  value={formData.fuel_type}
                  onChange={(e) => handleChange('fuel_type', e.target.value)}
                  className="w-full px-4 py-3 text-black font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-blue-400 transition-colors"
                >
                  {fuelTypes.map(type => (
                    <option key={type} value={type} className="text-black">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>              {/* Loading Capacity */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Loading Capacity (tons) - Optional
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.loading_capacity}
                  onChange={(e) => handleChange('loading_capacity', e.target.value)}
                  className={`w-full px-4 py-3 text-black font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.loading_capacity ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white hover:border-blue-400'
                  }`}
                  placeholder="5.5"
                  min="0.1"
                />
                {errors.loading_capacity && (
                  <p className="text-red-600 text-sm mt-1 font-medium">{errors.loading_capacity}</p>
                )}
              </div>
            </div>

            {/* Documents & Details */}
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <h3 className="text-xl font-bold text-green-800 mb-4">
                  Documents & Details
                </h3>
              </div>              {/* RC Number */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  RC Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.rc_number}
                  onChange={(e) => handleChange('rc_number', e.target.value)}
                  className="w-full px-4 py-3 text-black font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-blue-400 transition-colors"
                  placeholder="Registration Certificate Number"
                />
              </div>              {/* Insurance Number */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Insurance Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.insurance_number}
                  onChange={(e) => handleChange('insurance_number', e.target.value)}
                  className="w-full px-4 py-3 text-black font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-blue-400 transition-colors"
                  placeholder="Insurance Policy Number"
                />
              </div>              {/* Permit Number */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Permit Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.permit_number}
                  onChange={(e) => handleChange('permit_number', e.target.value)}
                  className="w-full px-4 py-3 text-black font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-blue-400 transition-colors"
                  placeholder="Transport Permit Number"
                />
              </div>              {/* Owner */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Owner (Optional)
                </label><select
                  value={formData.owner_id}
                  onChange={(e) => handleChange('owner_id', e.target.value)}
                  className="w-full px-4 py-3 text-black font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-blue-400 transition-colors"
                >
                  <option value="" className="text-gray-500">Select owner</option>
                  {availableStaff
                    .filter(s => s.post?.toLowerCase().includes('owner') || s.post?.toLowerCase().includes('driver'))
                    .map(member => (
                      <option key={member.id} value={member.id} className="text-black">
                        {member.name} ({member.post})
                      </option>
                    ))}
                </select>
              </div>              {/* Current Location */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Current Location (Optional)
                </label>
                <input
                  type="text"
                  value={formData.current_location}
                  onChange={(e) => handleChange('current_location', e.target.value)}
                  className="w-full px-4 py-3 text-black font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-blue-400 transition-colors"
                  placeholder="Current parking/depot location"
                />
              </div>

              {/* Status Checkboxes */}
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <h4 className="text-lg font-bold text-gray-800 mb-4">Status Settings</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => handleChange('is_active', e.target.checked)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-3 block text-sm font-semibold text-gray-800">
                      Active (truck is operational)
                    </label>
                  </div>

                  <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      id="is_available"
                      checked={formData.is_available}
                      onChange={(e) => handleChange('is_available', e.target.checked)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_available" className="ml-3 block text-sm font-semibold text-gray-800">
                      Available (ready for trips)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 mt-10 pt-6 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 border-2 border-gray-400 text-gray-700 font-bold rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : (truck ? 'Update Truck' : 'Create Truck')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruckForm;