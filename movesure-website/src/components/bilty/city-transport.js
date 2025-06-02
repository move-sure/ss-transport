'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';

const CityTransportSection = ({ 
  formData, 
  setFormData, 
  cities, 
  transports, 
  rates, 
  fromCityName 
}) => {
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showTransportDetails, setShowTransportDetails] = useState(false);
  const cityRef = useRef(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCitySelect = (city) => {
    setCitySearch(city.city_name);
    setShowCityDropdown(false);
    setSelectedIndex(-1);
    
    // Find transport for this city
    const cityTransports = transports.filter(t => t.city_id === city.id);
    const transport = cityTransports[0] || null;
    
    // Find rate for this city
    const cityRates = rates.filter(r => r.city_id === city.id);
    const defaultRate = cityRates.find(r => r.is_default) || cityRates[0];
    
    setFormData(prev => ({
      ...prev,
      to_city_id: city.id,
      transport_name: transport?.transport_name || '',
      transport_gst: transport?.gst_number || '',
      transport_number: transport?.mob_number || '',
      rate: defaultRate?.rate || prev.rate
    }));
  };

  const handleKeyDown = (e) => {
    if (!showCityDropdown || filteredCities.length === 0) return;

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
        break;
      case 'Enter':
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

  return (
    <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200 shadow-md">
      {/* Main City Section */}
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* To City - Takes more space */}
        <div className="col-span-8">
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 text-sm font-bold rounded-lg min-w-24 text-center shadow-md">
              TO CITY
            </span>
            <div className="relative flex-1" ref={cityRef}>
              <input
                type="text"
                value={citySearch}
                onChange={handleInputChange}
                onFocus={() => setShowCityDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search city..."
                className="w-full px-4 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                tabIndex={4}
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

        {/* Toggle Transport Details Button */}
        <div className="col-span-4 flex justify-end">
          <button
            onClick={() => setShowTransportDetails(!showTransportDetails)}
            className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors border-2 border-blue-300 shadow-md"
          >
            {showTransportDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showTransportDetails ? 'Hide Transport' : 'Show Transport'}
          </button>
        </div>
      </div>

      {/* Collapsible Transport Details */}
      {showTransportDetails && (
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
                </span>
                <input
                  type="text"
                  value={formData.transport_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, transport_name: e.target.value }))}
                  className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                  tabIndex={5}
                  placeholder="Transport name"
                />
              </div>
            </div>

            {/* Transport GST */}
            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md">
                  GST
                </span>
                <input
                  type="text"
                  value={formData.transport_gst}
                  onChange={(e) => setFormData(prev => ({ ...prev, transport_gst: e.target.value }))}
                  className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                  tabIndex={6}
                  placeholder="GST number"
                />
              </div>
            </div>

            {/* Transport Phone */}
            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md">
                  PHONE
                </span>
                <input
                  type="text"
                  value={formData.transport_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, transport_number: e.target.value }))}
                  className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                  tabIndex={7}
                  placeholder="Phone number"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityTransportSection;