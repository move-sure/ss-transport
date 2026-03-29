'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import Navbar from '../../../components/dashboard/navbar';
import { format } from 'date-fns';
import {
  Warehouse, Truck, Package, CheckCircle2, Clock, AlertCircle, RefreshCw,
  ArrowLeft, MapPin, User, CheckCircle, Navigation, Box,
  Building2, ClipboardList, ShieldCheck, Filter, X, Loader2,
  Search, Square, CheckSquare, FileText, ChevronDown,
} from 'lucide-react';

import { IC, DI, SC } from '../../../components/hub-management/SmallComponents';
import BiltyTableRow from '../../../components/hub-management/BiltyTableRow';
import BiltyMobileCard from '../../../components/hub-management/BiltyMobileCard';
import ImagePreviewModal from '../../../components/hub-management/ImagePreviewModal';
import KaatModal from '../../../components/hub-management/KaatModal';
import AddTransportModal from '../../../components/hub-management/AddTransportModal';
import AddHubRateModal from '../../../components/hub-management/AddHubRateModal';
import { kTotal, getHubRateForTransport } from '../../../components/hub-management/HubHelpers';
import CrossChallanPrintModal, { useCrossChallanPrint } from '../../../components/transit-finance/pohonch-print/CrossChallanPrintModal';

