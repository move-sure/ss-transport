'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../utils/auth';
import supabase from '../../../utils/supabase';
import Navbar from '../../../../components/dashboard/navbar';
import { format } from 'date-fns';
import {
  ArrowLeft, Package, MapPin, User, Phone, FileText,
  Truck, CreditCard, Clock, Eye, Loader2, X, CheckCircle2,
} from 'lucide-react';
import { generatePodPdf } from '../../../../components/hub-management/PodPdfGenerator';
import { kTotal } from '../../../../components/hub-management/HubHelpers';

export default function BiltyDetailPage() {
  const { challan_no, bilty_no } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [bilty, setBilty] = useState(null);
  const [challan, setChallan] = useState(null);
  const [kaatData, setKaatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // POD form modal
  const [podUrl, setPodUrl] = useState(null);
  const [podForm, setPodForm] = useState({ delivered_at: '', payment_mode: '', mobile_number_1: '', mobile_number_2: '', total_amount: '', amount_given: '', reminder: '', consignor_name: '', consignor_gst: '' });
  const [podSaving, setPodSaving] = useState(false);
  const [podSaved, setPodSaved] = useState(false);
  const [podNo, setPodNo] = useState('');
  const [podOpen, setPodOpen] = useState(false);

  const fmtDate = (d) => {
    if (!d) return '-';
    try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '-'; }
  };

  const fetchData = useCallback(async () => {
    if (!user?.id || !challan_no || !bilty_no) return;
    try {
      setLoading(true);
      setError(null);
      const dc = decodeURIComponent(challan_no);
      const db = decodeURIComponent(bilty_no);

      // Fetch challan
      const { data: chData, error: chErr } = await supabase
        .from('challan_details')
        .select(`id, challan_no, branch_id, date, is_received_at_hub, received_at_hub_timing,
          truck:trucks(id, truck_number, truck_type),
          owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
          driver:staff!challan_details_driver_id_fkey(id, name, mobile_number)`)
        .eq('challan_no', dc)
        .single();
      if (chErr) throw chErr;
      setChallan(chData);

      // Fetch transit detail for this GR
      const { data: tdArr } = await supabase
        .from('transit_details')
        .select('*')
        .eq('challan_id', chData.id)
        .eq('gr_no', db);
      const td = tdArr?.[0] || null;

      // Fetch cities for destination lookup
      const { data: cityList } = await supabase.from('cities').select('id, city_name, city_code');
      const cityMap = new Map();
      (cityList || []).forEach(c => { cityMap.set(c.id, c); if (c.city_code) cityMap.set(`code_${c.city_code}`, c); });

      // Fetch bilty from both tables
      let biltyObj = null;
      const { data: regBilty } = await supabase
        .from('bilty')
        .select('*')
        .eq('gr_no', db)
        .eq('is_active', true)
        .maybeSingle();
      if (regBilty) {
        const city = cityMap.get(regBilty.to_city_id);
        biltyObj = {
          ...regBilty, source: 'bilty',
          consignor: regBilty.consignor_name || '-',
          consignee: regBilty.consignee_name || '-',
          destination: city?.city_name || '-',
          packets: regBilty.no_of_pkg || 0,
          weight: regBilty.wt || 0,
          amount: regBilty.total || 0,
          payment: regBilty.payment_mode || '-',
          freight: regBilty.freight_amount || 0,
        };
      } else {
        const { data: mnlBilty } = await supabase
          .from('station_bilty_summary')
          .select('*')
          .eq('gr_no', db)
          .maybeSingle();
        if (mnlBilty) {
          const city = cityMap.get(`code_${mnlBilty.station}`);
          biltyObj = {
            ...mnlBilty, source: 'manual',
            consignor: mnlBilty.consignor || '-',
            consignee: mnlBilty.consignee || '-',
            destination: city?.city_name || mnlBilty.station || '-',
            packets: mnlBilty.no_of_packets || 0,
            weight: mnlBilty.weight || 0,
            amount: mnlBilty.amount || 0,
            payment: mnlBilty.payment_status || '-',
            contain: mnlBilty.contents || '-',
            freight: mnlBilty.amount || 0,
            consignor_number: '',
            consignee_number: '',
            consignor_gst: '',
            w_name: mnlBilty.w_name || '',
          };
        }
      }

      if (!biltyObj) {
        setError('Bilty not found');
        return;
      }

      // Merge transit data
      if (td) {
        biltyObj.delivered_at_branch = td.delivered_at_branch;
        biltyObj.delivered_at_branch_timing = td.delivered_at_branch_timing;
        biltyObj.out_from_branch = td.out_from_branch;
        biltyObj.out_from_branch_timing = td.out_from_branch_timing;
        biltyObj.delivered_at_destination = td.delivered_at_destination;
        biltyObj.delivered_at_destination_timing = td.delivered_at_destination_timing;
      }

      setBilty(biltyObj);

      // Fetch kaat data
      const { data: kd } = await supabase
        .from('bilty_wise_kaat')
        .select('*')
        .eq('gr_no', db)
        .maybeSingle();
      setKaatData(kd);
    } catch (e) {
      console.error('Fetch error:', e);
      setError(e.message || 'Failed to load bilty details');
    } finally {
      setLoading(false);
    }
  }, [user?.id, challan_no, bilty_no]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGeneratePod = useCallback(async () => {
    if (!bilty) return;
    setPodOpen(true);
    setPodUrl(null);
    setPodSaved(false);
    setPodNo('');
    // Load existing POD data if any
    const { data } = await supabase.from('pod_details').select('*').eq('gr_no', bilty.gr_no).maybeSingle();
    if (data) {
      setPodForm({
        delivered_at: data.delivered_at ? new Date(data.delivered_at).toISOString().slice(0, 16) : '',
        payment_mode: data.payment_mode || '',
        mobile_number_1: data.mobile_number_1 || '',
        mobile_number_2: data.mobile_number_2 || '',
        total_amount: data.total_amount ?? '',
        amount_given: data.amount_given ?? '',
        reminder: data.reminder || '',
        consignor_name: data.consignor_name || '',
        consignor_gst: data.consignor_gst || '',
      });
      setPodNo(data.pod_no || '');
      setPodSaved(true);
    } else {
      // Fetch next pod_no
      const { data: latestPod } = await supabase.from('pod_details').select('pod_no').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (latestPod?.pod_no) {
        const num = parseInt(latestPod.pod_no.replace('KNP', ''), 10) || 0;
        setPodNo('KNP' + String(num + 1).padStart(5, '0'));
      } else {
        setPodNo('KNP00001');
      }
      let pay = bilty.payment && bilty.payment !== '-' ? bilty.payment.toUpperCase() : '';
      const isDD = bilty.delivery_type && (bilty.delivery_type.toLowerCase().includes('door') || bilty.delivery_type.toLowerCase() === 'dd');
      if (isDD && pay === 'PAID') pay = 'PAID/DD';
      if (isDD && pay === 'TO-PAY') pay = 'TO-PAY/DD';
      const amt = parseFloat(bilty.amount) || 0;
      const isPaid = pay === 'PAID' || pay === 'PAID/DD';
      setPodForm({
        delivered_at: new Date().toISOString().slice(0, 16),
        payment_mode: pay,
        mobile_number_1: bilty.consignor_number || '',
        mobile_number_2: bilty.consignee_number || '',
        total_amount: amt || '',
        amount_given: isPaid ? 50 : (amt ? amt + 50 : ''),
        reminder: '',
        consignor_name: bilty.consignor || '',
        consignor_gst: bilty.consignor_gst || '',
      });
    }
  }, [bilty]);

  const podBasicFilled = podForm.delivered_at && podForm.total_amount;

  const savePodDetails = useCallback(async () => {
    if (!bilty || !user?.id) return;
    setPodSaving(true);
    try {
      const validModes = ['PAID', 'TO-PAY', 'PAID/DD', 'TO-PAY/DD'];
      const payMode = podForm.payment_mode && validModes.includes(podForm.payment_mode) ? podForm.payment_mode : null;
      const payload = {
        gr_no: bilty.gr_no,
        challan_no: challan?.challan_no || decodeURIComponent(challan_no),
        payment_mode: payMode,
        delivered_at: podForm.delivered_at ? new Date(podForm.delivered_at).toISOString() : null,
        mobile_number_1: podForm.mobile_number_1 || null,
        mobile_number_2: podForm.mobile_number_2 || null,
        total_amount: parseFloat(podForm.total_amount) || 0,
        amount_given: parseFloat(podForm.amount_given) || 0,
        reminder: podForm.reminder || null,
        consignor_name: podForm.consignor_name || null,
        consignor_gst: podForm.consignor_gst || null,
      };
      const { data: existing } = await supabase.from('pod_details').select('id, pod_no').eq('gr_no', bilty.gr_no).maybeSingle();
      if (existing) {
        const { error: upErr } = await supabase.from('pod_details').update(payload).eq('id', existing.id);
        if (upErr) throw upErr;
        setPodNo(existing.pod_no || podNo);
      } else {
        const { data: inserted, error: insErr } = await supabase.from('pod_details').insert({ ...payload, pod_no: podNo }).select('pod_no').single();
        if (insErr) throw insErr;
        if (inserted) setPodNo(inserted.pod_no);
      }
      setPodSaved(true);
      // Generate PDF preview
      if (podUrl) URL.revokeObjectURL(podUrl);
      const url = await generatePodPdf(bilty, kaatData, challan, podNo);
      setPodUrl(url);
    } catch (e) { console.error('POD save error:', e); alert('Failed to save POD: ' + (e?.message || e)); }
    finally { setPodSaving(false); }
  }, [bilty, podForm, user?.id, kaatData, challan, challan_no, podUrl, podNo]);

  const closePodPreview = useCallback(() => {
    if (podUrl) URL.revokeObjectURL(podUrl);
    setPodUrl(null);
    setPodOpen(false);
    setPodForm({ delivered_at: '', payment_mode: '', mobile_number_1: '', mobile_number_2: '', total_amount: '', amount_given: '', reminder: '', consignor_name: '', consignor_gst: '' });
    setPodSaved(false);
    setPodNo('');
  }, [podUrl]);

  if (!user) return null;

  const kt = kTotal(kaatData);

  const InfoRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-2 py-1.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0"/>}
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-xs font-semibold text-gray-900 truncate">{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
            <ArrowLeft className="h-4 w-4 text-gray-600"/>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">GR: {decodeURIComponent(bilty_no)}</h1>
            <p className="text-xs text-gray-500">Challan: {decodeURIComponent(challan_no)}</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500"/>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
            <button onClick={fetchData} className="mt-2 text-xs text-red-600 underline">Retry</button>
          </div>
        )}

        {!loading && !error && bilty && (
          <>
            {/* ACTION BAR */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 flex flex-wrap items-center gap-3">
              <button onClick={handleGeneratePod}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">
                <Eye className="h-4 w-4"/>POD
              </button>
            </div>

            {/* BILTY INFO CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Basic Info */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5"/>Bilty Details
                </h3>
                <div className="grid grid-cols-2 gap-x-4">
                  <InfoRow label="GR Number" value={bilty.gr_no} icon={FileText}/>
                  <InfoRow label="Date" value={fmtDate(bilty.bilty_date || bilty.created_at)} icon={Clock}/>
                  <InfoRow label="Destination" value={bilty.destination} icon={MapPin}/>
                  <InfoRow label="Packets" value={bilty.packets} icon={Package}/>
                  <InfoRow label="Weight (Kg)" value={parseFloat(bilty.weight || 0).toFixed(2)}/>
                  <InfoRow label="Amount" value={`₹${parseFloat(bilty.amount || 0).toLocaleString('en-IN')}`} icon={CreditCard}/>
                  <InfoRow label="Freight" value={`₹${parseFloat(bilty.freight || 0).toLocaleString('en-IN')}`}/>
                  <InfoRow label="Payment" value={(bilty.payment || '-').toUpperCase()}/>
                  <InfoRow label="E-Way Bill" value={bilty.e_way_bill}/>
                  <InfoRow label="Pvt Marks" value={bilty.pvt_marks}/>
                  <InfoRow label="Contains" value={bilty.contain || bilty.contents}/>
                  <InfoRow label="Delivery Type" value={bilty.delivery_type}/>
                  {bilty.invoice_no && <InfoRow label="Invoice No" value={bilty.invoice_no}/>}
                  {bilty.invoice_value > 0 && <InfoRow label="Invoice Value" value={`₹${parseFloat(bilty.invoice_value || 0).toLocaleString('en-IN')}`}/>}
                  {bilty.w_name && <InfoRow label="W Name" value={bilty.w_name}/>}
                  {bilty.remark && <InfoRow label="Remark" value={bilty.remark}/>}
                </div>
              </div>

              {/* Consignor / Consignee */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5"/>Party Details
                </h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Consignor (Sender)</p>
                    <p className="text-sm font-bold text-gray-900">{bilty.consignor || '-'}</p>
                    {bilty.consignor_number && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3"/>{bilty.consignor_number}</p>
                    )}
                    {bilty.consignor_gst && (
                      <p className="text-[10px] text-gray-500 mt-0.5">GST: {bilty.consignor_gst}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Consignee (Receiver)</p>
                    <p className="text-sm font-bold text-gray-900">{bilty.consignee || '-'}</p>
                    {bilty.consignee_number && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3"/>{bilty.consignee_number}</p>
                    )}
                    {bilty.consignee_gst && (
                      <p className="text-[10px] text-gray-500 mt-0.5">GST: {bilty.consignee_gst}</p>
                    )}
                  </div>
                  {bilty.transport_name && (
                    <div className="bg-teal-50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Transport</p>
                      <p className="text-sm font-bold text-teal-800">{bilty.transport_name}</p>
                      {bilty.transport_gst && <p className="text-[10px] text-gray-500 mt-0.5">GST: {bilty.transport_gst}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Kaat & Charges + Transit Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Kaat / Charges */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5"/>Charges & Kaat
                </h3>
                {kaatData ? (
                  <div className="space-y-1.5">
                    {[
                      ['Kaat', kaatData.kaat],
                      ['Bilty Charge', kaatData.bilty_chrg],
                      ['EWB Charge', kaatData.ewb_chrg],
                      ['Labour Charge', kaatData.labour_chrg],
                      ['DD Charge', kaatData.dd_chrg],
                      ['PF', kaatData.pf],
                      ['Other Charge', kaatData.other_chrg],
                    ].map(([label, val]) => (
                      <div key={label} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-gray-50">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-semibold text-gray-900">₹{parseFloat(val || 0).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 mt-2 pt-2 flex items-center justify-between text-sm px-2">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-emerald-700">₹{kt.toFixed(2)}</span>
                    </div>
                    {kaatData.transport_name && (
                      <div className="mt-2 bg-teal-50 rounded-lg p-2 flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-teal-600"/>
                        <div>
                          <p className="text-[10px] text-gray-400">Transport</p>
                          <p className="text-xs font-bold text-teal-800">{kaatData.transport_name}</p>
                        </div>
                      </div>
                    )}
                    {(kaatData.pohonch_no || kaatData.bilty_number) && (
                      <div className="mt-1 bg-violet-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-400">{kaatData.pohonch_no ? 'Pohonch No' : 'Bilty Number'}</p>
                        <p className="text-xs font-bold text-violet-800">{kaatData.pohonch_no || kaatData.bilty_number}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No kaat data available</p>
                )}
              </div>

              {/* Transit Status */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5"/>Transit Status
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Delivered at Branch', done: bilty.delivered_at_branch, time: bilty.delivered_at_branch_timing, color: 'blue' },
                    { label: 'Out from Branch', done: bilty.out_from_branch, time: bilty.out_from_branch_timing, color: 'amber' },
                    { label: 'Delivered at Destination', done: bilty.delivered_at_destination, time: bilty.delivered_at_destination_timing, color: 'emerald' },
                  ].map(({ label, done, time, color }) => (
                    <div key={label} className={`flex items-center gap-3 p-2.5 rounded-lg border ${done ? `bg-${color}-50 border-${color}-200` : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`w-3 h-3 rounded-full ${done ? `bg-${color}-500` : 'bg-gray-300'}`}/>
                      <div>
                        <p className={`text-xs font-bold ${done ? `text-${color}-800` : 'text-gray-500'}`}>{label}</p>
                        {done && time && <p className="text-[10px] text-gray-500">{fmtDate(time)}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Challan Info */}
                {challan && (
                  <div className="mt-4 bg-slate-50 rounded-lg p-3 space-y-1.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Challan Info</p>
                    <div className="text-xs">
                      <span className="text-gray-500">Truck:</span> <span className="font-semibold">{challan.truck?.truck_number || '-'}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-500">Driver:</span> <span className="font-semibold">{challan.driver?.name || '-'}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-500">Hub Received:</span>{' '}
                      <span className={`font-semibold ${challan.is_received_at_hub ? 'text-emerald-700' : 'text-gray-500'}`}>
                        {challan.is_received_at_hub ? `Yes (${fmtDate(challan.received_at_hub_timing)})` : 'No'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Charges row (from bilty table: labour, bill, toll, dd, other, pf) */}
            {bilty.source === 'bilty' && (bilty.labour_charge > 0 || bilty.bill_charge > 0 || bilty.toll_charge > 0 || bilty.dd_charge > 0 || bilty.other_charge > 0 || bilty.pf_charge > 0) && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
                <h3 className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5"/>Bilty Charges
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['Labour', bilty.labour_charge],
                    ['Bill Chrg', bilty.bill_charge],
                    ['Toll', bilty.toll_charge],
                    ['DD Chrg', bilty.dd_charge],
                    ['Other', bilty.other_charge],
                    ['PF', bilty.pf_charge],
                  ].filter(([, v]) => parseFloat(v) > 0).map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-orange-50">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-semibold text-gray-900">₹{parseFloat(v || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* POD MODAL */}
            {podOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-xl"><FileText className="h-4 w-4 text-blue-600"/></div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">POD — {bilty.gr_no} {podNo && <span className="text-indigo-600 text-xs font-mono ml-1">#{podNo}</span>}</h3>
                        <p className="text-[10px] text-gray-500">
                          Dest: {bilty.destination} | {bilty.consignee}
                          {bilty.payment && bilty.payment !== '-' && <> | <span className={`font-bold ${bilty.payment.toLowerCase() === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{bilty.payment.toUpperCase()}</span></>}
                          {bilty.amount ? <> | ₹{parseFloat(bilty.amount).toLocaleString('en-IN')}</> : ''}
                          {bilty.packets ? <> | {bilty.packets} Pkts</> : ''}
                          {bilty.weight ? <> | {parseFloat(bilty.weight).toFixed(1)} Kg</> : ''}
                        </p>
                      </div>
                    </div>
                    <button onClick={closePodPreview} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500"/></button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                    {/* FORM */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Payment Mode *</label>
                        <select value={podForm.payment_mode} onChange={e => setPodForm(p => ({ ...p, payment_mode: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black">
                          <option value="">Select</option>
                          <option value="PAID">PAID</option>
                          <option value="TO-PAY">TO-PAY</option>
                          <option value="PAID/DD">PAID/DD</option>
                          <option value="TO-PAY/DD">TO-PAY/DD</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Delivered At *</label>
                        <input type="datetime-local" value={podForm.delivered_at} onChange={e => setPodForm(p => ({ ...p, delivered_at: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Mobile No. 1 *</label>
                        <input type="tel" value={podForm.mobile_number_1} onChange={e => setPodForm(p => ({ ...p, mobile_number_1: e.target.value }))} placeholder="9876543210"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Mobile No. 2</label>
                        <input type="tel" value={podForm.mobile_number_2} onChange={e => setPodForm(p => ({ ...p, mobile_number_2: e.target.value }))} placeholder="Optional"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Total Amount *</label>
                        <input type="number" value={podForm.total_amount} onChange={e => setPodForm(p => ({ ...p, total_amount: e.target.value }))} placeholder="0"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Amount Given</label>
                        <input type="number" value={podForm.amount_given} onChange={e => setPodForm(p => ({ ...p, amount_given: e.target.value }))} placeholder="0"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Reminder</label>
                        <input type="text" value={podForm.reminder} onChange={e => setPodForm(p => ({ ...p, reminder: e.target.value }))} placeholder="Any note..."
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Consignor Name <span className="text-gray-300">(optional)</span></label>
                        <input type="text" value={podForm.consignor_name} onChange={e => setPodForm(p => ({ ...p, consignor_name: e.target.value }))} placeholder="Consignor name"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Consignor GST <span className="text-gray-300">(optional)</span></label>
                        <input type="text" value={podForm.consignor_gst} onChange={e => setPodForm(p => ({ ...p, consignor_gst: e.target.value }))} placeholder="GST Number"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black"/>
                      </div>
                    </div>
                    {/* SAVE + PRINT */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={savePodDetails} disabled={!podBasicFilled || podSaving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 shadow-sm disabled:opacity-40 transition-all">
                        {podSaving ? <><Loader2 className="h-3 w-3 animate-spin"/>Saving...</> : <><CheckCircle2 className="h-3 w-3"/>{podSaved ? 'Update & Print' : 'Save & Print'}</>}
                      </button>
                      {!podBasicFilled && <span className="text-[10px] text-amber-600">Fill delivered at & total amount to print</span>}
                      {podSaved && podUrl && (
                        <>
                          <a href={podUrl} download={`POD_${bilty.gr_no}.pdf`}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                            <FileText className="h-3 w-3"/>Download
                          </a>
                          <button onClick={() => { const w = window.open(podUrl, '_blank'); if(!w) alert('Please allow popups'); }}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                            Open Tab
                          </button>
                        </>
                      )}
                    </div>
                    {/* PDF PREVIEW */}
                    {podSaved && podUrl && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden" style={{ height: '50vh' }}>
                        <iframe src={podUrl} className="w-full h-full border-0" title="POD Preview"/>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
