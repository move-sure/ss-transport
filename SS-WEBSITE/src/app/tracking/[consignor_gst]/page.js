'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Search, RefreshCw, Loader2, AlertCircle, Package, Truck, User, Phone,
  MapPin, CheckCircle, XCircle, Clock, FileText, Weight, IndianRupee,
  ChevronRight, ShieldCheck, ShieldAlert, Building2,
} from 'lucide-react';

const API_BASE = 'https://api.movesure.io';
const PAGE_SIZE = 20;

async function fetchConsignorBilties({ gst, name, fromDate, toDate, page }) {
  const params = new URLSearchParams({
    consignor_gst: gst,
    page: String(page),
    page_size: String(PAGE_SIZE),
  });
  if (name) params.set('consignor_name', name);
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);

  const res = await fetch(`${API_BASE}/api/consignor/bilties?${params}`);
  const json = await res.json();
  if (!res.ok || json.status !== 'success') {
    throw new Error(json.message || `Failed to load bilties (${res.status})`);
  }
  return json.data;
}

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function fmtDateTime(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}

function StageDot({ label, done }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[64px]">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
        {done ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3 h-3" />}
      </div>
      <span className={`text-[9px] text-center leading-tight ${done ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function EwbChip({ ewb }) {
  return (
    <span
      title={ewb.valid_upto ? `Valid upto ${fmtDateTime(ewb.valid_upto)}` : ''}
      className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-lg border ${
        ewb.is_valid
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-red-50 text-red-700 border-red-200'
      }`}
    >
      {ewb.is_valid ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
      {ewb.ewb_number}
    </span>
  );
}

function BiltyCard({ row }) {
  const d = row.dispatch || {};
  const stages = d.delivery_stages || {};
  const kaat = row.kaat_details;
  const partB = row.part_b_updates || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top row */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-amber-700 text-base">{row.gr_no}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {fmtDate(row.bilty_date)}
          </span>
          {d.is_in_transit ? (
            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">IN TRANSIT · Challan {d.challan_no}</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-bold">NOT DISPATCHED</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {row.no_of_pkg ?? '—'} pkg</span>
          <span className="flex items-center gap-1"><Weight className="w-3.5 h-3.5" /> {row.weight ?? '—'} kg</span>
          <span className="flex items-center gap-1 font-semibold text-slate-800"><IndianRupee className="w-3.5 h-3.5" /> {Number(row.total || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Route & parties */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Route</p>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {row.from_city?.city_name || '—'} <ChevronRight className="w-3.5 h-3.5 text-slate-300" /> {row.to_city?.city_name || '—'}
          </p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-3">Consignee</p>
          <p className="text-sm text-slate-700">{row.consignee_name || '—'}</p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-3">Transport</p>
          <p className="text-sm text-slate-700 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /> {row.transport_name || '—'}</p>
        </div>

        {/* Dispatch */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Dispatch</p>
          {d.is_in_transit ? (
            <>
              <p className="text-sm text-slate-700 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-400" /> {d.truck_number || '—'}
              </p>
              {d.driver?.name && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Driver: {d.driver.name}
                  {d.driver.mobile_number && (
                    <a href={`tel:${d.driver.mobile_number}`} className="text-amber-700 flex items-center gap-0.5 hover:underline">
                      <Phone className="w-3 h-3" />{d.driver.mobile_number}
                    </a>
                  )}
                </p>
              )}
              {d.owner?.name && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Owner: {d.owner.name}
                  {d.owner.mobile_number && (
                    <a href={`tel:${d.owner.mobile_number}`} className="text-amber-700 flex items-center gap-0.5 hover:underline">
                      <Phone className="w-3 h-3" />{d.owner.mobile_number}
                    </a>
                  )}
                </p>
              )}
              <p className="text-xs text-slate-400">Dispatched {fmtDateTime(d.dispatch_date)}</p>
              <div className="flex items-center gap-2 pt-2 overflow-x-auto">
                <StageDot label="Out Branch1" done={!!stages.out_from_branch1} />
                <StageDot label="At Branch2" done={!!stages.delivered_at_branch2} />
                <StageDot label="Out Branch2" done={!!stages.out_from_branch2} />
                <StageDot label="At Dest." done={!!stages.delivered_at_destination} />
                <StageDot label="Door Del." done={!!stages.out_for_door_delivery} />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Not yet added to a challan.</p>
          )}
        </div>

        {/* EWB + Part B + Kaat */}
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">E-Way Bills</p>
            {(row.eway_bills || []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {row.eway_bills.map((ewb) => <EwbChip key={ewb.ewb_number} ewb={ewb} />)}
              </div>
            ) : <p className="text-xs text-slate-400">None</p>}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Part-B History</p>
            {partB.length > 0 ? (
              <div className="space-y-1">
                {partB.map((u, i) => (
                  <p key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                    {u.is_success ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                    {u.transporter_name || u.transporter_id || 'Unknown'}
                    <span className="text-slate-400">{fmtDateTime(u.updated_at)}</span>
                  </p>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400">Not run yet</p>}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Kaat / Crossing</p>
            {kaat ? (
              <div className="text-xs text-slate-600 space-y-0.5">
                <p>Pohonch No: <span className="font-semibold">{kaat.pohonch_no || '—'}</span></p>
                <p>Crossing Challan: <span className="font-semibold">{kaat.crossing_challan_no || '—'}</span></p>
                <p>Kaat: <span className="font-semibold">{kaat.kaat ?? '—'}</span> · PF: <span className="font-semibold">{kaat.pf ?? '—'}</span></p>
              </div>
            ) : <p className="text-xs text-slate-400">Not reached crossing yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConsignorBiltyPage() {
  const params = useParams();
  const consignorGst = decodeURIComponent(params.consignor_gst || '').toUpperCase();

  const [grFilter, setGrFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!consignorGst) return;
    let ignore = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchConsignorBilties({ gst: consignorGst, fromDate, toDate, page });
        if (!ignore) setData(result);
      } catch (e) {
        if (!ignore) { setError(e.message); setData(null); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [consignorGst, fromDate, toDate, page, reloadKey]);

  const load = () => setReloadKey((k) => k + 1);

  const filteredRows = useMemo(() => {
    const rows = data?.rows || [];
    if (!grFilter.trim()) return rows;
    const q = grFilter.trim().toLowerCase();
    return rows.filter((row) => row.gr_no?.toLowerCase().includes(q));
  }, [data, grFilter]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link href="/" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Consignor Bilty 360 View</h1>
            <p className="text-sm text-gray-500">Every bilty for one consignor — dispatch, e-way bill, Part-B, and kaat, in one place.</p>
          </div>
        </div>

        {/* GR No search + filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Search GR No</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={grFilter}
                  onChange={(e) => setGrFilter(e.target.value)}
                  placeholder="e.g. A14450"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">From Date</label>
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-amber-600 focus:border-amber-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">To Date</label>
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-amber-600 focus:border-amber-600" />
            </div>
            <button type="button" onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Summary */}
        {data && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div>
              <p className="text-lg font-bold text-gray-900">{data.consignor_name || 'Unknown Consignor'}</p>
              <p className="text-xs font-mono text-slate-500">{data.consignor_gst}</p>
            </div>
            <div className="text-center px-4 py-2 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-700">{data.total}</p>
              <p className="text-xs text-amber-700/70">Total Bilties</p>
            </div>
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-amber-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading consignor bilties…</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-700 font-semibold mb-1">Could not load bilties</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        ) : !data || (data.rows || []).length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold">No bilties found for this GSTIN</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold">No bilty matches GR No &quot;{grFilter}&quot; on this page</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {filteredRows.map((row) => <BiltyCard key={row.gr_no} row={row} />)}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-slate-500">Page {data.page} of {totalPages} · {data.total} bilties total</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.has_more}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
