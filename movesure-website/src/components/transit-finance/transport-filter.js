'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Truck, X, Loader2 } from 'lucide-react';
import supabase from '../../app/utils/supabase';

export default function TransportFilter({ 
  challanTransits, 
  selectedTransports, 
  onTransportSelect,
  onTransportClear,
  cities,
  onAvailableTransportsUpdate
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableTransports, setAvailableTransports] = useState([]);

  // Get unique destination city IDs from bilties
  const destinationCityIds = useMemo(() => {
    const cityIds = new Set();
    
    challanTransits.forEach(transit => {
      // From regular bilty
      if (transit.bilty?.to_city_id) {
        cityIds.add(transit.bilty.to_city_id);
      }
      // From station bilty - convert station code to city_id
      if (transit.station?.station) {
        const city = cities?.find(c => c.city_code === transit.station.station);
        if (city?.id) {
          cityIds.add(city.id);
        }
      }
    });
    
    return Array.from(cityIds);
  }, [challanTransits, cities]);

  // Fetch transports from database for destination cities
  useEffect(() => {
    if (destinationCityIds.length > 0) {
      fetchTransportsForCities();
    } else {
      setAvailableTransports([]);
    }
  }, [destinationCityIds]);

  const fetchTransportsForCities = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('transports')
        .select('id, transport_name, gst_number, city_id')
        .in('city_id', destinationCityIds);

      if (error) throw error;

      const transports = data || [];
      setAvailableTransports(transports);
      
      // Notify parent component about available transports
      if (onAvailableTransportsUpdate) {
        onAvailableTransportsUpdate(transports);
      }
    } catch (err) {
      console.error('Error fetching transports:', err);
      setAvailableTransports([]);
      if (onAvailableTransportsUpdate) {
        onAvailableTransportsUpdate([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Build unique transport list with city breakdown
  const uniqueTransports = useMemo(() => {
    const transportMap = new Map();

    challanTransits.forEach(transit => {
      const bilty = transit.bilty;
      const station = transit.station;
      
      let destinationCityId = null;
      let destinationCityName = 'Unknown';

      // Get destination city from bilty or station
      if (bilty?.to_city_id) {
        destinationCityId = bilty.to_city_id;
        const city = cities?.find(c => c.id === destinationCityId);
        destinationCityName = city?.city_name || 'Unknown';
      } else if (station?.station) {
        const city = cities?.find(c => c.city_code === station.station);
        if (city) {
          destinationCityId = city.id;
          destinationCityName = city.city_name;
        }
      }

      if (!destinationCityId) return;

      // Find all transports for this destination city from database
      const cityTransports = availableTransports.filter(t => t.city_id === destinationCityId);

      cityTransports.forEach(dbTransport => {
        const transportName = dbTransport.transport_name.trim();
        const transportGst = dbTransport.gst_number?.trim() || null;
        
        // Create unique key based on GST if available, otherwise just name
        const key = transportGst 
          ? `gst_${transportGst}` 
          : `name_${transportName.toLowerCase()}`;
        
        // Initialize transport entry if not exists
        if (!transportMap.has(key)) {
          transportMap.set(key, {
            name: transportName,
            gst: transportGst,
            count: 0,
            type: 'regular',
            cityBreakdown: {}
          });
        }
        
        const transport = transportMap.get(key);
        transport.count++;
        
        // Track city-wise count
        if (!transport.cityBreakdown[destinationCityName]) {
          transport.cityBreakdown[destinationCityName] = 0;
        }
        transport.cityBreakdown[destinationCityName]++;
      });
    });

    // Convert to array and add formatted city breakdown text
    const transportsArray = Array.from(transportMap.values()).map(transport => {
      const breakdownText = Object.entries(transport.cityBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([city, count]) => `${count} ${city}`)
        .join(', ');
      
      return {
        ...transport,
        breakdownText
      };
    });

    // Sort by count (highest first), then by name
    return transportsArray.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [challanTransits, cities, availableTransports]);

  const filteredTransports = useMemo(() => {
    if (!searchQuery.trim()) return uniqueTransports;
    
    const query = searchQuery.toLowerCase();
    return uniqueTransports.filter(t => 
      t.name?.toLowerCase().includes(query) ||
      t.gst?.toLowerCase().includes(query) ||
      t.breakdownText?.toLowerCase().includes(query)
    );
  }, [uniqueTransports, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
        <span className="text-xs text-gray-600">Loading transports...</span>
      </div>
    );
  }

  if (uniqueTransports.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex flex-col gap-1">
        {/* Selected Transports Chips */}
        {selectedTransports.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedTransports.map((transport, idx) => (
              <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-full">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold leading-tight">{transport.name}</span>
                  <div className="text-[8px] opacity-90 leading-tight">
                    {transport.gst && <span>{transport.gst} • </span>}
                    <span>{transport.count} bilties</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const updated = selectedTransports.filter((_, i) => i !== idx);
                    onTransportSelect(updated);
                  }}
                  className="hover:bg-white/20 rounded-full p-0.5 ml-1"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            <button
              onClick={onTransportClear}
              className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-semibold hover:bg-red-700"
            >
              Clear All
            </button>
          </div>
        )}
        
        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Truck className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-indigo-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search transport by name/GST..."
              className="w-full pl-8 pr-10 py-1.5 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
            />
          </div>

          {selectedTransports.length > 0 && (
            <div className="px-2 py-1 bg-indigo-100 rounded-lg text-[10px] font-bold text-indigo-700 whitespace-nowrap">
              {selectedTransports.reduce((sum, t) => sum + t.count, 0)} bilties
            </div>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && filteredTransports.length > 0 && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-indigo-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
            {filteredTransports.map((transport, index) => {
              const isSelected = selectedTransports.some(t => {
                // Match by GST if both have it
                if (t.gst && transport.gst) return t.gst === transport.gst;
                // Match by name for transports without GST
                return t.name.toLowerCase() === transport.name.toLowerCase();
              });
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (!isSelected) {
                      onTransportSelect([...selectedTransports, transport]);
                    }
                    setShowDropdown(false);
                    setSearchQuery('');
                  }}
                  className={`w-full px-3 py-2 transition-colors text-left border-b border-gray-100 last:border-b-0 ${
                    isSelected ? 'bg-indigo-100 hover:bg-indigo-300' : 'hover:bg-indigo-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-gray-900 truncate">{transport.name}</div>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {transport.gst && (
                          <div className="text-[9px] text-gray-500 truncate">{transport.gst}</div>
                        )}
                        <div className="text-[9px] text-purple-600 truncate">
                          {transport.breakdownText}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-bold flex-shrink-0">
                        {transport.count}
                      </span>
                      {isSelected && (
                        <span className="text-indigo-600 font-bold text-xs">✓</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
