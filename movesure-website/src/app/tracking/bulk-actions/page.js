'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import Navbar from '@/components/dashboard/navbar';
import BiltyListManager from '@/components/tracking/bilty-list-manager';
import { ArrowLeft } from 'lucide-react';

export default function BulkActionsPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      <div className="p-2">
        {/* Header */}
        <div className="mb-3 px-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/tracking')}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold bg-white text-slate-700 border-2 border-slate-300 hover:bg-slate-50 shadow-sm transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tracking
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-0.5">
                📋 Bulk Actions
              </h1>
              <p className="text-xs text-gray-600">
                Create bilty lists and perform bulk operations
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-2">
          <BiltyListManager user={user} />
        </div>
      </div>
    </div>
  );
}
