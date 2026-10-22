'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Search, Loader2, AlertCircle, FileText, Clock, Package, Weight, IndianRupee,
  MapPin, Truck, Building2, ShieldCheck, ShieldAlert, CheckCircle, RefreshCw, Download, MessageSquareWarning,
  X, Ticket, Receipt, Tag, MessagesSquare, Send
} from 'lucide-react';

const API_BASE = 'https://api.movesure.io';
const PAGE_SIZE = 20;

// Public tracking API: only customer-facing fields (no kaat / pf / driver details)
async function fetchConsignorBilties({ gst, grNo, fromDate, toDate, page }) {
  const params = new URLSearchParams({ consignor_gst: gst, page: String(page), page_size: String(PAGE_SIZE) });
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

// Status badge colour by tracking code
const STATUS_TONE = {
  booked: 'bg-slate-200 text-slate-700',
  dispatched: 'bg-blue-100 text-blue-700',
  at_hub: 'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-amber-100 text-amber-800',
  at_destination: 'bg-emerald-100 text-emerald-700',
  out_for_door_delivery: 'bg-emerald-600 text-white',
  delivered: 'bg-emerald-600 text-white'
};

// Even-width stepper driven by tracking.steps / tracking.step (0-based current step)
function TrackingStepper({ tracking }) {
  const steps = tracking?.steps || [];
  const current = Number.isInteger(tracking?.step) ? tracking.step : -1;
  if (!steps.length) return null;
  const fill = current >= 0 ? ((current + 1) / steps.length) * 100 : 0;

  return (
    <div className="pt-1 w-full">
      <div className="flex items-start justify-between gap-1">
        {steps.map((label, i) => {
          const done = i <= current;
          const isNow = i === current;
          return (
            <div key={label} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                isNow ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {done ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-2.5 h-2.5" />}
              </div>
              <span className={`text-[9px] text-center leading-tight ${isNow ? 'text-emerald-800 font-bold' : done ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>{label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

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
  const c = row.complaints || {};
  const inv = row.invoice || {};

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top row */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-mono font-bold text-amber-700 text-base">{row.gr_no}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtDate(row.bilty_date)}</span>
          {t.label && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_TONE[t.code] || 'bg-slate-200 text-slate-700'}`}>{t.label}</span>
          )}
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

        {/* Tracking */}
        <div className="space-y-2">
          <Label>Tracking</Label>
          <TrackingStepper tracking={t} />
          <div className="pt-1 space-y-1">
            {t.vehicle_number && (
              <p className="text-sm text-slate-700 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-slate-400" /> {t.vehicle_number}</p>
            )}
            {t.dispatch_date
              ? <p className="text-xs text-slate-400">Dispatched {fmtDateTime(t.dispatch_date)}</p>
              : <p className="text-xs text-slate-400">Not dispatched yet</p>}
          </div>
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
                <Download className="w-3.5 h-3.5" /> Download Bilty
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

  const [grInput, setGrInput] = useState('');
  const [grNo, setGrNo] = useState('');   // applied server-side GR search
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
        const result = await fetchConsignorBilties({ gst: consignorGst, grNo, fromDate, toDate, page });
        if (!ignore) setData(result);
      } catch (e) {
        if (!ignore) { setError(e.message); setData(null); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [consignorGst, grNo, fromDate, toDate, page, reloadKey]);

  const load = () => setReloadKey((k) => k + 1);
  const searchGr = (e) => { e?.preventDefault(); setGrNo(grInput.trim().toUpperCase()); setPage(1); };
  const clearGr = () => { setGrInput(''); setGrNo(''); setPage(1); };

  const rows = useMemo(() => data?.rows || [], [data]);
  const totalPackages = useMemo(() => rows.reduce((sum, row) => sum + (Number(row.no_of_pkg) || 0), 0), [rows]);
  const openComplaints = useMemo(() => rows.reduce((sum, row) => sum + (row.complaints?.open || 0), 0), [rows]);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
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
          <form onSubmit={searchGr} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
            <div className="sm:flex-1 sm:min-w-55">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Search GR No</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={grInput} onChange={(e) => setGrInput(e.target.value)} placeholder="e.g. A14450"
                  className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-amber-600 focus:border-amber-600" />
                {grNo && (
                  <button type="button" onClick={clearGr} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100" title="Clear">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                )}
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

        {/* Summary */}
        {data && (
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 mb-5">
            <div className="text-center px-4 py-2 bg-amber-50 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-amber-700">{data.total}</p>
              <p className="text-xs text-amber-700/70">{grNo ? `Matching ${grNo}` : 'Total Bilties'}</p>
            </div>
            <div className="text-center px-4 py-2 bg-blue-50 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-blue-700">{totalPackages}</p>
              <p className="text-xs text-blue-700/70">Packages (this page)</p>
            </div>
            {openComplaints > 0 && (
              <div className="text-center px-4 py-2 bg-red-50 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-red-700">{openComplaints}</p>
                <p className="text-xs text-red-700/70">Open complaints</p>
              </div>
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
            {grNo ? <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" /> : <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />}
            <p className="text-slate-500 font-semibold">{grNo ? `No bilty found with GR No "${grNo}"` : 'No bilties found for this GSTIN'}</p>
            {grNo && <button onClick={clearGr} className="mt-3 text-sm font-semibold text-amber-700 hover:underline">Show all bilties</button>}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {rows.map((row) => <BiltyCard key={row.gr_no} row={row} onComplain={setComplainRow} onWhatsApp={setWaRow} />)}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
              <p className="text-xs text-slate-500">Page {data.page} of {totalPages} · {data.total} bilties total</p>
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition">Prev</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={!data.has_more}
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
