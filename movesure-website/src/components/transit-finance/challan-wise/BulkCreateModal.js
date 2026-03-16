'use client';

import React, { useMemo } from 'react';
import { Layers, Search, XCircle, Loader2, Building2, CheckSquare, Square, Truck, AlertTriangle } from 'lucide-react';

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
  // New props for transport_id based grouping
  allKaatData,
  transportLookup,
}) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (!bulkCreating) onClose();
  };

  // Build display groups from bilty_wise_kaat transport_id, merged by GST/name/admin
  const displayGroups = useMemo(() => {
    const unsavedTransits = challanTransits.filter(t => {
      const grNo = String(t.gr_no).trim().toUpperCase();
      return !alreadySavedGrNos.includes(grNo);
    });

    // Group by transport_id from kaat data
    const transportBiltyMap = {};
    let noTransportCount = 0;

    unsavedTransits.forEach(t => {
      const kaatData = allKaatData?.[t.gr_no];
      const transportId = kaatData?.transport_id;
      if (!transportId) { noTransportCount++; return; }
      if (!transportBiltyMap[transportId]) {
        const transport = transportLookup?.[transportId];
        transportBiltyMap[transportId] = {
          transportId,
          transportName: transport?.transport_name || 'Unknown',
          transportGst: transport?.gst_number || null,
          transportAdminId: transport?.transport_admin_id || null,
          bilties: []
        };
      }
      transportBiltyMap[transportId].bilties.push(t);
    });

    // Merge by same GST / name / admin
    const entries = Object.values(transportBiltyMap);
    const mergedGroups = [];
    const usedBilties = new Set();
    const gstIndex = {};
    const nameIndex = {};
    const adminIndex = {};

    entries.forEach(entry => {
      const gstKey = entry.transportGst?.toLowerCase().trim() || null;
      const nameKey = entry.transportName?.toLowerCase().trim() || null;
      const adminKey = entry.transportAdminId || null;

      let targetGroup = null;
      if (gstKey && gstIndex[gstKey] !== undefined) targetGroup = mergedGroups[gstIndex[gstKey]];
      if (!targetGroup && nameKey && nameIndex[nameKey] !== undefined) targetGroup = mergedGroups[nameIndex[nameKey]];
      if (!targetGroup && adminKey && adminIndex[adminKey] !== undefined) targetGroup = mergedGroups[adminIndex[adminKey]];

      if (targetGroup) {
        entry.bilties.forEach(b => {
          const grNo = String(b.gr_no).trim().toUpperCase();
          if (!usedBilties.has(grNo)) { targetGroup.bilties.push(b); usedBilties.add(grNo); }
        });
        targetGroup.transportIds.push(entry.transportId);
        if (!targetGroup.transportGst && gstKey) targetGroup.transportGst = entry.transportGst;
        if (!targetGroup.transportAdminId && adminKey) targetGroup.transportAdminId = adminKey;
      } else {
        const newGroup = {
          transportName: entry.transportName,
          transportGst: entry.transportGst,
          transportAdminId: entry.transportAdminId,
          bilties: [],
          transportIds: [entry.transportId]
        };
        entry.bilties.forEach(b => {
          const grNo = String(b.gr_no).trim().toUpperCase();
          if (!usedBilties.has(grNo)) { newGroup.bilties.push(b); usedBilties.add(grNo); }
        });
        const idx = mergedGroups.length;
        mergedGroups.push(newGroup);
        if (gstKey) gstIndex[gstKey] = idx;
        if (nameKey) nameIndex[nameKey] = idx;
        if (adminKey) adminIndex[adminKey] = idx;
      }
    });

    // Resolve admin names
    const groups = mergedGroups.filter(g => g.bilties.length > 0).map((g, i) => {
      const admin = g.transportAdminId
        ? transportAdmins.find(a => a.transport_id === g.transportAdminId)
        : null;
      return {
        id: `group_${i}`,
        adminId: g.transportAdminId || null,
        adminName: admin?.transport_name || g.transportName,
        adminGstin: admin?.gstin || g.transportGst,
        transportName: g.transportName,
        transportGst: g.transportGst,
        totalBilties: g.bilties.length,
        transportIds: g.transportIds,
      };
    });

    return { groups, noTransportCount, totalUnsaved: unsavedTransits.length };
  }, [challanTransits, alreadySavedGrNos, allKaatData, transportLookup, transportAdmins]);

  const { groups: allGroups, noTransportCount, totalUnsaved } = displayGroups;

  // Filter by search
  const filteredGroups = allGroups.filter(g => {
    if (!bulkAdminSearch) return true;
    const q = bulkAdminSearch.toLowerCase();
    return g.adminName?.toLowerCase().includes(q) || g.adminGstin?.toLowerCase().includes(q) || g.transportName?.toLowerCase().includes(q);
  });

  const groupsWithBilties = filteredGroups.filter(g => g.totalBilties > 0);

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
              <p className="text-sm text-white/80 mt-1">
                Groups by transport (from bilty_wise_kaat) — merged by same GST / name / admin
              </p>
            </div>
            <button onClick={handleClose} className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/20" disabled={bulkCreating}>
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Stats bar */}
          <div className="mt-3 flex items-center gap-4 text-xs text-white/80">
            <span>{totalUnsaved} unsaved bilties</span>
            <span>•</span>
            <span className="font-semibold text-white">{allGroups.length} bill group(s)</span>
            {noTransportCount > 0 && (
              <>
                <span>•</span>
                <span className="text-yellow-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {noTransportCount} without transport
                </span>
              </>
            )}
          </div>

          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              value={bulkAdminSearch}
              onChange={(e) => setBulkAdminSearch(e.target.value)}
              placeholder="Search by transport name or GSTIN..."
              className="w-full pl-9 pr-3 py-2 bg-white/15 border border-white/20 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
              disabled={bulkCreating}
            />
          </div>
        </div>

        {/* Group List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">{bulkSelectedAdmins.length} group(s) selected</span>
            <div className="flex gap-2">
              <button
                onClick={() => setBulkSelectedAdmins(groupsWithBilties.map(g => g.id))}
                className="text-xs text-teal-600 hover:text-teal-800 font-semibold px-2 py-1 rounded hover:bg-teal-50"
                disabled={bulkCreating}
              >
                Select All ({groupsWithBilties.length})
              </button>
              <button onClick={() => setBulkSelectedAdmins([])} className="text-xs text-red-500 font-semibold px-2 py-1 rounded hover:bg-red-50" disabled={bulkCreating}>
                Clear
              </button>
            </div>
          </div>

          {noTransportCount > 0 && (
            <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{noTransportCount}</strong> bilties have no transport assigned. Run &quot;Update Transport&quot; first to include them.</span>
            </div>
          )}

          {groupsWithBilties.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">No bill groups found</p>
              <p className="text-xs mt-1">Run &quot;Update Transport&quot; to assign transports first</p>
            </div>
          )}

          <div className="space-y-2">
            {filteredGroups.map(group => {
              const isSelected = bulkSelectedAdmins.includes(group.id);
              const hasBilties = group.totalBilties > 0;

              return (
                <div
                  key={group.id}
                  onClick={() => {
                    if (bulkCreating || !hasBilties) return;
                    setBulkSelectedAdmins(prev =>
                      prev.includes(group.id)
                        ? prev.filter(id => id !== group.id)
                        : [...prev, group.id]
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
                        <Truck className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span className="font-bold text-sm text-gray-900 truncate">{group.transportName}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
                        {group.transportGst && <span className="font-mono">GST: {group.transportGst}</span>}
                        {group.adminId && (
                          <span className="text-teal-600 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {group.adminName}
                          </span>
                        )}
                        {group.transportIds.length > 1 && (
                          <span className="text-indigo-500">{group.transportIds.length} transports merged</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {group.totalBilties}
                      </span>
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
            <span className="font-bold text-teal-700">{bulkSelectedAdmins.length}</span> bill(s)
            {bulkSelectedAdmins.length > 0 && (
              <span className="text-gray-400 ml-2">
                • {(() => {
                  const selectedGroups = allGroups.filter(g => bulkSelectedAdmins.includes(g.id));
                  const totalBilties = selectedGroups.reduce((s, g) => s + g.totalBilties, 0);
                  return `${totalBilties} bilties`;
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
                {bulkCreating ? 'Creating...' : `Create ${bulkSelectedAdmins.length} Bill(s)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
