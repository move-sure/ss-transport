'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import BranchManager from '../../components/settings/branch-manager';
import BillBookManager from '../../components/settings/bill-manager';
import UserManager from '../../components/settings/users-managers';

export default function BiltyPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, initialized } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    // Only check authentication after auth context is fully initialized
    if (initialized && !loading) {
      if (!isAuthenticated || !user) {
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
      }
    }
  }, [initialized, loading, isAuthenticated, user, router]);

  // Show loading while auth is initializing or still loading
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading bilty page...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect in useEffect)
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="w-full py-6 px-6">
        <div className="py-6">
          {/* Welcome Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Staff Management
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Welcome, {user.name || user.username}!
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {user.image_url && (
                    <img
                      src={user.image_url}
                      alt="Profile"
                      className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-lg"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  User Management
                </button>
                <button
                  onClick={() => setActiveTab('branches')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'branches'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Branch Management
                </button>
                <button
                  onClick={() => setActiveTab('billbooks')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'billbooks'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Bill Book Management
                </button>
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="mt-6">
            {activeTab === 'users' && <UserManager />}
            {activeTab === 'branches' && <BranchManager />}
            {activeTab === 'billbooks' && <BillBookManager />}
          </div>

        </div>
      </main>
    </div>
  );
}