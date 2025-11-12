'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import Navbar from '@/components/dashboard/navbar';
import ComplaintForm from '@/components/complains/complaint-form';
import { Loader2 } from 'lucide-react';

function CreateComplaintContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const grNo = searchParams.get('gr_no');

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      <Navbar />
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">🚨 Register Complaint</h1>
          <p className="text-sm text-gray-600">Create a new complaint for tracking and resolution</p>
        </div>

        <div className="mx-auto max-w-3xl">
          <ComplaintForm grNo={grNo} user={user} />
        </div>
      </div>
    </div>
  );
}

export default function CreateComplaintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-indigo-600" />
      </div>
    }>
      <CreateComplaintContent />
    </Suspense>
  );
}
