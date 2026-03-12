'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Truck, CheckCircle, AlertTriangle, XCircle, Edit3, Filter, RefreshCw, Eye, Download, Play, Square, Loader2, Zap, AlertCircle } from 'lucide-react';
import TransporterUpdateModal from './transporter-update-modal';
import EWBDetailsModal from './ewb-details-modal';
import supabase from '../../app/utils/supabase';
import { useAuth } from '../../app/utils/auth';
import { formatEwbNumber } from '../../utils/ewbValidation';
import { getTransporterUpdatesByEwbNumbers, getConsolidatedEwbByIncludedNumbers, saveTransporterUpdate } from '../../utils/ewbValidationStorage';

const DEFAULT_USER_GSTIN = '09COVPS5556J1ZT';

// Resolve transporter for a transit's destination city
async function resolveTransporterForTransit(transit) {
  let targetCityId = null;
  let cityName = null;

  // 1) Use enriched toCity from challan-data-fetcher
  if (transit.toCity) {
    targetCityId = transit.toCity.id;
    cityName = transit.toCity.city_name;
  }
  // 2) Fallback: station.station (could be a city code like "LKO")
  else if (transit.station?.station) {
    const stationValue = transit.station.station.trim();
    const match = stationValue.match(/^([^()]+?)(?:\(([^()]+)\))?$/);
    const part1 = match?.[1]?.trim() || stationValue;
    const part2 = match?.[2]?.trim() || null;
    const code = part2 || part1;
    cityName = part1;

    // Cascading lookup
    let rows;
    ({ data: rows } = await supabase.from('cities').select('id, city_name, city_code').eq('city_code', code).limit(1));
    if (!rows?.length) ({ data: rows } = await supabase.from('cities').select('id, city_name, city_code').ilike('city_code', code).limit(1));
    if (!rows?.length) ({ data: rows } = await supabase.from('cities').select('id, city_name, city_code').ilike('city_name', part1).limit(1));
    if (!rows?.length) ({ data: rows } = await supabase.from('cities').select('id, city_name, city_code').ilike('city_name', `%${part1}%`).limit(1));
    if (rows?.[0]) {
      targetCityId = rows[0].id;
      cityName = rows[0].city_name;
    }
  }
  // 3) Fallback: bilty.to_location
  else if (transit.bilty?.to_location) {
    const loc = transit.bilty.to_location.trim();
    const match = loc.match(/^([^()]+?)(?:\(([^()]+)\))?$/);
    const name = match?.[1]?.trim() || loc;
    const code = match?.[2]?.trim() || null;

    let rows;
    if (code) ({ data: rows } = await supabase.from('cities').select('id, city_name, city_code').eq('city_code', code).limit(1));
    if (!rows?.length) ({ data: rows } = await supabase.from('cities').select('id, city_name, city_code').ilike('city_name', name).limit(1));
    if (!rows?.length) ({ data: rows } = await supabase.from('cities').select('id, city_name, city_code').ilike('city_name', `%${name}%`).limit(1));
    if (rows?.[0]) {
      targetCityId = rows[0].id;
      cityName = rows[0].city_name;
    }
  }

  if (!targetCityId) {
    return { error: `City not found for ${cityName || 'unknown destination'}` };
  }

  // Fetch first transporter with a valid GSTIN for this city
  const { data: transportRows, error: transportError } = await supabase
    .from('transports')
    .select('id, transport_name, gst_number, city_name, mob_number')
    .eq('city_id', targetCityId)
    .not('transport_name', 'is', null)
    .not('gst_number', 'is', null)
    .order('transport_name', { ascending: true })
    .limit(1);

  if (transportError) return { error: transportError.message };
  const t = transportRows?.[0];
  if (!t) return { error: `No transporter with GSTIN found for ${cityName}` };

  return {
    transporter_id: t.gst_number.toUpperCase(),
    transporter_name: t.transport_name,
    city: cityName
  };
}

