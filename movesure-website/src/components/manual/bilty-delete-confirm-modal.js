import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

export default function BiltyDeleteConfirmModal({
  showModal,
  biltyToDelete,
  onClose,
  onConfirmDelete,
  deleting
}) {
  const [deleteReason, setDeleteReason] = useState('');

  if (!showModal || !biltyToDelete) return null;

  const handleConfirm = () => {
    onConfirmDelete(biltyToDelete.id, deleteReason);
    setDeleteReason(''); // Reset reason after deletion
  };

  const handleClose = () => {
    setDeleteReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-2 border-red-200">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle size={24} />
            Confirm Deletion
          </h2>
          <button 
            onClick={handleClose}
            disabled={deleting}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <p className="text-red-800 font-semibold mb-2">
              Are you sure you want to delete this bilty?
            </p>
            <p className="text-red-600 text-sm">
              This action will archive the record and remove it from the active list.
            </p>
          </div>

          {/* Bilty Details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">GR Number:</span>
              <span className="text-gray-900 font-bold">{biltyToDelete.gr_no}</span>
            </div>
            {biltyToDelete.station && (
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Station:</span>
                <span className="text-gray-900">{biltyToDelete.station}</span>
              </div>
            )}
            {biltyToDelete.consignor && (
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Consignor:</span>
                <span className="text-gray-900">{biltyToDelete.consignor}</span>
              </div>
            )}
            {biltyToDelete.consignee && (
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Consignee:</span>
                <span className="text-gray-900">{biltyToDelete.consignee}</span>
              </div>
            )}
          </div>

          {/* Delete Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Deletion (Optional)
            </label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              disabled={deleting}
              rows="3"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none disabled:bg-gray-100"
              placeholder="Enter reason for deletion..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={deleting}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={deleting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Delete Bilty
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
