'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Search, Loader2, AlertCircle, FileText, Clock, Package, Weight, IndianRupee,
  MapPin, Truck, Building2, ShieldCheck, ShieldAlert, CheckCircle, RefreshCw, Eye, MessageSquareWarning,
  X, Ticket, Receipt, Tag, MessagesSquare, Send, Navigation
} from 'lucide-react';

const API_BASE = 'https://api.movesure.io';
// Full live tracking for one consignment
const trackUrl = (grNo) => `https://console.movesure.io/print/${encodeURIComponent(grNo)}`;
const PAGE_SIZE = 20;

// Public tracking API: only customer-facing fields (no kaat / pf / driver details)
async function fetchConsignorBilties({ gst, grNo, fromDate, toDate, page, pageSize = PAGE_SIZE }) {
  const params = new URLSearchParams({ consignor_gst: gst, page: String(page), page_size: String(pageSize) });
  if (grNo) params.set('gr_no', grNo);
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);

  const res = await fetch(`${API_BASE}/api/consignor/bilties?${params}`);
  const json = await res.json();
  if (!res.ok || json.status !== 'success') {
    throw new Error(json.message || `Failed to load bilties (${res.status})`);
  }
  return json.data;
}

// The API only matches an exact GR no, so searching loads every bilty in the date range
// (50 per call, the API max) and filters in the browser.
const SEARCH_PAGE_SIZE = 50;
const SEARCH_MAX_PAGES = 60; // up to 3,000 bilties per search
async function fetchAllConsignorBilties({ gst, fromDate, toDate }) {
  let all = [];
  let meta = null;
  for (let page = 1; page <= SEARCH_MAX_PAGES; page++) {
    const d = await fetchConsignorBilties({ gst, fromDate, toDate, page, pageSize: SEARCH_PAGE_SIZE });
    meta = meta || d;
    all = all.concat(d.rows || []);
    if (!d.has_more) return { meta, rows: all, truncated: false };
  }
  return { meta, rows: all, truncated: true };
}

const SEARCH_FIELDS = [
  { value: 'all', label: 'All fields' },
  { value: 'gr', label: 'GR No' },
  { value: 'pvt', label: 'Pvt marks' },
  { value: 'consignee', label: 'Consignee' },
  { value: 'invoice', label: 'Invoice no' },
  { value: 'city', label: 'Destination' }
];

const norm = (v) => String(v ?? '').toUpperCase();
const digits = (v) => String(v ?? '').replace(/\D/g, '');

// Partial, case-insensitive match. For GR, typing only some digits (e.g. "1578") also matches "A15784".
function matchesSearch(row, field, query) {
  const q = norm(query).trim();
  if (!q) return true;
  const gr = () => norm(row.gr_no).includes(q) || (digits(q) && digits(q) === q.replace(/\s/g, '') && digits(row.gr_no).includes(digits(q)));
  const checks = {
    gr,
    pvt: () => norm(row.pvt_marks).includes(q),
    consignee: () => norm(row.consignee_name).includes(q),
    invoice: () => norm(row.invoice?.invoice_no).includes(q),
    city: () => norm(row.to_city?.city_name).includes(q)
  };
  if (field !== 'all') return checks[field] ? checks[field]() : true;
  return Object.values(checks).some((fn) => fn()) || norm(row.contents).includes(q);
}

