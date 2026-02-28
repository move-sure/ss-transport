'use client';

import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { ChevronDown, Check, Loader2, X } from 'lucide-react';
import supabase from '../../app/utils/supabase';

/**
 * TransportChangeCell - Inline transport picker.
 * Saves transport_id into bilty_wise_kaat table (NOT bilty/station).
 * If bilty_wise_kaat has a transport_id, that overrides the original bilty transport for display.
 */
const TransportChangeCell = memo(function TransportChangeCell({
  transit,
  cities,
  transportsByCity = {},
  preloadedHubRates = {},
  getAdminNameForBilty,
  onTransportChanged,
  kaatData,
  transportLookup = {},
  challanNo,
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
    const fromCity = transportsByCity[destCityId] || [];
    const fromRates = (preloadedHubRates[destCityId] || [])
      .filter(r => r.transport)
      .map(r => ({
        id: r.transport.id || r.transport_id,
        transport_name: r.transport.transport_name || r.transport_name,
        gst_number: r.transport.gst_number || '',
        city_id: r.transport.city_id || destCityId,
      }));
    const map = new Map();
    [...fromCity, ...fromRates].forEach(t => {
      if (t.id && !map.has(t.id)) map.set(t.id, t);
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.transport_name || '').localeCompare(b.transport_name || '')
    );
  }, [destCityId, transportsByCity, preloadedHubRates]);

  const filteredTransports = useMemo(() => {
    if (!search.trim()) return availableTransports;
    const q = search.toLowerCase().trim();
    return availableTransports.filter(t =>
      t.transport_name?.toLowerCase().includes(q) ||
      t.gst_number?.toLowerCase().includes(q)
    );
  }, [availableTransports, search]);

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

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Determine the DISPLAY transport: kaat override > original bilty/station transport
  const kaatTransportId = kaatData?.transport_id || null;
  const kaatTransport = kaatTransportId ? transportLookup[kaatTransportId] : null;

  const displayName = kaatTransport?.transport_name || bilty?.transport_name || station?.transport_name || null;
  const displayGst = kaatTransport?.gst_number || bilty?.transport_gst || station?.transport_gst || null;
  const isOverridden = !!kaatTransport;

  const handleSelect = async (transport) => {
    if (saving) return;
    if (kaatTransportId === transport.id) {
      setIsOpen(false);
      setSearch('');
      return;
    }
    try {
      setSaving(true);
      if (onTransportChanged) {
        await onTransportChanged(transit.gr_no, transport.id);
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

  // For station bilty with no original transport and no kaat override
  if (!displayName && station?.station) {
    const city = cities?.find(c => c.city_code === station.station);
    const cityTransports = city ? (transportsByCity[city.id] || []).slice(0, 3) : [];
    const firstTransport = cityTransports[0];
    const adminName = getAdminNameForBilty && cityTransports.length > 0
      ? (() => { for (const t of cityTransports) { const n = getAdminNameForBilty(t.gst_number, t.transport_name); if (n) return n; } return null; })()
      : null;

    return (
      <div className="relative" ref={dropdownRef}>
        <div
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className="cursor-pointer max-w-[140px] group/transport"
          title="Click to choose transport"
        >
          {firstTransport ? (
            <>
              <div className="font-semibold text-gray-400 text-[10px] break-words leading-tight group-hover/transport:text-blue-600 transition-colors italic">
                {firstTransport.transport_name}
                <ChevronDown className="w-2.5 h-2.5 inline ml-0.5 opacity-0 group-hover/transport:opacity-100 transition-opacity" />
              </div>
              {cityTransports.length > 1 && <div className="text-[8px] text-gray-400">+{cityTransports.length - 1} more</div>}
              {adminName && <div className="text-[7px] text-teal-600 font-semibold truncate mt-0.5">🏢 {adminName}</div>}
            </>
          ) : (
            <span className="text-gray-300 text-[10px] group-hover/transport:text-blue-500 cursor-pointer">Choose ▾</span>
          )}
        </div>
        {isOpen && renderDropdown(filteredTransports, search, setSearch, handleSelect, saving, inputRef, kaatTransportId, getAdminNameForBilty)}
      </div>
    );
  }

  const adminName = getAdminNameForBilty ? getAdminNameForBilty(displayGst, displayName) : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="cursor-pointer max-w-[140px] group/transport"
        title="Click to choose transport"
      >
        {displayName ? (
          <>
            <div className={`font-semibold text-[10px] break-words leading-tight group-hover/transport:text-blue-600 transition-colors ${
              isOverridden ? 'text-green-700' : 'text-indigo-700'
            }`}>
              {displayName}
              <ChevronDown className="w-2.5 h-2.5 inline ml-0.5 opacity-0 group-hover/transport:opacity-100 transition-opacity" />
            </div>
            {displayGst && <div className="text-[8px] text-gray-400 truncate mt-0.5">{displayGst}</div>}
            {isOverridden && <div className="text-[7px] text-green-600 font-semibold">✓ Selected</div>}
            {adminName && <div className="text-[7px] text-teal-600 font-semibold truncate mt-0.5" title={`Admin: ${adminName}`}>🏢 {adminName}</div>}
          </>
        ) : (
          <span className="text-gray-300 text-[10px] group-hover/transport:text-blue-500 cursor-pointer">Choose ▾</span>
        )}
      </div>
      {isOpen && renderDropdown(filteredTransports, search, setSearch, handleSelect, saving, inputRef, kaatTransportId, getAdminNameForBilty)}
    </div>
  );
});

function renderDropdown(transports, search, setSearch, onSelect, saving, inputRef, activeTransportId, getAdminName) {
  return (
    <div className="absolute z-50 left-0 top-full mt-1 w-[280px] bg-white border border-gray-300 rounded-lg shadow-xl max-h-[300px] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
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
      <div className="overflow-y-auto flex-1">
        {saving && (
          <div className="flex items-center justify-center gap-1 py-3 text-blue-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[10px] font-semibold">Saving...</span>
          </div>
        )}
        {!saving && transports.length === 0 && (
          <div className="py-3 text-center text-[10px] text-gray-400">No transports found</div>
        )}
        {!saving && transports.map(t => {
          const isActive = t.id === activeTransportId;
          const adminName = getAdminName ? getAdminName(t.gst_number, t.transport_name) : null;
          return (
            <div
              key={t.id}
              onClick={() => onSelect(t)}
              className={`px-2 py-1.5 cursor-pointer border-b border-gray-50 flex items-center gap-1.5 transition-colors ${
                isActive ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-semibold truncate ${isActive ? 'text-green-700' : 'text-gray-800'}`}>
                  {t.transport_name}
                </div>
                {t.gst_number && <div className="text-[8px] text-gray-400 truncate">{t.gst_number}</div>}
                {adminName && <div className="text-[7px] text-teal-600 font-semibold truncate">🏢 {adminName}</div>}
              </div>
              {isActive && <Check className="w-3 h-3 text-green-600 flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TransportChangeCell;
