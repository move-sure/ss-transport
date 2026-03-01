import React from 'react';
import { Building2, ArrowRight, Plus, X, Loader2 } from 'lucide-react';

const AddHubRateModal = React.memo(function AddHubRateModal({
  show, onClose, form, setForm, saving, onSave,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ring-1 ring-gray-200/50" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg shadow-sky-200">
                <Building2 className="h-5 w-5 text-white"/>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Add Hub Rate</h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded-md text-[11px] font-bold">{form.transport_name}</span>
                  <ArrowRight className="h-3 w-3 text-gray-400"/>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[11px] font-bold">{form.destination_city_name || 'City'}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/80 transition-colors"><X className="h-4 w-4 text-gray-400"/></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase mb-2">Pricing Configuration</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Pricing Mode</label>
                <div className="flex gap-2">
                  {['per_kg', 'per_pkg'].map(mode => (
                    <button key={mode} type="button" onClick={() => setForm(p => ({...p, pricing_mode: mode}))}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${
                        form.pricing_mode === mode
                          ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}>
                      {mode === 'per_kg' ? '₹ Per KG' : '₹ Per PKG'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Rate / KG</label>
                <input type="number" step="0.01" value={form.rate_per_kg} onChange={e => setForm(p => ({...p, rate_per_kg: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-black focus:ring-2 focus:ring-sky-300 outline-none" placeholder="0.00"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Rate / PKG</label>
                <input type="number" step="0.01" value={form.rate_per_pkg} onChange={e => setForm(p => ({...p, rate_per_pkg: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-black focus:ring-2 focus:ring-sky-300 outline-none" placeholder="0.00"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Min Charge</label>
                <input type="number" step="1" value={form.min_charge} onChange={e => setForm(p => ({...p, min_charge: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-black focus:ring-2 focus:ring-sky-300 outline-none" placeholder="0"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Goods Type</label>
                <input type="text" value={form.goods_type} onChange={e => setForm(p => ({...p, goods_type: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:ring-2 focus:ring-sky-300 outline-none" placeholder="e.g. General"/>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-700 uppercase mb-2">Additional Charges</p>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Bilty ₹</label>
                <input type="number" step="0.01" value={form.bilty_chrg} onChange={e => setForm(p => ({...p, bilty_chrg: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm font-semibold text-black focus:ring-2 focus:ring-sky-300 outline-none" placeholder="0"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">EWB ₹</label>
                <input type="number" step="0.01" value={form.ewb_chrg} onChange={e => setForm(p => ({...p, ewb_chrg: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm font-semibold text-black focus:ring-2 focus:ring-sky-300 outline-none" placeholder="0"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Labour ₹</label>
                <input type="number" step="0.01" value={form.labour_chrg} onChange={e => setForm(p => ({...p, labour_chrg: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm font-semibold text-black focus:ring-2 focus:ring-sky-300 outline-none" placeholder="0"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Other ₹</label>
                <input type="number" step="0.01" value={form.other_chrg} onChange={e => setForm(p => ({...p, other_chrg: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm font-semibold text-black focus:ring-2 focus:ring-sky-300 outline-none" placeholder="0"/>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">Rate will be applied when transport is selected</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={onSave} disabled={saving}
                className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 shadow-sm flex items-center gap-1.5 transition-all">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Plus className="h-3.5 w-3.5"/>} Add Hub Rate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AddHubRateModal;
