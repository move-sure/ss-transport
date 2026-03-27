/**
 * Cross Challan Print Utilities
 * 
 * Fetches FRESH bilty data from bilty_wise_kaat + bilty + station_bilty_summary + cities
 * instead of relying on stale bilty_metadata stored in the pohonch record.
 * Also updates the pohonch metadata and totals to keep them in sync.
 */
import supabase from '../../../app/utils/supabase';

/**
 * Resolves destination name from multiple sources with priority:
 * 1) kaat destination_city_id → city name
 * 2) bilty to_city_id → city name
 * 3) station station code → city name
 * 4) saved destination from metadata
 * 5) fallback '-'
 */
function resolveDestination(kaat, bilty, station, cityNameMap, savedDest) {
  if (kaat?.destination_city_id && cityNameMap[kaat.destination_city_id]) return cityNameMap[kaat.destination_city_id];
  if (bilty?.to_city_id && cityNameMap[bilty.to_city_id]) return cityNameMap[bilty.to_city_id];
  if (station?.station && cityNameMap[`code_${station.station}`]) return cityNameMap[`code_${station.station}`];
  if (station?.station && station.station !== '-') return station.station;
  return savedDest || '-';
}

/**
 * Resolves destination city code (short code) for PDF
 */
function resolveDestinationCode(kaat, bilty, station, cityCodeMap, savedCode) {
  if (kaat?.destination_city_id && cityCodeMap[kaat.destination_city_id]) return cityCodeMap[kaat.destination_city_id];
  if (bilty?.to_city_id && cityCodeMap[bilty.to_city_id]) return cityCodeMap[bilty.to_city_id];
  if (station?.station) return station.station;
  return savedCode || null;
}

/**
 * Fetches fresh bilty data for a pohonch record from all source tables,
 * builds enriched bilty array for PDF generation, and updates the pohonch
 * record's bilty_metadata and totals to keep them in sync.
 * 
 * @param {string} pohonchNumber - The pohonch number to fetch data for
 * @returns {{ pohonch: Object, bilties: Array, transport: Object }}
 */
