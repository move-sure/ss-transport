'use client';

import React from 'react';
import { X, Image as ImageIcon, Info, Building, FileText } from 'lucide-react';

export default function BiltyInfoModal({ bilty, isOpen, onClose }) {
  if (!isOpen || !bilty) return null;

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
            {bilty.bilty_image ? (
              <div className="relative border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
                <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={bilty.bilty_image}
                    alt="Bilty"
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                  ✓ Image Available
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50">
                <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">No image uploaded</p>
                <p className="text-xs text-slate-400 mt-1">Use the Edit button to upload an image</p>
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
