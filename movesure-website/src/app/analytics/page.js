'use client';

import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import Navbar from '../../components/dashboard/navbar';
import { useAuth } from '../utils/auth';

export default function AnalyticsPage() {
  const { user, requireAuth } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          </div>
          <p className="text-gray-600">Business insights and performance metrics</p>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <BarChart3 className="w-20 h-20 text-gray-300 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Analytics Coming Soon</h2>
            <p className="text-gray-600 mb-6">
              We're working on building comprehensive analytics and reporting features for your business.
            </p>
            <div className="text-sm text-gray-500">
              <p>Expected features:</p>
              <ul className="mt-2 space-y-1">
                <li>• Revenue Analytics</li>
                <li>• Bilty Statistics</li>
                <li>• Performance Metrics</li>
                <li>• Custom Reports</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}