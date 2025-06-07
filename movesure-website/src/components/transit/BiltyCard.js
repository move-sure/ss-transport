'use client';

import React from 'react';
import { format } from 'date-fns';
import { Package, MapPin, CheckSquare, Square, Star, X } from 'lucide-react';

const BiltyCard = ({ 
  bilty, 
  isSelected, 
  isTransit = false, 
  onSelect, 
  onDoubleClick,
  onRemoveFromTransit,
  showRemoveButton = false
}) => {
  const getPaymentModeColor = (mode) => {
    switch (mode) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'to-pay':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'freeofcost':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 relative ${
        isTransit 
          ? 'bg-yellow-50 border-yellow-300 shadow-md' 
          : isSelected 
            ? 'bg-blue-50 border-blue-300 shadow-md' 
            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
      }`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      title={isTransit ? "Transit bilty" : "Double-click to add to selected challan"}
    >
      {/* Remove button for transit bilties */}
      {isTransit && showRemoveButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFromTransit?.(bilty);
          }}
          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
          title="Remove from challan"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {!isTransit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="flex-shrink-0"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </button>
          )}
          {isTransit && (
            <div className="flex-shrink-0">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
          )}
          <div>
            <div className={`font-bold text-lg ${isTransit ? 'text-yellow-800' : 'text-blue-600'}`}>
              {bilty.gr_no}
            </div>
            <div className="text-sm text-gray-500">
              {format(new Date(bilty.bilty_date), 'dd/MM/yyyy')}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-900">₹{bilty.total}</div>
          <span className={`text-xs px-2 py-1 rounded-full font-bold ${getPaymentModeColor(bilty.payment_mode)}`}>
            {bilty.payment_mode?.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">From</div>
          <div className="font-medium text-gray-900 truncate">{bilty.consignor_name}</div>
        </div>
        
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">To</div>
          <div className="font-medium text-gray-900 truncate">{bilty.consignee_name}</div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{bilty.to_city_name} ({bilty.to_city_code})</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Package className="w-4 h-4" />
            <span>{bilty.no_of_pkg} pkg</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiltyCard;