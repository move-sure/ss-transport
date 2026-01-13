'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import wNameConfig from './w-name-options.json';

export default function EditBiltyModal({ bilty, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    w_name: bilty?.w_name || '',
    w_name_other: '',
    is_in_head_branch: bilty?.is_in_head_branch || false,
    bilty_image: bilty?.bilty_image || null,
    transit_bilty_image: bilty?.transit_bilty_image || null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [biltyImagePreview, setBiltyImagePreview] = useState(bilty?.bilty_image || null);
  const [transitImagePreview, setTransitImagePreview] = useState(bilty?.transit_bilty_image || null);
  
  const biltyImageRef = useRef(null);
  const transitImageRef = useRef(null);

  // Convert image to base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle image upload
  const handleImageUpload = async (e, imageType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      
      if (imageType === 'bilty') {
        setFormData(prev => ({ ...prev, bilty_image: base64 }));
        setBiltyImagePreview(base64);
      } else {
        setFormData(prev => ({ ...prev, transit_bilty_image: base64 }));
        setTransitImagePreview(base64);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error converting image:', err);
      setError('Failed to process image. Please try again.');
    }
  };

  // Remove image
  const removeImage = (imageType) => {
    if (imageType === 'bilty') {
      setFormData(prev => ({ ...prev, bilty_image: null }));
      setBiltyImagePreview(null);
      if (biltyImageRef.current) biltyImageRef.current.value = '';
    } else {
      setFormData(prev => ({ ...prev, transit_bilty_image: null }));
      setTransitImagePreview(null);
      if (transitImageRef.current) transitImageRef.current.value = '';
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Prepare update data
      const updateData = {
        w_name: formData.w_name === 'other' ? formData.w_name_other : formData.w_name,
        is_in_head_branch: formData.is_in_head_branch,
        bilty_image: formData.bilty_image,
        transit_bilty_image: formData.transit_bilty_image
      };

      // Update in database
      const { error: updateError } = await supabase
        .from('station_bilty_summary')
        .update(updateData)
        .eq('id', bilty.id);

      if (updateError) throw updateError;

      setSuccess(true);
      
      // Call onUpdate callback
      if (onUpdate) {
        onUpdate({ ...bilty, ...updateData });
      }

      // Close modal after 1 second
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (err) {
      console.error('Error updating bilty:', err);
      setError(err.message || 'Failed to update bilty. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6 rounded-t-xl flex justify-between items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Edit Bilty Details</h2>
            <p className="text-sm text-blue-100 mt-1">GR No: {bilty?.gr_no}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">
                Bilty updated successfully! Closing...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* W Name Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              W Name
            </label>
            <select
              value={formData.w_name}
              onChange={(e) => setFormData(prev => ({ ...prev, w_name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value="">Select W Name</option>
              {wNameConfig.wNameOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Other W Name Input */}
          {formData.w_name === 'other' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Specify Other W Name
              </label>
              <input
                type="text"
                value={formData.w_name_other}
                onChange={(e) => setFormData(prev => ({ ...prev, w_name_other: e.target.value }))}
                placeholder="Enter custom W Name"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>
          )}

          {/* Is In Head Branch */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_in_head_branch}
                onChange={(e) => setFormData(prev => ({ ...prev, is_in_head_branch: e.target.checked }))}
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-700">Is In Head Branch</span>
                <p className="text-xs text-slate-500 mt-0.5">Check if this bilty is in head branch</p>
              </div>
            </label>
          </div>

          {/* Bilty Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Bilty Image
            </label>
            
            {biltyImagePreview ? (
              <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
                <img
                  src={biltyImagePreview}
                  alt="Bilty Preview"
                  className="w-full h-48 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage('bilty')}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-slate-50">
                <input
                  ref={biltyImageRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'bilty')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => biltyImageRef.current?.click()}
                  className="flex flex-col items-center gap-2 mx-auto"
                >
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">
                    Click to upload bilty image
                  </span>
                  <span className="text-xs text-slate-500">
                    PNG, JPG up to 5MB
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Transit Bilty Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Transit Bilty Image
            </label>
            
            {transitImagePreview ? (
              <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
                <img
                  src={transitImagePreview}
                  alt="Transit Bilty Preview"
                  className="w-full h-48 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage('transit')}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-slate-50">
                <input
                  ref={transitImageRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'transit')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => transitImageRef.current?.click()}
                  className="flex flex-col items-center gap-2 mx-auto"
                >
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">
                    Click to upload transit bilty image
                  </span>
                  <span className="text-xs text-slate-500">
                    PNG, JPG up to 5MB
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : success ? 'Updated!' : 'Update Bilty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
