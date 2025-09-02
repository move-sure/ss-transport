'use client';

import { Search, RefreshCw, Filter, X, Calendar, FileText, Building2, MapPin, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

const ManualBiltySearch = ({
  searchTerm,
  setSearchTerm,
  handleLoadData,
  loading,
  onAdvancedSearch,
  totalRecords = 0,
  branches = []
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);  const [advancedFilters, setAdvancedFilters] = useState({
    fromDate: '',
    toDate: '',
    grNumber: '',
    consignor: '',
    consignee: '',
    pvtMarks: '',
    paymentStatus: '',
    branchId: '',
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
  };  const handleClearAdvancedFilters = () => {
    setAdvancedFilters({
      fromDate: '',
      toDate: '',
      grNumber: '',
      consignor: '',
      consignee: '',
      pvtMarks: '',
      paymentStatus: '',
      branchId: '',
      station: ''
    });
    if (onAdvancedSearch) {
      onAdvancedSearch({});
    }
  };

  const hasActiveFilters = Object.values(advancedFilters).some(value => value !== '');

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 rounded-3xl shadow-xl border border-blue-100/50 mb-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -translate-y-32 translate-x-32"></div>
      
      {/* Basic Search Header */}
      <div className="relative p-8 border-b border-blue-100/50">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
          <div className="flex-1 max-w-2xl">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-blue-400 group-focus-within:text-blue-600 transition-colors" />
              </div>              
              <input
                type="text"
                placeholder="Quick search by station, GR no, consignor, consignee, or PVT marks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 placeholder-gray-500 shadow-lg transition-all duration-300 focus:shadow-xl focus:bg-white"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <p className="text-sm text-blue-600 font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {totalRecords > 0 ? `${totalRecords.toLocaleString()} records found` : 'Enter search terms above'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                  : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white border border-blue-200/50'
              }`}
            >
              <Filter className="w-5 h-5" />
              Advanced
              {hasActiveFilters && (
                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-bold">
                  {Object.values(advancedFilters).filter(v => v !== '').length}
                </span>
              )}
            </button>
            
            <button
              onClick={handleLoadData}
              disabled={loading}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="relative p-8 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-blue-100/50">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <Filter className="w-4 h-4 text-white" />
                </div>
                Advanced Search Filters
              </h3>
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Date Range */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  From Date
                </label>
                <input
                  type="date"
                  value={advancedFilters.fromDate}
                  onChange={(e) => handleAdvancedFilterChange('fromDate', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 shadow-sm transition-all duration-300 focus:shadow-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  To Date
                </label>
                <input
                  type="date"
                  value={advancedFilters.toDate}
                  onChange={(e) => handleAdvancedFilterChange('toDate', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 shadow-sm transition-all duration-300 focus:shadow-lg"
                />
              </div>

              {/* Branch Selection */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Branch
                </label>
                <select
                  value={advancedFilters.branchId}
                  onChange={(e) => handleAdvancedFilterChange('branchId', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 shadow-sm transition-all duration-300 focus:shadow-lg"
                >
                  <option value="">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name} ({branch.branch_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* GR Number */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText className="w-4 h-4 text-blue-500" />
                  GR Number
                </label>
                <input
                  type="text"
                  value={advancedFilters.grNumber}
                  onChange={(e) => handleAdvancedFilterChange('grNumber', e.target.value)}
                  placeholder="Enter GR number"
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 shadow-sm transition-all duration-300 focus:shadow-lg placeholder-gray-500"
                />
              </div>

              {/* Station */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Station
                </label>
                <input
                  type="text"
                  value={advancedFilters.station}
                  onChange={(e) => handleAdvancedFilterChange('station', e.target.value)}
                  placeholder="Enter station name"
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 shadow-sm transition-all duration-300 focus:shadow-lg placeholder-gray-500"
                />
              </div>

              {/* Consignor */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">C</span>
                  Consignor
                </label>
                <input
                  type="text"
                  value={advancedFilters.consignor}
                  onChange={(e) => handleAdvancedFilterChange('consignor', e.target.value)}
                  placeholder="Enter consignor name"
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 shadow-sm transition-all duration-300 focus:shadow-lg placeholder-gray-500"
                />
              </div>

              {/* Consignee */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">C</span>
                  Consignee
                </label>
                <input
                  type="text"
                  value={advancedFilters.consignee}
                  onChange={(e) => handleAdvancedFilterChange('consignee', e.target.value)}
                  placeholder="Enter consignee name"
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 shadow-sm transition-all duration-300 focus:shadow-lg placeholder-gray-500"
                />
              </div>

              {/* PVT Marks */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">P</span>
                  PVT Marks
                </label>
                <input
                  type="text"
                  value={advancedFilters.pvtMarks}
                  onChange={(e) => handleAdvancedFilterChange('pvtMarks', e.target.value)}
                  placeholder="Enter PVT marks"
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 shadow-sm transition-all duration-300 focus:shadow-lg placeholder-gray-500"
                />
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">$</span>
                  Payment Status
                </label>
                <select
                  value={advancedFilters.paymentStatus}
                  onChange={(e) => handleAdvancedFilterChange('paymentStatus', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 shadow-sm transition-all duration-300 focus:shadow-lg"
                >
                  <option value="">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="to-pay">To Pay</option>
                  <option value="foc">FOC</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-6 border-t border-blue-100">
              <button
                onClick={handleApplyAdvancedSearch}
                className="flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Search className="w-5 h-5" />
                Apply Filters
              </button>
              
              {hasActiveFilters && (
                <button
                  onClick={handleClearAdvancedFilters}
                  className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <X className="w-5 h-5" />
                  Clear All
                </button>
              )}
              
              <div className="ml-auto text-sm text-blue-600 font-medium bg-blue-50 px-4 py-2 rounded-lg">
                <Sparkles className="w-4 h-4 inline mr-2" />
                Search across all records in the database
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualBiltySearch;
