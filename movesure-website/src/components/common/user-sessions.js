'use client';

import { useState, useEffect, useCallback } from 'react';
import supabase from '../../app/utils/supabase';

export default function UserSessions({ userId }) {
  const [sessions, setSessions] = useState([]);
  const [totalWorkingTime, setTotalWorkingTime] = useState({
    hours: 0,
    minutes: 0,
    totalMinutes: 0  });
  const [loading, setLoading] = useState(true);

  const fetchUserSessions = useCallback(async () => {
    try {
      const { data: sessionsData, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('login_time', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Calculate session durations
      const processedSessions = sessionsData.map(session => {
        const loginTime = new Date(session.login_time);
        const logoutTime = session.logout_time ? new Date(session.logout_time) : new Date();
        const duration = logoutTime - loginTime;
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        
        return {
          ...session,
          duration: {
            hours,
            minutes,
            totalMinutes: Math.floor(duration / (1000 * 60))
          }
        };
      });

      // Calculate total working time
      const totalMinutes = processedSessions.reduce((total, session) => {
        return total + session.duration.totalMinutes;
      }, 0);

      setTotalWorkingTime({
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
        totalMinutes
      });

      setSessions(processedSessions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user sessions:', error);      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserSessions();
    }
  }, [userId, fetchUserSessions]);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDeviceInfo = (userAgent) => {
    if (!userAgent) return { device: 'Unknown', browser: 'Unknown' };
    
    let device = 'Desktop';
    let browser = 'Unknown';

    // Device detection
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device = 'Mobile';
    } else if (/Tablet|iPad/.test(userAgent)) {
      device = 'Tablet';
    }

    // Browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    return { device, browser };
  };

  if (loading) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Work Sessions</h2>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Work Sessions</h2>
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-lg">
            <p className="text-sm font-medium text-gray-700">
              Total Working Time: {totalWorkingTime.hours}h {totalWorkingTime.minutes}m
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🕒</span>
              </div>
              <p className="text-gray-500">No session data available</p>
            </div>
          ) : (
            sessions.map((session) => {
              const deviceInfo = getDeviceInfo(session.user_agent);
              return (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${session.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDateTime(session.login_time)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Login {session.logout_time ? `- ${formatDateTime(session.logout_time)}` : '(Active)'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600">
                        <span className="flex items-center">
                          <span className="mr-1">📱</span>
                          {deviceInfo.device}
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1">🌐</span>
                          {deviceInfo.browser}
                        </span>
                        {session.ip_address && (
                          <span className="flex items-center">
                            <span className="mr-1">📍</span>
                            {session.ip_address}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        {session.duration.hours}h {session.duration.minutes}m
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {session.is_active ? 'Active' : 'Completed'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {sessions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm font-medium text-gray-900">{sessions.length}</p>
                <p className="text-xs text-gray-500">Total Sessions</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {sessions.filter(s => s.is_active).length}
                </p>
                <p className="text-xs text-gray-500">Active Sessions</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {sessions.length > 0 ? Math.round(totalWorkingTime.totalMinutes / sessions.length) : 0}m
                </p>
                <p className="text-xs text-gray-500">Avg Session</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
