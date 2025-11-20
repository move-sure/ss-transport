'use client';

import React from 'react';
import { Truck, Building, Phone } from 'lucide-react';

export default function TransportInfo({ transports, maxDisplay = 2, showIcon = true }) {
  if (!transports || transports.length === 0) {
    return (
      <div className="flex items-center gap-2">
        {showIcon && <Truck className="w-4 h-4 text-slate-400" />}
        <span className="text-xs text-slate-500 italic">No transport</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      {showIcon && <Truck className="w-4 h-4 text-teal-600 mt-0.5" />}
      <div className="flex flex-col gap-2">
        {transports.slice(0, maxDisplay).map((transport) => (
          <div key={transport.id} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <Building className="w-3 h-3 text-teal-500" />
              <span className="text-xs text-slate-700 font-medium">
                {transport.transport_name}
              </span>
            </div>
            {transport.mob_number && (
              <div className="flex items-center gap-1 ml-4">
                <Phone className="w-3 h-3 text-blue-500" />
                <a 
                  href={`tel:${transport.mob_number}`}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  {transport.mob_number}
                </a>
              </div>
            )}
          </div>
        ))}
        {transports.length > maxDisplay && (
          <span className="text-xs text-slate-400 mt-1">
            +{transports.length - maxDisplay} more
          </span>
        )}
        <span className="text-xs text-slate-400 mt-1">
          {transports.length} transport{transports.length !== 1 ? 's' : ''} available
        </span>
      </div>
    </div>
  );
}
