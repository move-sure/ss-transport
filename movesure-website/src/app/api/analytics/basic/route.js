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

    // Fetch only basic statistics - fast queries
    const [
      biltyStatsResult,
      summaryStatsResult,
      revenueStatsResult
    ] = await Promise.all([
      // Bilty Statistics
      supabase
        .from('bilty')
        .select('id, no_of_pkg, wt, total', { count: 'exact' })
        .eq('is_active', true)
        .is('deleted_at', null),

      // Summary Statistics
      supabase
        .from('station_bilty_summary')
        .select('id, no_of_packets, weight, amount', { count: 'exact' }),

      // Revenue Breakdown
      supabase
        .from('bilty')
        .select('freight_amount, labour_charge, bill_charge, toll_charge, dd_charge, other_charge, pf_charge')
        .eq('is_active', true)
        .is('deleted_at', null)
    ]);

    const biltyStats = {
      totalBilty: biltyStatsResult.count || 0,
      totalPackages: biltyStatsResult.data?.reduce((sum, b) => sum + (b.no_of_pkg || 0), 0) || 0,
      totalWeight: biltyStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.wt) || 0), 0) || 0,
      totalRevenue: biltyStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0) || 0,
    };

    const summaryStats = {
      totalRecords: summaryStatsResult.count || 0,
      totalPackets: summaryStatsResult.data?.reduce((sum, s) => sum + (s.no_of_packets || 0), 0) || 0,
      totalWeight: summaryStatsResult.data?.reduce((sum, s) => sum + (parseFloat(s.weight) || 0), 0) || 0,
      totalAmount: summaryStatsResult.data?.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0,
    };

    const revenueStats = {
      freight: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.freight_amount) || 0), 0) || 0,
      labour: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.labour_charge) || 0), 0) || 0,
      bill: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.bill_charge) || 0), 0) || 0,
      toll: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.toll_charge) || 0), 0) || 0,
      dd: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.dd_charge) || 0), 0) || 0,
      other: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.other_charge) || 0), 0) || 0,
      pf: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.pf_charge) || 0), 0) || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        biltyStats,
        summaryStats,
        revenueStats
      }
    });

  } catch (error) {
    console.error('Basic Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch basic analytics', details: error.message },
      { status: 500 }
    );
  }
}
