'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import ChallanSelector from '../../components/ewb/challan-selector';
import EwbSearch from '../../components/ewb/ewb-search';

export default function EWBPage() {
  const { requireAuth, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('challan'); // 'challan' or 'search'

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
      <main className="w-full py-6 space-y-6">
        {/* Compact Header */}
        <section className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white shadow-xl px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200/80">E-Way Bill Suite</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold">E-Way Bill Management</h1>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-white/10 rounded-xl p-1 border border-white/20">
              <button
                onClick={() => setActiveTab('challan')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'challan'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                📋 Challan Selection
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'search'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                🔍 EWB Search
              </button>
            </div>
          </div>
        </section>

        {/* Content based on active tab */}
        {activeTab === 'challan' ? (
          <>
            <section className="w-full">
              <ChallanSelector />
            </section>

            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center shadow-sm">
                <svg
                  className="mx-auto h-12 w-12 text-slate-300"
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
                <h3 className="mt-4 text-lg font-semibold text-slate-800">Select a Challan</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a challan above to manage E-Way Bills, or switch to EWB Search to find a specific E-Way Bill.
                </p>
              </div>
            </div>
          </>
        ) : (
          <section className="w-full px-4 sm:px-6 lg:px-8">
            <EwbSearch />
          </section>
        )}
      </main>
    </div>
  );
}