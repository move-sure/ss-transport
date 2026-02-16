'use client';

import React from 'react';
import {
  X, FileText, MapPin, User, Phone, Hash, Calendar, Package, Weight,
  IndianRupee, Truck, Receipt, ClipboardList, CreditCard, Info, Box
} from 'lucide-react';
import { format } from 'date-fns';

const InfoRow = ({ icon: Icon, label, value, color = 'slate', mono = false }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className={`w-3.5 h-3.5 mt-0.5 text-${color}-500 flex-shrink-0`} />
      <div className="min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 block leading-tight">{label}</span>
        <span className={`text-xs font-semibold text-slate-800 block leading-tight mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</span>
      </div>
    </div>
  );
};

const ChargeRow = ({ label, amount }) => {
  const val = parseFloat(amount || 0);
  if (val === 0) return null;
  return (
    <div className="flex justify-between items-center py-1 px-2">
      <span className="text-[11px] text-slate-600">{label}</span>
      <span className="text-[11px] font-bold text-slate-800 font-mono">₹{val.toFixed(2)}</span>
    </div>
  );
};

export default function BiltyDetailPopup({ bilty, onClose, cities = [] }) {
  if (!bilty) return null;

  const getCityName = (cityId) => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.city_name : '—';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'dd MMM yyyy'); }
    catch { return dateStr; }
  };

  const total = parseFloat(bilty.total || 0);
  const freight = parseFloat(bilty.freight_amount || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">GR No: {bilty.gr_no}</h3>
              <p className="text-[10px] text-white/70">{formatDate(bilty.bilty_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {bilty.payment_mode && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                bilty.payment_mode === 'paid'
                  ? 'bg-blue-400/30 text-blue-100'
                  : 'bg-orange-400/30 text-orange-100'
              }`}>
                {bilty.payment_mode.toUpperCase()}
              </span>
            )}
            {bilty.delivery_type && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-400/30 text-purple-100">
                {bilty.delivery_type === 'door-delivery' || bilty.delivery_type === 'door delivery' ? 'DD' : bilty.delivery_type.toUpperCase()}
              </span>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Row 1: Consignor + Consignee side by side */}
          <div className="grid grid-cols-2 gap-2">
            {/* Consignor */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-bold text-blue-600 mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" /> Consignor
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">{bilty.consignor_name || '—'}</p>
              {bilty.consignor_gst && (
                <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">GST: {bilty.consignor_gst}</p>
              )}
              {bilty.consignor_number && (
                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-2.5 h-2.5" /> {bilty.consignor_number}
                </p>
              )}
            </div>

            {/* Consignee */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-bold text-green-600 mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" /> Consignee
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">{bilty.consignee_name || '—'}</p>
              {bilty.consignee_gst && (
                <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">GST: {bilty.consignee_gst}</p>
              )}
              {bilty.consignee_number && (
                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-2.5 h-2.5" /> {bilty.consignee_number}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Transport + Route */}
          <div className="grid grid-cols-2 gap-2">
            {/* Transport */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-bold text-amber-600 mb-1.5 flex items-center gap-1">
                <Truck className="w-3 h-3" /> Transport
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">{bilty.transport_name || '—'}</p>
              {bilty.transport_gst && (
                <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">GST: {bilty.transport_gst}</p>
              )}
              {bilty.transport_number && (
                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-2.5 h-2.5" /> {bilty.transport_number}
                </p>
              )}
            </div>

            {/* Route */}
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-bold text-violet-600 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Route
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">{getCityName(bilty.from_city_id)}</span>
                <span className="text-slate-400 text-xs">→</span>
                <span className="text-xs font-bold text-slate-800">{getCityName(bilty.to_city_id)}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  bilty.payment_mode === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {bilty.payment_mode || 'to-pay'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                  {bilty.delivery_type === 'door-delivery' || bilty.delivery_type === 'door delivery' ? 'Door Delivery' : (bilty.delivery_type || 'Godown')}
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Goods Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2 flex items-center gap-1">
              <Box className="w-3 h-3" /> Goods Information
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block">Packages</span>
                <span className="text-xs font-bold text-slate-800">{bilty.no_of_pkg || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Weight</span>
                <span className="text-xs font-bold text-slate-800">{bilty.wt || 0} kg</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Rate</span>
                <span className="text-xs font-bold text-green-700">₹{parseFloat(bilty.rate || 0).toFixed(2)}/kg</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Labour Rate</span>
                <span className="text-xs font-bold text-slate-800">₹{parseFloat(bilty.labour_rate || 0).toFixed(2)}</span>
              </div>
            </div>
            {bilty.contain && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 block">Content</span>
                <span className="text-[11px] font-semibold text-slate-700">{bilty.contain}</span>
              </div>
            )}
            {bilty.pvt_marks && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 block">Pvt Marks</span>
                <span className="text-[11px] font-semibold text-slate-700">{bilty.pvt_marks}</span>
              </div>
            )}
          </div>

          {/* Row 4: Invoice + Documents */}
          {(bilty.invoice_no || bilty.e_way_bill || bilty.document_number) && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-bold text-cyan-600 mb-2 flex items-center gap-1">
                <Receipt className="w-3 h-3" /> Invoice & Documents
              </div>
              <div className="grid grid-cols-3 gap-3">
                {bilty.invoice_no && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">Invoice No</span>
                    <span className="text-[11px] font-bold text-slate-800 font-mono">{bilty.invoice_no}</span>
                    {bilty.invoice_date && (
                      <span className="text-[10px] text-slate-400 block">{formatDate(bilty.invoice_date)}</span>
                    )}
                  </div>
                )}
                {bilty.invoice_value > 0 && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">Invoice Value</span>
                    <span className="text-[11px] font-bold text-slate-800 font-mono">₹{parseFloat(bilty.invoice_value).toFixed(2)}</span>
                  </div>
                )}
                {bilty.e_way_bill && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">E-Way Bill</span>
                    <span className="text-[11px] font-bold text-slate-800 font-mono">{bilty.e_way_bill}</span>
                  </div>
                )}
                {bilty.document_number && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">Document No</span>
                    <span className="text-[11px] font-bold text-slate-800 font-mono">{bilty.document_number}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Row 5: Charges Breakdown */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 mb-2 flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Charges Breakdown
            </div>
            <div className="bg-white rounded-lg border border-emerald-100 divide-y divide-emerald-50">
              <ChargeRow label="Freight Amount" amount={bilty.freight_amount} />
              <ChargeRow label="Labour Charge" amount={bilty.labour_charge} />
              <ChargeRow label="Bill Charge" amount={bilty.bill_charge} />
              <ChargeRow label="Toll Charge" amount={bilty.toll_charge} />
              <ChargeRow label="DD Charge" amount={bilty.dd_charge} />
              <ChargeRow label="PF Charge" amount={bilty.pf_charge} />
              <ChargeRow label="Other Charge" amount={bilty.other_charge} />
              {/* Total */}
              <div className="flex justify-between items-center py-1.5 px-2 bg-emerald-100/60">
                <span className="text-[11px] font-bold text-emerald-800">TOTAL</span>
                <span className="text-sm font-extrabold text-emerald-800 font-mono">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Row 6: Remark */}
          {bilty.remark && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-bold text-rose-500 mb-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Remark
              </div>
              <p className="text-[11px] text-slate-700">{bilty.remark}</p>
            </div>
          )}

          {/* Row 7: Meta info */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Saving: <span className="font-semibold text-slate-500">{bilty.saving_option || 'SAVE'}</span></span>
            <span>Created: {bilty.created_at ? format(new Date(bilty.created_at), 'dd/MM/yyyy HH:mm') : '—'}</span>
            {bilty.updated_at && bilty.updated_at !== bilty.created_at && (
              <span>Updated: {format(new Date(bilty.updated_at), 'dd/MM/yyyy HH:mm')}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-2 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-800">
              <IndianRupee className="w-3 h-3 inline" /> ₹{total.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">|</span>
            <span className="text-[10px] text-slate-500">{bilty.no_of_pkg || 0} pkgs • {bilty.wt || 0} kg</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
