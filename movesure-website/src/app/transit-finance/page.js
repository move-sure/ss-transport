'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import { DollarSign, TrendingUp, FileText, Package, Clock, Sparkles } from 'lucide-react';

export default function TransitFinancePage() {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Navbar />
      
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Main Coming Soon Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                  <DollarSign className="h-16 w-16" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-center mb-2">Transit Finance</h1>
              <p className="text-xl text-center text-white/90">Coming Soon</p>
            </div>

            {/* Content Section */}
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  <Sparkles className="h-4 w-4" />
                  Under Development
                </div>
                <p className="text-gray-600 text-lg leading-relaxed">
                  We&apos;re building something amazing for you! Our Transit Finance module will revolutionize
                  how you manage your financial operations.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-600 text-white p-3 rounded-lg">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Financial Analytics</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Real-time insights and analytics for better financial decision making
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border-2 border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-purple-600 text-white p-3 rounded-lg">
                      <FileText className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Invoice Management</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Streamlined invoice creation, tracking, and payment management
                  </p>
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-xl border-2 border-pink-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-pink-600 text-white p-3 rounded-lg">
                      <Package className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Transit Billing</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Automated billing for transit operations with detailed breakdowns
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-green-600 text-white p-3 rounded-lg">
                      <Clock className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Payment Tracking</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Track payments, pending dues, and receivables in real-time
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 text-white p-3 rounded-lg">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-2">What to Expect</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        Comprehensive financial dashboard with key metrics
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                        Automated billing and invoice generation
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-pink-600 rounded-full"></span>
                        Payment tracking and reminder system
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                        Detailed financial reports and analytics
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* CTA Section */}
              <div className="text-center mt-8">
                <p className="text-gray-500 text-sm mb-4">
                  Stay tuned for updates! This feature will be available soon.
                </p>
                <button
                  onClick={() => window.history.back()}
                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Info */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Questions or suggestions? Contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
