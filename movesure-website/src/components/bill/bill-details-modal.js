'use client';

import React from 'react';
import { 
  X, 
  FileText, 
  Building,
  Calendar,
  DollarSign,
  Truck,
  MapPin,
  Phone,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';

export default function BillDetailsModal({ bilty, onClose, cities }) {
  if (!bilty) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy, hh:mm a');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'paid': 'bg-green-100 text-green-800',
      'to-pay': 'bg-yellow-100 text-yellow-800',
      'foc': 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.toUpperCase() || 'N/A'}
      </span>
    );
  };

  const DetailRow = ({ label, value }) => (
    <div className="flex items-start py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center w-1/3">
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="w-2/3">
        <span className="text-sm text-gray-900">{value || 'N/A'}</span>
      </div>
    </div>
  );

  const isRegularBilty = bilty.type === 'regular';
  const isStationBilty = bilty.type === 'station';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {isRegularBilty ? (
              <FileText className="h-8 w-8 text-blue-500" />
            ) : (
              <Building className="h-8 w-8 text-purple-500" />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {bilty.gr_no}
              </h2>
              <p className="text-sm text-gray-600">
                {isRegularBilty ? 'Regular Bilty' : 'Station Bilty Summary'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-6 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Basic Information */}
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                Basic Information
              </h3>
              
              <DetailRow 
                label="GR Number" 
                value={bilty.gr_no}
              />
              
              <DetailRow 
                label="Date" 
                value={formatDate(isRegularBilty ? bilty.bilty_date : bilty.created_at)}
              />
              
              {isRegularBilty && (
                <DetailRow 
                  label="Delivery Type" 
                  value={bilty.delivery_type}
                />
              )}
              
              {isStationBilty && (
                <DetailRow 
                  label="Station" 
                  value={bilty.station}
                />
              )}
              
              <DetailRow 
                label="Contents" 
                value={isRegularBilty ? bilty.contain : bilty.contents}
              />
              
              <DetailRow 
                label="E-Way Bill" 
                value={isRegularBilty ? bilty.e_way_bill : bilty.e_way_bill}
              />
            </div>

            {/* Party Information */}
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                Party Information
              </h3>
              
              <DetailRow 
                label="Consignor" 
                value={isRegularBilty ? bilty.consignor_name : bilty.consignor}
              />
              
              {isRegularBilty && bilty.consignor_gst && (
                <DetailRow 
                  label="Consignor GST" 
                  value={bilty.consignor_gst}
                />
              )}
              
              {isRegularBilty && bilty.consignor_number && (
                <DetailRow 
                  label="Consignor Phone" 
                  value={bilty.consignor_number}
                />
              )}
              
              <DetailRow 
                label="Consignee" 
                value={isRegularBilty ? bilty.consignee_name : bilty.consignee}
              />
              
              {isRegularBilty && bilty.consignee_gst && (
                <DetailRow 
                  label="Consignee GST" 
                  value={bilty.consignee_gst}
                />
              )}
              
              {isRegularBilty && bilty.consignee_number && (
                <DetailRow 
                  label="Consignee Phone" 
                  value={bilty.consignee_number}
                />
              )}
            </div>

            {/* Transport/Route Information */}
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                {isRegularBilty ? (
                  <Truck className="h-5 w-5 text-gray-400 mr-2" />
                ) : (
                  <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                )}
                {isRegularBilty ? 'Transport Information' : 'Package Information'}
              </h3>
              
              {isRegularBilty ? (
                <>
                  <DetailRow 
                    label="Transport Name" 
                    value={bilty.transport_name}
                  />
                  
                  {bilty.transport_gst && (
                    <DetailRow 
                      label="Transport GST" 
                      value={bilty.transport_gst}
                    />
                  )}
                  
                  {bilty.transport_number && (
                    <DetailRow 
                      label="Transport Phone" 
                      value={bilty.transport_number}
                    />
                  )}
                  
                  <DetailRow 
                    label="From City" 
                    value={bilty.from_city_name}
                  />
                  
                  <DetailRow 
                    label="To City" 
                    value={bilty.to_city_name}
                  />
                </>
              ) : (
                <>
                  <DetailRow 
                    label="Number of Packets" 
                    value={bilty.no_of_packets || bilty.no_of_pkg}
                  />
                  
                  <DetailRow 
                    label="Weight" 
                    value={bilty.weight ? `${bilty.weight} kg` : (bilty.wt ? `${bilty.wt} kg` : 'N/A')}
                  />
                </>
              )}
            </div>

            {/* Financial Information */}
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                Financial Information
              </h3>
              
              <DetailRow 
                label="Payment Status" 
                value={getStatusBadge(isRegularBilty ? bilty.payment_mode : bilty.payment_status)}
              />
              
              <DetailRow 
                label="Total Amount" 
                value={formatCurrency(isRegularBilty ? bilty.total : bilty.amount)}
                icon={DollarSign}
              />
              
              {isRegularBilty && (
                <>
                  <DetailRow 
                    label="Freight Amount" 
                    value={formatCurrency(bilty.freight_amount)}
                  />
                  
                  {bilty.labour_charge > 0 && (
                    <DetailRow 
                      label="Labour Charge" 
                      value={formatCurrency(bilty.labour_charge)}
                    />
                  )}
                  
                  {bilty.bill_charge > 0 && (
                    <DetailRow 
                      label="Bill Charge" 
                      value={formatCurrency(bilty.bill_charge)}
                    />
                  )}
                  
                  {bilty.other_charge > 0 && (
                    <DetailRow 
                      label="Other Charges" 
                      value={formatCurrency(bilty.other_charge)}
                    />
                  )}
                </>
              )}
            </div>

            {/* Additional Information */}
            {(isRegularBilty && (bilty.invoice_no || bilty.pvt_marks || bilty.remark)) || 
             (isStationBilty && bilty.pvt_marks) ? (
              <div className="space-y-1 md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Additional Information
                </h3>
                
                {isRegularBilty && bilty.invoice_no && (
                  <DetailRow 
                    label="Invoice Number" 
                    value={bilty.invoice_no}
                  />
                )}
                
                {isRegularBilty && bilty.invoice_value && (
                  <DetailRow 
                    label="Invoice Value" 
                    value={formatCurrency(bilty.invoice_value)}
                  />
                )}
                
                {isRegularBilty && bilty.invoice_date && (
                  <DetailRow 
                    label="Invoice Date" 
                    value={formatDate(bilty.invoice_date)}
                  />
                )}
                
                {bilty.pvt_marks && (
                  <DetailRow 
                    label="Private Marks" 
                    value={bilty.pvt_marks}
                  />
                )}
                
                {isRegularBilty && bilty.remark && (
                  <DetailRow 
                    label="Remarks" 
                    value={bilty.remark}
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
