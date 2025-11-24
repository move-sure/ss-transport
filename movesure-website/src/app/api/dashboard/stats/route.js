import { NextResponse } from 'next/server';
import supabase from '../../../utils/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || '1week'; // 1week, 2weeks, 3weeks

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    
    // Determine days for chart
    let daysToFetch = 7;
    if (period === '2weeks') daysToFetch = 14;
    if (period === '3weeks') daysToFetch = 21;
    
    const chartStartDate = new Date(now);
    chartStartDate.setDate(now.getDate() - daysToFetch);
    chartStartDate.setHours(0, 0, 0, 0);

    // Execute all queries in parallel
    const [
      totalBiltyResult,
      monthlyBiltyResult,
      weeklyBiltyResult,
      totalStationResult,
      monthlyStationResult,
      weeklyStationResult,
      chartBiltyResult,
      chartStationResult,
      sessionsResult,
      loginInfoResult,
      lastLoginResult
    ] = await Promise.all([
      // Total bilty count
      supabase
        .from('bilty')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .eq('is_active', true),
      
      // Monthly bilty count
      supabase
        .from('bilty')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .eq('is_active', true)
        .gte('created_at', startOfMonth.toISOString()),
      
      // Weekly bilty count
      supabase
        .from('bilty')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .eq('is_active', true)
        .gte('created_at', startOfWeek.toISOString()),
      
      // Total station bilty count
      supabase
        .from('station_bilty_summary')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId),
      
      // Monthly station bilty count
      supabase
        .from('station_bilty_summary')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .gte('created_at', startOfMonth.toISOString()),
      
      // Weekly station bilty count
      supabase
        .from('station_bilty_summary')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', userId)
        .gte('created_at', startOfWeek.toISOString()),
      
      // Chart data - bilty
      supabase
        .from('bilty')
        .select('created_at')
        .eq('staff_id', userId)
        .eq('is_active', true)
        .gte('created_at', chartStartDate.toISOString()),
      
      // Chart data - station bilty
      supabase
        .from('station_bilty_summary')
        .select('created_at')
        .eq('staff_id', userId)
        .gte('created_at', chartStartDate.toISOString()),
      
      // User sessions (last 10)
      supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('login_time', { ascending: false })
        .limit(10),
      
      // Total login count
      supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Last login (excluding current session)
      supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .neq('is_active', true)
        .order('login_time', { ascending: false })
        .limit(1)
    ]);

    // Process chart data
    const dailyCounts = {};
    for (let i = 0; i < daysToFetch; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyCounts[dateStr] = {
        date: dateStr,
        bilty: 0,
        stationBilty: 0,
        total: 0,
        dayName: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        dayMonth: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      };
    }

    // Count bilties per day
    chartBiltyResult.data?.forEach(item => {
      const dateStr = new Date(item.created_at).toISOString().split('T')[0];
      if (dailyCounts[dateStr]) {
        dailyCounts[dateStr].bilty++;
        dailyCounts[dateStr].total++;
      }
    });

    // Count station bilties per day
    chartStationResult.data?.forEach(item => {
      const dateStr = new Date(item.created_at).toISOString().split('T')[0];
      if (dailyCounts[dateStr]) {
        dailyCounts[dateStr].stationBilty++;
        dailyCounts[dateStr].total++;
      }
    });

    const chartData = Object.values(dailyCounts).reverse();

    // Process session durations
    const processedSessions = sessionsResult.data?.map(session => {
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
    }) || [];

    // Calculate total working time
    const totalMinutes = processedSessions.reduce((total, session) => {
      return total + session.duration.totalMinutes;
    }, 0);

    // Build response
    const response = {
      stats: {
        totalBilties: totalBiltyResult.count || 0,
        totalStationBilties: totalStationResult.count || 0,
        monthlyBilties: monthlyBiltyResult.count || 0,
        monthlyStationBilties: monthlyStationResult.count || 0,
        weeklyBilties: weeklyBiltyResult.count || 0,
        weeklyStationBilties: weeklyStationResult.count || 0,
      },
      chartData: chartData,
      sessions: processedSessions,
      totalWorkingTime: {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
        totalMinutes
      },
      loginInfo: {
        lastLogin: lastLoginResult.data && lastLoginResult.data.length > 0 ? lastLoginResult.data[0] : null,
        totalLogins: loginInfoResult.count || 0
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      }
    });

  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    );
  }
}
