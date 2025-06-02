'use client';

import React from 'react';

const InvoiceDetailsSection = ({ formData, setFormData }) => {
  return (
    <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200 shadow-md">
      <div className="grid grid-cols-3 gap-6">
        {/* Row 1 - Main Options */}
        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md whitespace-nowrap min-w-[80px]">
            DELIVERY
          </span>
          <select
            value={formData.delivery_type}
            onChange={(e) => setFormData(prev => ({ ...prev, delivery_type: e.target.value }))}
            className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
            tabIndex={14}
          >
            <option value="godown-delivery">Godown</option>
            <option value="door-delivery">Door</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md whitespace-nowrap min-w-[80px]">
            PAYMENT
          </span>
          <select
            value={formData.payment_mode}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
            className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
            tabIndex={15}
          >
            <option value="to-pay">To Pay</option>
            <option value="paid">Paid</option>
            <option value="freeofcost">FOC</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md whitespace-nowrap min-w-[80px]">
            CONTENT
          </span>
          <input
            type="text"
            value={formData.contain}
            onChange={(e) => setFormData(prev => ({ ...prev, contain: e.target.value }))}
            className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
            placeholder="Goods description"
            tabIndex={16}
          />
        </div>

        {/* Row 2 - Invoice Details */}
        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md whitespace-nowrap min-w-[80px]">
            INV NO
          </span>
          <input
            type="text"
            value={formData.invoice_no}
            onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
            className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
            placeholder="Invoice number"
            tabIndex={17}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md whitespace-nowrap min-w-[80px]">
            INV VAL
          </span>
          <input
            type="number"
            value={formData.invoice_value}
            onChange={(e) => setFormData(prev => ({ ...prev, invoice_value: parseFloat(e.target.value) || 0 }))}
            className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
            placeholder="0"
            tabIndex={18}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md whitespace-nowrap min-w-[80px]">
            E-WAY
          </span>
          <input
            type="text"
            value={formData.e_way_bill}
            onChange={(e) => setFormData(prev => ({ ...prev, e_way_bill: e.target.value }))}
            className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
            placeholder="E-way bill number"
            tabIndex={19}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsSection;