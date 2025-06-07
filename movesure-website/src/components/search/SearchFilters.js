'use client';

import React, { useState, useCallback } from 'react';
import { 
  Calendar, 
  FileText, 
  Users, 
  CreditCard, 
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';

const BiltyFilterPanel = ({ 
  filters, 
  cities, 
  onFilterChange, 
  onClearFilters
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Debounced input handler to prevent constant re-renders
  const handleInputChange = useCallback((field, value) => {
    // Use setTimeout to batch updates and prevent cursor jumping
    setTimeout(() => {
      onFilterChange({
        ...filters,
        [field]: value
      });
    }, 0);
  }, [filters, onFilterChange]);

  // Immediate handler for non-text inputs
  const handleSelectChange = useCallback((field, value) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  }, [filters, onFilterChange]);

  const activeFiltersCount = Object.values(filters).filter(value => value !== '' && value !== null).length;
  const hasActiveFilters = activeFiltersCount > 0;

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
              <h3 className="text-md font-bold text-slate-800">Filters</h3>
              <p className="text-xs text-slate-600">
                {hasActiveFilters ? `${activeFiltersCount} active` : 'No filters'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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
                onChange={(e) => handleSelectChange('dateFrom', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleSelectChange('dateTo', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* GR Number */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">GR Number</label>
              <input
                type="text"
                value={filters.grNumber}
                onChange={(e) => handleInputChange('grNumber', e.target.value)}
                placeholder="Search GR..."
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Consignor */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Consignor</label>
              <input
                type="text"
                value={filters.consignorName}
                onChange={(e) => handleInputChange('consignorName', e.target.value)}
                placeholder="Search consignor..."
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Consignee */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Consignee</label>
              <input
                type="text"
                value={filters.consigneeName}
                onChange={(e) => handleInputChange('consigneeName', e.target.value)}
                placeholder="Search consignee..."
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* To City */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">To City</label>
              <select
                value={filters.toCityId}
                onChange={(e) => handleSelectChange('toCityId', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Cities</option>
                {cities.map(city => (
                  <option key={city.id} value={city.id}>
                    {city.city_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Payment</label>
              <select
                value={filters.paymentMode}
                onChange={(e) => handleSelectChange('paymentMode', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                onChange={(e) => handleSelectChange('hasEwayBill', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                onChange={(e) => handleSelectChange('savingOption', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                placeholder="0"
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Max Amount</label>
              <input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => handleInputChange('maxAmount', e.target.value)}
                placeholder="No limit"
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
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
                      displayValue = cities.find(c => c.id === value)?.city_name || value;
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
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                    >
                      {label}: {displayValue}
                      <button
                        onClick={() => handleSelectChange(key, '')}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <X className="w-2 h-2" />
                      </button>
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