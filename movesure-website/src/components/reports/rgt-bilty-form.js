'use client';

import React, { useState } from 'react';
import { FileText, Printer, X, Eye } from 'lucide-react';

const EMPTY_BILTY = {
  gr_no: '',
  bilty_date: new Date().toISOString().split('T')[0],
  consignor_name: '',
  consignor_gst: '',
  consignor_number: '',
  consignee_name: '',
  consignee_gst: '',
  consignee_number: '',
  from_city: 'DELHI',
  to_city: 'ALIGARH',
  transport_name: '',
  transport_gst: '',
  transport_number: '',
  delivery_type: 'godown-delivery',
  payment_mode: 'to-pay',
  no_of_pkg: '',
  wt: '',
  rate: '',
  freight_amount: '',
  labour_charge: '0',
  bill_charge: '0',
  toll_charge: '0',
  pf_charge: '0',
  other_charge: '0',
  dd_charge: '0',
  total: '',
  contain: '',
  pvt_marks: '',
  e_way_bill: '',
  invoice_date: '',
  invoice_no: '',
  invoice_value: '',
  remark: '',
};

const SAMPLE_BILTY = {
  gr_no: '1001',
  bilty_date: new Date().toISOString().split('T')[0],
  consignor_name: 'SHARMA ENTERPRISES',
  consignor_gst: '09AABCS1234F1ZP',
  consignor_number: '9876543210',
  consignee_name: 'GUPTA TRADERS',
  consignee_gst: '07AABCG5678H1Z5',
  consignee_number: '9123456789',
  from_city: 'DELHI',
  to_city: 'ALIGARH',
  transport_name: 'RGT LOGISTICS',
  transport_gst: '09AABCR1234L1ZX',
  transport_number: '9999888877',
  delivery_type: 'godown-delivery',
  payment_mode: 'to-pay',
  no_of_pkg: '10',
  wt: '500',
  rate: '2',
  freight_amount: '1000',
  labour_charge: '200',
  bill_charge: '50',
  toll_charge: '100',
  pf_charge: '0',
  other_charge: '0',
  dd_charge: '0',
  total: '1350',
  contain: 'HARDWARE',
  pvt_marks: 'GT',
  e_way_bill: '1234-5678-9012',
  invoice_date: new Date().toISOString().split('T')[0],
  invoice_no: 'INV-2026-001',
  invoice_value: '50000',
  remark: '',
};

