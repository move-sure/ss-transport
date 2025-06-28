'use client';

import React, { memo } from 'react';
import { 
  X, 
  FileText, 
  Calendar, 
  IndianRupee, 
  MapPin, 
  Users, 
  Package,
  Truck,
  CreditCard,
  Edit,
  Printer,
  Receipt
} from 'lucide-react';

const BiltyDetailsModal = memo(({ 
  bilty, 
  isOpen, 
  onClose, 
  getCityName, 
  getFromCityName, 
  onEdit, 
  onPrint 
}) => {
  if (!isOpen || !bilty) return null;

  const isStation = bilty.bilty_type === 'station';

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  // Format datetime helper
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB');
  };
  // Status badge component
  const getStatusBadge = (savingOption) => {
    if (isStation) {
      // Station bilty status based on payment_status
      switch (savingOption) {
        case 'paid':
          return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
              Paid
            </span>
          );
        case 'to-pay':
          return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-800">
              To-Pay
            </span>
          );
        case 'foc':
          return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              FOC
            </span>
          );
        default:
          return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
              {savingOption || 'Unknown'}
            </span>
          );
      }
    } else {
      // Regular bilty status
      switch (savingOption) {
        case 'DRAFT':
          return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
              Draft
            </span>
          );
        case 'SAVE':
          return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
              Saved
            </span>
          );        default:
          return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
              {savingOption || 'Unknown'}
            </span>
          );
      }
    }
  };

  // Payment badge component
  const getPaymentBadge = (paymentMode) => {
    const badges = {
      'to-pay': 'bg-orange-100 text-orange-800',
      'paid': 'bg-green-100 text-green-800',
      'freeofcost': 'bg-blue-100 text-blue-800'
    };
    
    const colorClass = badges[paymentMode] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${colorClass}`}>
        {paymentMode?.replace('-', ' ').toUpperCase() || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>              <div>
                <h2 className="text-xl font-bold text-white">
                  {isStation ? 'Station Bilty Details' : 'Bilty Details'}
                </h2>
                <p className="text-slate-300">GR Number: {bilty.gr_no}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Only show Edit and Print for regular bilties */}
              {!isStation && (
                <>
                  <button
                    onClick={() => {
                      onEdit(bilty);
                      onClose();
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => {
                      onPrint(bilty);
                      onClose();
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </>
              )}
              
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-800">Basic Information</h3>
              </div>
                <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">GR Number:</span>
                  <span className="font-semibold text-slate-900">{bilty.gr_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{isStation ? 'Created Date:' : 'Bilty Date:'}</span>
                  <span className="font-semibold text-slate-900">
                    {isStation ? formatDate(bilty.created_at) : formatDate(bilty.bilty_date)}
                  </span>
                </div>
                {!isStation && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Delivery Type:</span>
                    <span className="font-semibold text-slate-900 capitalize">{bilty.delivery_type?.replace('-', ' ')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  {getStatusBadge(isStation ? bilty.payment_status : bilty.saving_option)}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Challan:</span>
                  <span className="font-semibold text-slate-900">
                    {bilty.transit_details && bilty.transit_details.length > 0 ? (
                      <span className="text-blue-600">{bilty.transit_details[0].challan_no}</span>
                    ) : (
                      <span className="text-green-600">AVL</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Created By:</span>
                  <span className="font-semibold text-slate-900">
                    {bilty.created_by_user ? (bilty.created_by_user.name || bilty.created_by_user.username) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Created:</span>
                  <span className="font-semibold text-slate-900">{formatDateTime(bilty.created_at)}</span>
                </div>
              </div>
            </div>            {/* Route/Station Information */}
            <div className="bg-blue-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-800">
                  {isStation ? 'Station Information' : 'Route Information'}
                </h3>
              </div>
              
              <div className="space-y-3">
                {isStation ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Station:</span>
                      <span className="font-semibold text-slate-900">{bilty.station || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Contents:</span>
                      <span className="font-semibold text-slate-900">{bilty.contents || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600">From City:</span>
                      <span className="font-semibold text-slate-900">{getFromCityName()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">To City:</span>
                      <span className="font-semibold text-slate-900">{getCityName(bilty.to_city_id)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Transport:</span>
                      <span className="font-semibold text-slate-900">{bilty.transport_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Transport GST:</span>
                      <span className="font-semibold text-slate-900">{bilty.transport_gst || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Transport Phone:</span>
                      <span className="font-semibold text-slate-900">{bilty.transport_number || 'N/A'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>            {/* Consignor Information */}
            <div className="bg-green-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-slate-800">Consignor Details</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-semibold text-slate-900">
                    {isStation ? (bilty.consignor || 'N/A') : bilty.consignor_name}
                  </span>
                </div>
                {!isStation && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600">GST Number:</span>
                      <span className="font-semibold text-slate-900">{bilty.consignor_gst || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Phone:</span>
                      <span className="font-semibold text-slate-900">{bilty.consignor_number || 'N/A'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Consignee Information */}
            <div className="bg-purple-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-slate-800">Consignee Details</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-semibold text-slate-900">
                    {isStation ? (bilty.consignee || 'N/A') : (bilty.consignee_name || 'N/A')}
                  </span>
                </div>
                {!isStation && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600">GST Number:</span>
                      <span className="font-semibold text-slate-900">{bilty.consignee_gst || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Phone:</span>
                      <span className="font-semibold text-slate-900">{bilty.consignee_number || 'N/A'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Package Information */}
            <div className="bg-orange-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-slate-800">Package Details</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">No. of Packages:</span>
                  <span className="font-semibold text-slate-900">{bilty.no_of_pkg || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Weight:</span>
                  <span className="font-semibold text-slate-900">{bilty.wt || 0} kg</span>
                </div>                <div className="flex justify-between">
                  <span className="text-slate-600">Rate per kg:</span>
                  <span className="font-semibold text-slate-900">₹{bilty.rate || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Labour Rate:</span>
                  <span className="font-semibold text-slate-900">₹{bilty.labour_rate || 0}/pkg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Content:</span>
                  <span className="font-semibold text-slate-900">{bilty.contain || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Private Marks:</span>
                  <span className="font-semibold text-slate-900">{bilty.pvt_marks || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-indigo-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-800">Payment & Charges</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Mode:</span>
                  {getPaymentBadge(bilty.payment_mode)}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Freight Amount:</span>
                  <span className="font-semibold text-slate-900">₹{bilty.freight_amount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Labour Charge:</span>
                  <span className="font-semibold text-slate-900">₹{bilty.labour_charge || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Bill Charge:</span>
                  <span className="font-semibold text-slate-900">₹{bilty.bill_charge || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Other Charges:</span>
                  <span className="font-semibold text-slate-900">₹{bilty.other_charge || 0}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-800 font-semibold">Total Amount:</span>
                  <span className="font-bold text-green-600 text-lg">₹{bilty.total || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Information */}
          {(bilty.invoice_no || bilty.e_way_bill) && (
            <div className="mt-6 bg-yellow-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-slate-800">Invoice & Documents</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Invoice Number:</span>
                    <span className="font-semibold text-slate-900">{bilty.invoice_no || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Invoice Value:</span>
                    <span className="font-semibold text-slate-900">₹{bilty.invoice_value || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Invoice Date:</span>
                    <span className="font-semibold text-slate-900">{formatDate(bilty.invoice_date)}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">E-Way Bill:</span>
                    <span className="font-semibold text-slate-900">{bilty.e_way_bill || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Document Number:</span>
                    <span className="font-semibold text-slate-900">{bilty.document_number || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Remarks */}
          {bilty.remark && (
            <div className="mt-6 bg-gray-50 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Remarks</h3>
              <p className="text-slate-700">{bilty.remark}</p>
            </div>
          )}        </div>
      </div>
    </div>
  );
});

BiltyDetailsModal.displayName = 'BiltyDetailsModal';

export default BiltyDetailsModal;