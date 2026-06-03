'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import supabase from '../../../app/utils/supabase';
import { kTotal, getHubRateForTransport } from '../HubHelpers';
import { generatePohonchPDF } from '../../transit-finance/pohonch-print/pohonch-pdf-generator';

const API_URL = 'https://api.movesure.io';

export function useTripData(trip_id, user, token) {
  /* ── trip meta ── */
  const [trip, setTrip]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  /* ── bilties ── */
  const [enrichedBilties, setEnrichedBilties] = useState([]);
  const [cities, setCities]                   = useState([]);
  const [updatingTransit, setUpdatingTransit] = useState({});

  /* ── kaat ── */
  const [kaatData, setKaatData]   = useState({});
  const [editingKaat, setEditingKaat] = useState(null);
  const [kaatForm, setKaatForm]   = useState({});
  const [savingKaat, setSavingKaat] = useState(false);

  /* ── bulk select ── */
  const [selectedGrs, setSelectedGrs]       = useState(new Set());
  const [bulkLoading, setBulkLoading]       = useState(null);
  const [showBulkPohonch, setShowBulkPohonch] = useState(false);
  const [bulkPohonchNo, setBulkPohonchNo]   = useState('');
  const [savingBulkPohonch, setSavingBulkPohonch] = useState(false);

  /* ── image / pod ── */
  const [previewImage, setPreviewImage] = useState(null);
  const [podGrNos, setPodGrNos]         = useState(new Set());

  /* ── transport ── */
  const [transports, setTransports]             = useState([]);
  const [transportsByCity, setTransportsByCity] = useState({});
  const [savingTransport, setSavingTransport]   = useState({});
  const [autoAssigning, setAutoAssigning]       = useState(false);

  /* ── hub rates ── */
  const [hubRates, setHubRates]                     = useState([]);
  const [hubRatesByTransport, setHubRatesByTransport] = useState({});
  const [applyingHubRates, setApplyingHubRates]     = useState(false);

  /* ── add transport / hub rate modals ── */
  const [showAddTransport, setShowAddTransport]   = useState(false);
  const [addTransportForm, setAddTransportForm]   = useState({ transport_name: '', city_id: '', city_name: '', address: '', gst_number: '', mob_number: '', branch_owner_name: '', website: '' });
  const [savingNewTransport, setSavingNewTransport] = useState(false);
  const [showAddHubRate, setShowAddHubRate]       = useState(false);
  const [addHubRateForm, setAddHubRateForm]       = useState({ transport_id: '', transport_name: '', destination_city_id: '', destination_city_name: '', goods_type: '', pricing_mode: 'per_kg', rate_per_kg: 0, rate_per_pkg: 0, min_charge: 0, bilty_chrg: 0, ewb_chrg: 0, labour_chrg: 0, other_chrg: 0 });
  const [savingNewHubRate, setSavingNewHubRate]   = useState(false);

  /* ── cross challan ── */
  const [crossChallanMap, setCrossChallanMap] = useState({});
  const [ccPdfUrl, setCcPdfUrl]               = useState(null);
  const [ccPdfTransport, setCcPdfTransport]   = useState(null);
  const [ccGenerating, setCcGenerating]       = useState(false);
  const [ccPdfBilties, setCcPdfBilties]       = useState([]);
  const [ccSaving, setCcSaving]               = useState(false);
  const [ccSavedPohonch, setCcSavedPohonch]   = useState(null);
  const [showBulkCrossModal, setShowBulkCrossModal] = useState(false);

  /* ── kanpur ── */
  const [kanpurFilter, setKanpurFilter]   = useState(false);
  const [kanpurGrNos, setKanpurGrNos]     = useState(new Set());
  const [loadingKanpur, setLoadingKanpur] = useState(false);

  /* ── search/filter (lifted so table can pass to header search etc.) ── */
  const [grSearch, setGrSearch]                 = useState('');
  const [citySearch, setCitySearch]             = useState('');
  const [transportSearch, setTransportSearch]   = useState('');

  /* ========================================================
     MAIN FETCH — only depends on trip_id to avoid looping.
     All sub-logic is inlined so nothing changes on re-render.
  ======================================================== */
  const fetchAll = useCallback(async () => {
    if (!trip_id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Trip meta from Python backend
      const tripRes  = await fetch(`${API_URL}/api/truck-trips/${trip_id}`);
      const tripJson = await tripRes.json();
      if (tripJson.status !== 'success') throw new Error(tripJson.message || 'Trip not found');
      const tripData  = tripJson.data;
      setTrip(tripData);

      const challanNos = (tripData.challans || []).map(c => c.challan_no).filter(Boolean);
      if (!challanNos.length) { setEnrichedBilties([]); setLoading(false); return; }

      // 2. Reference data
      const [brRes, ciRes, trRes, hrRes] = await Promise.all([
        supabase.from('branches').select('id, branch_name').eq('is_active', true),
        supabase.from('cities').select('id, city_name, city_code').order('city_name'),
        supabase.from('transports').select('id, transport_name, city_id, city_name, mob_number, gst_number, is_prior').order('is_prior', { ascending: false, nullsFirst: false }).order('transport_name'),
        supabase.from('transport_hub_rates').select('*').eq('is_active', true),
      ]);

      const bMap = {};
      (brRes.data || []).forEach(b => { bMap[b.id] = b.branch_name; });

      // Use local variable — never read from cities state here to avoid dependency
      const cList = ciRes.data || [];
      setCities(cList);

      const allTransports = trRes.data || [];
      setTransports(allTransports);
      const tByCityMap = {};
      allTransports.forEach(t => {
        if (t.city_id) {
          if (!tByCityMap[t.city_id]) tByCityMap[t.city_id] = [];
          tByCityMap[t.city_id].push(t);
        }
      });
      setTransportsByCity(tByCityMap);

      const allHubRates = hrRes.data || [];
      setHubRates(allHubRates);
      const hrMap = {};
      allHubRates.forEach(hr => {
        if (hr.transport_id) {
          if (!hrMap[hr.transport_id]) hrMap[hr.transport_id] = {};
          if (!hrMap[hr.transport_id][hr.destination_city_id]) hrMap[hr.transport_id][hr.destination_city_id] = [];
          hrMap[hr.transport_id][hr.destination_city_id].push(hr);
        }
      });
      setHubRatesByTransport(hrMap);

      // 3. Transit details for ALL challans at once
      const { data: tData, error: tErr } = await supabase
        .from('transit_details')
        .select(`
          id, challan_no, gr_no, bilty_id, challan_book_id, from_branch_id, to_branch_id,
          is_out_of_delivery_from_branch1, out_of_delivery_from_branch1_date,
          is_delivered_at_branch2, delivered_at_branch2_date,
          is_out_of_delivery_from_branch2, out_of_delivery_from_branch2_date,
          is_delivered_at_destination, delivered_at_destination_date,
          out_for_door_delivery, out_for_door_delivery_date,
          delivery_agent_name, delivery_agent_phone, vehicle_number, remarks, created_at
        `)
        .in('challan_no', challanNos)
        .order('created_at', { ascending: true });

      if (tErr) throw tErr;
      const ts = tData || [];
      if (!ts.length) { setEnrichedBilties([]); setLoading(false); return; }

      const grNos = ts.map(t => t.gr_no).filter(Boolean);

      // 4. Bilty + station_bilty_summary
      const [rRes, sRes] = await Promise.all([
        grNos.length ? supabase.from('bilty').select(`
          id, gr_no, bilty_date, consignor_name, consignee_name, payment_mode,
          no_of_pkg, total, to_city_id, wt, rate, freight_amount, contain,
          e_way_bill, pvt_marks, consignor_number, consignee_number, consignor_gst,
          transport_name, delivery_type, invoice_no, invoice_value,
          labour_charge, bill_charge, toll_charge, dd_charge, other_charge, remark, bilty_image
        `).in('gr_no', grNos).eq('is_active', true) : Promise.resolve({ data: [] }),
        grNos.length ? supabase.from('station_bilty_summary').select(`
          id, station, gr_no, consignor, consignee, contents, no_of_packets,
          weight, payment_status, amount, pvt_marks, e_way_bill, delivery_type,
          created_at, w_name, transport_name, transport_gst, bilty_image
        `).in('gr_no', grNos) : Promise.resolve({ data: [] }),
      ]);

      const rMap = new Map(); (rRes.data || []).forEach(b => rMap.set(b.gr_no, b));
      const sMap = new Map(); (sRes.data || []).forEach(b => sMap.set(b.gr_no, b));
      const cityMap = new Map();
      cList.forEach(c => { cityMap.set(c.id, c); if (c.city_code) cityMap.set(`code_${c.city_code}`, c); });

      // 5. Merge
      const merged = ts.map((t, i) => {
        const r = rMap.get(t.gr_no);
        const s = sMap.get(t.gr_no);
        const fb = bMap[t.from_branch_id] || '-';
        const tb = bMap[t.to_branch_id]   || '-';
        if (r) {
          const c = cityMap.get(r.to_city_id);
          return { ...t, idx: i + 1, source: 'bilty', from_branch_name: fb, to_branch_name: tb,
            consignor: r.consignor_name || '-', consignee: r.consignee_name || '-',
            destination: c?.city_name || '-', destination_code: c?.city_code || '', to_city_id: r.to_city_id,
            packets: r.no_of_pkg || 0, weight: r.wt || 0, amount: r.total || 0,
            payment: r.payment_mode || '-', delivery_type: r.delivery_type || '-',
            contain: r.contain || '-', e_way_bill: r.e_way_bill || '', pvt_marks: r.pvt_marks || '',
            bilty_date: r.bilty_date, consignor_number: r.consignor_number || '',
            consignee_number: r.consignee_number || '', transport_name: r.transport_name || '',
            consignor_gst: r.consignor_gst || '', freight_amount: r.freight_amount || 0,
            labour_charge: r.labour_charge || 0, remark: r.remark || t.remarks || '', bilty_image: r.bilty_image || null };
        } else if (s) {
          const c = cityMap.get(`code_${s.station}`);
          return { ...t, idx: i + 1, source: 'station_bilty_summary', from_branch_name: fb, to_branch_name: tb,
            consignor: s.consignor || '-', consignee: s.consignee || '-',
            destination: c?.city_name || s.station || '-', destination_code: s.station || '', to_city_id: c?.id || null,
            packets: s.no_of_packets || 0, weight: s.weight || 0, amount: s.amount || 0,
            payment: s.payment_status || '-', delivery_type: s.delivery_type || '-',
            contain: s.contents || '-', e_way_bill: s.e_way_bill || '', pvt_marks: s.pvt_marks || '',
            bilty_date: s.created_at, consignor_number: '', consignee_number: '',
            transport_name: s.transport_name || '', freight_amount: s.amount || 0,
            labour_charge: 0, remark: t.remarks || '', w_name: s.w_name || '', bilty_image: s.bilty_image || null };
        }
        return { ...t, idx: i + 1, source: 'unknown', from_branch_name: fb, to_branch_name: tb,
          consignor: '-', consignee: '-', destination: '-', destination_code: '', to_city_id: null,
          packets: 0, weight: 0, amount: 0, payment: '-', delivery_type: '-', contain: '-',
          e_way_bill: '', pvt_marks: '', bilty_date: null, consignor_number: '', consignee_number: '',
          transport_name: '', freight_amount: 0, labour_charge: 0, remark: '', bilty_image: null };
      });

      setEnrichedBilties(merged);

      // 6. Side-data (inline, no external callback deps)
      if (grNos.length) {
        // Kanpur (use local cList, not cities state)
        setLoadingKanpur(true);
        const kSet = new Set();
        const kCities = cList.filter(c => c.city_name?.toLowerCase().includes('kanpur'));
        const kCodes = kCities.map(c => c.city_code);
        const kIds   = kCities.map(c => c.id);
        await Promise.all([
          kCodes.length ? supabase.from('station_bilty_summary').select('gr_no').in('gr_no', grNos).in('station', kCodes).then(({ data }) => (data || []).forEach(s => kSet.add(s.gr_no))) : Promise.resolve(),
          kIds.length   ? supabase.from('bilty').select('gr_no').in('gr_no', grNos).in('to_city_id', kIds).eq('is_active', true).then(({ data }) => (data || []).forEach(b => kSet.add(b.gr_no))) : Promise.resolve(),
        ]);
        setKanpurGrNos(kSet);
        setLoadingKanpur(false);

        // Kaat
        supabase.from('bilty_wise_kaat').select('*').in('gr_no', grNos).then(({ data }) => {
          if (data) { const m = {}; data.forEach(k => { m[k.gr_no] = k; }); setKaatData(m); }
        });

        // Cross challan map
        supabase.from('pohonch').select('pohonch_number, bilty_metadata').eq('is_active', true).then(({ data }) => {
          if (data) {
            const ccMap = {};
            data.forEach(p => {
              (Array.isArray(p.bilty_metadata) ? p.bilty_metadata : []).forEach(b => {
                if (b.gr_no && grNos.includes(b.gr_no)) ccMap[b.gr_no] = p.pohonch_number;
              });
            });
            setCrossChallanMap(ccMap);
          }
        });

        // POD gr_nos
        supabase.from('pod_details').select('gr_no').in('gr_no', grNos).then(({ data }) => {
          if (data) setPodGrNos(new Set(data.map(d => d.gr_no)));
        });
      }
    } catch (err) {
      console.error('[TripDetail] fetchAll error:', err);
      setError(err.message || 'Failed to load trip details.');
    } finally {
      setLoading(false);
    }
  }, [trip_id]); // ← ONLY trip_id — no external callbacks → no loop

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── refreshCrossMap (stable — no state deps that loop) ── */
  const refreshCrossMap = useCallback(async (grNos) => {
    if (!grNos?.length) return;
    const { data } = await supabase.from('pohonch').select('pohonch_number, bilty_metadata').eq('is_active', true);
    if (data) {
      const ccMap = {};
      data.forEach(p => {
        (Array.isArray(p.bilty_metadata) ? p.bilty_metadata : []).forEach(b => {
          if (b.gr_no && grNos.includes(b.gr_no)) ccMap[b.gr_no] = p.pohonch_number;
        });
      });
      setCrossChallanMap(ccMap);
    }
  }, []);

  /* ========== TRANSIT STATUS ========== */
  const updateTransitStatus = useCallback(async (transitId, field, dateField) => {
    if (!user?.id) return;
    const key = `${transitId}-${field}`;
    try {
      setUpdatingTransit(p => ({ ...p, [key]: true }));
      const now = new Date().toISOString();
      const { error: e } = await supabase.from('transit_details').update({ [field]: true, [dateField]: now, updated_by: user.id }).eq('id', transitId);
      if (e) throw e;
      setEnrichedBilties(p => p.map(b => b.id === transitId ? { ...b, [field]: true, [dateField]: now } : b));
    } catch (e) { console.error(e); alert('Failed to update.'); }
    finally { setUpdatingTransit(p => ({ ...p, [key]: false })); }
  }, [user?.id]);

  const handleDeliveredAtBranch2 = useCallback((t) => {
    if (t.is_delivered_at_branch2) return;
    if (!confirm(`Mark GR ${t.gr_no} as "Delivered"?`)) return;
    updateTransitStatus(t.id, 'is_delivered_at_branch2', 'delivered_at_branch2_date');
  }, [updateTransitStatus]);

  const handleOutFromBranch2 = useCallback((t) => {
    if (t.is_out_of_delivery_from_branch2) return;
    if (!confirm(`Mark GR ${t.gr_no} as "Out for Delivery"?`)) return;
    updateTransitStatus(t.id, 'is_out_of_delivery_from_branch2', 'out_of_delivery_from_branch2_date');
  }, [updateTransitStatus]);

  const handleDeliveredAtDestination = useCallback(async (t) => {
    if (t.is_delivered_at_destination || !user?.id) return;
    if (!confirm(`Mark GR ${t.gr_no} as "Delivered at Destination"?`)) return;
    const key = `${t.id}-is_delivered_at_destination`;
    try {
      setUpdatingTransit(p => ({ ...p, [key]: true }));
      const now = new Date().toISOString();
      const upd = { is_delivered_at_destination: true, delivered_at_destination_date: now, updated_by: user.id };
      if (!t.is_out_of_delivery_from_branch1) { upd.is_out_of_delivery_from_branch1 = true; upd.out_of_delivery_from_branch1_date = now; }
      if (!t.is_delivered_at_branch2)         { upd.is_delivered_at_branch2 = true;         upd.delivered_at_branch2_date = now; }
      if (!t.is_out_of_delivery_from_branch2) { upd.is_out_of_delivery_from_branch2 = true; upd.out_of_delivery_from_branch2_date = now; }
      const { error: e } = await supabase.from('transit_details').update(upd).eq('id', t.id);
      if (e) throw e;
      setEnrichedBilties(p => p.map(b => b.id === t.id ? { ...b, ...upd } : b));
    } catch (e) { console.error(e); alert('Failed.'); }
    finally { setUpdatingTransit(p => ({ ...p, [key]: false })); }
  }, [user?.id]);

  /* ========== BULK ACTIONS ========== */
  const toggleSelect = useCallback((id) => setSelectedGrs(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);

  const bulkAction = useCallback(async (type, displayedList) => {
    if (!selectedGrs.size || !user?.id) return;
    const selected = displayedList.filter(b => selectedGrs.has(b.id));
    const labels = { branch: 'Delivered at Branch', out: 'Out for Delivery', delivered: 'Delivered at Destination' };
    if (!confirm(`Mark ${selected.length} bilties as "${labels[type]}"?`)) return;
    setBulkLoading(type);
    const now = new Date().toISOString();
    try {
      const { error: rpcError } = await supabase.rpc('bulk_update_transit_status', { p_transit_ids: selected.map(b => b.id), p_action: type, p_user_id: user.id });
      if (rpcError) throw rpcError;
      const upd = { updated_by: user.id };
      if (type === 'branch' || type === 'out' || type === 'delivered') { upd.is_out_of_delivery_from_branch1 = true; upd.out_of_delivery_from_branch1_date = now; upd.is_delivered_at_branch2 = true; upd.delivered_at_branch2_date = now; }
      if (type === 'out' || type === 'delivered') { upd.is_out_of_delivery_from_branch2 = true; upd.out_of_delivery_from_branch2_date = now; }
      if (type === 'delivered') { upd.is_delivered_at_destination = true; upd.delivered_at_destination_date = now; }
      const idSet = new Set(selected.map(b => b.id));
      setEnrichedBilties(p => p.map(x => idSet.has(x.id) ? { ...x, ...upd } : x));
      setSelectedGrs(new Set());
    } catch (e) { console.error(e); alert('Bulk action failed.'); }
    finally { setBulkLoading(null); }
  }, [selectedGrs, user?.id]);

  const bulkAssignPohonch = useCallback(async () => {
    if (!selectedGrs.size || !user?.id || !bulkPohonchNo.trim()) return;
    const selected = enrichedBilties.filter(b => selectedGrs.has(b.id));
    setSavingBulkPohonch(true);
    try {
      const now = new Date().toISOString();
      const payloads = selected.map(b => {
        const ex = kaatData[b.gr_no];
        return { gr_no: b.gr_no, challan_no: b.challan_no, destination_city_id: b.to_city_id || null, pohonch_no: bulkPohonchNo.trim(), bilty_number: ex?.bilty_number || null, kaat: ex?.kaat || 0, pf: ex?.pf || 0, actual_kaat_rate: ex?.actual_kaat_rate || 0, dd_chrg: ex?.dd_chrg || 0, bilty_chrg: ex?.bilty_chrg || 0, ewb_chrg: ex?.ewb_chrg || 0, labour_chrg: ex?.labour_chrg || 0, other_chrg: ex?.other_chrg || 0, transport_id: ex?.transport_id || null, transport_hub_rate_id: ex?.transport_hub_rate_id || null, rate_type: ex?.rate_type || null, rate_per_kg: ex?.rate_per_kg || 0, rate_per_pkg: ex?.rate_per_pkg || 0, updated_by: user.id, updated_at: now, ...(ex ? {} : { created_by: user.id }) };
      });
      const { data, error } = await supabase.from('bilty_wise_kaat').upsert(payloads, { onConflict: 'gr_no' }).select();
      if (error) throw error;
      const nk = { ...kaatData }; (data || []).forEach(k => { nk[k.gr_no] = k; }); setKaatData(nk);
      setShowBulkPohonch(false); setBulkPohonchNo(''); setSelectedGrs(new Set());
      const grNos = enrichedBilties.map(b => b.gr_no).filter(Boolean);
      if (grNos.length) refreshCrossMap(grNos);
      alert(`Pohonch "${bulkPohonchNo.trim()}" assigned to ${selected.length} GRs!`);
    } catch (e) { console.error(e); alert('Failed.'); }
    finally { setSavingBulkPohonch(false); }
  }, [selectedGrs, user?.id, bulkPohonchNo, enrichedBilties, kaatData, refreshCrossMap]);

  /* ========== CROSS CHALLAN ========== */
  const buildCcPdfBilties = useCallback((sel) => sel.map(b => {
    const kd = kaatData[b.gr_no] || {};
    const isPaid = (b.payment || '').toUpperCase().includes('PAID') && !(b.payment || '').toUpperCase().includes('TO');
    return { gr_no: b.gr_no, challan_no: b.challan_no, pohonch_bilty: kd.pohonch_no && kd.bilty_number ? `${kd.pohonch_no}/${kd.bilty_number}` : kd.pohonch_no || kd.bilty_number || '-', pohonch_no: kd.pohonch_no || '', bilty_number: kd.bilty_number || '', consignor: b.consignor || '-', consignee: b.consignee || '-', destination: b.destination || '-', destination_code: b.destination_code || b.destination || '-', packages: parseFloat(b.packets) || 0, weight: parseFloat(b.weight) || 0, amount: isPaid ? 0 : (parseFloat(b.amount) || 0), kaat: parseFloat(kd.kaat) || 0, kaat_rate: parseFloat(kd.actual_kaat_rate) || 0, dd: parseFloat(kd.dd_chrg) || 0, pf: parseFloat(kd.pf) || 0, payment_mode: b.payment || '-', delivery_type: b.delivery_type || '', is_paid: isPaid, date: b.bilty_date || null, e_way_bill: b.e_way_bill || '' };
  }), [kaatData]);

  const handlePrintCrossChallan = useCallback(async () => {
    if (!selectedGrs.size) return;
    setCcGenerating(true);
    try {
      const sel = enrichedBilties.filter(b => selectedGrs.has(b.id));
      let transport = null;
      for (const b of sel) {
        const kd = kaatData[b.gr_no];
        if (kd?.transport_id) {
          const cl = b.to_city_id ? (transportsByCity[b.to_city_id] || []) : [];
          transport = cl.find(tr => String(tr.id) === String(kd.transport_id)) || transports.find(tr => String(tr.id) === String(kd.transport_id));
          if (transport) break;
        }
      }
      const pdfBilties = buildCcPdfBilties(sel);
      const url = generatePohonchPDF(pdfBilties, transport, true);
      if (url) { setCcPdfUrl(url); setCcPdfTransport(transport); setCcPdfBilties(pdfBilties); setCcSavedPohonch(null); }
    } catch (err) { console.error(err); alert('Failed to generate cross challan.'); }
    finally { setCcGenerating(false); }
  }, [selectedGrs, enrichedBilties, kaatData, transportsByCity, transports, buildCcPdfBilties]);

  const closeCcPreview = useCallback(() => { if (ccPdfUrl) URL.revokeObjectURL(ccPdfUrl); setCcPdfUrl(null); setCcPdfTransport(null); setCcPdfBilties([]); setCcSavedPohonch(null); }, [ccPdfUrl]);

  /* ========== KAAT ========== */
  const openKaatModal = useCallback((grNo) => {
    const k = kaatData[grNo] || {};
    setKaatForm({ pohonch_no: k.pohonch_no || '', bilty_number: k.bilty_number || '', kaat: k.kaat || 0, pf: k.pf || 0, actual_kaat_rate: k.actual_kaat_rate || 0, dd_chrg: k.dd_chrg || 0, bilty_chrg: k.bilty_chrg || 0, ewb_chrg: k.ewb_chrg || 0, labour_chrg: k.labour_chrg || 0, other_chrg: k.other_chrg || 0, transport_id: k.transport_id || '' });
    setEditingKaat(grNo);
  }, [kaatData]);

  const saveKaatForm = useCallback(async () => {
    if (!editingKaat || !user?.id) return;
    setSavingKaat(true);
    try {
      const bi = enrichedBilties.find(b => b.gr_no === editingKaat);
      const hubRate = kaatForm.transport_id && bi?.to_city_id ? getHubRateForTransport(hubRatesByTransport, kaatForm.transport_id, bi.to_city_id) : null;
      const payload = { gr_no: editingKaat, challan_no: bi?.challan_no, destination_city_id: bi?.to_city_id || null, pohonch_no: kaatForm.pohonch_no || null, bilty_number: kaatForm.bilty_number || null, kaat: parseFloat(kaatForm.kaat) || 0, pf: parseFloat(kaatForm.pf) || 0, actual_kaat_rate: parseFloat(kaatForm.actual_kaat_rate) || 0, dd_chrg: parseFloat(kaatForm.dd_chrg) || 0, bilty_chrg: parseFloat(kaatForm.bilty_chrg) || 0, ewb_chrg: parseFloat(kaatForm.ewb_chrg) || 0, labour_chrg: parseFloat(kaatForm.labour_chrg) || 0, other_chrg: parseFloat(kaatForm.other_chrg) || 0, transport_id: kaatForm.transport_id || null, transport_hub_rate_id: hubRate?.id || null, rate_type: hubRate?.pricing_mode || null, rate_per_kg: hubRate?.rate_per_kg || 0, rate_per_pkg: hubRate?.rate_per_pkg || 0, updated_by: user.id, updated_at: new Date().toISOString() };
      if (!kaatData[editingKaat]) payload.created_by = user.id;
      const { data, error } = await supabase.from('bilty_wise_kaat').upsert(payload, { onConflict: 'gr_no' }).select().single();
      if (error) throw error;
      setKaatData(p => ({ ...p, [editingKaat]: data }));
      setEditingKaat(null);
    } catch (e) { console.error(e); alert('Failed to save kaat.'); }
    finally { setSavingKaat(false); }
  }, [editingKaat, user?.id, kaatForm, enrichedBilties, hubRatesByTransport, kaatData]);

  /* ========== TRANSPORT ========== */
  const handleTransportChange = useCallback(async (grNo, transportId) => {
    if (!user?.id || !grNo || savingTransport[grNo]) return;
    try {
      setSavingTransport(p => ({ ...p, [grNo]: true }));
      const bi = enrichedBilties.find(b => b.gr_no === grNo);
      const hubRate = transportId ? getHubRateForTransport(hubRatesByTransport, transportId, bi?.to_city_id) : null;
      const payload = { gr_no: grNo, challan_no: bi?.challan_no, destination_city_id: bi?.to_city_id || null, transport_id: transportId || null, transport_hub_rate_id: hubRate?.id || null, rate_type: hubRate?.pricing_mode || null, rate_per_kg: hubRate?.rate_per_kg || 0, rate_per_pkg: hubRate?.rate_per_pkg || 0, bilty_chrg: hubRate?.bilty_chrg || (kaatData[grNo]?.bilty_chrg || 0), ewb_chrg: hubRate?.ewb_chrg || (kaatData[grNo]?.ewb_chrg || 0), labour_chrg: hubRate?.labour_chrg || (kaatData[grNo]?.labour_chrg || 0), other_chrg: hubRate?.other_chrg || (kaatData[grNo]?.other_chrg || 0), updated_by: user.id, updated_at: new Date().toISOString() };
      if (!kaatData[grNo]) payload.created_by = user.id;
      const { data, error } = await supabase.from('bilty_wise_kaat').upsert(payload, { onConflict: 'gr_no' }).select().single();
      if (error) throw error;
      setKaatData(p => ({ ...p, [grNo]: data }));
    } catch (e) { console.error(e); alert('Failed to save transport.'); }
    finally { setSavingTransport(p => ({ ...p, [grNo]: false })); }
  }, [user?.id, enrichedBilties, hubRatesByTransport, kaatData, savingTransport]);

  const autoAssignTransports = useCallback(async () => {
    if (!user?.id || autoAssigning) return;
    const toAssign = enrichedBilties.filter(b => {
      if (!b.to_city_id || kaatData[b.gr_no]?.transport_id) return false;
      const ct = transportsByCity[b.to_city_id] || [];
      return ct.length > 0 && (ct.some(t => t.is_prior) || ct.length === 1);
    });
    if (!toAssign.length) { alert('No bilties with auto-assignable transport.'); return; }
    if (!confirm(`Auto-assign transport to ${toAssign.length} bilties?`)) return;
    setAutoAssigning(true);
    try {
      const now = new Date().toISOString();
      const payloads = toAssign.map(b => {
        const ct = transportsByCity[b.to_city_id] || [];
        const tr = ct.find(t => t.is_prior) || ct[0];
        const hr = getHubRateForTransport(hubRatesByTransport, tr.id, b.to_city_id);
        return { gr_no: b.gr_no, challan_no: b.challan_no, destination_city_id: b.to_city_id, transport_id: tr.id, transport_hub_rate_id: hr?.id || null, rate_type: hr?.pricing_mode || null, rate_per_kg: hr?.rate_per_kg || 0, rate_per_pkg: hr?.rate_per_pkg || 0, bilty_chrg: hr?.bilty_chrg || 0, ewb_chrg: hr?.ewb_chrg || 0, labour_chrg: hr?.labour_chrg || 0, other_chrg: hr?.other_chrg || 0, created_by: kaatData[b.gr_no] ? undefined : user.id, updated_by: user.id, updated_at: now };
      });
      const { data, error } = await supabase.from('bilty_wise_kaat').upsert(payloads, { onConflict: 'gr_no' }).select();
      if (error) throw error;
      const nk = { ...kaatData }; (data || []).forEach(k => { nk[k.gr_no] = k; }); setKaatData(nk);
      alert(`Assigned transport to ${toAssign.length} bilties!`);
    } catch (e) { console.error(e); alert('Auto-assign failed.'); }
    finally { setAutoAssigning(false); }
  }, [user?.id, autoAssigning, enrichedBilties, kaatData, transportsByCity, hubRatesByTransport]);

  const bulkApplyHubRates = useCallback(async () => {
    if (!user?.id || applyingHubRates || !enrichedBilties.length) return;
    if (!confirm(`Auto apply kaat to ${enrichedBilties.length} bilties?`)) return;
    setApplyingHubRates(true);
    try {
      const cityIdsSet = new Set();
      enrichedBilties.forEach(b => { if (b.to_city_id) cityIdsSet.add(b.to_city_id); else if (b.destination_code) { const c = cities.find(ci => ci.city_code === b.destination_code); if (c?.id) cityIdsSet.add(c.id); } });
      const allCityIds = Array.from(cityIdsSet);
      if (!allCityIds.length) { alert('No destination cities found.'); setApplyingHubRates(false); return; }
      const { data: allRates, error: rErr } = await supabase.from('transport_hub_rates').select('id, transport_id, transport_name, destination_city_id, rate_per_kg, rate_per_pkg, min_charge, pricing_mode, is_active, bilty_chrg, ewb_chrg, labour_chrg, other_chrg').in('destination_city_id', allCityIds).eq('is_active', true);
      if (rErr) throw rErr;
      if (!allRates?.length) { alert('No kaat rates found.'); setApplyingHubRates(false); return; }
      const ratesByCity = {};
      allRates.forEach(r => { if (!ratesByCity[r.destination_city_id]) ratesByCity[r.destination_city_id] = []; ratesByCity[r.destination_city_id].push(r); });
      const grNos = enrichedBilties.map(b => b.gr_no).filter(Boolean);
      let exMap = {};
      for (let i = 0; i < grNos.length; i += 100) {
        const { data: ek } = await supabase.from('bilty_wise_kaat').select('gr_no, dd_chrg, pohonch_no, bilty_number').in('gr_no', grNos.slice(i, i + 100));
        (ek || []).forEach(k => { exMap[k.gr_no] = k; });
      }
      const upsertData = []; let skipped = 0;
      const now = new Date().toISOString();
      enrichedBilties.forEach(b => {
        let destCityId = b.to_city_id;
        if (!destCityId && b.destination_code) { const c = cities.find(ci => ci.city_code === b.destination_code); destCityId = c?.id; }
        if (!destCityId || !ratesByCity[destCityId]?.length) { skipped++; return; }
        const txnName = (b.transport_name || '').toLowerCase();
        let sr = txnName ? ratesByCity[destCityId].find(r => { const rn = (r.transport_name || '').toLowerCase(); return rn.includes(txnName) || txnName.includes(rn); }) : null;
        if (!sr) sr = ratesByCity[destCityId][0];
        const wt = parseFloat(b.weight || 0); const pkg = parseInt(b.packets || 0);
        const rt = sr.pricing_mode || 'per_kg'; const ew = Math.max(wt, 50);
        let ka = rt === 'per_kg' ? ew * parseFloat(sr.rate_per_kg || 0) : rt === 'per_pkg' ? pkg * parseFloat(sr.rate_per_pkg || 0) : (ew * parseFloat(sr.rate_per_kg || 0)) + (pkg * parseFloat(sr.rate_per_pkg || 0));
        ka += parseFloat(sr.bilty_chrg || 0) + parseFloat(sr.ewb_chrg || 0) + parseFloat(sr.labour_chrg || 0) + parseFloat(sr.other_chrg || 0);
        if (sr.min_charge && ka < parseFloat(sr.min_charge)) ka = parseFloat(sr.min_charge);
        let akr = parseFloat(sr.rate_per_kg || 0);
        if (rt === 'per_kg' && wt > 0 && wt < 50) akr = (ew * parseFloat(sr.rate_per_kg || 0)) / wt;
        const exDd = exMap[b.gr_no]?.dd_chrg ? parseFloat(exMap[b.gr_no].dd_chrg) : 0;
        const kaWd = parseFloat((ka + exDd).toFixed(4));
        const pm = (b.payment || '').toLowerCase();
        const isPDD = pm.includes('paid') || (b.delivery_type || '').toLowerCase().includes('door');
        upsertData.push({ gr_no: b.gr_no, challan_no: b.challan_no, destination_city_id: destCityId, transport_hub_rate_id: sr.id, rate_type: rt, rate_per_kg: sr.rate_per_kg || 0, rate_per_pkg: sr.rate_per_pkg || 0, kaat: kaWd, pf: parseFloat(((isPDD ? 0 : parseFloat(b.amount || 0)) - kaWd).toFixed(4)), actual_kaat_rate: parseFloat(akr.toFixed(4)), dd_chrg: exDd, bilty_chrg: parseFloat(sr.bilty_chrg || 0), ewb_chrg: parseFloat(sr.ewb_chrg || 0), labour_chrg: parseFloat(sr.labour_chrg || 0), other_chrg: parseFloat(sr.other_chrg || 0), pohonch_no: exMap[b.gr_no]?.pohonch_no || null, bilty_number: exMap[b.gr_no]?.bilty_number || null, created_by: user.id, updated_by: user.id, updated_at: now });
      });
      if (!upsertData.length) { alert(`No bilties matched kaat rates. Skipped: ${skipped}`); setApplyingHubRates(false); return; }
      let results = [];
      for (let i = 0; i < upsertData.length; i += 100) {
        const { data, error } = await supabase.from('bilty_wise_kaat').upsert(upsertData.slice(i, i + 100), { onConflict: 'gr_no' }).select();
        if (error) throw error;
        results = [...results, ...(data || [])];
      }
      const nk = { ...kaatData }; results.forEach(k => { nk[k.gr_no] = k; }); setKaatData(nk);
      alert(`Auto Kaat Applied! Applied: ${upsertData.length} · Skipped: ${skipped}`);
    } catch (e) { console.error(e); alert('Failed: ' + e.message); }
    finally { setApplyingHubRates(false); }
  }, [user?.id, applyingHubRates, enrichedBilties, kaatData, cities]);

  /* ========== ADD TRANSPORT / HUB RATE ========== */
  const openAddTransportModal = useCallback((cityId) => {
    const city = cities.find(c => c.id === cityId);
    setAddTransportForm({ transport_name: '', city_id: cityId || '', city_name: city?.city_name || '', address: '', gst_number: '', mob_number: '', branch_owner_name: '', website: '' });
    setShowAddTransport(true);
  }, [cities]);

  const saveNewTransport = useCallback(async () => {
    if (!user?.id || !addTransportForm.transport_name?.trim() || !addTransportForm.city_name?.trim() || !addTransportForm.address?.trim()) { alert('Transport name, city name, and address are required.'); return; }
    setSavingNewTransport(true);
    try {
      const { data, error } = await supabase.from('transports').insert({ transport_name: addTransportForm.transport_name.trim(), city_id: addTransportForm.city_id || null, city_name: addTransportForm.city_name.trim(), address: addTransportForm.address.trim(), gst_number: addTransportForm.gst_number?.trim() || null, mob_number: addTransportForm.mob_number?.trim() || null, branch_owner_name: addTransportForm.branch_owner_name?.trim() || null, website: addTransportForm.website?.trim() || null }).select().single();
      if (error) throw error;
      setTransports(p => [...p, data]);
      if (data.city_id) setTransportsByCity(p => ({ ...p, [data.city_id]: [...(p[data.city_id] || []), data] }));
      setShowAddTransport(false);
    } catch (e) { console.error(e); alert('Failed to add transport.'); }
    finally { setSavingNewTransport(false); }
  }, [user?.id, addTransportForm]);

  const openAddHubRateModal = useCallback((transportId, cityId) => {
    const tr = transports.find(t => t.id === transportId); const city = cities.find(c => c.id === cityId);
    setAddHubRateForm({ transport_id: transportId, transport_name: tr?.transport_name || '', destination_city_id: cityId, destination_city_name: city?.city_name || '', goods_type: '', pricing_mode: 'per_kg', rate_per_kg: 0, rate_per_pkg: 0, min_charge: 0, bilty_chrg: 0, ewb_chrg: 0, labour_chrg: 0, other_chrg: 0 });
    setShowAddHubRate(true);
  }, [transports, cities]);

  const saveNewHubRate = useCallback(async () => {
    if (!user?.id || !addHubRateForm.transport_id || !addHubRateForm.destination_city_id) { alert('Transport and city required.'); return; }
    setSavingNewHubRate(true);
    try {
      const { data, error } = await supabase.from('transport_hub_rates').insert({ transport_id: addHubRateForm.transport_id, transport_name: addHubRateForm.transport_name, destination_city_id: addHubRateForm.destination_city_id, goods_type: addHubRateForm.goods_type?.trim() || null, pricing_mode: addHubRateForm.pricing_mode || 'per_kg', rate_per_kg: parseFloat(addHubRateForm.rate_per_kg) || null, rate_per_pkg: parseFloat(addHubRateForm.rate_per_pkg) || null, min_charge: parseFloat(addHubRateForm.min_charge) || 0, bilty_chrg: parseFloat(addHubRateForm.bilty_chrg) || null, ewb_chrg: parseFloat(addHubRateForm.ewb_chrg) || null, labour_chrg: parseFloat(addHubRateForm.labour_chrg) || null, other_chrg: parseFloat(addHubRateForm.other_chrg) || null, is_active: true, created_by: user.id, updated_by: user.id }).select().single();
      if (error) throw error;
      setHubRates(p => [...p, data]);
      setHubRatesByTransport(p => { const n = { ...p }; const tid = data.transport_id; const cid = data.destination_city_id; if (!n[tid]) n[tid] = {}; if (!n[tid][cid]) n[tid][cid] = []; n[tid][cid] = [...n[tid][cid], data]; return n; });
      setShowAddHubRate(false);
    } catch (e) { console.error(e); alert('Failed to add hub rate.'); }
    finally { setSavingNewHubRate(false); }
  }, [user?.id, addHubRateForm]);

  /* ========== MEMOISED COMPUTED ========== */
  const displayed = useMemo(() => {
    let r = enrichedBilties;
    if (kanpurFilter) r = r.filter(t => kanpurGrNos.has(t.gr_no));
    if (grSearch.trim()) {
      const s = grSearch.trim().toLowerCase();
      r = r.filter(t => {
        if (t.gr_no?.toLowerCase().includes(s) || t.destination?.toLowerCase().includes(s) || t.challan_no?.toLowerCase().includes(s)) return true;
        const cl = t.to_city_id ? (transportsByCity[t.to_city_id] || []) : [];
        const aid = kaatData[t.gr_no]?.transport_id;
        if (aid) { const m = cl.find(tr => String(tr.id) === String(aid)); if (m?.transport_name?.toLowerCase().includes(s)) return true; }
        return cl.some(tr => tr.transport_name?.toLowerCase().includes(s));
      });
    }
    if (citySearch) r = r.filter(t => t.destination === citySearch);
    if (transportSearch) r = r.filter(t => {
      const aid = kaatData[t.gr_no]?.transport_id;
      if (aid) { const cl = t.to_city_id ? (transportsByCity[t.to_city_id] || []) : []; const m = cl.find(tr => String(tr.id) === String(aid)); return m?.transport_name === transportSearch; }
      return (t.to_city_id ? (transportsByCity[t.to_city_id] || []) : []).some(tr => tr.transport_name === transportSearch);
    });
    return [...r].sort((a, b) => (a.destination || '').localeCompare(b.destination || ''));
  }, [enrichedBilties, kanpurFilter, kanpurGrNos, grSearch, citySearch, transportSearch, kaatData, transportsByCity]);

  const kanpurCount = useMemo(() => enrichedBilties.filter(t => kanpurGrNos.has(t.gr_no)).length, [enrichedBilties, kanpurGrNos]);
  const uniqueCities = useMemo(() => [...new Set(enrichedBilties.map(b => b.destination).filter(d => d && d !== '-'))].sort(), [enrichedBilties]);
  const uniqueTransports = useMemo(() => {
    const names = new Set();
    enrichedBilties.forEach(b => { const aid = kaatData[b.gr_no]?.transport_id; if (aid) { const m = (b.to_city_id ? (transportsByCity[b.to_city_id] || []) : []).find(tr => String(tr.id) === String(aid)); if (m?.transport_name) names.add(m.transport_name); } });
    return [...names].sort();
  }, [enrichedBilties, kaatData, transportsByCity]);

  const stats = useMemo(() => ({
    deliveredCount: enrichedBilties.filter(t => t.is_delivered_at_destination).length,
    inTransitCount: enrichedBilties.filter(t => t.is_out_of_delivery_from_branch1 && !t.is_delivered_at_destination).length,
    pendingCount:   enrichedBilties.filter(t => !t.is_out_of_delivery_from_branch1).length,
    totalPkts: enrichedBilties.reduce((s, b) => s + (b.packets || 0), 0),
    totalWt:   enrichedBilties.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0),
    totalAmt:  enrichedBilties.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0),
    autoCount: enrichedBilties.filter(b => { if (!b.to_city_id || kaatData[b.gr_no]?.transport_id) return false; const ct = transportsByCity[b.to_city_id] || []; return ct.length > 0 && (ct.some(t => t.is_prior) || ct.length === 1); }).length,
    assignedCount: enrichedBilties.filter(b => kaatData[b.gr_no]?.transport_id).length,
  }), [enrichedBilties, kaatData, transportsByCity]);

  const footerTotals = useMemo(() => ({
    packets: displayed.reduce((s, b) => s + (b.packets || 0), 0),
    weight:  displayed.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0),
    amount:  displayed.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0),
    kaat:    displayed.reduce((s, b) => s + kTotal(kaatData[b.gr_no]), 0),
  }), [displayed, kaatData]);

  const toggleSelectAll = useCallback(() => {
    if (selectedGrs.size === displayed.length) setSelectedGrs(new Set());
    else setSelectedGrs(new Set(displayed.map(b => b.id)));
  }, [selectedGrs.size, displayed]);

  const userName = useMemo(() => user?.name || user?.username || '', [user?.name, user?.username]);

  return {
    /* data */
    trip, loading, error, enrichedBilties, cities,
    /* transit */
    updatingTransit, handleDeliveredAtBranch2, handleOutFromBranch2, handleDeliveredAtDestination,
    /* bulk */
    selectedGrs, setSelectedGrs, toggleSelect, toggleSelectAll, bulkLoading, bulkAction,
    showBulkPohonch, setShowBulkPohonch, bulkPohonchNo, setBulkPohonchNo, savingBulkPohonch, bulkAssignPohonch,
    /* kaat */
    kaatData, editingKaat, setEditingKaat, kaatForm, setKaatForm, savingKaat, openKaatModal, saveKaatForm,
    /* transport */
    transports, transportsByCity, savingTransport, autoAssigning, handleTransportChange, autoAssignTransports,
    /* hub rates */
    hubRates, hubRatesByTransport, applyingHubRates, bulkApplyHubRates,
    /* add transport/rate */
    showAddTransport, setShowAddTransport, addTransportForm, setAddTransportForm, savingNewTransport, saveNewTransport, openAddTransportModal,
    showAddHubRate, setShowAddHubRate, addHubRateForm, setAddHubRateForm, savingNewHubRate, saveNewHubRate, openAddHubRateModal,
    /* image/pod */
    previewImage, setPreviewImage, podGrNos,
    /* cross challan */
    crossChallanMap, refreshCrossMap, ccPdfUrl, ccPdfTransport, ccGenerating, ccPdfBilties, ccSaving, ccSavedPohonch, setCcSavedPohonch, showBulkCrossModal, setShowBulkCrossModal, buildCcPdfBilties, handlePrintCrossChallan, closeCcPreview,
    /* kanpur */
    kanpurFilter, setKanpurFilter, kanpurGrNos, loadingKanpur, kanpurCount,
    /* search/filter */
    grSearch, setGrSearch, citySearch, setCitySearch, transportSearch, setTransportSearch,
    /* computed */
    displayed, uniqueCities, uniqueTransports, stats, footerTotals, userName,
    /* actions */
    fetchAll,
  };
}
