'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';

const API_URL = 'https://api.movesure.io';

const ConsigneeAutocomplete = ({
  value,
  onChange,
  onSelect,
  autoFocus = false,
  placeholder = "Enter consignee name"
}) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [autoFocus]);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchConsignees = async (searchValue) => {
    if (!searchValue || searchValue.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ page: 1, page_size: 20, search: searchValue });
      const res = await fetch(`${API_URL}/api/bilty/master/consignees?${params}`);
      const result = await res.json();
      if (result.status !== 'success') throw new Error(result.message);

      setSuggestions(result.data.rows || []);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching consignees:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (inputValue) => {
    const upperValue = inputValue.toUpperCase();
    setSearchTerm(upperValue);
    onChange(upperValue);
    setSelectedIndex(-1);
    searchConsignees(upperValue);
  };

  const handleConsigneeSelect = (consignee) => {
    setSearchTerm(consignee.company_name);
    setShowDropdown(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    onSelect(consignee);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) {
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();

      if (selectedIndex === -1) {
        setSelectedIndex(0);
      } else if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleConsigneeSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleConsigneeSelect(suggestions[selectedIndex]);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        <User className="w-3 h-3 inline mr-1" />
        Consignee
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchTerm.length >= 1) {
              searchConsignees(searchTerm);
            }
          }}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={placeholder}
        />

        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 bg-indigo-500 text-white text-xs font-semibold rounded-t-lg sticky top-0">
              SELECT CONSIGNEE
            </div>
            {suggestions.map((consignee, index) => (
              <button
                key={consignee.id}
                onClick={() => handleConsigneeSelect(consignee)}
                className={`w-full px-3 py-2 text-left hover:bg-indigo-50 border-b border-slate-100 transition-colors ${
                  index === selectedIndex ? 'bg-indigo-100' : ''
                }`}
              >
                <div className="font-semibold text-xs text-slate-800">{consignee.company_name}</div>
                {consignee.gst_num && (
                  <div className="text-xs text-slate-600">GST: {consignee.gst_num}</div>
                )}
                {consignee.number && (
                  <div className="text-xs text-slate-600">Ph: {consignee.number}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {showDropdown && suggestions.length === 0 && searchTerm.length > 0 && !loading && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg">
            <div className="px-3 py-2 text-xs text-gray-600 text-center">
              No consignees found
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsigneeAutocomplete;
