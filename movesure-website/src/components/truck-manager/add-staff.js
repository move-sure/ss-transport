'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Users, Upload, Phone } from 'lucide-react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

const StaffForm = ({ staff, onSave, onClose }) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    post: '',
    mobile_number: '',
    license_number: '',
    aadhar_number: '',
    image_url: '',
    is_active: true
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name || '',
        post: staff.post || '',
        mobile_number: staff.mobile_number || '',
        license_number: staff.license_number || '',
        aadhar_number: staff.aadhar_number || '',
        image_url: staff.image_url || '',
        is_active: staff.is_active !== undefined ? staff.is_active : true
      });
    }
  }, [staff]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.post.trim()) {
      newErrors.post = 'Post is required';
    }

    if (formData.mobile_number && !/^[6-9]\d{9}$/.test(formData.mobile_number)) {
      newErrors.mobile_number = 'Invalid mobile number';
    }

    if (formData.aadhar_number && !/^\d{12}$/.test(formData.aadhar_number.replace(/\s/g, ''))) {
      newErrors.aadhar_number = 'Invalid Aadhar number (12 digits required)';
    }

    if (formData.license_number && formData.license_number.length < 8) {
      newErrors.license_number = 'Invalid license number';
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

      // Prepare data for saving
      const saveData = {
        ...formData,
        name: formData.name.trim(),
        post: formData.post.trim(),
        mobile_number: formData.mobile_number || null,
        license_number: formData.license_number || null,
        aadhar_number: formData.aadhar_number ? formData.aadhar_number.replace(/\s/g, '') : null,
        image_url: formData.image_url || null
      };

      let result;

      if (staff) {
        // Update existing staff
        const { data, error } = await supabase
          .from('staff')
          .update(saveData)
          .eq('id', staff.id)
          .select('*')
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new staff
        const { data, error } = await supabase
          .from('staff')
          .insert([saveData])
          .select('*')
          .single();

        if (error) throw error;
        result = data;
      }

      onSave(result);
      alert(staff ? 'Staff updated successfully!' : 'Staff created successfully!');
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Error saving staff. Please try again.');
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        handleChange('image_url', event.target.result);
        setUploadingImage(false);
      };
      reader.onerror = () => {
        alert('Error reading file');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
      setUploadingImage(false);
    }
  };

  const staffPosts = [
    'driver',
    'conductor',
    'owner',
    'driver,owner',
    'mechanic',
    'helper',
    'cleaner',
    'supervisor',
    'manager'
  ];

  const formatAadhar = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
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
            {/* Column 1 - Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-black border-b pb-2">
                Basic Information
              </h3>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter full name"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* Post */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Post/Position *
                </label>
                <select
                  value={formData.post}
                  onChange={(e) => handleChange('post', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                    errors.post ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select post</option>
                  {staffPosts.map(post => (
                    <option key={post} value={post}>
                      {post.charAt(0).toUpperCase() + post.slice(1).replace(',', ', ')}
                    </option>
                  ))}
                </select>
                {errors.post && (
                  <p className="text-red-500 text-xs mt-1">{errors.post}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={formData.mobile_number}
                  onChange={(e) => handleChange('mobile_number', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                    errors.mobile_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="9876543210"
                  maxLength={10}
                />
                {errors.mobile_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.mobile_number}</p>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-black">
                  Active (currently employed)
                </label>
              </div>
            </div>

            {/* Column 2 - Documents & Image */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-black border-b pb-2">
                Documents & Photo
              </h3>

              {/* License Number */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Driving License Number
                </label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => handleChange('license_number', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                    errors.license_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="MH0120210012345"
                />
                {errors.license_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.license_number}</p>
                )}
              </div>

              {/* Aadhar Number */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Aadhar Number
                </label>
                <input
                  type="text"
                  value={formData.aadhar_number}
                  onChange={(e) => handleChange('aadhar_number', formatAadhar(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                    errors.aadhar_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1234 5678 9012"
                  maxLength={14}
                />
                {errors.aadhar_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.aadhar_number}</p>
                )}
              </div>

              {/* Image Upload Section */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-black">
                  Profile Photo
                </label>
                
                {/* Image Preview */}
                {formData.image_url ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.image_url}
                      alt="Staff preview"
                      className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleChange('image_url', '')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                )}

                {/* Upload Button */}
                <div>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                      uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                  </label>
                </div>
              </div>
            </div>

            {/* Column 3 - Guidelines */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-black border-b pb-2">
                Guidelines
              </h3>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                  Staff Information Guidelines
                </h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Name and Post are mandatory fields</li>
                  <li>• Mobile: 10 digits starting with 6-9</li>
                  <li>• License required for drivers</li>
                  <li>• Aadhar should be 12 digits</li>
                  <li>• Photo helps in identification</li>
                  <li>• Use combinations like driver,owner</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                  Available Posts
                </h4>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                  <div>• Driver</div>
                  <div>• Conductor</div>
                  <div>• Owner</div>
                  <div>• Driver, Owner</div>
                  <div>• Mechanic</div>
                  <div>• Helper</div>
                  <div>• Cleaner</div>
                  <div>• Supervisor</div>
                  <div>• Manager</div>
                </div>
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
              disabled={saving || uploadingImage}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : (staff ? 'Update Staff' : 'Create Staff')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffForm;
