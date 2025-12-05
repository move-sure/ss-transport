'use client';

import { AlertCircle } from 'lucide-react';

const DeleteConfirmModal = ({ showDeleteConfirm, setShowDeleteConfirm, onDelete }) => {
  if (!showDeleteConfirm) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Profile?</h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this rate profile? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(showDeleteConfirm)}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
