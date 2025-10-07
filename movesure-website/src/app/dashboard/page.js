'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import BiltyStats from '../../components/common/bilty-stats';
import BiltyActivityChart from '../../components/common/bilty-activity-chart';
import UserSessions from '../../components/common/user-sessions';
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
      
      <main className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          
          {/* Top Section: Profile + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Left: User Profile Card */}
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-6">
                {/* User Profile Section */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-shrink-0 relative">
                    {user.image_url ? (
                      <>
                        <Image
                          src={user.image_url}
                          alt="Profile"
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      </>
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                        <span className="text-2xl text-gray-400">👤</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h1 className="text-lg font-bold text-gray-900 mb-1">
                      {user.name || user.username}
                    </h1>
                    <p className="text-sm text-gray-600 mb-2">@{user.username}</p>
                    {user.post && (
                      <p className="text-xs font-medium text-gray-700">{user.post}</p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${user.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                    {user.is_active ? '● Active' : '○ Inactive'}
                  </span>
                  {user.is_staff && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      Staff Member
                    </span>
                  )}
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                    {new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
                
                {/* System Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {/* Current Time Card */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center mb-1">
                      <span className="text-base mr-1">🕐</span>
                      <p className="text-xs font-medium text-gray-600">Current Time</p>
                    </div>
                    <p className="text-base font-bold text-gray-900">
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>

                  {/* Battery Status Card */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center mb-1">
                      <span className={`text-base mr-1 ${getBatteryColor()}`}>{getBatteryIcon()}</span>
                      <p className="text-xs font-medium text-gray-600">Battery</p>
                    </div>
                    {batteryInfo.supported && batteryInfo.level !== null ? (
                      <>
                        <p className={`text-base font-bold ${getBatteryColor()}`}>
                          {batteryInfo.level}%
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {batteryInfo.charging ? 'Charging' : 'On Battery'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-base font-bold text-gray-400">N/A</p>
                        <p className="text-xs text-gray-400 mt-0.5">Not supported</p>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Last Login Info */}
                <div className="border-t border-gray-200 pt-4">
                  <LastLoginInfo userId={user.id} />
                </div>
              </div>
            </div>

            {/* Right: Bilty Statistics */}
            <div>
              <BiltyStats userId={user.id} />
            </div>
          </div>

          {/* Bilty Activity Chart - Centered with max width */}
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-6xl">
              <BiltyActivityChart userId={user.id} />
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <UserSessions userId={user.id} />
          </div>

          {/* Additional Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Account Status</h3>
                  <span className="text-2xl">✓</span>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Status</span>
                    <span className={`px-3 py-1 rounded-md text-xs font-medium ${user.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Role</span>
                    <span className="font-medium text-gray-900">{user.post || 'User'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Username</span>
                    <span className="font-medium text-gray-900">@{user.username}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Need Help?</h3>
                  <span className="text-2xl">❓</span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 text-sm mb-4">For Any Doubt</p>
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Contact Support:</p>
                  <a 
                    href="tel:+917668291228"
                    className="flex items-center text-gray-900 font-semibold hover:text-gray-700 transition-colors"
                  >
                    <span className="mr-2">📞</span>
                    +91-7668291228
                  </a>
                </div>
                <button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
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