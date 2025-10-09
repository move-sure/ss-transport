import React from 'react';

export default function EWBDetailsModal({ isOpen, onClose, grData }) {
  if (!isOpen || !grData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            GR Number: {grData.gr_no}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* E-Way Bill Section */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border-l-4 border-green-500">
            <h3 className="text-lg font-bold text-gray-800 mb-4">E-Way Bill Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Bilty E-Way Bill</p>
                <p className="font-semibold text-gray-900">
                  {grData.bilty?.e_way_bill || 'Not Available'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Station E-Way Bill</p>
                <p className="font-semibold text-gray-900">
                  {grData.station?.e_way_bill || 'Not Available'}
                </p>
              </div>
            </div>
          </div>

          {/* Bilty Details */}
          {grData.bilty && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Bilty Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Bilty Date</p>
                  <p className="font-semibold text-gray-900">
                    {grData.bilty.bilty_date ? new Date(grData.bilty.bilty_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignor</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignor_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignor GST</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignor_gst || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignor Phone</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignor_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignee</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignee_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignee GST</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignee_gst || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignee Phone</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignee_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Transport Name</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.transport_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Transport GST</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.transport_gst || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice No</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.invoice_no || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice Value</p>
                  <p className="font-semibold text-gray-900">
                    ₹{grData.bilty.invoice_value?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice Date</p>
                  <p className="font-semibold text-gray-900">
                    {grData.bilty.invoice_date ? new Date(grData.bilty.invoice_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">No. of Packages</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.no_of_pkg || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Weight</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.wt || 0} kg</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Mode</p>
                  <p className="font-semibold text-gray-900 uppercase">{grData.bilty.payment_mode || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Type</p>
                  <p className="font-semibold text-gray-900 uppercase">{grData.bilty.delivery_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold text-green-600 text-lg">
                    ₹{grData.bilty.total?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              {grData.bilty.contain && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Contents</p>
                  <p className="text-gray-900">{grData.bilty.contain}</p>
                </div>
              )}
              {grData.bilty.pvt_marks && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Private Marks</p>
                  <p className="text-gray-900">{grData.bilty.pvt_marks}</p>
                </div>
              )}
              {grData.bilty.remark && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Remarks</p>
                  <p className="text-gray-900">{grData.bilty.remark}</p>
                </div>
              )}
            </div>
          )}

          {/* Station Summary Details */}
          {grData.station && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Station Bilty Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Station</p>
                  <p className="font-semibold text-gray-900">{grData.station.station || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignor</p>
                  <p className="font-semibold text-gray-900">{grData.station.consignor || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignee</p>
                  <p className="font-semibold text-gray-900">{grData.station.consignee || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">No. of Packets</p>
                  <p className="font-semibold text-gray-900">{grData.station.no_of_packets || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Weight</p>
                  <p className="font-semibold text-gray-900">{grData.station.weight || 0} kg</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <p className="font-semibold text-gray-900 uppercase">{grData.station.payment_status || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-semibold text-green-600">
                    ₹{grData.station.amount?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Type</p>
                  <p className="font-semibold text-gray-900 uppercase">{grData.station.delivery_type || 'N/A'}</p>
                </div>
              </div>
              {grData.station.contents && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Contents</p>
                  <p className="text-gray-900">{grData.station.contents}</p>
                </div>
              )}
              {grData.station.pvt_marks && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Private Marks</p>
                  <p className="text-gray-900">{grData.station.pvt_marks}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
