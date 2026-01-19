'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, CheckCircle, AlertCircle, Camera, Loader2 } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import wNameConfig from './w-name-options.json';

export default function EditBiltyModal({ bilty, onClose, onUpdate, isTransit = false }) {
  const [formData, setFormData] = useState({
    w_name: bilty?.w_name || '',
    w_name_other: '',
    is_in_head_branch: bilty?.is_in_head_branch || false,
    bilty_image: bilty?.bilty_image || null
  });
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [biltyImagePreview, setBiltyImagePreview] = useState(bilty?.bilty_image || null);
  const [isExistingImage, setIsExistingImage] = useState(!!bilty?.bilty_image);
  
  const biltyImageRef = useRef(null);

  // Determine which bucket to use
  const bucketName = isTransit ? 'transit-bilty' : 'bilty';

  // Handle image upload to Supabase storage
  const handleImageUpload = async (e, imageType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);
      setError(null);

      // Generate unique filename with gr_no and timestamp
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${bilty.gr_no}_${timestamp}.${fileExt}`;
      const filePath = `bilty-images/${fileName}`;

      setUploadProgress(30);

      // Upload to Supabase storage bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadProgress(70);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      setUploadProgress(100);

      // Update form data with the public URL
      setFormData(prev => ({ ...prev, bilty_image: publicUrl }));
      setBiltyImagePreview(publicUrl);
      setIsExistingImage(false); // Mark as new image

      setError(null);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(`Failed to upload image: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Remove image
  const removeImage = async () => {
    try {
      // If there's an existing image URL from Supabase, try to delete it
      const currentImageUrl = formData.bilty_image;
      if (currentImageUrl && currentImageUrl.includes(bucketName)) {
        const urlParts = currentImageUrl.split(`${bucketName}/`);
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          // Try to delete from storage (ignore errors)
          await supabase.storage.from(bucketName).remove([filePath]);
        }
      }
    } catch (err) {
      console.error('Error deleting image from storage:', err);
    }

    setFormData(prev => ({ ...prev, bilty_image: null }));
    setBiltyImagePreview(null);
    setIsExistingImage(false);
    if (biltyImageRef.current) biltyImageRef.current.value = '';
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
        bilty_image: formData.bilty_image
      };

      // Update in database
      const { error: updateError } = await supabase
        .from('station_bilty_summary')
        .update(updateData)
        .eq('id', bilty.id);

      if (updateError) throw updateError;

      setSuccess(true);
      
      // Close modal after 1 second and trigger refresh
      setTimeout(() => {
        onClose();
        // Call onUpdate callback to refresh the data
        if (onUpdate) {
          onUpdate({ ...bilty, ...updateData });
        }
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
              {isExistingImage && (
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  ✓ Image Uploaded
                </span>
              )}
              {biltyImagePreview && !isExistingImage && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  ● New Image Selected
                </span>
              )}
            </label>

            {/* Upload Progress */}
            {uploading && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading to {bucketName} bucket...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {biltyImagePreview ? (
              <div className="space-y-3">
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
                  <img
                    src={biltyImagePreview}
                    alt="Bilty Preview"
                    className="w-full h-64 object-contain rounded-lg bg-white"
                  />
                  {isExistingImage && (
                    <div className="absolute top-4 left-4 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                      Existing Image
                    </div>
                  )}
                  {!isExistingImage && (
                    <div className="absolute top-4 left-4 bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                      New Image
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={removeImage}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors shadow-md"
                  >
                    <X className="w-4 h-4" />
                    Delete Image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (biltyImageRef.current) {
                        biltyImageRef.current.removeAttribute('capture');
                        biltyImageRef.current.click();
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-md"
                  >
                    <Upload className="w-4 h-4" />
                    Replace Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
                <input
                  ref={biltyImageRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'bilty')}
                  className="hidden"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (biltyImageRef.current) {
                        biltyImageRef.current.capture = 'environment';
                        biltyImageRef.current.click();
                      }
                    }}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                  >
                    <Camera className="w-8 h-8 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">
                      Take Photo
                    </span>
                    <span className="text-xs text-slate-500">
                      Use camera
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (biltyImageRef.current) {
                        biltyImageRef.current.removeAttribute('capture');
                        biltyImageRef.current.click();
                      }
                    }}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-slate-300 rounded-lg hover:bg-slate-100 hover:border-slate-400 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">
                      Upload Image
                    </span>
                    <span className="text-xs text-slate-500">
                      From gallery
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || uploading}
              className="flex-1 px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success || uploading}
              className="flex-1 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : success ? 'Updated!' : uploading ? 'Wait...' : 'Update Bilty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
