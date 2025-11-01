'use client';

import React from 'react';
import { X, FileText, Building } from 'lucide-react';
import { format } from 'date-fns';

const BiltyCard = ({ bilty, index, isDeleted, onRemove, formatCurrency }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <div
      className={`relative border rounded-lg p-3 transition-all duration-300 ${
        isDeleted 
          ? 'border-red-500 bg-red-50 opacity-60' 
          : 'bg-white border-gray-200 hover:shadow-md'
      }`}
    >
      {/* Deleted Overlay */}
      {isDeleted && (
        <>
          <div className="absolute inset-0 bg-red-500 opacity-10 rounded-lg pointer-events-none"></div>
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10">
            DELETED
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-0.5 bg-red-500 transform rotate-0"></div>
          </div>
        </>
      )}
      
      <div className={`flex items-start justify-between relative ${isDeleted ? 'line-through' : ''}`}>
        {/* Index Number */}
        <div className="flex items-center space-x-3 flex-1">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
            isDeleted 
              ? 'bg-gray-400 text-white' 
              : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
          }`}>
            {index + 1}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {bilty.type === 'regular' ? (
                <FileText className={`h-4 w-4 ${isDeleted ? 'text-gray-400' : 'text-blue-500'}`} />
              ) : (
                <Building className={`h-4 w-4 ${isDeleted ? 'text-gray-400' : 'text-purple-500'}`} />
              )}
              <span className={`font-bold text-sm ${isDeleted ? 'text-gray-500' : 'text-gray-900'}`}>{bilty.gr_no}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isDeleted 
                  ? 'bg-gray-200 text-gray-500'
                  : bilty.type === 'regular' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-purple-100 text-purple-700'
              }`}>
                {bilty.type === 'regular' ? 'Regular' : 'Station'}
              </span>
            </div>
          
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <span className="font-medium">From:</span>{' '}
                {bilty.consignor_name || bilty.consignor || 'N/A'}
              </div>
              <div>
                <span className="font-medium">To:</span>{' '}
                {bilty.consignee_name || bilty.consignee || 'N/A'}
              </div>
              <div>
                <span className="font-medium">City:</span>{' '}
                {bilty.to_city_name || bilty.station || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Date:</span>{' '}
                {formatDate(bilty.bilty_date || bilty.created_at)}
              </div>
              <div>
                <span className="font-medium">No. of Pkg:</span>{' '}
                <span className="font-semibold text-blue-600">
                  {bilty.no_of_pkg || bilty.no_of_packets || 0}
                </span>
              </div>
              <div>
                <span className="font-medium">Weight:</span>{' '}
                <span className="font-semibold text-green-600">
                  {bilty.wt || bilty.weight || 0} kg
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                isDeleted
                  ? 'bg-gray-200 text-gray-500'
                  : (bilty.payment_mode || bilty.payment_status) === 'paid' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
              }`}>
                {(bilty.payment_mode || bilty.payment_status || 'N/A').toUpperCase()}
              </span>
              <span className={`text-sm font-bold ${isDeleted ? 'text-gray-500' : 'text-gray-900'}`}>
                {formatCurrency(bilty.total || bilty.amount)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onRemove(bilty)}
          disabled={isDeleted}
          className={`ml-3 p-1.5 rounded-full transition-colors ${
            isDeleted 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-red-500 hover:bg-red-50'
          }`}
          title={isDeleted ? 'Already deleted' : 'Remove bilty'}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default BiltyCard;
