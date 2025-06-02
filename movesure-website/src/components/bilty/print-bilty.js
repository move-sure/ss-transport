'use client';

import React from 'react';
import { format } from 'date-fns';

const PrintBilty = ({ 
  biltyData, 
  branchData, 
  fromCityName, 
  toCityName,
  onClose 
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Print Header - Hidden on screen, visible in print */}
      <div className="print:block hidden">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">{branchData?.branch_name}</h1>
          <p className="text-sm">{branchData?.address}</p>
        </div>
      </div>

      {/* Screen Header - Visible on screen, hidden in print */}
      <div className="print:hidden bg-gray-100 p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Print Preview - GR: {biltyData.gr_no}</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>

      {/* Bilty Content */}
      <div className="max-w-4xl mx-auto p-6 print:p-0">
        <div className="border border-gray-300 print:border-black">
          {/* Header */}
          <div className="bg-gray-50 print:bg-white p-4 border-b border-gray-300 print:border-black">
            <div className="text-center">
              <h1 className="text-xl font-bold print:text-2xl">{branchData?.branch_name}</h1>
              <p className="text-sm print:text-base">{branchData?.address}</p>
              <h2 className="text-lg font-semibold mt-2 print:text-xl">GOODS RECEIPT (BILTY)</h2>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-4">
            {/* Top Row */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <strong>GR No:</strong> {biltyData.gr_no}
              </div>
              <div>
                <strong>Date:</strong> {format(new Date(biltyData.bilty_date), 'dd/MM/yyyy')}
              </div>
              <div>
                <strong>Payment:</strong> {biltyData.payment_mode}
              </div>
            </div>

            {/* Route */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <strong>From:</strong> {fromCityName}
              </div>
              <div>
                <strong>To:</strong> {toCityName}
              </div>
            </div>

            {/* Consignor & Consignee */}
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div className="border border-gray-300 print:border-black p-3">
                <h3 className="font-semibold mb-2">CONSIGNOR</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Name:</strong> {biltyData.consignor_name}</div>
                  <div><strong>GST:</strong> {biltyData.consignor_gst}</div>
                  <div><strong>Phone:</strong> {biltyData.consignor_number}</div>
                </div>
              </div>
              <div className="border border-gray-300 print:border-black p-3">
                <h3 className="font-semibold mb-2">CONSIGNEE</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Name:</strong> {biltyData.consignee_name}</div>
                  <div><strong>GST:</strong> {biltyData.consignee_gst}</div>
                  <div><strong>Phone:</strong> {biltyData.consignee_number}</div>
                </div>
              </div>
            </div>

            {/* Transport Details */}
            <div className="border border-gray-300 print:border-black p-3 mb-4">
              <h3 className="font-semibold mb-2">TRANSPORT DETAILS</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><strong>Name:</strong> {biltyData.transport_name}</div>
                <div><strong>GST:</strong> {biltyData.transport_gst}</div>
                <div><strong>Phone:</strong> {biltyData.transport_number}</div>
              </div>
            </div>

            {/* Goods Details */}
            <div className="border border-gray-300 print:border-black p-3 mb-4">
              <h3 className="font-semibold mb-2">GOODS DETAILS</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div><strong>Packages:</strong> {biltyData.no_of_pkg}</div>
                <div><strong>Weight:</strong> {biltyData.wt} kg</div>
                <div><strong>Rate:</strong> ₹{biltyData.rate}/kg</div>
                <div><strong>Content:</strong> {biltyData.contain}</div>
              </div>
              {biltyData.pvt_marks && (
                <div className="mt-2 text-sm">
                  <strong>Private Marks:</strong> {biltyData.pvt_marks}
                </div>
              )}
            </div>

            {/* Invoice Details */}
            {(biltyData.invoice_no || biltyData.e_way_bill) && (
              <div className="border border-gray-300 print:border-black p-3 mb-4">
                <h3 className="font-semibold mb-2">INVOICE DETAILS</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {biltyData.invoice_no && <div><strong>Invoice No:</strong> {biltyData.invoice_no}</div>}
                  {biltyData.invoice_value > 0 && <div><strong>Value:</strong> ₹{biltyData.invoice_value}</div>}
                  {biltyData.e_way_bill && <div><strong>E-Way Bill:</strong> {biltyData.e_way_bill}</div>}
                </div>
              </div>
            )}

            {/* Charges */}
            <div className="border border-gray-300 print:border-black p-3 mb-4">
              <h3 className="font-semibold mb-2">CHARGES</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex justify-between"><span>Freight:</span><span>₹{biltyData.freight_amount}</span></div>
                  <div className="flex justify-between"><span>Labour:</span><span>₹{biltyData.labour_charge}</span></div>
                  <div className="flex justify-between"><span>Bill Charge:</span><span>₹{biltyData.bill_charge}</span></div>
                </div>
                <div>
                  {biltyData.toll_charge > 0 && <div className="flex justify-between"><span>Toll:</span><span>₹{biltyData.toll_charge}</span></div>}
                  {biltyData.dd_charge > 0 && <div className="flex justify-between"><span>DD Charge:</span><span>₹{biltyData.dd_charge}</span></div>}
                  {biltyData.other_charge > 0 && <div className="flex justify-between"><span>Other:</span><span>₹{biltyData.other_charge}</span></div>}
                </div>
              </div>
              <div className="border-t border-gray-300 print:border-black mt-2 pt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>TOTAL:</span>
                  <span>₹{biltyData.total}</span>
                </div>
              </div>
            </div>

            {/* Remarks */}
            {biltyData.remark && (
              <div className="border border-gray-300 print:border-black p-3 mb-4">
                <h3 className="font-semibold mb-2">REMARKS</h3>
                <div className="text-sm">{biltyData.remark}</div>
              </div>
            )}

            {/* Footer */}
            <div className="grid grid-cols-2 gap-8 mt-8">
              <div>
                <div className="border-t border-gray-300 print:border-black pt-2 text-center">
                  <div className="text-sm">CONSIGNOR SIGNATURE</div>
                </div>
              </div>
              <div>
                <div className="border-t border-gray-300 print:border-black pt-2 text-center">
                  <div className="text-sm">AUTHORIZED SIGNATURE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:border-black { border-color: black !important; }
          .print\\:text-xl { font-size: 1.25rem; }
          .print\\:text-2xl { font-size: 1.5rem; }
          .print\\:text-base { font-size: 1rem; }
          .print\\:p-0 { padding: 0; }
        }
      `}</style>
    </div>
  );
};

export default PrintBilty;