'use client';

import { useState, useEffect, useRef } from 'react';
import { X, TrendingUp, Users, MapPin, Search } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import ConsignorAutocomplete from './consignor-autocomplete';
import ConsignorRateStats from './consignor-rate-stats';
import ConsignorRateTable from './consignor-rate-table';

const RateSearchModal = ({ 
  isOpen, 
  onClose, 
  initialConsignor = '', 
  initialConsignee = '',
  initialCityId = '',
  cities = []
}) => {
  const [consignor, setConsignor] = useState(initialConsignor);
  const [consignee, setConsignee] = useState(initialConsignee);
  const [consigneeSearch, setConsigneeSearch] = useState(initialConsignee);
  const [consigneeSuggestions, setConsigneeSuggestions] = useState([]);
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false);
  const [cityId, setCityId] = useState(initialCityId);
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [consigneeSelectedIndex, setConsigneeSelectedIndex] = useState(-1);
  const [citySelectedIndex, setCitySelectedIndex] = useState(-1);
  
  const consigneeRef = useRef(null);
  const cityRef = useRef(null);
  const consigneeInputRef = useRef(null);
  const cityInputRef = useRef(null);

  // Handle Alt+E keyboard shortcut to toggle modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Update consignor when props change and auto-search if provided
  useEffect(() => {
    if (isOpen) {
      setConsignor(initialConsignor);
      setConsignee(initialConsignee);
      setConsigneeSearch(initialConsignee);
      setCityId(initialCityId);
      
      // Set city search from initialCityId
      if (initialCityId && cities.length > 0) {
        const city = cities.find(c => c.id === initialCityId);
        if (city) {
          setCitySearch(city.city_name);
        }
      } else {
        setCitySearch('');
      }
      
      // Auto-search if consignor is provided
      if (initialConsignor) {
        setTimeout(() => {
          handleSearch(initialConsignor, initialConsignee, initialCityId);
        }, 100);
      }
    }
  }, [isOpen, initialConsignor, initialConsignee, initialCityId, cities]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (consigneeRef.current && !consigneeRef.current.contains(event.target)) {
        setShowConsigneeDropdown(false);
      }
      if (cityRef.current && !cityRef.current.contains(event.target)) {
        setShowCityDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle consignor selection and auto-search
  const handleConsignorSelect = (selectedConsignor) => {
    setConsignor(selectedConsignor.company_name);
    
    // Focus consignee input after selection
    setTimeout(() => {
      consigneeInputRef.current?.focus();
    }, 100);
    
    // Auto-search is now optional - user can add consignee/city filters first
    // handleSearch(selectedConsignor.company_name, consignee, cityId);
  };

  // Handle consignor input change
  const handleConsignorChange = (value) => {
    setConsignor(value);
  };

  // Search consignees
  const searchConsignees = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) {
      setConsigneeSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('consignees')
        .select('id, company_name, gst_num, number')
        .ilike('company_name', `${searchTerm}%`)
        .order('company_name')
        .limit(20);

      if (error) {
        console.error('Error searching consignees:', error);
        setConsigneeSuggestions([]);
        return;
      }
      setConsigneeSuggestions(data || []);
    } catch (error) {
      console.error('Error searching consignees:', error);
      setConsigneeSuggestions([]);
    }
  };

  // Handle consignee input change
  const handleConsigneeChange = (value) => {
    const upperValue = value.toUpperCase();
    setConsigneeSearch(upperValue);
    setConsignee(upperValue);
    setShowConsigneeDropdown(true);
    setConsigneeSelectedIndex(-1);
    searchConsignees(upperValue);
  };

  // Select consignee
  const handleConsigneeSelect = (selectedConsignee) => {
    setConsigneeSearch(selectedConsignee.company_name);
    setConsignee(selectedConsignee.company_name);
    setShowConsigneeDropdown(false);
    setConsigneeSuggestions([]);
    setConsigneeSelectedIndex(-1);
    
    // Focus next input (city)
    setTimeout(() => {
      cityInputRef.current?.focus();
    }, 100);
  };

  // Handle consignee keyboard navigation
  const handleConsigneeKeyDown = (e) => {
    if (!showConsigneeDropdown || consigneeSuggestions.length === 0) {
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      
      if (consigneeSelectedIndex === -1) {
        // First Tab: Select first item in list
        setConsigneeSelectedIndex(0);
      } else if (consigneeSelectedIndex >= 0 && consigneeSelectedIndex < consigneeSuggestions.length) {
        // Second Tab: Confirm selection
        handleConsigneeSelect(consigneeSuggestions[consigneeSelectedIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setConsigneeSelectedIndex(prev => 
        prev < consigneeSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setConsigneeSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (consigneeSelectedIndex >= 0) {
        handleConsigneeSelect(consigneeSuggestions[consigneeSelectedIndex]);
      }
    }
  };

  // Handle city input change
  const handleCityInputChange = (value) => {
    const upperValue = value.toUpperCase();
    setCitySearch(upperValue);
    setShowCityDropdown(true);
    setCitySelectedIndex(-1);
    
    if (!value) {
      setCityId('');
      return;
    }
  };

  // Handle city selection
  const handleCitySelect = (city) => {
    setCitySearch(city.city_name);
    setCityId(city.id);
    setShowCityDropdown(false);
    setCitySelectedIndex(-1);
    
    // Focus search button or trigger search
    setTimeout(() => {
      handleSearch(consignor, consignee, city.id);
    }, 100);
  };

  // Handle city keyboard navigation
  const handleCityKeyDown = (e) => {
    const filteredCities = cities.filter(city => 
      city.city_name.toLowerCase().includes(citySearch.toLowerCase()) ||
      city.city_code.toLowerCase().includes(citySearch.toLowerCase())
    );

    if (!showCityDropdown || filteredCities.length === 0) {
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      
      if (citySelectedIndex === -1) {
        // First Tab: Select first item in list
        setCitySelectedIndex(0);
      } else if (citySelectedIndex >= 0 && citySelectedIndex < filteredCities.length) {
        // Second Tab: Confirm selection
        handleCitySelect(filteredCities[citySelectedIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCitySelectedIndex(prev => 
        prev < filteredCities.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCitySelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (citySelectedIndex >= 0) {
        handleCitySelect(filteredCities[citySelectedIndex]);
      }
    }
  };

  // Search bilties with any combination of filters
  const handleSearch = async (searchConsignor = consignor, searchConsignee = consignee, searchCityId = cityId) => {
    if (!searchConsignor) {
      alert('Please provide at least a Consignor');
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('bilty')
        .select('*')
        .eq('consignor_name', searchConsignor)
        .eq('is_active', true)
        .not('rate', 'is', null)
        .gt('rate', 0)
        .order('bilty_date', { ascending: false })
        .limit(200);

      // Add consignee filter if provided
      if (searchConsignee) {
        query = query.eq('consignee_name', searchConsignee);
      }

      // Add city filter if provided
      if (searchCityId) {
        query = query.eq('to_city_id', searchCityId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setResults(data || []);

      // Calculate enhanced statistics
      if (data && data.length > 0) {
        const rates = data.map(b => parseFloat(b.rate));
        
        // Most common rate calculation
        const rateFrequency = {};
        rates.forEach(rate => {
          rateFrequency[rate] = (rateFrequency[rate] || 0) + 1;
        });
        const mostCommonRate = Object.keys(rateFrequency).reduce((a, b) => 
          rateFrequency[a] > rateFrequency[b] ? a : b
        );

        // Separate by weight (above 50kg and below 50kg)
        const above50kg = data.filter(b => parseFloat(b.wt || 0) >= 50);
        const below50kg = data.filter(b => parseFloat(b.wt || 0) < 50);

        // Calculate most common rate for each weight category
        const getCommonRate = (bilties) => {
          if (bilties.length === 0) return null;
          const rates = bilties.map(b => parseFloat(b.rate));
          const freq = {};
          rates.forEach(rate => {
            freq[rate] = (freq[rate] || 0) + 1;
          });
          return Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);
        };

        const commonRateAbove50 = getCommonRate(above50kg);
        const commonRateBelow50 = getCommonRate(below50kg);

        // Separate by payment mode and delivery type
        const paidBilties = data.filter(b => b.payment_mode === 'paid');
        const topayBilties = data.filter(b => b.payment_mode === 'to-pay');
        
        // Separate by delivery type (DD = door delivery)
        const paidDDBilties = data.filter(b => 
          b.payment_mode === 'paid' && 
          (b.delivery_type === 'door-delivery' || b.delivery_type === 'door delivery' || b.delivery_type === 'DD')
        );
        const topayDDBilties = data.filter(b => 
          b.payment_mode === 'to-pay' && 
          (b.delivery_type === 'door-delivery' || b.delivery_type === 'door delivery' || b.delivery_type === 'DD')
        );
        
        // Godown delivery
        const paidGodownBilties = data.filter(b => 
          b.payment_mode === 'paid' && 
          (!b.delivery_type || b.delivery_type === 'godown' || 
          (b.delivery_type !== 'door-delivery' && b.delivery_type !== 'door delivery' && b.delivery_type !== 'DD'))
        );
        const topayGodownBilties = data.filter(b => 
          b.payment_mode === 'to-pay' && 
          (!b.delivery_type || b.delivery_type === 'godown' || 
          (b.delivery_type !== 'door-delivery' && b.delivery_type !== 'door delivery' && b.delivery_type !== 'DD'))
        );

        // Calculate city-wise statistics
        const cityStats = {};
        data.forEach(bilty => {
          const cityId = bilty.to_city_id;
          const rate = parseFloat(bilty.rate);
          
          if (!cityStats[cityId]) {
            cityStats[cityId] = {
              cityId,
              cityName: getCityName(cityId),
              rates: [],
              count: 0
            };
          }
          
          cityStats[cityId].rates.push(rate);
          cityStats[cityId].count++;
        });

        // Convert to array and calculate common rates (most frequent rate per city)
        const cityStatsArray = Object.values(cityStats).map(city => {
          const rateFreq = {};
          city.rates.forEach(rate => {
            rateFreq[rate] = (rateFreq[rate] || 0) + 1;
          });
          const commonRate = Object.keys(rateFreq).reduce((a, b) => 
            rateFreq[a] > rateFreq[b] ? a : b
          );
          
          return {
            ...city,
            commonRate: parseFloat(commonRate).toFixed(2)
          };
        }).sort((a, b) => b.count - a.count);

        setStats({
          count: data.length,
          mostCommonRate: parseFloat(mostCommonRate).toFixed(2),
          above50kg: {
            count: above50kg.length,
            commonRate: commonRateAbove50 ? parseFloat(commonRateAbove50).toFixed(2) : 'N/A'
          },
          below50kg: {
            count: below50kg.length,
            commonRate: commonRateBelow50 ? parseFloat(commonRateBelow50).toFixed(2) : 'N/A'
          },
          paymentModes: {
            paid: paidBilties.length,
            topay: topayBilties.length,
            paidDD: paidDDBilties.length,
            topayDD: topayDDBilties.length,
            paidGodown: paidGodownBilties.length,
            topayGodown: topayGodownBilties.length
          },
          cityStats: cityStatsArray
        });
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('Error searching rates:', error);
      alert('Error searching rates');
    } finally {
      setLoading(false);
    }
  };

  const getCityName = (cityId) => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.city_name : 'Unknown';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-3 rounded-t-xl flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Rate History Search</h2>
              <p className="text-xs text-white/80 mt-0.5">Open/Close with <span className="font-semibold bg-white/20 px-1.5 py-0.5 rounded">ALT + R</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Search Form */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Consignor */}
              <ConsignorAutocomplete
                value={consignor}
                onChange={handleConsignorChange}
                onSelect={handleConsignorSelect}
                autoFocus={true}
                placeholder="🔍 Start typing consignor..."
              />

              {/* Consignee */}
              <div ref={consigneeRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <Users className="w-3 h-3 inline mr-1" />
                  Consignee (Optional)
                </label>
                <div className="relative">
                  <input
                    ref={consigneeInputRef}
                    type="text"
                    value={consigneeSearch}
                    onChange={(e) => handleConsigneeChange(e.target.value)}
                    onKeyDown={handleConsigneeKeyDown}
                    onFocus={() => {
                      if (consigneeSearch.length >= 1) {
                        searchConsignees(consigneeSearch);
                        setShowConsigneeDropdown(true);
                      }
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter consignee name"
                  />
                  {showConsigneeDropdown && consigneeSuggestions.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 bg-indigo-500 text-white text-xs font-semibold rounded-t-lg sticky top-0">
                        SELECT CONSIGNEE
                      </div>
                      {consigneeSuggestions.map((consignee, index) => (
                        <button
                          key={consignee.id}
                          onClick={() => handleConsigneeSelect(consignee)}
                          className={`w-full px-3 py-2 text-left hover:bg-indigo-50 border-b border-slate-100 transition-colors ${
                            index === consigneeSelectedIndex ? 'bg-indigo-100' : ''
                          }`}
                        >
                          <div className="font-semibold text-xs text-slate-800">{consignee.company_name}</div>
                          {consignee.gst_num && (
                            <div className="text-xs text-slate-600">GST: {consignee.gst_num}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* City */}
              <div ref={cityRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  To City (Optional)
                </label>
                <div className="relative">
                  <input
                    ref={cityInputRef}
                    type="text"
                    value={citySearch}
                    onChange={(e) => handleCityInputChange(e.target.value)}
                    onKeyDown={handleCityKeyDown}
                    onFocus={() => setShowCityDropdown(true)}
                    placeholder="🔍 Search city..."
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {showCityDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 bg-indigo-500 text-white text-xs font-semibold rounded-t-lg sticky top-0">
                        SELECT CITY
                      </div>
                      {cities
                        .filter(city => 
                          city.city_name.toLowerCase().includes(citySearch.toLowerCase()) ||
                          city.city_code.toLowerCase().includes(citySearch.toLowerCase())
                        )
                        .map((city, index) => (
                          <button
                            key={city.id}
                            onClick={() => handleCitySelect(city)}
                            className={`w-full px-3 py-2 text-left hover:bg-indigo-50 border-b border-slate-100 transition-colors ${
                              index === citySelectedIndex ? 'bg-indigo-100' : ''
                            }`}
                          >
                            <div className="font-semibold text-xs text-slate-800">{city.city_name}</div>
                            <div className="text-xs text-slate-600">Code: {city.city_code}</div>
                          </button>
                        ))
                      }
                      {cities.filter(city => 
                        city.city_name.toLowerCase().includes(citySearch.toLowerCase()) ||
                        city.city_code.toLowerCase().includes(citySearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-600 text-center">
                          No cities found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-3 h-3" />
                      Search
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Compact Statistics */}
            {stats && (
              <div className="mt-3">
                <ConsignorRateStats stats={stats} />
              </div>
            )}
          </div>

          {/* Results Table */}
          <div className="p-4">
            <ConsignorRateTable 
              results={results} 
              cities={cities} 
              loading={loading} 
            />
          </div>
        </div>

        {/* Compact Footer */}
        <div className="p-2 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateSearchModal;
