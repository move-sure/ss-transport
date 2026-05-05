import { NextResponse } from 'next/server';
import supabase from '../../../utils/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const transport_gstin = searchParams.get('transport_gstin')?.trim();
    const transport_name  = searchParams.get('transport_name')?.trim();
    const from_date       = searchParams.get('from_date')?.trim();
    const to_date         = searchParams.get('to_date')?.trim();

    if (!transport_gstin && !transport_name) {
      return NextResponse.json({ status: 'error', message: 'transport_gstin or transport_name is required' }, { status: 400 });
    }
    if (!from_date || !to_date) {
      return NextResponse.json({ status: 'error', message: 'from_date and to_date are required (YYYY-MM-DD)' }, { status: 400 });
    }

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(from_date) || !dateRe.test(to_date)) {
      return NextResponse.json({ status: 'error', message: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    // ── 1. Fetch from bilty table ────────────────────────────────────────────
    let biltyQ = supabase
      .from('bilty')
      .select(`
        gr_no, bilty_date, transport_name, transport_gst,
        consignor_name, consignee_name,
        from_city_id, to_city_id,
        payment_mode, no_of_pkg, wt,
        freight_amount, pf_charge, dd_charge, labour_charge,
        bill_charge, toll_charge, other_charge, total,
        contain, pvt_marks, remark,
        from_city:cities!bilty_from_city_id_fkey(city_name),
        to_city:cities!bilty_to_city_id_fkey(city_name)
      `)
      .gte('bilty_date', from_date)
      .lte('bilty_date', to_date);

    if (transport_gstin) {
      biltyQ = biltyQ.eq('transport_gst', transport_gstin);
    } else {
      biltyQ = biltyQ.ilike('transport_name', `%${transport_name}%`);
    }

    // ── 2. Fetch from station_bilty_summary table ────────────────────────────
    let stationQ = supabase
      .from('station_bilty_summary')
      .select(`
        gr_no, bilty_date, transport_name, transport_gst,
        consignor_name, consignee_name,
        from_city_id, to_city_id,
        payment_mode, no_of_pkg, wt,
        freight_amount, pf_charge, dd_charge, labour_charge,
        bill_charge, toll_charge, other_charge, total,
        contain, pvt_marks, remark,
        from_city:cities!station_bilty_summary_from_city_id_fkey(city_name),
        to_city:cities!station_bilty_summary_to_city_id_fkey(city_name)
      `)
      .gte('created_at', from_date)
      .lte('created_at', to_date + 'T23:59:59');

    if (transport_gstin) {
      stationQ = stationQ.eq('transport_gst', transport_gstin);
    } else {
      stationQ = stationQ.ilike('transport_name', `%${transport_name}%`);
    }

    const [biltyRes, stationRes] = await Promise.all([biltyQ, stationQ]);

    if (biltyRes.error)   throw biltyRes.error;
    if (stationRes.error) throw stationRes.error;

    // ── 3. Deduplicate — bilty table wins ────────────────────────────────────
    const seenGrNos = new Set();
    const biltyRows   = (biltyRes.data   || []).map(r => ({ ...r, source: 'bilty' }));
    const stationRows = (stationRes.data || []).map(r => ({ ...r, source: 'station_bilty_summary' }));

    const combined = [];
    for (const row of biltyRows) {
      seenGrNos.add(String(row.gr_no));
      combined.push(row);
    }
    for (const row of stationRows) {
      if (!seenGrNos.has(String(row.gr_no))) {
        combined.push(row);
      }
    }

    if (combined.length === 0) {
      return NextResponse.json({
        status: 'success',
        from_date, to_date,
        transport_gstin: transport_gstin || null,
        transport_name: transport_name || null,
        sources: { bilty_table: biltyRows.length, station_bilty_summary: stationRows.length },
        total: 0,
        with_pohonch_count: 0,
        without_pohonch_count: 0,
        bilties: [],
      });
    }

    const allGrNos = combined.map(r => String(r.gr_no));

    // ── 4. Fetch kaat data ───────────────────────────────────────────────────
    const { data: kaatRows, error: kaatErr } = await supabase
      .from('bilty_wise_kaat')
      .select('gr_no, kaat, pf, dd, rate, pohonch_no, bilty_number')
      .in('gr_no', allGrNos);

    if (kaatErr) throw kaatErr;

    const kaatMap = {};
    (kaatRows || []).forEach(k => { kaatMap[String(k.gr_no)] = k; });

    // ── 5. Fetch pohonch data ────────────────────────────────────────────────
    // pohonch stores bilty GR numbers in bilty_metadata JSONB
    // We need pohonch rows that contain any of our GR numbers
    const { data: pohonchRows, error: pohonchErr } = await supabase
      .from('pohonch')
      .select('id, pohonch_number, bilty_metadata, challan_no');

    if (pohonchErr) throw pohonchErr;

    // Build gr_no → pohonch mapping
    const grToPohonch = {};
    (pohonchRows || []).forEach(p => {
      let biltyList = [];
      if (Array.isArray(p.bilty_metadata)) {
        biltyList = p.bilty_metadata;
      } else if (p.bilty_metadata && typeof p.bilty_metadata === 'object') {
        biltyList = Object.values(p.bilty_metadata);
      }

      biltyList.forEach(b => {
        const gr = String(b?.gr_no || b?.grNo || b || '').trim();
        if (gr && allGrNos.includes(gr)) {
          if (!grToPohonch[gr]) grToPohonch[gr] = [];
          grToPohonch[gr].push(p);
        }
      });
    });

    // ── 6. Fetch crossing challans for pohonch entries ───────────────────────
    const pohonchIds = [...new Set(Object.values(grToPohonch).flat().map(p => p.id))];
    let crossingMap = {}; // pohonch_id → challan numbers string

    if (pohonchIds.length > 0) {
      const { data: crossingRows, error: crossingErr } = await supabase
        .from('challan_details')
        .select('id, challan_no, pohonch_id')
        .in('pohonch_id', pohonchIds);

      if (!crossingErr && crossingRows) {
        crossingRows.forEach(c => {
          const pid = String(c.pohonch_id);
          if (!crossingMap[pid]) crossingMap[pid] = [];
          crossingMap[pid].push(c.challan_no);
        });
      }
    }

    // ── 7. Resolve transport name from first result ──────────────────────────
    const resolvedTransportName = combined[0]?.transport_name || transport_name || '';

    // ── 8. Assemble final bilties ────────────────────────────────────────────
    const withPohonch    = [];
    const withoutPohonch = [];

    for (const row of combined) {
      const gr = String(row.gr_no);
      const kaat = kaatMap[gr] || null;
      const pohonches = grToPohonch[gr] || [];
      const pohonchEntry = pohonches[0] || null;

      let crossing_challans = '';
      let has_crossing_challan = false;

      if (pohonchEntry) {
        const challans = crossingMap[String(pohonchEntry.id)] || [];
        crossing_challans = challans.join(' | ');
        has_crossing_challan = challans.length > 0;
      }

      const enriched = {
        source: row.source,
        gr_no: row.gr_no,
        bilty_date: row.bilty_date,
        transport_name: row.transport_name,
        transport_gst: row.transport_gst,
        consignor_name: row.consignor_name,
        consignee_name: row.consignee_name,
        from_city: row.from_city?.city_name || '',
        to_city: row.to_city?.city_name || '',
        payment_mode: row.payment_mode,
        no_of_pkg: row.no_of_pkg,
        wt: row.wt,
        freight_amount: row.freight_amount,
        pf_charge: row.pf_charge,
        dd_charge: row.dd_charge,
        labour_charge: row.labour_charge,
        bill_charge: row.bill_charge,
        toll_charge: row.toll_charge,
        other_charge: row.other_charge,
        total: row.total,
        contain: row.contain || '',
        pvt_marks: row.pvt_marks || '',
        remark: row.remark || '',
        pohonch_number: pohonchEntry?.pohonch_number || '',
        has_crossing_challan,
        crossing_challans,
        dest_pohonch_no: kaat?.pohonch_no || '',
        bilty_number: kaat?.bilty_number || null,
        kaat: kaat?.kaat ?? null,
        kaat_pf: kaat?.pf ?? null,
        kaat_dd: kaat?.dd ?? null,
        kaat_rate: kaat?.rate ?? null,
      };

      if (pohonchEntry) {
        withPohonch.push(enriched);
      } else {
        withoutPohonch.push(enriched);
      }
    }

    // Sort each group ascending by gr_no (numeric if possible)
    const grSort = (a, b) => {
      const na = Number(a.gr_no), nb = Number(b.gr_no);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a.gr_no).localeCompare(String(b.gr_no));
    };
    withPohonch.sort(grSort);
    withoutPohonch.sort(grSort);

    const bilties = [...withPohonch, ...withoutPohonch];

    return NextResponse.json({
      status: 'success',
      from_date,
      to_date,
      transport_gstin: transport_gstin || null,
      transport_name: resolvedTransportName,
      sources: {
        bilty_table: biltyRows.length,
        station_bilty_summary: stationRows.length,
      },
      total: bilties.length,
      with_pohonch_count: withPohonch.length,
      without_pohonch_count: withoutPohonch.length,
      bilties,
    });
  } catch (err) {
    console.error('[transport-report] error:', err);
    if (err?.code === '53300' || err?.message?.includes('too many connections')) {
      return NextResponse.json({ status: 'error', message: 'Server busy, please retry in a moment' }, { status: 503 });
    }
    return NextResponse.json({ status: 'error', message: err.message || 'Internal server error' }, { status: 500 });
  }
}
