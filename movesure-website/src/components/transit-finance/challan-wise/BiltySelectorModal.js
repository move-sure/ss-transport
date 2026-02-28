'use client';

import React from 'react';
import { FileText, Loader2, Save, Building2 } from 'lucide-react';
import { formatWeight, formatCurrency } from '../finance-bilty-helpers';

export default function BiltySelectorModal({
  isOpen,
  filteredTransits,
  selectedBiltiesForSave,
  setSelectedBiltiesForSave,
  selectedTransportForBill,
  setSelectedTransportForBill,
  modalUniqueTransports,
  loadingModalTransports,
  savingKaatBill,
  kaatDetails,
  getAdminNameForBilty,
  transportAdmins,
  onConfirmSave,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex-shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Select Bilties for Kaat Bill
          </h3>
          <p className="text-sm text-white/80 mt-1">Choose bilties to include in the kaat bill</p>

          {/* Transport Selection */}
          {loadingModalTransports ? (
            <div className="mt-4 bg-white/10 rounded-lg p-3 flex items-center gap-2 text-white/90">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading transports...</span>
            </div>
          ) : modalUniqueTransports.length > 0 ? (
            <div className="mt-4 bg-white/10 rounded-lg p-3">
              <div className="text-xs font-semibold mb-2 text-white/90">📦 Select Transport (Optional):</div>
              <div className="space-y-2">
                {modalUniqueTransports.map((transport, idx) => {
                  const adminName = getAdminNameForBilty(transport.gst, transport.name);
                  const isActive = selectedTransportForBill?.name === transport.name && selectedTransportForBill?.gst === transport.gst;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedTransportForBill(transport)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                        isActive
                          ? 'bg-white text-emerald-700 border-white shadow-lg'
                          : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm">{transport.name}</div>
                          {transport.gst && <div className="text-xs opacity-80 mt-0.5">GST: {transport.gst}</div>}
                          {adminName && (
                            <div className={`text-[10px] mt-0.5 ${isActive ? 'text-teal-600' : 'text-teal-300'}`}>
                              🏢 Admin: {adminName}
                            </div>
                          )}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-white/20 text-white'}`}>
                          {transport.count} bilty
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4 bg-amber-500/20 rounded-lg p-3 border border-amber-500/30">
              <div className="text-xs text-white/90">ℹ️ No transport info found - Will use data from first bilty</div>
            </div>
          )}

          {/* Transport Admin Info */}
          {(() => {
            const selectedGst = selectedTransportForBill?.gst;
            const selectedName = selectedTransportForBill?.name;
            const matchedAdminName = getAdminNameForBilty(selectedGst, selectedName);
            const matchedAdmin = matchedAdminName ? transportAdmins.find(a => a.transport_name === matchedAdminName) : null;
            if (!matchedAdmin) return null;
            return (
              <div className="mt-3 bg-teal-500/20 rounded-lg p-3 border border-teal-400/30">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-white" />
                  <div>
                    <div className="text-xs font-bold text-white">Admin: {matchedAdmin.transport_name}</div>
                    <div className="text-[10px] text-white/80">
                      {matchedAdmin.gstin && <span>GSTIN: {matchedAdmin.gstin} • </span>}
                      {matchedAdmin.owner_name && <span>Owner: {matchedAdmin.owner_name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Bilty List */}
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setSelectedBiltiesForSave(filteredTransits.map(t => t.gr_no))}
              className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
            >
              Select All ({filteredTransits.length})
            </button>
            <button
              onClick={() => setSelectedBiltiesForSave([])}
              className="text-sm text-red-600 hover:text-red-800 font-semibold"
            >
              Deselect All
            </button>
          </div>

          <div className="space-y-2">
            {filteredTransits.map(transit => {
              const bilty = transit.bilty;
              const station = transit.station;
              const isSelected = selectedBiltiesForSave.includes(transit.gr_no);
              const kaatDetail = kaatDetails.find(k => k.gr_no === transit.gr_no);

              return (
                <div
                  key={transit.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedBiltiesForSave(prev => prev.filter(gr => gr !== transit.gr_no));
                    } else {
                      setSelectedBiltiesForSave(prev => [...prev, transit.gr_no]);
                    }
                  }}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{transit.gr_no}</span>
                        {isSelected && <span className="text-emerald-600 text-xs font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">✓</span>}
                      </div>
                      <div className="text-xs text-gray-600 mb-1.5">
                        <span className="font-semibold">{bilty?.consignor_name || station?.consignor || 'N/A'}</span> → <span className="font-semibold">{bilty?.consignee_name || station?.consignee || 'N/A'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[11px] text-gray-600">
                        <div>Pkg: <span className="font-medium">{bilty?.no_of_pkg || station?.no_of_packets || 0}</span></div>
                        <div>Wt: <span className="font-medium">{formatWeight(bilty?.wt || station?.weight || 0)} KG</span></div>
                        <div>Amt: <span className="font-medium">₹{formatCurrency(bilty?.total || station?.amount || 0)}</span></div>
                      </div>
                      {kaatDetail && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="grid grid-cols-3 gap-x-4 text-[11px]">
                            <div>Kaat: <span className="font-bold text-green-700">₹{kaatDetail.kaatAmount.toFixed(2)}</span></div>
                            <div>PF: <span className={`font-bold ${kaatDetail.pf >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{kaatDetail.pf.toFixed(2)}</span></div>
                            <div>Rate: <span className="font-semibold text-indigo-600">₹{kaatDetail.actual_kaat_rate.toFixed(2)}/kg</span></div>
                          </div>
                        </div>
                      )}
                      {!kaatDetail && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[11px] text-orange-500 font-semibold">⚠️ No kaat rate</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-gray-600">
            <span className="font-bold text-gray-900">{selectedBiltiesForSave.length}</span> of {filteredTransits.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold text-gray-700">
              Cancel
            </button>
            <button
              onClick={onConfirmSave}
              disabled={selectedBiltiesForSave.length === 0 || savingKaatBill}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingKaatBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingKaatBill ? 'Saving...' : 'Save Kaat Bill'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
