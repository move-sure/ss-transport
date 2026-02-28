'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import Navbar from '../../../components/dashboard/navbar';
import { format } from 'date-fns';
import {
  Warehouse, Truck, Package, CheckCircle2, Clock, AlertCircle, RefreshCw,
  ArrowLeft, MapPin, User, CircleDot, CheckCircle, Navigation, Box,
  Building2, ClipboardList, ShieldCheck, Filter, X, Loader2,
  Search, Edit3, Save, ArrowRight,
} from 'lucide-react';

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

  // Search
  const [grSearch, setGrSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  // Kaat
  const [kaatData, setKaatData] = useState({});
  const [editingKaat, setEditingKaat] = useState(null);
  const [kaatForm, setKaatForm] = useState({});
  const [savingKaat, setSavingKaat] = useState(false);

  /* ========== DATA FETCHING ========== */
  const fetchKaatData = async (grNumbers) => {
    if (!grNumbers?.length) return;
    try {
      const { data } = await supabase.from('bilty_wise_kaat').select('*').in('gr_no', grNumbers);
      if (data) {
        const m = {};
        data.forEach(k => { m[k.gr_no] = k; });
        setKaatData(m);
      }
    } catch (e) { console.error('Kaat fetch error:', e); }
  };

  const fetchChallanDetails = useCallback(async () => {
    if (!user?.id || !challan_no) return;
    try {
      setLoading(true); setError(null);
      const dc = decodeURIComponent(challan_no);

      const [brRes, ciRes, chRes] = await Promise.all([
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
      ]);

      if (chRes.error) throw chRes.error;
      const bMap = {};
      (brRes.data || []).forEach(b => { bMap[b.id] = b.branch_name; });
      const cList = ciRes.data || [];
      setCities(cList);
      setChallan({ ...chRes.data, branch_name: bMap[chRes.data.branch_id] || '-' });

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
          labour_charge, bill_charge, toll_charge, dd_charge, other_charge, remark
        `).in('gr_no', grNos).eq('is_active', true) : Promise.resolve({ data: [] }),
        grNos.length ? supabase.from('station_bilty_summary').select(`
          id, station, gr_no, consignor, consignee, contents, no_of_packets,
          weight, payment_status, amount, pvt_marks, e_way_bill, delivery_type,
          created_at, w_name, transport_name, transport_gst
        `).in('gr_no', grNos) : Promise.resolve({ data: [] }),
      ]);

      const rBilties = rRes.data || [];
      const sBilties = sRes.data || [];

      const merged = ts.map((t, i) => {
        const r = rBilties.find(b => b.gr_no === t.gr_no);
        const s = sBilties.find(b => b.gr_no === t.gr_no);
        const fb = bMap[t.from_branch_id] || '-';
        const tb = bMap[t.to_branch_id] || '-';
        if (r) {
          const c = cList.find(x => x.id === r.to_city_id);
          return { ...t, idx:i+1, source:'bilty', from_branch_name:fb, to_branch_name:tb,
            consignor:r.consignor_name||'-', consignee:r.consignee_name||'-',
            destination:c?.city_name||'-', destination_code:c?.city_code||'', to_city_id:r.to_city_id,
            packets:r.no_of_pkg||0, weight:r.wt||0, amount:r.total||0,
            payment:r.payment_mode||'-', delivery_type:r.delivery_type||'-',
            contain:r.contain||'-', e_way_bill:r.e_way_bill||'', pvt_marks:r.pvt_marks||'',
            bilty_date:r.bilty_date, consignor_number:r.consignor_number||'',
            consignee_number:r.consignee_number||'', transport_name:r.transport_name||'',
            freight_amount:r.freight_amount||0, labour_charge:r.labour_charge||0,
            remark:r.remark||t.remarks||'' };
        } else if (s) {
          const c = cList.find(x => x.city_code === s.station);
          return { ...t, idx:i+1, source:'station_bilty_summary', from_branch_name:fb, to_branch_name:tb,
            consignor:s.consignor||'-', consignee:s.consignee||'-',
            destination:c?.city_name||s.station||'-', destination_code:s.station||'', to_city_id:c?.id||null,
            packets:s.no_of_packets||0, weight:s.weight||0, amount:s.amount||0,
            payment:s.payment_status||'-', delivery_type:s.delivery_type||'-',
            contain:s.contents||'-', e_way_bill:s.e_way_bill||'', pvt_marks:s.pvt_marks||'',
            bilty_date:s.created_at, consignor_number:'', consignee_number:'',
            transport_name:s.transport_name||'', freight_amount:s.amount||0,
            labour_charge:0, remark:t.remarks||'', w_name:s.w_name||'' };
        }
        return { ...t, idx:i+1, source:'unknown', from_branch_name:fb, to_branch_name:tb,
          consignor:'-', consignee:'-', destination:'-', destination_code:'', to_city_id:null,
          packets:0, weight:0, amount:0, payment:'-', delivery_type:'-', contain:'-',
          e_way_bill:'', pvt_marks:'', bilty_date:null, consignor_number:'', consignee_number:'',
          transport_name:'', freight_amount:0, labour_charge:0, remark:t.remarks||'' };
      });

      setEnrichedBilties(merged);
      if (grNos.length) { fetchKanpurBilties(grNos, cList); fetchKaatData(grNos); }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load challan details.');
    } finally { setLoading(false); }
  }, [user?.id, challan_no]);

  const fetchKanpurBilties = async (grNos, cityList) => {
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
  };

  useEffect(() => { fetchChallanDetails(); }, [fetchChallanDetails]);

  /* ========== TRANSIT STATUS ========== */
  const updateTransitStatus = async (transitId, grNo, field, dateField) => {
    if (!user?.id) return;
    const key = `${transitId}-${field}`;
    if (updatingTransit[key]) return;
    try {
      setUpdatingTransit(p => ({ ...p, [key]: true }));
      const now = new Date().toISOString();
      const { error: e } = await supabase.from('transit_details').update({ [field]: true, [dateField]: now, updated_by: user.id }).eq('id', transitId);
      if (e) throw e;
      setEnrichedBilties(p => p.map(b => b.id === transitId ? { ...b, [field]: true, [dateField]: now } : b));
      setTransitDetails(p => p.map(t => t.id === transitId ? { ...t, [field]: true, [dateField]: now } : t));
    } catch (e) { console.error(e); alert('Failed to update.'); }
    finally { setUpdatingTransit(p => ({ ...p, [key]: false })); }
  };

  const handleDeliveredAtBranch2 = (t) => {
    if (t.is_delivered_at_branch2) return;
    if (!confirm(`Mark GR ${t.gr_no} as "Delivered"?`)) return;
    updateTransitStatus(t.id, t.gr_no, 'is_delivered_at_branch2', 'delivered_at_branch2_date');
  };
  const handleOutFromBranch2 = (t) => {
    if (t.is_out_of_delivery_from_branch2) return;
    if (!confirm(`Mark GR ${t.gr_no} as "Out for Delivery"?`)) return;
    updateTransitStatus(t.id, t.gr_no, 'is_out_of_delivery_from_branch2', 'out_of_delivery_from_branch2_date');
  };
  const handleDeliveredAtDestination = (t) => {
    if (t.is_delivered_at_destination) return;
    if (!confirm(`Mark GR ${t.gr_no} as "Delivered at Destination"?`)) return;
    updateTransitStatus(t.id, t.gr_no, 'is_delivered_at_destination', 'delivered_at_destination_date');
  };
  const handleOutForDoorDelivery = (t) => {
    if (t.out_for_door_delivery) return;
    if (!confirm(`Mark GR ${t.gr_no} as "Out for Door Delivery"?`)) return;
    updateTransitStatus(t.id, t.gr_no, 'out_for_door_delivery', 'out_for_door_delivery_date');
  };

  const handleReceivedAtHub = async () => {
    if (!user?.id || !challan?.id || challan.is_received_at_hub) return;
    if (!confirm('Mark as "Received at Hub"?')) return;
    try {
      setReceivingAtHub(true);
      const now = new Date().toISOString();
      const { error: e } = await supabase.from('challan_details').update({ is_received_at_hub: true, received_at_hub_timing: now, received_by_user: user.id }).eq('id', challan.id);
      if (e) throw e;
      setChallan(p => ({ ...p, is_received_at_hub: true, received_at_hub_timing: now }));
    } catch (e) { console.error(e); alert('Failed.'); }
    finally { setReceivingAtHub(false); }
  };

  /* ========== KAAT MANAGEMENT ========== */
  const openKaatModal = (grNo) => {
    const k = kaatData[grNo] || {};
    setKaatForm({
      pohonch_no: k.pohonch_no || '', bilty_number: k.bilty_number || '',
      kaat: k.kaat || 0, pf: k.pf || 0, actual_kaat_rate: k.actual_kaat_rate || 0,
      dd_chrg: k.dd_chrg || 0, bilty_chrg: k.bilty_chrg || 0,
      ewb_chrg: k.ewb_chrg || 0, labour_chrg: k.labour_chrg || 0, other_chrg: k.other_chrg || 0,
    });
    setEditingKaat(grNo);
  };

  const saveKaatForm = async () => {
    if (!editingKaat || !user?.id) return;
    setSavingKaat(true);
    try {
      const bi = enrichedBilties.find(b => b.gr_no === editingKaat);
      const payload = {
        gr_no: editingKaat, challan_no: challan.challan_no,
        destination_city_id: bi?.to_city_id || null,
        pohonch_no: kaatForm.pohonch_no || null, bilty_number: kaatForm.bilty_number || null,
        kaat: parseFloat(kaatForm.kaat) || 0, pf: parseFloat(kaatForm.pf) || 0,
        actual_kaat_rate: parseFloat(kaatForm.actual_kaat_rate) || 0,
        dd_chrg: parseFloat(kaatForm.dd_chrg) || 0, bilty_chrg: parseFloat(kaatForm.bilty_chrg) || 0,
        ewb_chrg: parseFloat(kaatForm.ewb_chrg) || 0, labour_chrg: parseFloat(kaatForm.labour_chrg) || 0,
        other_chrg: parseFloat(kaatForm.other_chrg) || 0,
        updated_by: user.id, updated_at: new Date().toISOString(),
      };
      if (!kaatData[editingKaat]) payload.created_by = user.id;
      const { data, error } = await supabase.from('bilty_wise_kaat').upsert(payload, { onConflict: 'gr_no' }).select().single();
      if (error) throw error;
      setKaatData(p => ({ ...p, [editingKaat]: data }));
      setEditingKaat(null);
    } catch (e) { console.error(e); alert('Failed to save kaat data.'); }
    finally { setSavingKaat(false); }
  };

  const kTotal = (k) => !k ? 0 : ['kaat','pf','dd_chrg','bilty_chrg','ewb_chrg','labour_chrg','other_chrg'].reduce((s,f) => s + (parseFloat(k[f]) || 0), 0);

  /* ========== COMPUTED ========== */
  let displayed = enrichedBilties;
  if (kanpurFilter) displayed = displayed.filter(t => kanpurGrNos.has(t.gr_no));
  if (grSearch.trim()) displayed = displayed.filter(t => t.gr_no?.toLowerCase().includes(grSearch.trim().toLowerCase()));
  if (citySearch) displayed = displayed.filter(t => t.destination === citySearch);
  const kanpurCount = enrichedBilties.filter(t => kanpurGrNos.has(t.gr_no)).length;
  const uniqueCities = [...new Set(enrichedBilties.map(b => b.destination).filter(d => d && d !== '-'))].sort();

  const getStatus = (t) => {
    if (t.is_delivered_at_destination) return { l:'Delivered', c:'green' };
    if (t.out_for_door_delivery) return { l:'Door Dlvry', c:'blue' };
    if (t.is_out_of_delivery_from_branch2) return { l:'Out B2', c:'cyan' };
    if (t.is_delivered_at_branch2) return { l:'At B2', c:'purple' };
    if (t.is_out_of_delivery_from_branch1) return { l:'Transit', c:'amber' };
    return { l:'Pending', c:'gray' };
  };

  const stClr = {
    green:'bg-green-100 text-green-700 border-green-200',
    blue:'bg-blue-100 text-blue-700 border-blue-200',
    cyan:'bg-cyan-100 text-cyan-700 border-cyan-200',
    purple:'bg-purple-100 text-purple-700 border-purple-200',
    amber:'bg-amber-100 text-amber-700 border-amber-200',
    gray:'bg-gray-100 text-gray-600 border-gray-200',
  };

  const payBadge = (p) => {
    const pm = (p||'').toLowerCase();
    if (pm === 'paid') return 'bg-green-100 text-green-700';
    if (pm.includes('to') && pm.includes('pay')) return 'bg-red-100 text-red-700';
    if (pm === 'foc') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-600';
  };

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

  const deliveredCount = enrichedBilties.filter(t => t.is_delivered_at_destination).length;
  const inTransitCount = enrichedBilties.filter(t => t.is_out_of_delivery_from_branch1 && !t.is_delivered_at_destination).length;
  const pendingCount = enrichedBilties.filter(t => !t.is_out_of_delivery_from_branch1).length;
  const totalPkts = enrichedBilties.reduce((s, b) => s + (b.packets || 0), 0);
  const totalWt = enrichedBilties.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0);
  const totalAmt = enrichedBilties.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);

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
          <IC icon={<Truck className="h-3.5 w-3.5 text-indigo-600"/>} t="Truck" v={challan.truck?.truck_number||'-'} s={challan.truck?.truck_type} bg="bg-indigo-50"/>
          <IC icon={<User className="h-3.5 w-3.5 text-purple-600"/>} t="Driver" v={challan.driver?.name||'-'} s={challan.driver?.mobile_number} bg="bg-purple-50"/>
          <IC icon={<User className="h-3.5 w-3.5 text-cyan-600"/>} t="Owner" v={challan.owner?.name||'-'} s={challan.owner?.mobile_number} bg="bg-cyan-50"/>
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
                {(grSearch || citySearch || kanpurFilter) && (
                  <button onClick={() => { setGrSearch(''); setCitySearch(''); setKanpurFilter(false); }}
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
                <input type="text" placeholder="Search GR No..." value={grSearch} onChange={e => setGrSearch(e.target.value)}
                  className="w-full pl-7 pr-7 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 outline-none"/>
                {grSearch && <button onClick={() => setGrSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-3 w-3 text-gray-400 hover:text-gray-600"/></button>}
              </div>
              <select value={citySearch} onChange={e => setCitySearch(e.target.value)}
                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 outline-none min-w-[140px] bg-white">
                <option value="">All Cities ({uniqueCities.length})</option>
                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {displayed.length === 0 ? (
            <div className="p-10 text-center">
              <Box className="h-8 w-8 text-gray-300 mx-auto mb-2"/>
              <p className="text-gray-500 text-xs">{grSearch || citySearch ? 'No matching bilties' : kanpurFilter ? 'No Kanpur bilties' : 'No bilties'}</p>
              {(grSearch || citySearch || kanpurFilter) && <button onClick={() => { setGrSearch(''); setCitySearch(''); setKanpurFilter(false); }} className="mt-2 text-[10px] px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200">Clear Filters</button>}
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-2.5 text-left font-bold text-gray-700 w-8">#</th>
                      <th className="px-2 py-2.5 text-left font-bold text-gray-700">GR No</th>
                      <th className="px-2 py-2.5 text-left font-bold text-gray-700">Dest</th>
                      <th className="px-2 py-2.5 text-left font-bold text-gray-700">Consignor</th>
                      <th className="px-2 py-2.5 text-left font-bold text-gray-700">Consignee</th>
                      <th className="px-2 py-2.5 text-center font-bold text-gray-700">Pkts</th>
                      <th className="px-2 py-2.5 text-center font-bold text-gray-700">Wt</th>
                      <th className="px-2 py-2.5 text-right font-bold text-gray-700">Amt</th>
                      <th className="px-2 py-2.5 text-center font-bold text-gray-700">Pay</th>
                      <th className="px-2 py-2.5 text-center font-bold text-gray-700">Pohonch / Bilty#</th>
                      <th className="px-2 py-2.5 text-center font-bold text-gray-700">Kaat</th>
                      <th className="px-2 py-2.5 text-center font-bold text-gray-700">Status</th>
                      <th className="px-2 py-2.5 text-center font-bold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayed.map(b => {
                      const st = getStatus(b);
                      const isKnp = kanpurGrNos.has(b.gr_no);
                      const kd = kaatData[b.gr_no];
                      const kt = kTotal(kd);
                      const isMNL = b.source !== 'bilty';
                      const pohonchVal = isMNL ? (kd?.pohonch_no || '') : (kd?.bilty_number || '');
                      return (
                        <tr key={b.id} className={`hover:bg-blue-50/40 ${isKnp && !kanpurFilter ? 'border-l-2 border-l-orange-400 bg-orange-50/30' : ''}`}>
                          <td className="px-2 py-2 text-gray-500 font-medium">{b.idx}</td>
                          <td className="px-2 py-2">
                            <div className="font-bold text-indigo-700">{b.gr_no}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{isMNL?'MNL':'REG'}{isKnp && <span className="ml-1 text-orange-600 font-bold">• KNP</span>}</div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="font-semibold text-black truncate max-w-[90px]" title={b.destination}>{b.destination}</div>
                          </td>
                          <td className="px-2 py-2"><div className="text-black truncate max-w-[110px]" title={b.consignor}>{b.consignor}</div></td>
                          <td className="px-2 py-2"><div className="text-black truncate max-w-[110px]" title={b.consignee}>{b.consignee}</div></td>
                          <td className="px-2 py-2 text-center font-bold text-black">{b.packets}</td>
                          <td className="px-2 py-2 text-center font-medium text-black">{parseFloat(b.weight||0).toFixed(1)}</td>
                          <td className="px-2 py-2 text-right font-bold text-black">₹{parseFloat(b.amount||0).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${payBadge(b.payment)}`}>{b.payment}</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {(kd?.pohonch_no || kd?.bilty_number) ? (
                              <span className="font-bold text-black text-xs">
                                {kd?.pohonch_no ? kd.pohonch_no : kd.bilty_number}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                            <div className="text-[9px] text-gray-400 mt-0.5">
                              {kd?.pohonch_no ? 'Pohonch' : kd?.bilty_number ? 'Bilty#' : 'Pohonch/Bilty#'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => openKaatModal(b.gr_no)}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors">
                              <Edit3 className="h-3 w-3"/> {kt > 0 ? `₹${kt.toFixed(0)}` : 'Add'}
                            </button>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${stClr[st.c]}`}>
                              <CircleDot className="h-2.5 w-2.5"/>{st.l}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {isKnp ? (
                                <>
                                  <ActionBtn done={b.is_delivered_at_branch2} loading={updatingTransit[`${b.id}-is_delivered_at_branch2`]} onClick={() => handleDeliveredAtBranch2(b)} label="Dlvrd" doneLabel="✓ Dlvrd" color="green"/>
                                  {(b.delivery_type||'').toLowerCase()==='door' && <ActionBtn done={b.out_for_door_delivery} loading={updatingTransit[`${b.id}-out_for_door_delivery`]} onClick={() => handleOutForDoorDelivery(b)} label="DD" doneLabel="✓ DD" color="blue"/>}
                                </>
                              ) : (
                                <ActionBtn done={b.is_out_of_delivery_from_branch2} loading={updatingTransit[`${b.id}-is_out_of_delivery_from_branch2`]} onClick={() => handleOutFromBranch2(b)} label="Out" doneLabel="✓ Out" color="cyan"/>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr className="font-bold text-xs text-black">
                      <td className="px-2 py-2.5" colSpan={5}>TOTAL ({displayed.length} GR)</td>
                      <td className="px-2 py-2.5 text-center">{displayed.reduce((s,b)=>s+(b.packets||0),0)}</td>
                      <td className="px-2 py-2.5 text-center">{displayed.reduce((s,b)=>s+(parseFloat(b.weight)||0),0).toFixed(1)}</td>
                      <td className="px-2 py-2.5 text-right">₹{displayed.reduce((s,b)=>s+(parseFloat(b.amount)||0),0).toLocaleString('en-IN')}</td>
                      <td colSpan={2}></td>
                      <td className="px-2 py-2.5 text-center text-violet-700">₹{displayed.reduce((s,b)=>s+kTotal(kaatData[b.gr_no]),0).toFixed(0)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="lg:hidden divide-y divide-gray-100">
                {displayed.map(b => {
                  const st = getStatus(b);
                  const isKnp = kanpurGrNos.has(b.gr_no);
                  const kd = kaatData[b.gr_no];
                  const kt = kTotal(kd);
                  const isMNL = b.source !== 'bilty';
                  const pohonchVal = isMNL ? (kd?.pohonch_no || '') : (kd?.bilty_number || '');
                  return (
                    <div key={b.id} className={`p-3 ${isKnp && !kanpurFilter ? 'border-l-3 border-l-orange-400 bg-orange-50/30' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 bg-indigo-100 rounded text-indigo-700 text-[10px] font-bold flex items-center justify-center">{b.idx}</span>
                          <span className="font-bold text-indigo-700 text-sm">{b.gr_no}</span>
                          {isKnp && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700">KNP</span>}
                          <span className="text-[9px] text-gray-500 font-medium">{isMNL?'MNL':'REG'}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stClr[st.c]}`}>{st.l}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-2">
                        <div><span className="text-gray-500">Dest:</span> <span className="font-bold text-black">{b.destination}</span></div>
                        <div><span className="text-gray-500">Pay:</span> <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${payBadge(b.payment)}`}>{b.payment}</span></div>
                        <div><span className="text-gray-500">Consignor:</span> <span className="font-semibold text-black truncate">{b.consignor}</span></div>
                        <div><span className="text-gray-500">Consignee:</span> <span className="font-semibold text-black truncate">{b.consignee}</span></div>
                        <div><span className="text-gray-500">Pkts:</span> <b className="text-black">{b.packets}</b> | <span className="text-gray-500">Wt:</span> <b className="text-black">{parseFloat(b.weight||0).toFixed(1)}</b></div>
                        <div><span className="text-gray-500">Amt:</span> <b className="text-black">₹{parseFloat(b.amount||0).toLocaleString('en-IN')}</b></div>
                        {pohonchVal && <div><span className="text-gray-500">{isMNL ? 'Pohonch:' : 'Bilty#:'}</span> <b className="text-black text-sm">{pohonchVal}</b></div>}
                        {kt > 0 && <div><span className="text-gray-500">Kaat:</span> <b className="text-violet-700">₹{kt.toFixed(0)}</b></div>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => openKaatModal(b.gr_no)} className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100"><Edit3 className="h-3 w-3 inline mr-0.5"/>Kaat</button>
                        {isKnp ? (
                          <>
                            <ActionBtn done={b.is_delivered_at_branch2} loading={updatingTransit[`${b.id}-is_delivered_at_branch2`]} onClick={() => handleDeliveredAtBranch2(b)} label="Dlvrd" doneLabel="✓Dlvrd" color="green"/>
                            {(b.delivery_type||'').toLowerCase()==='door' && <ActionBtn done={b.out_for_door_delivery} loading={updatingTransit[`${b.id}-out_for_door_delivery`]} onClick={() => handleOutForDoorDelivery(b)} label="DD" doneLabel="✓DD" color="blue"/>}
                          </>
                        ) : (
                          <ActionBtn done={b.is_out_of_delivery_from_branch2} loading={updatingTransit[`${b.id}-is_out_of_delivery_from_branch2`]} onClick={() => handleOutFromBranch2(b)} label="Out" doneLabel="✓Out" color="cyan"/>
                        )}
                      </div>
                      {(b.delivered_at_branch2_date || b.out_of_delivery_from_branch2_date || b.delivered_at_destination_date) && (
                        <div className="mt-1.5 flex flex-wrap gap-1 text-[9px]">
                          {b.delivered_at_branch2_date && <span className="bg-purple-50 text-purple-600 px-1 py-0.5 rounded">B2: {format(new Date(b.delivered_at_branch2_date), 'dd/MM HH:mm')}</span>}
                          {b.out_of_delivery_from_branch2_date && <span className="bg-cyan-50 text-cyan-600 px-1 py-0.5 rounded">Out: {format(new Date(b.out_of_delivery_from_branch2_date), 'dd/MM HH:mm')}</span>}
                          {b.delivered_at_destination_date && <span className="bg-green-50 text-green-600 px-1 py-0.5 rounded">Dlvd: {format(new Date(b.delivered_at_destination_date), 'dd/MM HH:mm')}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="p-3 bg-gray-50">
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                    <div><p className="text-gray-400">Pkts</p><p className="font-bold">{displayed.reduce((s,b)=>s+(b.packets||0),0)}</p></div>
                    <div><p className="text-gray-400">Wt</p><p className="font-bold">{displayed.reduce((s,b)=>s+(parseFloat(b.weight)||0),0).toFixed(1)}</p></div>
                    <div><p className="text-gray-400">Amt</p><p className="font-bold">₹{displayed.reduce((s,b)=>s+(parseFloat(b.amount)||0),0).toLocaleString('en-IN')}</p></div>
                    <div><p className="text-gray-400">Kaat</p><p className="font-bold text-violet-700">₹{displayed.reduce((s,b)=>s+kTotal(kaatData[b.gr_no]),0).toFixed(0)}</p></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KAAT MODAL */}
      {editingKaat && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingKaat(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Kaat & Pohonch Management</h3>
                <p className="text-[10px] text-gray-500">GR: <b className="text-indigo-700">{editingKaat}</b>
                  {enrichedBilties.find(b => b.gr_no === editingKaat)?.destination && (
                    <span className="ml-1">→ {enrichedBilties.find(b => b.gr_no === editingKaat)?.destination}</span>
                  )}
                </p>
              </div>
              <button onClick={() => setEditingKaat(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500"/></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Pohonch or Bilty Number - only one allowed at a time */}
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase mb-2">Identification</p>
                <div className="grid grid-cols-2 gap-3">
                  <KF label="Pohonch No" value={kaatForm.pohonch_no} onChange={v => setKaatForm(p => ({...p, pohonch_no: v, bilty_number: v ? '' : kaatForm.bilty_number}))} type="text" big disabled={!!kaatForm.bilty_number}/>
                  <KF label="Bilty Number" value={kaatForm.bilty_number} onChange={v => setKaatForm(p => ({...p, bilty_number: v, pohonch_no: v ? '' : kaatForm.pohonch_no}))} type="text" big disabled={!!kaatForm.pohonch_no}/>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Only one can be filled at a time.</p>
              </div>
              {/* Charges */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-bold text-gray-700 uppercase mb-2">Charges & Kaat</p>
                <div className="grid grid-cols-3 gap-2">
                  <KF label="Kaat (₹)" value={kaatForm.kaat} onChange={v => setKaatForm(p => ({...p, kaat: v}))}/>
                  <KF label="PF (₹)" value={kaatForm.pf} onChange={v => setKaatForm(p => ({...p, pf: v}))}/>
                  <KF label="Actual Rate" value={kaatForm.actual_kaat_rate} onChange={v => setKaatForm(p => ({...p, actual_kaat_rate: v}))}/>
                  <KF label="DD Chrg (₹)" value={kaatForm.dd_chrg} onChange={v => setKaatForm(p => ({...p, dd_chrg: v}))}/>
                  <KF label="Bilty Chrg (₹)" value={kaatForm.bilty_chrg} onChange={v => setKaatForm(p => ({...p, bilty_chrg: v}))}/>
                  <KF label="EWB Chrg (₹)" value={kaatForm.ewb_chrg} onChange={v => setKaatForm(p => ({...p, ewb_chrg: v}))}/>
                  <KF label="Labour (₹)" value={kaatForm.labour_chrg} onChange={v => setKaatForm(p => ({...p, labour_chrg: v}))}/>
                  <KF label="Other (₹)" value={kaatForm.other_chrg} onChange={v => setKaatForm(p => ({...p, other_chrg: v}))}/>
                </div>
              </div>
              {/* Total & Save */}
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-gray-500">Total Charges:</span>
                  <span className="ml-1 font-bold text-violet-700 text-base">
                    ₹{(['kaat','pf','dd_chrg','bilty_chrg','ewb_chrg','labour_chrg','other_chrg'].reduce((s,f) => s + (parseFloat(kaatForm[f]) || 0), 0)).toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingKaat(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={saveKaatForm} disabled={savingKaat}
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                    {savingKaat ? <Loader2 className="h-3 w-3 animate-spin"/> : <Save className="h-3 w-3"/>} Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== KAAT FIELD ===== */
function KF({ label, value, onChange, type = 'number', big, disabled }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black font-semibold ${big ? 'px-3 py-2.5 text-base' : 'px-2.5 py-2 text-sm'} ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
        step={type === 'number' ? '0.01' : undefined}
        placeholder={type === 'text' ? `Enter ${label}...` : '0'}
        disabled={disabled}
      />
    </div>
  );
}

/* ===== ACTION BUTTON ===== */
function ActionBtn({ done, loading, onClick, label, doneLabel, color }) {
  if (done) {
    const dc = { purple:'bg-purple-100 text-purple-800', cyan:'bg-cyan-100 text-cyan-800', green:'bg-green-100 text-green-800', blue:'bg-blue-100 text-blue-800' };
    return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${dc[color]||'bg-gray-100 text-gray-800'}`}>{doneLabel}</span>;
  }
  const bc = { purple:'bg-purple-600 hover:bg-purple-700', cyan:'bg-cyan-600 hover:bg-cyan-700', green:'bg-green-600 hover:bg-green-700', blue:'bg-blue-600 hover:bg-blue-700' };
  return (
    <button onClick={onClick} disabled={loading}
      className={`px-2.5 py-1 text-[10px] font-bold text-white rounded-md shadow-sm transition-all disabled:opacity-40 ${bc[color]||'bg-gray-600'}`}>
      {loading ? <Loader2 className="h-3 w-3 animate-spin inline mr-0.5"/> : null}{label}
    </button>
  );
}

function IC({ icon, t, v, s, bg }) {
  return (
    <div className={`${bg} rounded-lg p-2 border border-white/60`}>
      <div className="flex items-center gap-2">
        <div className="p-1 bg-white/80 rounded">{icon}</div>
        <div className="min-w-0">
          <p className="text-[9px] font-medium text-gray-500 uppercase">{t}</p>
          <p className="text-[11px] font-bold text-gray-900 truncate">{v}</p>
          {s && <p className="text-[9px] text-gray-500 truncate">{s}</p>}
        </div>
      </div>
    </div>
  );
}

function DI({ l, v }) {
  return (<div><p className="text-[9px] text-gray-400 uppercase">{l}</p><p className="text-xs font-bold text-gray-800">{v}</p></div>);
}

function SC({ icon, n, l, c }) {
  const cs = { green:'bg-green-50 border-green-100 text-green-600', amber:'bg-amber-50 border-amber-100 text-amber-600', gray:'bg-gray-50 border-gray-200 text-gray-500', orange:'bg-orange-50 border-orange-100 text-orange-600' };
  return (<div className={`rounded-lg p-2 border text-center ${cs[c]||cs.gray}`}><div className="flex justify-center mb-0.5">{icon}</div><p className="text-lg font-bold">{n}</p><p className="text-[9px] font-medium">{l}</p></div>);
}