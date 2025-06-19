'use client';

import { Trash2 } from 'lucide-react';

const ManualBiltyDeleteModal = ({
  showDeleteConfirm,
  setShowDeleteConfirm,
  handleDelete
}) => {
  if (!showDeleteConfirm) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-xl bg-white">
        <div className="mt-3 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Record</h3>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to delete this station bilty summary record? This action cannot be undone.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(showDeleteConfirm)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualBiltyDeleteModal;
