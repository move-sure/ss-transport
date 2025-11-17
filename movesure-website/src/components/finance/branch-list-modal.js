import React from 'react';
import { X, Building2, MapPin, Phone } from 'lucide-react';

export default function BranchListModal({ showModal, branches, onClose, onToggleStatus }) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Finance Branches</h3>
            <p className="text-indigo-100 text-sm mt-1">{branches.length} branches</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {branches.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No branches yet</h3>
              <p className="text-gray-600">Create your first branch to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="text-indigo-600" size={20} />
                        <h4 className="text-lg font-bold text-gray-900">{branch.branch_name}</h4>
                      </div>
                      <div className="space-y-2 ml-8">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="mr-2 text-gray-400" size={16} />
                          <span>{branch.location || 'N/A'}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="mr-2 text-gray-400" size={16} />
                          <span>{branch.contact_number || 'N/A'}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(branch.created_at).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleStatus(branch)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                        branch.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
