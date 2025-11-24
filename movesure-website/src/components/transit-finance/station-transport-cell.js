'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import supabase from '../../app/utils/supabase';

export default function StationTransportCell({ stationCode, cities }) {
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransports();
  }, [stationCode]);

  const loadTransports = async () => {
    try {
      setLoading(true);

      // Find city by station code
      const city = cities?.find(c => c.city_code === stationCode);
      
      if (!city) {
        setTransports([]);
        return;
      }

      // Fetch transports for this city
      const { data, error } = await supabase
        .from('transports')
        .select('transport_name, gst_number')
        .eq('city_id', city.id)
        .limit(3); // Show max 3 transports

      if (error) throw error;

      setTransports(data || []);

    } catch (err) {
      console.error('Error loading station transports:', err);
      setTransports([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
        <span className="text-[10px] text-gray-500">Loading...</span>
      </div>
    );
  }

  if (transports.length === 0) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  if (transports.length === 1) {
    return (
      <div className="max-w-[150px]" title={transports[0].transport_name}>
        <div className="font-semibold text-indigo-700 text-[10px] break-words leading-tight">{transports[0].transport_name}</div>
        {transports[0].gst_number && (
          <div className="text-[8px] text-gray-500 truncate mt-0.5">{transports[0].gst_number}</div>
        )}
      </div>
    );
  }

  // Multiple transports - show count
  return (
    <div className="max-w-[150px]" title={transports.map(t => t.transport_name).join(', ')}>
      <div className="font-semibold text-indigo-700 text-[10px] break-words leading-tight">{transports[0].transport_name}</div>
      <div className="text-[8px] text-gray-500 mt-0.5">+{transports.length - 1} more</div>
    </div>
  );
}
