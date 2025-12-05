'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Building2, X } from 'lucide-react';

const ProfileFilters = ({
  searchQuery,
  setSearchQuery,
  selectedConsignor,
  setSelectedConsignor,
  selectedCity,
  setSelectedCity,
  showActiveOnly,
  setShowActiveOnly,
  consignors,
  cities,
  onRefresh
}) => {
  const [consignorSearch, setConsignorSearch] = useState('');
  const [showConsignorDropdown, setShowConsignorDropdown] = useState(false);
  const consignorRef = useRef(null);

  // Set initial search text when selectedConsignor changes externally
  useEffect(() => {
    if (selectedConsignor) {
      const consignor = consignors.find(c => c.id === selectedConsignor);
      if (consignor) {
        setConsignorSearch(consignor.company_name);
      }
    } else {
      setConsignorSearch('');
    }
  }, [selectedConsignor, consignors]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (consignorRef.current && !consignorRef.current.contains(e.target)) {
        setShowConsignorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered consignors for dropdown
  const filteredConsignors = useMemo(() => {
    if (!consignorSearch) return consignors.slice(0, 50);
    const search = consignorSearch.toLowerCase();
    return consignors.filter(c =>
      c.company_name.toLowerCase().includes(search) ||
      (c.gst_num && c.gst_num.toLowerCase().includes(search))
    ).slice(0, 50);
  }, [consignors, consignorSearch]);

  // Handle consignor selection
  const handleConsignorSelect = (consignor) => {
    setSelectedConsignor(consignor.id);
    setConsignorSearch(consignor.company_name);
    setShowConsignorDropdown(false);
  };

  // Clear consignor selection
  const handleClearConsignor = () => {
    setSelectedConsignor('');
    setConsignorSearch('');
    setShowConsignorDropdown(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* General Search */}
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Consignor Autocomplete Search */}
        <div ref={consignorRef} className="relative lg:col-span-2">
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={consignorSearch}
              onChange={(e) => {
                setConsignorSearch(e.target.value);
                setShowConsignorDropdown(true);
                if (!e.target.value) {
                  setSelectedConsignor('');
                }
              }}
              onFocus={() => setShowConsignorDropdown(true)}
              placeholder="Search consignor by name or GST..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {selectedConsignor && (
              <button
                onClick={handleClearConsignor}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Consignor Dropdown */}
          {showConsignorDropdown && filteredConsignors.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredConsignors.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleConsignorSelect(c)}
                  className={`w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    selectedConsignor === c.id ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <p className="font-medium text-gray-900">{c.company_name}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    {c.gst_num && <span>GST: {c.gst_num}</span>}
                    {c.number && <span>Ph: {c.number}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* City Filter */}
        <div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Cities</option>
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.city_name} ({c.city_code})</option>
            ))}
          </select>
        </div>

        {/* Active Filter & Refresh */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Active Only</span>
          </label>
          <button
            onClick={onRefresh}
            className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileFilters;
