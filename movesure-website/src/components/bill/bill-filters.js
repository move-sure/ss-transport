'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Search, X, ChevronDown } from 'lucide-react';

export default function BillFilterPanel({ 
  filters, 
  onFilterChange, 
  onSearch, 
  onClearFilters, 
  cities, 
  loading 
}) {
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState(filters.cityName || '');
  const cityInputRef = useRef(null);
  const cityDropdownRef = useRef(null);

  // Filter cities based on search term
  const filteredCities = cities.filter(city => 
    city.city_name.toLowerCase().includes(citySearchTerm.toLowerCase()) ||
    city.city_code.toLowerCase().includes(citySearchTerm.toLowerCase())
  ).slice(0, 15); // Increased to 15 results

  // Show all cities when no search term
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
    setShowCityDropdown(true); // Always show dropdown when typing
  };

  const handleCitySelect = (city) => {
    setCitySearchTerm(city.city_name);
    onFilterChange('cityName', city.city_name);
    setShowCityDropdown(false);
  };

  const handleCityInputFocus = () => {
    setShowCityDropdown(true); // Always show dropdown on focus
  };

  const handleClearFilters = () => {
    setCitySearchTerm('');
    setShowCityDropdown(false);
    onClearFilters();
  };

  // Sync citySearchTerm with filters.cityName when filters change externally
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

  // Handle month selection - BUTTON VERSION (TRUE BATCH UPDATE)
  const handleMonthSelect = (monthNum) => {
    const now = new Date();
    const year = now.getFullYear();
    const monthStr = String(monthNum).padStart(2, '0');
    
    // Calculate first day: Year-Month-01
    const firstDay = `${year}-${monthStr}-01`;
    
    // Calculate last day by getting the number of days in the month
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const lastDay = `${year}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}`;
    
    console.log('📅 Month Selected:', monthNum, '('+monthNames[monthNum-1]+')');
    console.log('📅 Date From:', firstDay);
    console.log('📅 Date To:', lastDay);
    
    // BATCH UPDATE - Pass both dates as an object in a single call
    onFilterChange({
      dateFrom: firstDay,
      dateTo: lastDay
    });
  };

  // Get current month value for default
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        
        {/* Monthly Buttons - FULL WIDTH */}
        <div className="space-y-2 md:col-span-2 lg:col-span-4">
          <label className="block text-sm font-medium text-gray-700">
            📅 Quick Month Select
          </label>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {monthNames.map((month, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleMonthSelect(index + 1)}
                className="px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95 text-sm"
              >
                {month}
              </button>
            ))}
          </div>
        </div>

        {/* Bilty Type Filter */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Bilty Type
          </label>
          <select
            value={filters.biltyType}
            onChange={(e) => handleInputChange('biltyType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <label className="block text-sm font-medium text-gray-700">
            GR Number
          </label>
          <input
            type="text"
            value={filters.grNumber}
            onChange={(e) => handleInputChange('grNumber', e.target.value)}
            placeholder="Enter GR number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Date From
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleInputChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-gray-900 [color-scheme:light]"
              style={{ colorScheme: 'light' }}
            />
            <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Date To
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleInputChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-gray-900 [color-scheme:light]"
              style={{ colorScheme: 'light' }}
            />
            <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Consignor Name */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Consignor Name
          </label>
          <input
            type="text"
            value={filters.consignorName}
            onChange={(e) => handleInputChange('consignorName', e.target.value)}
            placeholder="Enter consignor name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Consignee Name */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Consignee Name
          </label>
          <input
            type="text"
            value={filters.consigneeName}
            onChange={(e) => handleInputChange('consigneeName', e.target.value)}
            placeholder="Enter consignee name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Private Marks */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Private Marks
          </label>
          <input
            type="text"
            value={filters.pvtMarks}
            onChange={(e) => handleInputChange('pvtMarks', e.target.value)}
            placeholder="Enter private marks"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Weight Filter with Operator */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Weight (kg)
          </label>
          <div className="flex gap-2">
            <select
              value={filters.weightOperator || 'equal'}
              onChange={(e) => handleInputChange('weightOperator', e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="equal">Equal</option>
              <option value="more-than">More Than</option>
              <option value="less-than">Less Than</option>
            </select>
            <input
              type="number"
              value={filters.weight || ''}
              onChange={(e) => handleInputChange('weight', e.target.value)}
              placeholder="Enter weight"
              min="0"
              step="0.01"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* City Name Filter with Autocomplete */}
        <div className="space-y-1 relative" ref={cityDropdownRef}>
          <label className="block text-sm font-medium text-gray-700">
            Destination City
          </label>
          <div className="relative">
            <input
              ref={cityInputRef}
              type="text"
              value={citySearchTerm}
              onChange={(e) => handleCityInputChange(e.target.value)}
              onFocus={handleCityInputFocus}
              placeholder="Search destination city..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              autoComplete="off"
            />
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          
          {/* Dropdown with city suggestions */}
          {showCityDropdown && citiesToShow.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {citiesToShow.map((city) => (
                <div
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{city.city_name}</span>
                    <span className="text-sm text-gray-500">{city.city_code}</span>
                  </div>
                </div>
              ))}
              {citySearchTerm && citiesToShow.length === 0 && (
                <div className="px-4 py-2 text-gray-500 text-sm">
                  No cities found matching {citySearchTerm}
                </div>
              )}
              {citySearchTerm.length === 0 && cities.length > 15 && (
                <div className="px-4 py-2 text-gray-500 text-sm text-center border-t">
                  Showing first 15 cities. Type to search for more...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Mode */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Payment Mode
          </label>
          <select
            value={filters.paymentMode}
            onChange={(e) => handleInputChange('paymentMode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {paymentModes.map(mode => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        {/* E-Way Bill */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            E-Way Bill
          </label>
          <input
            type="text"
            value={filters.eWayBill}
            onChange={(e) => handleInputChange('eWayBill', e.target.value)}
            placeholder="Enter e-way bill number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onSearch}
          disabled={loading}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>

        <button
          onClick={handleClearFilters}
          disabled={loading}
          className="flex items-center space-x-2 px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <X className="h-4 w-4" />
          <span>Clear All</span>
        </button>
      </div>

      {/* Filter Summary */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(filters).map(([key, value]) => {
          if (!value || key === 'biltyType') return null;
          
          let displayKey = key;
          let displayValue = value;
          
          // Format display names
          switch (key) {
            case 'grNumber':
              displayKey = 'GR Number';
              break;
            case 'dateFrom':
              displayKey = 'From Date';
              break;
            case 'dateTo':
              displayKey = 'To Date';
              break;
            case 'consignorName':
              displayKey = 'Consignor';
              break;
            case 'consigneeName':
              displayKey = 'Consignee';
              break;
            case 'pvtMarks':
              displayKey = 'Private Marks';
              break;
            case 'weight':
              displayKey = 'Weight';
              const operator = filters.weightOperator || 'equal';
              const operatorSymbol = operator === 'more-than' ? '>' : operator === 'less-than' ? '<' : '=';
              displayValue = operatorSymbol + ' ' + value + ' kg';
              break;
            case 'weightOperator':
              return null; // Don't show operator separately, it's included in weight display
            case 'cityName':
              displayKey = 'Destination City';
              break;
            case 'paymentMode':
              displayKey = 'Payment';
              displayValue = value.charAt(0).toUpperCase() + value.slice(1);
              break;
            case 'eWayBill':
              displayKey = 'E-Way Bill';
              break;
            default:
              break;
          }
          
          return (
            <span
              key={key}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {displayKey}: {displayValue}
            </span>
          );
        })}
      </div>
    </div>
  );
}
