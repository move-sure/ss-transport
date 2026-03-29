'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../utils/auth';
import supabase from '../../../utils/supabase';
import Navbar from '../../../../components/dashboard/navbar';
import { format } from 'date-fns';
import {
  ArrowLeft, Package, MapPin, User, Phone, FileText, Printer,
  Truck, CreditCard, Clock, Download, Eye, Loader2, X,
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

  // POD preview
  const [podUrl, setPodUrl] = useState(null);

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

      // Fetch bilty from both tables
      let biltyObj = null;
      const { data: regBilty } = await supabase
        .from('bilty')
        .select('*')
        .eq('gr_no', db)
        .eq('is_active', true)
        .maybeSingle();
      if (regBilty) {
        biltyObj = { ...regBilty, source: 'bilty' };
      } else {
        const { data: mnlBilty } = await supabase
          .from('station_bilty_summary')
          .select('*')
          .eq('gr_no', db)
          .maybeSingle();
        if (mnlBilty) {
          biltyObj = {
            ...mnlBilty,
            source: 'manual',
            consignor: mnlBilty.consignor_name,
            consignee: mnlBilty.consignee_name,
            destination: mnlBilty.station,
            packets: mnlBilty.total_quantity,
            weight: mnlBilty.actual_weight,
            amount: mnlBilty.total_amount,
            freight_amount: mnlBilty.freight,
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

  const handleGeneratePod = useCallback(() => {
    if (!bilty) return;
    if (podUrl) URL.revokeObjectURL(podUrl);
    const url = generatePodPdf(bilty, kaatData, challan);
    setPodUrl(url);
  }, [bilty, kaatData, challan, podUrl]);

  const handleDownloadPod = useCallback(() => {
    if (!podUrl) return;
    const a = document.createElement('a');
    a.href = podUrl;
    a.download = `POD_${bilty?.gr_no || 'bilty'}.pdf`;
    a.click();
  }, [podUrl, bilty]);

  const handlePrintPod = useCallback(() => {
    if (!podUrl) return;
    const w = window.open(podUrl, '_blank');
    if (w) {
      w.onload = () => { w.print(); };
    }
  }, [podUrl]);

  const closePodPreview = useCallback(() => {
    if (podUrl) URL.revokeObjectURL(podUrl);
    setPodUrl(null);
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
                <Eye className="h-4 w-4"/>Preview POD
              </button>
              {podUrl && (
                <>
                  <button onClick={handleDownloadPod}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm">
                    <Download className="h-4 w-4"/>Download PDF
                  </button>
                  <button onClick={handlePrintPod}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-700 text-white hover:bg-gray-800 transition-colors shadow-sm">
                    <Printer className="h-4 w-4"/>Print
                  </button>
                </>
              )}
            </div>

            {/* POD PREVIEW */}
            {podUrl && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600"/>
                    <span className="text-sm font-bold text-gray-900">POD Preview</span>
                  </div>
                  <button onClick={closePodPreview} className="p-1 rounded hover:bg-gray-200"><X className="h-4 w-4 text-gray-500"/></button>
                </div>
                <iframe src={podUrl} className="w-full h-[70vh] border-0" title="POD Preview"/>
              </div>
            )}

            {/* BILTY INFO CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Basic Info */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5"/>Bilty Details
                </h3>
                <div className="grid grid-cols-2 gap-x-4">
                  <InfoRow label="GR Number" value={bilty.gr_no} icon={FileText}/>
                  <InfoRow label="Date" value={fmtDate(bilty.bilty_date || bilty.date)} icon={Clock}/>
                  <InfoRow label="Destination" value={bilty.destination} icon={MapPin}/>
                  <InfoRow label="Packets" value={bilty.packets} icon={Package}/>
                  <InfoRow label="Weight (Kg)" value={parseFloat(bilty.weight || 0).toFixed(2)}/>
                  <InfoRow label="Amount" value={`₹${parseFloat(bilty.amount || 0).toLocaleString('en-IN')}`} icon={CreditCard}/>
                  <InfoRow label="Freight" value={`₹${parseFloat(bilty.freight_amount || 0).toLocaleString('en-IN')}`}/>
                  <InfoRow label="Payment" value={(bilty.payment || '-').toUpperCase()}/>
                  <InfoRow label="E-Way Bill" value={bilty.e_way_bill}/>
                  <InfoRow label="Pvt Marks" value={bilty.pvt_marks}/>
                  <InfoRow label="Contains" value={bilty.contain}/>
                  <InfoRow label="Delivery Type" value={bilty.delivery_type}/>
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
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Consignee (Receiver)</p>
                    <p className="text-sm font-bold text-gray-900">{bilty.consignee || '-'}</p>
                    {bilty.consignee_number && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3"/>{bilty.consignee_number}</p>
                    )}
                  </div>
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

            {/* Remarks */}
            {bilty.remark && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Remarks</h3>
                <p className="text-sm text-gray-700">{bilty.remark}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