// Call the transporter-update API (2 calls: update, then PDF)
async function callTransporterUpdateAPI(ewbNumber, transporterId, transporterName) {
  const payload = {
    user_gstin: DEFAULT_USER_GSTIN,
    eway_bill_number: ewbNumber.replace(/-/g, ''),
    transporter_id: transporterId,
    transporter_name: transporterName
  };

  // First call — actual update
  const res1 = await fetch('https://movesure-backend.onrender.com/api/transporter-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data1 = await res1.json();

  // API-level errors: 422 (NIC rules), 400 (missing fields), 503 (auth), 408 (timeout)
  if (data1.status === 'error') {
    const code = data1.error_code ? `[${data1.error_code}] ` : '';
    const msg = data1.message || data1.error_description || 'Failed to update transporter';
    throw new Error(`${code}${msg}`);
  }

  // Legacy NIC error format via results
  if (data1.results?.status === 'No Content' || data1.results?.code >= 400) {
    const errData = data1.error?.results || data1.results || data1;
    throw new Error(errData.message || data1.message || 'Failed to update transporter');
  }

  const ok1 = (data1.status === 'success' || data1.results?.status === 'Success') &&
    (data1.status_code === 200 || data1.results?.code === 200);
  if (!ok1) throw new Error(data1.message || 'Update failed: unexpected response');

  // Second call — get PDF (may return 204/empty if EWB was already Part-B entered)
  let data2 = null;
  try {
    const res2 = await fetch('https://movesure-backend.onrender.com/api/transporter-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text2 = await res2.text();
    if (text2.trim()) {
      data2 = JSON.parse(text2);
    }
  } catch (e) {
    // Second call failed or returned empty — that's fine, we already have data1
    console.warn('Second transporter-update call failed (non-critical):', e.message);
  }

  const ok2 = data2 &&
    (data2.status === 'success' || data2.results?.status === 'Success') &&
    (data2.status_code === 200 || data2.results?.code === 200);
  const finalData = ok2 ? data2 : data1;

  let pdfUrl = finalData.results?.message?.url || finalData.pdfUrl ||
    data2?.results?.message?.url || data2?.pdfUrl ||
    data1.results?.message?.url || data1.pdfUrl;
  if (pdfUrl && !pdfUrl.startsWith('http')) pdfUrl = `https://${pdfUrl}`;

  return {
    success: true,
    ewbNumber: finalData.results?.message?.ewayBillNo || data1.results?.message?.ewayBillNo || ewbNumber,
    transporterId: finalData.results?.message?.transporterId || data1.results?.message?.transporterId || transporterId,
    transporterName,
    updateDate: finalData.results?.message?.transUpdateDate || data1.results?.message?.transUpdateDate,
    pdfUrl: pdfUrl || null,
    rawResponse: finalData
  };
}


export default function TransporterSection({ transitDetails, challanDetails }) {
  const { user: currentUser } = useAuth();
  const [transporterUpdatesMap, setTransporterUpdatesMap] = useState({});
  const [consolidatedEwbMap, setConsolidatedEwbMap] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransit, setSelectedTransit] = useState(null);
  const [selectedDetailsTransit, setSelectedDetailsTransit] = useState(null);
  const [hideKanpur, setHideKanpur] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Bulk update state ──
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentGr: '', currentEwb: '' });
  const [bulkResults, setBulkResults] = useState({}); // ewb → { success, pdfUrl, error }
  const bulkCancelRef = useRef(false);

  // ── Fix self-transfer state ──
  const [fixRunning, setFixRunning] = useState(false);
  const [fixProgress, setFixProgress] = useState({ current: 0, total: 0, currentGr: '', currentEwb: '' });
  const [fixResults, setFixResults] = useState({}); // ewb → { success, pdfUrl, error, transporter }
  const fixCancelRef = useRef(false);

  // Per-EWB PDF map (DB updates + bulk results merged)
  const ewbPdfMap = useMemo(() => {
    const map = {};
    Object.entries(transporterUpdatesMap).forEach(([ewb, update]) => {
      if (update?.is_success || update?.update_result?.success || update?.raw_result_metadata?.success) {
        const url = update.pdf_url ||
          update.raw_result_metadata?.pdfUrl ||
          update.raw_result_metadata?.rawResponse?.results?.message?.url ||
          update.update_result?.pdfUrl;
        // Always key by clean 12-digit
        const cleanEwb = ewb.replace(/[-\s]/g, '');
        if (url) map[cleanEwb] = url;
      }
    });
    Object.entries(bulkResults).forEach(([ewb, r]) => {
      const cleanEwb = ewb.replace(/[-\s]/g, '');
      if (r.success && r.pdfUrl) map[cleanEwb] = r.pdfUrl;
    });
    return map;
  }, [transporterUpdatesMap, bulkResults]);

  // Get all EWB numbers
  const allEwbNumbers = useMemo(() => {
    if (!transitDetails) return [];
    const ewbNumbers = [];
    transitDetails.forEach(transit => {
      if (transit.bilty?.e_way_bill) {
        const biltyEWBs = transit.bilty.e_way_bill.split(',').filter(e => e.trim());
        ewbNumbers.push(...biltyEWBs.map(e => e.trim()));
      }
      if (transit.station?.e_way_bill) {
        const stationEWBs = transit.station.e_way_bill.split(',').filter(e => e.trim());
        ewbNumbers.push(...stationEWBs.map(e => e.trim()));
      }
    });
    return [...new Set(ewbNumbers)];
  }, [transitDetails]);

  // Filter transit with EWBs only
  const transitWithEwb = useMemo(() => {
    if (!transitDetails) return [];
    return transitDetails.filter(t => {
      const biltyEWBs = t.bilty?.e_way_bill ? t.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
      const stationEWBs = t.station?.e_way_bill ? t.station.e_way_bill.split(',').filter(e => e.trim()) : [];
      return biltyEWBs.length > 0 || stationEWBs.length > 0;
    });
  }, [transitDetails]);

  const isKanpurDestination = (transit) => {
    const cityName = transit.toCity?.city_name?.toLowerCase() ||
      transit.station?.station?.toLowerCase() ||
      transit.bilty?.to_location?.toLowerCase() || '';
    return cityName.includes('kanpur');
  };

  const filteredTransit = useMemo(() => {
    if (hideKanpur) {
      return transitWithEwb.filter(t => !isKanpurDestination(t));
    }
    return transitWithEwb;
  }, [transitWithEwb, hideKanpur]);

  const fetchUpdates = useCallback(async () => {
    if (allEwbNumbers.length === 0) return;
    setLoading(true);
    try {
      const [transporterResult, consolidatedResult] = await Promise.all([
        getTransporterUpdatesByEwbNumbers(allEwbNumbers),
        getConsolidatedEwbByIncludedNumbers(allEwbNumbers)
      ]);
      if (transporterResult.success) setTransporterUpdatesMap(transporterResult.data);
      if (consolidatedResult.success) setConsolidatedEwbMap(consolidatedResult.data);
    } catch (error) {
      console.error('Error fetching transporter updates:', error);
    }
    setLoading(false);
  }, [allEwbNumbers]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const getTransitEwbs = (transit) => {
    const biltyEWBs = transit.bilty?.e_way_bill ? transit.bilty.e_way_bill.split(',').filter(e => e.trim()).map(e => e.trim()) : [];
    const stationEWBs = transit.station?.e_way_bill ? transit.station.e_way_bill.split(',').filter(e => e.trim()).map(e => e.trim()) : [];
    return [...biltyEWBs, ...stationEWBs];
  };

  const hasConsolidatedEwb = (transit) => {
    const ewbs = getTransitEwbs(transit);
    return ewbs.some(ewb => {
      const consolidated = consolidatedEwbMap[ewb];
      return consolidated?.is_valid === true;
    });
  };

  const isEwbUpdated = useCallback((ewb) => {
    const key = ewb.replace(/[-\s]/g, '');
    const update = transporterUpdatesMap[key] || transporterUpdatesMap[ewb];
    const bulkR = bulkResults[key] || bulkResults[ewb];
    return (update?.is_success === true ||
      update?.update_result?.success === true ||
      update?.raw_result_metadata?.success === true ||
      bulkR?.success === true);
  }, [transporterUpdatesMap, bulkResults]);

  // Check if an EWB was updated but with SS Transport's own GSTIN (self-transfer = wrong)
  const isSelfTransferred = useCallback((ewb, isKanpur) => {
    if (isKanpur) return false; // Kanpur doesn't need update — not a problem
    const key = ewb.replace(/[-\s]/g, '');
    // Check DB record
    const dbUpdate = transporterUpdatesMap[key] || transporterUpdatesMap[ewb];
    if (dbUpdate?.is_success === true) {
      const tid = (dbUpdate.transporter_id || '').replace(/-/g, '').toUpperCase();
      if (tid === DEFAULT_USER_GSTIN) return true;
    }
    // Check live bulk result
    const bulkR = bulkResults[key] || bulkResults[ewb];
    if (bulkR?.success && bulkR.data?.transporterId) {
      const tid = (bulkR.data.transporterId || '').replace(/-/g, '').toUpperCase();
      if (tid === DEFAULT_USER_GSTIN) return true;
    }
    return false;
  }, [transporterUpdatesMap, bulkResults]);

  const hasSelfTransferIssue = useCallback((transit) => {
    if (isKanpurDestination(transit)) return false;
    return getTransitEwbs(transit).some(ewb => isSelfTransferred(ewb, false));
  }, [isSelfTransferred, transporterUpdatesMap, bulkResults]);

  const hasSuccessfulUpdate = (transit) => {
    if (isKanpurDestination(transit)) return null;
    const ewbs = getTransitEwbs(transit);
    return ewbs.some(ewb => isEwbUpdated(ewb));
  };

  const handleUpdateClick = (transit) => {
    setSelectedTransit(transit);
    setShowModal(true);
  };

  const handleViewDetails = (transit) => {
    setSelectedDetailsTransit(transit);
    setShowDetailsModal(true);
  };

  const handleUpdateSuccess = (ewbNumber, updateResult) => {
    if (ewbNumber && updateResult) {
      setTransporterUpdatesMap(prev => ({
        ...prev,
        [ewbNumber]: {
          ...prev[ewbNumber],
          is_success: true,
          update_result: updateResult,
          raw_result_metadata: updateResult,
          pdf_url: updateResult?.pdfUrl || null
        }
      }));
    }
  };

  // ════════════════ BULK UPDATE ALL ════════════════
  const handleBulkUpdateAll = useCallback(async () => {
    bulkCancelRef.current = false;
    setBulkRunning(true);
    setBulkResults({});

    // Collect all pending non-Kanpur EWBs
    const pendingItems = [];
    for (const transit of filteredTransit) {
      if (isKanpurDestination(transit)) continue;
      for (const ewb of getTransitEwbs(transit)) {
        if (!isEwbUpdated(ewb)) {
          pendingItems.push({ transit, ewb });
        }
      }
    }

    if (pendingItems.length === 0) {
      setBulkRunning(false);
      return;
    }

    setBulkProgress({ current: 0, total: pendingItems.length, currentGr: '', currentEwb: '' });

    // Cache resolved transporter per transit so we only look it up once
    const transporterCache = {};

    for (let i = 0; i < pendingItems.length; i++) {
      if (bulkCancelRef.current) break;

      const { transit, ewb } = pendingItems[i];
      const grNo = transit.gr_no || 'N/A';

      setBulkProgress({ current: i + 1, total: pendingItems.length, currentGr: grNo, currentEwb: formatEwbNumber(ewb) });

      try {
        // Resolve transporter (cache per transit.id)
        if (!transporterCache[transit.id]) {
          transporterCache[transit.id] = await resolveTransporterForTransit(transit);
        }
        const info = transporterCache[transit.id];

        if (info.error) {
          setBulkResults(prev => ({ ...prev, [ewb]: { success: false, error: info.error } }));
          continue;
        }

        // Call API (2 calls: update + PDF)
        const result = await callTransporterUpdateAPI(ewb, info.transporter_id, info.transporter_name);

        setBulkResults(prev => ({ ...prev, [ewb]: { success: true, pdfUrl: result.pdfUrl, data: result } }));

        // Update local state for instant green highlight
        setTransporterUpdatesMap(prev => ({
          ...prev,
          [ewb]: { ...prev[ewb], is_success: true, update_result: result, raw_result_metadata: result, pdf_url: result.pdfUrl }
        }));

        // Save to DB in background
        if (currentUser?.id) {
          saveTransporterUpdate({
            challanNo: challanDetails?.challan_no || null,
            grNo,
            ewbNumber: formatEwbNumber(ewb),
            transporterId: info.transporter_id,
            transporterName: info.transporter_name,
            userGstin: DEFAULT_USER_GSTIN,
            updateResult: result,
            userId: currentUser.id
          }).catch(err => console.error('DB save error:', err));
        }

        // Throttle between calls
        await new Promise(r => setTimeout(r, 1500));

      } catch (err) {
        console.error(`❌ Bulk update failed for EWB ${ewb}:`, err);
        setBulkResults(prev => ({ ...prev, [ewb]: { success: false, error: err.message || 'Update failed' } }));

        if (currentUser?.id) {
          saveTransporterUpdate({
            challanNo: challanDetails?.challan_no || null,
            grNo,
            ewbNumber: formatEwbNumber(ewb),
            transporterId: '',
            transporterName: '',
            userGstin: DEFAULT_USER_GSTIN,
            updateResult: { success: false, error: err.message },
            userId: currentUser.id
          }).catch(e => console.error('DB save error:', e));
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setBulkRunning(false);
  }, [filteredTransit, isEwbUpdated, currentUser, challanDetails]);

  const handleBulkCancel = () => { bulkCancelRef.current = true; };

  // ════════════════ FIX SELF-TRANSFERS ════════════════
  const handleFixSelfTransfers = useCallback(async () => {
    fixCancelRef.current = false;
    setFixRunning(true);
    setFixResults({});

    // Collect all self-transferred EWBs from non-Kanpur transits
    const items = [];
    for (const transit of filteredTransit) {
      if (isKanpurDestination(transit)) continue;
      for (const ewb of getTransitEwbs(transit)) {
        if (isSelfTransferred(ewb, false)) {
          items.push({ transit, ewb });
        }
      }
    }

    if (items.length === 0) { setFixRunning(false); return; }

    setFixProgress({ current: 0, total: items.length, currentGr: '', currentEwb: '' });

    const transporterCache = {};

    for (let i = 0; i < items.length; i++) {
      if (fixCancelRef.current) break;

      const { transit, ewb } = items[i];
      const grNo = transit.gr_no || 'N/A';

      setFixProgress({ current: i + 1, total: items.length, currentGr: grNo, currentEwb: formatEwbNumber(ewb) });

      try {
        if (!transporterCache[transit.id]) {
          transporterCache[transit.id] = await resolveTransporterForTransit(transit);
        }
        const info = transporterCache[transit.id];

        if (info.error) {
          setFixResults(prev => ({ ...prev, [ewb]: { success: false, error: info.error } }));
          continue;
        }

        // Verify it's actually a different transporter, not self GSTIN again
        if ((info.transporter_id || '').replace(/-/g, '').toUpperCase() === DEFAULT_USER_GSTIN) {
          setFixResults(prev => ({ ...prev, [ewb]: { success: false, error: `No other transporter found for ${info.city || 'destination'}` } }));
          continue;
        }

        const result = await callTransporterUpdateAPI(ewb, info.transporter_id, info.transporter_name);

        setFixResults(prev => ({ ...prev, [ewb]: { success: true, pdfUrl: result.pdfUrl, data: result, transporter: info.transporter_name } }));

        // Update local state — this clears the self-transfer flag
        setTransporterUpdatesMap(prev => ({
          ...prev,
          [ewb.replace(/[-\s]/g, '')]: {
            ...prev[ewb.replace(/[-\s]/g, '')],
            is_success: true,
            transporter_id: info.transporter_id,
            transporter_name: info.transporter_name,
            update_result: result,
            raw_result_metadata: result,
            pdf_url: result.pdfUrl
          }
        }));

        if (currentUser?.id) {
          saveTransporterUpdate({
            challanNo: challanDetails?.challan_no || null,
            grNo,
            ewbNumber: formatEwbNumber(ewb),
            transporterId: info.transporter_id,
            transporterName: info.transporter_name,
            userGstin: DEFAULT_USER_GSTIN,
            updateResult: result,
            userId: currentUser.id
          }).catch(err => console.error('DB save error:', err));
        }

        await new Promise(r => setTimeout(r, 1500));

      } catch (err) {
        console.error(`❌ Fix self-transfer failed for EWB ${ewb}:`, err);
        setFixResults(prev => ({ ...prev, [ewb]: { success: false, error: err.message || 'Update failed' } }));
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setFixRunning(false);
    // Refresh from DB to get latest state
    fetchUpdates();
  }, [filteredTransit, isSelfTransferred, currentUser, challanDetails, fetchUpdates]);

  const handleFixSelfCancel = () => { fixCancelRef.current = true; };

  // ── Counts ──
  const updatedCount = useMemo(() => filteredTransit.filter(t => hasSuccessfulUpdate(t) === true).length, [filteredTransit, transporterUpdatesMap, bulkResults]);
  const pendingCount = useMemo(() => filteredTransit.filter(t => hasSuccessfulUpdate(t) === false).length, [filteredTransit, transporterUpdatesMap, bulkResults]);
  const notRequiredCount = useMemo(() => transitWithEwb.filter(t => isKanpurDestination(t)).length, [transitWithEwb]);
  const consolidatedCount = useMemo(() => transitWithEwb.filter(t => isKanpurDestination(t) && hasConsolidatedEwb(t)).length, [transitWithEwb, consolidatedEwbMap]);

  // Total pending EWBs (not transits)
  const pendingEwbCount = useMemo(() => {
    let count = 0;
    for (const transit of filteredTransit) {
      if (isKanpurDestination(transit)) continue;
      for (const ewb of getTransitEwbs(transit)) {
        if (!isEwbUpdated(ewb)) count++;
      }
    }
    return count;
  }, [filteredTransit, isEwbUpdated]);

  const bulkSuccessCount = useMemo(() => Object.values(bulkResults).filter(r => r.success).length, [bulkResults]);
  const bulkFailCount = useMemo(() => Object.values(bulkResults).filter(r => !r.success).length, [bulkResults]);

  const fixSuccessCount = useMemo(() => Object.values(fixResults).filter(r => r.success).length, [fixResults]);
  const fixFailCount = useMemo(() => Object.values(fixResults).filter(r => !r.success).length, [fixResults]);

  // Count self-transferred EWBs (not transits) for the fix button label
  const selfTransferEwbCount = useMemo(() => {
    let count = 0;
    for (const transit of filteredTransit) {
      if (isKanpurDestination(transit)) continue;
      for (const ewb of getTransitEwbs(transit)) {
        if (isSelfTransferred(ewb, false)) count++;
      }
    }
    return count;
  }, [filteredTransit, isSelfTransferred]);

  // Count transits with self-transfer issue (updated but with own GSTIN, non-Kanpur)
  const selfTransferCount = useMemo(() => filteredTransit.filter(t => hasSelfTransferIssue(t)).length, [filteredTransit, hasSelfTransferIssue]);

  if (!transitDetails || transitDetails.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No transit details found.</p>
      </div>
    );
  }

  if (transitWithEwb.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Truck className="w-12 h-12 text-orange-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No E-Way Bills Found</h3>
        <p className="text-gray-600">This challan doesn&apos;t have any E-Way Bills to update transporter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Truck className="w-6 h-6 text-green-600" />
              PART B - Update Transporter
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Update transporter ID on E-Way Bills for this challan
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUpdates}
              disabled={loading || bulkRunning}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{updatedCount}</p>
                <p className="text-xs text-green-600/70">Updated</p>
              </div>
              <div className="text-center px-4 py-2 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                <p className="text-xs text-orange-600/70">Pending</p>
              </div>
              {notRequiredCount > 0 && (
                <div className="text-center px-4 py-2 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{notRequiredCount}</p>
                  <p className="text-xs text-purple-600/70">Not Required</p>
                </div>
              )}
              {selfTransferCount > 0 && (
                <div className="text-center px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{selfTransferCount}</p>
                  <p className="text-xs text-orange-600/70">Self Transferred</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ BULK UPDATE CARD ═══════════ */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-5 text-white">
        {!bulkRunning ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Auto Update All Transporters
              </h3>
              <p className="text-sm text-blue-100 mt-1">
                {pendingEwbCount > 0
                  ? `${pendingEwbCount} E-Way Bill(s) pending across ${pendingCount} GR(s). Click to update all automatically.`
                  : 'All transporters are up to date! ✅'}
              </p>
              {Object.keys(bulkResults).length > 0 && (
                <p className="text-xs text-blue-200 mt-1">
                  Last run: {bulkSuccessCount} success, {bulkFailCount} failed
                </p>
              )}
            </div>
            <button
              onClick={handleBulkUpdateAll}
              disabled={pendingEwbCount === 0}
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md text-sm"
            >
              <Play className="w-5 h-5" />
              Update All ({pendingEwbCount})
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating Transporters...
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  Processing GR <span className="font-mono font-bold">{bulkProgress.currentGr}</span> — EWB <span className="font-mono font-bold">{bulkProgress.currentEwb}</span>
                </p>
              </div>
              <button
                onClick={handleBulkCancel}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-all text-sm"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-blue-200">
              <span>{bulkProgress.current} / {bulkProgress.total} EWBs</span>
              <span>
                ✅ {bulkSuccessCount} success
                {bulkFailCount > 0 && <span className="text-red-300 ml-2">❌ {bulkFailCount} failed</span>}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ══════ FIX SELF-TRANSFERS CARD (only when there are self-transfer issues) ══════ */}
      {(selfTransferCount > 0 || fixRunning || Object.keys(fixResults).length > 0) && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg p-5 text-white">
          {!fixRunning ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Fix Self-Transferred EWBs
                </h3>
                <p className="text-sm text-amber-100 mt-1">
                  {selfTransferEwbCount > 0
                    ? `${selfTransferEwbCount} EWB(s) across ${selfTransferCount} GR(s) transferred to own GSTIN. Click to re-assign to correct transporters.`
                    : 'All self-transfer issues resolved! ✅'}
                </p>
                {Object.keys(fixResults).length > 0 && (
                  <p className="text-xs text-amber-200 mt-1">
                    Last run: {fixSuccessCount} fixed, {fixFailCount} failed
                  </p>
                )}
              </div>
              <button
                onClick={handleFixSelfTransfers}
                disabled={selfTransferEwbCount === 0}
                className="flex items-center gap-2 px-6 py-3 bg-white text-amber-700 font-bold rounded-xl hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md text-sm flex-shrink-0"
              >
                <Zap className="w-5 h-5" />
                Fix All ({selfTransferEwbCount})
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Fixing Self-Transfers...
                  </h3>
                  <p className="text-sm text-amber-100 mt-1">
                    GR <span className="font-mono font-bold">{fixProgress.currentGr}</span> — EWB <span className="font-mono font-bold">{fixProgress.currentEwb}</span>
                  </p>
                </div>
                <button
                  onClick={handleFixSelfCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 font-medium rounded-xl transition-all text-sm"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${fixProgress.total > 0 ? (fixProgress.current / fixProgress.total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-amber-200">
                <span>{fixProgress.current} / {fixProgress.total} EWBs</span>
                <span>
                  ✅ {fixSuccessCount} fixed
                  {fixFailCount > 0 && <span className="text-red-200 ml-2">❌ {fixFailCount} failed</span>}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fix Self-Transfer Errors */}
      {!fixRunning && fixFailCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-4 h-4" />
            {fixFailCount} EWB(s) could not be fixed
          </h4>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {Object.entries(fixResults).filter(([, r]) => !r.success).map(([ewb, r]) => (
              <div key={ewb} className="text-xs text-amber-700 flex items-start gap-2">
                <span className="font-mono font-medium">{formatEwbNumber(ewb)}</span>
                <span className="text-amber-500">— {r.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Errors Summary */}
      {!bulkRunning && bulkFailCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-red-800 flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-4 h-4" />
            {bulkFailCount} EWB(s) failed to update
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {Object.entries(bulkResults).filter(([, r]) => !r.success).map(([ewb, r]) => (
              <div key={ewb} className="text-xs text-red-700 flex items-start gap-2">
                <span className="font-mono font-medium">{formatEwbNumber(ewb)}</span>
                <span className="text-red-500">— {r.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Showing {filteredTransit.length} of {transitWithEwb.length} entries with E-Way Bills
          </span>
          <button
            onClick={() => setHideKanpur(!hideKanpur)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              hideKanpur
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            {hideKanpur ? 'Show Kanpur' : 'Hide Kanpur'}
          </button>
        </div>
      </div>

      {/* Transit List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">GR No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">E-Way Bills</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransit.map((transit) => {
                const ewbs = getTransitEwbs(transit);
                const updateStatus = hasSuccessfulUpdate(transit);
                const isKanpur = isKanpurDestination(transit);
                const hasConsolidated = isKanpur && hasConsolidatedEwb(transit);
                const isCurrentlyProcessing = bulkRunning && bulkProgress.currentGr === transit.gr_no;
                const hasSelfTransfer = hasSelfTransferIssue(transit);

                return (
                  <tr
                    key={transit.id}
                    className={`transition-colors ${
                      isCurrentlyProcessing
                        ? 'bg-blue-50/60 border-l-2 border-blue-400'
                        : updateStatus === true || hasConsolidated
                          ? 'bg-green-50/50 border-l-2 border-green-400'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{transit.gr_no}</span>
                        {isCurrentlyProcessing && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        )}
                        {!isCurrentlyProcessing && updateStatus === true && (
                          <span className="flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle className="w-3 h-3" />
                            UPDATED
                          </span>
                        )}
                        {hasConsolidated && (
                          <span className="flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle className="w-3 h-3" />
                            CONSOLIDATED
                          </span>
                        )}
                        {hasSelfTransfer && (
                          <span className="flex items-center gap-1 text-amber-600 text-xs font-medium border border-amber-300 bg-amber-50 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            Self Transfer
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {ewbs.map((ewb, idx) => {
                          const updated = isEwbUpdated(ewb);
                          const cleanEwb = ewb.replace(/[-\s]/g, '');
                          const pdfUrl = ewbPdfMap[cleanEwb];
                          const bulkError = (bulkResults[cleanEwb] || bulkResults[ewb])?.success === false
                            ? (bulkResults[cleanEwb] || bulkResults[ewb]).error : null;
                          const selfXfer = isSelfTransferred(ewb, isKanpur);

                          return (
                            <div key={idx} className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                              <span
                                className={`text-xs font-mono px-2 py-1 rounded ${
                                  selfXfer
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : updated
                                      ? 'bg-green-100 text-green-800 border border-green-200'
                                      : bulkError
                                        ? 'bg-red-100 text-red-700 border border-red-200'
                                        : 'bg-gray-100 text-gray-700'
                                }`}
                                title={selfXfer ? 'Self-transferred: updated with own GSTIN' : bulkError || ''}
                              >
                                {selfXfer && <AlertCircle className="w-3 h-3 inline mr-1 text-amber-500" />}
                                {!selfXfer && updated && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                {bulkError && <XCircle className="w-3 h-3 inline mr-1" />}
                                {formatEwbNumber(ewb)}
                              </span>
                              {pdfUrl && (
                                <a
                                  href={pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center w-7 h-7 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                              </div>
                              {selfXfer && (
                                <span className="text-[9px] text-amber-500 px-1">Self GSTIN</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${isKanpur ? 'text-purple-700 font-medium' : 'text-gray-700'}`}>
                        {transit.toCity?.city_name || transit.station?.station || transit.bilty?.to_location || 'N/A'}
                        {isKanpur && <span className="text-xs text-purple-500 ml-1">(No update needed)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isKanpur ? (
                        hasConsolidated ? (
                          <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Consolidated
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-purple-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Not Required
                          </span>
                        )
                      ) : hasSelfTransfer ? (
                        <span className="flex items-center gap-1.5 text-amber-600 text-sm">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Self Transfer
                        </span>
                      ) : updateStatus === true ? (
                        <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Updated
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-orange-600 text-sm">
                          <XCircle className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleViewDetails(transit)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                          Details
                        </button>
                        {!isKanpur && (
                          <button
                            onClick={() => handleUpdateClick(transit)}
                            disabled={bulkRunning}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                              updateStatus === true
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                          >
                            <Edit3 className="w-4 h-4" />
                            {updateStatus === true ? 'Update Again' : 'Update'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <TransporterUpdateModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          fetchUpdates();
        }}
        onUpdateSuccess={handleUpdateSuccess}
        grData={selectedTransit}
        ewbNumbers={selectedTransit ? getTransitEwbs(selectedTransit) : []}
      />

      {/* EWB Details Modal */}
      <EWBDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedDetailsTransit(null);
        }}
        grData={selectedDetailsTransit}
      />
    </div>
  );
}
