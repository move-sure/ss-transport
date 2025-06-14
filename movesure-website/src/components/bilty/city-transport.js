'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useInputNavigation } from './input-navigation';

const CityTransportSection = ({ 
  formData, 
  setFormData, 
  cities, 
  transports, 
  rates, 
  fromCityName,
  resetKey // Add resetKey prop to handle focus on reset
}) => {
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');  const [selectedIndex, setSelectedIndex] = useState(-1);  const cityRef = useRef(null);
  const cityInputRef = useRef(null);
  const transportNameRef = useRef(null);
  const transportGstRef = useRef(null);
  const transportNumberRef = useRef(null);

  // Input navigation
  const { register, unregister, handleEnter } = useInputNavigation();
  // Initialize city search when formData has to_city_id (for edit mode)
  useEffect(() => {
    if (formData.to_city_id && cities.length > 0) {
      const city = cities.find(c => c.id === formData.to_city_id);
      if (city && citySearch !== city.city_name) {
        setCitySearch(city.city_name);
      }
    } else if (!formData.to_city_id) {
      setCitySearch('');
    }
  }, [formData.to_city_id, cities]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityRef.current && !cityRef.current.contains(event.target)) {
        setShowCityDropdown(false);
      }
    };    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // Register inputs for navigation
  useEffect(() => {
    if (cityInputRef.current) {
      register(1, cityInputRef.current);
    }
    if (transportNameRef.current) {
      register(2, transportNameRef.current);
    }
    if (transportGstRef.current) {
      register(3, transportGstRef.current);
    }
    if (transportNumberRef.current) {
      register(4, transportNumberRef.current);
    }
    
    return () => {
      unregister(1);
      unregister(2);
      unregister(3);
      unregister(4);
    };
  }, [register, unregister]);
  const handleCitySelect = (city) => {
    setCitySearch(city.city_name);
    setShowCityDropdown(false);
    setSelectedIndex(-1);
    
    // Find transport for this city
    const cityTransports = transports.filter(t => t.city_id === city.id);
    const transport = cityTransports[0] || null;
    
    // Enhanced rate lookup for this city - prioritize consignor-specific rates
    const cityRates = rates.filter(r => r.city_id === city.id);
    let selectedRate = null;
    
    // If consignor is already selected, try to find consignor-specific rate first
    if (formData.consignor_name) {
      console.log('🔍 Looking for consignor-specific rate for:', formData.consignor_name);
      
      // Find consignor-specific rates (non-default rates)
      const consignorSpecificRates = cityRates.filter(r => !r.is_default && r.consignor_id);
      
      if (consignorSpecificRates.length > 0) {
        console.log('✅ Found consignor-specific rates for this city:', consignorSpecificRates.length);
        selectedRate = consignorSpecificRates[0]; // Use the first consignor-specific rate
      }
    }
    
    // If no consignor-specific rate found, fall back to default rate
    if (!selectedRate) {
      console.log('🔍 Looking for default rate for city:', city.city_name);
      selectedRate = cityRates.find(r => r.is_default) || cityRates[0];
      
      if (selectedRate) {
        console.log('✅ Using default rate:', selectedRate.rate);
      } else {
        console.log('⚠️ No rate found for this city');
      }
    } else {
      console.log('✅ Using consignor-specific rate:', selectedRate.rate);
    }
    
    setFormData(prev => ({
      ...prev,
      to_city_id: city.id,
      transport_name: transport?.transport_name || '',
      transport_gst: transport?.gst_number || '',
      transport_number: transport?.mob_number || '',
      rate: selectedRate?.rate || prev.rate || 0
    }));
  };
  const handleKeyDown = (e) => {
    // Handle dropdown navigation
    if (showCityDropdown && filteredCities.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCities.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCities.length - 1
          );
          break;        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handleCitySelect(filteredCities[selectedIndex]);
          } else if (filteredCities.length > 0) {
            handleCitySelect(filteredCities[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowCityDropdown(false);
          setSelectedIndex(-1);
          break;
      }    } else {
      // Handle Enter key for navigation when dropdown is not open
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEnter(e, 1);
      }
    }
  };

  const handleInputChange = (e) => {
    setCitySearch(e.target.value);
    setShowCityDropdown(true);
    setSelectedIndex(-1);
    
    // Clear to_city_id if search is cleared
    if (!e.target.value) {
      setFormData(prev => ({ ...prev, to_city_id: '' }));
    }
    
    // Auto-fill if exact match found with city code
    const exactMatch = filteredCities.find(city => 
      city.city_code.toLowerCase() === e.target.value.toLowerCase()
    );
    
    if (exactMatch && e.target.value.length >= 2) {
      setTimeout(() => {
        if (e.target.value === exactMatch.city_code.toLowerCase() || 
            e.target.value === exactMatch.city_code) {
          handleCitySelect(exactMatch);
        }
      }, 100);
    }
  };

  // Filter cities to exclude the from city
  const filteredCities = cities.filter(city => {
    const matchesSearch = city.city_name.toLowerCase().includes(citySearch.toLowerCase()) ||
                         city.city_code.toLowerCase().includes(citySearch.toLowerCase());
    const isDifferentFromSource = city.city_name.toLowerCase() !== fromCityName.toLowerCase();
    return matchesSearch && isDifferentFromSource;
  });

  // Focus on city input when component resets or first loads
  useEffect(() => {
    if (resetKey > 0 && cityInputRef.current) {
      setTimeout(() => {
        cityInputRef.current.focus();
      }, 100);
    }
  }, [resetKey]);

  // Also focus on mount for new forms
  useEffect(() => {
    if (cityInputRef.current && !formData.to_city_id) {
      setTimeout(() => {
        cityInputRef.current.focus();
      }, 300);
    }
  }, []);

  return (
    <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200 shadow-md">
      {/* Main City Section */}
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* To City - Takes full width */}
        <div className="col-span-12">
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 text-sm font-bold rounded-lg min-w-24 text-center shadow-md">
              TO CITY
            </span>
            <div className="relative flex-1" ref={cityRef}>              <input
                type="text"
                ref={cityInputRef}
                value={citySearch}
                onChange={handleInputChange}
                onFocus={() => setShowCityDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="🔍 Search city... (Start typing city name or code)"
                className="w-full px-4 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg bg-white shadow-sm city-input-focus focus-pulse transition-all duration-200 hover:border-blue-400"
                tabIndex={1}
              />
              
              {showCityDropdown && (
                <div className="absolute z-30 mt-2 w-96 bg-white border-2 border-blue-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold">
                    CITY WISE AUTO FILL DETAILS HERE
                  </div>
                  {filteredCities.length > 0 ? (
                    filteredCities.map((city, index) => (
                      <button
                        key={city.id}
                        onClick={() => handleCitySelect(city)}
                        className={`w-full px-4 py-3 text-left hover:bg-blue-50 text-sm transition-colors ${
                          index === selectedIndex ? 'bg-blue-100' : ''
                        }`}
                      >
                        <div className="font-bold text-gray-800">{city.city_name}</div>
                        <div className="text-xs text-gray-600">Code: {city.city_code}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-600">
                      No available cities found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transport Details - Always Visible */}
      <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-sm font-bold text-gray-800 mb-3 bg-blue-100 px-3 py-2 rounded text-center">
          TRANSPORT DETAILS (Auto-filled from city selection)
        </h4>
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* Transport Name */}
          <div className="col-span-6">
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 text-sm font-bold rounded-lg min-w-24 text-center shadow-md">
                TRANSPORT
              </span>              <input
                type="text"
                ref={transportNameRef}
                value={formData.transport_name}
                onChange={(e) => setFormData(prev => ({ ...prev, transport_name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 2)}
                className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg bg-white shadow-sm text-input-focus transition-all duration-200 hover:border-blue-400"
                placeholder="Transport name"
                tabIndex={3}
              />
            </div>
          </div>

          {/* Transport GST */}
          <div className="col-span-3">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md">
                GST
              </span>              <input
                type="text"
                ref={transportGstRef}
                value={formData.transport_gst}
                onChange={(e) => setFormData(prev => ({ ...prev, transport_gst: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 3)}
                className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg bg-white shadow-sm text-input-focus transition-all duration-200 hover:border-blue-400"
                placeholder="GST number"
                tabIndex={4}
              />
            </div>
          </div>

          {/* Transport Phone */}
          <div className="col-span-3">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md">
                PHONE
              </span>              <input
                type="text"
                ref={transportNumberRef}
                value={formData.transport_number}
                onChange={(e) => setFormData(prev => ({ ...prev, transport_number: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 4)}
                className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg bg-white shadow-sm text-input-focus transition-all duration-200 hover:border-blue-400"
                placeholder="Phone number"
                tabIndex={5}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CityTransportSection;