'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../../utils/auth';
import Navbar from '../../../components/dashboard/navbar';
import ChallanDetailsView from '../../../components/ewb/challan-details-view';
import TransitDetailsTable from '../../../components/ewb/transit-details-table';
import useChallanData from '../../../components/ewb/challan-data-fetcher';

export default function ChallanEWBPage() {
  const params = useParams();
  const router = useRouter();
  const challanNo = params.challan_no;
  
  const { requireAuth, loading: authLoading } = useAuth();
  
  // Use custom hook to fetch challan data
  const { challanDetails, transitDetails, loading, error, refetch } = useChallanData(challanNo);

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
        {/* Header Section */}
        <section className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white shadow-xl p-8 sm:p-10 lg:p-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Link
                  href="/ewb"
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-200 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Challan List
                </Link>
              </div>
              <p className="text-xs uppercase tracking-[0.4em] text-blue-200/80">E-Way Bill Suite</p>
              <h1 className="mt-4 text-3xl sm:text-4xl font-bold">
                Challan #{challanNo}
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-200 max-w-2xl">
                Manage E-Way Bills, validate transit details, update transporter information, and generate consolidated EWBs for this challan.
              </p>
            </div>
            
            {challanDetails && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-blue-200/70">Challan</p>
                  <p className="text-xl font-semibold">#{challanNo}</p>
                  <p className="text-xs text-blue-100/80">
                    {challanDetails.branch?.branch_name || challanDetails.branch?.name || challanDetails.branch?.code || 'Branch N/A'}
                  </p>
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
                    onClick={refetch}
                    disabled={loading}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Data
                  </button>
                </div>
              </div>
            )}
            
            {!challanDetails && !loading && !error && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                <div>
                  <p className="text-sm text-blue-100/80">Loading challan data...</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Error State */}
        {error && (
          <div className="w-full rounded-2xl border border-red-200 bg-red-50/80 p-5 text-red-800">
            <p className="text-sm font-medium">Error: {error}</p>
            <p className="mt-1 text-xs text-red-700/80">
              Please try refreshing the page or go back to the challan list.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={refetch}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
              <Link
                href="/ewb"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                Back to Challan List
              </Link>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="w-full rounded-2xl border border-slate-200 bg-white/80 p-10 shadow-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Loading challan data...</p>
                <p className="text-xs text-slate-500 mt-1">
                  Fetching transit details and E-Way Bill information for Challan #{challanNo}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Challan Details and Transit Table */}
        {!loading && challanDetails && (
          <div className="space-y-6">
            <ChallanDetailsView challanDetails={challanDetails} />
            <TransitDetailsTable transitDetails={transitDetails} challanDetails={challanDetails} />
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && !challanDetails && (
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
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-6 text-xl font-semibold text-slate-800">Challan Not Found</h3>
            <p className="mt-2 text-sm text-slate-500">
              The challan #{challanNo} could not be found. It may have been deleted or doesn&apos;t exist.
            </p>
            <Link
              href="/ewb"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Challan List
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
