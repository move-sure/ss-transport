import React from 'react';

export default function EWBFilter({ filterType, setFilterType, hasEWBCount, noEWBCount }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All GR Numbers
            </button>
            <button
              onClick={() => setFilterType('with_ewb')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'with_ewb'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              With E-Way Bill ({hasEWBCount})
            </button>
            <button
              onClick={() => setFilterType('without_ewb')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'without_ewb'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Without E-Way Bill ({noEWBCount})
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Has E-Way Bill</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>No E-Way Bill</span>
          </div>
        </div>
      </div>
    </div>
  );
}
