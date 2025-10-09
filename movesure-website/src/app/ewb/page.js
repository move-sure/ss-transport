'use client';

import React, { useState } from 'react';
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

  if (!authLoading) {
    requireAuth();
  }

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">E-Way Bill Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Select a challan to view transit details and generate e-way bills
          </p>
        </div>

        {/* Challan Selector */}
        <div className="mb-6">
          <ChallanSelector 
            onChallanSelect={setSelectedChallan} 
            selectedChallan={selectedChallan}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading challan data...</p>
            </div>
          </div>
        )}

        {/* Challan Details and Transit Table */}
        {!loading && selectedChallan && challanDetails && (
          <div className="space-y-6">
            <ChallanDetailsView challanDetails={challanDetails} />
            <TransitDetailsTable transitDetails={transitDetails} />
          </div>
        )}

        {/* Empty State */}
        {!loading && !selectedChallan && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Challan Selected</h3>
            <p className="mt-2 text-sm text-gray-600">
              Please select a challan from the dropdown above to view its details and generate e-way bills.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}