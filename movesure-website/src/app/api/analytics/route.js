import { NextResponse } from 'next/server';
import supabase from '../../utils/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const branchId = searchParams.get('branchId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // No branch filtering - show overall analytics

    // Fetch analytics data in parallel
    const [
      biltyStatsResult,
      revenueStatsResult,
      topCustomersResult,
      paymentModeStatsResult,
      monthlyTrendResult,
      stationStatsResult,
      deliveryTypeStatsResult,
      staffPerformanceResult,
      // New queries for station_bilty_summary
      summaryStatsResult,
      summaryMonthlyTrendResult,
      summaryPaymentStatusResult,
      summaryDeliveryTypeResult,
      summaryTopConsignorsResult,
      summaryTopConsigneesResult,
      summaryStaffPerformanceResult
    ] = await Promise.all([
      // 1. Bilty Statistics
      supabase
        .from('bilty')
        .select('id, no_of_pkg, wt, total, bilty_date', { count: 'exact' })
        .eq('is_active', true)
        .is('deleted_at', null),

      // 2. Revenue Statistics
      supabase
        .from('bilty')
        .select('freight_amount, labour_charge, bill_charge, toll_charge, dd_charge, other_charge, pf_charge, total')
        .eq('is_active', true)
        .is('deleted_at', null),

      // 3. Top Customers (Consignors)
      supabase
        .from('bilty')
        .select('consignor_name, total')
        .eq('is_active', true)
        .is('deleted_at', null)
        .not('consignor_name', 'is', null),

      // 4. Payment Mode Distribution
      supabase
        .from('bilty')
        .select('payment_mode, total')
        .eq('is_active', true)
        .is('deleted_at', null)
        .not('payment_mode', 'is', null),

      // 5. Monthly Trend (Last 12 months)
      supabase
        .from('bilty')
        .select('bilty_date, total, no_of_pkg')
        .eq('is_active', true)
        .is('deleted_at', null)
        .gte('bilty_date', new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split('T')[0]),

      // 6. Station Statistics
      supabase
        .from('station_bilty_summary')
        .select('station, amount, payment_status, no_of_packets, weight'),

      // 7. Delivery Type Distribution
      supabase
        .from('bilty')
        .select('delivery_type, total')
        .eq('is_active', true)
        .is('deleted_at', null)
        .not('delivery_type', 'is', null),

      // 8. Staff Performance - Regular Bilty
      supabase
        .from('bilty')
        .select('staff_id, total, no_of_pkg, users!inner(id, name, username, post)')
        .eq('is_active', true)
        .is('deleted_at', null)
        .not('staff_id', 'is', null),

      // 9. Station Bilty Summary Statistics
      supabase
        .from('station_bilty_summary')
        .select('id, no_of_packets, weight, amount, created_at', { count: 'exact' }),

      // 10. Summary Monthly Trend (Last 12 months)
      supabase
        .from('station_bilty_summary')
        .select('created_at, amount, no_of_packets, weight')
        .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString()),

      // 11. Summary Payment Status Distribution
      supabase
        .from('station_bilty_summary')
        .select('payment_status, amount, no_of_packets'),

      // 12. Summary Delivery Type Distribution
      supabase
        .from('station_bilty_summary')
        .select('delivery_type, amount, no_of_packets')
        .not('delivery_type', 'is', null),

      // 13. Summary Top Consignors
      supabase
        .from('station_bilty_summary')
        .select('consignor, amount, no_of_packets')
        .not('consignor', 'is', null),

      // 14. Summary Top Consignees
      supabase
        .from('station_bilty_summary')
        .select('consignee, amount, no_of_packets')
        .not('consignee', 'is', null),

      // 15. Summary Staff Performance - Manual Bilty
      supabase
        .from('station_bilty_summary')
        .select('staff_id, amount, no_of_packets, weight, users!inner(id, name, username, post)')
        .not('staff_id', 'is', null)
    ]);

    // Process Bilty Statistics
    const biltyStats = {
      totalBilty: biltyStatsResult.count || 0,
      totalPackages: biltyStatsResult.data?.reduce((sum, b) => sum + (b.no_of_pkg || 0), 0) || 0,
      totalWeight: biltyStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.wt) || 0), 0) || 0,
      totalRevenue: biltyStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0) || 0,
    };

    // Process Revenue Breakdown
    const revenueBreakdown = {
      freight: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.freight_amount) || 0), 0) || 0,
      labour: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.labour_charge) || 0), 0) || 0,
      bill: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.bill_charge) || 0), 0) || 0,
      toll: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.toll_charge) || 0), 0) || 0,
      dd: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.dd_charge) || 0), 0) || 0,
      other: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.other_charge) || 0), 0) || 0,
      pf: revenueStatsResult.data?.reduce((sum, b) => sum + (parseFloat(b.pf_charge) || 0), 0) || 0,
    };

    // Process Top Customers
    const customerMap = {};
    topCustomersResult.data?.forEach(b => {
      const name = b.consignor_name?.trim() || 'Unknown';
      if (!customerMap[name]) {
        customerMap[name] = { name, totalRevenue: 0, count: 0 };
      }
      customerMap[name].totalRevenue += parseFloat(b.total) || 0;
      customerMap[name].count += 1;
    });
    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Process Payment Mode Distribution
    const paymentModeMap = {};
    paymentModeStatsResult.data?.forEach(b => {
      const mode = b.payment_mode?.toUpperCase() || 'UNKNOWN';
      if (!paymentModeMap[mode]) {
        paymentModeMap[mode] = { mode, total: 0, count: 0 };
      }
      paymentModeMap[mode].total += parseFloat(b.total) || 0;
      paymentModeMap[mode].count += 1;
    });
    const paymentModeStats = Object.values(paymentModeMap);

    // Process Monthly Trend
    const monthlyMap = {};
    monthlyTrendResult.data?.forEach(b => {
      const month = new Date(b.bilty_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, revenue: 0, biltyCount: 0, packages: 0 };
      }
      monthlyMap[month].revenue += parseFloat(b.total) || 0;
      monthlyMap[month].biltyCount += 1;
      monthlyMap[month].packages += b.no_of_pkg || 0;
    });
    const monthlyTrend = Object.values(monthlyMap).sort((a, b) => {
      return new Date(a.month) - new Date(b.month);
    });

    // Process Station Statistics
    const stationMap = {};
    stationStatsResult.data?.forEach(s => {
      const station = s.station?.trim() || 'Unknown';
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

    // Process Delivery Type Distribution
    const deliveryTypeMap = {};
    deliveryTypeStatsResult.data?.forEach(b => {
      const type = b.delivery_type?.toUpperCase() || 'UNKNOWN';
      if (!deliveryTypeMap[type]) {
        deliveryTypeMap[type] = { type, total: 0, count: 0 };
      }
      deliveryTypeMap[type].total += parseFloat(b.total) || 0;
      deliveryTypeMap[type].count += 1;
    });
    const deliveryTypeStats = Object.values(deliveryTypeMap);

    // Process Staff Performance (Regular Bilty)
    console.log('=== STAFF PERFORMANCE DEBUG ===');
    console.log('Regular Bilty Staff Query Error:', staffPerformanceResult.error);
    console.log('Regular Bilty Staff Count:', staffPerformanceResult.data?.length || 0);
    console.log('Sample Regular Staff Data:', staffPerformanceResult.data?.[0]);
    
    const staffMap = {};
    staffPerformanceResult.data?.forEach(b => {
      const staffId = b.staff_id;
      const staffName = b.users?.name || b.users?.username || 'Unknown';
      const staffPost = b.users?.post || 'N/A';
      
      console.log('Processing staff:', { staffId, staffName, staffPost });
      
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

    // Process Station Summary Statistics
    const summaryStats = {
      totalRecords: summaryStatsResult.count || 0,
      totalPackets: summaryStatsResult.data?.reduce((sum, s) => sum + (s.no_of_packets || 0), 0) || 0,
      totalWeight: summaryStatsResult.data?.reduce((sum, s) => sum + (parseFloat(s.weight) || 0), 0) || 0,
      totalAmount: summaryStatsResult.data?.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0,
    };

    // Process Summary Monthly Trend
    const summaryMonthlyMap = {};
    summaryMonthlyTrendResult.data?.forEach(s => {
      const month = new Date(s.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!summaryMonthlyMap[month]) {
        summaryMonthlyMap[month] = { month, amount: 0, recordCount: 0, packets: 0, weight: 0 };
      }
      summaryMonthlyMap[month].amount += parseFloat(s.amount) || 0;
      summaryMonthlyMap[month].recordCount += 1;
      summaryMonthlyMap[month].packets += s.no_of_packets || 0;
      summaryMonthlyMap[month].weight += parseFloat(s.weight) || 0;
    });
    const summaryMonthlyTrend = Object.values(summaryMonthlyMap).sort((a, b) => {
      return new Date(a.month) - new Date(b.month);
    });

    // Process Summary Payment Status
    const summaryPaymentMap = {};
    summaryPaymentStatusResult.data?.forEach(s => {
      const status = s.payment_status?.toUpperCase() || 'UNKNOWN';
      if (!summaryPaymentMap[status]) {
        summaryPaymentMap[status] = { status, amount: 0, count: 0, packets: 0 };
      }
      summaryPaymentMap[status].amount += parseFloat(s.amount) || 0;
      summaryPaymentMap[status].count += 1;
      summaryPaymentMap[status].packets += s.no_of_packets || 0;
    });
    const summaryPaymentStats = Object.values(summaryPaymentMap);

    // Process Summary Delivery Type
    const summaryDeliveryMap = {};
    summaryDeliveryTypeResult.data?.forEach(s => {
      const type = s.delivery_type?.toUpperCase() || 'UNKNOWN';
      if (!summaryDeliveryMap[type]) {
        summaryDeliveryMap[type] = { type, amount: 0, count: 0, packets: 0 };
      }
      summaryDeliveryMap[type].amount += parseFloat(s.amount) || 0;
      summaryDeliveryMap[type].count += 1;
      summaryDeliveryMap[type].packets += s.no_of_packets || 0;
    });
    const summaryDeliveryStats = Object.values(summaryDeliveryMap);

    // Process Summary Top Consignors
    const summaryConsignorMap = {};
    summaryTopConsignorsResult.data?.forEach(s => {
      const name = s.consignor?.trim() || 'Unknown';
      if (!summaryConsignorMap[name]) {
        summaryConsignorMap[name] = { name, amount: 0, count: 0, packets: 0 };
      }
      summaryConsignorMap[name].amount += parseFloat(s.amount) || 0;
      summaryConsignorMap[name].count += 1;
      summaryConsignorMap[name].packets += s.no_of_packets || 0;
    });
    const summaryTopConsignors = Object.values(summaryConsignorMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Process Summary Top Consignees
    const summaryConsigneeMap = {};
    summaryTopConsigneesResult.data?.forEach(s => {
      const name = s.consignee?.trim() || 'Unknown';
      if (!summaryConsigneeMap[name]) {
        summaryConsigneeMap[name] = { name, amount: 0, count: 0, packets: 0 };
      }
      summaryConsigneeMap[name].amount += parseFloat(s.amount) || 0;
      summaryConsigneeMap[name].count += 1;
      summaryConsigneeMap[name].packets += s.no_of_packets || 0;
    });
    const summaryTopConsignees = Object.values(summaryConsigneeMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Process Manual Bilty Staff Performance and merge with regular
    console.log('Manual Bilty Staff Query Error:', summaryStaffPerformanceResult.error);
    console.log('Manual Bilty Staff Count:', summaryStaffPerformanceResult.data?.length || 0);
    console.log('Sample Manual Staff Data:', summaryStaffPerformanceResult.data?.[0]);
    
    summaryStaffPerformanceResult.data?.forEach(s => {
      const staffId = s.staff_id;
      const staffName = s.users?.name || s.users?.username || 'Unknown';
      const staffPost = s.users?.post || 'N/A';
      
      console.log('Processing manual staff:', { staffId, staffName, staffPost });
      
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

    // Calculate totals and sort
    const staffPerformance = Object.values(staffMap).map(staff => ({
      ...staff,
      totalRevenue: staff.regularRevenue + staff.manualRevenue,
      totalCount: staff.regularCount + staff.manualCount,
      totalPackages: staff.regularPackages + staff.manualPackages
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    console.log('Final Staff Performance Count:', staffPerformance.length);
    console.log('Top 3 Staff:', staffPerformance.slice(0, 3));
    console.log('=== END STAFF PERFORMANCE DEBUG ===');

    // Station-wise bilty count
    const stationBiltyCount = {};
    stationStatsResult.data?.forEach(s => {
      const station = s.station?.trim() || 'Unknown';
      stationBiltyCount[station] = (stationBiltyCount[station] || 0) + 1;
    });

    // Branch-wise statistics
    const branchMap = {};
    
    // Process regular bilty by branch
    const { data: branchBiltyData } = await supabase
      .from('bilty')
      .select('branch_id, total, no_of_pkg, wt, branches!inner(id, name)')
      .eq('is_active', true)
      .is('deleted_at', null);

    branchBiltyData?.forEach(b => {
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

    // Process manual bilty by branch
    const { data: branchSummaryData } = await supabase
      .from('station_bilty_summary')
      .select('branch_id, amount, no_of_packets, weight, branches!inner(id, name)');

    branchSummaryData?.forEach(s => {
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

    // Return analytics data
    return NextResponse.json({
      success: true,
      data: {
        // Combined Bilty Data (Regular + Manual)
        biltyStats,
        revenueStats: revenueBreakdown,
        topCustomers,
        paymentModeStats,
        monthlyTrend,
        stationStats,
        deliveryTypeStats,
        staffPerformance,
        // Manual Bilty Specific Data
        summaryStats,
        summaryMonthlyTrend,
        summaryPaymentStats,
        summaryDeliveryStats,
        summaryTopConsignors,
        summaryTopConsignees,
        // Station bilty count
        stationBiltyCount,
        // Branch-wise stats
        branchStats
      }
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data', details: error.message },
      { status: 500 }
    );
  }
}
