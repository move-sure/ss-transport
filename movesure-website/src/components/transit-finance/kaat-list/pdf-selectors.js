'use client';

import React from 'react';
import { Truck, MapPin } from 'lucide-react';

export function TransportSelector({ transports, selectedTransport, onChange }) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-bold text-gray-700 mb-2">
        <Truck className="w-4 h-4 inline mr-1.5" />
        Select Transport
      </label>
      <select
        value={selectedTransport}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium cursor-pointer"
      >
        <option value="">-- Select a Transport --</option>
        {transports?.map(transport => (
          <option key={transport.id} value={transport.id}>
            {transport.company_name} {transport.hub_city_name ? `(${transport.hub_city_name})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CitySelector({ cities, selectedCity, onChange }) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-bold text-gray-700 mb-2">
        <MapPin className="w-4 h-4 inline mr-1.5" />
        Select City
      </label>
      <select
        value={selectedCity}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium cursor-pointer"
      >
        <option value="">-- Select a City --</option>
        {cities?.map(city => (
          <option key={city.id} value={city.id}>
            {city.city_name} ({city.city_code})
          </option>
        ))}
      </select>
    </div>
  );
}
