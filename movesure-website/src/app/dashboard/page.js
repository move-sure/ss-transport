'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import UserStats from '../../components/common/user-stats';
import UserSessions from '../../components/common/user-sessions';
import WorkingHoursTracker from '../../components/common/working-hours-tracker';
import LastLoginInfo from '../../components/common/last-login-info';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, initialized } = useAuth();
  const [batteryInfo, setBatteryInfo] = useState({ level: null, charging: false, supported: false });

  useEffect(() => {
    if (initialized && !loading) {
      if (!isAuthenticated || !user) {
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
      }
    }
  }, [initialized, loading, isAuthenticated, user, router]);

  // Battery API
  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        setBatteryInfo({
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          supported: true
        });

        battery.addEventListener('levelchange', () => {
          setBatteryInfo(prev => ({ ...prev, level: Math.round(battery.level * 100) }));
        });

        battery.addEventListener('chargingchange', () => {
          setBatteryInfo(prev => ({ ...prev, charging: battery.charging }));
        });
      });
    }
  }, []);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-10 h-10 bg-indigo-600 rounded-full opacity-20 animate-pulse"></div>
            </div>
          </div>
          <p className="mt-6 text-gray-700 text-lg font-medium">Loading your dashboard...</p>
          <p className="mt-2 text-gray-500 text-sm">Please wait</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
          <p className="mt-6 text-gray-700 text-lg font-medium">Redirecting...</p>
        </div>
      </div>
    );
  }

  const getBatteryIcon = () => {
    if (!batteryInfo.supported || batteryInfo.level === null) return '�';
    if (batteryInfo.charging) return '⚡';
    if (batteryInfo.level > 80) return '🔋';
    if (batteryInfo.level > 50) return '�';
    if (batteryInfo.level > 20) return '🪫';
    return '🪫';
  };

  const getBatteryColor = () => {
    if (!batteryInfo.supported || batteryInfo.level === null) return 'text-gray-600';
    if (batteryInfo.charging) return 'text-green-600';
    if (batteryInfo.level > 50) return 'text-green-600';
    if (batteryInfo.level > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Professional User Card */}
          <div className="bg-white overflow-hidden shadow-lg rounded-xl mb-8 border border-gray-200">
            <div className="px-6 py-8 sm:px-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
                
                {/* User Profile Section */}
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0 relative">
                    {user.image_url ? (
                      <>
                        <Image
                          src={user.image_url}
                          alt="Profile"
                          width={96}
                          height={96}
                          className="h-24 w-24 rounded-full object-cover border-3 border-gray-200 shadow-md"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white"></div>
                      </>
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center border-3 border-gray-200">
                        <span className="text-4xl text-gray-400">👤</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                      {user.name || user.username}
                    </h1>
                    <p className="text-sm text-gray-600 mb-2">@{user.username}</p>
                    {user.post && (
                      <p className="text-sm font-medium text-gray-700 mb-3">{user.post}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                        {user.is_active ? '● Active' : '○ Inactive'}
                      </span>
                      {user.is_staff && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          Staff Member
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        Member since {new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* System Info Grid */}
                <div className="grid grid-cols-2 gap-4 lg:gap-6">
                  {/* Current Time Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-2">🕐</span>
                      <p className="text-xs font-medium text-gray-600">Current Time</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>

                  {/* Battery Status Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center mb-2">
                      <span className={`text-lg mr-2 ${getBatteryColor()}`}>{getBatteryIcon()}</span>
                      <p className="text-xs font-medium text-gray-600">Battery</p>
                    </div>
                    {batteryInfo.supported && batteryInfo.level !== null ? (
                      <>
                        <p className={`text-xl font-bold ${getBatteryColor()}`}>
                          {batteryInfo.level}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {batteryInfo.charging ? 'Charging' : 'On Battery'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-gray-400">N/A</p>
                        <p className="text-xs text-gray-400 mt-1">Not supported</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Last Login Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <LastLoginInfo userId={user.id} />
              </div>
            </div>
          </div>

          {/* Dashboard Stats */}
          <UserStats userId={user.id} />

          {/* Working Hours Tracker */}
          <div className="mb-8">
            <WorkingHoursTracker userId={user.id} />
          </div>

          {/* Recent Sessions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <UserSessions userId={user.id} />
          </div>

          {/* Additional Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Account Status</h3>
                  <span className="text-3xl">✓</span>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Role</span>
                    <span className="font-semibold text-gray-900">{user.post || 'User'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Username</span>
                    <span className="font-semibold text-gray-900">@{user.username}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Need Help?</h3>
                  <span className="text-3xl">❓</span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">For Any Doubt</p>
                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">Contact Support:</p>
                  <a 
                    href="tel:+917668291228"
                    className="flex items-center text-purple-700 font-semibold hover:text-purple-800 transition-colors"
                  >
                    <span className="mr-2">📞</span>
                    +91-7668291228
                  </a>
                </div>
                <button className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                  View Help Center
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}