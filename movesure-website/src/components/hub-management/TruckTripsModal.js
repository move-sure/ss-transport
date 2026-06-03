'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Plus, Truck, Send, Trash2, Link2, Unlink, Search, Loader2,
  AlertCircle, RefreshCw, Hash, User, ChevronDown,
  ArrowLeft, Clock, PackageCheck, CheckCircle2, Route,
} from 'lucide-react';

const API_URL = 'https://api.movesure.io';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server error (${res.status}): ${text.slice(0, 200)}`);
  }
}

const STATUS_COLORS = {
  pending:    { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400' },
  dispatched: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500'  },
  received:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-500' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const icons = { pending: Clock, dispatched: Send, received: PackageCheck };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text} border ${c.border}`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Challan Multi-Select Dropdown ───────────────────────────────────────────
// Uses pre-loaded unlinked challans from /api/truck-trips/init
function ChallanDropdown({ tripId, unlinkedChallans, onLinked }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [linking, setLinking] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = unlinkedChallans.filter(c =>
    !search.trim() || c.challan_no.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const handleLink = async () => {
    if (!selected.size) return;
    setLinking(true);
    setErr('');
    try {
      const json = await apiFetch(`/api/truck-trips/${tripId}/link-challans`, {
        method: 'POST',
        body: JSON.stringify({ challan_ids: [...selected] }),
      });
      if (json.status === 'success') {
        setSelected(new Set());
        setOpen(false);
        onLinked(json);
      } else {
        setErr(json.message || 'Failed to link');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLinking(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setSearch(''); }}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm"
      >
        <Link2 className="h-3.5 w-3.5" />
        Add Challans
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search challan no..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">No unlinked challans</div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 ${selected.has(c.id) ? 'bg-indigo-50' : ''}`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected.has(c.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                    {selected.has(c.id) && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900">{c.challan_no}</div>
                    <div className="text-xs text-gray-500">{c.total_bilty_count || 0} bilties · {c.date ? new Date(c.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</div>
                  </div>
                </button>
              ))
            )}
          </div>

          {err && <p className="px-3 py-2 text-xs text-red-600 bg-red-50">{err}</p>}

          {selected.size > 0 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleLink}
                disabled={linking}
                className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Link {selected.size} Challan{selected.size > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Create Trip Form ─────────────────────────────────────────────────────────
function CreateTripForm({ user, initData, initLoading, onCreated, onCancel }) {
  const trucks   = initData?.trucks   || [];
  const drivers  = initData?.drivers  || [];
  const owners   = initData?.owners   || [];
  const challans = initData?.challans || [];

  const [form, setForm] = useState({ truck_id: '', driver_id: '', owner_id: '', branch_id: '', remarks: '' });
  const [selectedChallans, setSelectedChallans] = useState(new Set());
  const [challanSearch, setChallanSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleChallan = (id) => setSelectedChallans(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const filteredChallans = challans.filter(c =>
    !challanSearch.trim() || c.challan_no.toLowerCase().includes(challanSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.truck_id) { setErr('Please select a truck'); return; }
    setSaving(true);
    setErr('');
    try {
      const json = await apiFetch('/api/truck-trips/create-with-challans', {
        method: 'POST',
        body: JSON.stringify({
          truck_id: form.truck_id,
          driver_id: form.driver_id || null,
          owner_id: form.owner_id || null,
          branch_id: form.branch_id || null,
          remarks: form.remarks || null,
          created_by: user?.id,
          challan_ids: [...selectedChallans],
        }),
      });
      if (json.status === 'success') {
        onCreated(json.data);
      } else {
        setErr(json.message || 'Failed to create trip');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <h3 className="text-base font-bold text-gray-900">New Truck Trip</h3>
      </div>

      {err && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {err}
        </div>
      )}

      {/* Truck */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Truck <span className="text-red-500">*</span>
        </label>
        <select
          value={form.truck_id}
          onChange={e => set('truck_id', e.target.value)}
          disabled={initLoading}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 disabled:opacity-60"
        >
          <option value="">{initLoading ? 'Loading trucks...' : trucks.length === 0 ? 'No trucks found' : '— Select Truck —'}</option>
          {trucks.map(t => (
            <option key={t.id} value={t.id}>
              {t.truck_number}{t.truck_type ? ` (${t.truck_type})` : ''}{t.current_location ? ` · ${t.current_location}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Driver */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Driver</label>
        <select
          value={form.driver_id}
          onChange={e => set('driver_id', e.target.value)}
          disabled={initLoading}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 disabled:opacity-60"
        >
          <option value="">{initLoading ? 'Loading...' : drivers.length === 0 ? 'No drivers found' : '— Select Driver —'}</option>
          {drivers.map(s => (
            <option key={s.id} value={s.id}>{s.name}{s.mobile_number ? ` · ${s.mobile_number}` : ''}</option>
          ))}
        </select>
      </div>

      {/* Owner */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Owner / Supervisor</label>
        <select
          value={form.owner_id}
          onChange={e => set('owner_id', e.target.value)}
          disabled={initLoading}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 disabled:opacity-60"
        >
          <option value="">{initLoading ? 'Loading...' : owners.length === 0 ? 'No owners found' : '— Select Owner —'}</option>
          {owners.map(s => (
            <option key={s.id} value={s.id}>{s.name}{s.mobile_number ? ` · ${s.mobile_number}` : ''}</option>
          ))}
        </select>
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Remarks</label>
        <input
          type="text"
          value={form.remarks}
          onChange={e => set('remarks', e.target.value)}
          placeholder="Optional note..."
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 placeholder-gray-400"
        />
      </div>

      {/* Challans */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Link Challans <span className="text-gray-400 font-normal normal-case">(optional, can add later)</span>
        </label>

        {challans.length === 0 ? (
          <div className="p-3 border border-dashed border-gray-200 rounded-xl text-xs text-center text-gray-400">
            No unlinked challans available
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search challan..."
                  value={challanSearch}
                  onChange={e => setChallanSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900"
                />
              </div>
            </div>
            <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
              {filteredChallans.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggleChallan(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left ${selectedChallans.has(c.id) ? 'bg-indigo-50' : ''}`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedChallans.has(c.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                    {selectedChallans.has(c.id) && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-gray-900">{c.challan_no}</span>
                    <span className="text-xs text-gray-400 ml-2">{c.total_bilty_count || 0} bilties</span>
                  </div>
                </button>
              ))}
            </div>
            {selectedChallans.size > 0 && (
              <div className="px-3 py-2 bg-indigo-50 text-xs text-indigo-700 font-semibold border-t border-indigo-100">
                {selectedChallans.size} challan{selectedChallans.size > 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Trip
        </button>
      </div>
    </div>
  );
}

// ─── Trip Detail Panel ────────────────────────────────────────────────────────
function TripDetail({ tripId, user, unlinkedChallans, onBack, onDeleted, onRefreshList, onRefreshInit }) {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchTrip = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const json = await apiFetch(`/api/truck-trips/${tripId}`);
      if (json.status === 'success') setTrip(json.data);
      else setErr(json.message || 'Failed to load trip');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { fetchTrip(); }, [fetchTrip]);

  const doAction = async (key, method, url, body) => {
    setActionLoading(key);
    setErr('');
    try {
      const json = await apiFetch(url, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (json.status === 'success') {
        showToast(json.message || 'Done!');
        if (key === 'delete') { onDeleted(); return; }
        fetchTrip();
        onRefreshList();
        onRefreshInit();
      } else {
        setErr(json.message || 'Something went wrong');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleDispatch = () => doAction('dispatch', 'POST', `/api/truck-trips/${tripId}/dispatch`, { user_id: user?.id });
  const handleReceive  = () => doAction('receive',  'POST', `/api/truck-trips/${tripId}/receive`,  { user_id: user?.id });
  const handleDelete   = () => { if (confirm('Delete this pending trip? All challans will be unlinked.')) doAction('delete', 'DELETE', `/api/truck-trips/${tripId}`); };
  const handleUnlink   = (challanId) => doAction(`unlink_${challanId}`, 'POST', `/api/truck-trips/${tripId}/unlink-challan/${challanId}`);

  const onLinked = (json) => {
    showToast(`Linked ${json.linked_count} challan(s)`);
    fetchTrip();
    onRefreshList();
    onRefreshInit();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
    </div>
  );

  if (!trip) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-8 w-8 text-red-300 mb-2" />
      <p className="text-gray-500 text-sm">{err || 'Trip not found'}</p>
    </div>
  );

  const isPending    = trip.status === 'pending';
  const isDispatched = trip.status === 'dispatched';
  const canEdit      = trip.status !== 'received';

  return (
    <div className="space-y-4 relative">
      {/* Toast */}
      {toast && (
        <div className="absolute -top-2 left-0 right-0 z-10 flex justify-center pointer-events-none">
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> {toast}
          </div>
        </div>
      )}

      {/* Back + Trip Header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-base">{trip.trip_no}</span>
            <StatusBadge status={trip.status} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
            {trip.truck_number && (
              <span className="flex items-center gap-1"><Truck className="h-3 w-3 text-blue-400" />{trip.truck_number}</span>
            )}
            {trip.driver_name && (
              <span className="flex items-center gap-1"><User className="h-3 w-3 text-gray-400" />{trip.driver_name}</span>
            )}
            {trip.owner_name && (
              <span className="flex items-center gap-1"><User className="h-3 w-3 text-gray-400" />{trip.owner_name}</span>
            )}
          </div>
          {trip.dispatch_date && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <Send className="h-3 w-3" />
              Dispatched: {new Date(trip.dispatch_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {trip.received_date && (
            <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
              <PackageCheck className="h-3 w-3" />
              Received: {new Date(trip.received_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {trip.remarks && <p className="text-xs text-gray-400 mt-0.5 italic">{trip.remarks}</p>}
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {err}
        </div>
      )}

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          {isPending && (
            <button
              onClick={handleDispatch}
              disabled={!!actionLoading || (trip.total_challan_count === 0)}
              title={trip.total_challan_count === 0 ? 'Add at least 1 challan to dispatch' : ''}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {actionLoading === 'dispatch' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Dispatch Trip
            </button>
          )}
          {isDispatched && (
            <button
              onClick={handleReceive}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              {actionLoading === 'receive' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5" />}
              Mark Received
            </button>
          )}
          {isPending && (
            <button
              onClick={handleDelete}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-all disabled:opacity-50 ml-auto"
            >
              {actionLoading === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
          )}
        </div>
      )}

      {/* Challans Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Linked Challans
            <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
              {trip.total_challan_count || 0}
            </span>
          </h4>
          {canEdit && (
            <ChallanDropdown
              tripId={tripId}
              unlinkedChallans={unlinkedChallans}
              onLinked={onLinked}
            />
          )}
        </div>

        {(!trip.challans || trip.challans.length === 0) ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
            <Hash className="h-7 w-7 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-medium">No challans linked</p>
            {canEdit && (
              <p className="text-xs text-gray-400 mt-1">Use "Add Challans" above to link challans</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {trip.challans.map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Hash className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-indigo-700">{c.challan_no}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{c.total_bilty_count || 0} bilties</span>
                    {c.is_dispatched && (
                      <span className="text-blue-500 flex items-center gap-0.5">
                        <Send className="h-3 w-3" /> Dispatched
                      </span>
                    )}
                    {c.dispatch_date && (
                      <span className="text-gray-400">
                        {new Date(c.dispatch_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleUnlink(c.id)}
                    disabled={actionLoading === `unlink_${c.id}`}
                    className="p-1.5 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-lg transition-colors disabled:opacity-40"
                    title="Unlink from trip"
                  >
                    {actionLoading === `unlink_${c.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Trip List Item ───────────────────────────────────────────────────────────
function TripItem({ trip, onClick }) {
  const c = STATUS_COLORS[trip.status] || STATUS_COLORS.pending;
  return (
    <button
      onClick={() => onClick(trip.id)}
      className="w-full text-left px-4 py-3 hover:bg-indigo-50/60 active:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
            <span className="font-bold text-sm text-gray-900 group-hover:text-indigo-700 transition-colors truncate">{trip.trip_no}</span>
          </div>
          <div className="ml-4 text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
            {(trip.truck?.truck_number || trip.truck_number) && (
              <span className="flex items-center gap-1">
                <Truck className="h-3 w-3 text-blue-400" />
                {trip.truck?.truck_number || trip.truck_number}
              </span>
            )}
            {(trip.driver?.name || trip.driver_name) && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3 text-gray-400" />
                {trip.driver?.name || trip.driver_name}
              </span>
            )}
          </div>
          {trip.dispatch_date && (
            <p className="text-[11px] text-blue-500 mt-0.5 ml-4">
              {new Date(trip.dispatch_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={trip.status} />
          <span className="text-xs text-gray-400">{trip.total_challan_count || 0} challan{trip.total_challan_count !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function TruckTripsModal({ isOpen, onClose, user }) {
  const [trips, setTrips]           = useState([]);
  const [initData, setInitData]     = useState({ trucks: [], drivers: [], owners: [], challans: [] });
  const [loadingList, setLoadingList] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]         = useState('');
  const [view, setView]             = useState('list'); // 'list' | 'create' | 'detail'
  const [selectedTripId, setSelectedTripId] = useState(null);

  const fetchTrips = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ page_size: '60' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const json = await apiFetch(`/api/truck-trips?${params}`);
      if (json.status === 'success') setTrips(json.data?.rows || []);
    } catch (e) { console.error('fetchTrips:', e.message); }
    finally { setLoadingList(false); }
  }, [statusFilter, search]);

  const fetchInit = useCallback(async () => {
    setLoadingInit(true);
    try {
      const json = await apiFetch('/api/truck-trips/init');
      if (json.status === 'success') setInitData(json.data || {});
      else console.error('fetchInit error:', json.message);
    } catch (e) {
      console.error('fetchInit failed:', e.message);
    } finally {
      setLoadingInit(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setView('list');
      setSelectedTripId(null);
      setSearch('');
      fetchTrips();
      fetchInit();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) fetchTrips();
  }, [statusFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const STATUS_TABS = [
    { key: 'all',        label: 'All' },
    { key: 'pending',    label: 'Pending' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'received',   label: 'Received' },
  ];

  const handleSelectTrip = (id) => { setSelectedTripId(id); setView('detail'); };
  const handleCreated    = (trip) => { setSelectedTripId(trip.id); setView('detail'); fetchTrips(); fetchInit(); };
  const handleDeleted    = () => { setView('list'); setSelectedTripId(null); fetchTrips(); fetchInit(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md shadow-blue-200/50">
              <Route className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Truck Trips</h2>
              <p className="text-xs text-gray-500">Manage trips &amp; challan linking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <button
                onClick={() => setView('create')}
                disabled={loadingInit}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-60"
              >
                {loadingInit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                New Trip
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <>
              {/* Search + Filter */}
              <div className="px-5 py-3.5 space-y-3 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search trip number..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {STATUS_TABS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        statusFilter === tab.key
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <button
                    onClick={() => { fetchTrips(); fetchInit(); }}
                    disabled={loadingList}
                    className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 shrink-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Trip List */}
              {loadingList ? (
                <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading trips...</span>
                </div>
              ) : trips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                    <Truck className="h-7 w-7 text-gray-300" />
                  </div>
                  <p className="text-gray-600 font-semibold">No trips found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {statusFilter !== 'all' ? `No ${statusFilter} trips` : 'Create a new trip to get started'}
                  </p>
                  {statusFilter === 'all' && (
                    <button
                      onClick={() => setView('create')}
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all"
                    >
                      <Plus className="h-4 w-4" /> Create First Trip
                    </button>
                  )}
                </div>
              ) : (
                trips.map(trip => (
                  <TripItem key={trip.id} trip={trip} onClick={handleSelectTrip} />
                ))
              )}
            </>
          )}

          {/* ── CREATE VIEW ── */}
          {view === 'create' && (
            <div className="p-6">
              <CreateTripForm
                user={user}
                initData={initData}
                initLoading={loadingInit}
                onCreated={handleCreated}
                onCancel={() => setView('list')}
              />
            </div>
          )}

          {/* ── DETAIL VIEW ── */}
          {view === 'detail' && selectedTripId && (
            <div className="p-6">
              <TripDetail
                key={selectedTripId}
                tripId={selectedTripId}
                user={user}
                unlinkedChallans={initData.challans || []}
                onBack={() => setView('list')}
                onDeleted={handleDeleted}
                onRefreshList={fetchTrips}
                onRefreshInit={fetchInit}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
