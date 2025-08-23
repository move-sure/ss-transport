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

      let result;

      if (truck) {
        // Update existing truck
        const { data, error } = await supabase
          .from('trucks')
          .update(saveData)
          .eq('id', truck.id)
          .select('*, owner:staff(name)')
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new truck
        const { data, error } = await supabase
          .from('trucks')
          .insert([saveData])
          .select('*')
          .single();

        if (error) throw error;
        result = data;
      }

      onSave(result);
      alert(truck ? 'Truck updated successfully!' : 'Truck created successfully!');
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

  const availableStaff = staff || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6" />
            {truck ? 'Edit Truck' : 'Add New Truck'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 p-1 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1 - Basic Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-black border-b pb-2">
                Basic Details
              </h3>

              {/* Truck Number */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Truck Number *
                </label>
                <input
                  type="text"
                  value={formData.truck_number}
                  onChange={(e) => handleChange('truck_number', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                    errors.truck_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter truck number"
                />
                {errors.truck_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.truck_number}</p>
                )}
              </div>

              {/* Truck Type */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Truck Type *
                </label>
                <select
                  value={formData.truck_type}
                  onChange={(e) => handleChange('truck_type', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                    errors.truck_type ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select truck type</option>
                  {truckTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.truck_type && (
                  <p className="text-red-500 text-xs mt-1">{errors.truck_type}</p>
                )}
              </div>

              {/* Loading Capacity */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Loading Capacity (tons)
                </label>
                <input
                  type="number"
                  value={formData.loading_capacity}
                  onChange={(e) => handleChange('loading_capacity', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                    errors.loading_capacity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter loading capacity"
                  min="0"
                  step="0.1"
                />
                {errors.loading_capacity && (
                  <p className="text-red-500 text-xs mt-1">{errors.loading_capacity}</p>
                )}
              </div>

              {/* Fuel Type */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Fuel Type
                </label>
                <select
                  value={formData.fuel_type}
                  onChange={(e) => handleChange('fuel_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                >
                  {fuelTypes.map(fuel => (
                    <option key={fuel} value={fuel}>
                      {fuel.charAt(0).toUpperCase() + fuel.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Location */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Current Location
                </label>
                <input
                  type="text"
                  value={formData.current_location}
                  onChange={(e) => handleChange('current_location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter current location"
                />
              </div>
            </div>

            {/* Column 2 - Vehicle Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-black border-b pb-2">
                Vehicle Details
              </h3>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter brand"
                />
              </div>

              {/* Year of Manufacturing */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Year of Manufacturing
                </label>
                <input
                  type="number"
                  value={formData.year_of_manufacturing}
                  onChange={(e) => handleChange('year_of_manufacturing', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                    errors.year_of_manufacturing ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter year"
                  min="1900"
                  max={new Date().getFullYear()}
                />
                {errors.year_of_manufacturing && (
                  <p className="text-red-500 text-xs mt-1">{errors.year_of_manufacturing}</p>
                )}
              </div>

              {/* Tyre Count */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Tyre Count
                </label>
                <input
                  type="number"
                  value={formData.tyre_count}
                  onChange={(e) => handleChange('tyre_count', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                    errors.tyre_count ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter tyre count"
                  min="4"
                  max="22"
                />
                {errors.tyre_count && (
                  <p className="text-red-500 text-xs mt-1">{errors.tyre_count}</p>
                )}
              </div>

              {/* Owner */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Owner
                </label>
                <select
                  value={formData.owner_id}
                  onChange={(e) => handleChange('owner_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                >
                  <option value="">Select owner</option>
                  {availableStaff
                    .filter(member => member.post.includes('owner'))
                    .map(owner => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Status Checkboxes */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-black">
                    Active (truck is operational)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_available"
                    checked={formData.is_available}
                    onChange={(e) => handleChange('is_available', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_available" className="ml-2 block text-sm text-black">
                    Available (ready for use)
                  </label>
                </div>
              </div>
            </div>

            {/* Column 3 - Documents */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-black border-b pb-2">
                Document Details
              </h3>

              {/* RC Number */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  RC Number
                </label>
                <input
                  type="text"
                  value={formData.rc_number}
                  onChange={(e) => handleChange('rc_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter RC number"
                />
              </div>

              {/* Insurance Number */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Insurance Number
                </label>
                <input
                  type="text"
                  value={formData.insurance_number}
                  onChange={(e) => handleChange('insurance_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter insurance number"
                />
              </div>

              {/* Permit Number */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Permit Number
                </label>
                <input
                  type="text"
                  value={formData.permit_number}
                  onChange={(e) => handleChange('permit_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter permit number"
                />
              </div>

              {/* Guidelines */}
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                  Guidelines
                </h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Truck number and type are required</li>
                  <li>• Capacity should be in tons</li>
                  <li>• Year must be valid</li>
                  <li>• Tyre count: 4-22</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : (truck ? 'Update Truck' : 'Create Truck')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TruckForm;
