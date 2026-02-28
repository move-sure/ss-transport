import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

export default function PohonchBiltyForm({ initialPohonch, initialBilty, onSubmit, loading, onCancel }) {
  const [pohonch, setPohonch] = useState(initialPohonch);
  const [bilty, setBilty] = useState(initialBilty);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(pohonch, bilty);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pohonch Number
          </label>
          <input
            type="text"
            value={pohonch}
            onChange={(e) => setPohonch(e.target.value)}
            placeholder="Enter pohonch number"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Manual Bilty No
          </label>
          <input
            type="text"
            value={bilty}
            onChange={(e) => setBilty(e.target.value)}
            placeholder="Enter manual bilty number"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}
