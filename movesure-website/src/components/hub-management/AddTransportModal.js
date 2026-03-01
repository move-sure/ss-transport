import React from 'react';
import { Truck, Plus, X, Loader2 } from 'lucide-react';

const AddTransportModal = React.memo(function AddTransportModal({
  show, onClose, form, setForm, saving, onSave, cities,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ring-1 ring-gray-200/50" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 via-emerald-50 to-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg shadow-teal-200">
                <Truck className="h-5 w-5 text-white"/>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Add New Transport</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">City: <span className="font-semibold text-teal-700">{form.city_name || 'Not selected'}</span></p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/80 transition-colors"><X className="h-4 w-4 text-gray-400"/></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-600 mb-1 uppercase">Transport Name *</label>
              <input type="text" value={form.transport_name} onChange={e => setForm(p => ({...p, transport_name: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-black focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none" placeholder="Enter transport name"/>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1 uppercase">City *</label>
              <select value={form.city_id} onChange={e => { const c = cities.find(ci => ci.id === e.target.value); setForm(p => ({...p, city_id: e.target.value, city_name: c?.city_name || ''})); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-black focus:ring-2 focus:ring-teal-300 outline-none">
                <option value="">Select City</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.city_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1 uppercase">Mobile Number</label>
              <input type="text" value={form.mob_number} onChange={e => setForm(p => ({...p, mob_number: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-black focus:ring-2 focus:ring-teal-300 outline-none" placeholder="Mobile number"/>
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-600 mb-1 uppercase">Address *</label>
              <textarea value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:ring-2 focus:ring-teal-300 outline-none resize-none" rows={2} placeholder="Full address"/>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1 uppercase">GST Number</label>
              <input type="text" value={form.gst_number} onChange={e => setForm(p => ({...p, gst_number: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:ring-2 focus:ring-teal-300 outline-none" placeholder="GSTIN"/>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1 uppercase">Owner Name</label>
              <input type="text" value={form.branch_owner_name} onChange={e => setForm(p => ({...p, branch_owner_name: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:ring-2 focus:ring-teal-300 outline-none" placeholder="Branch owner name"/>
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-600 mb-1 uppercase">Website</label>
              <input type="text" value={form.website} onChange={e => setForm(p => ({...p, website: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:ring-2 focus:ring-teal-300 outline-none" placeholder="https://..."/>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">* Required fields</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={onSave} disabled={saving}
                className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 disabled:opacity-50 shadow-sm flex items-center gap-1.5 transition-all">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Plus className="h-3.5 w-3.5"/>} Add Transport
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AddTransportModal;
