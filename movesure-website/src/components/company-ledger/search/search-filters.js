'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Search, X, ChevronDown, Filter, RotateCcw } from 'lucide-react';

export default function LedgerSearchFilters({ 
  filters, 
  onFilterChange, 
  onSearch, 
  onClearFilters, 
  cities = [], 
  loading 
}) {
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState(filters.cityName || '');
  const cityInputRef = useRef(null);
  const cityDropdownRef = useRef(null);

  // Filter cities based on search term
  const filteredCities = cities.filter(city => 
    city.city_name?.toLowerCase().includes(citySearchTerm.toLowerCase()) ||
    city.city_code?.toLowerCase().includes(citySearchTerm.toLowerCase())
  ).slice(0, 15);

  const citiesToShow = citySearchTerm.length === 0 ? cities.slice(0, 15) : filteredCities;

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setShowCityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field, value) => {
    onFilterChange(field, value);
  };

  const handleCityInputChange = (value) => {
    setCitySearchTerm(value);
    onFilterChange('cityName', value);
    setShowCityDropdown(true);
  };

  const handleCitySelect = (city) => {
    setCitySearchTerm(city.city_name);
    onFilterChange('cityName', city.city_name);
    setShowCityDropdown(false);
  };

  const handleCityInputFocus = () => {
    setShowCityDropdown(true);
  };

  const handleClearFilters = () => {
    setCitySearchTerm('');
    setShowCityDropdown(false);
    onClearFilters();
  };

  useEffect(() => {
    if (filters.cityName !== citySearchTerm) {
      setCitySearchTerm(filters.cityName || '');
    }
  }, [filters.cityName]);

  const paymentModes = [
    { value: '', label: 'All Payment Modes' },
    { value: 'paid', label: 'Paid' },
    { value: 'to-pay', label: 'To Pay' },
    { value: 'foc', label: 'FOC' }
  ];

  const biltyTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'regular', label: 'Regular Bilty' },
    { value: 'station', label: 'Station Summary' }
  ];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const handleMonthSelect = (monthNum) => {
    const now = new Date();
    const year = now.getFullYear();
    const monthStr = String(monthNum).padStart(2, '0');
    
    const firstDay = `${year}-${monthStr}-01`;
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const lastDay = `${year}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}`;
    
    onFilterChange({
      dateFrom: firstDay,
      dateTo: lastDay
    });
  };

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800">Search Filters</h3>
        </div>
        <button
          onClick={handleClearFilters}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear All
        </button>
      </div>

      {/* Monthly Buttons */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-2">
          📅 Quick Month Select
        </label>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
          {monthNames.map((month, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleMonthSelect(index + 1)}
              className="px-2 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium rounded-md shadow-sm hover:shadow transition-all duration-200 text-xs"
            >
              {month}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {/* Bilty Type Filter */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Bilty Type</label>
          <select
            value={filters.biltyType}
            onChange={(e) => handleInputChange('biltyType', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {biltyTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* GR Number */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">GR Number</label>
          <input
            type="text"
            value={filters.grNumber}
            onChange={(e) => handleInputChange('grNumber', e.target.value)}
            placeholder="Enter GR number"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Date From</label>
          <div className="relative">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleInputChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              style={{ colorScheme: 'light' }}
            />
            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Date To</label>
          <div className="relative">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleInputChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              style={{ colorScheme: 'light' }}
            />
            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Consignor Name */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Consignor</label>
          <input
            type="text"
            value={filters.consignorName}
            onChange={(e) => handleInputChange('consignorName', e.target.value)}
            placeholder="Consignor name"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Consignee Name */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Consignee</label>
          <input
            type="text"
            value={filters.consigneeName}
            onChange={(e) => handleInputChange('consigneeName', e.target.value)}
            placeholder="Consignee name"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* City Name with Dropdown */}
        <div className="space-y-1 relative" ref={cityDropdownRef}>
          <label className="block text-xs font-medium text-gray-600">Destination City</label>
          <div className="relative">
            <input
              ref={cityInputRef}
              type="text"
              value={citySearchTerm}
              onChange={(e) => handleCityInputChange(e.target.value)}
              onFocus={handleCityInputFocus}
              placeholder="Search city"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
            />
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          
          {showCityDropdown && citiesToShow.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {citiesToShow.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex justify-between items-center"
                >
                  <span className="text-gray-800">{city.city_name}</span>
                  <span className="text-xs text-gray-500">{city.city_code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payment Mode */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Payment Mode</label>
          <select
            value={filters.paymentMode}
            onChange={(e) => handleInputChange('paymentMode', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {paymentModes.map(mode => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pvt Marks */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Pvt Marks</label>
          <input
            type="text"
            value={filters.pvtMarks}
            onChange={(e) => handleInputChange('pvtMarks', e.target.value)}
            placeholder="Private marks"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Search Button */}
        <div className="space-y-1 flex items-end">
          <button
            onClick={onSearch}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
    </div>
  );
}
