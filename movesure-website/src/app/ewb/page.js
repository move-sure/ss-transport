'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import ChallanSelector from '../../components/ewb/challan-selector';
import ChallanDetailsView from '../../components/ewb/challan-details-view';
import TransitDetailsTable from '../../components/ewb/transit-details-table';
import useChallanData from '../../components/ewb/challan-data-fetcher';

export default function EWBPage() {
  const { requireAuth, loading: authLoading } = useAuth();
  const [selectedChallan, setSelectedChallan] = useState(null);
  
  // Use custom hook to fetch challan data
  const { challanDetails, transitDetails, loading, error } = useChallanData(selectedChallan);

  const hasSelection = Boolean(selectedChallan && challanDetails);

  const handleChallanSelect = (challanNo) => {
    setSelectedChallan(challanNo || null);
  };

  const handleBackToSelector = () => {
    setSelectedChallan(null);
  };

  // Move requireAuth to useEffect to avoid setState during render
  useEffect(() => {
    if (!authLoading) {
      requireAuth();
    }
  }, [authLoading, requireAuth]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="w-full py-8 space-y-8">
        <section className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white shadow-xl p-8 sm:p-10 lg:p-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-blue-200/80">E-Way Bill Suite</p>
              <h1 className="mt-4 text-3xl sm:text-4xl font-bold">E-Way Bill Management</h1>
              <p className="mt-3 text-sm sm:text-base text-slate-200 max-w-2xl">
                Select a challan to review transit details, validate E-Way Bills, and keep dispatches on track without leaving this workspace.
              </p>
            </div>
            {hasSelection ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-blue-200/70">Challan</p>
                  <p className="text-xl font-semibold">#{selectedChallan}</p>
                  <p className="text-xs text-blue-100/80">{challanDetails.branch?.branch_name || challanDetails.branch?.name || challanDetails.branch?.code || 'Branch N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-blue-200/70">Bilties</p>
                  <p className="text-xl font-semibold">{challanDetails.total_bilty_count || 0}</p>
                  <p className="text-xs text-blue-100/80">Total linked entries</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-blue-200/70">Transit Records</p>
                  <p className="text-xl font-semibold">{transitDetails?.length || 0}</p>
                  <p className="text-xs text-blue-100/80">Active GR numbers</p>
                </div>
                <div className="flex flex-col justify-between">
                  <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    challanDetails.is_dispatched
                      ? 'border-green-300/70 bg-green-500/20 text-green-100'
                      : 'border-amber-300/70 bg-amber-500/20 text-amber-100'
                  }`}>
                    {challanDetails.is_dispatched ? 'Dispatched' : 'Pending Dispatch'}
                  </span>
                  <button
                    type="button"
                    onClick={handleBackToSelector}
                    className="mt-3 inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20"
                  >
                    Back to Challan Selector
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                <div>
                  <p className="text-sm text-blue-100/80">No challan selected</p>
                  <p className="text-xs text-blue-200/70">
                    Use the challan selector below to drill into branch, truck, and E-Way Bill readiness.
                  </p>
                </div>
                <div className="flex-1 sm:flex-none">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100/80">
                    Awaiting Selection
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {!selectedChallan && (
          <section className="w-full">
            <ChallanSelector
              onChallanSelect={handleChallanSelect}
              selectedChallan={selectedChallan}
            />
          </section>
        )}

        {error && (
          <div className="w-full rounded-2xl border border-red-200 bg-red-50/80 p-5 text-red-800">
            <p className="text-sm font-medium">Error: {error}</p>
            <p className="mt-1 text-xs text-red-700/80">
              Please try refreshing the challan list or contact support if the issue persists.
            </p>
          </div>
        )}

        {loading && (
          <div className="w-full rounded-2xl border border-slate-200 bg-white/80 p-10 shadow-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Loading challan data...</p>
                <p className="text-xs text-slate-500 mt-1">We are preparing transit details and e-way bill insights for you.</p>
              </div>
            </div>
          </div>
        )}

        {!loading && hasSelection && (
          <div className="space-y-6">
            <ChallanDetailsView challanDetails={challanDetails} />
            <TransitDetailsTable transitDetails={transitDetails} challanDetails={challanDetails} />
          </div>
        )}

        {!loading && !hasSelection && (
          <div className="w-full rounded-3xl border border-dashed border-slate-200 bg-white/70 p-12 text-center shadow-sm">
            <svg
              className="mx-auto h-16 w-16 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-6 text-xl font-semibold text-slate-800">Dive into your challans</h3>
            <p className="mt-2 text-sm text-slate-500">
              Choose a challan from the list above to see branch allocations, truck assignments, and ready-to-generate e-way bills.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}