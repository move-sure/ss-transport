'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const ConsignorAutocomplete = ({ 
  value, 
  onChange, 
  onSelect, 
  autoFocus = false,
  placeholder = "Enter consignor name" 
}) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Auto focus when component mounts
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [autoFocus]);

  // Update search term when value prop changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search consignors
  const searchConsignors = async (searchValue) => {
    if (!searchValue || searchValue.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consignors')
        .select('id, company_name, gst_num, number')
        .ilike('company_name', `${searchValue}%`)
        .order('company_name')
        .limit(20);

      if (error) {
        console.error('Error searching consignors:', error);
        setSuggestions([]);
        return;
      }
      
      setSuggestions(data || []);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching consignors:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (inputValue) => {
    const upperValue = inputValue.toUpperCase();
    setSearchTerm(upperValue);
    onChange(upperValue);
    setSelectedIndex(-1);
    searchConsignors(upperValue);
  };

  // Handle consignor selection
  const handleConsignorSelect = (consignor) => {
    setSearchTerm(consignor.company_name);
    setShowDropdown(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    onSelect(consignor);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) {
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      
      if (selectedIndex === -1) {
        // First Tab: Select first item in list
        setSelectedIndex(0);
      } else if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        // Second Tab: Confirm selection
        handleConsignorSelect(suggestions[selectedIndex]);
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
        handleConsignorSelect(suggestions[selectedIndex]);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        <User className="w-3 h-3 inline mr-1" />
        Consignor *
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
              searchConsignors(searchTerm);
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
              SELECT CONSIGNOR
            </div>
            {suggestions.map((consignor, index) => (
              <button
                key={consignor.id}
                onClick={() => handleConsignorSelect(consignor)}
                className={`w-full px-3 py-2 text-left hover:bg-indigo-50 border-b border-slate-100 transition-colors ${
                  index === selectedIndex ? 'bg-indigo-100' : ''
                }`}
              >
                <div className="font-semibold text-xs text-slate-800">{consignor.company_name}</div>
                {consignor.gst_num && (
                  <div className="text-xs text-slate-600">GST: {consignor.gst_num}</div>
                )}
                {consignor.number && (
                  <div className="text-xs text-slate-600">Ph: {consignor.number}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {showDropdown && suggestions.length === 0 && searchTerm.length > 0 && !loading && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg">
            <div className="px-3 py-2 text-xs text-gray-600 text-center">
              No consignors found
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsignorAutocomplete;