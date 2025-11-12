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
    <div className="space-y-3">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
        >
          <div className="flex-1 min-w-0">
            {selectedChallan ? (
              <>
                <p className="text-base font-bold text-slate-900">{selectedChallan.challan_no}</p>
                <p className="text-[10px] text-slate-600">
                  {formatDate(selectedChallan.date)} • {transitBiltiesCount} bilties
                  {selectedChallan.is_dispatched && ' • Dispatched'}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-slate-400">Select a challan to track...</p>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 text-indigo-600 transition-transform ${
              showDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showDropdown && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-xl">
            <div className="max-h-80 overflow-y-auto">
              {challans.length === 0 ? (
                <div className="px-3 py-6 text-center text-slate-500">
                  <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-semibold">No challans found</p>
                  <p className="text-[10px] text-slate-400">Create a challan to start tracking</p>
                </div>
              ) : (
                <>
                  {activeChallans.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        <CheckCircle className="h-3 w-3" />
                        Active ({activeChallans.length})
                      </div>
                      {activeChallans.map((challan) => (
                        <button
                          key={challan.id}
                          onClick={() => {
                            onChallanSelect(challan);
                            setShowDropdown(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left transition hover:bg-indigo-50 ${
                            challan.id === selectedChallan?.id ? 'bg-indigo-50' : 'bg-white'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">{challan.challan_no}</p>
                            <p className="text-[10px] text-slate-500">{formatDate(challan.date)} • {challan.total_bilty_count || 0} bilties</p>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                            ACTIVE
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {dispatchedChallans.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-orange-100 bg-orange-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                        <AlertTriangle className="h-3 w-3" />
                        Dispatched ({dispatchedChallans.length})
                      </div>
                      {dispatchedChallans.map((challan) => (
                        <button
                          key={challan.id}
                          onClick={() => {
                            onChallanSelect(challan);
                            setShowDropdown(false);
                          }}
                          className="flex w-full items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-left transition hover:bg-orange-50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-700">{challan.challan_no}</p>
                            <p className="text-[10px] text-slate-500">{formatDate(challan.date)} • {challan.total_bilty_count || 0} bilties</p>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-bold text-orange-700">
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
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-indigo-200 bg-white p-2">
              <div className="mb-1.5 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Truck className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">Transport</span>
              </div>
              <div className="space-y-1 text-xs">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Truck</p>
                  <p className="text-sm font-bold text-slate-900">{truck?.truck_number || 'Not assigned'}</p>
                </div>
                {truck?.capacity && (
                  <p className="text-[10px] text-slate-600">{truck.capacity}T Capacity</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-white p-2">
              <div className="mb-1.5 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <User className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">Staff</span>
              </div>
              <div className="space-y-1 text-xs">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Driver</p>
                  <p className="text-sm font-bold text-slate-900">{driver?.name || 'Not assigned'}</p>
                  {driver?.mobile && (
                    <a href={`tel:${driver.mobile}`} className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-indigo-600">
                      <Phone className="h-2.5 w-2.5" />
                      {driver.mobile}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-purple-200 bg-white p-2">
            <div className="mb-1.5 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <Package className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-xs font-bold text-slate-900">Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-purple-50 p-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-purple-600">Bilties</p>
                <p className="text-lg font-black text-purple-900">{transitBiltiesCount}</p>
              </div>
              <div className="rounded bg-indigo-50 p-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">Date</p>
                <p className="text-[10px] font-bold text-indigo-900">{formatDate(challanDetails.date)}</p>
              </div>
              <div
                className={`rounded p-1.5 ${
                  challanDetails.is_dispatched ? 'bg-orange-50' : 'bg-emerald-50'
                }`}
              >
                <p
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    challanDetails.is_dispatched ? 'text-orange-600' : 'text-emerald-600'
                  }`}
                >
                  Status
                </p>
                <p
                  className={`text-[10px] font-bold ${
                    challanDetails.is_dispatched ? 'text-orange-900' : 'text-emerald-900'
                  }`}
                >
                  {challanDetails.is_dispatched ? 'Dispatched' : 'Active'}
                </p>
              </div>
            </div>
          </div>

          {challanDetails.remarks && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Remarks</p>
              <p className="mt-0.5 text-[10px] text-slate-700">{challanDetails.remarks}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChallanTrackingSelector;
