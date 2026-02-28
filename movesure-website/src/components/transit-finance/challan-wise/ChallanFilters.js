'use client';

import React from 'react';
import { Building2, Loader2, TrendingUp } from 'lucide-react';
import TransportFilter from '../transport-filter';

export default function ChallanFilters({
  // Transport admin
  transportAdmins,
  selectedTransportAdmin,
  setSelectedTransportAdmin,
  transportAdminSearch,
  transportAdminSubTransports,
  loadingTransportAdmins,
  // Transport filter
  challanTransits,
  selectedTransports,
  setSelectedTransports,
  cities,
  onAvailableTransportsUpdate,
  alreadySavedGrNos,
  // Payment mode
  filterPaymentMode,
  setFilterPaymentMode,
  // City filter
  selectedCityId,
  setSelectedCityId,
  uniqueCities,
  // Hub rate
  hubRates,
  selectedHubRate,
  setSelectedHubRate,
  loadingRates,
  applyingRates,
  filteredTransitsCount,
  onApplyHubRate,
  // Selection info
  selectedBiltiesCount,
  alreadySavedCount,
  editMode,
  onClearSelection,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 mb-3">
      {/* Selection Legend */}
      <div className="flex gap-4 items-center justify-between mb-2">
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-emerald-100 border-2 border-emerald-400 rounded"></div>
            <span className="text-gray-600 font-medium">Selected ({selectedBiltiesCount})</span>
          </div>
          {!editMode && (
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-amber-100 border-2 border-amber-400 rounded"></div>
              <span className="text-gray-600 font-medium">Saved ({alreadySavedCount})</span>
            </div>
          )}
          {editMode && (
            <div className="flex items-center gap-1">
              <span className="text-orange-700 font-semibold text-xs">✏️ Editing - Click rows to add/remove</span>
            </div>
          )}
        </div>
        {selectedBiltiesCount > 0 && (
          <button
            onClick={onClearSelection}
            className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* Transport Admin Filter */}
        <div className="w-52 flex-shrink-0">
          <div className="relative">
            <Building2 className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-teal-600" />
            <select
              value={selectedTransportAdmin}
              onChange={(e) => setSelectedTransportAdmin(e.target.value)}
              className={`w-full pl-7 pr-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-semibold appearance-none ${
                selectedTransportAdmin 
                  ? 'border-teal-500 bg-teal-50 text-teal-800' 
                  : 'border-gray-200 text-gray-700 bg-gray-50'
              }`}
              disabled={loadingTransportAdmins}
            >
              <option value="">All Transport Admins</option>
              {transportAdmins
                .filter(admin => {
                  if (!transportAdminSearch) return true;
                  const q = transportAdminSearch.toLowerCase();
                  return admin.transport_name?.toLowerCase().includes(q) || 
                         admin.gstin?.toLowerCase().includes(q);
                })
                .map(admin => {
                  const subCount = transportAdminSubTransports[admin.transport_id]?.length || 0;
                  return (
                    <option key={admin.transport_id} value={admin.transport_id}>
                      {admin.transport_name} {admin.gstin ? `(${admin.gstin})` : ''} [{subCount}]
                    </option>
                  );
                })
              }
            </select>
          </div>
          {selectedTransportAdmin && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-semibold">
                🏢 {transportAdmins.find(a => a.transport_id === selectedTransportAdmin)?.transport_name}
              </span>
              <button
                onClick={() => setSelectedTransportAdmin('')}
                className="text-[9px] text-red-500 hover:text-red-700 font-semibold px-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Transport Filter */}
        <div className="flex-1 min-w-[180px]">
          <TransportFilter
            challanTransits={challanTransits}
            selectedTransports={selectedTransports}
            onTransportSelect={setSelectedTransports}
            onTransportClear={() => setSelectedTransports([])}
            cities={cities}
            onAvailableTransportsUpdate={onAvailableTransportsUpdate}
            alreadySavedGrNos={alreadySavedGrNos}
          />
        </div>

        {/* Payment Mode */}
        <div className="w-28 flex-shrink-0">
          <select
            value={filterPaymentMode}
            onChange={(e) => setFilterPaymentMode(e.target.value)}
            className={`w-full px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold appearance-none ${
              filterPaymentMode !== 'all' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            <option value="all">All Modes</option>
            <option value="paid">Paid</option>
            <option value="to-pay">To Pay</option>
            <option value="foc">FOC</option>
          </select>
        </div>

        {/* City Filter */}
        <div className="w-44 flex-shrink-0">
          <select
            value={selectedCityId}
            onChange={(e) => {
              setSelectedCityId(e.target.value);
              setSelectedHubRate('');
            }}
            className={`w-full px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold appearance-none ${
              selectedCityId ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            <option value="">All Cities</option>
            {uniqueCities.map(city => (
              <option key={city.id} value={city.id}>{city.name}</option>
            ))}
          </select>
        </div>

        {/* Hub Rate Selector */}
        {selectedCityId && (
          <>
            <div className="w-52 flex-shrink-0">
              <select
                value={selectedHubRate}
                onChange={(e) => setSelectedHubRate(e.target.value)}
                disabled={loadingRates}
                className="w-full px-2 py-1.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-blue-50 font-semibold appearance-none"
              >
                <option value="">Select Hub Rate</option>
                {hubRates.map(rate => {
                  const transportName = rate.transport_name || rate.transport?.transport_name || 'Unknown';
                  const rateKg = rate.rate_per_kg ? `₹${parseFloat(rate.rate_per_kg).toFixed(2)}/kg` : '';
                  const ratePkg = rate.rate_per_pkg ? `₹${parseFloat(rate.rate_per_pkg).toFixed(2)}/pkg` : '';
                  const rateDisplay = [rateKg, ratePkg].filter(Boolean).join(' + ');
                  return (
                    <option key={rate.id} value={rate.id}>
                      {transportName} → {rateDisplay}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              onClick={onApplyHubRate}
              disabled={!selectedHubRate || applyingRates || filteredTransitsCount === 0}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold text-xs hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1 flex-shrink-0"
            >
              {applyingRates ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              Apply to {filteredTransitsCount}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
