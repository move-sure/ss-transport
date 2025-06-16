'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import UserStats from '../../components/common/user-stats';
import UserSessions from '../../components/common/user-sessions';
import NotificationCenter from '../../components/common/notification-center';
import WorkingHoursTracker from '../../components/common/working-hours-tracker';
import LastLoginInfo from '../../components/common/last-login-info';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, initialized } = useAuth();

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
          <p className="mt-4 text-gray-600 text-lg">Loading your dashboard...</p>
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
      <Navbar />      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {user.name || user.username}!
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Here's what's happening with your account today.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {user.image_url && (
                    <img
                      src={user.image_url}
                      alt="Profile"
                      className="h-16 w-16 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  )}
                </div>
              </div>
              
              {/* Last Login Info */}
              <LastLoginInfo userId={user.id} />
            </div>
          </div>

          {/* User Info Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    {user.image_url ? (
                      <img
                        src={user.image_url}
                        alt="Profile"
                        className="h-20 w-20 rounded-full object-cover border-3 border-white shadow-md"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-2xl text-gray-600">👤</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {user.name || 'No name provided'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">@{user.username}</p>
                        {user.post && (
                          <p className="text-sm text-indigo-600 font-medium">{user.post}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-col justify-center">
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {user.is_staff && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Staff Member
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Member since {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>            </div>
          </div>

          {/* Dashboard Stats */}
          <UserStats userId={user.id} />

          {/* Working Hours Tracker */}
          <div className="mb-6">
            <WorkingHoursTracker userId={user.id} />
          </div>

          {/* Sessions and Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <UserSessions userId={user.id} />
            <NotificationCenter userId={user.id} />
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-lg">👤</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Profile</h3>
                    <p className="text-sm text-gray-500">Manage your profile information</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-lg">📋</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Activities</h3>
                    <p className="text-sm text-gray-500">View your recent activities</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-lg">⚙️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Settings</h3>
                    <p className="text-sm text-gray-500">Configure your preferences</p>
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