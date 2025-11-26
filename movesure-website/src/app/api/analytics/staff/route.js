import { NextResponse } from 'next/server';
import supabase from '../../../utils/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('=== STAFF PERFORMANCE API ===');

    // Fetch staff performance data
    const [
      staffPerformanceResult,
      summaryStaffPerformanceResult
    ] = await Promise.all([
      // Regular Bilty Staff Performance
      supabase
        .from('bilty')
        .select('staff_id, total, no_of_pkg, users!inner(id, name, username, post)')
        .eq('is_active', true)
        .is('deleted_at', null)
        .not('staff_id', 'is', null),

      // Manual Bilty Staff Performance
      supabase
        .from('station_bilty_summary')
        .select('staff_id, amount, no_of_packets, weight, users!inner(id, name, username, post)')
        .not('staff_id', 'is', null)
    ]);

    console.log('Regular Staff Error:', staffPerformanceResult.error);
    console.log('Regular Staff Count:', staffPerformanceResult.data?.length || 0);
    console.log('Manual Staff Error:', summaryStaffPerformanceResult.error);
    console.log('Manual Staff Count:', summaryStaffPerformanceResult.data?.length || 0);

    // Process Staff Performance
    const staffMap = {};
    
    staffPerformanceResult.data?.forEach(b => {
      const staffId = b.staff_id;
      const staffName = b.users?.name || b.users?.username || 'Unknown';
      const staffPost = b.users?.post || 'N/A';
      
      if (!staffMap[staffId]) {
        staffMap[staffId] = { 
          staffId, 
          staffName,
          staffPost,
          regularRevenue: 0, 
          regularCount: 0,
          regularPackages: 0,
          manualRevenue: 0,
          manualCount: 0,
          manualPackages: 0,
          manualWeight: 0
        };
      }
      staffMap[staffId].regularRevenue += parseFloat(b.total) || 0;
      staffMap[staffId].regularCount += 1;
      staffMap[staffId].regularPackages += b.no_of_pkg || 0;
    });

    summaryStaffPerformanceResult.data?.forEach(s => {
      const staffId = s.staff_id;
      const staffName = s.users?.name || s.users?.username || 'Unknown';
      const staffPost = s.users?.post || 'N/A';
      
      if (!staffMap[staffId]) {
        staffMap[staffId] = { 
          staffId, 
          staffName,
          staffPost,
          regularRevenue: 0, 
          regularCount: 0,
          regularPackages: 0,
          manualRevenue: 0,
          manualCount: 0,
          manualPackages: 0,
          manualWeight: 0
        };
      }
      staffMap[staffId].manualRevenue += parseFloat(s.amount) || 0;
      staffMap[staffId].manualCount += 1;
      staffMap[staffId].manualPackages += s.no_of_packets || 0;
      staffMap[staffId].manualWeight += parseFloat(s.weight) || 0;
    });

    const staffPerformance = Object.values(staffMap).map(staff => ({
      ...staff,
      totalRevenue: staff.regularRevenue + staff.manualRevenue,
      totalCount: staff.regularCount + staff.manualCount,
      totalPackages: staff.regularPackages + staff.manualPackages
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    console.log('Final Staff Count:', staffPerformance.length);
    console.log('Top 3 Staff:', staffPerformance.slice(0, 3));

    return NextResponse.json({
      success: true,
      data: { staffPerformance }
    });

  } catch (error) {
    console.error('Staff Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff analytics', details: error.message },
      { status: 500 }
    );
  }
}
