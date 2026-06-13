'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import BiltyStats from '../../components/common/bilty-stats';
import BiltyActivityChart from '../../components/common/bilty-activity-chart';
import UserSessions from '../../components/common/user-sessions';
import LastLoginInfo from '../../components/common/last-login-info';
import { PartyPopper, Cake, Sparkles } from 'lucide-react';

const CONFETTI_COLORS = ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa', '#fb7185'];
const CONFETTI_EMOJIS = ['🎉', '🎊', '✨', '⭐', '🎈'];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, initialized } = useAuth();
  const [batteryInfo, setBatteryInfo] = useState({ level: null, charging: false, supported: false });
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1week');
  const [showCelebration, setShowCelebration] = useState(false);

  // Party-popper confetti burst shown once right after a successful login
  const celebrationConfetti = useMemo(() => Array.from({ length: 40 }).map((_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 280;
    return {
      id: i,
      tx: `${Math.cos(angle) * distance}px`,
      ty: `${Math.sin(angle) * distance}px`,
      rot: `${(Math.random() - 0.5) * 720}deg`,
      delay: Math.random() * 0.5,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: i % 2 === 0,
      emoji: i % 5 === 0 ? CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length] : null,
    };
  }), []);

  // Show a one-time party-popper celebration when arriving fresh from a successful login
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('movesure_celebrate_login')) {
      sessionStorage.removeItem('movesure_celebrate_login');
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (period) => {
    if (!user?.id) return;
    
    setDashboardLoading(true);
    setDashboardError(null);
    
    try {
      const response = await fetch(`/api/dashboard/stats?userId=${user.id}&period=${period}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardError(error.message);
    } finally {
      setDashboardLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (initialized && !loading) {
      if (!isAuthenticated || !user) {
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
      } else {
        // Fetch dashboard data when user is authenticated
        fetchDashboardData(selectedPeriod);
      }
    }
  }, [initialized, loading, isAuthenticated, user, router, fetchDashboardData, selectedPeriod]);

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
      {/* One-time party-popper celebration after a successful login */}
      {showCelebration && (
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            {celebrationConfetti.map((p) => (
              p.emoji ? (
                <span
                  key={p.id}
                  className="absolute left-1/2 top-24 block animate-confetti-burst text-xl"
                  style={{ animationDelay: `${p.delay}s`, '--tx': p.tx, '--ty': p.ty, '--rot': p.rot }}
                >
                  {p.emoji}
                </span>
              ) : (
                <span
                  key={p.id}
                  className={`absolute left-1/2 top-24 block ${p.round ? 'rounded-full' : 'rounded-sm'} animate-confetti-burst`}
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    backgroundColor: p.color,
                    animationDelay: `${p.delay}s`,
                    '--tx': p.tx,
                    '--ty': p.ty,
                    '--rot': p.rot,
                  }}
                />
              )
            ))}
          </div>
          <div className="absolute left-1/2 top-16 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-300/40 bg-slate-900/90 px-6 py-3 text-white shadow-2xl backdrop-blur-xl animate-fade-in-up">
            <PartyPopper className="h-6 w-6 text-amber-300 animate-popper-shake" style={{ '--popper-rot': '-20deg' }} />
            <div className="text-center">
              <p className="bg-gradient-to-r from-amber-300 via-fuchsia-300 to-sky-300 bg-clip-text text-base font-bold text-transparent text-shimmer sm:text-lg">
                Welcome back, {user.name || user.username}!
              </p>
              <p className="text-xs text-slate-300 sm:text-sm">Login successful 🎉</p>
            </div>
            <PartyPopper className="h-6 w-6 text-fuchsia-300 animate-popper-shake" style={{ '--popper-rot': '20deg', '--popper-flip': -1, animationDelay: '0.15s' }} />
          </div>
        </div>
      )}

      {/* Anniversary banner */}
      <div className="relative overflow-hidden border-b border-amber-300/30 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-center text-xs font-semibold tracking-wide text-slate-200 sm:text-sm">
          <PartyPopper className="h-4 w-4 shrink-0 animate-float-y text-amber-400" />
          <span>
            <span className="hidden sm:inline">Happy 1st Anniversary, movesure.io! Celebrating one year of seamless logistics &mdash; </span>
            <span className="bg-gradient-to-r from-amber-300 via-fuchsia-300 to-sky-300 bg-clip-text font-bold text-transparent text-shimmer">13th June</span>
            <span className="hidden sm:inline"> &mdash; one year strong! 🎉</span>
            <span className="sm:hidden"> &mdash; 1st Anniversary 🎉</span>
          </span>
          <Cake className="h-4 w-4 shrink-0 animate-float-y text-amber-400" style={{ animationDelay: '0.6s' }} />
        </div>
      </div>

      <Navbar />

      <main className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          {/* Welcome hero */}
          <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-6 text-white shadow-lg sm:px-8 sm:py-8">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl"></div>
            <div className="absolute -bottom-10 left-1/3 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl"></div>
            <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
                  Welcome back, {user.name || user.username}
                  <Sparkles className="h-5 w-5 text-amber-300 animate-sparkle" />
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  Here&apos;s what&apos;s happening with your fleet today.
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
          
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
                  <LastLoginInfo data={dashboardData?.loginInfo} loading={dashboardLoading} />
                </div>
              </div>
            </div>

            {/* Right: Bilty Statistics */}
            <div>
              <BiltyStats data={dashboardData?.stats} loading={dashboardLoading} />
            </div>
          </div>

          {/* Bilty Activity Chart - Centered with max width */}
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-6xl">
              <BiltyActivityChart 
                data={dashboardData?.chartData} 
                loading={dashboardLoading}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <UserSessions 
              data={dashboardData?.sessions} 
              totalWorkingTime={dashboardData?.totalWorkingTime}
              loading={dashboardLoading}
            />
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