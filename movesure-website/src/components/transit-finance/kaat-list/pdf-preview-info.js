'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function PDFPreviewInfo({ settings, cities, transports }) {
  const getFilterTitle = () => {
    if (settings.filterType === 'transport' && settings.selectedTransport) {
      const transport = transports?.find(t => t.id === settings.selectedTransport);
      return `Transport: ${transport?.company_name || 'Unknown'}`;
    }
    if (settings.filterType === 'city' && settings.selectedCity) {
      const city = cities?.find(c => c.id === settings.selectedCity);
      return `City: ${city?.city_name || 'Unknown'}`;
    }
    return 'All Kaat Rates';
  };

  const getSortLabel = () => {
    switch (settings.sortBy) {
      case 'transport': return 'Transport Name';
      case 'city': return 'Destination City';
      case 'rate': return 'Rate (Low to High)';
      default: return 'Transport Name';
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4">
      <h3 className="text-sm font-bold text-emerald-900 mb-2 flex items-center gap-2">
        <CheckCircle className="w-4 h-4" />
        PDF Preview
      </h3>
      <div className="space-y-1 text-sm text-emerald-800">
        <p><span className="font-semibold">Title:</span> SS TRANSPORT CORPORATION</p>
        <p><span className="font-semibold">Subtitle:</span> {settings.subtitle || 'KAAT RATE LIST'}</p>
        <p><span className="font-semibold">Filter:</span> {getFilterTitle()}</p>
        <p><span className="font-semibold">Status:</span> {settings.includeInactive ? 'Active & Inactive' : 'Active Only'}</p>
        {settings.includeAllTransports && <p><span className="font-semibold">Scope:</span> All Transports (including without rates)</p>}
        {settings.includeAllCities && <p><span className="font-semibold">Scope:</span> All Cities (including without rates)</p>}
        <p><span className="font-semibold">Sort Order:</span> {getSortLabel()}</p>
      </div>
    </div>
  );
}