export default function RGTBiltyForm({ onGenerate, onClose }) {
  const [biltyData, setBiltyData] = useState({ ...EMPTY_BILTY });

  const handleChange = (field, value) => {
    setBiltyData(prev => {
      const updated = { ...prev, [field]: value };

      const wt = parseFloat(updated.wt) || 0;
      const rate = parseFloat(updated.rate) || 0;
      const freight = Math.round(wt * rate);
      if (updated.wt && updated.rate && !updated.freight_amount) {
        updated.freight_amount = String(freight);
      }

      const freightAmt = parseFloat(updated.freight_amount) || 0;
      const labour = parseFloat(updated.labour_charge) || 0;
      const bill = parseFloat(updated.bill_charge) || 0;
      const toll = parseFloat(updated.toll_charge) || 0;
      const pf = parseFloat(updated.pf_charge) || 0;
      const other = parseFloat(updated.other_charge) || 0;
      const dd = parseFloat(updated.dd_charge) || 0;
      updated.total = String(Math.round(freightAmt + labour + bill + toll + pf + other + dd));

      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!biltyData.gr_no) {
      alert('Please enter GR Number');
      return;
    }
    onGenerate(biltyData);
  };

  const handleSamplePreview = () => {
    onGenerate({ ...SAMPLE_BILTY });
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900";
  const labelClass = "block text-xs font-semibold text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">RGT Logistics - Create Bilty</h2>
              <p className="text-red-100 text-sm">Fill in bilty details to generate PDF</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSamplePreview} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium">
              <Eye className="w-4 h-4" />
              Preview Sample
            </button>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* GR & Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>GR Number *</label>
              <input type="text" value={biltyData.gr_no} onChange={e => handleChange('gr_no', e.target.value)} className={inputClass} placeholder="e.g. 1001" required />
            </div>
            <div>
              <label className={labelClass}>Bilty Date</label>
              <input type="date" value={biltyData.bilty_date} onChange={e => handleChange('bilty_date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Payment Mode</label>
              <select value={biltyData.payment_mode} onChange={e => handleChange('payment_mode', e.target.value)} className={inputClass}>
                <option value="to-pay">TO PAY</option>
                <option value="paid">PAID</option>
                <option value="freeofcost">FOC</option>
              </select>
            </div>
          </div>

          {/* Route */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>From City</label>
              <input type="text" value={biltyData.from_city} onChange={e => handleChange('from_city', e.target.value)} className={inputClass} placeholder="e.g. DELHI" />
            </div>
            <div>
              <label className={labelClass}>To City</label>
              <input type="text" value={biltyData.to_city} onChange={e => handleChange('to_city', e.target.value)} className={inputClass} placeholder="e.g. ALIGARH" />
            </div>
            <div>
              <label className={labelClass}>Delivery Type</label>
              <select value={biltyData.delivery_type} onChange={e => handleChange('delivery_type', e.target.value)} className={inputClass}>
                <option value="godown-delivery">Godown Delivery</option>
                <option value="door-delivery">Door Delivery</option>
              </select>
            </div>
          </div>

          {/* Transport */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Transport Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Transport Name</label>
                <input type="text" value={biltyData.transport_name} onChange={e => handleChange('transport_name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Transport GSTIN</label>
                <input type="text" value={biltyData.transport_gst} onChange={e => handleChange('transport_gst', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Transport Mobile</label>
                <input type="text" value={biltyData.transport_number} onChange={e => handleChange('transport_number', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Consignor */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="text-sm font-bold text-blue-800 mb-3">Consignor (Sender)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Name</label>
                <input type="text" value={biltyData.consignor_name} onChange={e => handleChange('consignor_name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>GSTIN</label>
                <input type="text" value={biltyData.consignor_gst} onChange={e => handleChange('consignor_gst', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Mobile</label>
                <input type="text" value={biltyData.consignor_number} onChange={e => handleChange('consignor_number', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Consignee */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <h3 className="text-sm font-bold text-green-800 mb-3">Consignee (Receiver)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Name</label>
                <input type="text" value={biltyData.consignee_name} onChange={e => handleChange('consignee_name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>GSTIN / Aadhar / PAN</label>
                <input type="text" value={biltyData.consignee_gst} onChange={e => handleChange('consignee_gst', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Mobile</label>
                <input type="text" value={biltyData.consignee_number} onChange={e => handleChange('consignee_number', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Package & Weight */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className={labelClass}>No. of Packages</label>
              <input type="number" value={biltyData.no_of_pkg} onChange={e => handleChange('no_of_pkg', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Weight (KG)</label>
              <input type="number" value={biltyData.wt} onChange={e => handleChange('wt', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Rate</label>
              <input type="number" value={biltyData.rate} onChange={e => handleChange('rate', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contents</label>
              <input type="text" value={biltyData.contain} onChange={e => handleChange('contain', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>PVT Marks</label>
              <input type="text" value={biltyData.pvt_marks} onChange={e => handleChange('pvt_marks', e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* E-Way Bill & Invoice */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>E-Way Bill No.</label>
              <input type="text" value={biltyData.e_way_bill} onChange={e => handleChange('e_way_bill', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Invoice No.</label>
              <input type="text" value={biltyData.invoice_no} onChange={e => handleChange('invoice_no', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Invoice Date</label>
              <input type="date" value={biltyData.invoice_date} onChange={e => handleChange('invoice_date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Invoice Value</label>
              <input type="number" value={biltyData.invoice_value} onChange={e => handleChange('invoice_value', e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Charges */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <h3 className="text-sm font-bold text-amber-800 mb-3">Charges</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Freight Amount</label>
                <input type="number" value={biltyData.freight_amount} onChange={e => handleChange('freight_amount', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Labour Charge</label>
                <input type="number" value={biltyData.labour_charge} onChange={e => handleChange('labour_charge', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Bilty Charge</label>
                <input type="number" value={biltyData.bill_charge} onChange={e => handleChange('bill_charge', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Toll Tax</label>
                <input type="number" value={biltyData.toll_charge} onChange={e => handleChange('toll_charge', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>PF</label>
                <input type="number" value={biltyData.pf_charge} onChange={e => handleChange('pf_charge', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Other Charge</label>
                <input type="number" value={biltyData.other_charge} onChange={e => handleChange('other_charge', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>DD Charge</label>
                <input type="number" value={biltyData.dd_charge} onChange={e => handleChange('dd_charge', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Total</label>
                <input type="number" value={biltyData.total} readOnly className={`${inputClass} bg-gray-100 font-bold text-lg`} />
              </div>
            </div>
          </div>

          {/* Remark */}
          <div>
            <label className={labelClass}>Remark</label>
            <input type="text" value={biltyData.remark} onChange={e => handleChange('remark', e.target.value)} className={inputClass} />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleSamplePreview} className="px-6 py-2.5 border border-red-300 rounded-lg text-red-700 font-medium hover:bg-red-50 transition-all flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview Sample
            </button>
            <button type="button" onClick={onClose} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button type="submit" className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg">
              <Printer className="w-5 h-5" />
              Generate Bilty PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