export default function ChallanDetailPage() {
  const { challan_no } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [challan, setChallan] = useState(null);
  const [transitDetails, setTransitDetails] = useState([]);
  const [enrichedBilties, setEnrichedBilties] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receivingAtHub, setReceivingAtHub] = useState(false);
  const [kanpurFilter, setKanpurFilter] = useState(false);
  const [kanpurGrNos, setKanpurGrNos] = useState(new Set());
  const [loadingKanpur, setLoadingKanpur] = useState(false);
  const [updatingTransit, setUpdatingTransit] = useState({});

  const [grSearch, setGrSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [transportSearch, setTransportSearch] = useState('');
  const [transportDropdownOpen, setTransportDropdownOpen] = useState(false);
  const [transportFilterText, setTransportFilterText] = useState('');
  const transportDropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (transportDropdownRef.current && !transportDropdownRef.current.contains(e.target)) setTransportDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [kaatData, setKaatData] = useState({});
  const [editingKaat, setEditingKaat] = useState(null);
  const [kaatForm, setKaatForm] = useState({});
  const [savingKaat, setSavingKaat] = useState(false);

  const [selectedGrs, setSelectedGrs] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(null);

  const [showBulkPohonch, setShowBulkPohonch] = useState(false);
  const [bulkPohonchNo, setBulkPohonchNo] = useState('');
  const [savingBulkPohonch, setSavingBulkPohonch] = useState(false);

  const [previewImage, setPreviewImage] = useState(null);

  const [transports, setTransports] = useState([]);
  const [transportsByCity, setTransportsByCity] = useState({});
  const [savingTransport, setSavingTransport] = useState({});
  const [autoAssigning, setAutoAssigning] = useState(false);

  const [hubRates, setHubRates] = useState([]);
  const [hubRatesByTransport, setHubRatesByTransport] = useState({});
  const [applyingHubRates, setApplyingHubRates] = useState(false);

  const [showAddTransport, setShowAddTransport] = useState(false);
  const [addTransportForm, setAddTransportForm] = useState({ transport_name: '', city_id: '', city_name: '', address: '', gst_number: '', mob_number: '', branch_owner_name: '', website: '' });
  const [savingNewTransport, setSavingNewTransport] = useState(false);

  const [showAddHubRate, setShowAddHubRate] = useState(false);
  const [addHubRateForm, setAddHubRateForm] = useState({ transport_id: '', transport_name: '', destination_city_id: '', destination_city_name: '', goods_type: '', pricing_mode: 'per_kg', rate_per_kg: 0, rate_per_pkg: 0, min_charge: 0, bilty_chrg: 0, ewb_chrg: 0, labour_chrg: 0, other_chrg: 0 });
  const [savingNewHubRate, setSavingNewHubRate] = useState(false);

  // Crossing challan (pohonch) mapping: gr_no -> pohonch_number
  const [crossChallanMap, setCrossChallanMap] = useState({});

  // Shared cross challan print hook (fetches fresh data, updates metadata)
  const crossChallanPrint = useCrossChallanPrint();

  // Fetch crossing challan data for given GR numbers
  const fetchCrossChallanData = useCallback(async (grNos) => {
    if (!grNos?.length) return;
    try {
      const { data: pohonchData } = await supabase
        .from('pohonch')
        .select('pohonch_number, bilty_metadata')
        .eq('is_active', true);
      if (pohonchData) {
        const ccMap = {};
        pohonchData.forEach(p => {
          const bilties = Array.isArray(p.bilty_metadata) ? p.bilty_metadata : [];
          bilties.forEach(b => {
            if (b.gr_no && grNos.includes(b.gr_no)) {
              ccMap[b.gr_no] = p.pohonch_number;
            }
          });
        });
        setCrossChallanMap(ccMap);
      }
    } catch (e) { console.error('Crossing challan fetch error:', e); }
  }, []);

  /* ========== DATA FETCHING ========== */
  const fetchKaatData = useCallback(async (grNumbers) => {
    if (!grNumbers?.length) return;
    try {
      const { data } = await supabase.from('bilty_wise_kaat').select('*').in('gr_no', grNumbers);
      if (data) {
        const m = {};
        data.forEach(k => { m[k.gr_no] = k; });
        setKaatData(m);
      }
    } catch (e) { console.error('Kaat fetch error:', e); }
  }, []);

  const fetchKanpurBilties = useCallback(async (grNos, cityList) => {
    try {
      setLoadingKanpur(true);
      const kSet = new Set();
      const ac = cityList || cities;
      const kCities = ac.filter(c => c.city_name?.toLowerCase().includes('kanpur'));
      const kCodes = kCities.map(c => c.city_code);
      const kIds = kCities.map(c => c.id);
      if (kCodes.length) {
        const { data } = await supabase.from('station_bilty_summary').select('gr_no').in('gr_no', grNos).in('station', kCodes);
        (data || []).forEach(s => kSet.add(s.gr_no));
      }
      if (kIds.length) {
        const { data } = await supabase.from('bilty').select('gr_no').in('gr_no', grNos).in('to_city_id', kIds).eq('is_active', true);
        (data || []).forEach(b => kSet.add(b.gr_no));
      }
      setKanpurGrNos(kSet);
    } catch (e) { console.error('Kanpur error:', e); }
    finally { setLoadingKanpur(false); }
  }, []);

  const fetchChallanDetails = useCallback(async () => {
    if (!user?.id || !challan_no) return;
    try {
      setLoading(true); setError(null);
      const dc = decodeURIComponent(challan_no);

      const [brRes, ciRes, chRes, trRes, hrRes] = await Promise.all([
        supabase.from('branches').select('id, branch_name').eq('is_active', true),
        supabase.from('cities').select('id, city_name, city_code').order('city_name'),
        supabase.from('challan_details').select(`
          id, challan_no, branch_id, truck_id, owner_id, driver_id, date,
          total_bilty_count, remarks, is_active, is_dispatched, dispatch_date,
          is_received_at_hub, received_at_hub_timing, received_by_user,
          created_by, created_at, updated_at,
          truck:trucks(id, truck_number, truck_type),
          owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
          driver:staff!challan_details_driver_id_fkey(id, name, mobile_number)
        `).eq('challan_no', dc).single(),
        supabase.from('transports').select('id, transport_name, city_id, city_name, mob_number, gst_number').order('transport_name'),
        supabase.from('transport_hub_rates').select('*').eq('is_active', true),
      ]);

      if (chRes.error) throw chRes.error;
      const bMap = {};
      (brRes.data || []).forEach(b => { bMap[b.id] = b.branch_name; });
      const cList = ciRes.data || [];
      setCities(cList);
      setChallan({ ...chRes.data, branch_name: bMap[chRes.data.branch_id] || '-' });

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

      const { data: tData, error: tErr } = await supabase.from('transit_details').select(`
        id, challan_no, gr_no, bilty_id, challan_book_id, from_branch_id, to_branch_id,
        is_out_of_delivery_from_branch1, out_of_delivery_from_branch1_date,
        is_delivered_at_branch2, delivered_at_branch2_date,
        is_out_of_delivery_from_branch2, out_of_delivery_from_branch2_date,
        is_delivered_at_destination, delivered_at_destination_date,
        out_for_door_delivery, out_for_door_delivery_date,
        delivery_agent_name, delivery_agent_phone, vehicle_number, remarks, created_at
      `).eq('challan_no', dc).order('created_at', { ascending: true });

      if (tErr) throw tErr;
      const ts = tData || [];
      setTransitDetails(ts);
      if (!ts.length) { setEnrichedBilties([]); setLoading(false); return; }

      const grNos = ts.map(t => t.gr_no).filter(Boolean);
      const [rRes, sRes] = await Promise.all([
        grNos.length ? supabase.from('bilty').select(`
          id, gr_no, bilty_date, consignor_name, consignee_name, payment_mode,
          no_of_pkg, total, to_city_id, wt, rate, freight_amount, contain,
          e_way_bill, pvt_marks, consignor_number, consignee_number,
          transport_name, delivery_type, invoice_no, invoice_value,
          labour_charge, bill_charge, toll_charge, dd_charge, other_charge, remark, bilty_image
        `).in('gr_no', grNos).eq('is_active', true) : Promise.resolve({ data: [] }),
        grNos.length ? supabase.from('station_bilty_summary').select(`
          id, station, gr_no, consignor, consignee, contents, no_of_packets,
          weight, payment_status, amount, pvt_marks, e_way_bill, delivery_type,
          created_at, w_name, transport_name, transport_gst, bilty_image
        `).in('gr_no', grNos) : Promise.resolve({ data: [] }),
      ]);

      const rBilties = rRes.data || [];
      const sBilties = sRes.data || [];

      const rMap = new Map();
      rBilties.forEach(b => rMap.set(b.gr_no, b));
      const sMap = new Map();
      sBilties.forEach(b => sMap.set(b.gr_no, b));
      const cityMap = new Map();
      cList.forEach(c => { cityMap.set(c.id, c); if (c.city_code) cityMap.set(`code_${c.city_code}`, c); });

      const merged = ts.map((t, i) => {
        const r = rMap.get(t.gr_no);
        const s = sMap.get(t.gr_no);
        const fb = bMap[t.from_branch_id] || '-';
        const tb = bMap[t.to_branch_id] || '-';
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
            freight_amount: r.freight_amount || 0, labour_charge: r.labour_charge || 0,
            remark: r.remark || t.remarks || '', bilty_image: r.bilty_image || null };
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
          transport_name: '', freight_amount: 0, labour_charge: 0, remark: t.remarks || '', bilty_image: null };
      });

      setEnrichedBilties(merged);
      if (grNos.length) {
        fetchKanpurBilties(grNos, cList);
        fetchKaatData(grNos);
        // Fetch crossing challan (pohonch) data for these GR numbers
        fetchCrossChallanData(grNos);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load challan details.');
    } finally { setLoading(false); }
  }, [user?.id, challan_no, fetchKaatData, fetchKanpurBilties]);

  useEffect(() => { fetchChallanDetails(); }, [fetchChallanDetails]);

  /* ========== TRANSIT STATUS ========== */
  const updateTransitStatus = useCallback(async (transitId, grNo, field, dateField) => {
    if (!user?.id) return;
    const key = `${transitId}-${field}`;
    try {
      setUpdatingTransit(p => ({ ...p, [key]: true }));
      const now = new Date().toISOString();
      const { error: e } = await supabase.from('transit_details').update({ [field]: true, [dateField]: now, updated_by: user.id }).eq('id', transitId);
      if (e) throw e;
      setEnrichedBilties(p => p.map(b => b.id === transitId ? { ...b, [field]: true, [dateField]: now } : b));
      setTransitDetails(p => p.map(t => t.id === transitId ? { ...t, [field]: true, [dateField]: now } : t));
    } catch (e) { console.error(e); alert('Failed to update.'); }
    finally { setUpdatingTransit(p => ({ ...p, [key]: false })); }
  }, [user?.id]);

  const handleDeliveredAtBranch2 = useCallback((t) => {
    if (t.is_delivered_at_branch2) return;
    if (!confirm(`Mark GR ${t.gr_no} as "Delivered"?`)) return;
    updateTransitStatus(t.id, t.gr_no, 'is_delivered_at_branch2', 'delivered_at_branch2_date');
  }, [updateTransitStatus]);

  const handleOutFromBranch2 = useCallback((t) => {
    if (t.is_out_of_delivery_from_branch2) return;
    if (!confirm(`Mark GR ${t.gr_no} as "Out for Delivery"?`)) return;
    updateTransitStatus(t.id, t.gr_no, 'is_out_of_delivery_from_branch2', 'out_of_delivery_from_branch2_date');
  }, [updateTransitStatus]);

  const handleDeliveredAtDestination = useCallback(async (t) => {
    if (t.is_delivered_at_destination) return;
    if (!confirm(`Mark GR ${t.gr_no} as "Delivered at Destination"? This will also auto-fill previous steps.`)) return;
    if (!user?.id) return;
    const key = `${t.id}-is_delivered_at_destination`;
    try {
      setUpdatingTransit(p => ({ ...p, [key]: true }));
      const now = new Date().toISOString();
      const updateData = { is_delivered_at_destination: true, delivered_at_destination_date: now, updated_by: user.id };
      if (!t.is_out_of_delivery_from_branch1) { updateData.is_out_of_delivery_from_branch1 = true; updateData.out_of_delivery_from_branch1_date = now; }
      if (!t.is_delivered_at_branch2) { updateData.is_delivered_at_branch2 = true; updateData.delivered_at_branch2_date = now; }
      if (!t.is_out_of_delivery_from_branch2) { updateData.is_out_of_delivery_from_branch2 = true; updateData.out_of_delivery_from_branch2_date = now; }
      const { error: e } = await supabase.from('transit_details').update(updateData).eq('id', t.id);
      if (e) throw e;
      setEnrichedBilties(p => p.map(b => b.id === t.id ? { ...b, ...updateData } : b));
      setTransitDetails(p => p.map(x => x.id === t.id ? { ...x, ...updateData } : x));
    } catch (e) { console.error(e); alert('Failed to update.'); }
    finally { setUpdatingTransit(p => ({ ...p, [key]: false })); }
  }, [user?.id]);

  const handleReceivedAtHub = useCallback(async () => {
    if (!user?.id || !challan?.id || challan.is_received_at_hub) return;
    if (!confirm('Mark as "Received at Hub"?')) return;
    try {
      setReceivingAtHub(true);
      const now = new Date().toISOString();
      const { error: e } = await supabase.from('challan_details').update({ is_received_at_hub: true, received_at_hub_timing: now, received_by_user: user.id }).eq('id', challan.id);
      if (e) throw e;
      setChallan(p => ({ ...p, is_received_at_hub: true, received_at_hub_timing: now }));

      // Auto mark all bilties as "Delivered at Branch"
      const pending = enrichedBilties.filter(b => !b.is_delivered_at_branch2);
      if (pending.length > 0) {
        const ids = pending.map(b => b.id);
        const { error: e2 } = await supabase.from('transit_details').update({ is_delivered_at_branch2: true, delivered_at_branch2_date: now, updated_by: user.id }).in('id', ids);
        if (e2) console.error('Auto branch update failed:', e2);
        else {
          setEnrichedBilties(p => p.map(b => ids.includes(b.id) ? { ...b, is_delivered_at_branch2: true, delivered_at_branch2_date: now } : b));
          setTransitDetails(p => p.map(t => ids.includes(t.id) ? { ...t, is_delivered_at_branch2: true, delivered_at_branch2_date: now } : t));
        }
      }

      // Auto-assign transport (single-option cities) + apply hub rates
      let latestKaat = { ...kaatData };
      const toAssign = enrichedBilties.filter(b => {
        if (!b.to_city_id || latestKaat[b.gr_no]?.transport_id) return false;
        return (transportsByCity[b.to_city_id] || []).length === 1;
      });
      if (toAssign.length > 0) {
        const assignPayloads = toAssign.map(b => {
          const transport = transportsByCity[b.to_city_id][0];
          const hubRate = getHubRateForTransport(hubRatesByTransport, transport.id, b.to_city_id);
          return {
            gr_no: b.gr_no, challan_no: challan.challan_no, destination_city_id: b.to_city_id,
            transport_id: transport.id, transport_hub_rate_id: hubRate?.id || null,
            rate_type: hubRate?.pricing_mode || null, rate_per_kg: hubRate?.rate_per_kg || 0, rate_per_pkg: hubRate?.rate_per_pkg || 0,
            bilty_chrg: hubRate?.bilty_chrg || 0, ewb_chrg: hubRate?.ewb_chrg || 0,
            labour_chrg: hubRate?.labour_chrg || 0, other_chrg: hubRate?.other_chrg || 0,
            updated_by: user.id, updated_at: now,
          };
        });
        const { data: assignData, error: e3 } = await supabase.from('bilty_wise_kaat').upsert(assignPayloads, { onConflict: 'gr_no' }).select();
        if (e3) console.error('Auto-assign transport failed:', e3);
        else (assignData || []).forEach(k => { latestKaat[k.gr_no] = k; });
      }

      // Apply hub rates to all bilties that have transport assigned
      const toApplyRates = enrichedBilties.filter(b => {
        const kd = latestKaat[b.gr_no];
        if (!kd?.transport_id || !b.to_city_id) return false;
        return getHubRateForTransport(hubRatesByTransport, kd.transport_id, b.to_city_id) !== null;
      });
      if (toApplyRates.length > 0) {
        const ratePayloads = toApplyRates.map(b => {
          const kd = latestKaat[b.gr_no];
          const hr = getHubRateForTransport(hubRatesByTransport, kd.transport_id, b.to_city_id);
          let computedKaat = 0;
          if (hr.pricing_mode === 'per_kg') computedKaat = (parseFloat(hr.rate_per_kg) || 0) * (parseFloat(b.weight) || 0);
          else if (hr.pricing_mode === 'per_pkg') computedKaat = (parseFloat(hr.rate_per_pkg) || 0) * (b.packets || 0);
          if (hr.min_charge && computedKaat < parseFloat(hr.min_charge)) computedKaat = parseFloat(hr.min_charge);
          return {
            gr_no: b.gr_no, challan_no: challan.challan_no, destination_city_id: b.to_city_id,
            transport_id: kd.transport_id, transport_hub_rate_id: hr.id,
            rate_type: hr.pricing_mode, rate_per_kg: parseFloat(hr.rate_per_kg) || 0, rate_per_pkg: parseFloat(hr.rate_per_pkg) || 0,
            kaat: parseFloat(computedKaat.toFixed(2)),
            actual_kaat_rate: hr.pricing_mode === 'per_kg' ? (parseFloat(hr.rate_per_kg) || 0) : (parseFloat(hr.rate_per_pkg) || 0),
            bilty_chrg: parseFloat(hr.bilty_chrg) || 0, ewb_chrg: parseFloat(hr.ewb_chrg) || 0,
            labour_chrg: parseFloat(hr.labour_chrg) || 0, other_chrg: parseFloat(hr.other_chrg) || 0,
            pohonch_no: kd.pohonch_no || null, bilty_number: kd.bilty_number || null,
            pf: parseFloat(kd.pf) || 0, dd_chrg: parseFloat(kd.dd_chrg) || 0,
            updated_by: user.id, updated_at: now,
          };
        });
        const { data: rateData, error: e4 } = await supabase.from('bilty_wise_kaat').upsert(ratePayloads, { onConflict: 'gr_no' }).select();
        if (e4) console.error('Auto hub rates failed:', e4);
        else (rateData || []).forEach(k => { latestKaat[k.gr_no] = k; });
      }

      setKaatData(latestKaat);
    } catch (e) { console.error(e); alert('Failed.'); }
    finally { setReceivingAtHub(false); }
  }, [user?.id, challan?.id, challan?.is_received_at_hub, challan?.challan_no, enrichedBilties, kaatData, transportsByCity, hubRatesByTransport]);

  /* ========== BULK ACTIONS ========== */
  const toggleSelect = useCallback((id) => setSelectedGrs(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);

  const bulkAction = useCallback(async (type, displayedList) => {
    if (!selectedGrs.size || !user?.id) return;
    const selected = displayedList.filter(b => selectedGrs.has(b.id));
    const actionLabels = { branch: 'Delivered at Branch', out: 'Out for Delivery', delivered: 'Delivered at Destination' };
    if (!confirm(`Mark ${selected.length} bilties as "${actionLabels[type]}"?`)) return;
    setBulkLoading(type);
    const now = new Date().toISOString();
    try {
      const transitIds = selected.map(b => b.id);
      const { data: rpcResult, error: rpcError } = await supabase.rpc('bulk_update_transit_status', {
        p_transit_ids: transitIds, p_action: type, p_user_id: user.id
      });
      if (rpcError) throw rpcError;
      if (rpcResult && !rpcResult.success) throw new Error(rpcResult.error);
      const localUpdate = { updated_by: user.id };
      if (type === 'branch' || type === 'out' || type === 'delivered') {
        localUpdate.is_out_of_delivery_from_branch1 = true; localUpdate.out_of_delivery_from_branch1_date = now;
        localUpdate.is_delivered_at_branch2 = true; localUpdate.delivered_at_branch2_date = now;
      }
      if (type === 'out' || type === 'delivered') {
        localUpdate.is_out_of_delivery_from_branch2 = true; localUpdate.out_of_delivery_from_branch2_date = now;
      }
      if (type === 'delivered') {
        localUpdate.is_delivered_at_destination = true; localUpdate.delivered_at_destination_date = now;
      }
      const idSet = new Set(transitIds);
      setEnrichedBilties(p => p.map(x => idSet.has(x.id) ? { ...x, ...localUpdate } : x));
      setTransitDetails(p => p.map(x => idSet.has(x.id) ? { ...x, ...localUpdate } : x));
      setSelectedGrs(new Set());
    } catch (e) { console.error(e); alert('Bulk action failed.'); }
    finally { setBulkLoading(null); }
  }, [selectedGrs, user?.id]);

  /* ========== BULK POHONCH ASSIGNMENT ========== */
  const bulkAssignPohonch = useCallback(async () => {
    if (!selectedGrs.size || !user?.id || !bulkPohonchNo.trim()) return;
    const selected = enrichedBilties.filter(b => selectedGrs.has(b.id));
    if (!selected.length) return;
    setSavingBulkPohonch(true);
    try {
      const now = new Date().toISOString();
      const upsertPayloads = selected.map(b => {
        const existing = kaatData[b.gr_no];
        return {
          gr_no: b.gr_no,
          challan_no: challan.challan_no,
          destination_city_id: b.to_city_id || null,
          pohonch_no: bulkPohonchNo.trim(),
          // preserve existing fields
          bilty_number: existing?.bilty_number || null,
          kaat: existing?.kaat || 0,
          pf: existing?.pf || 0,
          actual_kaat_rate: existing?.actual_kaat_rate || 0,
          dd_chrg: existing?.dd_chrg || 0,
          bilty_chrg: existing?.bilty_chrg || 0,
          ewb_chrg: existing?.ewb_chrg || 0,
          labour_chrg: existing?.labour_chrg || 0,
          other_chrg: existing?.other_chrg || 0,
          transport_id: existing?.transport_id || null,
          transport_hub_rate_id: existing?.transport_hub_rate_id || null,
          rate_type: existing?.rate_type || null,
          rate_per_kg: existing?.rate_per_kg || 0,
          rate_per_pkg: existing?.rate_per_pkg || 0,
          updated_by: user.id,
          updated_at: now,
          ...(existing ? {} : { created_by: user.id }),
        };
      });
      const { data, error } = await supabase.from('bilty_wise_kaat').upsert(upsertPayloads, { onConflict: 'gr_no' }).select();
      if (error) throw error;
      const newKaat = { ...kaatData };
      (data || []).forEach(k => { newKaat[k.gr_no] = k; });
      setKaatData(newKaat);
      setShowBulkPohonch(false);
      setBulkPohonchNo('');
      setSelectedGrs(new Set());
      // Refresh crossing challan data to reflect the new assignment
      const allGrNos = enrichedBilties.map(b => b.gr_no).filter(Boolean);
      if (allGrNos.length) fetchCrossChallanData(allGrNos);
      alert(`Pohonch "${bulkPohonchNo.trim()}" assigned to ${selected.length} GRs!`);
    } catch (e) {
      console.error('Bulk pohonch error:', e);
      alert('Failed to assign pohonch number.');
    } finally {
      setSavingBulkPohonch(false);
    }
  }, [selectedGrs, user?.id, bulkPohonchNo, enrichedBilties, kaatData, challan?.challan_no]);

  /* ========== KAAT MANAGEMENT ========== */
  const openKaatModal = useCallback((grNo) => {
    const k = kaatData[grNo] || {};
    setKaatForm({
      pohonch_no: k.pohonch_no || '', bilty_number: k.bilty_number || '',
      kaat: k.kaat || 0, pf: k.pf || 0, actual_kaat_rate: k.actual_kaat_rate || 0,
      dd_chrg: k.dd_chrg || 0, bilty_chrg: k.bilty_chrg || 0,
      ewb_chrg: k.ewb_chrg || 0, labour_chrg: k.labour_chrg || 0, other_chrg: k.other_chrg || 0,
      transport_id: k.transport_id || '',
    });
    setEditingKaat(grNo);
  }, [kaatData]);

  const saveKaatForm = useCallback(async () => {
    if (!editingKaat || !user?.id) return;
    setSavingKaat(true);
    try {
      const bi = enrichedBilties.find(b => b.gr_no === editingKaat);
      const hubRate = kaatForm.transport_id && bi?.to_city_id ? getHubRateForTransport(hubRatesByTransport, kaatForm.transport_id, bi.to_city_id) : null;
      const payload = {
        gr_no: editingKaat, challan_no: challan.challan_no,
        destination_city_id: bi?.to_city_id || null,
        pohonch_no: kaatForm.pohonch_no || null, bilty_number: kaatForm.bilty_number || null,
        kaat: parseFloat(kaatForm.kaat) || 0, pf: parseFloat(kaatForm.pf) || 0,
        actual_kaat_rate: parseFloat(kaatForm.actual_kaat_rate) || 0,
        dd_chrg: parseFloat(kaatForm.dd_chrg) || 0, bilty_chrg: parseFloat(kaatForm.bilty_chrg) || 0,
        ewb_chrg: parseFloat(kaatForm.ewb_chrg) || 0, labour_chrg: parseFloat(kaatForm.labour_chrg) || 0,
        other_chrg: parseFloat(kaatForm.other_chrg) || 0,
        transport_id: kaatForm.transport_id || null,
        transport_hub_rate_id: hubRate?.id || null,
        rate_type: hubRate?.pricing_mode || null,
        rate_per_kg: hubRate?.rate_per_kg || 0, rate_per_pkg: hubRate?.rate_per_pkg || 0,
        updated_by: user.id, updated_at: new Date().toISOString(),
      };
      if (!kaatData[editingKaat]) payload.created_by = user.id;
      const { data, error } = await supabase.from('bilty_wise_kaat').upsert(payload, { onConflict: 'gr_no' }).select().single();
      if (error) throw error;
      setKaatData(p => ({ ...p, [editingKaat]: data }));
      setEditingKaat(null);
    } catch (e) { console.error(e); alert('Failed to save kaat data.'); }
    finally { setSavingKaat(false); }
  }, [editingKaat, user?.id, kaatForm, enrichedBilties, hubRatesByTransport, challan?.challan_no, kaatData]);

  /* ========== TRANSPORT SELECTION ========== */
  const handleTransportChange = useCallback(async (grNo, transportId) => {
    if (!user?.id || !grNo) return;
    if (savingTransport[grNo]) return;
    try {
      setSavingTransport(p => ({ ...p, [grNo]: true }));
      const bi = enrichedBilties.find(b => b.gr_no === grNo);
      const hubRate = transportId ? getHubRateForTransport(hubRatesByTransport, transportId, bi?.to_city_id) : null;
      const payload = {
        gr_no: grNo, challan_no: challan.challan_no,
        destination_city_id: bi?.to_city_id || null,
        transport_id: transportId || null,
        transport_hub_rate_id: hubRate?.id || null,
        rate_type: hubRate?.pricing_mode || null, rate_per_kg: hubRate?.rate_per_kg || 0, rate_per_pkg: hubRate?.rate_per_pkg || 0,
        bilty_chrg: hubRate?.bilty_chrg || (kaatData[grNo]?.bilty_chrg || 0),
        ewb_chrg: hubRate?.ewb_chrg || (kaatData[grNo]?.ewb_chrg || 0),
        labour_chrg: hubRate?.labour_chrg || (kaatData[grNo]?.labour_chrg || 0),
        other_chrg: hubRate?.other_chrg || (kaatData[grNo]?.other_chrg || 0),
        updated_by: user.id, updated_at: new Date().toISOString(),
      };
      if (!kaatData[grNo]) payload.created_by = user.id;
      const { data, error } = await supabase.from('bilty_wise_kaat').upsert(payload, { onConflict: 'gr_no' }).select().single();
      if (error) throw error;
      setKaatData(p => ({ ...p, [grNo]: data }));
    } catch (e) { console.error('Transport save error:', e); alert('Failed to save transport.'); }
    finally { setSavingTransport(p => ({ ...p, [grNo]: false })); }
  }, [user?.id, enrichedBilties, hubRatesByTransport, challan?.challan_no, kaatData, savingTransport]);

  const autoAssignSingleTransports = useCallback(async () => {
    if (!user?.id || autoAssigning) return;
    const toAssign = enrichedBilties.filter(b => {
      if (!b.to_city_id || kaatData[b.gr_no]?.transport_id) return false;
      return (transportsByCity[b.to_city_id] || []).length === 1;
    });
    if (toAssign.length === 0) { alert('No bilties found with exactly one transport option that are unassigned.'); return; }
    if (!confirm(`Auto-assign transport to ${toAssign.length} bilties that have only 1 transport option?`)) return;
    setAutoAssigning(true);
    try {
      const now = new Date().toISOString();
      const upsertPayloads = toAssign.map(b => {
        const transport = transportsByCity[b.to_city_id][0];
        const hubRate = getHubRateForTransport(hubRatesByTransport, transport.id, b.to_city_id);
        return {
          gr_no: b.gr_no, challan_no: challan.challan_no, destination_city_id: b.to_city_id,
          transport_id: transport.id, transport_hub_rate_id: hubRate?.id || null,
          rate_type: hubRate?.pricing_mode || null, rate_per_kg: hubRate?.rate_per_kg || 0, rate_per_pkg: hubRate?.rate_per_pkg || 0,
          bilty_chrg: hubRate?.bilty_chrg || 0, ewb_chrg: hubRate?.ewb_chrg || 0,
          labour_chrg: hubRate?.labour_chrg || 0, other_chrg: hubRate?.other_chrg || 0,
          created_by: kaatData[b.gr_no] ? undefined : user.id, updated_by: user.id, updated_at: now,
        };
      });
      const { data, error } = await supabase.from('bilty_wise_kaat').upsert(upsertPayloads, { onConflict: 'gr_no' }).select();
      if (error) throw error;
      const newKaat = { ...kaatData };
      (data || []).forEach(k => { newKaat[k.gr_no] = k; });
      setKaatData(newKaat);
      alert(`Successfully assigned transport to ${toAssign.length} bilties!`);
    } catch (e) { console.error('Auto-assign error:', e); alert('Failed to auto-assign transports.'); }
    finally { setAutoAssigning(false); }
  }, [user?.id, autoAssigning, enrichedBilties, kaatData, transportsByCity, hubRatesByTransport, challan?.challan_no]);

  const bulkApplyHubRates = useCallback(async () => {
    if (!user?.id || applyingHubRates) return;
    const toApply = enrichedBilties.filter(b => {
      const kd = kaatData[b.gr_no];
      if (!kd?.transport_id || !b.to_city_id) return false;
      return getHubRateForTransport(hubRatesByTransport, kd.transport_id, b.to_city_id) !== null;
    });
    if (toApply.length === 0) { alert('No bilties found with transport assigned and hub rates available.'); return; }
    if (!confirm(`Apply hub rate charges to ${toApply.length} bilties?\n\nThis will update kaat, charges based on hub rates.`)) return;
    setApplyingHubRates(true);
    try {
      const now = new Date().toISOString();
      const upsertPayloads = toApply.map(b => {
        const kd = kaatData[b.gr_no];
        const hr = getHubRateForTransport(hubRatesByTransport, kd.transport_id, b.to_city_id);
        let computedKaat = 0;
        if (hr.pricing_mode === 'per_kg') computedKaat = (parseFloat(hr.rate_per_kg) || 0) * (parseFloat(b.weight) || 0);
        else if (hr.pricing_mode === 'per_pkg') computedKaat = (parseFloat(hr.rate_per_pkg) || 0) * (b.packets || 0);
        if (hr.min_charge && computedKaat < parseFloat(hr.min_charge)) computedKaat = parseFloat(hr.min_charge);
        return {
          gr_no: b.gr_no, challan_no: challan.challan_no, destination_city_id: b.to_city_id,
          transport_id: kd.transport_id, transport_hub_rate_id: hr.id,
          rate_type: hr.pricing_mode, rate_per_kg: parseFloat(hr.rate_per_kg) || 0, rate_per_pkg: parseFloat(hr.rate_per_pkg) || 0,
          kaat: parseFloat(computedKaat.toFixed(2)),
          actual_kaat_rate: hr.pricing_mode === 'per_kg' ? (parseFloat(hr.rate_per_kg) || 0) : (parseFloat(hr.rate_per_pkg) || 0),
          bilty_chrg: parseFloat(hr.bilty_chrg) || 0, ewb_chrg: parseFloat(hr.ewb_chrg) || 0,
          labour_chrg: parseFloat(hr.labour_chrg) || 0, other_chrg: parseFloat(hr.other_chrg) || 0,
          pohonch_no: kd.pohonch_no || null, bilty_number: kd.bilty_number || null,
          pf: parseFloat(kd.pf) || 0, dd_chrg: parseFloat(kd.dd_chrg) || 0,
          updated_by: user.id, updated_at: now,
        };
      });
      const { data, error } = await supabase.from('bilty_wise_kaat').upsert(upsertPayloads, { onConflict: 'gr_no' }).select();
      if (error) throw error;
      const newKaat = { ...kaatData };
      (data || []).forEach(k => { newKaat[k.gr_no] = k; });
      setKaatData(newKaat);
      alert(`Successfully applied hub rates to ${toApply.length} bilties!`);
    } catch (e) { console.error('Bulk hub rates error:', e); alert('Failed to apply bulk hub rates.'); }
    finally { setApplyingHubRates(false); }
  }, [user?.id, applyingHubRates, enrichedBilties, kaatData, hubRatesByTransport, challan?.challan_no]);

  /* ========== ADD TRANSPORT / HUB RATE ========== */
  const openAddTransportModal = useCallback((cityId) => {
    const city = cities.find(c => c.id === cityId);
    setAddTransportForm({
      transport_name: '', city_id: cityId || '', city_name: city?.city_name || '',
      address: '', gst_number: '', mob_number: '', branch_owner_name: '', website: ''
    });
    setShowAddTransport(true);
  }, [cities]);

  const saveNewTransport = useCallback(async () => {
    if (!user?.id || !addTransportForm.transport_name?.trim() || !addTransportForm.city_name?.trim() || !addTransportForm.address?.trim()) {
      alert('Transport name, city name, and address are required.'); return;
    }
    setSavingNewTransport(true);
    try {
      const payload = {
        transport_name: addTransportForm.transport_name.trim(), city_id: addTransportForm.city_id || null,
        city_name: addTransportForm.city_name.trim(), address: addTransportForm.address.trim(),
        gst_number: addTransportForm.gst_number?.trim() || null, mob_number: addTransportForm.mob_number?.trim() || null,
        branch_owner_name: addTransportForm.branch_owner_name?.trim() || null, website: addTransportForm.website?.trim() || null,
      };
      const { data, error } = await supabase.from('transports').insert(payload).select().single();
      if (error) throw error;
      setTransports(p => [...p, data]);
      if (data.city_id) setTransportsByCity(p => ({ ...p, [data.city_id]: [...(p[data.city_id] || []), data] }));
      setShowAddTransport(false);
      alert('Transport added successfully!');
    } catch (e) { console.error(e); alert('Failed to add transport.'); }
    finally { setSavingNewTransport(false); }
  }, [user?.id, addTransportForm]);

  const openAddHubRateModal = useCallback((transportId, cityId) => {
    const tr = transports.find(t => t.id === transportId);
    const city = cities.find(c => c.id === cityId);
    setAddHubRateForm({
      transport_id: transportId, transport_name: tr?.transport_name || '',
      destination_city_id: cityId, destination_city_name: city?.city_name || '',
      goods_type: '', pricing_mode: 'per_kg', rate_per_kg: 0, rate_per_pkg: 0, min_charge: 0,
      bilty_chrg: 0, ewb_chrg: 0, labour_chrg: 0, other_chrg: 0
    });
    setShowAddHubRate(true);
  }, [transports, cities]);

  const saveNewHubRate = useCallback(async () => {
    if (!user?.id || !addHubRateForm.transport_id || !addHubRateForm.destination_city_id) {
      alert('Transport and destination city are required.'); return;
    }
    setSavingNewHubRate(true);
    try {
      const payload = {
        transport_id: addHubRateForm.transport_id, transport_name: addHubRateForm.transport_name,
        destination_city_id: addHubRateForm.destination_city_id,
        goods_type: addHubRateForm.goods_type?.trim() || null,
        pricing_mode: addHubRateForm.pricing_mode || 'per_kg',
        rate_per_kg: parseFloat(addHubRateForm.rate_per_kg) || null, rate_per_pkg: parseFloat(addHubRateForm.rate_per_pkg) || null,
        min_charge: parseFloat(addHubRateForm.min_charge) || 0,
        bilty_chrg: parseFloat(addHubRateForm.bilty_chrg) || null, ewb_chrg: parseFloat(addHubRateForm.ewb_chrg) || null,
        labour_chrg: parseFloat(addHubRateForm.labour_chrg) || null, other_chrg: parseFloat(addHubRateForm.other_chrg) || null,
        is_active: true, created_by: user.id, updated_by: user.id,
      };
      const { data, error } = await supabase.from('transport_hub_rates').insert(payload).select().single();
      if (error) throw error;
      setHubRates(p => [...p, data]);
      setHubRatesByTransport(p => {
        const n = { ...p };
        const tid = data.transport_id;
        const cid = data.destination_city_id;
        if (!n[tid]) n[tid] = {};
        if (!n[tid][cid]) n[tid][cid] = [];
        n[tid][cid] = [...n[tid][cid], data];
        return n;
      });
      setShowAddHubRate(false);
      alert('Hub rate added successfully!');
    } catch (e) { console.error(e); alert('Failed to add hub rate.'); }
    finally { setSavingNewHubRate(false); }
  }, [user?.id, addHubRateForm]);

  /* ========== MEMOIZED COMPUTED VALUES ========== */
  const displayed = useMemo(() => {
    let result = enrichedBilties;
    if (kanpurFilter) result = result.filter(t => kanpurGrNos.has(t.gr_no));
    if (grSearch.trim()) {
      const search = grSearch.trim().toLowerCase();
      result = result.filter(t => {
        if (t.gr_no?.toLowerCase().includes(search)) return true;
        if (t.destination?.toLowerCase().includes(search)) return true;
        const cityList = t.to_city_id ? (transportsByCity[t.to_city_id] || []) : [];
        const assignedId = kaatData[t.gr_no]?.transport_id;
        if (assignedId) {
          const match = cityList.find(tr => String(tr.id) === String(assignedId));
          if (match?.transport_name?.toLowerCase().includes(search)) return true;
        }
        if (cityList.some(tr => tr.transport_name?.toLowerCase().includes(search))) return true;
        return false;
      });
    }
    if (citySearch) result = result.filter(t => t.destination === citySearch);
    if (transportSearch) result = result.filter(t => {
      const assignedId = kaatData[t.gr_no]?.transport_id;
      if (assignedId) {
        const cityList = t.to_city_id ? (transportsByCity[t.to_city_id] || []) : [];
        const match = cityList.find(tr => String(tr.id) === String(assignedId));
        return match?.transport_name === transportSearch;
      }
      const cityList = t.to_city_id ? (transportsByCity[t.to_city_id] || []) : [];
      return cityList.some(tr => tr.transport_name === transportSearch);
    });
    result = [...result].sort((a, b) => (a.destination || '').localeCompare(b.destination || ''));
    return result;
  }, [enrichedBilties, kanpurFilter, kanpurGrNos, grSearch, citySearch, transportSearch, kaatData, transportsByCity]);

  const kanpurCount = useMemo(() =>
    enrichedBilties.filter(t => kanpurGrNos.has(t.gr_no)).length,
  [enrichedBilties, kanpurGrNos]);

  const uniqueCities = useMemo(() =>
    [...new Set(enrichedBilties.map(b => b.destination).filter(d => d && d !== '-'))].sort(),
  [enrichedBilties]);

  const uniqueTransports = useMemo(() => {
    const names = new Set();
    Object.values(transportsByCity).flat().forEach(t => {
      if (t.transport_name) names.add(t.transport_name);
    });
    return [...names].sort();
  }, [transportsByCity]);

  const { deliveredCount, inTransitCount, pendingCount, totalPkts, totalWt, totalAmt } = useMemo(() => ({
    deliveredCount: enrichedBilties.filter(t => t.is_delivered_at_destination).length,
    inTransitCount: enrichedBilties.filter(t => t.is_out_of_delivery_from_branch1 && !t.is_delivered_at_destination).length,
    pendingCount: enrichedBilties.filter(t => !t.is_out_of_delivery_from_branch1).length,
    totalPkts: enrichedBilties.reduce((s, b) => s + (b.packets || 0), 0),
    totalWt: enrichedBilties.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0),
    totalAmt: enrichedBilties.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0),
  }), [enrichedBilties]);

  const { autoCount, assignedCount, hubRateApplicable } = useMemo(() => ({
    autoCount: enrichedBilties.filter(b => {
      if (!b.to_city_id || kaatData[b.gr_no]?.transport_id) return false;
      return (transportsByCity[b.to_city_id] || []).length === 1;
    }).length,
    assignedCount: enrichedBilties.filter(b => kaatData[b.gr_no]?.transport_id).length,
    hubRateApplicable: enrichedBilties.filter(b => {
      const kd = kaatData[b.gr_no];
      if (!kd?.transport_id || !b.to_city_id) return false;
      return getHubRateForTransport(hubRatesByTransport, kd.transport_id, b.to_city_id) !== null;
    }).length,
  }), [enrichedBilties, kaatData, transportsByCity, hubRatesByTransport]);

  const footerTotals = useMemo(() => ({
    packets: displayed.reduce((s, b) => s + (b.packets || 0), 0),
    weight: displayed.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0),
    amount: displayed.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0),
    kaat: displayed.reduce((s, b) => s + kTotal(kaatData[b.gr_no]), 0),
  }), [displayed, kaatData]);

  const toggleSelectAll = useCallback(() => {
    if (selectedGrs.size === displayed.length) setSelectedGrs(new Set());
    else setSelectedGrs(new Set(displayed.map(b => b.id)));
  }, [selectedGrs.size, displayed]);

  const userName = useMemo(() => user?.name || user?.username || '', [user?.name, user?.username]);

  /* ========== LOADING / ERROR / NOT FOUND ========== */
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto"><div className="absolute inset-0 rounded-full border-4 border-indigo-200"/><div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"/></div>
          <p className="mt-4 text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3"/>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => router.push('/hub-management')} className="px-4 py-2 bg-white border rounded-xl text-xs"><ArrowLeft className="h-3 w-3 inline mr-1"/>Back</button>
            <button onClick={fetchChallanDetails} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs"><RefreshCw className="h-3 w-3 inline mr-1"/>Retry</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!challan) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
          <Package className="h-10 w-10 text-yellow-400 mx-auto mb-3"/>
          <p className="text-sm text-yellow-600 mb-4">Challan <b>{decodeURIComponent(challan_no)}</b> not found.</p>
          <button onClick={() => router.push('/hub-management')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs"><ArrowLeft className="h-3 w-3 inline mr-1"/>Back</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />

      {/* HEADER */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-5 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/hub-management')} className="p-1.5 rounded-lg hover:bg-gray-100"><ArrowLeft className="h-4 w-4 text-gray-600"/></button>
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg"><Warehouse className="h-4 w-4 text-white"/></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-bold text-gray-900">Challan #{challan.challan_no}</h1>
                {challan.is_dispatched && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 border border-green-200"><CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5"/>Dispatched</span>}
                {!challan.is_dispatched && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200"><Clock className="h-2.5 w-2.5 inline mr-0.5"/>Pending</span>}
                {challan.is_received_at_hub && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><ShieldCheck className="h-2.5 w-2.5 inline mr-0.5"/>Received</span>}
              </div>
              <p className="text-[10px] text-gray-500">{challan.created_at ? format(new Date(challan.created_at), 'dd MMM yyyy, hh:mm a') : '-'}</p>
            </div>
            <button
              onClick={() => router.push('/transit-finance/cross-challan')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[11px] font-bold rounded-lg hover:from-violet-600 hover:to-purple-700 shadow-sm transition-all"
              title="Go to Cross Challan page"
            >
              <FileText className="h-3 w-3"/>Cross Challan
            </button>
            <button onClick={fetchChallanDetails} className="p-1.5 rounded-lg hover:bg-gray-100"><RefreshCw className="h-3.5 w-3.5 text-gray-500"/></button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-3 sm:px-5 py-4 space-y-4">

        {/* RECEIVED AT HUB */}
        <div className={`rounded-xl border p-3 ${challan.is_received_at_hub ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${challan.is_received_at_hub ? 'bg-emerald-100' : 'bg-indigo-50'}`}>
                <ShieldCheck className={`h-4 w-4 ${challan.is_received_at_hub ? 'text-emerald-600' : 'text-indigo-600'}`}/>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">{challan.is_received_at_hub ? 'Received at Hub' : 'Hub Receiving'}</h3>
                {challan.is_received_at_hub
                  ? <p className="text-[10px] text-emerald-700">{challan.received_at_hub_timing ? format(new Date(challan.received_at_hub_timing), 'dd MMM yy, hh:mm a') : '-'}</p>
                  : <p className="text-[10px] text-gray-500">Not yet received</p>}
              </div>
            </div>
            {!challan.is_received_at_hub && (
              <button onClick={handleReceivedAtHub} disabled={receivingAtHub}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-semibold rounded-lg hover:from-emerald-600 hover:to-green-700 shadow-sm disabled:opacity-50">
                {receivingAtHub ? <><Loader2 className="h-3 w-3 animate-spin"/>Marking...</> : <><ShieldCheck className="h-3 w-3"/>Received at Hub</>}
              </button>
            )}
          </div>
        </div>

        {/* INFO CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <IC icon={<MapPin className="h-3.5 w-3.5 text-blue-600"/>} t="Branch" v={challan.branch_name} bg="bg-blue-50"/>
          <IC icon={<Truck className="h-3.5 w-3.5 text-indigo-600"/>} t="Truck" v={challan.truck?.truck_number || '-'} s={challan.truck?.truck_type} bg="bg-indigo-50"/>
          <IC icon={<User className="h-3.5 w-3.5 text-purple-600"/>} t="Driver" v={challan.driver?.name || '-'} s={challan.driver?.mobile_number} bg="bg-purple-50"/>
          <IC icon={<User className="h-3.5 w-3.5 text-cyan-600"/>} t="Owner" v={challan.owner?.name || '-'} s={challan.owner?.mobile_number} bg="bg-cyan-50"/>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
          <DI l="Date" v={challan.date ? format(new Date(challan.date), 'dd MMM yy') : '-'}/>
          <DI l="GR" v={enrichedBilties.length}/>
          <DI l="Pkts" v={totalPkts}/>
          <DI l="Weight" v={`${totalWt.toFixed(1)}kg`}/>
          <DI l="Amount" v={`₹${totalAmt.toLocaleString('en-IN')}`}/>
          <DI l="Dispatch" v={challan.dispatch_date ? format(new Date(challan.dispatch_date), 'dd MMM yy') : 'Pending'}/>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SC icon={<CheckCircle className="h-4 w-4"/>} n={deliveredCount} l="Delivered" c="green"/>
          <SC icon={<Navigation className="h-4 w-4"/>} n={inTransitCount} l="Transit" c="amber"/>
          <SC icon={<Clock className="h-4 w-4"/>} n={pendingCount} l="Pending" c="gray"/>
          <SC icon={<MapPin className="h-4 w-4"/>} n={kanpurCount} l="Kanpur" c="orange"/>
        </div>

        {/* TRANSPORT ASSIGNMENT BAR */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-50 rounded-lg"><Truck className="h-4 w-4 text-teal-600"/></div>
            <div>
              <p className="text-xs font-bold text-gray-900">Transport Assignment</p>
              <p className="text-[10px] text-gray-500">
                <span className="text-teal-700 font-semibold">{assignedCount}</span> assigned · <span className="text-amber-600 font-semibold">{autoCount}</span> auto-assignable · <span className="text-sky-600 font-semibold">{hubRateApplicable}</span> hub rates available
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={bulkApplyHubRates} disabled={applyingHubRates || hubRateApplicable === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-sky-600 hover:to-blue-700 shadow-sm disabled:opacity-40 transition-all">
              {applyingHubRates ? <><Loader2 className="h-3 w-3 animate-spin"/>Applying...</> : <><Building2 className="h-3 w-3"/>Apply Hub Rates ({hubRateApplicable})</>}
            </button>
            <button onClick={autoAssignSingleTransports} disabled={autoAssigning || autoCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-teal-600 hover:to-emerald-700 shadow-sm disabled:opacity-40 transition-all">
              {autoAssigning ? <><Loader2 className="h-3 w-3 animate-spin"/>Assigning...</> : <><Truck className="h-3 w-3"/>Auto-Assign ({autoCount})</>}
            </button>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* SEARCH + FILTERS */}
          <div className="px-3 py-2 border-b border-gray-100 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-indigo-500"/>GR Details
                <span className="text-[10px] font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{displayed.length}/{enrichedBilties.length}</span>
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(grSearch || citySearch || transportSearch || kanpurFilter) && (
                  <button onClick={() => { setGrSearch(''); setCitySearch(''); setTransportSearch(''); setKanpurFilter(false); }}
                    className="text-[10px] px-2 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-0.5"><X className="h-2.5 w-2.5"/>Clear All</button>
                )}
                <button onClick={() => setKanpurFilter(!kanpurFilter)} disabled={loadingKanpur}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${kanpurFilter ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200'} disabled:opacity-50`}>
                  {loadingKanpur ? <Loader2 className="h-2.5 w-2.5 animate-spin inline mr-0.5"/> : <Filter className="h-2.5 w-2.5 inline mr-0.5"/>}
                  Kanpur ({kanpurCount})
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400"/>
                <input type="text" placeholder="Search GR No, City, Transport..." value={grSearch} onChange={e => setGrSearch(e.target.value)}
                  className="w-full pl-7 pr-7 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 outline-none"/>
                {grSearch && <button onClick={() => setGrSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-3 w-3 text-gray-400 hover:text-gray-600"/></button>}
              </div>
              <select value={citySearch} onChange={e => setCitySearch(e.target.value)}
                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 outline-none min-w-[140px] bg-white">
                <option value="">All Cities ({uniqueCities.length})</option>
                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="relative min-w-[220px]" ref={transportDropdownRef}>
                <button type="button" onClick={() => { setTransportDropdownOpen(!transportDropdownOpen); setTransportFilterText(''); }}
                  className={`w-full text-xs border rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 outline-none bg-white text-left flex items-center justify-between gap-1 ${transportSearch ? 'border-indigo-400 font-bold text-black' : 'border-gray-200 text-gray-500'}`}>
                  <span className="truncate">{transportSearch || `All Transports (${uniqueTransports.length})`}</span>
                  {transportSearch ? <X className="h-3.5 w-3.5 text-black hover:text-red-500 shrink-0" onClick={(e) => { e.stopPropagation(); setTransportSearch(''); setTransportDropdownOpen(false); }}/> : <ChevronDown className="h-3.5 w-3.5 text-gray-500 shrink-0"/>}
                </button>
                {transportDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input type="text" autoFocus placeholder="Search transport..." value={transportFilterText} onChange={e => setTransportFilterText(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 outline-none"/>
                    </div>
                    <div className="overflow-y-auto max-h-56">
                      <button onClick={() => { setTransportSearch(''); setTransportDropdownOpen(false); }}
                        className={`w-full text-left text-xs px-3 py-2 hover:bg-indigo-50 ${!transportSearch ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-black'}`}>
                        All Transports ({uniqueTransports.length})
                      </button>
                      {uniqueTransports.filter(t => t.toLowerCase().includes(transportFilterText.toLowerCase())).map(t => (
                        <button key={t} onClick={() => { setTransportSearch(t); setTransportDropdownOpen(false); }}
                          className={`w-full text-left text-xs px-3 py-2 hover:bg-indigo-50 ${transportSearch === t ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-black'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BULK ACTION BAR */}
          {selectedGrs.size > 0 && (
            <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-indigo-600"/>
                <span className="text-xs font-bold text-indigo-800">{selectedGrs.size} selected</span>
                <button onClick={() => setSelectedGrs(new Set())} className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded hover:bg-gray-50">Clear</button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowBulkPohonch(true)} disabled={!!bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 shadow-sm transition-all">
                  <FileText className="h-3 w-3"/>Assign Pohonch
                </button>
                <button onClick={() => bulkAction('branch', displayed)} disabled={!!bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 shadow-sm transition-all">
                  {bulkLoading === 'branch' ? <Loader2 className="h-3 w-3 animate-spin"/> : <span className="w-3 h-3 rounded-full bg-white/30 inline-block"/>}
                  Delivered at Branch
                </button>
                <button onClick={() => bulkAction('out', displayed)} disabled={!!bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-40 shadow-sm transition-all">
                  {bulkLoading === 'out' ? <Loader2 className="h-3 w-3 animate-spin"/> : <span className="w-3 h-3 rounded-full bg-white/30 inline-block"/>}
                  Out for Delivery
                </button>
                <button onClick={() => bulkAction('delivered', displayed)} disabled={!!bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-green-500 hover:bg-green-600 disabled:opacity-40 shadow-sm transition-all">
                  {bulkLoading === 'delivered' ? <Loader2 className="h-3 w-3 animate-spin"/> : <span className="w-3 h-3 rounded-full bg-white/30 inline-block"/>}
                  Delivered at Destination
                </button>
              </div>
            </div>
          )}

          {displayed.length === 0 ? (
            <div className="p-10 text-center">
              <Box className="h-8 w-8 text-gray-300 mx-auto mb-2"/>
              <p className="text-gray-500 text-xs">{grSearch || citySearch || transportSearch ? 'No matching bilties' : kanpurFilter ? 'No Kanpur bilties' : 'No bilties'}</p>
              {(grSearch || citySearch || transportSearch || kanpurFilter) && <button onClick={() => { setGrSearch(''); setCitySearch(''); setTransportSearch(''); setKanpurFilter(false); }} className="mt-2 text-[10px] px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200">Clear Filters</button>}
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-1.5 py-2 text-center w-7">
                        <button onClick={toggleSelectAll} className="text-indigo-600 hover:text-indigo-800">
                          {selectedGrs.size === displayed.length && displayed.length > 0 ? <CheckSquare className="h-3.5 w-3.5"/> : <Square className="h-3.5 w-3.5"/>}
                        </button>
                      </th>
                      <th className="px-1 py-2 text-left font-bold text-gray-700 w-6 text-[10px]">#</th>
                      <th className="px-1 py-2 text-center font-bold text-gray-700 w-6 text-[10px]">Img</th>
                      <th className="px-1.5 py-2 text-left font-bold text-gray-700 text-[10px]">GR No</th>
                      <th className="px-1.5 py-2 text-left font-bold text-gray-700 text-[10px]">Dest</th>
                      <th className="px-1.5 py-2 text-left font-bold text-gray-700 text-[10px]">Consignor / Consignee</th>
                      <th className="px-1.5 py-2 text-left font-bold text-gray-700 text-[10px]">Pvt Marks</th>
                      <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Pkts</th>
                      <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Wt</th>
                      <th className="px-1.5 py-2 text-right font-bold text-gray-700 text-[10px]">Amt</th>
                      <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Pay</th>
                      <th className="px-1.5 py-2 text-left font-bold text-gray-700 text-[10px] min-w-[130px]">Transport</th>
                      <th className="px-1.5 py-2 text-center font-bold text-gray-700 text-[10px]">Pohonch/Bilty#</th>
                      <th className="px-1.5 py-2 text-center font-bold text-gray-700 text-[10px]">Cross Challan</th>
                      <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Kaat</th>
                      <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Status</th>
                      <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Transit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayed.map(b => (
                      <BiltyTableRow
                        key={b.id}
                        b={b}
                        isSelected={selectedGrs.has(b.id)}
                        isKanpur={kanpurGrNos.has(b.gr_no)}
                        kanpurFilter={kanpurFilter}
                        kd={kaatData[b.gr_no]}
                        cityTransports={b.to_city_id ? (transportsByCity[b.to_city_id] || []) : []}
                        selectedTransportId={kaatData[b.gr_no]?.transport_id || ''}
                        isSavingTransport={!!savingTransport[b.gr_no]}
                        onToggleSelect={() => toggleSelect(b.id)}
                        onTransportChange={handleTransportChange}
                        onOpenKaat={openKaatModal}
                        onOpenAddTransport={openAddTransportModal}
                        onPreviewImage={setPreviewImage}
                        updatingTransit={updatingTransit}
                        onBranch={() => handleDeliveredAtBranch2(b)}
                        onOut={() => handleOutFromBranch2(b)}
                        onDelivered={() => handleDeliveredAtDestination(b)}
                        userName={userName}
                        crossChallanNo={crossChallanMap[b.gr_no] || null}
                        onPrintCrossChallan={crossChallanPrint.handlePrint}
                        printingCrossChallan={crossChallanPrint.printingPohonch}
                      />
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr className="font-bold text-[11px] text-black">
                      <td className="px-1.5 py-2" colSpan={7}>TOTAL ({displayed.length} GR)</td>
                      <td className="px-1 py-2 text-center">{footerTotals.packets}</td>
                      <td className="px-1 py-2 text-center">{footerTotals.weight.toFixed(1)}</td>
                      <td className="px-1.5 py-2 text-right">₹{footerTotals.amount.toLocaleString('en-IN')}</td>
                      <td colSpan={4}></td>
                      <td className="px-1 py-2 text-center text-emerald-700">₹{footerTotals.kaat.toFixed(0)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="lg:hidden divide-y divide-gray-100">
                {displayed.map(b => {
                  const selectedTransportId = kaatData[b.gr_no]?.transport_id || '';
                  return (
                    <BiltyMobileCard
                      key={b.id}
                      b={b}
                      isSelected={selectedGrs.has(b.id)}
                      isKanpur={kanpurGrNos.has(b.gr_no)}
                      kanpurFilter={kanpurFilter}
                      kd={kaatData[b.gr_no]}
                      cityTransports={b.to_city_id ? (transportsByCity[b.to_city_id] || []) : []}
                      selectedTransportId={selectedTransportId}
                      isSavingTransport={!!savingTransport[b.gr_no]}
                      selectedTransport={selectedTransportId ? transports.find(t => t.id === selectedTransportId) : null}
                      onToggleSelect={() => toggleSelect(b.id)}
                      onTransportChange={handleTransportChange}
                      onOpenKaat={openKaatModal}
                      onOpenAddTransport={openAddTransportModal}
                      onPreviewImage={setPreviewImage}
                      updatingTransit={updatingTransit}
                      onBranch={() => handleDeliveredAtBranch2(b)}
                      onOut={() => handleOutFromBranch2(b)}
                      onDelivered={() => handleDeliveredAtDestination(b)}
                      userName={userName}
                      crossChallanNo={crossChallanMap[b.gr_no] || null}
                      onPrintCrossChallan={crossChallanPrint.handlePrint}
                      printingCrossChallan={crossChallanPrint.printingPohonch}
                    />
                  );
                })}
                <div className="p-3 bg-gray-50">
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                    <div><p className="text-gray-400">Pkts</p><p className="font-bold">{footerTotals.packets}</p></div>
                    <div><p className="text-gray-400">Wt</p><p className="font-bold">{footerTotals.weight.toFixed(1)}</p></div>
                    <div><p className="text-gray-400">Amt</p><p className="font-bold">₹{footerTotals.amount.toLocaleString('en-IN')}</p></div>
                    <div><p className="text-gray-400">Kaat</p><p className="font-bold text-emerald-700">₹{footerTotals.kaat.toFixed(0)}</p></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODALS */}
      <ImagePreviewModal previewImage={previewImage} onClose={() => setPreviewImage(null)} />

      <KaatModal
        editingKaat={editingKaat} setEditingKaat={setEditingKaat}
        kaatForm={kaatForm} setKaatForm={setKaatForm}
        savingKaat={savingKaat} onSave={saveKaatForm}
        enrichedBilties={enrichedBilties} transportsByCity={transportsByCity}
        hubRatesByTransport={hubRatesByTransport}
        onOpenAddTransport={openAddTransportModal} onOpenAddHubRate={openAddHubRateModal}
        transports={transports}
      />

      <AddTransportModal
        show={showAddTransport} onClose={() => setShowAddTransport(false)}
        form={addTransportForm} setForm={setAddTransportForm}
        saving={savingNewTransport} onSave={saveNewTransport} cities={cities}
      />

      <AddHubRateModal
        show={showAddHubRate} onClose={() => setShowAddHubRate(false)}
        form={addHubRateForm} setForm={setAddHubRateForm}
        saving={savingNewHubRate} onSave={saveNewHubRate}
      />

      {/* BULK POHONCH MODAL */}
      {/* CROSS CHALLAN PDF PREVIEW MODAL (shared component) */}
      <CrossChallanPrintModal
        previewUrl={crossChallanPrint.previewUrl}
        previewName={crossChallanPrint.previewName}
        onDownload={crossChallanPrint.handleDownload}
        onClose={crossChallanPrint.handleClose}
      />

      {showBulkPohonch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-xl"><FileText className="h-4 w-4 text-indigo-600"/></div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Assign Pohonch Number</h3>
                  <p className="text-[10px] text-gray-500">{selectedGrs.size} GR{selectedGrs.size > 1 ? 's' : ''} selected</p>
                </div>
              </div>
              <button onClick={() => { setShowBulkPohonch(false); setBulkPohonchNo(''); }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500"/></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-indigo-700 mb-1">Selected GR Numbers:</p>
                <div className="flex flex-wrap gap-1">
                  {enrichedBilties.filter(b => selectedGrs.has(b.id)).map(b => (
                    <span key={b.id} className="text-[10px] font-bold bg-white text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">{b.gr_no}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Pohonch Number</label>
                <input
                  type="text"
                  value={bulkPohonchNo}
                  onChange={e => setBulkPohonchNo(e.target.value)}
                  placeholder="Enter pohonch number..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-gray-900 placeholder-gray-400"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && bulkPohonchNo.trim()) bulkAssignPohonch(); }}
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button onClick={() => { setShowBulkPohonch(false); setBulkPohonchNo(''); }}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={bulkAssignPohonch} disabled={savingBulkPohonch || !bulkPohonchNo.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                {savingBulkPohonch ? <><Loader2 className="h-3 w-3 animate-spin"/>Saving...</> : <>Assign to {selectedGrs.size} GRs</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
