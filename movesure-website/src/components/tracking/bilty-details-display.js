'use client';

import React, { useState, useEffect } from 'react';
import { Package, Truck, FileText, IndianRupee, Clock, AlertTriangle, CheckCircle2, Shield, History, ExternalLink, Calculator, Phone, Edit3, Save, X, MapPin, Loader2, ChevronDown, ChevronUp, Printer, FileImage } from 'lucide-react';
import MobileNumberEditor from './mobile-number-editor';
import supabase from '../../app/utils/supabase';

// Simple collapsible section
const Section = ({ title, icon: Icon, iconColor = 'text-slate-500', children, defaultOpen = false, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-xs font-bold text-slate-700">{title}</span>
          {badge && <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full font-bold">{badge}</span>}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {open && <div className="p-3 bg-white">{children}</div>}
    </div>
  );
};

// Simple info pill
const Pill = ({ label, value, bold }) => (
  <div className="inline-flex items-center gap-1 text-[11px]">
    <span className="text-slate-400 font-medium">{label}:</span>
    <span className={`text-slate-800 ${bold ? 'font-bold' : 'font-semibold'}`}>{value || 'N/A'}</span>
  </div>
);

const BiltyDetailsDisplay = ({ bilty, transitDetails, createdByUser, onBiltyUpdate, challanDetails, truck, driver, owner, searchRecord, searchLogs, onSearchRecordUpdate, user, kaatDetails, transportInfo, destinationTransport }) => {
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [complaintRemark, setComplaintRemark] = useState('');
  const [resolutionRemark, setResolutionRemark] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [sendingComplaintMsg, setSendingComplaintMsg] = useState(false);
  const [complaintMsgSent, setComplaintMsgSent] = useState(false);
  const [editingTransportNum, setEditingTransportNum] = useState(false);
  const [tempTransportNum, setTempTransportNum] = useState('');
  const [savingTransportNum, setSavingTransportNum] = useState(false);
  const [localTransit, setLocalTransit] = useState(transitDetails);
  const [transitUpdating, setTransitUpdating] = useState(null);

  useEffect(() => { setLocalTransit(transitDetails); }, [transitDetails]);

  // Determine if destination is Kanpur
  const dest = (bilty?.destination || '').toLowerCase();
  const isKnp = dest.includes('kanpur') || dest.includes('knp') || bilty?.source_type === 'MNL';

  const updateTransitField = async (field, dateField) => {
    if (!localTransit?.id || !user) return;
    const currentVal = localTransit[field];
    const action = currentVal ? 'undo' : 'mark';
    const label = field.replace(/_/g, ' ').replace(/^is /, '');
    if (!confirm(`${action === 'mark' ? '✅ Mark' : '↩️ Undo'} "${label}"?`)) return;
    setTransitUpdating(field);
    try {
      const now = new Date().toISOString();
      const updateData = {
        [field]: !currentVal,
        [dateField]: !currentVal ? now : null,
        updated_by: user.id
      };
      // Auto-fill all previous steps when marking (not undoing)
      if (!currentVal) {
        if (field === 'is_delivered_at_destination') {
          if (!localTransit.is_out_of_delivery_from_branch1) {
            updateData.is_out_of_delivery_from_branch1 = true;
            updateData.out_of_delivery_from_branch1_date = now;
          }
          if (!localTransit.is_delivered_at_branch2) {
            updateData.is_delivered_at_branch2 = true;
            updateData.delivered_at_branch2_date = now;
          }
          if (!localTransit.is_out_of_delivery_from_branch2) {
            updateData.is_out_of_delivery_from_branch2 = true;
            updateData.out_of_delivery_from_branch2_date = now;
          }
        } else if (field === 'is_out_of_delivery_from_branch2') {
          if (!localTransit.is_out_of_delivery_from_branch1) {
            updateData.is_out_of_delivery_from_branch1 = true;
            updateData.out_of_delivery_from_branch1_date = now;
          }
          if (!localTransit.is_delivered_at_branch2) {
            updateData.is_delivered_at_branch2 = true;
            updateData.delivered_at_branch2_date = now;
          }
        } else if (field === 'is_delivered_at_branch2') {
          if (!localTransit.is_out_of_delivery_from_branch1) {
            updateData.is_out_of_delivery_from_branch1 = true;
            updateData.out_of_delivery_from_branch1_date = now;
          }
        }
      }
      const { error } = await supabase
        .from('transit_details')
        .update(updateData)
        .eq('id', localTransit.id);
      if (error) throw error;
      setLocalTransit(prev => ({ ...prev, ...updateData }));
    } catch (err) {
      console.error('Error updating transit:', err);
      alert('Failed to update transit status');
    } finally {
      setTransitUpdating(null);
    }
  };

  const handleEditTransportNumber = () => {
    setTempTransportNum(bilty.transport_number || '');
    setEditingTransportNum(true);
  };

  const handleSaveTransportNumber = async () => {
    setSavingTransportNum(true);
    try {
      const { error } = await supabase
        .from('bilty')
        .update({ transport_number: tempTransportNum })
        .eq('id', bilty.id);
      if (error) throw error;
      if (onBiltyUpdate) onBiltyUpdate({ ...bilty, transport_number: tempTransportNum });
      setEditingTransportNum(false);
    } catch (err) {
      console.error('Error updating transport number:', err);
      alert('Failed to update transport number');
    } finally {
      setSavingTransportNum(false);
    }
  };

  // Send complaint WhatsApp message to consignor & consignee
  const sendComplaintWhatsApp = async (grNo) => {
    if (!grNo) return;
    setSendingComplaintMsg(true);
    try {
      // Fetch fresh phone numbers from bilty table
      const { data: biltyData } = await supabase
        .from('bilty')
        .select('consignor_number, consignee_number')
        .eq('gr_no', grNo)
        .eq('is_active', true)
        .single();

      if (!biltyData) { console.log('No bilty found for WhatsApp complaint msg'); return; }

      const sendToNumber = async (phone) => {
        if (!phone || !phone.trim()) return;
        const num = phone.trim().replace(/\D/g, '').slice(-10);
        if (num.length !== 10) return;
        const resp = await fetch('https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/rcvts470k5/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiver: `91${num}`, values: { "1": grNo, "2": grNo } }),
        });
        const result = await resp.json().catch(() => null);
        console.log(`Complaint WhatsApp sent to 91${num}:`, { status: resp.status, result });
      };

      await Promise.all([
        sendToNumber(biltyData.consignor_number),
        sendToNumber(biltyData.consignee_number),
      ]);
      setComplaintMsgSent(true);
      setTimeout(() => setComplaintMsgSent(false), 5000);
    } catch (err) {
      console.error('WhatsApp complaint notification error:', err);
      alert('Failed to send WhatsApp message');
    } finally {
      setSendingComplaintMsg(false);
    }
  };

  const handleRegisterComplaint = async () => {
    if (!bilty?.gr_no || !user) return;
    setComplaintLoading(true);
    try {
      const { data, error } = await supabase
        .from('search_tracking_master')
        .update({
          is_complaint: true,
          complaint_registered_at: new Date().toISOString(),
          complaint_registered_by: user.id,
          complaint_remark: complaintRemark || null,
          in_investigation: true,
          investigation_started_at: new Date().toISOString()
        })
        .eq('gr_no', bilty.gr_no)
        .select()
        .single();

      if (error) throw error;
      if (onSearchRecordUpdate && data) {
        // Attach current user info as complaint_user for immediate UI update
        data.complaint_user = { id: user.id, name: user.name, username: user.username, post: user.post };
        data.first_user = searchRecord?.first_user || null;
        data.last_user = searchRecord?.last_user || null;
        onSearchRecordUpdate(data);
      }
      setComplaintRemark('');

      // Auto-send WhatsApp complaint message for regular bilties
      if (bilty.source_type !== 'MNL') {
        sendComplaintWhatsApp(bilty.gr_no);
      }
    } catch (err) {
      console.error('Error registering complaint:', err);
      alert('Failed to register complaint');
    } finally {
      setComplaintLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!bilty?.gr_no || !user) return;
    setResolveLoading(true);
    try {
      const { data, error } = await supabase
        .from('search_tracking_master')
        .update({
          in_investigation: false,
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_remark: resolutionRemark || null
        })
        .eq('gr_no', bilty.gr_no)
        .select()
        .single();

      if (error) throw error;
      if (onSearchRecordUpdate && data) {
        // Attach current user info as resolved_user for immediate UI update
        data.resolved_user = { id: user.id, name: user.name, username: user.username, post: user.post };
        // Carry over existing user info
        data.complaint_user = searchRecord?.complaint_user || null;
        data.first_user = searchRecord?.first_user || null;
        data.last_user = searchRecord?.last_user || null;
        onSearchRecordUpdate(data);
      }

      // Send WhatsApp "complaint resolved" template message
      try {
        const { data: biltyPhones } = await supabase
          .from('bilty')
          .select('consignor_number, consignee_number')
          .eq('gr_no', bilty.gr_no)
          .eq('is_active', true)
          .single();

        if (biltyPhones) {
          const remarkText = resolutionRemark || 'Resolved';
          const sendResolved = async (phone) => {
            if (!phone || !phone.trim()) return;
            const num = phone.trim().replace(/\D/g, '').slice(-10);
            if (num.length !== 10) return;
            const resp = await fetch('https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/l9xti74rh2/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiver: `91${num}`,
                values: { "1": bilty.gr_no, "2": remarkText, "3": remarkText, "4": bilty.gr_no }
              }),
            });
            const result = await resp.json().catch(() => null);
            console.log(`Resolved WhatsApp sent to 91${num}:`, { status: resp.status, result });
          };
          await Promise.all([
            sendResolved(biltyPhones.consignor_number),
            sendResolved(biltyPhones.consignee_number),
          ]);
        }
      } catch (whatsappErr) {
        console.error('Error sending resolved WhatsApp:', whatsappErr);
      }

      setResolutionRemark('');
      setShowResolveForm(false);
    } catch (err) {
      console.error('Error resolving complaint:', err);
      alert('Failed to resolve complaint');
    } finally {
      setResolveLoading(false);
    }
  };

  if (!bilty) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
        <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500 text-sm">Search and select a bilty to view details</p>
      </div>
    );
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const payBadge = (mode) => {
    const m = mode?.toLowerCase();
    const cls = m === 'paid' ? 'bg-green-100 text-green-700' : m === 'to-pay' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${cls}`}>{mode?.toUpperCase() || '-'}</span>;
  };

  const pdfUrl = bilty.pdf_bucket || bilty.bilty_image || null;

  return (
    <div className="space-y-3 w-full max-w-full">

      {/* ===== PDF Preview Modal ===== */}
      {showPdfModal && pdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold">Bilty PDF — GR: {bilty.gr_no}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-bold transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Open
                </a>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {pdfUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={pdfUrl} alt={`Bilty ${bilty.gr_no}`} className="w-full h-full object-contain p-4" />
              ) : (
                <iframe
                  src={pdfUrl}
                  title={`Bilty PDF - ${bilty.gr_no}`}
                  className="w-full h-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TOP: Clean Table-Row Style Summary ===== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-base font-black tracking-tight">GR: {bilty.gr_no}</span>
            {bilty.source_type === 'MNL' && <span className="text-[9px] px-1.5 py-0.5 bg-orange-500 rounded font-bold">MANUAL</span>}
            {bilty.source_type !== 'MNL' && <span className="text-[9px] px-1.5 py-0.5 bg-blue-500 rounded font-bold">REG</span>}
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${bilty.saving_option === 'DRAFT' ? 'bg-yellow-500 text-black' : 'bg-emerald-500'}`}>
              {bilty.saving_option || 'SAVE'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            {transitDetails?.challan_no && <span className="text-slate-300">Challan: <strong className="text-white">{transitDetails.challan_no}</strong></span>}
            {bilty.destination && <span className="text-amber-300 font-bold">📍 {bilty.destination}</span>}
            {createdByUser && <span className="text-slate-400">by <strong className="text-slate-200">{createdByUser.name || createdByUser.username}</strong></span>}
            {pdfUrl && (
              <button
                onClick={() => setShowPdfModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-[11px] font-bold transition shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Bilty
              </button>
            )}
          </div>
        </div>

        {/* Main info row */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-x-4 gap-y-2">
            <div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Date</div>
              <div className="text-sm font-bold text-slate-800">{fmtDate(bilty.bilty_date)}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Consignor</div>
              <div className="text-sm font-bold text-slate-800 truncate" title={bilty.consignor_name}>{bilty.consignor_name || 'N/A'}</div>
              {bilty.consignor_number && <div className="text-[10px] text-slate-500">{bilty.consignor_number}</div>}
            </div>
            <div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Consignee</div>
              <div className="text-sm font-bold text-slate-800 truncate" title={bilty.consignee_name}>{bilty.consignee_name || 'N/A'}</div>
              {bilty.consignee_number && <div className="text-[10px] text-slate-500">{bilty.consignee_number}</div>}
            </div>
            <div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Destination</div>
              <div className="text-sm font-bold text-amber-700">{bilty.destination || bilty.station || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Pvt Marks</div>
              <div className="text-sm font-bold text-slate-800 truncate" title={bilty.pvt_marks}>{bilty.pvt_marks || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Pkg / Weight</div>
              <div className="text-sm font-bold text-slate-800">
                {bilty.no_of_pkg || 0} pkg &middot; {parseFloat(bilty.weight || bilty.wt || 0).toFixed(1)} kg
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Amount</div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-green-700">₹{bilty.total?.toLocaleString() || '0'}</span>
                {payBadge(bilty.payment_mode)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">Delivery</div>
              <div className="text-sm font-bold text-slate-800 capitalize">{bilty.delivery_type || 'Godown'}</div>
            </div>
          </div>

          {/* Extra details */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            {bilty.contain && <Pill label="Contains" value={bilty.contain} />}
            {bilty.e_way_bill && <Pill label="E-Way" value={bilty.e_way_bill} />}
            {bilty.invoice_no && <Pill label="Invoice" value={bilty.invoice_no} />}
            {bilty.invoice_value > 0 && <Pill label="Inv Value" value={`₹${bilty.invoice_value?.toLocaleString()}`} />}
            {bilty.remark && <Pill label="Remark" value={bilty.remark} />}
            {bilty.rate > 0 && <Pill label="Rate" value={`₹${bilty.rate}`} />}
            {bilty.consignor_gst && <Pill label="Consignor GST" value={bilty.consignor_gst} />}
            {bilty.consignee_gst && <Pill label="Consignee GST" value={bilty.consignee_gst} />}
          </div>
        </div>

        {/* Transport Details Bar */}
        {(bilty.transport_name || bilty.transport_gst || bilty.transport_number) && (
          <div className="px-4 py-2.5 bg-purple-50 border-t border-purple-100 flex flex-wrap items-center gap-x-6 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-purple-600" />
              <span className="text-[10px] text-purple-400 font-semibold uppercase">Transport:</span>
              <span className="text-sm font-black text-purple-800">{bilty.transport_name || 'N/A'}</span>
            </div>
            {bilty.transport_gst && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-purple-400 font-semibold uppercase">GSTIN:</span>
                <span className="text-sm font-bold text-slate-800">{bilty.transport_gst}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-[10px] text-purple-400 font-semibold uppercase">Mobile:</span>
              <span className="text-sm font-bold text-slate-800">{transportInfo?.mob_number || 'N/A'}</span>
            </div>
          </div>
        )}

        {/* Complaint signal bar */}
        {searchRecord && (
          <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded-full ${searchRecord.is_complaint ? 'bg-red-500 animate-pulse' : 'bg-slate-200'}`} />
              <div className={`w-4 h-4 rounded-full ${searchRecord.in_investigation && !searchRecord.is_resolved ? 'bg-amber-400 animate-pulse' : searchRecord.is_resolved ? 'bg-amber-400' : 'bg-slate-200'}`} />
              <div className={`w-4 h-4 rounded-full ${searchRecord.is_resolved ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              searchRecord.is_resolved ? 'bg-emerald-100 text-emerald-700'
              : searchRecord.in_investigation ? 'bg-amber-100 text-amber-700'
              : searchRecord.is_complaint ? 'bg-red-100 text-red-700'
              : 'bg-slate-100 text-slate-500'
            }`}>
              {searchRecord.is_resolved ? '✅ Resolved' : searchRecord.in_investigation ? '🔍 Investigating' : searchRecord.is_complaint ? '🚨 Complaint' : 'No Complaint'}
            </span>
            {searchRecord.search_count > 1 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${searchRecord.search_count > 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {searchRecord.search_count}× searched
              </span>
            )}
          </div>
        )}
      </div>

      {/* ===== DISPATCH & TRANSIT ===== */}
      {(challanDetails || localTransit) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {challanDetails && (
            <div className="px-4 py-2.5 bg-teal-50 border-b border-teal-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <Pill label="Challan" value={challanDetails.challan_no} bold />
              <Pill label="Truck" value={truck?.truck_number} bold />
              <Pill label="Owner" value={owner?.name} />
              <Pill label="Driver" value={driver?.name} />
              {challanDetails.dispatch_date && <Pill label="Dispatched" value={fmtDateTime(challanDetails.dispatch_date)} bold />}
              {!challanDetails.is_dispatched && <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-700 font-bold rounded">Pending Dispatch</span>}
            </div>
          )}

          {localTransit && (
            <div className="px-4 py-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                <Truck className="w-3 h-3" /> Transit Status
              </div>
              <div className={`grid gap-2 ${isKnp ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
                {isKnp && (
                  <div className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${localTransit.is_delivered_at_branch2 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${localTransit.is_delivered_at_branch2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-700 truncate">Delivered at Branch (KNP)</div>
                        {localTransit.delivered_at_branch2_date && <div className="text-[9px] font-semibold text-emerald-600">{fmtDateTime(localTransit.delivered_at_branch2_date)}</div>}
                      </div>
                    </div>
                    <button onClick={() => updateTransitField('is_delivered_at_branch2', 'delivered_at_branch2_date')} disabled={transitUpdating === 'is_delivered_at_branch2'}
                      className={`px-2 py-1 text-[9px] font-bold rounded transition flex-shrink-0 ${localTransit.is_delivered_at_branch2 ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                      {transitUpdating === 'is_delivered_at_branch2' ? <Loader2 className="w-3 h-3 animate-spin" /> : localTransit.is_delivered_at_branch2 ? 'Undo' : 'Mark'}
                    </button>
                  </div>
                )}
                {!isKnp && (
                  <div className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${localTransit.is_out_of_delivery_from_branch2 ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${localTransit.is_out_of_delivery_from_branch2 ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        <Truck className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-700 truncate">Out for Delivery</div>
                        {localTransit.out_of_delivery_from_branch2_date && <div className="text-[9px] font-semibold text-blue-600">{fmtDateTime(localTransit.out_of_delivery_from_branch2_date)}</div>}
                      </div>
                    </div>
                    <button onClick={() => updateTransitField('is_out_of_delivery_from_branch2', 'out_of_delivery_from_branch2_date')} disabled={transitUpdating === 'is_out_of_delivery_from_branch2'}
                      className={`px-2 py-1 text-[9px] font-bold rounded transition flex-shrink-0 ${localTransit.is_out_of_delivery_from_branch2 ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                      {transitUpdating === 'is_out_of_delivery_from_branch2' ? <Loader2 className="w-3 h-3 animate-spin" /> : localTransit.is_out_of_delivery_from_branch2 ? 'Undo' : 'Mark'}
                    </button>
                  </div>
                )}
                <div className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${localTransit.is_delivered_at_destination ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${localTransit.is_delivered_at_destination ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <MapPin className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-700 truncate">Delivered at Destination</div>
                      {localTransit.delivered_at_destination_date && <div className="text-[9px] font-semibold text-green-600">{fmtDateTime(localTransit.delivered_at_destination_date)}</div>}
                    </div>
                  </div>
                  <button onClick={() => updateTransitField('is_delivered_at_destination', 'delivered_at_destination_date')} disabled={transitUpdating === 'is_delivered_at_destination'}
                    className={`px-2 py-1 text-[9px] font-bold rounded transition flex-shrink-0 ${localTransit.is_delivered_at_destination ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                    {transitUpdating === 'is_delivered_at_destination' ? <Loader2 className="w-3 h-3 animate-spin" /> : localTransit.is_delivered_at_destination ? 'Undo' : 'Mark'}
                  </button>
                </div>
                {!isKnp && localTransit.is_out_of_delivery_from_branch2 && (
                  <div className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${localTransit.out_for_door_delivery ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${localTransit.out_for_door_delivery ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        <Package className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-700 truncate">Door Delivery</div>
                        {localTransit.out_for_door_delivery_date && <div className="text-[9px] font-semibold text-amber-600">{fmtDateTime(localTransit.out_for_door_delivery_date)}</div>}
                      </div>
                    </div>
                    <button onClick={() => updateTransitField('out_for_door_delivery', 'out_for_door_delivery_date')} disabled={transitUpdating === 'out_for_door_delivery'}
                      className={`px-2 py-1 text-[9px] font-bold rounded transition flex-shrink-0 ${localTransit.out_for_door_delivery ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
                      {transitUpdating === 'out_for_door_delivery' ? <Loader2 className="w-3 h-3 animate-spin" /> : localTransit.out_for_door_delivery ? 'Undo' : 'Mark'}
                    </button>
                  </div>
                )}
              </div>

              {(localTransit.delivery_agent_name || localTransit.delivery_agent_phone || localTransit.vehicle_number) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 p-2 bg-slate-50 rounded">
                  {localTransit.delivery_agent_name && <Pill label="Agent" value={localTransit.delivery_agent_name} />}
                  {localTransit.delivery_agent_phone && <Pill label="Phone" value={localTransit.delivery_agent_phone} />}
                  {localTransit.vehicle_number && <Pill label="Vehicle" value={localTransit.vehicle_number} />}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== COLLAPSIBLE SECTIONS ===== */}
      <div className="space-y-2">

        {/* Documents */}
        {(bilty.pdf_bucket || bilty.bilty_image || bilty.transit_bilty_image) && (
          <Section title="Documents" icon={FileText} iconColor="text-violet-500" defaultOpen>
            <div className="flex flex-wrap gap-2">
              {bilty.pdf_bucket && (
                <a href={bilty.pdf_bucket} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg border border-violet-200 hover:bg-violet-100 transition">
                  <FileText className="w-3.5 h-3.5" /> View Bilty PDF <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {bilty.bilty_image && (
                <a href={bilty.bilty_image} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                  <FileText className="w-3.5 h-3.5" /> {bilty.source_type === 'MNL' ? 'Bilty Document' : 'Transit Bilty'} <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {bilty.transit_bilty_image && (
                <a href={bilty.transit_bilty_image} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200 hover:bg-green-100 transition">
                  <FileText className="w-3.5 h-3.5" /> Transit Bilty Doc <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </Section>
        )}

        {/* Station Info (MNL) */}
        {bilty.source_type === 'MNL' && bilty.station && (
          <div className="px-3 py-2 bg-orange-50 rounded-lg border border-orange-200 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <Pill label="Station" value={bilty.station} bold />
            {bilty.w_name && <Pill label="Warehouse" value={bilty.w_name} />}
          </div>
        )}

        {/* Mobile Numbers Editor */}
        {bilty.source_type !== 'MNL' && (
          <Section title="Edit Mobile Numbers" icon={Phone} iconColor="text-blue-500">
            <MobileNumberEditor bilty={bilty} onUpdate={onBiltyUpdate} />
          </Section>
        )}

        {/* Charges (REG bilties) */}
        {bilty.source_type !== 'MNL' && (
          <Section title="Charges Breakdown" icon={IndianRupee} iconColor="text-green-600">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {[
                { l: 'Freight', v: bilty.freight_amount },
                { l: 'Labour', v: bilty.labour_charge },
                { l: 'Bill', v: bilty.bill_charge },
                { l: 'Toll', v: bilty.toll_charge },
                { l: 'DD', v: bilty.dd_charge },
                { l: 'Other', v: bilty.other_charge },
                { l: 'PF', v: bilty.pf_charge },
              ].map(c => (
                <div key={c.l} className="p-2 bg-slate-50 rounded text-center">
                  <div className="text-[8px] text-slate-400 font-semibold uppercase">{c.l}</div>
                  <div className="text-xs font-bold text-slate-700">₹{c.v != null ? Number(c.v).toLocaleString() : '0'}</div>
                </div>
              ))}
              <div className="p-2 bg-indigo-50 rounded text-center border border-indigo-200">
                <div className="text-[8px] text-indigo-500 font-bold uppercase">Total</div>
                <div className="text-sm font-black text-indigo-700">₹{bilty.total?.toLocaleString() || '0'}</div>
              </div>
            </div>
          </Section>
        )}

        {/* Transport Info */}
        {(bilty.transport_name || transportInfo) && (
          <Section title="Transport Details" icon={Truck} iconColor="text-purple-600">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                <Pill label="Transport" value={bilty.transport_name} bold />
                {bilty.transport_gst && <Pill label="GST" value={bilty.transport_gst} />}
                <div className="inline-flex items-center gap-1 text-[11px]">
                  <span className="text-slate-400 font-medium">Mobile:</span>
                  {editingTransportNum && bilty.source_type !== 'MNL' ? (
                    <div className="inline-flex items-center gap-1">
                      <input type="tel" value={tempTransportNum} onChange={(e) => setTempTransportNum(e.target.value)}
                        className="w-28 px-1.5 py-0.5 text-xs border border-purple-300 rounded focus:ring-1 focus:ring-purple-500" maxLength={20} />
                      <button onClick={handleSaveTransportNumber} disabled={savingTransportNum} className="p-0.5 bg-green-600 text-white rounded text-[10px]"><Save className="w-3 h-3" /></button>
                      <button onClick={() => setEditingTransportNum(false)} className="p-0.5 bg-slate-400 text-white rounded"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <span className="font-bold text-slate-800">{bilty.transport_number || 'N/A'}</span>
                      {bilty.source_type !== 'MNL' && (
                        <button onClick={handleEditTransportNumber} className="p-0.5 text-purple-600 hover:bg-purple-50 rounded"><Edit3 className="w-3 h-3" /></button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {transportInfo && (
                <div className="p-2 bg-slate-50 rounded border border-slate-200 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                  {transportInfo.city_name && <Pill label="City" value={transportInfo.city_name} />}
                  {transportInfo.mob_number && <Pill label="Hub Mobile" value={transportInfo.mob_number} />}
                  {transportInfo.branch_owner_name && <Pill label="Branch Owner" value={transportInfo.branch_owner_name} />}
                  {transportInfo.address && <Pill label="Address" value={transportInfo.address} />}
                  {transportInfo.website && (
                    <div className="inline-flex items-center gap-1 text-[11px]">
                      <span className="text-slate-400 font-medium">Web:</span>
                      <a href={transportInfo.website.startsWith('http') ? transportInfo.website : `https://${transportInfo.website}`} target="_blank" rel="noopener noreferrer"
                        className="font-bold text-indigo-600 hover:underline">{transportInfo.website}</a>
                    </div>
                  )}
                </div>
              )}

              {transportInfo?.admin && (
                <div className="p-2 bg-indigo-50 rounded border border-indigo-200">
                  <div className="text-[9px] font-bold text-indigo-600 uppercase mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> Transport Admin (HO)</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    <Pill label="Name" value={transportInfo.admin.transport_name} bold />
                    {transportInfo.admin.owner_name && <Pill label="Owner" value={transportInfo.admin.owner_name} />}
                    {transportInfo.admin.gstin && <Pill label="GSTIN" value={transportInfo.admin.gstin} />}
                    {transportInfo.admin.hub_mobile_number && <Pill label="Hub Mobile" value={transportInfo.admin.hub_mobile_number} />}
                    {transportInfo.admin.address && <Pill label="Address" value={transportInfo.admin.address} />}
                  </div>
                  {(transportInfo.admin.sample_ref_image || transportInfo.admin.sample_challan_image) && (
                    <div className="flex gap-2 mt-2">
                      {transportInfo.admin.sample_ref_image && (
                        <a href={transportInfo.admin.sample_ref_image} target="_blank" rel="noopener noreferrer"
                          className="text-[9px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-bold hover:bg-indigo-200 flex items-center gap-1">
                          📄 Sample Ref <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {transportInfo.admin.sample_challan_image && (
                        <a href={transportInfo.admin.sample_challan_image} target="_blank" rel="noopener noreferrer"
                          className="text-[9px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-bold hover:bg-indigo-200 flex items-center gap-1">
                          📄 Sample Challan <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Kaat Details */}
        {kaatDetails && (
          <Section title="Bilty Wise Kaat" icon={Calculator} iconColor="text-teal-600"
            badge={kaatDetails.rate_type === 'per_kg' ? '⚖️ Per KG' : kaatDetails.rate_type === 'per_pkg' ? '📦 Per PKG' : kaatDetails.rate_type}>
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { l: 'Actual Rate', v: kaatDetails.actual_kaat_rate, show: kaatDetails.actual_kaat_rate != null },
                  { l: 'Kaat Amount', v: kaatDetails.kaat, show: kaatDetails.kaat != null },
                  { l: 'Rate/KG', v: kaatDetails.rate_per_kg, show: Number(kaatDetails.rate_per_kg || 0) > 0 },
                  { l: 'Rate/PKG', v: kaatDetails.rate_per_pkg, show: Number(kaatDetails.rate_per_pkg || 0) > 0 },
                  { l: 'PF', v: kaatDetails.pf, show: Number(kaatDetails.pf || 0) > 0 },
                ].filter(c => c.show).map(c => (
                  <div key={c.l} className="p-2 bg-teal-50 rounded border border-teal-200 text-center">
                    <div className="text-[8px] text-teal-600 font-semibold uppercase">{c.l}</div>
                    <div className="text-xs font-bold text-slate-800">₹{Number(c.v).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {(Number(kaatDetails.dd_chrg || 0) > 0 || Number(kaatDetails.bilty_chrg || 0) > 0 || Number(kaatDetails.ewb_chrg || 0) > 0 || Number(kaatDetails.labour_chrg || 0) > 0 || Number(kaatDetails.other_chrg || 0) > 0) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] p-2 bg-slate-50 rounded">
                  {Number(kaatDetails.dd_chrg || 0) > 0 && <Pill label="DD Chrg" value={`₹${Number(kaatDetails.dd_chrg).toLocaleString()}`} />}
                  {Number(kaatDetails.bilty_chrg || 0) > 0 && <Pill label="Bilty Chrg" value={`₹${Number(kaatDetails.bilty_chrg).toLocaleString()}`} />}
                  {Number(kaatDetails.ewb_chrg || 0) > 0 && <Pill label="EWB Chrg" value={`₹${Number(kaatDetails.ewb_chrg).toLocaleString()}`} />}
                  {Number(kaatDetails.labour_chrg || 0) > 0 && <Pill label="Labour Chrg" value={`₹${Number(kaatDetails.labour_chrg).toLocaleString()}`} />}
                  {Number(kaatDetails.other_chrg || 0) > 0 && <Pill label="Other Chrg" value={`₹${Number(kaatDetails.other_chrg).toLocaleString()}`} />}
                </div>
              )}

              {(kaatDetails.pohonch_no || kaatDetails.bilty_number || kaatDetails.challan_no || kaatDetails.destinationCity || kaatDetails.transportName) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] p-2 bg-white rounded border border-slate-100">
                  {kaatDetails.pohonch_no && <Pill label="Pohonch No" value={kaatDetails.pohonch_no} bold />}
                  {kaatDetails.bilty_number && <Pill label="Bilty No" value={kaatDetails.bilty_number} bold />}
                  {kaatDetails.challan_no && <Pill label="Challan" value={kaatDetails.challan_no} />}
                  {kaatDetails.destinationCity && <Pill label="Destination" value={kaatDetails.destinationCity} />}
                  {kaatDetails.transportName && <Pill label="Transport" value={kaatDetails.transportName} />}
                </div>
              )}

              {kaatDetails.hubRate && (
                <div className="p-2 bg-blue-50 rounded border border-blue-200 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                  <span className="text-[9px] font-bold text-blue-600 uppercase">Hub Rate:</span>
                  {kaatDetails.hubRate.transport_name && <Pill label="Transport" value={kaatDetails.hubRate.transport_name} />}
                  {kaatDetails.hubRate.goods_type && <Pill label="Goods" value={kaatDetails.hubRate.goods_type} />}
                  <Pill label="Mode" value={kaatDetails.hubRate.pricing_mode === 'per_kg' ? '⚖️ Per KG' : '📦 Per PKG'} />
                  {Number(kaatDetails.hubRate.rate_per_kg || 0) > 0 && <Pill label="Rate/KG" value={`₹${Number(kaatDetails.hubRate.rate_per_kg).toLocaleString()}`} bold />}
                  {Number(kaatDetails.hubRate.rate_per_pkg || 0) > 0 && <Pill label="Rate/PKG" value={`₹${Number(kaatDetails.hubRate.rate_per_pkg).toLocaleString()}`} bold />}
                  {Number(kaatDetails.hubRate.min_charge || 0) > 0 && <Pill label="Min Chrg" value={`₹${Number(kaatDetails.hubRate.min_charge).toLocaleString()}`} />}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Complaint & Tracking */}
        {searchRecord && (
          <Section title="Complaint & Tracking" icon={Shield} iconColor="text-red-500"
            badge={searchRecord.is_complaint ? (searchRecord.is_resolved ? '✅ Resolved' : '🚨 Active') : null}
            defaultOpen={searchRecord.is_complaint && !searchRecord.is_resolved}>
            <div className="space-y-3">
              {searchRecord.search_count > 1 && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-800">⚠️ Searched {searchRecord.search_count} times</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    <Pill label="First" value={fmtDateTime(searchRecord.first_searched_at)} />
                    <Pill label="Last" value={fmtDateTime(searchRecord.last_searched_at)} />
                    {searchRecord.first_user && <Pill label="First By" value={searchRecord.first_user?.name || searchRecord.first_user?.username} />}
                    {searchRecord.last_user && <Pill label="Last By" value={searchRecord.last_user?.name || searchRecord.last_user?.username} />}
                  </div>
                </div>
              )}

              {searchRecord.is_complaint && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">🚨</div>
                      <div className={`flex-1 h-1 ${searchRecord.in_investigation || searchRecord.is_resolved ? 'bg-amber-400' : 'bg-slate-200'}`} />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${searchRecord.in_investigation || searchRecord.is_resolved ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'}`}>🔍</div>
                      <div className={`flex-1 h-1 ${searchRecord.is_resolved ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${searchRecord.is_resolved ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>✅</div>
                    </div>
                  </div>

                  <div className="p-2 bg-red-50 rounded border border-red-200 text-[11px]">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <Pill label="Registered" value={fmtDateTime(searchRecord.complaint_registered_at)} />
                      <Pill label="By" value={searchRecord.complaint_user?.name || searchRecord.complaint_user?.username || '-'} bold />
                    </div>
                    {searchRecord.complaint_remark && <div className="mt-1 text-xs text-slate-700 bg-white p-1.5 rounded">💬 {searchRecord.complaint_remark}</div>}
                  </div>

                  {searchRecord.is_resolved && (
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[11px]">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <Pill label="Resolved" value={fmtDateTime(searchRecord.resolved_at)} />
                        <Pill label="By" value={searchRecord.resolved_user?.name || searchRecord.resolved_user?.username || '-'} bold />
                      </div>
                      {searchRecord.resolution_remark && <div className="mt-1 text-xs text-slate-700 bg-white p-1.5 rounded">💬 {searchRecord.resolution_remark}</div>}
                    </div>
                  )}

                  {/* Send Complaint WhatsApp Button - only for regular bilties with phone numbers */}
                  {bilty?.source_type !== 'MNL' && (bilty?.consignor_number || bilty?.consignee_number) && (
                    <div className="p-2 bg-green-50 rounded border border-green-200 flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => sendComplaintWhatsApp(bilty.gr_no)}
                        disabled={sendingComplaintMsg}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition inline-flex items-center gap-1.5"
                      >
                        {sendingComplaintMsg ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                        ) : complaintMsgSent ? (
                          <><CheckCircle2 className="w-3 h-3" /> Sent ✅</>
                        ) : (
                          <>📲 Send Complaint WhatsApp</>
                        )}
                      </button>
                      <span className="text-[10px] text-green-700">
                        {bilty.consignor_number && <span>Consignor: {bilty.consignor_number}</span>}
                        {bilty.consignor_number && bilty.consignee_number && <span> • </span>}
                        {bilty.consignee_number && <span>Consignee: {bilty.consignee_number}</span>}
                      </span>
                    </div>
                  )}

                  {searchRecord.in_investigation && !searchRecord.is_resolved && (
                    <div>
                      {!showResolveForm ? (
                        <button onClick={() => setShowResolveForm(true)}
                          className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition">
                          ✅ Mark as Resolved
                        </button>
                      ) : (
                        <div className="p-2 bg-white rounded border border-emerald-300 space-y-2">
                          <textarea value={resolutionRemark} onChange={(e) => setResolutionRemark(e.target.value)}
                            placeholder="Resolution details (optional)..." className="w-full p-2 text-xs border rounded-lg resize-none" rows={2} />
                          <div className="flex gap-2">
                            <button onClick={handleResolve} disabled={resolveLoading}
                              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 disabled:opacity-50">
                              {resolveLoading ? 'Resolving...' : 'Confirm Resolve'}
                            </button>
                            <button onClick={() => { setShowResolveForm(false); setResolutionRemark(''); }}
                              className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded hover:bg-slate-200">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!searchRecord.is_complaint && (
                <div className="p-2.5 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1"><Shield className="w-3 h-3 text-orange-600" /> Register as Complaint</div>
                  <textarea value={complaintRemark} onChange={(e) => setComplaintRemark(e.target.value)}
                    placeholder="Describe complaint reason (optional)..." className="w-full p-2 text-xs border border-orange-200 rounded-lg resize-none mb-2" rows={2} />
                  <button onClick={handleRegisterComplaint} disabled={complaintLoading}
                    className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition">
                    {complaintLoading ? '⏳ Registering...' : '🚨 Register Complaint'}
                  </button>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Search History */}
        {searchLogs && searchLogs.length > 0 && (
          <Section title="Search History" icon={History} iconColor="text-slate-500" badge={`${searchLogs.length} searches`}>
            <div className="space-y-1">
              {searchLogs.map((log, idx) => (
                <div key={log.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] ${idx === 0 ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${idx === 0 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Clock className="w-2.5 h-2.5" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-bold text-slate-800">{log.users?.name || log.users?.username || 'Unknown'}</span>
                    {log.users?.post && <span className="text-[9px] px-1 py-0.5 bg-indigo-100 text-indigo-700 rounded font-semibold">{log.users.post}</span>}
                    <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${log.source_type === 'MNL' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {log.source_type === 'MNL' ? 'MNL' : 'REG'}
                    </span>
                    <span className="text-slate-400">{fmtDateTime(log.searched_at)}</span>
                    {idx === 0 && <span className="text-[8px] px-1 py-0.5 bg-green-100 text-green-700 rounded font-bold">Latest</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 text-[10px] text-slate-400 px-1">
        <span>Created: {fmtDateTime(bilty.created_at)}</span>
        {bilty.updated_at && <span>Updated: {fmtDateTime(bilty.updated_at)}</span>}
      </div>
    </div>
  );
};

export default BiltyDetailsDisplay;
