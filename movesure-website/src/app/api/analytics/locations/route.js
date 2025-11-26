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

    // Fetch station and branch data
    const [
      stationStatsResult,
      branchBiltyResult,
      branchSummaryResult
    ] = await Promise.all([
      // Station Statistics
      supabase
        .from('station_bilty_summary')
        .select('station, amount, payment_status, no_of_packets, weight'),

      // Branch-wise Regular Bilty
      supabase
        .from('bilty')
        .select('branch_id, total, no_of_pkg, wt, branches!inner(id, name)')
        .eq('is_active', true)
        .is('deleted_at', null),

      // Branch-wise Manual Bilty
      supabase
        .from('station_bilty_summary')
        .select('branch_id, amount, no_of_packets, weight, branches!inner(id, name)')
    ]);

    // Process Station Stats
    const stationMap = {};
    stationStatsResult.data?.forEach(s => {
      const station = s.station || 'Unknown';
      if (!stationMap[station]) {
        stationMap[station] = { 
          station, 
          totalAmount: 0, 
          count: 0, 
          packets: 0, 
          weight: 0,
          paid: 0,
          toPay: 0,
          foc: 0
        };
      }
      stationMap[station].totalAmount += parseFloat(s.amount) || 0;
      stationMap[station].count += 1;
      stationMap[station].packets += s.no_of_packets || 0;
      stationMap[station].weight += parseFloat(s.weight) || 0;
      
      if (s.payment_status === 'paid') stationMap[station].paid += 1;
      else if (s.payment_status === 'to-pay') stationMap[station].toPay += 1;
      else if (s.payment_status === 'foc') stationMap[station].foc += 1;
    });
    
    const stationStats = Object.values(stationMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 20);

    // Process Branch Stats
    const branchMap = {};
    
    branchBiltyResult.data?.forEach(b => {
      const branchId = b.branch_id;
      const branchName = b.branches?.name || 'Unknown Branch';
      
      if (!branchMap[branchId]) {
        branchMap[branchId] = {
          branchId,
          branchName,
          totalRevenue: 0,
          biltyCount: 0,
          totalPackages: 0,
          totalWeight: 0
        };
      }
      
      branchMap[branchId].totalRevenue += parseFloat(b.total || 0);
      branchMap[branchId].biltyCount += 1;
      branchMap[branchId].totalPackages += parseInt(b.no_of_pkg || 0);
      branchMap[branchId].totalWeight += parseFloat(b.wt || 0);
    });

    branchSummaryResult.data?.forEach(s => {
      const branchId = s.branch_id;
      const branchName = s.branches?.name || 'Unknown Branch';
      
      if (!branchMap[branchId]) {
        branchMap[branchId] = {
          branchId,
          branchName,
          totalRevenue: 0,
          biltyCount: 0,
          totalPackages: 0,
          totalWeight: 0
        };
      }
      
      branchMap[branchId].totalRevenue += parseFloat(s.amount || 0);
      branchMap[branchId].biltyCount += 1;
      branchMap[branchId].totalPackages += parseInt(s.no_of_packets || 0);
      branchMap[branchId].totalWeight += parseFloat(s.weight || 0);
    });

    const branchStats = Object.values(branchMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Station bilty count
    const stationBiltyCount = {};
    stationStatsResult.data?.forEach(s => {
      const station = s.station || 'Unknown';
      stationBiltyCount[station] = (stationBiltyCount[station] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        stationStats,
        branchStats,
        stationBiltyCount
      }
    });

  } catch (error) {
    console.error('Station/Branch Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station/branch analytics', details: error.message },
      { status: 500 }
    );
  }
}
