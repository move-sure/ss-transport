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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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

          {/* Quick Stats Section */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Users
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Loading...
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Branches
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Loading...
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0"><dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Active Bill Books
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Loading...
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Bills Generated Today
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Coming Soon
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}