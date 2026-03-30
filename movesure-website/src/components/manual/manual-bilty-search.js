'use client';

import { Search, RefreshCw, Filter, X, Calendar, FileText, Building2, MapPin, Sparkles, Hash, Truck } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

// City filter dropdown with autocomplete
const CityFilterDropdown = ({ cities, selectedCityId, onCitySelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = cities.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (c.city_code || '').toLowerCase().includes(term) || (c.city_name || '').toLowerCase().includes(term);
  });

  const selectedCity = cities.find(c => c.id === selectedCityId);

  const handleSelect = (city) => {
    onCitySelect(city ? city.id : null);
    setSearchTerm('');
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-4 w-4 text-purple-400" />
          </div>
          <input
            type="text"
            placeholder={selectedCity ? `${selectedCity.city_code} - ${selectedCity.city_name}` : 'Filter by city...'}
            value={showDropdown ? searchTerm : ''}
            onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            className={`w-full pl-9 pr-8 py-3 bg-white/80 backdrop-blur-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm shadow-sm transition-all ${
              selectedCityId ? 'border-purple-400 bg-purple-50/50' : 'border-blue-200/50'
            }`}
          />
          {selectedCityId && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSelect(null); }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto">
          <button
            onClick={() => handleSelect(null)}
            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-purple-50 transition-colors ${
              !selectedCityId ? 'bg-purple-50 font-semibold text-purple-700' : 'text-gray-600'
            }`}
          >
            All Cities
          </button>
          {filtered.map(city => (
            <button
              key={city.id}
              onClick={() => handleSelect(city)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-purple-50 transition-colors flex items-center justify-between ${
                selectedCityId === city.id ? 'bg-purple-50 font-semibold text-purple-700' : 'text-gray-700'
              }`}
            >
              <span>{city.city_code} - {city.city_name}</span>
              {selectedCityId === city.id && <span className="text-purple-500 text-xs">✓</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">No cities found</div>
          )}
        </div>
      )}
    </div>
  );
};

// Compact city dropdown for advanced filters
const AdvancedCityDropdown = ({ cities, selectedCityId, onCitySelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = cities.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (c.city_code || '').toLowerCase().includes(term) || (c.city_name || '').toLowerCase().includes(term);
  });

  const selectedCity = cities.find(c => c.id === selectedCityId);

  const handleSelect = (city) => {
    onCitySelect(city ? city.id : null);
    setSearchTerm('');
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          placeholder={selectedCity ? `${selectedCity.city_code} - ${selectedCity.city_name}` : 'Search city...'}
          value={showDropdown ? searchTerm : ''}
          onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          className={`w-full px-3 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm shadow-sm ${
            selectedCityId ? 'border-purple-400 bg-purple-50/30' : 'border-blue-200/50'
          }`}
        />
        {selectedCityId && (
          <button
            onClick={(e) => { e.stopPropagation(); handleSelect(null); }}
            className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-red-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-48 overflow-y-auto">
          <button
            onClick={() => handleSelect(null)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 ${
              !selectedCityId ? 'bg-purple-50 font-semibold text-purple-700' : 'text-gray-600'
            }`}
          >
            All Cities
          </button>
          {filtered.map(city => (
            <button
              key={city.id}
              onClick={() => handleSelect(city)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 flex items-center justify-between ${
                selectedCityId === city.id ? 'bg-purple-50 font-semibold text-purple-700' : 'text-gray-700'
              }`}
            >
              <span>{city.city_code} - {city.city_name}</span>
              {selectedCityId === city.id && <span className="text-purple-500 text-xs">✓</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400 text-center">No cities found</div>
          )}
        </div>
      )}
    </div>
  );
};

