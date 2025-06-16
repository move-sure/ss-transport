'use client';

import { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

export default function LastLoginInfo({ userId }) {
  const [loginInfo, setLoginInfo] = useState({
    lastLogin: null,
    totalLogins: 0,
    loading: true
  });

  useEffect(() => {
    if (userId) {
      fetchLoginInfo();
    }
  }, [userId]);

  const fetchLoginInfo = async () => {
    try {
      // Get total login count
      const { count: totalLogins } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get last login (excluding current session)
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .neq('is_active', true) // Exclude current active session
        .order('login_time', { ascending: false })
        .limit(1);

      if (error) throw error;

      setLoginInfo({
        lastLogin: sessions && sessions.length > 0 ? sessions[0] : null,
        totalLogins: totalLogins || 0,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching login info:', error);
      setLoginInfo({
        lastLogin: null,
        totalLogins: 0,
        loading: false
      });
    }
  };

  const formatLastLogin = (loginTime) => {
    if (!loginTime) return 'Never';
    
    const now = new Date();
    const login = new Date(loginTime);
    const diffInMinutes = Math.floor((now - login) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInMinutes < 10080) {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else {
      return login.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  if (loginInfo.loading) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
        <div className="h-6 bg-gray-300 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-indigo-800 mb-1">Last Login</h3>
          <p className="text-lg font-semibold text-indigo-900">
            {formatLastLogin(loginInfo.lastLogin?.login_time)}
          </p>
          {loginInfo.lastLogin && (
            <p className="text-xs text-indigo-600 mt-1">
              {new Date(loginInfo.lastLogin.login_time).toLocaleString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-900">
            {loginInfo.totalLogins}
          </div>
          <p className="text-xs text-indigo-600">Total Logins</p>
        </div>
      </div>
    </div>
  );
}