async function fetchComplaints(gst, grNo) {
  const params = new URLSearchParams({ consignor_gst: gst });
  if (grNo) params.set('gr_no', grNo);
  const res = await fetch(`${API_BASE}/api/consignor/complaints?${params}`);
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Failed to load complaints');
  return json.data || [];
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
const inr = (n) => Number(n || 0).toLocaleString('en-IN');

const PAYMENT_LABEL = { 'to-pay': 'To Pay', paid: 'Paid', freeofcost: 'FOC' };
const DELIVERY_LABEL = { 'godown-delivery': 'Godown delivery', 'door-delivery': 'Door delivery' };

function EwbChip({ ewb }) {
  return (
    <span
      title={ewb.valid_upto ? `Valid upto ${fmtDateTime(ewb.valid_upto)}` : ''}
      className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-lg border ${
        ewb.is_valid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
      }`}
    >
      {ewb.is_valid ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
      {ewb.ewb_number}
    </span>
  );
}

const Label = ({ children }) => <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{children}</p>;

function BiltyCard({ row, onComplain, onWhatsApp }) {
  const t = row.tracking || {};
  // dispatched once it has a dispatch date / vehicle, or has moved past "Booked"
  const dispatched = !!(t.dispatch_date || t.vehicle_number || (Number.isInteger(t.step) && t.step >= 1));
  const c = row.complaints || {};
  const inv = row.invoice || {};

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top row */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-mono font-bold text-amber-700 text-base">{row.gr_no}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtDate(row.bilty_date)}</span>
          {c.open > 0 && c.latest && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 flex items-center gap-1">
              <Ticket className="w-3 h-3" /> Complaint open: {c.latest.ticket_no} ({c.latest.status_label})
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {row.no_of_pkg ?? '—'} pkg</span>
          <span className="flex items-center gap-1"><Weight className="w-3.5 h-3.5" /> {row.weight ?? '—'} kg</span>
          <span className="flex items-center gap-1 font-semibold text-slate-800"><IndianRupee className="w-3.5 h-3.5" /> {inr(row.freight_amount)}</span>
          {row.payment_mode && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.payment_mode === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
              {PAYMENT_LABEL[row.payment_mode] || row.payment_mode}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Route & parties */}
        <div className="space-y-2">
          <Label>Route</Label>
          <p className="text-sm font-semibold text-slate-800 flex flex-wrap items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="wrap-break-word">{row.from_city?.city_name || '—'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="wrap-break-word">{row.to_city?.city_name || '—'}</span>
          </p>
          <div className="mt-3"><Label>Consignee</Label></div>
          <p className="text-sm text-slate-700 wrap-break-word">{row.consignee_name || '—'}</p>
          <div className="mt-3"><Label>Delivered by (collect from)</Label></div>
          <p className="text-sm text-slate-700 flex flex-wrap items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="wrap-break-word font-medium">{row.delivery_partner || '—'}</span>
          </p>
          {row.delivery_type && <p className="text-xs text-slate-500">{DELIVERY_LABEL[row.delivery_type] || row.delivery_type}</p>}
        </div>

        {/* Dispatch + track */}
        <div className="space-y-3">
          <Label>Dispatch</Label>
          {dispatched ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <p className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Dispatched
              </p>
              {t.dispatch_date && <p className="text-xs text-emerald-700 mt-0.5">{fmtDateTime(t.dispatch_date)}</p>}
              {t.vehicle_number && (
                <p className="text-xs text-emerald-800 font-medium flex items-center gap-1 mt-0.5"><Truck className="w-3.5 h-3.5" /> {t.vehicle_number}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Not dispatched yet</p>
          )}
          <a href={trackUrl(row.gr_no)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shadow-sm">
            <Navigation className="w-3.5 h-3.5" /> Track Consignment
          </a>
        </div>

        {/* Goods, invoice, EWB, actions */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Contents</Label>
              <p className="text-sm text-slate-700 wrap-break-word">{row.contents || '—'}</p>
            </div>
            <div>
              <Label>Pvt marks</Label>
              <p className="text-sm text-slate-700 wrap-break-word flex items-center gap-1"><Tag className="w-3 h-3 text-slate-400" />{row.pvt_marks || '—'}</p>
            </div>
          </div>
          {(inv.invoice_no || inv.invoice_value) && (
            <div>
              <Label>Invoice</Label>
              <p className="text-sm text-slate-700 flex flex-wrap items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-400" /> {inv.invoice_no || '—'}
                {inv.invoice_value ? <span className="text-slate-500">· ₹{inr(inv.invoice_value)}</span> : null}
                {inv.invoice_date ? <span className="text-slate-400 text-xs">· {fmtDate(inv.invoice_date)}</span> : null}
              </p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">E-Way Bills</p>
            {(row.eway_bills || []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {row.eway_bills.map((ewb) => <EwbChip key={ewb.ewb_number} ewb={ewb} />)}
              </div>
            ) : <p className="text-xs text-slate-400">None</p>}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {row.bilty_pdf_url && (
              <a href={row.bilty_pdf_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-black">
                <Eye className="w-3.5 h-3.5" /> View Bilty
              </a>
            )}
            <button onClick={() => onWhatsApp(row)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">
              <Send className="w-3.5 h-3.5" /> Send on WhatsApp
            </button>
            <button onClick={() => onComplain(row)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50 text-xs font-semibold hover:bg-red-100">
              <MessageSquareWarning className="w-3.5 h-3.5" /> Raise complaint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const WA_COOLDOWN_MS = 60 * 1000; // one send per bilty per minute from this page
const lastWaSend = {};

// Send the bilty on WhatsApp via the backend (POST /api/bilty/whatsapp/{gr_no}).
// Default: the consignor / consignee numbers on the bilty. Optionally one other 10-digit mobile.
function WhatsAppModal({ row, onClose }) {
  const [mode, setMode] = useState('bilty'); // 'bilty' | 'other'
  const [number, setNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const send = async (e) => {
    e.preventDefault();
    if (mode === 'other' && !/^[6-9]\d{9}$/.test(number)) { setError('Enter a valid 10-digit mobile number.'); return; }
    const wait = (lastWaSend[row.gr_no] || 0) + WA_COOLDOWN_MS - Date.now();
    if (wait > 0) { setError(`Already sent. Please wait ${Math.ceil(wait / 1000)} seconds before sending again.`); return; }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/bilty/whatsapp/${encodeURIComponent(row.gr_no)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: mode === 'other' ? JSON.stringify({ numbers: [number] }) : undefined
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status !== 'success') throw new Error(json.message || `Could not send (${res.status})`);
      lastWaSend[row.gr_no] = Date.now();
      setResult(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const mask = (n) => (String(n).length >= 10 ? `${String(n).slice(0, 2)}******${String(n).slice(-2)}` : n);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><Send className="w-5 h-5 text-emerald-600" /> Send GR {row.gr_no} on WhatsApp</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-600" /></button>
        </div>
        {result ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-900">{result.message || 'Sent on WhatsApp'}</p>
            {(result.receivers || []).length > 0 && (
              <p className="text-sm text-slate-500">Sent to {(result.receivers || []).map(mask).join(', ')}</p>
            )}
            {(result.skipped || []).length > 0 && (
              <ul className="text-xs text-amber-700 space-y-0.5">
                {result.skipped.map((sk, i) => <li key={i}>{sk.party ? `${sk.party}: ` : ''}{sk.reason}</li>)}
              </ul>
            )}
            <button onClick={onClose} className="mt-2 px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">Close</button>
          </div>
        ) : (
          <form onSubmit={send} className="p-5 space-y-3">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${mode === 'bilty' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
              <input type="radio" name="wa-mode" className="mt-1 accent-emerald-600" checked={mode === 'bilty'} onChange={() => setMode('bilty')} />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Numbers on the bilty</span>
                <span className="block text-xs text-slate-500">Consignor and consignee mobiles saved at booking</span>
              </span>
            </label>
            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${mode === 'other' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
              <input type="radio" name="wa-mode" className="mt-1 accent-emerald-600" checked={mode === 'other'} onChange={() => setMode('other')} />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-900">Another number</span>
                {mode === 'other' && (
                  <input autoFocus value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric"
                    placeholder="10-digit mobile"
                    className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600" />
                )}
              </span>
            </label>
            <button type="submit" disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send on WhatsApp
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ComplaintModal({ row, gst, categories, onClose, onDone }) {
  const [category, setCategory] = useState(categories[0]?.code || 'delay');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) { setError('Enter a valid 10-digit mobile number so we can call you back.'); return; }
    if (!message.trim()) { setError('Please describe the problem.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/consignor/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consignor_gst: gst, gr_no: row.gr_no, category, message: message.trim(), name: name.trim() || undefined, phone })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status !== 'success') throw new Error(json.message || `Could not register complaint (${res.status})`);
      setResult(json);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-amber-600 focus:border-amber-600';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><MessageSquareWarning className="w-5 h-5 text-red-600" /> Complaint for GR {row.gr_no}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-600" /></button>
        </div>
        {result ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-900">{result.message || 'Complaint registered'}</p>
            {result.data?.ticket_no && <p className="font-mono text-amber-700 font-bold">{result.data.ticket_no}</p>}
            {result.data?.status_label && <p className="text-sm text-slate-500">Status: {result.data.status_label}</p>}
            <button onClick={onClose} className="mt-2 px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-3">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">What went wrong?</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
                {categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Details</label>
              <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={input}
                placeholder="e.g. Goods not delivered after 6 days" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Your name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Mobile *</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric"
                  className={`${input} font-mono`} placeholder="10-digit mobile" />
              </div>
            </div>
            <p className="text-xs text-slate-500">Our office will call you back on this number.</p>
            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Submit complaint
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const COMPLAINT_TONE = { RESOLVED: 'bg-emerald-100 text-emerald-700', CLOSED: 'bg-slate-200 text-slate-700' };

function MyComplaints({ gst, reloadKey }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    fetchComplaints(gst)
      .then((d) => { if (!ignore) { setRows(d); setError(''); } })
      .catch((e) => { if (!ignore) setError(e.message); });
    return () => { ignore = true; };
  }, [gst, reloadKey]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!rows) return <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>;
  if (!rows.length) return <p className="text-sm text-slate-500">You haven&apos;t raised any complaints.</p>;

  return (
    <div className="space-y-2">
      {rows.map((c) => (
        <div key={c.ticket_no} className="border border-slate-200 rounded-xl p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-700">{c.ticket_no}</span>
              <span className="text-xs text-slate-500">GR {c.gr_no}</span>
              <span className="text-xs font-semibold text-slate-700">{c.category_label || c.category}</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${COMPLAINT_TONE[c.status] || 'bg-amber-100 text-amber-800'}`}>{c.status_label || c.status}</span>
          </div>
          <p className="text-sm text-slate-700 mt-1.5">{c.message}</p>
          {c.reply && (
            <div className="mt-2 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-900">
              <span className="font-semibold">Reply: </span>{c.reply}
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-1.5">
            Raised {fmtDateTime(c.created_at)}{c.resolved_at ? ` · resolved ${fmtDateTime(c.resolved_at)}` : c.updated_at ? ` · updated ${fmtDateTime(c.updated_at)}` : ''}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ConsignorBiltyPage() {
  const params = useParams();
  const consignorGst = decodeURIComponent(params.consignor_gst || '').toUpperCase();

  const [searchInput, setSearchInput] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [query, setQuery] = useState('');          // applied search (filtered in the browser)
  const [searchRows, setSearchRows] = useState(null); // every bilty in the date range, loaded for searching
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [complainRow, setComplainRow] = useState(null);
  const [waRow, setWaRow] = useState(null);
  const [showComplaints, setShowComplaints] = useState(false);
  const [complaintsKey, setComplaintsKey] = useState(0);

  useEffect(() => {
    if (!consignorGst) return;
    let ignore = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        if (query) {
          // search: load every bilty in the range once, then filter / page in the browser
          const { meta, rows: all, truncated } = await fetchAllConsignorBilties({ gst: consignorGst, fromDate, toDate });
          if (!ignore) { setData(meta); setSearchRows(all); setSearchTruncated(truncated); }
        } else {
          const result = await fetchConsignorBilties({ gst: consignorGst, fromDate, toDate, page });
          if (!ignore) { setData(result); setSearchRows(null); setSearchTruncated(false); }
        }
      } catch (e) {
        if (!ignore) { setError(e.message); setData(null); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
    // page changes while searching are handled locally - no refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consignorGst, !!query, fromDate, toDate, query ? 0 : page, reloadKey]);

  const load = () => setReloadKey((k) => k + 1);
  const runSearch = (e) => { e?.preventDefault(); setQuery(searchInput.trim()); setPage(1); };
  const clearSearch = () => { setSearchInput(''); setQuery(''); setPage(1); };

  // Search results (all matches) or the current server page
  const matches = useMemo(
    () => (query && searchRows ? searchRows.filter((r) => matchesSearch(r, searchField, query)) : null),
    [query, searchRows, searchField]
  );
  const rows = useMemo(
    () => (matches ? matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : data?.rows || []),
    [matches, data, page]
  );
  const totalCount = matches ? matches.length : data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasMore = matches ? page < totalPages : !!data?.has_more;
  const openComplaints = useMemo(() => rows.reduce((sum, row) => sum + (row.complaints?.open || 0), 0), [rows]);
  const activeFieldLabel = SEARCH_FIELDS.find((f) => f.value === searchField)?.label || 'All fields';
  const categories = data?.complaint_categories || [];

  const onComplaintDone = useCallback(() => { setComplaintsKey((k) => k + 1); load(); }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shrink-0">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight wrap-break-word">{data?.consignor_name || (loading ? 'Loading…' : 'Your bilties')}</h1>
              <p className="text-xs font-mono text-slate-500 break-all">{data?.consignor_gst || consignorGst}</p>
            </div>
          </div>
          <button onClick={() => setShowComplaints((s) => !s)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <MessagesSquare className="w-4 h-4" /> My complaints
          </button>
        </div>

        {showComplaints && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900">My complaints</h2>
              <button onClick={() => setShowComplaints(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <MyComplaints gst={consignorGst} reloadKey={complaintsKey} />
          </div>
        )}

        {/* GR No search + filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
          <form onSubmit={runSearch} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
            <div className="sm:flex-1 sm:min-w-64">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Search</label>
              <div className="flex rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-amber-600 focus-within:border-amber-600 overflow-hidden bg-white">
                <select value={searchField} onChange={(e) => { setSearchField(e.target.value); setPage(1); }}
                  className="px-2 py-2 bg-slate-50 border-r border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none" aria-label="Search in">
                  {SEARCH_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={searchField === 'pvt' ? 'e.g. ASK' : searchField === 'gr' ? 'e.g. 1578 or A15784' : 'GR no, pvt marks, consignee, invoice…'}
                    className="w-full pl-9 pr-9 py-2 text-sm text-slate-900 focus:outline-none" />
                  {query && (
                    <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100" title="Clear">
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                  className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-amber-600 focus:border-amber-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">To Date</label>
                <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                  className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-amber-600 focus:border-amber-600" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 sm:flex-none px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">Search</button>
              <button type="button" onClick={load} disabled={loading} title="Refresh"
                className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </form>
        </div>

        {/* Search result / open complaints */}
        {data && (query || openComplaints > 0) && (
          <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
            {query && (
              <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800">
                <b>{totalCount}</b> result{totalCount === 1 ? '' : 's'} for &quot;{query}&quot; in {activeFieldLabel}
                {searchTruncated ? ' (first 3,000 bilties searched — narrow the dates for more)' : ''}
              </span>
            )}
            {openComplaints > 0 && (
              <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700"><b>{openComplaints}</b> open complaint{openComplaints === 1 ? '' : 's'}</span>
            )}
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-amber-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading your bilties…</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-700 font-semibold mb-1">Could not load bilties</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            {query ? <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" /> : <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />}
            <p className="text-slate-500 font-semibold">{query ? `No bilty matches "${query}" in ${activeFieldLabel}` : 'No bilties found for this GSTIN'}</p>
            {query && <button onClick={clearSearch} className="mt-3 text-sm font-semibold text-amber-700 hover:underline">Show all bilties</button>}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {rows.map((row) => <BiltyCard key={row.gr_no} row={row} onComplain={setComplainRow} onWhatsApp={setWaRow} />)}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
              <p className="text-xs text-slate-500">Page {page} of {totalPages} · {totalCount} {query ? 'matching' : 'bilties total'}</p>
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition">Prev</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={!hasMore}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {waRow && <WhatsAppModal row={waRow} onClose={() => setWaRow(null)} />}

      {complainRow && (
        <ComplaintModal
          row={complainRow}
          gst={consignorGst}
          categories={categories.length ? categories : [{ code: 'other', label: 'Other' }]}
          onClose={() => setComplainRow(null)}
          onDone={onComplaintDone}
        />
      )}
    </div>
  );
}
