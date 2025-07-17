import { NextResponse } from 'next/server';
import supabase from '../../../utils/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract search parameters
    const biltyType = searchParams.get('biltyType') || 'all';
    const grNumber = searchParams.get('grNumber');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const consignorName = searchParams.get('consignorName');
    const consigneeName = searchParams.get('consigneeName');
    const transportName = searchParams.get('transportName');
    const paymentMode = searchParams.get('paymentMode');
    const eWayBill = searchParams.get('eWayBill');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const branchId = searchParams.get('branchId');
    const limit = parseInt(searchParams.get('limit')) || 100;

    const results = {
      regular: [],
      station: [],
      totalCount: 0
    };

    // Search regular bilties if requested
    if (biltyType === 'all' || biltyType === 'regular') {
      let query = supabase
        .from('bilty')
        .select(`
          *,
          from_city:cities!bilty_from_city_id_fkey(city_name),
          to_city:cities!bilty_to_city_id_fkey(city_name)
        `)
        .eq('is_active', true)
        .is('deleted_at', null);

      // Apply branch filter
      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      // Apply filters
      if (grNumber?.trim()) {
        query = query.ilike('gr_no', `%${grNumber.trim()}%`);
      }

      if (dateFrom && dateTo) {
        query = query
          .gte('bilty_date', dateFrom)
          .lte('bilty_date', dateTo);
      } else if (dateFrom) {
        query = query.gte('bilty_date', dateFrom);
      } else if (dateTo) {
        query = query.lte('bilty_date', dateTo);
      }

      if (consignorName?.trim()) {
        query = query.ilike('consignor_name', `%${consignorName.trim()}%`);
      }

      if (consigneeName?.trim()) {
        query = query.ilike('consignee_name', `%${consigneeName.trim()}%`);
      }

      if (transportName?.trim()) {
        query = query.ilike('transport_name', `%${transportName.trim()}%`);
      }

      if (paymentMode) {
        query = query.eq('payment_mode', paymentMode);
      }

      if (eWayBill?.trim()) {
        query = query.ilike('e_way_bill', `%${eWayBill.trim()}%`);
      }

      if (minAmount && !isNaN(minAmount)) {
        query = query.gte('total', parseFloat(minAmount));
      }

      if (maxAmount && !isNaN(maxAmount)) {
        query = query.lte('total', parseFloat(maxAmount));
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false }).limit(limit);

      const { data: regularData, error: regularError } = await query;

      if (regularError) {
        console.error('Error fetching regular bilties:', regularError);
        throw regularError;
      }

      results.regular = regularData?.map(bilty => ({
        ...bilty,
        type: 'regular',
        from_city_name: bilty.from_city?.city_name,
        to_city_name: bilty.to_city?.city_name
      })) || [];
    }

    // Search station bilties if requested
    if (biltyType === 'all' || biltyType === 'station') {
      let query = supabase
        .from('station_bilty_summary')
        .select('*');

      // Apply branch filter
      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      // Apply filters
      if (grNumber?.trim()) {
        query = query.ilike('gr_no', `%${grNumber.trim()}%`);
      }

      if (dateFrom && dateTo) {
        query = query
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo);
      } else if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      } else if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      if (consignorName?.trim()) {
        query = query.ilike('consignor', `%${consignorName.trim()}%`);
      }

      if (consigneeName?.trim()) {
        query = query.ilike('consignee', `%${consigneeName.trim()}%`);
      }

      if (eWayBill?.trim()) {
        query = query.ilike('e_way_bill', `%${eWayBill.trim()}%`);
      }

      if (minAmount && !isNaN(minAmount)) {
        query = query.gte('amount', parseFloat(minAmount));
      }

      if (maxAmount && !isNaN(maxAmount)) {
        query = query.lte('amount', parseFloat(maxAmount));
      }

      // Apply payment status filter (map payment_mode to payment_status)
      if (paymentMode) {
        query = query.eq('payment_status', paymentMode);
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false }).limit(limit);

      const { data: stationData, error: stationError } = await query;

      if (stationError) {
        console.error('Error fetching station bilties:', stationError);
        throw stationError;
      }

      results.station = stationData?.map(bilty => ({
        ...bilty,
        type: 'station'
      })) || [];
    }

    results.totalCount = results.regular.length + results.station.length;

    return NextResponse.json({
      success: true,
      data: results,
      message: `Found ${results.totalCount} bilties`
    });

  } catch (error) {
    console.error('Bilty search API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search bilties',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // For future implementation of bulk operations
    return NextResponse.json({
      success: true,
      message: 'Bulk operations not yet implemented'
    });

  } catch (error) {
    console.error('Bilty search POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        details: error.message
      },
      { status: 500 }
    );
  }
}
