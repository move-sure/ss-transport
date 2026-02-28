'use client';

import React, { useState } from 'react';
import { Package, User, Users, Truck, FileText, IndianRupee, Info, UserCircle, Clock, Search, AlertTriangle, CheckCircle2, Shield, History, ExternalLink, Calculator, Phone, Edit3, Save, X, Building2, Globe, MapPin } from 'lucide-react';
import MobileNumberEditor from './mobile-number-editor';
import supabase from '../../app/utils/supabase';

const BiltyDetailsDisplay = ({ bilty, transitDetails, createdByUser, onBiltyUpdate, challanDetails, truck, driver, owner, searchRecord, searchLogs, onSearchRecordUpdate, user, kaatDetails, transportInfo }) => {
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [complaintRemark, setComplaintRemark] = useState('');
  const [resolutionRemark, setResolutionRemark] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [editingTransportNum, setEditingTransportNum] = useState(false);
  const [tempTransportNum, setTempTransportNum] = useState('');
  const [savingTransportNum, setSavingTransportNum] = useState(false);

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
      <div className="bg-white/95 p-6 rounded-lg border border-slate-200 shadow-sm text-center">
        <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">Search and select a bilty to view details</p>
      </div>
    );
  }

  const InfoRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
      <Icon className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold text-gray-500 uppercase">{label}</div>
        <div className="text-sm font-semibold text-gray-900 break-words">{value || 'N/A'}</div>
      </div>
    </div>
  );

  return (
    <div className="bg-white/95 rounded-lg border border-slate-200 shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-4 rounded-t-lg border-b-4 border-amber-500">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-black text-white tracking-tight">GR No: {bilty.gr_no}</h2>
              {bilty.source_type === 'MNL' && (
                <span className="text-[10px] px-2 py-0.5 bg-orange-500 text-white font-bold rounded-full">
                  📍 MANUAL BILTY
                </span>
              )}
            </div>
            <p className="text-slate-300 text-sm font-semibold">Date: {new Date(bilty.bilty_date).toLocaleDateString('en-IN')}</p>
            {createdByUser && (
              <div className="flex items-center gap-1.5 mt-2 bg-white/10 px-2 py-1 rounded w-fit">
                <UserCircle className="w-3.5 h-3.5" />
                <span className="text-xs text-slate-200">Created by: <strong className="text-white">{createdByUser.name || createdByUser.username}</strong></span>
                {createdByUser.post && <span className="text-xs text-slate-300">({createdByUser.post})</span>}
              </div>
            )}
          </div>
          
          {/* Right Side - Destination & Dispatch Date */}
          <div className="flex flex-col items-end gap-3">
            {bilty.destination && (
              <div className="text-right">
                <div className="text-xs text-amber-400 uppercase font-bold tracking-wider mb-1">Destination</div>
                <div className="text-3xl font-black text-white leading-tight tracking-tight">
                  📍 {bilty.destination}
                </div>
              </div>
            )}
            {challanDetails?.dispatch_date && (
              <div className="text-right">
                <div className="text-xs text-emerald-400 uppercase font-bold tracking-wider mb-1">Dispatched</div>
                <div className="text-xl font-bold text-white leading-tight">
                  {new Date(challanDetails.dispatch_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-sm font-semibold text-emerald-300 mt-0.5">
                  {new Date(challanDetails.dispatch_date).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            )}
            {transitDetails && (
              <div className="bg-white/10 px-3 py-1.5 rounded">
                <div className="text-[10px] text-slate-300 uppercase font-semibold">Challan No</div>
                <div className="text-base font-bold text-white">{transitDetails.challan_no}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Complaint Traffic Signal */}
        {searchRecord && (
          <div className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5">
              {/* Red Signal */}
              <div className={`w-5 h-5 rounded-full border-2 shadow-inner transition-all duration-300 ${
                searchRecord.is_complaint
                  ? 'bg-red-500 border-red-600 shadow-red-300 animate-pulse'
                  : 'bg-gray-200 border-gray-300'
              }`} title="Complaint Registered" />
              {/* Yellow Signal */}
              <div className={`w-5 h-5 rounded-full border-2 shadow-inner transition-all duration-300 ${
                searchRecord.in_investigation && !searchRecord.is_resolved
                  ? 'bg-amber-400 border-amber-500 shadow-amber-200 animate-pulse'
                  : searchRecord.in_investigation || searchRecord.is_resolved
                    ? 'bg-amber-400 border-amber-500 shadow-amber-200'
                    : 'bg-gray-200 border-gray-300'
              }`} title="Under Investigation" />
              {/* Green Signal */}
              <div className={`w-5 h-5 rounded-full border-2 shadow-inner transition-all duration-300 ${
                searchRecord.is_resolved
                  ? 'bg-emerald-500 border-emerald-600 shadow-emerald-300'
                  : 'bg-gray-200 border-gray-300'
              }`} title="Resolved" />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              searchRecord.is_resolved
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : searchRecord.in_investigation
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : searchRecord.is_complaint
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}>
              {searchRecord.is_resolved
                ? '✅ Resolved'
                : searchRecord.in_investigation
                  ? '🔍 Under Investigation'
                  : searchRecord.is_complaint
                    ? '🚨 Complaint Registered'
                    : '⚪ No Complaint'}
            </span>
            {searchRecord.search_count > 1 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                searchRecord.search_count > 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {searchRecord.search_count}× searched
              </span>
            )}
          </div>
        )}

        {/* PDF Document Button - for Regular bilties with pdf_bucket */}
        {bilty.source_type !== 'MNL' && bilty.pdf_bucket && (
          <div className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border-2 border-violet-300">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <FileText className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Bilty PDF Document</h3>
                  <p className="text-[10px] text-gray-500">View or download the generated bilty PDF</p>
                </div>
              </div>
              <a
                href={bilty.pdf_bucket}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold rounded-lg hover:from-violet-700 hover:to-purple-700 transition shadow-md hover:shadow-lg"
              >
                <FileText className="w-4 h-4" />
                View PDF
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Transit Bilty Image */}
        {bilty.bilty_image && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                {bilty.source_type === 'MNL' ? 'Bilty Document' : 'Transit Bilty Document'}
              </h3>
              <a
                href={bilty.bilty_image}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                📄 View Document
              </a>
            </div>
            <div className="bg-white rounded-lg p-2 border border-blue-200">
              <img
                src={bilty.bilty_image}
                alt="Transit Bilty"
                className="w-full h-auto max-h-96 object-contain rounded"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden text-center py-4 text-gray-500 text-sm">
                📄 Document preview not available. Click &quot;View Document&quot; to open.
              </div>
            </div>
          </div>
        )}

        {/* Station Transit Bilty Image */}
        {bilty.transit_bilty_image && (
          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                Transit Bilty Document
              </h3>
              <a
                href={bilty.transit_bilty_image}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition"
              >
                📄 View Document
              </a>
            </div>
            <div className="bg-white rounded-lg p-2 border border-green-200">
              <img
                src={bilty.transit_bilty_image}
                alt="Transit Bilty"
                className="w-full h-auto max-h-96 object-contain rounded"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden text-center py-4 text-gray-500 text-sm">
                📄 Document preview not available. Click &quot;View Document&quot; to open.
              </div>
            </div>
          </div>
        )}

        {/* Station Info */}
        {bilty.source_type === 'MNL' && bilty.station && (
          <div className="p-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded border border-orange-200">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 text-orange-600" />
                <span className="font-semibold text-gray-600">Station:</span>
                <span className="font-bold text-gray-900">{bilty.station}</span>
              </div>
              {bilty.w_name && (
                <>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-600">Warehouse:</span>
                    <span className="font-bold text-gray-900">{bilty.w_name}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Compact Challan Details */}
        {challanDetails && (
          <div className="p-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded border border-teal-200">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <div className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-teal-600" />
                <span className="font-semibold text-gray-600">Truck:</span>
                <span className="font-bold text-gray-900">{truck?.truck_number || 'N/A'}</span>
              </div>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-teal-600" />
                <span className="font-semibold text-gray-600">Owner:</span>
                <span className="font-bold text-gray-900">{owner?.name || 'N/A'}</span>
              </div>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 text-teal-600" />
                <span className="font-semibold text-gray-600">Challan:</span>
                <span className="font-bold text-gray-900">{challanDetails.challan_no}</span>
              </div>
              {challanDetails.dispatch_date && (
                <>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-600">Dispatched:</span>
                    <span className="font-bold text-teal-700">
                      {new Date(challanDetails.dispatch_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                      {' at '}
                      {new Date(challanDetails.dispatch_date).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </>
              )}
              {!challanDetails.is_dispatched && (
                <>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 font-bold rounded-full border border-orange-300">
                      Pending Dispatch
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Party Information */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            Party Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <InfoRow label="Consignor Name" value={bilty.consignor_name} icon={User} />
            <InfoRow label="Consignor GST" value={bilty.consignor_gst} icon={FileText} />
            <InfoRow label="Consignee Name" value={bilty.consignee_name} icon={User} />
            <InfoRow label="Consignee GST" value={bilty.consignee_gst} icon={FileText} />
          </div>
          
          {/* Mobile Numbers with Edit Option */}
          {bilty.source_type !== 'MNL' && (
            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
              <MobileNumberEditor bilty={bilty} onUpdate={onBiltyUpdate} />
            </div>
          )}
        </div>

        {/* Transport Information */}
        {(bilty.transport_name || bilty.transport_gst || bilty.transport_number || transportInfo) && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-purple-600" />
              Transport Information
            </h3>
            {/* Transport Name, GST, Number row */}
            <div className="p-2.5 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Truck className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-gray-500">Transport:</span>
                  <span className="text-xs font-bold text-gray-900">{bilty.transport_name || 'N/A'}</span>
                </div>
                {bilty.transport_gst && (
                  <>
                    <span className="text-gray-300">|</span>
                    <div className="inline-flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-gray-500">GST:</span>
                      <span className="text-xs font-bold text-gray-900">{bilty.transport_gst}</span>
                    </div>
                  </>
                )}
                <span className="text-gray-300">|</span>
                {/* Transport Number with Edit */}
                <div className="inline-flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-purple-600" />
                  <span className="text-[10px] font-semibold text-gray-500">Mobile:</span>
                  {editingTransportNum && bilty.source_type !== 'MNL' ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="tel"
                        value={tempTransportNum}
                        onChange={(e) => setTempTransportNum(e.target.value)}
                        className="w-28 px-1.5 py-0.5 text-xs font-semibold text-gray-900 border border-purple-300 rounded focus:ring-1 focus:ring-purple-500"
                        placeholder="Enter number"
                        maxLength={20}
                      />
                      <button
                        onClick={handleSaveTransportNumber}
                        disabled={savingTransportNum}
                        className="p-0.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        title="Save"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingTransportNum(false)}
                        disabled={savingTransportNum}
                        className="p-0.5 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-900">{bilty.transport_number || 'N/A'}</span>
                      {bilty.source_type !== 'MNL' && (
                        <button
                          onClick={handleEditTransportNumber}
                          className="p-0.5 text-purple-600 hover:bg-purple-100 rounded"
                          title="Edit transport number"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transport Record Details (from transports table) */}
            {transportInfo && (
              <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                  {transportInfo.city_name && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-purple-600" />
                      <span className="font-semibold text-gray-500">City:</span>
                      <span className="font-bold text-gray-900">{transportInfo.city_name}</span>
                    </div>
                  )}
                  {transportInfo.mob_number && (
                    <>
                      <span className="text-gray-300">|</span>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-purple-600" />
                        <span className="font-semibold text-gray-500">Hub Mobile:</span>
                        <span className="font-bold text-gray-900">{transportInfo.mob_number}</span>
                      </div>
                    </>
                  )}
                  {transportInfo.branch_owner_name && (
                    <>
                      <span className="text-gray-300">|</span>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-purple-600" />
                        <span className="font-semibold text-gray-500">Branch Owner:</span>
                        <span className="font-bold text-gray-900">{transportInfo.branch_owner_name}</span>
                      </div>
                    </>
                  )}
                  {transportInfo.address && (
                    <>
                      <span className="text-gray-300">|</span>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-purple-600" />
                        <span className="font-semibold text-gray-500">Address:</span>
                        <span className="font-bold text-gray-900">{transportInfo.address}</span>
                      </div>
                    </>
                  )}
                  {transportInfo.website && (
                    <>
                      <span className="text-gray-300">|</span>
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-purple-600" />
                        <span className="font-semibold text-gray-500">Website:</span>
                        <a href={transportInfo.website.startsWith('http') ? transportInfo.website : `https://${transportInfo.website}`} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">{transportInfo.website}</a>
                      </div>
                    </>
                  )}
                </div>

                {/* Transport Admin Details */}
                {transportInfo.admin && (
                  <div className="p-2 bg-gradient-to-r from-indigo-50 to-blue-50 rounded border border-indigo-200">
                    <div className="text-[10px] font-bold text-indigo-700 uppercase mb-1.5 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Transport Admin (Head Office)
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Truck className="w-3 h-3 text-indigo-600" />
                        <span className="font-semibold text-gray-500">Name:</span>
                        <span className="font-bold text-gray-900">{transportInfo.admin.transport_name}</span>
                      </div>
                      {transportInfo.admin.owner_name && (
                        <>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-indigo-600" />
                            <span className="font-semibold text-gray-500">Owner:</span>
                            <span className="font-bold text-gray-900">{transportInfo.admin.owner_name}</span>
                          </div>
                        </>
                      )}
                      {transportInfo.admin.gstin && (
                        <>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-indigo-600" />
                            <span className="font-semibold text-gray-500">GSTIN:</span>
                            <span className="font-bold text-gray-900">{transportInfo.admin.gstin}</span>
                          </div>
                        </>
                      )}
                      {transportInfo.admin.hub_mobile_number && (
                        <>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-indigo-600" />
                            <span className="font-semibold text-gray-500">Hub Mobile:</span>
                            <span className="font-bold text-gray-900">{transportInfo.admin.hub_mobile_number}</span>
                          </div>
                        </>
                      )}
                      {transportInfo.admin.address && (
                        <>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-indigo-600" />
                            <span className="font-semibold text-gray-500">Address:</span>
                            <span className="font-bold text-gray-900">{transportInfo.admin.address}</span>
                          </div>
                        </>
                      )}
                      {transportInfo.admin.website && (
                        <>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-indigo-600" />
                            <a href={transportInfo.admin.website.startsWith('http') ? transportInfo.admin.website : `https://${transportInfo.admin.website}`} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline text-[10px]">{transportInfo.admin.website}</a>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Sample Images */}
                    {(transportInfo.admin.sample_ref_image || transportInfo.admin.sample_challan_image) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {transportInfo.admin.sample_ref_image && (
                          <a href={transportInfo.admin.sample_ref_image} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded hover:bg-indigo-200 transition">
                            📄 Sample Ref Image
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {transportInfo.admin.sample_challan_image && (
                          <a href={transportInfo.admin.sample_challan_image} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded hover:bg-indigo-200 transition">
                            📄 Sample Challan Image
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Shipment Details */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-indigo-600" />
            Shipment Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <InfoRow label="Packages" value={bilty.no_of_pkg} icon={Package} />
            <InfoRow label="Weight (Kg)" value={bilty.weight || bilty.wt} icon={Info} />
            {bilty.pvt_marks && <InfoRow label="Private Marks" value={bilty.pvt_marks} icon={Info} />}
            {bilty.contain && <InfoRow label="Contains" value={bilty.contain} icon={Package} />}
            {bilty.rate != null && <InfoRow label="Rate" value={`₹${bilty.rate}`} icon={IndianRupee} />}
            <InfoRow label="Payment" value={bilty.payment_mode?.toUpperCase()} icon={FileText} />
            {bilty.invoice_no && <InfoRow label="Invoice No" value={bilty.invoice_no} icon={FileText} />}
            {bilty.invoice_value != null && <InfoRow label="Invoice Value" value={`₹${bilty.invoice_value.toLocaleString()}`} icon={IndianRupee} />}
            {bilty.e_way_bill && <InfoRow label="E-Way Bill" value={bilty.e_way_bill} icon={FileText} />}
          </div>
        </div>

        {/* Charges Breakdown */}
        {bilty.source_type !== 'MNL' ? (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-indigo-600" />
              Charges
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              <InfoRow label="Freight" value={bilty.freight_amount != null ? `₹${bilty.freight_amount.toLocaleString()}` : 'N/A'} icon={IndianRupee} />
              <InfoRow label="Labour" value={bilty.labour_charge != null ? `₹${bilty.labour_charge.toLocaleString()}` : 'N/A'} icon={IndianRupee} />
              <InfoRow label="Bill" value={bilty.bill_charge != null ? `₹${bilty.bill_charge.toLocaleString()}` : 'N/A'} icon={IndianRupee} />
              <InfoRow label="Toll" value={bilty.toll_charge != null ? `₹${bilty.toll_charge.toLocaleString()}` : 'N/A'} icon={IndianRupee} />
              <InfoRow label="DD" value={bilty.dd_charge != null ? `₹${bilty.dd_charge.toLocaleString()}` : 'N/A'} icon={IndianRupee} />
              <InfoRow label="Other" value={bilty.other_charge != null ? `₹${bilty.other_charge.toLocaleString()}` : 'N/A'} icon={IndianRupee} />
              <InfoRow label="PF" value={bilty.pf_charge != null ? `₹${bilty.pf_charge.toLocaleString()}` : 'N/A'} icon={IndianRupee} />
              <div className="flex items-start gap-1.5 p-2 bg-indigo-50 rounded border-2 border-indigo-200">
                <IndianRupee className="w-3.5 h-3.5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-semibold text-indigo-600 uppercase">TOTAL</div>
                  <div className="text-base font-bold text-indigo-700">₹{bilty.total?.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-indigo-600" />
              Amount
            </h3>
            <div className="flex items-start gap-1.5 p-2 bg-indigo-50 rounded border-2 border-indigo-200 w-fit">
              <IndianRupee className="w-3.5 h-3.5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-semibold text-indigo-600 uppercase">TOTAL AMOUNT</div>
                <div className="text-base font-bold text-indigo-700">₹{bilty.total?.toLocaleString() || '0'}</div>
              </div>
            </div>
          </div>
        )}

        {/* ===== SEARCH TRACKING & COMPLAINT SECTION ===== */}
        {searchRecord && (
          <div className="space-y-3 pt-2 border-t-2 border-indigo-200">

            {/* Already Searched Banner */}
            {(searchRecord.was_previously_searched || searchRecord.search_count > 1) && (
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-300 animate-pulse-once">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-amber-800 mb-1">⚠️ Already Searched Before!</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-gray-500 font-semibold">Total Searches:</span>
                        <span className="ml-1 text-lg font-black text-amber-700">{searchRecord.search_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-semibold">First Searched:</span>
                        <div className="font-bold text-gray-800">
                          {new Date(searchRecord.first_searched_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 font-semibold">Last Searched:</span>
                        <div className="font-bold text-gray-800">
                          {new Date(searchRecord.last_searched_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                      {searchRecord.is_complaint && (
                        <div>
                          <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-full border border-red-300">
                            🚨 Complaint Registered
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Complaint Status Flow */}
            {searchRecord.is_complaint && (
              <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border-2 border-red-200">
                <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  Complaint Details
                </h4>
                
                {/* Status Steps */}
                <div className="flex items-center gap-0 mb-4">
                  {/* Step 1: Registered */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold text-red-700 mt-1">Registered</span>
                    <span className="text-[8px] text-gray-500">
                      {searchRecord.complaint_registered_at
                        ? new Date(searchRecord.complaint_registered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : ''}
                    </span>
                  </div>
                  
                  {/* Connector */}
                  <div className={`flex-1 h-1.5 mx-1 rounded-full ${searchRecord.in_investigation || searchRecord.is_resolved ? 'bg-amber-400' : 'bg-gray-200'}`} />
                  
                  {/* Step 2: In Investigation */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                      searchRecord.in_investigation || searchRecord.is_resolved 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      <Search className="w-5 h-5" />
                    </div>
                    <span className={`text-[9px] font-bold mt-1 ${searchRecord.in_investigation || searchRecord.is_resolved ? 'text-amber-700' : 'text-gray-400'}`}>
                      Investigating
                    </span>
                    <span className="text-[8px] text-gray-500">
                      {searchRecord.investigation_started_at
                        ? new Date(searchRecord.investigation_started_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : ''}
                    </span>
                  </div>
                  
                  {/* Connector */}
                  <div className={`flex-1 h-1.5 mx-1 rounded-full ${searchRecord.is_resolved ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  
                  {/* Step 3: Resolved */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                      searchRecord.is_resolved 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className={`text-[9px] font-bold mt-1 ${searchRecord.is_resolved ? 'text-emerald-700' : 'text-gray-400'}`}>
                      Resolved
                    </span>
                    <span className="text-[8px] text-gray-500">
                      {searchRecord.resolved_at
                        ? new Date(searchRecord.resolved_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : ''}
                    </span>
                  </div>
                </div>

                {/* Detailed Complaint Info Cards */}
                <div className="space-y-2 mb-3">
                  {/* Complaint Registration Details */}
                  <div className="p-2.5 bg-white rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-[10px] font-bold text-red-700 uppercase">Complaint Registered</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-gray-400 font-semibold">Date & Time:</span>
                        <div className="font-bold text-gray-800">
                          {searchRecord.complaint_registered_at
                            ? new Date(searchRecord.complaint_registered_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold">Registered By:</span>
                        <div className="font-bold text-gray-800">
                          {searchRecord.complaint_user?.name || searchRecord.complaint_user?.username || '-'}
                          {searchRecord.complaint_user?.post && <span className="text-[9px] text-gray-400 ml-1">({searchRecord.complaint_user.post})</span>}
                        </div>
                      </div>
                    </div>
                    {searchRecord.complaint_remark && (
                      <div className="mt-2 p-2 bg-red-50 rounded border border-red-100">
                        <span className="text-[10px] text-gray-400 font-semibold">Remark:</span>
                        <div className="text-xs text-gray-800 mt-0.5">{searchRecord.complaint_remark}</div>
                      </div>
                    )}
                  </div>

                  {/* Investigation Details */}
                  {(searchRecord.in_investigation || searchRecord.is_resolved) && (
                    <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Search className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-bold text-amber-700 uppercase">Investigation</span>
                        {searchRecord.in_investigation && !searchRecord.is_resolved && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold rounded-full animate-pulse">🔍 ONGOING</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-gray-400 font-semibold">Started:</span>
                          <div className="font-bold text-gray-800">
                            {searchRecord.investigation_started_at
                              ? new Date(searchRecord.investigation_started_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400 font-semibold">Duration:</span>
                          <div className="font-bold text-gray-800">
                            {searchRecord.investigation_started_at
                              ? (() => {
                                  const start = new Date(searchRecord.investigation_started_at);
                                  const end = searchRecord.resolved_at ? new Date(searchRecord.resolved_at) : new Date();
                                  const diffMs = end - start;
                                  const days = Math.floor(diffMs / 86400000);
                                  const hours = Math.floor((diffMs % 86400000) / 3600000);
                                  if (days > 0) return `${days}d ${hours}h`;
                                  const mins = Math.floor((diffMs % 3600000) / 60000);
                                  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                                })()
                              : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resolution Details */}
                  {searchRecord.is_resolved && (
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">Resolved</span>
                        <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded-full">✅ CLOSED</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-gray-400 font-semibold">Resolved On:</span>
                          <div className="font-bold text-gray-800">
                            {searchRecord.resolved_at
                              ? new Date(searchRecord.resolved_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400 font-semibold">Resolved By:</span>
                          <div className="font-bold text-gray-800">
                            {searchRecord.resolved_user?.name || searchRecord.resolved_user?.username || '-'}
                            {searchRecord.resolved_user?.post && <span className="text-[9px] text-gray-400 ml-1">({searchRecord.resolved_user.post})</span>}
                          </div>
                        </div>
                      </div>
                      {searchRecord.resolution_remark && (
                        <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-100">
                          <span className="text-[10px] text-gray-400 font-semibold">Resolution Remark:</span>
                          <div className="text-xs text-gray-800 mt-0.5">{searchRecord.resolution_remark}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Resolve Action Button */}
                {searchRecord.in_investigation && !searchRecord.is_resolved && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    {!showResolveForm ? (
                      <button
                        onClick={() => setShowResolveForm(true)}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold rounded-lg hover:from-emerald-700 hover:to-green-700 transition shadow-md"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        ✅ Mark as Resolved
                      </button>
                    ) : (
                      <div className="p-3 bg-white rounded-lg border-2 border-emerald-300 space-y-2">
                        <div className="text-[10px] font-bold text-emerald-700 uppercase">Resolve this complaint</div>
                        <textarea
                          value={resolutionRemark}
                          onChange={(e) => setResolutionRemark(e.target.value)}
                          placeholder="Enter resolution details (optional)..."
                          className="w-full p-2.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                          rows={3}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleResolve}
                            disabled={resolveLoading}
                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
                          >
                            {resolveLoading ? (
                              <span className="animate-spin">⏳</span>
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            {resolveLoading ? 'Resolving...' : 'Confirm Resolve'}
                          </button>
                          <button
                            onClick={() => { setShowResolveForm(false); setResolutionRemark(''); }}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Register as Complaint (only if not already a complaint) */}
            {!searchRecord.is_complaint && (
              <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-600" />
                  Register as Complaint
                </h4>
                <textarea
                  value={complaintRemark}
                  onChange={(e) => setComplaintRemark(e.target.value)}
                  placeholder="Describe the complaint reason (optional)..."
                  className="w-full p-2 text-xs border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none mb-2"
                  rows={2}
                />
                <button
                  onClick={handleRegisterComplaint}
                  disabled={complaintLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold rounded-lg hover:from-orange-700 hover:to-red-700 transition shadow-sm disabled:opacity-50"
                >
                  {complaintLoading ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {complaintLoading ? 'Registering...' : '🚨 Register as Complaint'}
                </button>
              </div>
            )}

            {/* Search History Timeline */}
            {searchLogs && searchLogs.length > 0 && (
              <div className="p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-600" />
                  Search History
                  <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-bold">
                    {searchLogs.length} searches
                  </span>
                </h4>
                <div className="space-y-0 relative">
                  {/* Timeline line */}
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200" />
                  
                  {searchLogs.map((log, idx) => (
                    <div key={log.id} className="relative flex items-start gap-3 py-2">
                      {/* Timeline dot */}
                      <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        idx === 0 
                          ? 'bg-indigo-500 text-white' 
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}>
                        <Clock className="w-3 h-3" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-900">
                            {log.users?.name || log.users?.username || 'Unknown User'}
                          </span>
                          {log.users?.post && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-semibold">
                              {log.users.post}
                            </span>
                          )}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            log.source_type === 'MNL'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {log.source_type === 'MNL' ? '📍 MANUAL' : '📦 REGULAR'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {new Date(log.searched_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })}
                          {idx === 0 && (
                            <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold">
                              Latest
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bilty Wise Kaat Details */}
        {kaatDetails && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-teal-600" />
              Bilty Wise Kaat
              {kaatDetails.rate_type && (
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                  kaatDetails.rate_type === 'per_kg' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-green-100 text-green-700 border border-green-200'
                }`}>
                  {kaatDetails.rate_type === 'per_kg' ? '⚖️ Per KG' : '📦 Per PKG'}
                </span>
              )}
            </h3>
            <div className="p-3 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border-2 border-teal-200 space-y-3">
              {/* Primary Rates */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {kaatDetails.actual_kaat_rate != null && (
                  <div className="flex items-start gap-1.5 p-2 bg-white rounded border border-teal-200">
                    <IndianRupee className="w-3.5 h-3.5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-semibold text-teal-600 uppercase">Actual Kaat Rate</div>
                      <div className="text-sm font-bold text-gray-900">₹{Number(kaatDetails.actual_kaat_rate).toLocaleString()}</div>
                    </div>
                  </div>
                )}
                {kaatDetails.kaat != null && (
                  <div className="flex items-start gap-1.5 p-2 bg-white rounded border border-teal-200">
                    <IndianRupee className="w-3.5 h-3.5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-semibold text-teal-600 uppercase">Kaat Amount</div>
                      <div className="text-sm font-bold text-gray-900">₹{Number(kaatDetails.kaat).toLocaleString()}</div>
                    </div>
                  </div>
                )}
                {kaatDetails.rate_per_kg != null && Number(kaatDetails.rate_per_kg) > 0 && (
                  <div className="flex items-start gap-1.5 p-2 bg-white rounded border border-blue-200">
                    <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-semibold text-blue-600 uppercase">Rate / KG</div>
                      <div className="text-sm font-bold text-gray-900">₹{Number(kaatDetails.rate_per_kg).toLocaleString()}</div>
                    </div>
                  </div>
                )}
                {kaatDetails.rate_per_pkg != null && Number(kaatDetails.rate_per_pkg) > 0 && (
                  <div className="flex items-start gap-1.5 p-2 bg-white rounded border border-green-200">
                    <Package className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-semibold text-green-600 uppercase">Rate / PKG</div>
                      <div className="text-sm font-bold text-gray-900">₹{Number(kaatDetails.rate_per_pkg).toLocaleString()}</div>
                    </div>
                  </div>
                )}
                {kaatDetails.pf != null && Number(kaatDetails.pf) > 0 && (
                  <div className="flex items-start gap-1.5 p-2 bg-white rounded border border-purple-200">
                    <IndianRupee className="w-3.5 h-3.5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-semibold text-purple-600 uppercase">PF</div>
                      <div className="text-sm font-bold text-gray-900">₹{Number(kaatDetails.pf).toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Kaat Charges */}
              {(Number(kaatDetails.dd_chrg || 0) > 0 || Number(kaatDetails.bilty_chrg || 0) > 0 || Number(kaatDetails.ewb_chrg || 0) > 0 || Number(kaatDetails.labour_chrg || 0) > 0 || Number(kaatDetails.other_chrg || 0) > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {Number(kaatDetails.dd_chrg || 0) > 0 && <InfoRow label="DD Charge" value={`₹${Number(kaatDetails.dd_chrg).toLocaleString()}`} icon={IndianRupee} />}
                  {Number(kaatDetails.bilty_chrg || 0) > 0 && <InfoRow label="Bilty Charge" value={`₹${Number(kaatDetails.bilty_chrg).toLocaleString()}`} icon={IndianRupee} />}
                  {Number(kaatDetails.ewb_chrg || 0) > 0 && <InfoRow label="EWB Charge" value={`₹${Number(kaatDetails.ewb_chrg).toLocaleString()}`} icon={IndianRupee} />}
                  {Number(kaatDetails.labour_chrg || 0) > 0 && <InfoRow label="Labour Charge" value={`₹${Number(kaatDetails.labour_chrg).toLocaleString()}`} icon={IndianRupee} />}
                  {Number(kaatDetails.other_chrg || 0) > 0 && <InfoRow label="Other Charge" value={`₹${Number(kaatDetails.other_chrg).toLocaleString()}`} icon={IndianRupee} />}
                </div>
              )}

              {/* Reference Details */}
              {(kaatDetails.pohonch_no || kaatDetails.bilty_number || kaatDetails.challan_no || kaatDetails.destinationCity || kaatDetails.transportName) && (
                <div className="p-2 bg-white/80 rounded border border-teal-100">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    {kaatDetails.pohonch_no && (
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-teal-600" />
                        <span className="font-semibold text-gray-500">Pohonch No:</span>
                        <span className="font-bold text-gray-900">{kaatDetails.pohonch_no}</span>
                      </div>
                    )}
                    {kaatDetails.bilty_number && (
                      <>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-500">Bilty No:</span>
                          <span className="font-bold text-gray-900">{kaatDetails.bilty_number}</span>
                        </div>
                      </>
                    )}
                    {kaatDetails.challan_no && (
                      <>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-500">Challan:</span>
                          <span className="font-bold text-gray-900">{kaatDetails.challan_no}</span>
                        </div>
                      </>
                    )}
                    {kaatDetails.destinationCity && (
                      <>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-500">Destination:</span>
                          <span className="font-bold text-gray-900">📍 {kaatDetails.destinationCity}</span>
                        </div>
                      </>
                    )}
                    {kaatDetails.transportName && (
                      <>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                          <Truck className="w-3 h-3 text-teal-600" />
                          <span className="font-semibold text-gray-500">Transport:</span>
                          <span className="font-bold text-gray-900">{kaatDetails.transportName}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Hub Rate Details */}
              {kaatDetails.hubRate && (
                <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded border border-blue-200">
                  <div className="text-[10px] font-bold text-blue-700 uppercase mb-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Transport Hub Rate
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    {kaatDetails.hubRate.transport_name && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-500">Transport:</span>
                        <span className="font-bold text-gray-900">{kaatDetails.hubRate.transport_name}</span>
                      </div>
                    )}
                    {kaatDetails.hubRate.goods_type && (
                      <>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-500">Goods:</span>
                          <span className="font-bold text-gray-900">{kaatDetails.hubRate.goods_type}</span>
                        </div>
                      </>
                    )}
                    <span className="text-gray-300">|</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-500">Mode:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        kaatDetails.hubRate.pricing_mode === 'per_kg' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {kaatDetails.hubRate.pricing_mode === 'per_kg' ? '⚖️ Per KG' : '📦 Per PKG'}
                      </span>
                    </div>
                    {kaatDetails.hubRate.rate_per_kg != null && Number(kaatDetails.hubRate.rate_per_kg) > 0 && (
                      <>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-500">Hub Rate/KG:</span>
                          <span className="font-bold text-teal-700">₹{Number(kaatDetails.hubRate.rate_per_kg).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    {kaatDetails.hubRate.rate_per_pkg != null && Number(kaatDetails.hubRate.rate_per_pkg) > 0 && (
                      <>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-500">Hub Rate/PKG:</span>
                          <span className="font-bold text-teal-700">₹{Number(kaatDetails.hubRate.rate_per_pkg).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    {kaatDetails.hubRate.min_charge != null && Number(kaatDetails.hubRate.min_charge) > 0 && (
                      <>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-500">Min Charge:</span>
                          <span className="font-bold text-teal-700">₹{Number(kaatDetails.hubRate.min_charge).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Information */}
        {bilty.remark && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              Additional Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InfoRow label="Remarks" value={bilty.remark} icon={Info} />
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-3 pt-1.5 border-t border-gray-200">
          <div className={`px-2 py-1 rounded font-bold text-[10px] ${
            bilty.saving_option === 'DRAFT'
              ? 'bg-yellow-100 text-amber-800 border border-yellow-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}>
            Status: {bilty.saving_option}
          </div>
          <div className="text-[9px] text-gray-500">
            Created: {new Date(bilty.created_at).toLocaleString('en-IN')}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BiltyDetailsDisplay;
