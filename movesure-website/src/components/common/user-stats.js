'use client';

import { useState, useEffect, useCallback } from 'react';
import supabase from '../../app/utils/supabase';

export default function UserStats({ userId }) {
  const [stats, setStats] = useState({
    totalBilties: 0,
    totalChallans: 0,
    monthlyBilties: 0,
    todayActivity: 0,
    loading: true
  });

  const fetchUserStats = useCallback(async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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

      // Fetch today's bilty count
      const { count: todayBiltyCount } = await supabase
        .from('bilty')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .eq('is_active', true)
        .gte('created_at', startOfDay.toISOString());

      // Fetch challan count (assuming challan table exists)
      const { count: challanCount } = await supabase
        .from('challan')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('is_active', true);

      setStats({
        totalBilties: biltyCount || 0,
        totalChallans: challanCount || 0,
        monthlyBilties: monthlyBiltyCount || 0,
        todayActivity: todayBiltyCount || 0,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setStats({
        totalBilties: 0,
        totalChallans: 0,
        monthlyBilties: 0,
        todayActivity: 0,
        loading: false
      });
    }
  }, [userId]);
  useEffect(() => {
    if (userId) {
      fetchUserStats();
    }
  }, [userId, fetchUserStats]);

  if (stats.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-6 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">📄</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Bilties Created</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.totalBilties}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">📋</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Challans Created</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.totalChallans}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">📅</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">This Month Bilties</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.monthlyBilties}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🎯</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Today&apos;s Activity</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.todayActivity}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
