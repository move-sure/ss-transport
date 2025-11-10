'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import { useInputNavigation } from './input-navigation';
import supabase from '../../app/utils/supabase';

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
  }, []);  // Register inputs for navigation
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
  const handleCitySelect = (city) => {
    setCitySearch(city.city_name);
    setShowCityDropdown(false);
    setSelectedIndex(-1);
    
    // Find transport for this city
    const cityTransports = transports.filter(t => t.city_id === city.id);
    const transport = cityTransports[0] || null;
    
    // Enhanced rate lookup with historical data priority
    const fetchRateForCity = async () => {
      let selectedRate = null;
      
      // PRIORITY 1: Check historical bilty data if consignor is selected
      if (formData.consignor_name && formData.branch_id) {
        try {
          console.log('🔍 Checking historical rates for:', formData.consignor_name, 'to city:', city.city_name);
          
          // Query last 20 bilties for this consignor + city combination
          const { data: historicalBilties, error } = await supabase
            .from('bilty')
            .select('rate')
            .eq('consignor_name', formData.consignor_name)
            .eq('to_city_id', city.id)
            .eq('branch_id', formData.branch_id)
            .eq('is_active', true)
            .not('rate', 'is', null)
            .gt('rate', 0)
            .order('bilty_date', { ascending: false })
            .limit(20);
          
          if (!error && historicalBilties && historicalBilties.length > 0) {
            // Calculate most common rate
            const rateCounts = {};
            historicalBilties.forEach(bilty => {
              const rate = parseFloat(bilty.rate);
              rateCounts[rate] = (rateCounts[rate] || 0) + 1;
            });
            
            // Find most common rate
            let mostCommonRate = null;
            let maxCount = 0;
            Object.entries(rateCounts).forEach(([rate, count]) => {
              if (count > maxCount) {
                maxCount = count;
                mostCommonRate = parseFloat(rate);
              }
            });
            
            if (mostCommonRate) {
              selectedRate = mostCommonRate;
              console.log('✅ Using historical rate from bilty table:', selectedRate, `(used ${maxCount}/${historicalBilties.length} times)`);
            }
          }
        } catch (error) {
          console.warn('Error fetching historical rate:', error);
        }
      }
      
      // PRIORITY 2: If no historical rate, check rates table for consignor-specific rate
      if (!selectedRate && formData.consignor_name) {
        console.log('🔍 Looking for consignor-specific rate in rates table');
        const cityRates = rates.filter(r => r.city_id === city.id);
        const consignorSpecificRates = cityRates.filter(r => !r.is_default && r.consignor_id);
        
        if (consignorSpecificRates.length > 0) {
          selectedRate = consignorSpecificRates[0].rate;
          console.log('✅ Using consignor-specific rate from rates table:', selectedRate);
        }
      }
      
      // PRIORITY 3: Fall back to default rate from rates table
      if (!selectedRate) {
        console.log('🔍 Looking for default rate in rates table');
        const cityRates = rates.filter(r => r.city_id === city.id);
        const defaultRate = cityRates.find(r => r.is_default) || cityRates[0];
        
        if (defaultRate) {
          selectedRate = defaultRate.rate;
          console.log('✅ Using default rate from rates table:', selectedRate);
        } else {
          console.log('⚠️ No rate found for this city');
        }
      }
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        to_city_id: city.id,
        transport_name: transport?.transport_name || '',
        transport_gst: transport?.gst_number || '',
        transport_number: transport?.mob_number || '',
        rate: selectedRate || prev.rate || 0
      }));
    };
    
    // Execute the rate fetching
    fetchRateForCity();
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
            <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg min-w-[65px] text-center shadow-sm">
              TO CITY
            </span>
            <div className="relative flex-1" ref={cityRef}>
              <input
                type="text"
                ref={cityInputRef}
                value={citySearch}
                onChange={handleInputChange}
                onFocus={() => setShowCityDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="🔍 City..."
                className="w-full px-2 py-1.5 text-slate-900 text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm placeholder-slate-400 focus:border-indigo-400 focus:ring-0 transition-colors duration-200 hover:border-indigo-300"
                tabIndex={1}
                aria-expanded={showCityDropdown}
                role="combobox"
              />
              {showCityDropdown && (
                <div className="absolute z-30 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  <div className="p-3 bg-indigo-500 text-white text-xs font-semibold rounded-t-lg">
                    CITY WISE AUTO FILL DETAILS HERE
                  </div>
                  {filteredCities.length > 0 ? (
                    filteredCities.map((city, index) => (
                      <button
                        key={city.id}
                        onClick={() => handleCitySelect(city)}
                        className={`w-full px-4 py-3 text-left hover:bg-indigo-50 text-xs border-b border-slate-100 transition-colors ${
                          index === selectedIndex ? 'bg-indigo-100' : ''
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

        {/* Transport Name */}
        <div className="col-span-4">
          <div className="flex items-center gap-1">
            <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg min-w-[40px] text-center shadow-sm">
              TRP
            </span>
            <input
              type="text"
              ref={transportNameRef}
              value={formData.transport_name}
              onChange={(e) => setFormData(prev => ({ ...prev, transport_name: e.target.value.toUpperCase() }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleEnter(e, 2);
                }
              }}
              className="flex-1 px-2 py-1.5 text-slate-900 text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm focus:border-indigo-400 focus:ring-0 transition-colors duration-200 hover:border-indigo-300"
              placeholder="Transport name"
              tabIndex={2}
            />
          </div>
        </div>

        {/* Transport GST */}
        <div className="col-span-3">
          <div className="flex items-center gap-1">
            <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg min-w-[45px] text-center shadow-sm">
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
              className="flex-1 px-2 py-1.5 text-slate-900 text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm focus:border-indigo-400 focus:ring-0 transition-colors duration-200 hover:border-indigo-300"
              placeholder="GST"
              tabIndex={3}
            />
          </div>
        </div>

        {/* Transport Phone */}
        <div className="col-span-2">
          <div className="flex items-center gap-1">
            <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg min-w-[32px] flex items-center justify-center shadow-sm">
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
              className="w-24 px-2 py-1.5 text-slate-900 text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm focus:border-indigo-400 focus:ring-0 transition-colors duration-200 hover:border-indigo-300"
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