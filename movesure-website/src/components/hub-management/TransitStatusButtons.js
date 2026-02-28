import React from 'react';
import {
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

export default function TransitStatusButtons({ transit, isManual, onStatusUpdate, loading }) {
  if (!transit) return null;

  const handleTransitUpdate = (field, dateField) => {
    onStatusUpdate(field, dateField, true);
  };

  const isOutOfDelivery = transit.is_out_of_delivery_from_branch1 || transit.is_out_of_delivery;
  const isDelivered = transit.is_delivered_at_destination;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Truck className="h-5 w-5 text-indigo-600" />
        Transit Status Management
      </h3>

      <div className="space-y-6">
        {/* Status Timeline */}
        <div className="relative pl-8 space-y-6">
          {/* Out of Delivery */}
          <div className="relative">
            <div className="absolute -left-8 top-1.5 w-6 h-6 bg-white border-2 border-indigo-600 rounded-full flex items-center justify-center">
              <div className={`w-3 h-3 rounded-full ${isOutOfDelivery ? 'bg-indigo-600' : 'bg-gray-300'}`} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-indigo-600" />
                    Out for Delivery
                  </p>
                  {transit.is_out_of_delivery_from_branch1_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {format(new Date(transit.is_out_of_delivery_from_branch1_date), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  )}
                </div>
              </div>
              {!isOutOfDelivery && (
                <button
                  onClick={() => handleTransitUpdate('is_out_of_delivery_from_branch1', 'is_out_of_delivery_from_branch1_date')}
                  disabled={loading || isDelivered}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark as Out for Delivery
                </button>
              )}
              {isOutOfDelivery && !isDelivered && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Marked
                </span>
              )}
            </div>
          </div>

          {/* Delivered */}
          <div className="relative">
            <div className="absolute -left-8 top-1.5 w-6 h-6 bg-white border-2 border-green-600 rounded-full flex items-center justify-center">
              <div className={`w-3 h-3 rounded-full ${isDelivered ? 'bg-green-600' : 'bg-gray-300'}`} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Delivered at Destination
                  </p>
                  {transit.is_delivered_at_destination_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {format(new Date(transit.is_delivered_at_destination_date), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  )}
                </div>
              </div>
              {isOutOfDelivery && !isDelivered && (
                <button
                  onClick={() => handleTransitUpdate('is_delivered_at_destination', 'is_delivered_at_destination_date')}
                  disabled={loading}
                  className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark as Delivered
                </button>
              )}
              {isDelivered && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Delivered
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Current Status Summary */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Current Status</p>
          <div className="flex flex-wrap gap-2">
            {isDelivered ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                <CheckCircle2 className="h-3 w-3" />
                Delivered
              </span>
            ) : isOutOfDelivery ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                <Truck className="h-3 w-3" />
                In Transit
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                <Clock className="h-3 w-3" />
                Pending
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
