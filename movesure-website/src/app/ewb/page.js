'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import ChallanSelector from '../../components/ewb/challan-selector';

export default function EWBPage() {
  const { requireAuth, loading: authLoading } = useAuth();

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
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
              <div>
                <p className="text-sm text-blue-100/80">Select a Challan</p>
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
          </div>
        </section>

        <section className="w-full">
          <ChallanSelector />
        </section>

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
      </main>
    </div>
  );
}