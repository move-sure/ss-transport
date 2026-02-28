import React from 'react';
import { X, MapPin, User, Phone, Calendar, Package, Home } from 'lucide-react';
import { format } from 'date-fns';

export default function GRDetailModal({ grDetails, biltyData, transitData, onClose, branches }) {
  if (!grDetails) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0">
          <h2 className="text-xl font-bold text-gray-900">GR Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* GR & Bilty Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bilty Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="GR No" value={biltyData.gr_no} />
              <DetailItem label="Bilty No" value={biltyData.bilty_no || biltyData.manual_bilty_no || '-'} />
              <DetailItem
                label="Bilty Date"
                value={biltyData.bilty_date ? format(new Date(biltyData.bilty_date), 'dd MMM yyyy') : '-'}
              />
              <DetailItem label="Type" value={grDetails.type === 'manual' ? 'Manual' : 'Regular'} />
            </div>
          </div>

          {/* Sender & Receiver */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Parties Information</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Sender</p>
                <DetailItem label="Name" value={biltyData.sender_name || '-'} />
                <DetailItem label="Mobile" value={biltyData.sender_mobile || '-'} />
                <DetailItem label="City" value={biltyData.from_city || '-'} />
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Receiver</p>
                <DetailItem label="Name" value={biltyData.receiver_name || '-'} />
                <DetailItem label="Mobile" value={biltyData.receiver_mobile || '-'} />
                <DetailItem label="City" value={biltyData.to_city || '-'} />
              </div>
            </div>
          </div>

          {/* Pohonch & Bilty */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Pohonch No" value={biltyData.pohonch_number || '-'} />
              <DetailItem label="Manual Bilty No" value={biltyData.manual_bilty_no || '-'} />
            </div>
          </div>

          {/* Package Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-xs text-blue-600 uppercase font-semibold mb-2">Packets</p>
                <p className="text-2xl font-bold text-blue-700">{biltyData.packets || 0}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-xs text-purple-600 uppercase font-semibold mb-2">Weight (kg)</p>
                <p className="text-2xl font-bold text-purple-700">{parseFloat(biltyData.weight || 0).toFixed(2)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-xs text-green-600 uppercase font-semibold mb-2">Amount (₹)</p>
                <p className="text-2xl font-bold text-green-700">{parseFloat(biltyData.amount || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Transit Details */}
          {transitData && transitData.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transit Status</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <StatusLine
                  label="Out for Delivery"
                  date={transitData[0].is_out_of_delivery_from_branch1_date}
                  completed={transitData[0].is_out_of_delivery_from_branch1}
                />
                <StatusLine
                  label="Delivered at Destination"
                  date={transitData[0].is_delivered_at_destination_date}
                  completed={transitData[0].is_delivered_at_destination}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function StatusLine({ label, date, completed }) {
  return (
    <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
      <p className="text-sm text-gray-700 font-medium">{label}</p>
      <div className="flex items-center gap-2">
        {completed ? (
          <>
            <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-700">
              {date ? format(new Date(date), 'dd MMM yyyy, hh:mm a') : 'Completed'}
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex h-2 w-2 rounded-full bg-gray-400" />
            <span className="text-xs text-gray-500">Pending</span>
          </>
        )}
      </div>
    </div>
  );
}
