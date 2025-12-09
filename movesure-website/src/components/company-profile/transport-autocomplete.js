'use client';

import { useState, useEffect, useRef } from 'react';
import { Truck } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const TransportAutocomplete = ({ 
  value, 
  onChange, 
  onSelect,
  destinationCityId,
  autoFocus = false,
  placeholder = "Enter transport name",
  disabled = false
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
    if (autoFocus && inputRef.current && !disabled) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [autoFocus, disabled]);

  // Update search term when value prop changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Reset and clear when city changes
  useEffect(() => {
    if (destinationCityId) {
      // Load transports for the city
      const loadTransportsForCity = async () => {
        setLoading(true);
        try {
          console.log('🔍 Loading transports for city ID:', destinationCityId);
          const { data, error } = await supabase
            .from('transports')
            .select('id, transport_name, city_name, city_id, gst_number, mob_number')
            .eq('city_id', destinationCityId)
            .order('transport_name')
            .limit(20);

          if (error) {
            console.error('Error loading transports:', error);
            setSuggestions([]);
            return;
          }

          console.log(`✅ Found ${data?.length || 0} transports for this city`);

          if (data && data.length === 1) {
            // Auto-select if only one transport
            console.log('🎯 Auto-selecting only transport:', data[0].transport_name);
            const transport = data[0];
            setSearchTerm(transport.transport_name);
            onSelect(transport);
            setSuggestions([]);
            setShowDropdown(false);
          } else if (data && data.length > 1) {
            // Show options if multiple transports
            console.log('📋 Showing', data.length, 'transport options');
            setSuggestions(data);
            // Only show dropdown if transport field is empty
            if (!searchTerm) {
              setShowDropdown(true);
            }
          } else {
            console.log('⚠️ No transports found for this city');
            setSuggestions([]);
            setShowDropdown(false);
          }
        } catch (error) {
          console.error('Error loading transports:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      };

      loadTransportsForCity();
    } else {
      // Clear everything if no city selected
      setSearchTerm('');
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [destinationCityId]);

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

  // Search transports
  const searchTransports = async (searchValue, cityId = null) => {
    if (!searchValue || searchValue.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return null;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('transports')
        .select('id, transport_name, city_name, city_id, gst_number, mob_number');

      // Filter by destination city if provided
      const cityIdToUse = cityId || destinationCityId;
      if (cityIdToUse) {
        query = query.eq('city_id', cityIdToUse);
      }

      const { data, error } = await query
        .ilike('transport_name', `%${searchValue}%`)
        .order('transport_name')
        .limit(20);

      if (error) {
        console.error('Error searching transports:', error);
        setSuggestions([]);
        return null;
      }
      
      setSuggestions(data || []);
      setShowDropdown(true);
      return data || [];
    } catch (error) {
      console.error('Error searching transports:', error);
      setSuggestions([]);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = async (inputValue) => {
    const upperValue = inputValue.toUpperCase();
    setSearchTerm(upperValue);
    onChange(upperValue);
    setSelectedIndex(-1);
    
    if (!upperValue && destinationCityId) {
      // If field is cleared, reload transports for city and show dropdown
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('transports')
          .select('id, transport_name, city_name, city_id, gst_number, mob_number')
          .eq('city_id', destinationCityId)
          .order('transport_name')
          .limit(20);

        if (!error && data && data.length > 0) {
          setSuggestions(data);
          setShowDropdown(true);
          console.log('📋 Showing transport options after clearing field');
        }
      } catch (error) {
        console.error('Error loading transports:', error);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!upperValue) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Search for transports only if user is typing
    const filtered = await searchTransports(upperValue);
    
    if (!filtered) return;

    // Auto-select if only one option and user has typed
    if (filtered.length === 1 && upperValue.length > 0) {
      console.log('🎯 Auto-selecting single transport option:', filtered[0].transport_name);
      setTimeout(() => {
        handleTransportSelect(filtered[0]);
      }, 200);
    }
  };

  // Handle transport selection
  const handleTransportSelect = (transport) => {
    setSearchTerm(transport.transport_name);
    setShowDropdown(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    onSelect(transport);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    // Handle dropdown navigation
    if (showDropdown && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handleTransportSelect(suggestions[selectedIndex]);
          } else if (suggestions.length === 1) {
            handleTransportSelect(suggestions[0]);
          }
          break;
        case 'Tab':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handleTransportSelect(suggestions[selectedIndex]);
          } else if (suggestions.length === 1) {
            handleTransportSelect(suggestions[0]);
          } else if (suggestions.length > 0) {
            setSelectedIndex(0);
          }
          break;
        case 'Escape':
          setShowDropdown(false);
          setSelectedIndex(-1);
          break;
        default:
          break;
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        <Truck className="w-3 h-3 inline mr-1" />
        Transport
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={async () => {
            // Show dropdown on focus if city is selected
            if (destinationCityId && suggestions.length === 0) {
              setLoading(true);
              try {
                const { data, error } = await supabase
                  .from('transports')
                  .select('id, transport_name, city_name, city_id, gst_number, mob_number')
                  .eq('city_id', destinationCityId)
                  .order('transport_name')
                  .limit(20);

                if (!error && data && data.length > 0) {
                  setSuggestions(data);
                  setShowDropdown(true);
                }
              } catch (error) {
                console.error('Error loading transports:', error);
              } finally {
                setLoading(false);
              }
            } else if (suggestions.length > 0) {
              setShowDropdown(true);
            }
            
            // Also search if there's text
            if (searchTerm.length >= 1) {
              searchTransports(searchTerm);
            }
          }}
          disabled={disabled}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder={disabled ? "Select city first" : placeholder}
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 bg-indigo-500 text-white text-xs font-semibold rounded-t-lg sticky top-0">
              SELECT TRANSPORT
            </div>
            {suggestions.map((transport, index) => (
              <button
                key={transport.id}
                onClick={() => handleTransportSelect(transport)}
                className={`w-full px-3 py-2 text-left hover:bg-indigo-50 border-b border-slate-100 transition-colors ${
                  index === selectedIndex ? 'bg-indigo-100' : ''
                }`}
              >
                <div className="font-semibold text-xs text-slate-800">{transport.transport_name}</div>
                <div className="flex gap-2 text-xs text-slate-600">
                  {transport.city_name && <span>City: {transport.city_name}</span>}
                  {transport.gst_number && <span>GST: {transport.gst_number}</span>}
                  {transport.mob_number && <span>Ph: {transport.mob_number}</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {showDropdown && suggestions.length === 0 && searchTerm.length > 0 && !loading && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg">
            <div className="px-3 py-2 text-xs text-gray-600 text-center">
              No transports found
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransportAutocomplete;
