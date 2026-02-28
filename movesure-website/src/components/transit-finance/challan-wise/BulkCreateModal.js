'use client';

import React from 'react';
import { Layers, Search, XCircle, Loader2, Building2, CheckSquare, Square } from 'lucide-react';

export default function BulkCreateModal({
  isOpen,
  onClose,
  bulkCreating,
  bulkSelectedAdmins,
  setBulkSelectedAdmins,
  bulkAdminSearch,
  setBulkAdminSearch,
  bulkProgress,
  transportAdmins,
  transportAdminSubTransports,
  challanTransits,
  alreadySavedGrNos,
  cities,
  transportsByCity,
  onCreateBills,
  getBulkAdminBiltyGroups,
}) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (!bulkCreating) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Bulk Create Kaat Bills
              </h3>
              <p className="text-sm text-white/80 mt-1">Select transport admins to auto-create bills</p>
            </div>
            <button onClick={handleClose} className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/20" disabled={bulkCreating}>
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              value={bulkAdminSearch}
              onChange={(e) => setBulkAdminSearch(e.target.value)}
              placeholder="Search admin by name or GSTIN..."
              className="w-full pl-9 pr-3 py-2 bg-white/15 border border-white/20 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
              disabled={bulkCreating}
            />
          </div>
        </div>

        {/* Admin List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">{bulkSelectedAdmins.length} admin(s) selected</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const filtered = transportAdmins.filter(admin => {
                    if (bulkAdminSearch) {
                      const q = bulkAdminSearch.toLowerCase();
                      if (!admin.transport_name?.toLowerCase().includes(q) && !admin.gstin?.toLowerCase().includes(q)) return false;
                    }
                    const subTransports = transportAdminSubTransports[admin.transport_id] || [];
                    if (subTransports.length === 0) return false;
                    const subGsts = subTransports.map(t => t.gst_number?.trim()).filter(Boolean);
                    const subNames = subTransports.map(t => t.transport_name?.toLowerCase().trim()).filter(Boolean);
                    const subCityIds = subTransports.map(t => t.city_id).filter(Boolean);
                    return challanTransits.some(t => {
                      const grNo = String(t.gr_no).trim().toUpperCase();
                      if (alreadySavedGrNos.includes(grNo)) return false;
                      const biltyGst = t.bilty?.transport_gst?.trim();
                      const biltyName = t.bilty?.transport_name?.toLowerCase().trim();
                      const stationCode = t.station?.station;
                      const stationCityId = stationCode ? cities?.find(c => c.city_code === stationCode)?.id : null;
                      if (biltyGst && subGsts.includes(biltyGst)) return true;
                      if (biltyName && subNames.includes(biltyName)) return true;
                      if (stationCityId && subCityIds.includes(stationCityId)) return true;
                      if (t.bilty?.to_city_id && subCityIds.includes(t.bilty.to_city_id)) return true;
                      return false;
                    });
                  }).map(a => a.transport_id);
                  setBulkSelectedAdmins(filtered);
                }}
                className="text-xs text-teal-600 hover:text-teal-800 font-semibold px-2 py-1 rounded hover:bg-teal-50"
                disabled={bulkCreating}
              >
                Select All with Bilties
              </button>
              <button onClick={() => setBulkSelectedAdmins([])} className="text-xs text-red-500 font-semibold px-2 py-1 rounded hover:bg-red-50" disabled={bulkCreating}>
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {transportAdmins
              .filter(admin => {
                if (!bulkAdminSearch) return true;
                const q = bulkAdminSearch.toLowerCase();
                return admin.transport_name?.toLowerCase().includes(q) || admin.gstin?.toLowerCase().includes(q);
              })
              .map(admin => {
                const subTransports = transportAdminSubTransports[admin.transport_id] || [];
                const isSelected = bulkSelectedAdmins.includes(admin.transport_id);
                const subGsts = subTransports.map(t => t.gst_number?.trim()).filter(Boolean);
                const subNames = subTransports.map(t => t.transport_name?.toLowerCase().trim()).filter(Boolean);
                const subCityIds = subTransports.map(t => t.city_id).filter(Boolean);

                const matchingBilties = challanTransits.filter(t => {
                  const grNo = String(t.gr_no).trim().toUpperCase();
                  if (alreadySavedGrNos.includes(grNo)) return false;
                  const biltyGst = t.bilty?.transport_gst?.trim();
                  const biltyName = t.bilty?.transport_name?.toLowerCase().trim();
                  const stationCode = t.station?.station;
                  const stationCityId = stationCode ? cities?.find(c => c.city_code === stationCode)?.id : null;
                  if (biltyGst && subGsts.includes(biltyGst)) return true;
                  if (biltyName && subNames.includes(biltyName)) return true;
                  if (stationCityId && subCityIds.includes(stationCityId)) return true;
                  if (t.bilty?.to_city_id && subCityIds.includes(t.bilty.to_city_id)) return true;
                  return false;
                });

                const hasBilties = matchingBilties.length > 0;

                return (
                  <div
                    key={admin.transport_id}
                    onClick={() => {
                      if (bulkCreating || !hasBilties) return;
                      setBulkSelectedAdmins(prev =>
                        prev.includes(admin.transport_id)
                          ? prev.filter(id => id !== admin.transport_id)
                          : [...prev, admin.transport_id]
                      );
                    }}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      !hasBilties ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' :
                      bulkCreating ? 'border-gray-200 cursor-not-allowed' :
                      isSelected ? 'border-teal-500 bg-teal-50 cursor-pointer shadow-md' :
                      'border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {isSelected ? <CheckSquare className="w-5 h-5 text-teal-600" /> : <Square className={`w-5 h-5 ${hasBilties ? 'text-gray-400' : 'text-gray-300'}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                          <span className="font-bold text-sm text-gray-900 truncate">{admin.transport_name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
                          {admin.gstin && <span className="font-mono">GST: {admin.gstin}</span>}
                          <span className="text-teal-600">{subTransports.length} sub-transport(s)</span>
                        </div>
                        {subTransports.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {subTransports.slice(0, 4).map((sub, i) => (
                              <span key={i} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {sub.transport_name}{sub.city_name ? ` (${sub.city_name})` : ''}
                              </span>
                            ))}
                            {subTransports.length > 4 && <span className="text-[9px] text-gray-400">+{subTransports.length - 4} more</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {hasBilties ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                            {matchingBilties.length}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 px-2 py-1 bg-gray-100 rounded-full">0</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Progress */}
        {(bulkCreating || bulkProgress.results.length > 0) && (
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0 max-h-44 overflow-y-auto">
            {bulkCreating && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />Creating...
                  </span>
                  <span className="font-bold text-teal-700">{bulkProgress.current} / {bulkProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-teal-600 h-2 rounded-full transition-all" style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total * 100) : 0}%` }} />
                </div>
              </div>
            )}
            {bulkProgress.results.length > 0 && (
              <div className="space-y-1">
                {bulkProgress.results.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${r.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{r.status === 'success' ? '✅' : '❌'}</span>
                      <span className="font-semibold truncate">{r.admin}</span>
                      <span className="text-gray-400">→</span>
                      <span className="truncate">{r.transport}</span>
                    </div>
                    <span className="font-mono font-bold flex-shrink-0">{r.bilties} bilties{r.amount > 0 && ` ₹${r.amount.toFixed(0)}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-white flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600">
            <span className="font-bold text-teal-700">{bulkSelectedAdmins.length}</span> admin(s)
            {bulkSelectedAdmins.length > 0 && (
              <span className="text-gray-400 ml-2">
                • {(() => {
                  const groups = getBulkAdminBiltyGroups();
                  const totalBills = groups.reduce((s, g) => s + g.transports.length, 0);
                  const totalBilties = groups.reduce((s, g) => s + g.totalBilties, 0);
                  return `${totalBills} bill(s), ${totalBilties} bilties`;
                })()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClose} disabled={bulkCreating} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold text-gray-700 disabled:opacity-50">
              {bulkProgress.results.length > 0 ? 'Close' : 'Cancel'}
            </button>
            {!bulkProgress.results.length && (
              <button
                onClick={onCreateBills}
                disabled={bulkSelectedAdmins.length === 0 || bulkCreating}
                className="px-5 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {bulkCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                {bulkCreating ? 'Creating...' : `Create ${bulkSelectedAdmins.length > 0 ? `${bulkSelectedAdmins.length} Bill(s)` : 'Bills'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
