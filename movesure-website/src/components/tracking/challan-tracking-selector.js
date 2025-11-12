'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Package, Truck, User, Phone, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const ChallanTrackingSelector = ({
  challans,
  selectedChallan,
  onChallanSelect,
  challanDetails,
  truck,
  driver,
  owner,
  transitBiltiesCount
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return format(new Date(value), 'dd MMM yyyy');
    } catch (error) {
      return '-';
    }
  };

  const activeChallans = challans.filter(c => !c.is_dispatched);
  const dispatchedChallans = challans.filter(c => c.is_dispatched);

  return (
    <div className="space-y-4">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
        >
          <div className="flex-1 min-w-0">
            {selectedChallan ? (
              <>
                <p className="text-xl font-black text-slate-900">{selectedChallan.challan_no}</p>
                <p className="text-sm text-slate-600">
                  {formatDate(selectedChallan.date)} • {transitBiltiesCount} bilties
                  {selectedChallan.is_dispatched && ' • Dispatched'}
                </p>
              </>
            ) : (
              <p className="text-base font-semibold text-slate-400">Select a challan to track...</p>
            )}
          </div>
          <ChevronDown
            className={`h-5 w-5 flex-shrink-0 text-indigo-600 transition-transform ${
              showDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showDropdown && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-2xl">
            <div className="max-h-96 overflow-y-auto">
              {challans.length === 0 ? (
                <div className="px-4 py-10 text-center text-slate-500">
                  <Package className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p className="font-semibold">No challans found</p>
                  <p className="text-xs text-slate-400">Create a challan to start tracking</p>
                </div>
              ) : (
                <>
                  {activeChallans.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center gap-2 border-b-2 border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                        <CheckCircle className="h-4 w-4" />
                        Active Challans ({activeChallans.length})
                      </div>
                      {activeChallans.map((challan) => (
                        <button
                          key={challan.id}
                          onClick={() => {
                            onChallanSelect(challan);
                            setShowDropdown(false);
                          }}
                          className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-indigo-50 ${
                            challan.id === selectedChallan?.id ? 'bg-indigo-50' : 'bg-white'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-bold text-slate-900">{challan.challan_no}</p>
                            <p className="text-xs text-slate-500">{formatDate(challan.date)}</p>
                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-indigo-600">
                              <Package className="h-3.5 w-3.5" />
                              {challan.total_bilty_count || 0} bilties
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            ACTIVE
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {dispatchedChallans.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center gap-2 border-b-2 border-orange-100 bg-orange-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-orange-700">
                        <AlertTriangle className="h-4 w-4" />
                        Dispatched ({dispatchedChallans.length})
                      </div>
                      {dispatchedChallans.map((challan) => (
                        <button
                          key={challan.id}
                          onClick={() => {
                            onChallanSelect(challan);
                            setShowDropdown(false);
                          }}
                          className="flex w-full items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:bg-orange-50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-bold text-slate-700">{challan.challan_no}</p>
                            <p className="text-xs text-slate-500">
                              {formatDate(challan.date)}
                              {challan.dispatch_date && ` • Dispatched ${formatDate(challan.dispatch_date)}`}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                              <Package className="h-3.5 w-3.5" />
                              {challan.total_bilty_count || 0} bilties
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-700">
                            DISPATCHED
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedChallan && challanDetails && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-indigo-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Truck className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-slate-900">Transport Details</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Truck Number</p>
                  <p className="text-base font-bold text-slate-900">{truck?.truck_number || 'Not assigned'}</p>
                </div>
                {truck?.capacity && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capacity</p>
                    <p className="font-semibold text-slate-700">{truck.capacity}T</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border-2 border-emerald-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                <User className="h-5 w-5 text-emerald-600" />
                <span className="font-bold text-slate-900">Staff Details</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Driver</p>
                  <p className="font-bold text-slate-900">{driver?.name || 'Not assigned'}</p>
                  {driver?.mobile && (
                    <p className="flex items-center gap-1 text-xs text-slate-600">
                      <Phone className="h-3 w-3" />
                      {driver.mobile}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Owner</p>
                  <p className="font-bold text-slate-900">{owner?.name || 'Not assigned'}</p>
                  {owner?.mobile && (
                    <p className="flex items-center gap-1 text-xs text-slate-600">
                      <Phone className="h-3 w-3" />
                      {owner.mobile}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-purple-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Package className="h-5 w-5 text-purple-600" />
              <span className="font-bold text-slate-900">Challan Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-purple-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Total Bilties</p>
                <p className="text-2xl font-black text-purple-900">{transitBiltiesCount}</p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Created</p>
                <p className="text-sm font-bold text-indigo-900">{formatDate(challanDetails.date)}</p>
              </div>
              <div
                className={`rounded-lg p-3 ${
                  challanDetails.is_dispatched ? 'bg-orange-50' : 'bg-emerald-50'
                }`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-wider ${
                    challanDetails.is_dispatched ? 'text-orange-600' : 'text-emerald-600'
                  }`}
                >
                  Status
                </p>
                <p
                  className={`text-sm font-bold ${
                    challanDetails.is_dispatched ? 'text-orange-900' : 'text-emerald-900'
                  }`}
                >
                  {challanDetails.is_dispatched ? 'Dispatched' : 'Active'}
                </p>
              </div>
            </div>
          </div>

          {challanDetails.remarks && (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Remarks</p>
              <p className="mt-1 text-sm text-slate-700">{challanDetails.remarks}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChallanTrackingSelector;
