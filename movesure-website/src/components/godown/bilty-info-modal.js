'use client';

import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Info, Building, FileText, Upload, Loader2, Check, Trash2 } from 'lucide-react';
import supabase from '../../app/utils/supabase';

export default function BiltyInfoModal({ bilty, isOpen, onClose, onImageUpdate, isTransit = false }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localImageUrl, setLocalImageUrl] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen || !bilty) return null;

  // Determine if this is a station bilty (has 'station' field) or regular bilty
  const isStationBilty = !!bilty?.station;
  
  // Use transit-bilty bucket for regular bilties and transit bilties, bilty bucket for station bilties
  const bucketName = isStationBilty ? 'bilty' : 'transit-bilty';

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);

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

      setUploadProgress(85);

      // Determine which table to update based on bilty source
      // station bilties have 'station' field, regular bilties have 'to_city_id' field
      const tableName = isTransit ? 'transit_bilty' : (bilty.station ? 'station_bilty_summary' : 'bilty');
      
      // Update the bilty record in database with new image URL
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ bilty_image: publicUrl })
        .eq('id', bilty.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      setUploadProgress(100);
      setLocalImageUrl(publicUrl);

      // Notify parent component about the update
      if (onImageUpdate) {
        onImageUpdate(bilty.gr_no, publicUrl);
      }

      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(`Error uploading image: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!confirm('Are you sure you want to remove this image?')) return;

    try {
      setUploading(true);

      // Extract file path from URL if it's a Supabase URL
      const currentImageUrl = localImageUrl || bilty.bilty_image;
      if (currentImageUrl && currentImageUrl.includes(bucketName)) {
        const urlParts = currentImageUrl.split(`${bucketName}/`);
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          // Try to delete from storage (ignore errors as file might not exist)
          await supabase.storage.from(bucketName).remove([filePath]);
        }
      }

      // Determine which table to update based on bilty source
      const tableName = isTransit ? 'transit_bilty' : (bilty.station ? 'station_bilty_summary' : 'bilty');
      
      // Update the bilty record in database to remove image
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ bilty_image: null })
        .eq('id', bilty.id);

      if (updateError) {
        throw new Error(`Failed to remove image: ${updateError.message}`);
      }

      setLocalImageUrl(null);

      // Notify parent component about the update
      if (onImageUpdate) {
        onImageUpdate(bilty.gr_no, null);
      }

      alert('Image removed successfully!');
    } catch (error) {
      console.error('Error removing image:', error);
      alert(`Error removing image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Use local state if image was just uploaded, otherwise use bilty data
  const displayImageUrl = localImageUrl || bilty.bilty_image;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 sm:p-6 rounded-t-xl flex justify-between items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Bilty Information</h2>
            <p className="text-sm text-indigo-100 mt-1">GR No: {bilty.gr_no}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Basic Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-600" />
              Basic Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">GR Number</p>
                <p className="text-sm font-medium text-slate-800">{bilty.gr_no || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Station</p>
                <p className="text-sm font-medium text-slate-800">{bilty.station_destination || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Consignor</p>
                <p className="text-sm font-medium text-slate-800">{bilty.consignor_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Consignee</p>
                <p className="text-sm font-medium text-slate-800">{bilty.consignee_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">No. of Packets</p>
                <p className="text-sm font-medium text-slate-800">{bilty.no_of_bags || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Weight</p>
                <p className="text-sm font-medium text-slate-800">{bilty.weight ? `${parseFloat(bilty.weight).toFixed(3)} kg` : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* W Name */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-blue-600" />
              W Name
            </h3>
            {bilty.w_name ? (
              <div className="flex items-center gap-2">
                <span className="text-sm bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
                  {bilty.w_name}
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No W Name assigned</p>
            )}
          </div>

          {/* Head Branch Status */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <Building className="w-5 h-5 text-green-600" />
              Head Branch Status
            </h3>
            <div className="flex items-center gap-2">
              {bilty.is_in_head_branch ? (
                <span className="text-sm bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  In Head Branch
                </span>
              ) : (
                <span className="text-sm bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-medium">
                  Not in Head Branch
                </span>
              )}
            </div>
          </div>

          {/* Bilty Image */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <ImageIcon className="w-5 h-5 text-purple-600" />
              Bilty Image
            </h3>
            
            {/* Upload Section */}
            <div className="mb-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
                id="bilty-image-upload"
                disabled={uploading}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <label
                  htmlFor="bilty-image-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium cursor-pointer transition-all ${
                    uploading 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      {displayImageUrl ? 'Replace Image' : 'Upload Image'}
                    </>
                  )}
                </label>
                
                {displayImageUrl && !uploading && (
                  <button
                    onClick={handleRemoveImage}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    Remove Image
                  </button>
                )}
              </div>
              
              {/* Upload Progress */}
              {uploading && uploadProgress > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
                    <span>Uploading to {bucketName} bucket...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-slate-500 mt-2">
                Supported formats: JPG, PNG, GIF, WebP (Max size: 10MB)
              </p>
            </div>

            {/* Image Display */}
            {displayImageUrl ? (
              <div className="relative border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
                <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={displayImageUrl}
                    alt="Bilty"
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Image Available
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50">
                <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">No image uploaded</p>
                <p className="text-xs text-slate-400 mt-1">Click "Upload Image" button above to add an image</p>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
