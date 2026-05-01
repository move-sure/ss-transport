'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import Navbar from '../../../components/dashboard/navbar';
import {
  Truck, Package, RefreshCw, AlertCircle, ArrowLeft, ChevronDown, ChevronUp,
  Hash, MapPin, Phone, FileText, IndianRupee, Clock, CheckCircle2, Star,
  Calendar, Box, Users, FileDown,
} from 'lucide-react';
import CrossingProofPDFModal, { generateChallanWisePDF, ChallanWisePDFModal } from './CrossingProofPDF';


const API_URL = 'https://movesure-backend.onrender.com/';
const EXCLUDED_GSTIN = '09COVPS5556J1ZT'; // hidden from remaining crossing proof
const IDB_DB = 'movesure-cache';
const IDB_STORE = 'crossing-proof';
const CACHE_KEY = 'data';
const CACHE_TS_KEY = 'ts';

// ── IndexedDB helpers ────────────────────────────────────────────────────────
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}
async function idbGet(key) {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
  } catch { return undefined; }
}
async function idbSet(key, value) {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch { /* silent */ }
}


export default function RemainingCrossingProofPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState(null);          // full API response
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedChallans, setExpandedChallans] = useState({});
  const [pdfGroup, setPdfGroup] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChallan, setSelectedChallan] = useState('');
  const [challanPdfOpen, setChallanPdfOpen] = useState(false);
  // Date range state
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(firstDay.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(today.toISOString().slice(0, 10));

  // ── Load from cache first, then fetch fresh ──────────────────────────────
  const loadFromCache = async () => {
    try {
      const cached = await idbGet(CACHE_KEY);
      const cachedTs = await idbGet(CACHE_TS_KEY);
      if (cached) {
        setData(cached);
        setLastFetched(cachedTs ? new Date(cachedTs) : null);
        return true;
      }
    } catch (_) {}
    return false;
  };

  const fetchData = useCallback(async (isRefresh = false, from = dateFrom, to = dateTo) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}api/bilty/transport-pending-grouped`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatch_date_from: from, dispatch_date_to: to })
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const result = await res.json();

      if (result.status !== 'success') throw new Error(result.message || 'Failed to load data');

      setData(result);
      const now = new Date();
      setLastFetched(now);

      // Persist to IndexedDB
      idbSet(CACHE_KEY, result);
      idbSet(CACHE_TS_KEY, now.toISOString());
    } catch (err) {
      console.error('Error fetching grouped pending bilties:', err);
      setError(err.message || 'Failed to load. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadFromCache().then((hadCache) => {
      // Always fetch fresh on mount; cache is just for instant display
      fetchData(hadCache); // if cache exists, this is a background refresh
      if (!hadCache) setLoading(true);
    });
  }, [fetchData]);


  const handleRefresh = () => fetchData(true);

  // All unique challan numbers across all groups, sorted ascending
  const challanOptions = data?.groups
    ? [...new Set(
        data.groups.flatMap((g) => (g.challans || []).map((c) => c.challan_no))
      )].sort((a, b) => {
        if (a === 'NO_CHALLAN') return 1;
        if (b === 'NO_CHALLAN') return -1;
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      })
    : [];

  const handleDownloadChallan = () => {
    if (!selectedChallan || !data?.groups?.length) return;
    setChallanPdfOpen(true);
  };

  const handleDateChange = (which, val) => {
    if (which === 'from') setDateFrom(val);
    else setDateTo(val);
  };


  // Only load from cache and fetch once on mount
  useEffect(() => {
    loadFromCache().then((hadCache) => {
      fetchData(hadCache, dateFrom, dateTo);
      if (!hadCache) setLoading(true);
    });
    // eslint-disable-next-line
  }, []);

  const toggleGroup = (gst) =>
    setExpandedGroups(prev => ({ ...prev, [gst]: !prev[gst] }));

  const toggleChallan = (key) =>
    setExpandedChallans(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Filter GSTIN groups by search ───────────────────────────────────────
  const baseGroups = (data?.groups || []).filter(g => g.gst_number !== EXCLUDED_GSTIN);
  const filteredGroups = baseGroups.filter(g => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      g.gst_number?.toLowerCase().includes(q) ||
      g.transport_names?.some(n => n.toLowerCase().includes(q)) ||
      g.city_names?.some(n => n.toLowerCase().includes(q)) ||
      g.challans?.some(c =>
        c.challan_no?.toLowerCase().includes(q) ||
        c.bilties?.some(b =>
          b.gr_no?.toLowerCase().includes(q) ||
          b.consignor_name?.toLowerCase().includes(q) ||
          b.consignee_name?.toLowerCase().includes(q)
        )
      )
    );
  });

  const formatTime = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(date instanceof Date ? date : new Date(date));
  };

  const pmColor = (pm) => {
    if (!pm) return 'bg-gray-100 text-gray-500';
    const u = pm.toUpperCase();
    if (u.includes('PAID')) return 'bg-green-100 text-green-700';
    if (u.includes('TO-PAY') || u.includes('TO PAY')) return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-orange-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
            </div>
            <p className="text-gray-600 font-medium">Loading pending bilties…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 xl:px-10 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/hub-management')}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </button>
              <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-200/50">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Remaining Crossing Proof</h1>
                <p className="text-sm text-gray-500">
                  Bilties missing pohonch or bilty number — grouped by transport
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {lastFetched && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(lastFetched)}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedChallan}
                  onChange={e => setSelectedChallan(e.target.value)}
                  className="px-3 py-2.5 border border-indigo-200 rounded-xl text-sm bg-indigo-50 text-indigo-800 font-semibold focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 disabled:opacity-50"
                  disabled={!challanOptions.length}
                >
                  <option value="">Select Challan…</option>
                  {challanOptions.map((cn) => (
                    <option key={cn} value={cn}>{cn === 'NO_CHALLAN' ? 'No Challan' : cn}</option>
                  ))}
                </select>
                <button
                  onClick={handleDownloadChallan}
                  disabled={!selectedChallan}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 border border-indigo-600 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  title="Preview PDF for selected challan across all transports"
                >
                  <FileDown className="h-4 w-4" />
                  Preview
                </button>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Date pickers + Search */}
          <div className="mt-3 flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 font-semibold">From</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={e => handleDateChange('from', e.target.value)}
                className="px-2 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 text-black"
              />
              <label className="text-xs text-gray-500 font-semibold">To</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={today.toISOString().slice(0, 10)}
                onChange={e => handleDateChange('to', e.target.value)}
                className="px-2 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 text-black"
              />
            </div>
            <input
              type="text"
              placeholder="Search GSTIN, transport, challan, GR no, consignor…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full sm:w-96 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all text-gray-900 placeholder-gray-400"
            />
            <button
              onClick={() => fetchData(false, dateFrom, dateTo)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 border border-orange-600 rounded-xl text-sm font-semibold text-white hover:bg-orange-600 transition-all disabled:opacity-50"
              disabled={loading || refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 xl:px-10 py-6 space-y-5">

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-sm font-medium text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Summary Stats ───────────────────────────────────────────────── */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon={<Truck className="h-5 w-5" />}
              label="GSTIN Groups"
              value={filteredGroups.length}
              total={baseGroups.length}
              color="orange"
            />
            <StatCard
              icon={<Package className="h-5 w-5" />}
              label="Pending Bilties"
              value={filteredGroups.reduce((s, g) => s + g.total_bilties, 0)}
              total={baseGroups.reduce((s, g) => s + g.total_bilties, 0)}
              color="red"
            />
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Challans"
              value={filteredGroups.reduce((s, g) => s + g.total_challans, 0)}
              total={baseGroups.reduce((s, g) => s + g.total_challans, 0)}
              color="purple"
            />
          </div>
        )}

        {/* ── Refreshing overlay hint ─────────────────────────────────────── */}
        {refreshing && data && (
          <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Fetching latest data…
          </div>
        )}

        {/* ── Transport Cards ──────────────────────────────────────────────── */}
        {filteredGroups.length === 0 && !loading && !error && (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">All clear!</h3>
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'No results for your search.' : 'No bilties with missing pohonch or bilty number.'}
            </p>
          </div>
        )}

        {pdfGroup && (
          <CrossingProofPDFModal group={pdfGroup} onClose={() => setPdfGroup(null)} />
        )}

        {challanPdfOpen && selectedChallan && (
          <ChallanWisePDFModal
            challanNo={selectedChallan}
            groups={data?.groups || []}
            onClose={() => setChallanPdfOpen(false)}
          />
        )}

        {filteredGroups.map((group) => {
          const isOpen = !!expandedGroups[group.gst_number];
          return (
            <div
              key={group.gst_number}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* GSTIN Group Header */}
              <button
                className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                onClick={() => toggleGroup(group.gst_number)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl shrink-0">
                      <Truck className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-base">{group.gst_number}</span>
                        {group.is_prior && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                            <Star className="h-2.5 w-2.5 fill-current" /> PRIORITY
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {group.transport_names?.length === 1
                              ? <span className="font-bold text-gray-900">{group.transport_names[0]}</span>
                              : group.transport_names?.join(', ')}
                          </span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{group.city_names?.join(', ')}</span>
                        {group.mob_numbers?.length > 0 && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{group.mob_numbers.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-xl font-bold border border-orange-100">
                        <Package className="h-3.5 w-3.5" />
                        {group.total_bilties} bilties
                      </span>
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl font-bold border border-purple-100">
                        <Hash className="h-3.5 w-3.5" />
                        {group.total_challans} challans
                      </span>
                    </div>
                    {/* mobile counts */}
                    <div className="sm:hidden flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                      <Package className="h-3.5 w-3.5 text-orange-500" />{group.total_bilties}
                      <span className="text-gray-300">|</span>
                      <Hash className="h-3.5 w-3.5 text-purple-500" />{group.total_challans}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPdfGroup(group); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-semibold text-red-700 transition-colors"
                      title="Download PDF"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    {isOpen
                      ? <ChevronUp className="h-5 w-5 text-gray-400" />
                      : <ChevronDown className="h-5 w-5 text-gray-400" />
                    }
                  </div>
                </div>
              </button>

              {/* Challans */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 space-y-3">
                  {group.challans.map((challan) => {
                    const challanKey = `${group.gst_number}-${challan.challan_no}`;
                    const isChallanOpen = !!expandedChallans[challanKey];

                    return (
                      <div key={challanKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        {/* Challan Header */}
                        <button
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedChallans(prev => ({ ...prev, [challanKey]: !prev[challanKey] }))}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                <Hash className="h-4 w-4 text-indigo-500" />
                              </div>
                              <div>
                                <span className="font-bold text-indigo-700 text-sm">
                                  {challan.challan_no === 'NO_CHALLAN' ? (
                                    <span className="text-gray-400 italic">No Challan</span>
                                  ) : challan.challan_no}
                                </span>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                                  <span className="flex items-center gap-1"><Package className="h-3 w-3" />{challan.bilty_count} bilties</span>
                                  <span className="flex items-center gap-1"><Box className="h-3 w-3" />{challan.total_weight} kg</span>
                                  <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{challan.total_amount?.toLocaleString('en-IN')}</span>
                                  {challan.total_kaat > 0 && (
                                    <span className="flex items-center gap-1 text-red-500"><IndianRupee className="h-3 w-3" />Kaat: {challan.total_kaat?.toLocaleString('en-IN')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isChallanOpen
                              ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                              : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                            }
                          </div>
                        </button>

                        {/* Bilties Table */}
                        {isChallanOpen && (
                          <div className="border-t border-gray-100 overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide w-8">#</th>
                                  <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">GR No</th>
                                  <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Consignor</th>
                                  <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Consignee</th>
                                  <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Station</th>
                                  <th className="text-center px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Pkg</th>
                                  <th className="text-center px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Wt</th>
                                  <th className="text-right px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Freight</th>
                                  <th className="text-right px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Kaat</th>
                                  <th className="text-center px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">PM</th>
                                  <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Pohonch</th>
                                  <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Bilty No</th>
                                  <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Date</th>
                                  <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">Transport</th>
                                  <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide">City</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {challan.bilties.map((bilty) => (
                                  <tr key={bilty.gr_no} className="hover:bg-orange-50/30 transition-colors">
                                    <td className="px-3 py-2.5 text-gray-400 font-medium">{bilty.serial}</td>
                                    <td className="px-3 py-2.5">
                                      <span className="font-bold text-indigo-600">{bilty.gr_no}</span>
                                    </td>
                                    <td className="px-3 py-2.5 max-w-[120px]">
                                      <span className="truncate block text-gray-700 font-medium" title={bilty.consignor_name}>
                                        {bilty.consignor_name || '-'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 max-w-[120px]">
                                      <span className="truncate block text-gray-700" title={bilty.consignee_name}>
                                        {bilty.consignee_name || '-'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-600">{bilty.station || bilty.city_name || '-'}</td>
                                    <td className="px-3 py-2.5 text-center font-semibold text-gray-700">{bilty.no_of_pkg}</td>
                                    <td className="px-3 py-2.5 text-center text-gray-600">{bilty.weight}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold text-gray-800">
                                      {bilty.freight_amount ? `₹${bilty.freight_amount.toLocaleString('en-IN')}` : '-'}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-red-600 font-semibold">
                                      {bilty.kaat > 0 ? `₹${bilty.kaat}` : '-'}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pmColor(bilty.payment_mode)}`}>
                                        {bilty.payment_mode || '-'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      {bilty.pohonch_no
                                        ? <span className="text-green-700 font-semibold">{bilty.pohonch_no}</span>
                                        : <span className="inline-flex items-center gap-1 text-red-500 font-semibold"><AlertCircle className="h-3 w-3" />Missing</span>
                                      }
                                    </td>
                                    <td className="px-3 py-2.5">
                                      {bilty.bilty_number
                                        ? <span className="text-green-700 font-semibold">{bilty.bilty_number}</span>
                                        : <span className="inline-flex items-center gap-1 text-red-500 font-semibold"><AlertCircle className="h-3 w-3" />Missing</span>
                                      }
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                                      {bilty.bilty_date
                                        ? new Date(bilty.bilty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                        : '-'}
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-500">{bilty.transport_name || '-'}</td>
                                    <td className="px-3 py-2.5 text-gray-500">{bilty.city_name || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Small stat card ──────────────────────────────────────────────────────────
function StatCard({ icon, label, value, total, color }) {
  const colors = {
    orange: 'from-orange-500 to-red-500 shadow-orange-200/50',
    red: 'from-red-500 to-rose-600 shadow-red-200/50',
    purple: 'from-purple-500 to-indigo-600 shadow-purple-200/50',
  };
  const isFiltered = value !== total;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 bg-gradient-to-br ${colors[color] || colors.orange} rounded-xl shadow-lg text-white`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value}
            {isFiltered && <span className="text-sm text-gray-400 font-normal"> / {total}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
