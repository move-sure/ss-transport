'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import { useInputNavigation } from './input-navigation';

const CityTransportSection = ({ 
  formData, 
  setFormData, 
  cities, 
  transports, 
  transportByCityId = {},
  consignorRatesByCity = {},
  defaultRateByCityId = {},
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

  // Multi-transport dropdown state
  const [availableTransports, setAvailableTransports] = useState([]);
  const [showTransportDropdown, setShowTransportDropdown] = useState(false);
  const [transportSelectedIndex, setTransportSelectedIndex] = useState(-1);
  const transportDropdownRef = useRef(null);

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
      if (transportDropdownRef.current && !transportDropdownRef.current.contains(event.target)) {
        setShowTransportDropdown(false);
      }
    };    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset transport dropdown when form resets
  useEffect(() => {
    setAvailableTransports([]);
    setShowTransportDropdown(false);
    setTransportSelectedIndex(-1);
  }, [resetKey]);  // Register inputs for navigation
  useEffect(() => {
    if (cityInputRef.current) {
      register(1, cityInputRef.current, {
        beforeFocus: () => {
          console.log('🎯 Focusing on City input');
        },
        afterFocus: () => {
          console.log('✅ City input focused');
        }
      });
    }
    if (transportNameRef.current) {
      register(2, transportNameRef.current, {
        skipCondition: () => !formData.transport_name, // Skip if no transport name
      });
    }
    if (transportGstRef.current) {
      register(3, transportGstRef.current, {
        skipCondition: () => !formData.transport_gst,
      });
    }
    if (transportNumberRef.current) {
      register(4, transportNumberRef.current, {
        skipCondition: () => !formData.transport_number,
      });
    }
    
    return () => {
      unregister(1);
      unregister(2);
      unregister(3);
      unregister(4);
    };
  }, [register, unregister]);
  // Shared rate fetching logic — uses backend-cached data (no Supabase calls)
  const fetchRateForCity = async (city, transport) => {
    let selectedRate = null;
    let profileTransport = null;

    // PRIORITY 1: Consignor bilty profile rate from backend cache
    const consignorCityRates = consignorRatesByCity[city.id];
    if (consignorCityRates && consignorCityRates.length > 0) {
      const profile = consignorCityRates[0];
      selectedRate = parseFloat(profile.rate) || null;
      console.log('✅ Using consignor profile rate from backend:', selectedRate, profile.rate_unit);
      
      // Profile may also specify transport for this city
      if (profile.transport_name) {
        profileTransport = {
          transport_name: profile.transport_name,
          gst_number: profile.transport_gst || '',
          mob_number: '',
          id: null
        };
        console.log('🚛 Using transport from consignor profile:', profile.transport_name);
      }
    }

    // PRIORITY 2: Default rate from backend cache
    if (!selectedRate) {
      const defRate = defaultRateByCityId[city.id];
      if (defRate) {
        selectedRate = parseFloat(defRate);
        console.log('✅ Using default rate from backend:', selectedRate);
      }
    }

    // PRIORITY 3: Fallback to rates array (legacy)
    if (!selectedRate) {
      const cityRates = rates.filter(r => r.city_id === city.id);
      const defaultRate = cityRates.find(r => r.is_default) || cityRates[0];
      if (defaultRate) {
        selectedRate = defaultRate.rate;
        console.log('✅ Using fallback rate from rates array:', selectedRate);
      }
    }

    // Use profile transport if available, otherwise use city-matched transport
    const effectiveTransport = profileTransport || transport;

    // Update form data
    setFormData(prev => ({
      ...prev,
      to_city_id: city.id,
      transport_name: effectiveTransport?.transport_name || '',
      transport_gst: effectiveTransport?.gst_number || '',
      transport_number: effectiveTransport?.mob_number || '',
      transport_id: effectiveTransport?.id || null,
      rate: selectedRate || prev.rate || 0
    }));
  };

  // Handle selecting a transport from the multi-transport dropdown
  const handleTransportSelect = (transport) => {
    setShowTransportDropdown(false);
    setTransportSelectedIndex(-1);

    // Find the city object for rate lookup
    const city = cities.find(c => c.id === transport.city_id);
    if (city) {
      fetchRateForCity(city, transport);
    } else {
      // Fallback: just set transport fields
      setFormData(prev => ({
        ...prev,
        transport_name: transport.transport_name || '',
        transport_gst: transport.gst_number || '',
        transport_number: transport.mob_number || '',
        transport_id: transport.id || null
      }));
    }
    console.log('✅ Selected transport:', transport.transport_name);
  };

  const handleCitySelect = (city) => {
    setCitySearch(city.city_name);
    setShowCityDropdown(false);
    setSelectedIndex(-1);
    
    // Find transports for this city — prefer pre-mapped lookup from backend, fallback to filter
    const cityTransports = transportByCityId[city.id] || transports.filter(t => t.city_id === city.id);
    
    // Sort: priority transport (is_prior=true) first
    const sortedTransports = [...cityTransports].sort((a, b) => (b.is_prior ? 1 : 0) - (a.is_prior ? 1 : 0));
    const priorityTransport = sortedTransports.find(t => t.is_prior) || sortedTransports[0] || null;

    if (sortedTransports.length > 1) {
      console.log(`🚛 ${sortedTransports.length} transports for ${city.city_name}, auto-selecting priority:`, priorityTransport?.transport_name);
      setAvailableTransports(sortedTransports);
      setShowTransportDropdown(false);
      setTransportSelectedIndex(-1);
      fetchRateForCity(city, priorityTransport);
    } else {
      setAvailableTransports(sortedTransports.length === 1 ? sortedTransports : []);
      setShowTransportDropdown(false);
      fetchRateForCity(city, priorityTransport);
    }
  };  const handleKeyDown = (e) => {
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
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
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
      // Let Tab work naturally for regular navigation
    }
  };
  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase(); // Convert to uppercase
    setCitySearch(value);
    setShowCityDropdown(true);
    setSelectedIndex(-1);
    
    // Clear to_city_id if search is cleared
    if (!value) {
      setFormData(prev => ({ ...prev, to_city_id: '' }));
      return;
    }

    // Filter cities based on input
    const filtered = cities.filter(city => {
      const matchesSearch = city.city_name.toLowerCase().includes(value.toLowerCase()) ||
                           city.city_code.toLowerCase().includes(value.toLowerCase());
      const isDifferentFromSource = city.city_name.toLowerCase() !== fromCityName.toLowerCase();
      return matchesSearch && isDifferentFromSource;
    });

    // Auto-select if only one option remains and user has typed enough
    if (filtered.length === 1 && value.length > 2) {
      console.log('🎯 Auto-selecting single city option:', filtered[0].city_name);
      setTimeout(() => {
        handleCitySelect(filtered[0]);
      }, 500);
    }
    
    // Auto-fill if exact match found with city code
    const exactMatch = filtered.find(city => 
      city.city_code.toLowerCase() === value.toLowerCase()
    );
    
    if (exactMatch && value.length >= 2) {
      setTimeout(() => {
        if (value === exactMatch.city_code.toLowerCase() || 
            value === exactMatch.city_code) {
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
    <div className="bg-white/95 p-3 rounded-lg border border-slate-200 shadow-sm">
      {/* Single Row Layout - City and Transport Details */}
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* To City */}
        <div className="col-span-3">
          <div className="flex items-center gap-2">
            <span className="bg-teal-600 text-white px-2 py-1.5 text-xs font-semibold rounded-lg min-w-[65px] text-center shadow-sm">
              TO CITY
            </span>
            <div className="relative flex-1" ref={cityRef}>
              <input
                type="text"
                ref={cityInputRef}
                value={citySearch}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="🔍 City..."
                className="w-full px-2 py-1.5 text-slate-900 text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm placeholder-slate-400 focus:border-teal-400 focus:ring-0 transition-colors duration-200 hover:border-teal-300"
                tabIndex={1}
                aria-expanded={showCityDropdown}
                role="combobox"
              />
              {showCityDropdown && (
                <div className="absolute z-30 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  <div className="p-3 bg-teal-600 text-white text-xs font-semibold rounded-t-lg">
                    CITY WISE AUTO FILL DETAILS HERE
                  </div>
                  {filteredCities.length > 0 ? (
                    filteredCities.map((city, index) => (
                      <button
                        key={city.id}
                        onClick={() => handleCitySelect(city)}
                        className={`w-full px-4 py-3 text-left hover:bg-teal-50 text-xs border-b border-slate-100 transition-colors ${
                          index === selectedIndex ? 'bg-teal-100' : ''
                        }`}
                      >
                        <div className="font-semibold text-slate-800">{city.city_name}</div>
                        <div className="text-xs text-slate-600">Code: {city.city_code}</div>
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

        {/* Transport Name with Multi-Transport Dropdown */}
        <div className="col-span-4">
          <div className="flex items-center gap-1">
            <span className={`px-2 py-1.5 text-xs font-semibold rounded-lg min-w-[40px] text-center shadow-sm flex items-center gap-1 ${
              availableTransports.length > 1 ? 'bg-amber-500 text-white animate-pulse' : 'bg-teal-600 text-white'
            }`}>
              {availableTransports.find(t => t.transport_name === formData.transport_name)?.is_prior && (
                <span className="w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse" title="Priority Transport"></span>
              )}
              TRP{availableTransports.length > 1 ? ` (${availableTransports.length})` : ''}
            </span>
            <div className="relative flex-1" ref={transportDropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  ref={transportNameRef}
                  value={formData.transport_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, transport_name: e.target.value.toUpperCase() }))}

                  onKeyDown={(e) => {
                    // Handle transport dropdown navigation
                    if (showTransportDropdown && availableTransports.length > 1) {
                      switch (e.key) {
                        case 'ArrowDown':
                          e.preventDefault();
                          setTransportSelectedIndex(prev => prev < availableTransports.length - 1 ? prev + 1 : 0);
                          return;
                        case 'ArrowUp':
                          e.preventDefault();
                          setTransportSelectedIndex(prev => prev > 0 ? prev - 1 : availableTransports.length - 1);
                          return;
                        case 'Enter':
                        case 'Tab':
                          e.preventDefault();
                          e.stopPropagation();
                          if (transportSelectedIndex >= 0) {
                            handleTransportSelect(availableTransports[transportSelectedIndex]);
                          } else if (availableTransports.length > 0) {
                            handleTransportSelect(availableTransports[0]);
                          }
                          return;
                        case 'Escape':
                          e.preventDefault();
                          setShowTransportDropdown(false);
                          setTransportSelectedIndex(-1);
                          return;
                      }
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleEnter(e, 2);
                    }
                  }}
                  className={`flex-1 w-full px-2 py-1.5 text-slate-900 text-sm font-semibold border rounded-lg bg-white shadow-sm focus:ring-0 transition-colors duration-200 ${
                    availableTransports.length > 1 && !formData.transport_name
                      ? 'border-amber-400 focus:border-amber-500 hover:border-amber-400 bg-amber-50'
                      : 'border-slate-300 focus:border-teal-400 hover:border-teal-300'
                  }`}
                  placeholder={availableTransports.length > 1 ? `Click ▼ to change transport` : 'Transport name'}
                  tabIndex={2}
                />
                {availableTransports.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowTransportDropdown(!showTransportDropdown)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-amber-600 hover:text-amber-800"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showTransportDropdown ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Multi-Transport Dropdown */}
              {showTransportDropdown && availableTransports.length > 1 && (
                <div className="absolute z-40 mt-1 w-full bg-white border border-amber-300 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                  <div className="p-2 bg-amber-500 text-white text-xs font-semibold rounded-t-lg flex items-center justify-between">
                    <span>🚛 SELECT TRANSPORT ({availableTransports.length} available)</span>
                    <button onClick={() => setShowTransportDropdown(false)} className="hover:bg-amber-600 rounded px-1">✕</button>
                  </div>
                  {availableTransports.map((t, index) => (
                    <button
                      key={t.id}
                      onClick={() => handleTransportSelect(t)}
                      className={`w-full px-3 py-2.5 text-left hover:bg-amber-50 border-b border-gray-100 transition-colors ${
                        index === transportSelectedIndex ? 'bg-amber-100' : ''
                      } ${
                        formData.transport_name === t.transport_name ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {t.is_prior && (
                              <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block flex-shrink-0" title="Priority Transport"></span>
                            )}
                            <span className="font-bold text-sm text-slate-900">{t.transport_name}</span>
                            {t.is_prior && (
                              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">PRIORITY</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {t.gst_number && (
                              <span className="text-xs text-gray-600 font-mono bg-gray-100 px-1 rounded">GST: {t.gst_number}</span>
                            )}
                            {t.mob_number && (
                              <span className="text-xs text-gray-600">📱 {t.mob_number}</span>
                            )}
                          </div>
                          {t.address && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[280px]">{t.address}</div>
                          )}
                        </div>
                        {formData.transport_name === t.transport_name && (
                          <span className="text-green-600 text-sm">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transport GST */}
        <div className="col-span-3">
          <div className="flex items-center gap-1">
            <span className="bg-teal-600 text-white px-2 py-1.5 text-xs font-semibold rounded-lg min-w-[45px] text-center shadow-sm">
              GST
            </span>
            <input
              type="text"
              ref={transportGstRef}
              value={formData.transport_gst}
              onChange={(e) => setFormData(prev => ({ ...prev, transport_gst: e.target.value.toUpperCase() }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleEnter(e, 3);
                }
              }}
              className="flex-1 px-2 py-1.5 text-slate-900 text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm focus:border-teal-400 focus:ring-0 transition-colors duration-200 hover:border-teal-300"
              placeholder="GST"
              tabIndex={3}
            />
          </div>
        </div>

        {/* Transport Phone */}
        <div className="col-span-2">
          <div className="flex items-center gap-1">
            <span className="bg-teal-600 text-white px-2 py-1.5 text-xs font-semibold rounded-lg min-w-[32px] flex items-center justify-center shadow-sm">
              <Phone className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              ref={transportNumberRef}
              value={formData.transport_number}
              onChange={(e) => setFormData(prev => ({ ...prev, transport_number: e.target.value.toUpperCase() }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleEnter(e, 4);
                }
              }}
              maxLength={10}
              className="w-40 px-2 py-1.5 text-slate-900 text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm focus:border-teal-400 focus:ring-0 transition-colors duration-200 hover:border-teal-300"
              placeholder="Phone"
              tabIndex={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CityTransportSection;