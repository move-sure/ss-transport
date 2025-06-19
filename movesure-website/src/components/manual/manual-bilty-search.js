'use client';

import { Search, RefreshCw, Filter, X, Calendar, FileText } from 'lucide-react';
import { useState } from 'react';

const ManualBiltySearch = ({
  searchTerm,
  setSearchTerm,
  handleLoadData,
  loading,
  onAdvancedSearch,
  totalRecords = 0
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    fromDate: '',
    toDate: '',
    grNumber: '',
    consignor: '',
    consignee: '',
    pvtMarks: '',
    paymentStatus: '',
    station: ''
  });

  const handleAdvancedFilterChange = (field, value) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyAdvancedSearch = () => {
    if (onAdvancedSearch) {
      onAdvancedSearch(advancedFilters);
    }
  };

  const handleClearAdvancedFilters = () => {
    setAdvancedFilters({
      fromDate: '',
      toDate: '',
      grNumber: '',
      consignor: '',
      consignee: '',
      pvtMarks: '',
      paymentStatus: '',
      station: ''
    });
    if (onAdvancedSearch) {
      onAdvancedSearch({});
    }
  };

  const hasActiveFilters = Object.values(advancedFilters).some(value => value !== '');

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6">
      {/* Basic Search Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Quick search by station, GR no, consignor, consignee, or PVT marks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalRecords > 0 && `Total records: ${totalRecords.toLocaleString()}`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              Advanced
              {hasActiveFilters && (
                <span className="bg-blue-800 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {Object.values(advancedFilters).filter(v => v !== '').length}
                </span>
              )}
            </button>
            
            <button
              onClick={handleLoadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Advanced Search Filters
              </h3>
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  From Date
                </label>
                <input
                  type="date"
                  value={advancedFilters.fromDate}
                  onChange={(e) => handleAdvancedFilterChange('fromDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  To Date
                </label>
                <input
                  type="date"
                  value={advancedFilters.toDate}
                  onChange={(e) => handleAdvancedFilterChange('toDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                />
              </div>

              {/* Station */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Station
                </label>
                <input
                  type="text"
                  value={advancedFilters.station}
                  onChange={(e) => handleAdvancedFilterChange('station', e.target.value)}
                  placeholder="Enter station name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                />
              </div>

              {/* GR Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  GR Number
                </label>
                <input
                  type="text"
                  value={advancedFilters.grNumber}
                  onChange={(e) => handleAdvancedFilterChange('grNumber', e.target.value)}
                  placeholder="Enter GR number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                />
              </div>

              {/* Consignor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consignor
                </label>
                <input
                  type="text"
                  value={advancedFilters.consignor}
                  onChange={(e) => handleAdvancedFilterChange('consignor', e.target.value)}
                  placeholder="Enter consignor name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                />
              </div>

              {/* Consignee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consignee
                </label>
                <input
                  type="text"
                  value={advancedFilters.consignee}
                  onChange={(e) => handleAdvancedFilterChange('consignee', e.target.value)}
                  placeholder="Enter consignee name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                />
              </div>

              {/* PVT Marks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PVT Marks
                </label>
                <input
                  type="text"
                  value={advancedFilters.pvtMarks}
                  onChange={(e) => handleAdvancedFilterChange('pvtMarks', e.target.value)}
                  placeholder="Enter PVT marks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                />
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <select
                  value={advancedFilters.paymentStatus}
                  onChange={(e) => handleAdvancedFilterChange('paymentStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                >
                  <option value="">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="to-pay">To Pay</option>
                  <option value="foc">FOC</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-4">
              <button
                onClick={handleApplyAdvancedSearch}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Search className="w-4 h-4" />
                Apply Filters
              </button>
              
              {hasActiveFilters && (
                <button
                  onClick={handleClearAdvancedFilters}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              )}
              
              <div className="ml-auto text-sm text-gray-600">
                Search across all records in the database (not just current page)
              </div>
            </div>
          </div>
        </div>      )}
    </div>
  );
};

export default ManualBiltySearch;
