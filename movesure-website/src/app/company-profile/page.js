'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';

export default function CompanyProfilePage() {
  const { user, loading, isAuthenticated, initialized } = useAuth();

  if (loading || !initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Content will be added here */}
      </div>
    </div>
  );
}
