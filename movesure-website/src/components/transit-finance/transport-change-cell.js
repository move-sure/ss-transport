'use client';

import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { ChevronDown, Check, Loader2, X } from 'lucide-react';
import supabase from '../../app/utils/supabase';

/**
 * TransportChangeCell - Inline transport changer.
 * Click on transport name -> dropdown with transports for the destination city.
 * Updates bilty or station_bilty_summary table on selection.
 */
const TransportChangeCell = memo(function TransportChangeCell({
  transit,
  cities,
  transportsByCity = {},
  preloadedHubRates = {},
  getAdminNameForBilty,
  onTransportChanged,
}) {
  const bilty = transit.bilty;
  const station = transit.station;
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Determine destination city
  const destCityId = useMemo(() => {
    if (bilty?.to_city_id) return bilty.to_city_id;
    if (station?.station) {
      const city = cities?.find(c => c.city_code === station.station);
      return city?.id || null;
    }
    return null;
  }, [bilty, station, cities]);

  // Get transports for destination city from preloaded data
  const availableTransports = useMemo(() => {
    if (!destCityId) return [];

    // Get from transportsByCity (already loaded for station bilties)
    const fromCity = transportsByCity[destCityId] || [];
    
    // Also try to extract unique transports from preloaded hub rates
    const fromRates = (preloadedHubRates[destCityId] || [])
      .filter(r => r.transport)
      .map(r => ({
        id: r.transport.id || r.transport_id,
        transport_name: r.transport.transport_name || r.transport_name,
        gst_number: r.transport.gst_number || '',
        city_id: r.transport.city_id || destCityId,
      }));

    // Merge and deduplicate
    const map = new Map();
    [...fromCity, ...fromRates].forEach(t => {
      if (t.id && !map.has(t.id)) map.set(t.id, t);
    });

    return Array.from(map.values()).sort((a, b) =>
      (a.transport_name || '').localeCompare(b.transport_name || '')
    );
  }, [destCityId, transportsByCity, preloadedHubRates]);

  // Filter by search
  const filteredTransports = useMemo(() => {
    if (!search.trim()) return availableTransports;
    const q = search.toLowerCase().trim();
    return availableTransports.filter(t =>
      t.transport_name?.toLowerCase().includes(q) ||
      t.gst_number?.toLowerCase().includes(q)
    );
  }, [availableTransports, search]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const currentTransportName = bilty?.transport_name || null;
  const currentTransportGst = bilty?.transport_gst || null;

  // Handle transport selection
  const handleSelect = async (transport) => {
    if (saving) return;
    
    // If selecting same transport, just close
    if (transport.gst_number === currentTransportGst && transport.transport_name === currentTransportName) {
      setIsOpen(false);
      setSearch('');
      return;
    }

    try {
      setSaving(true);

      if (bilty) {
        // Update bilty table
        const { error } = await supabase
          .from('bilty')
          .update({
            transport_name: transport.transport_name,
            transport_gst: transport.gst_number || null,
            transport_id: transport.id || null,
          })
          .eq('id', bilty.id);

        if (error) throw error;
      } else if (station) {
        // Update station_bilty_summary table
        const { error } = await supabase
          .from('station_bilty_summary')
          .update({
            transport_name: transport.transport_name,
            transport_gst: transport.gst_number || null,
            transport_id: transport.id || null,
          })
          .eq('id', station.id);

        if (error) throw error;
      }

      // Notify parent to refresh data
      if (onTransportChanged) {
        onTransportChanged(transit.gr_no, {
          transport_name: transport.transport_name,
          transport_gst: transport.gst_number || null,
          transport_id: transport.id || null,
        });
      }

      setIsOpen(false);
      setSearch('');
    } catch (err) {
      console.error('Error updating transport:', err);
      alert('Failed to update transport: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // For station bilty without transport, show station transport cell style
  if (!bilty?.transport_name && station?.station) {
    const city = cities?.find(c => c.city_code === station.station);
    const cityTransports = city ? (transportsByCity[city.id] || []).slice(0, 3) : [];
    const adminName = getAdminNameForBilty && cityTransports.length > 0
      ? (() => { for (const t of cityTransports) { const n = getAdminNameForBilty(t.gst_number, t.transport_name); if (n) return n; } return null; })()
      : null;

    const displayTransport = cityTransports.length > 0 ? cityTransports[0] : null;

    return (
      <div className="relative" ref={dropdownRef}>
        <div
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className="cursor-pointer max-w-[140px] group/transport"
          title="Click to change transport"
        >
          {displayTransport ? (
            <>
              <div className="font-semibold text-indigo-700 text-[10px] break-words leading-tight group-hover/transport:text-blue-600 transition-colors">
                {displayTransport.transport_name}
                <ChevronDown className="w-2.5 h-2.5 inline ml-0.5 opacity-0 group-hover/transport:opacity-100 transition-opacity" />
              </div>
              {displayTransport.gst_number && (
                <div className="text-[8px] text-gray-400 truncate mt-0.5">{displayTransport.gst_number}</div>
              )}
              {cityTransports.length > 1 && (
                <div className="text-[8px] text-gray-500 mt-0.5">+{cityTransports.length - 1} more</div>
              )}
              {adminName && (
                <div className="text-[7px] text-teal-600 font-semibold truncate mt-0.5" title={`Admin: ${adminName}`}>
                  🏢 {adminName}
                </div>
              )}
            </>
          ) : (
            <span className="text-gray-300 text-[10px]">-</span>
          )}
        </div>

        {isOpen && renderDropdown(filteredTransports, search, setSearch, handleSelect, saving, inputRef, currentTransportGst, getAdminNameForBilty)}
      </div>
    );
  }

  // Regular bilty with transport
  const adminName = getAdminNameForBilty ? getAdminNameForBilty(bilty?.transport_gst, bilty?.transport_name) : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="cursor-pointer max-w-[140px] group/transport"
        title="Click to change transport"
      >
        {currentTransportName ? (
          <>
            <div className="font-semibold text-indigo-700 text-[10px] break-words leading-tight group-hover/transport:text-blue-600 transition-colors">
              {currentTransportName}
              <ChevronDown className="w-2.5 h-2.5 inline ml-0.5 opacity-0 group-hover/transport:opacity-100 transition-opacity" />
            </div>
            {currentTransportGst && (
              <div className="text-[8px] text-gray-400 truncate mt-0.5">{currentTransportGst}</div>
            )}
            {adminName && (
              <div className="text-[7px] text-teal-600 font-semibold truncate mt-0.5" title={`Admin: ${adminName}`}>
                🏢 {adminName}
              </div>
            )}
          </>
        ) : (
          <span className="text-gray-300 text-[10px]">-</span>
        )}
      </div>

      {isOpen && renderDropdown(filteredTransports, search, setSearch, handleSelect, saving, inputRef, currentTransportGst, getAdminNameForBilty)}
    </div>
  );
});

function renderDropdown(transports, search, setSearch, onSelect, saving, inputRef, currentGst, getAdminName) {
  return (
    <div className="absolute z-50 left-0 top-full mt-1 w-[280px] bg-white border border-gray-300 rounded-lg shadow-xl max-h-[300px] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search */}
      <div className="p-1.5 border-b border-gray-200 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transport..."
          className="w-full px-2 py-1 border border-gray-200 rounded text-[10px] focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
        />
      </div>

      {/* Transport List */}
      <div className="overflow-y-auto flex-1">
        {saving && (
          <div className="flex items-center justify-center gap-1 py-3 text-blue-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[10px] font-semibold">Updating...</span>
          </div>
        )}

        {!saving && transports.length === 0 && (
          <div className="py-3 text-center text-[10px] text-gray-400">
            No transports found
          </div>
        )}

        {!saving && transports.map(t => {
          const isActive = t.gst_number === currentGst;
          const adminName = getAdminName ? getAdminName(t.gst_number, t.transport_name) : null;
          return (
            <div
              key={t.id}
              onClick={() => onSelect(t)}
              className={`px-2 py-1.5 cursor-pointer border-b border-gray-50 flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'bg-blue-50 hover:bg-blue-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-semibold truncate ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                  {t.transport_name}
                </div>
                {t.gst_number && (
                  <div className="text-[8px] text-gray-400 truncate">{t.gst_number}</div>
                )}
                {adminName && (
                  <div className="text-[7px] text-teal-600 font-semibold truncate">🏢 {adminName}</div>
                )}
              </div>
              {isActive && <Check className="w-3 h-3 text-blue-600 flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TransportChangeCell;
