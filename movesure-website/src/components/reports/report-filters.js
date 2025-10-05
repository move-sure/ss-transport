'use client';

import React, { useState, useEffect } from 'react';
import { Filter, Calendar, MapPin, X } from 'lucide-react';
import supabase from '../../app/utils/supabase';

export default function ReportFilters({ selectedCity, setSelectedCity, dateRange, setDateRange }) {
  const [cities, setCities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, city_name, city_code')
        .order('city_name');

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleClearFilters = () => {
    setSelectedCity('all');
    setDateRange({ start: '', end: '' });
  };

  const hasActiveFilters = selectedCity !== 'all' || dateRange.start || dateRange.end;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Filter className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Report Filters</h2>
          {hasActiveFilters && (
            <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          {/* City Filter */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 mr-1 text-blue-600" />
              Filter by City
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
              <option value="all">All Cities</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.city_name} ({city.city_code})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 mr-1 text-blue-600" />
              Date Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm"
                placeholder="End Date"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Active filters: </span>
            {selectedCity !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded mr-2">
                City: {cities.find(c => c.id === selectedCity)?.city_name || 'Selected'}
              </span>
            )}
            {(dateRange.start || dateRange.end) && (
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                Date Range
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
