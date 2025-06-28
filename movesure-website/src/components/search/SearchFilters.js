'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  FileText, 
  Users, 
  CreditCard, 
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  MapPin,
  SearchIcon
} from 'lucide-react';

const BiltyFilterPanel = ({ 
  filters, 
  cities, 
  onFilterChange, 
  onClearFilters,
  onSearch,
  appliedFilters
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityInputRef = useRef(null);
  const cityDropdownRef = useRef(null);

  // Update city search term when filter changes externally
  useEffect(() => {
    if (filters.toCityId) {
      const selectedCity = cities.find(c => c.id?.toString() === filters.toCityId?.toString());
      setCitySearchTerm(selectedCity ? selectedCity.city_name : '');
    } else {
      setCitySearchTerm('');
    }
  }, [filters.toCityId, cities]);

  // Memoized filtered cities for fast search
  const filteredCities = useMemo(() => {
    if (!citySearchTerm.trim()) return cities.slice(0, 20); // Show first 20 cities when no search
    
    const searchLower = citySearchTerm.toLowerCase().trim();
    return cities.filter(city => 
      city.city_name.toLowerCase().includes(searchLower) ||
      city.city_code?.toLowerCase().includes(searchLower)
    ).slice(0, 10);
  }, [cities, citySearchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        cityDropdownRef.current && 
        !cityDropdownRef.current.contains(event.target) &&
        cityInputRef.current &&
        !cityInputRef.current.contains(event.target)
      ) {
        setShowCityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Immediate handler for all inputs (no debouncing)
  const handleInputChange = useCallback((field, value) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  }, [filters, onFilterChange]);

  // Handle city search input
  const handleCitySearchChange = useCallback((value) => {
    setCitySearchTerm(value);
    setShowCityDropdown(true);
    
    // If input is empty, clear the city filter
    if (!value.trim()) {
      handleInputChange('toCityId', '');
    }
  }, [handleInputChange]);

  // Handle city selection from dropdown
  const handleCitySelect = useCallback((city) => {
    setCitySearchTerm(city.city_name);
    setShowCityDropdown(false);
    handleInputChange('toCityId', city.id);
  }, [handleInputChange]);

  // Handle city input focus
  const handleCityInputFocus = useCallback(() => {
    setShowCityDropdown(true);
  }, []);

  // Handle keyboard navigation in city dropdown
  const handleCityInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && filteredCities.length > 0) {
      e.preventDefault();
      handleCitySelect(filteredCities[0]);
    } else if (e.key === 'Escape') {
      setShowCityDropdown(false);
    }
  }, [filteredCities, handleCitySelect]);

  // Handle search button click
  const handleSearchClick = useCallback(() => {
    onSearch();
  }, [onSearch]);

  // Handle Enter key for search
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch();
    }
  }, [onSearch]);

  const activeFiltersCount = Object.values(filters).filter(value => value !== '' && value !== null).length;
  const appliedFiltersCount = Object.values(appliedFilters).filter(value => value !== '' && value !== null).length;
  const hasActiveFilters = activeFiltersCount > 0;
  const hasAppliedFilters = appliedFiltersCount > 0;
  const hasChangesToApply = JSON.stringify(filters) !== JSON.stringify(appliedFilters);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden text-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-slate-600 p-2 rounded-lg">
              <Filter className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-md font-bold text-slate-800">Search Filters</h3>
              <p className="text-xs text-slate-600">
                {hasAppliedFilters ? `${appliedFiltersCount} applied` : 'No filters applied'} 
                {hasChangesToApply && ` • ${activeFiltersCount} pending`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <button
              onClick={handleSearchClick}
              disabled={!hasActiveFilters}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                hasChangesToApply 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                  : hasActiveFilters
                    ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <SearchIcon className="w-4 h-4" />
              {hasChangesToApply ? 'Search' : 'Applied'}
            </button>

            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {isExpanded ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleInputChange('dateFrom', e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleInputChange('dateTo', e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* GR Number */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">GR Number</label>
              <input
                type="text"
                value={filters.grNumber}
                onChange={(e) => handleInputChange('grNumber', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search GR..."
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Consignor */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Consignor</label>
              <input
                type="text"
                value={filters.consignorName}
                onChange={(e) => handleInputChange('consignorName', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search consignor..."
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Consignee */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Consignee</label>
              <input
                type="text"
                value={filters.consigneeName}
                onChange={(e) => handleInputChange('consigneeName', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search consignee..."
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* To City - Enhanced with Search */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-700 mb-1">To City</label>
              <div className="relative">
                <input
                  ref={cityInputRef}
                  type="text"
                  value={citySearchTerm}
                  onChange={(e) => handleCitySearchChange(e.target.value)}
                  onFocus={handleCityInputFocus}
                  onKeyDown={(e) => {
                    handleCityInputKeyDown(e);
                    if (e.key === 'Enter') handleKeyDown(e);
                  }}
                  placeholder="Search city..."
                  className="w-full px-2 py-1 pr-8 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                
                {/* City Dropdown */}
                {showCityDropdown && (
                  <div 
                    ref={cityDropdownRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
                  >
                    {filteredCities.length > 0 ? (
                      <>
                        {/* Clear option */}
                        <button
                          onClick={() => {
                            setCitySearchTerm('');
                            setShowCityDropdown(false);
                            handleInputChange('toCityId', '');
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-100 text-slate-600 italic"
                        >
                          Clear selection
                        </button>
                        
                        {/* City options */}
                        {filteredCities.map((city) => (
                          <button
                            key={city.id}
                            onClick={() => handleCitySelect(city)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 transition-colors ${
                              city.id?.toString() === filters.toCityId?.toString() ? 'bg-blue-100 text-blue-800' : 'text-slate-700'
                            }`}
                          >
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="flex-1">{city.city_name}</span>
                            {city.city_code && (
                              <span className="text-xs text-slate-400">({city.city_code})</span>
                            )}
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-500 italic">
                        No cities found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Payment</label>
              <select
                value={filters.paymentMode}
                onChange={(e) => handleInputChange('paymentMode', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">All</option>
                <option value="to-pay">To Pay</option>
                <option value="paid">Paid</option>
                <option value="freeofcost">FOC</option>
              </select>
            </div>

            {/* E-Way Bill */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">E-Way Bill</label>
              <select
                value={filters.hasEwayBill}
                onChange={(e) => handleInputChange('hasEwayBill', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">All</option>
                <option value="yes">With E-Way</option>
                <option value="no">Without E-Way</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filters.savingOption}
                onChange={(e) => handleInputChange('savingOption', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">All</option>
                <option value="SAVE">Saved</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>

            {/* Min Amount */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Min Amount</label>
              <input
                type="number"
                value={filters.minAmount}
                onChange={(e) => handleInputChange('minAmount', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0"
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Max Amount</label>
              <input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => handleInputChange('maxAmount', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="No limit"
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Search Instructions */}
          {hasChangesToApply && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <SearchIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Ready to search</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Click the "Search" button or press Enter to apply your filters and see results.
              </p>
            </div>
          )}

          {/* Applied Filters Display */}
          {hasAppliedFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-slate-700">Applied Filters:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(appliedFilters).map(([key, value]) => {
                  if (!value) return null;
                  
                  let displayValue = value;
                  let label = key;
                  
                  // Format display values
                  switch(key) {
                    case 'dateFrom': label = 'From'; break;
                    case 'dateTo': label = 'To'; break;
                    case 'grNumber': label = 'GR'; break;
                    case 'consignorName': label = 'Consignor'; break;
                    case 'consigneeName': label = 'Consignee'; break;
                    case 'toCityId': 
                      label = 'City';
                      displayValue = cities.find(c => c.id?.toString() === value?.toString())?.city_name || value;
                      break;
                    case 'paymentMode': label = 'Payment'; displayValue = value.toUpperCase(); break;
                    case 'hasEwayBill': label = 'E-Way'; displayValue = value === 'yes' ? 'With' : 'Without'; break;
                    case 'savingOption': label = 'Status'; break;
                    case 'minAmount': label = 'Min ₹'; break;
                    case 'maxAmount': label = 'Max ₹'; break;
                  }
                  
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium"
                    >
                      {label}: {displayValue}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BiltyFilterPanel;