const ManualBiltySearch = ({
  searchTerm,
  setSearchTerm,
  handleLoadData,
  loading,
  onAdvancedSearch,
  totalRecords = 0,
  branches = [],
  cities = [],
  transports = [],
  selectedCityId = null,
  onCityFilter
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
    branchId: '',
    station: '',
    challanNo: ''
  });

  const handleAdvancedFilterChange = (field, value) => {
    setAdvancedFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyAdvancedSearch = useCallback(() => {
    if (onAdvancedSearch) {
      onAdvancedSearch(advancedFilters);
    }
  }, [advancedFilters, onAdvancedSearch]);

  const handleClearAdvancedFilters = () => {
    const cleared = {
      fromDate: '',
      toDate: '',
      grNumber: '',
      consignor: '',
      consignee: '',
      pvtMarks: '',
      paymentStatus: '',
      branchId: '',
      station: '',
      challanNo: ''
    };
    setAdvancedFilters(cleared);
    if (onAdvancedSearch) {
      onAdvancedSearch({});
    }
  };

  const hasActiveFilters = Object.values(advancedFilters).some(value => value !== '');
  const activeFilterCount = Object.values(advancedFilters).filter(v => v !== '').length;

  return (
    <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 rounded-3xl shadow-xl border border-blue-100/50 mb-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -translate-y-32 translate-x-32 pointer-events-none"></div>
      
      {/* Basic Search + City Filter */}
      <div className="relative p-6 lg:p-8 border-b border-blue-100/50">
        <div className="flex flex-col gap-4">
          {/* Search Row */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch">
            {/* Main search */}
            <div className="flex-1 min-w-0">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-blue-400 group-focus-within:text-blue-600 transition-colors" />
                </div>              
                <input
                  type="text"
                  placeholder="Search by station, GR, consignor, consignee, challan no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-gray-900 placeholder-gray-500 shadow-lg transition-all duration-300 focus:shadow-xl focus:bg-white"
                />
              </div>
            </div>

            {/* City Filter - Inline next to search */}
            <div className="w-full lg:w-56 shrink-0">
              <CityFilterDropdown
                cities={cities}
                selectedCityId={selectedCityId}
                onCitySelect={onCityFilter}
              />
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  showAdvancedFilters || hasActiveFilters
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                    : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white border border-blue-200/50'
                }`}
              >
                <Filter className="w-5 h-5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={handleLoadData}
                disabled={loading}
                className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Record count + Transport Info */}
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-sm text-blue-600 font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {totalRecords > 0 ? `${totalRecords.toLocaleString()} total records` : 'Enter search terms above'}
            </p>
            
            {/* Transport info badge - shows when city is selected */}
            {selectedCityId && (() => {
              const cityTransports = transports.filter(t => t.city_id === selectedCityId);
              if (cityTransports.length === 0) return null;
              return cityTransports.map(t => (
                <span key={t.id} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-xl shadow-sm">
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold">{t.transport_name}</span>
                  {t.gst_number && (
                    <span className="text-[11px] text-blue-500 font-mono border-l border-blue-200 pl-2 ml-0.5">
                      GST: {t.gst_number}
                    </span>
                  )}
                </span>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="relative p-6 lg:p-8 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-blue-100/50">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
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

            {/* Challan & City Filters Row */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200/50">
              <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-4">
                <Hash className="w-4 h-4" />
                Challan & City Filters
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Challan Number */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <Hash className="w-3.5 h-3.5 text-blue-500" />
                    Challan Number
                  </label>
                  <input
                    type="text"
                    value={advancedFilters.challanNo}
                    onChange={(e) => handleAdvancedFilterChange('challanNo', e.target.value)}
                    placeholder="Search challan no..."
                    className="w-full px-3 py-2.5 bg-white border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 shadow-sm placeholder-gray-400"
                  />
                </div>

                {/* City Search */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    City / Station
                  </label>
                  <AdvancedCityDropdown
                    cities={cities}
                    selectedCityId={advancedFilters.station}
                    onCitySelect={(cityId) => handleAdvancedFilterChange('station', cityId || '')}
                  />
                </div>
              </div>
            </div>

            {/* General Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Date Range */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  From Date
                </label>
                <input
                  type="date"
                  value={advancedFilters.fromDate}
                  onChange={(e) => handleAdvancedFilterChange('fromDate', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  To Date
                </label>
                <input
                  type="date"
                  value={advancedFilters.toDate}
                  onChange={(e) => handleAdvancedFilterChange('toDate', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 shadow-sm"
                />
              </div>

              {/* Branch */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  Branch
                </label>
                <select
                  value={advancedFilters.branchId}
                  onChange={(e) => handleAdvancedFilterChange('branchId', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 shadow-sm"
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
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  GR Number
                </label>
                <input
                  type="text"
                  value={advancedFilters.grNumber}
                  onChange={(e) => handleAdvancedFilterChange('grNumber', e.target.value)}
                  placeholder="Enter GR number"
                  className="w-full px-3 py-2.5 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 shadow-sm placeholder-gray-400"
                />
              </div>

              {/* Consignor */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">C</span>
                  Consignor
                </label>
                <input
                  type="text"
                  value={advancedFilters.consignor}
                  onChange={(e) => handleAdvancedFilterChange('consignor', e.target.value)}
                  placeholder="Enter consignor name"
                  className="w-full px-3 py-2.5 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 shadow-sm placeholder-gray-400"
                />
              </div>

              {/* Consignee */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">C</span>
                  Consignee
                </label>
                <input
                  type="text"
                  value={advancedFilters.consignee}
                  onChange={(e) => handleAdvancedFilterChange('consignee', e.target.value)}
                  placeholder="Enter consignee name"
                  className="w-full px-3 py-2.5 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 shadow-sm placeholder-gray-400"
                />
              </div>

              {/* PVT Marks */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <span className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">P</span>
                  PVT Marks
                </label>
                <input
                  type="text"
                  value={advancedFilters.pvtMarks}
                  onChange={(e) => handleAdvancedFilterChange('pvtMarks', e.target.value)}
                  placeholder="Enter PVT marks"
                  className="w-full px-3 py-2.5 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 shadow-sm placeholder-gray-400"
                />
              </div>

              {/* Payment Status */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <span className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">₹</span>
                  Payment Status
                </label>
                <select
                  value={advancedFilters.paymentStatus}
                  onChange={(e) => handleAdvancedFilterChange('paymentStatus', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 shadow-sm"
                >
                  <option value="">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="to-pay">To Pay</option>
                  <option value="foc">FOC</option>
                </select>
              </div>
            </div>

            {/* Active Filter Tags */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-semibold text-gray-500">Active:</span>
                {Object.entries(advancedFilters)
                  .filter(([_, value]) => value !== '')
                  .map(([key, value]) => {
                    const labels = {
                      fromDate: 'From', toDate: 'To', grNumber: 'GR', consignor: 'Consignor',
                      consignee: 'Consignee', pvtMarks: 'PVT', paymentStatus: 'Payment',
                      branchId: 'Branch', station: 'City', challanNo: 'Challan'
                    };
                    const displayValue = key === 'branchId' 
                      ? branches.find(b => b.id === value)?.branch_name || value
                      : key === 'station'
                        ? (() => { const c = cities.find(c => c.id === value); return c ? `${c.city_code} - ${c.city_name}` : value; })()
                        : value;
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-200"
                      >
                        {labels[key]}: {displayValue}
                        <button
                          onClick={() => {
                            handleAdvancedFilterChange(key, '');
                            // Re-apply filters
                            const newFilters = { ...advancedFilters, [key]: '' };
                            if (onAdvancedSearch) onAdvancedSearch(newFilters);
                          }}
                          className="ml-0.5 hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4 border-t border-blue-100">
              <button
                onClick={handleApplyAdvancedSearch}
                className="flex items-center gap-2.5 px-7 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Search className="w-5 h-5" />
                Apply Filters
              </button>
              
              {hasActiveFilters && (
                <button
                  onClick={handleClearAdvancedFilters}
                  className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
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
