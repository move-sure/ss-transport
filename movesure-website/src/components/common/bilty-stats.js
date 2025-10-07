'use client';

import { useState, useEffect, useCallback } from 'react';
import supabase from '../../app/utils/supabase';

export default function BiltyStats({ userId }) {
  const [stats, setStats] = useState({
    totalBilties: 0,
    totalStationBilties: 0,
    monthlyBilties: 0,
    monthlyStationBilties: 0,
    weeklyBilties: 0,
    weeklyStationBilties: 0,
    loading: true
  });

  const fetchBiltyStats = useCallback(async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      // Fetch total bilty count
      const { count: biltyCount } = await supabase
        .from('bilty')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .eq('is_active', true);

      // Fetch monthly bilty count
      const { count: monthlyBiltyCount } = await supabase
        .from('bilty')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .eq('is_active', true)
        .gte('created_at', startOfMonth.toISOString());

      // Fetch weekly bilty count
      const { count: weeklyBiltyCount } = await supabase
        .from('bilty')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .eq('is_active', true)
        .gte('created_at', startOfWeek.toISOString());

      // Fetch total station bilty count
      const { count: stationBiltyCount } = await supabase
        .from('station_bilty_summary')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId);

      // Fetch monthly station bilty count
      const { count: monthlyStationBiltyCount } = await supabase
        .from('station_bilty_summary')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .gte('created_at', startOfMonth.toISOString());

      // Fetch weekly station bilty count
      const { count: weeklyStationBiltyCount } = await supabase
        .from('station_bilty_summary')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .gte('created_at', startOfWeek.toISOString());

      setStats({
        totalBilties: biltyCount || 0,
        totalStationBilties: stationBiltyCount || 0,
        monthlyBilties: monthlyBiltyCount || 0,
        monthlyStationBilties: monthlyStationBiltyCount || 0,
        weeklyBilties: weeklyBiltyCount || 0,
        weeklyStationBilties: weeklyStationBiltyCount || 0,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching bilty stats:', error);
      setStats({
        totalBilties: 0,
        totalStationBilties: 0,
        monthlyBilties: 0,
        monthlyStationBilties: 0,
        weeklyBilties: 0,
        weeklyStationBilties: 0,
        loading: false
      });
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchBiltyStats();
    }
  }, [userId, fetchBiltyStats]);

  if (stats.loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white overflow-hidden shadow-sm rounded-lg animate-pulse border border-gray-200">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <div className="h-3 bg-gray-300 rounded mb-2"></div>
                  <div className="h-6 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const totalCombined = stats.totalBilties + stats.totalStationBilties;
  const monthlyCombined = stats.monthlyBilties + stats.monthlyStationBilties;
  const weeklyCombined = stats.weeklyBilties + stats.weeklyStationBilties;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Total Bilties */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-300">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-xl">📄</span>
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <dl>
                <dt className="text-xs font-medium text-gray-600 truncate">Total Bilties</dt>
                <dd className="text-xl font-bold text-gray-900 mt-1">{totalCombined.toLocaleString()}</dd>
                <dd className="text-xs text-gray-500 mt-1">
                  Regular: {stats.totalBilties} | Station: {stats.totalStationBilties}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* This Month */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-300">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <span className="text-xl">📅</span>
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <dl>
                <dt className="text-xs font-medium text-gray-600 truncate">This Month</dt>
                <dd className="text-xl font-bold text-gray-900 mt-1">{monthlyCombined.toLocaleString()}</dd>
                <dd className="text-xs text-gray-500 mt-1">
                  Regular: {stats.monthlyBilties} | Station: {stats.monthlyStationBilties}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* This Week */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-300">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <dl>
                <dt className="text-xs font-medium text-gray-600 truncate">This Week</dt>
                <dd className="text-xl font-bold text-gray-900 mt-1">{weeklyCombined.toLocaleString()}</dd>
                <dd className="text-xs text-gray-500 mt-1">
                  Regular: {stats.weeklyBilties} | Station: {stats.weeklyStationBilties}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Average Per Day (This Month) */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-300">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <span className="text-xl">⚡</span>
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <dl>
                <dt className="text-xs font-medium text-gray-600 truncate">Daily Average</dt>
                <dd className="text-xl font-bold text-gray-900 mt-1">
                  {(monthlyCombined / new Date().getDate()).toFixed(1)}
                </dd>
                <dd className="text-xs text-gray-500 mt-1">Per day this month</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
