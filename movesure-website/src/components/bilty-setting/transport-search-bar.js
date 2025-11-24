'use client';

import { useState, useEffect, useRef } from 'react';

const TransportSearchBar = ({ 
  transporters, 
  onSearch, 
  onCityFilter, 
  selectedCity,
  cities 
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [citySearchInput, setCitySearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchRef = useRef(null);
  const citySearchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (citySearchRef.current && !citySearchRef.current.contains(event.target)) {
        setShowCitySuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchInput.length >= 1) {
      generateSuggestions(searchInput);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchInput, transporters]);

  useEffect(() => {
    if (citySearchInput.length >= 1) {
      generateCitySuggestions(citySearchInput);
      setShowCitySuggestions(true);
    } else {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    }
  }, [citySearchInput, cities, transporters]);

  const generateSuggestions = (input) => {
    const inputLower = input.toLowerCase();
    const suggestionSet = new Map();

    transporters.forEach(transporter => {
      // Transport name suggestions
      if (transporter.transport_name?.toLowerCase().includes(inputLower)) {
        suggestionSet.set(transporter.transport_name, {
          text: transporter.transport_name,
          type: 'transport',
          icon: '🚛',
          id: transporter.id
        });
      }

      // Owner suggestions
      if (transporter.branch_owner_name?.toLowerCase().includes(inputLower)) {
        suggestionSet.set(transporter.branch_owner_name, {
          text: transporter.branch_owner_name,
          type: 'owner',
          icon: '👤'
        });
      }

      // GST suggestions
      if (transporter.gst_number?.toLowerCase().includes(inputLower)) {
        suggestionSet.set(transporter.gst_number, {
          text: transporter.gst_number,
          type: 'gst',
          icon: '📄'
        });
      }

      // Mobile suggestions
      if (transporter.mob_number?.includes(input)) {
        suggestionSet.set(transporter.mob_number, {
          text: transporter.mob_number,
          type: 'mobile',
          icon: '📱'
        });
      }
    });

    setSuggestions(Array.from(suggestionSet.values()).slice(0, 10));
  };

  const generateCitySuggestions = (input) => {
    const inputLower = input.toLowerCase();
    const citySuggestionSet = new Map();

    cities.forEach(city => {
      const count = transporters.filter(t => t.city_id === city.id).length;
      if (count > 0) {
        const cityName = city.city_name?.toLowerCase();
        const cityCode = city.city_code?.toLowerCase();
        
        if (cityName?.includes(inputLower) || cityCode?.includes(inputLower)) {
          citySuggestionSet.set(city.id, {
            id: city.id,
            text: city.city_name,
            code: city.city_code,
            count: count,
            icon: '🏙️'
          });
        }
      }
    });

    setCitySuggestions(Array.from(citySuggestionSet.values()).slice(0, 8));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    onSearch(value);
    setSelectedSuggestionIndex(-1);
  };

  const handleCitySearchChange = (e) => {
    const value = e.target.value;
    setCitySearchInput(value);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchInput(suggestion.text);
    onSearch(suggestion.text);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleCitySuggestionClick = (citySuggestion) => {
    setCitySearchInput(citySuggestion.text);
    onCityFilter(citySuggestion.id);
    setShowCitySuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    onSearch('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const clearCitySearch = () => {
    setCitySearchInput('');
    onCityFilter('');
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  };

  const clearAllFilters = () => {
    clearSearch();
    clearCitySearch();
  };

  return (
    <div className="space-y-4">
      {/* Dual Search Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transport Search with Suggestions */}
        <div className="relative" ref={searchRef}>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            🚛 Search Transports
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-xl">🔍</span>
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => searchInput.length >= 1 && setShowSuggestions(true)}
              className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all shadow-sm hover:shadow-md"
              placeholder="Type transport name, owner, GST..."
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl">✖</span>
              </button>
            )}
          </div>

          {/* Transport Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`px-4 py-3 cursor-pointer flex items-center space-x-3 transition-colors border-b border-gray-100 last:border-b-0 ${
                    index === selectedSuggestionIndex
                      ? 'bg-blue-100 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{suggestion.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-black font-medium truncate">{suggestion.text}</p>
                    <p className="text-xs text-gray-500 capitalize">{suggestion.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* City Search with Suggestions */}
        <div className="relative" ref={citySearchRef}>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            🏙️ Filter by City
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-xl">🏙️</span>
            </div>
            <input
              type="text"
              value={citySearchInput}
              onChange={handleCitySearchChange}
              onFocus={() => citySearchInput.length >= 1 && setShowCitySuggestions(true)}
              className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black transition-all shadow-sm hover:shadow-md"
              placeholder="Type city name or code..."
            />
            {citySearchInput && (
              <button
                onClick={clearCitySearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl">✖</span>
              </button>
            )}
          </div>

          {/* City Suggestions Dropdown */}
          {showCitySuggestions && citySuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
              {citySuggestions.map((citySuggestion, index) => (
                <div
                  key={citySuggestion.id}
                  onClick={() => handleCitySuggestionClick(citySuggestion)}
                  className="px-4 py-3 cursor-pointer flex items-center justify-between transition-colors border-b border-gray-100 last:border-b-0 hover:bg-green-50"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-xl flex-shrink-0">{citySuggestion.icon}</span>
                    <div>
                      <p className="text-black font-medium">{citySuggestion.text}</p>
                      <p className="text-xs text-gray-500">Code: {citySuggestion.code}</p>
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                    {citySuggestion.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {(searchInput || selectedCity) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600 font-bold">🔍 Active Filters:</span>
          
          {searchInput && (
            <span className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full border-2 border-blue-300">
              <span className="font-medium">Transport: &quot;{searchInput}&quot;</span>
              <button
                onClick={clearSearch}
                className="text-blue-600 hover:text-blue-800 font-bold"
              >
                ✖
              </button>
            </span>
          )}
          
          {selectedCity && (
            <span className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full border-2 border-green-300">
              <span className="font-medium">City: {cities.find(c => c.id === selectedCity)?.city_name}</span>
              <button
                onClick={clearCitySearch}
                className="text-green-600 hover:text-green-800 font-bold"
              >
                ✖
              </button>
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="bg-red-100 text-red-700 px-4 py-2 rounded-full hover:bg-red-200 font-medium text-sm border-2 border-red-300 transition-all"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default TransportSearchBar;
