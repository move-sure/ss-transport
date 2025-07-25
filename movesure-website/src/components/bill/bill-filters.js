'use client';

import React from 'react';
import { Calendar, Search, X } from 'lucide-react';

export default function BillFilterPanel({ 
  filters, 
  onFilterChange, 
  onSearch, 
  onClearFilters, 
  cities, 
  loading 
}) {
  const handleInputChange = (field, value) => {
    onFilterChange(field, value);
  };

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

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
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

        {/* Transport Name (only for regular bilties) */}
        {(filters.biltyType === 'all' || filters.biltyType === 'regular') && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Transport Name
            </label>
            <input
              type="text"
              value={filters.transportName}
              onChange={(e) => handleInputChange('transportName', e.target.value)}
              placeholder="Enter transport name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

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
          onClick={onClearFilters}
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
            case 'transportName':
              displayKey = 'Transport';
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
