'use client';

import { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

export default function WorkingHoursTracker({ userId }) {
  const [workingHours, setWorkingHours] = useState({
    today: { hours: 0, minutes: 0 },
    thisWeek: { hours: 0, minutes: 0 },
    thisMonth: { hours: 0, minutes: 0 },
    total: { hours: 0, minutes: 0 }
  });
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchWorkingHours();
      checkCurrentSession();
    }
  }, [userId]);
  const fetchWorkingHours = async () => {
    if (!userId) {
      console.log('No userId provided to WorkingHoursTracker');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching working hours for userId:', userId);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch all sessions for calculations
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('login_time', { ascending: false });

      if (error) {
        console.error('Error fetching sessions for working hours:', error);
        setLoading(false);
        return;
      }

      const calculations = {
        today: { totalMinutes: 0 },
        thisWeek: { totalMinutes: 0 },
        thisMonth: { totalMinutes: 0 },
        total: { totalMinutes: 0 }
      };

      sessions.forEach(session => {
        const loginTime = new Date(session.login_time);
        const logoutTime = session.logout_time ? new Date(session.logout_time) : new Date();
        const duration = Math.floor((logoutTime - loginTime) / (1000 * 60)); // in minutes

        // Total time
        calculations.total.totalMinutes += duration;

        // Today's time
        if (loginTime >= today) {
          calculations.today.totalMinutes += duration;
        }

        // This week's time
        if (loginTime >= startOfWeek) {
          calculations.thisWeek.totalMinutes += duration;
        }

        // This month's time
        if (loginTime >= startOfMonth) {
          calculations.thisMonth.totalMinutes += duration;
        }
      });

      // Convert minutes to hours and minutes
      Object.keys(calculations).forEach(period => {
        const totalMinutes = calculations[period].totalMinutes;
        calculations[period] = {
          hours: Math.floor(totalMinutes / 60),
          minutes: totalMinutes % 60,
          totalMinutes
        };
      });

      setWorkingHours(calculations);
      setLoading(false);

      console.log('Working hours calculated successfully:', calculations);

    } catch (error) {
      console.error('Error fetching working hours:', error);
      setLoading(false);
    }
  };

  const checkCurrentSession = async () => {
    try {
      const { data: activeSessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('login_time', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (activeSessions && activeSessions.length > 0) {
        setCurrentSession(activeSessions[0]);
      }
    } catch (error) {
      console.error('Error checking current session:', error);
    }
  };

  const getCurrentSessionDuration = () => {
    if (!currentSession) return { hours: 0, minutes: 0 };
    
    const loginTime = new Date(currentSession.login_time);
    const now = new Date();
    const duration = now - loginTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  const formatTime = (timeObj) => {
    return `${timeObj.hours}h ${timeObj.minutes}m`;
  };

  if (loading) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Working Hours</h2>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentSessionTime = getCurrentSessionDuration();

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Working Hours Tracker</h2>

        {/* Current Session */}
        {currentSession && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800">Current Session</h3>
                <p className="text-xs text-green-600">
                  Started at {new Date(currentSession.login_time).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-lg font-bold text-green-800">
                    {formatTime(currentSessionTime)}
                  </span>
                </div>
                <p className="text-xs text-green-600">Active now</p>
              </div>
            </div>
          </div>
        )}

        {/* Time Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-800">
              {formatTime(workingHours.today)}
            </div>
            <p className="text-sm text-blue-600 font-medium">Today</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-800">
              {formatTime(workingHours.thisWeek)}
            </div>
            <p className="text-sm text-purple-600 font-medium">This Week</p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-800">
              {formatTime(workingHours.thisMonth)}
            </div>
            <p className="text-sm text-orange-600 font-medium">This Month</p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">
              {formatTime(workingHours.total)}
            </div>
            <p className="text-sm text-gray-600 font-medium">Total Time</p>
          </div>
        </div>

        {/* Working Hours Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Today's Progress</span>
            <span className="text-sm text-gray-500">
              {workingHours.today.totalMinutes} / 480 min (8h target)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((workingHours.today.totalMinutes / 480) * 100, 100)}%`
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {480 - workingHours.today.totalMinutes > 0 
              ? `${Math.floor((480 - workingHours.today.totalMinutes) / 60)}h ${(480 - workingHours.today.totalMinutes) % 60}m remaining to reach 8h target`
              : 'Target achieved! 🎉'
            }
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {Math.round(workingHours.total.totalMinutes / 60 / 30) || 0}
              </p>
              <p className="text-xs text-gray-500">Days Worked</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {workingHours.total.totalMinutes > 0 ? Math.round(workingHours.total.totalMinutes / 60) : 0}h
              </p>
              <p className="text-xs text-gray-500">Avg per Day</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {workingHours.thisWeek.totalMinutes > 0 ? Math.round(workingHours.thisWeek.totalMinutes / 7 / 60) : 0}h
              </p>
              <p className="text-xs text-gray-500">Weekly Avg</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