export async function fetchFreshCrossChallanData(pohonchNumber) {
  // 1. Fetch the pohonch record
  const { data: pohonch, error: pohonchErr } = await supabase
    .from('pohonch')
    .select('*')
    .eq('pohonch_number', pohonchNumber)
    .eq('is_active', true)
    .single();

  if (pohonchErr || !pohonch) {
    throw new Error('Crossing challan not found or has been deleted.');
  }

  const savedBilties = Array.isArray(pohonch.bilty_metadata) ? pohonch.bilty_metadata : [];
  if (savedBilties.length === 0) {
    throw new Error('No bilty data in this crossing challan.');
  }

  // 2. Get all GR numbers from saved metadata
  const grNos = savedBilties.map(b => b.gr_no).filter(Boolean);
  if (grNos.length === 0) {
    throw new Error('No valid GR numbers found in crossing challan.');
  }

  // 3. Fetch fresh data from all source tables in parallel
  const [kaatRes, biltyRes, stationRes, citiesRes] = await Promise.all([
    supabase.from('bilty_wise_kaat').select('*').in('gr_no', grNos),
    supabase.from('bilty').select(
      'id, gr_no, bilty_date, consignor_name, consignee_name, payment_mode, no_of_pkg, total, to_city_id, from_city_id, wt, e_way_bill, delivery_type'
    ).in('gr_no', grNos).eq('is_active', true),
    supabase.from('station_bilty_summary').select(
      'id, gr_no, station, consignor, consignee, no_of_packets, weight, payment_status, amount, e_way_bill, delivery_type, created_at'
    ).in('gr_no', grNos),
    supabase.from('cities').select('id, city_name, city_code'),
  ]);

  // Build lookup maps
  const kaatMap = {};
  (kaatRes.data || []).forEach(k => { kaatMap[k.gr_no] = k; });

  const biltyMap = {};
  (biltyRes.data || []).forEach(b => { biltyMap[b.gr_no] = b; });

  const stationMap = {};
  (stationRes.data || []).forEach(s => { stationMap[s.gr_no] = s; });

  const cityNameMap = {};
  const cityCodeMap = {};
  (citiesRes.data || []).forEach(c => {
    cityNameMap[c.id] = c.city_name;
    cityCodeMap[c.id] = c.city_code;
    if (c.city_code) cityNameMap[`code_${c.city_code}`] = c.city_name;
  });

  // 4. Build fresh bilty data for each GR (preserve order from saved metadata)
  let totalAmt = 0, totalKaat = 0, totalPF = 0, totalDD = 0, totalPkg = 0, totalWt = 0;

  const freshBilties = grNos.map(grNo => {
    const kaat = kaatMap[grNo];
    const bilty = biltyMap[grNo];
    const station = stationMap[grNo];
    const saved = savedBilties.find(b => b.gr_no === grNo) || {};

    // Fresh values from source tables, with fallback to saved metadata
    const weight = parseFloat(bilty?.wt || station?.weight || saved.weight || 0);
    const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || saved.packages || 0);
    const kaatAmt = parseFloat(kaat?.kaat ?? saved.kaat ?? 0);
    const pfAmt = parseFloat(kaat?.pf ?? saved.pf ?? 0);
    const ddChrg = parseFloat(kaat?.dd_chrg ?? saved.dd ?? 0);
    const payMode = (bilty?.payment_mode || station?.payment_status || saved.payment_mode || '').toUpperCase();
    const isPaid = payMode.includes('PAID');
    const amt = isPaid ? 0 : parseFloat(bilty?.total || station?.amount || saved.amount || 0);

    // Destination resolution
    const destName = resolveDestination(kaat, bilty, station, cityNameMap, saved.destination);
    const destCode = resolveDestinationCode(kaat, bilty, station, cityCodeMap, saved.destination_code) || destName;

    // Pohonch/Bilty number from fresh kaat
    const pohonchBilty = kaat?.pohonch_no && kaat?.bilty_number
      ? `${kaat.pohonch_no}/${kaat.bilty_number}`
      : kaat?.pohonch_no || kaat?.bilty_number || saved.pohonch_bilty || '-';

    const ewb = bilty?.e_way_bill || station?.e_way_bill || saved.e_way_bill || '';
    const deliveryType = bilty?.delivery_type || station?.delivery_type || saved.delivery_type || '';
    const challanNo = kaat?.challan_no || saved.challan_no || '';
    const consignor = bilty?.consignor_name || station?.consignor || saved.consignor || '-';
    const consignee = bilty?.consignee_name || station?.consignee || saved.consignee || '-';
    const date = bilty?.bilty_date || station?.created_at || saved.date || null;
    const kaatRate = parseFloat(kaat?.actual_kaat_rate ?? saved.kaat_rate ?? 0);

    totalAmt += amt;
    totalKaat += kaatAmt;
    totalPF += pfAmt;
    totalDD += ddChrg;
    totalPkg += packages;
    totalWt += weight;

    return {
      gr_no: grNo,
      challan_no: challanNo,
      pohonch_bilty: pohonchBilty,
      consignor,
      consignee,
      destination: destName,
      destination_code: destCode,
      packages,
      weight,
      amount: amt,
      kaat: kaatAmt,
      kaat_rate: kaatRate,
      dd: ddChrg,
      pf: pfAmt,
      payment_mode: payMode,
      is_paid: isPaid,
      date,
      e_way_bill: ewb,
      delivery_type: deliveryType,
    };
  });

  // 5. Build updated metadata for the pohonch record
  const challanNos = [...new Set(freshBilties.map(b => b.challan_no).filter(Boolean))];
  const biltyMeta = freshBilties.map(b => ({
    gr_no: b.gr_no,
    challan_no: b.challan_no,
    pohonch_bilty: b.pohonch_bilty,
    consignor: b.consignor,
    consignee: b.consignee,
    destination: b.destination,
    destination_code: b.destination_code,
    packages: b.packages,
    weight: b.weight,
    amount: b.amount,
    kaat: b.kaat,
    kaat_rate: b.kaat_rate,
    dd: b.dd,
    pf: b.pf,
    payment_mode: b.payment_mode,
    is_paid: b.is_paid,
    date: b.date,
    e_way_bill: b.e_way_bill,
    delivery_type: b.delivery_type,
  }));

  // 6. Update pohonch record with fresh data (fire and forget — non-blocking)
  supabase
    .from('pohonch')
    .update({
      bilty_metadata: biltyMeta,
      challan_metadata: challanNos,
      total_bilties: freshBilties.length,
      total_amount: parseFloat(totalAmt.toFixed(2)),
      total_kaat: parseFloat(totalKaat.toFixed(2)),
      total_pf: parseFloat(totalPF.toFixed(2)),
      total_dd: parseFloat(totalDD.toFixed(2)),
      total_packages: parseFloat(totalPkg.toFixed(2)),
      total_weight: parseFloat(totalWt.toFixed(2)),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pohonch.id)
    .then(({ error }) => {
      if (error) console.error('Failed to update pohonch metadata:', error);
    });

  // 7. Return fresh data + updated pohonch record for caller
  const updatedPohonch = {
    ...pohonch,
    bilty_metadata: biltyMeta,
    challan_metadata: challanNos,
    total_bilties: freshBilties.length,
    total_amount: parseFloat(totalAmt.toFixed(2)),
    total_kaat: parseFloat(totalKaat.toFixed(2)),
    total_pf: parseFloat(totalPF.toFixed(2)),
    total_dd: parseFloat(totalDD.toFixed(2)),
    total_packages: parseFloat(totalPkg.toFixed(2)),
    total_weight: parseFloat(totalWt.toFixed(2)),
  };

  const transport = {
    transport_name: pohonch.transport_name,
    gst_number: pohonch.transport_gstin,
  };

  return { pohonch: updatedPohonch, bilties: freshBilties, transport };
}
