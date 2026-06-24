'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import Navbar from '../../components/dashboard/navbar';
import TruckTripsModal from '../../components/hub-management/TruckTripsModal';
import { format } from 'date-fns';
import {
  Warehouse, Truck, Package, Calendar, CheckCircle2, Clock, AlertCircle,
  RefreshCw, Search, ArrowUpDown, MapPin, User, Hash, TrendingUp, Box,
  Send, ChevronLeft, ChevronRight, ArrowRight, PackageCheck, FileText, Route,
} from 'lucide-react';

const API_URL = 'https://api.movesure.io';

export default function HubManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  // ── main tab ──
  const [mainTab, setMainTab] = useState('challans'); // 'challans' | 'trips'

  // ── modal ──
  const [tripsModalOpen, setTripsModalOpen] = useState(false);

  // ── challans state ──
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('dispatched');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const [stats, setStats] = useState({ total: 0, dispatched: 0, pending: 0, todayCount: 0 });

  // ── trips state ──
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsTotal, setTripsTotal] = useState(0);
  const [tripsPage, setTripsPage] = useState(1);
  const [tripStatusFilter, setTripStatusFilter] = useState('all');
  const [tripsSearch, setTripsSearch] = useState('');
  const tripsPageSize = 15;

  // ── fetch challans ──
  const fetchChallans = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);

      const { data: branchesData } = await supabase
        .from('branches').select('id, branch_name').eq('is_active', true);
      const branchMap = {};
      (branchesData || []).forEach(b => { branchMap[b.id] = b.branch_name; });

      let query = supabase
        .from('challan_details')
        .select(`
          id, challan_no, branch_id, truck_id, owner_id, driver_id, date,
          total_bilty_count, remarks, is_active, is_dispatched, dispatch_date,
          is_received_at_hub, received_at_hub_timing, created_by, created_at, updated_at,
          truck:trucks(id, truck_number, truck_type),
          owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
          driver:staff!challan_details_driver_id_fkey(id, name, mobile_number)
        `, { count: 'exact' })
        .eq('is_active', true);

      if (searchTerm.trim()) query = query.ilike('challan_no', `%${searchTerm.trim()}%`);
      if (filterStatus === 'dispatched') query = query.eq('is_dispatched', true);
      else if (filterStatus === 'pending') query = query.eq('is_dispatched', false);

      query = query.order(sortField, { ascending: sortOrder === 'asc' });
      const from = (currentPage - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error: fetchError, count } = await query;
      if (fetchError) throw fetchError;

      setChallans((data || []).map(c => ({ ...c, branch_name: branchMap[c.branch_id] || '-' })));
      setTotalCount(count || 0);
    } catch (err) {
      setError('Failed to load challans. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, searchTerm, filterStatus, sortField, sortOrder, currentPage]);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const [a, b, c, d] = await Promise.all([
        supabase.from('challan_details').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('challan_details').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_dispatched', true),
        supabase.from('challan_details').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_dispatched', false),
        supabase.from('challan_details').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('date', today),
      ]);
      setStats({ total: a.count || 0, dispatched: b.count || 0, pending: c.count || 0, todayCount: d.count || 0 });
    } catch (err) { console.error(err); }
  }, [user?.id]);

  // ── fetch trips ──
  const fetchTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      const params = new URLSearchParams({ page: tripsPage, page_size: tripsPageSize });
      if (tripStatusFilter !== 'all') params.set('status', tripStatusFilter);
      if (tripsSearch.trim()) params.set('search', tripsSearch.trim());
      const res = await fetch(`${API_URL}/api/truck-trips?${params}`);
      const json = await res.json();
      if (json.status === 'success') {
        setTrips(json.data?.rows || []);
        setTripsTotal(json.data?.total || 0);
      }
    } catch (e) { console.error('fetchTrips:', e.message); }
    finally { setTripsLoading(false); }
  }, [tripsPage, tripStatusFilter, tripsSearch]);

  useEffect(() => { fetchChallans(); fetchStats(); }, [fetchChallans, fetchStats]);
  useEffect(() => { if (mainTab === 'trips') fetchTrips(); }, [mainTab, fetchTrips]);

  const handleSort = (field) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    if (mainTab === 'trips') fetchTrips();
    else { fetchChallans(); fetchStats(); }
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const tripsTotalPages = Math.ceil(tripsTotal / tripsPageSize);

  const TRIP_STATUS_COLORS = {
    pending:    'bg-amber-50 text-amber-700 border-amber-200',
    dispatched: 'bg-blue-50 text-blue-700 border-blue-200',
    received:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const TRIP_STATUS_ICONS = { pending: Clock, dispatched: Send, received: PackageCheck };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 xl:px-10 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200/50">
                <Warehouse className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Hub Management</h1>
                <p className="text-sm text-gray-500">Monitor challans, dispatch status & transit operations</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setTripsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm shadow-blue-200">
                <Route className="h-4 w-4" /> Truck Trips
              </button>
              <button onClick={() => router.push('/hub-management/gr-wise-management')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-semibold text-indigo-600 hover:bg-indigo-100 transition-all">
                <Hash className="h-4 w-4" /> GR-wise Search
              </button>
<button onClick={() => router.push('/hub-management/crossing-summary')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-50 border border-teal-200 rounded-xl text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-all">
                <Truck className="h-4 w-4" /> Crossing Summary
              </button>
              <button onClick={() => router.push('/hub-management/cross-challan')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 rounded-xl text-sm font-semibold text-white hover:bg-teal-700 transition-all shadow-sm">
                <FileText className="h-4 w-4" /> Crossing Challan
              </button>
              <button onClick={() => router.push('/hub-management/crossing-bills')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm font-semibold text-white hover:bg-gray-800 transition-all">
                <FileText className="h-4 w-4" /> Crossing Bills
              </button>
              <button onClick={() => router.push('/hub-management/remaining-crossing-proof')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-all">
                <FileText className="h-4 w-4" /> Crossing Proof
              </button>
              <button onClick={handleRefresh} disabled={loading || tripsLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${(loading || tripsLoading) ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 xl:px-10 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Box className="h-5 w-5" />} label="Total Challans" value={stats.total} color="blue" />
          <StatCard icon={<Send className="h-5 w-5" />} label="Dispatched" value={stats.dispatched} color="green" />
          <StatCard icon={<Clock className="h-5 w-5" />} label="Pending" value={stats.pending} color="amber" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Today" value={stats.todayCount} color="purple" />
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={mainTab === 'trips' ? 'Search by trip number...' : 'Search by challan number...'}
                value={mainTab === 'trips' ? tripsSearch : searchTerm}
                onChange={e => {
                  if (mainTab === 'trips') { setTripsSearch(e.target.value); setTripsPage(1); }
                  else { setSearchTerm(e.target.value); setCurrentPage(1); }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Challan filters */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 shrink-0 gap-0.5">
              {[
                { key: 'all',        label: 'All',        count: stats.total },
                { key: 'pending',    label: 'Pending',    count: stats.pending },
                { key: 'dispatched', label: 'Dispatched', count: stats.dispatched },
              ].map(f => (
                <button key={f.key}
                  onClick={() => { setMainTab('challans'); setFilterStatus(f.key); setCurrentPage(1); }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    mainTab === 'challans' && filterStatus === f.key
                      ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    mainTab === 'challans' && filterStatus === f.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
                  }`}>{f.count}</span>
                </button>
              ))}

              {/* divider */}
              <div className="w-px h-5 bg-gray-300 mx-1" />

              {/* Trips tab */}
              <button
                onClick={() => { setMainTab('trips'); setTripsPage(1); }}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  mainTab === 'trips'
                    ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Route className="h-3.5 w-3.5" />
                Trips
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  mainTab === 'trips' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
                }`}>{tripsTotal}</span>
              </button>
            </div>

            <div className="hidden lg:flex items-center text-sm text-gray-500 font-medium shrink-0">
              {mainTab === 'trips' ? tripsTotal : totalCount} results
            </div>
          </div>

          {/* Trip status sub-filter */}
          {mainTab === 'trips' && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400 font-medium mr-1">Status:</span>
              {['all', 'pending', 'dispatched', 'received'].map(s => (
                <button key={s}
                  onClick={() => { setTripStatusFilter(s); setTripsPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tripStatusFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && mainTab === 'challans' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={handleRefresh} className="ml-auto text-sm font-medium text-red-600 hover:text-red-800 underline">Retry</button>
          </div>
        )}

        {/* ── CHALLANS TABLE ── */}
        {mainTab === 'challans' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
            {loading ? (
              <div className="p-16 text-center">
                <div className="inline-flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-[3px] border-indigo-200" />
                    <div className="absolute inset-0 rounded-full border-[3px] border-indigo-600 border-t-transparent animate-spin" />
                  </div>
                  <span className="text-gray-500 font-medium">Loading challans...</span>
                </div>
              </div>
            ) : challans.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No challans found</h3>
                <p className="text-gray-500 text-sm">{searchTerm ? 'Try a different search term' : 'No challans available yet'}</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[5%]">#</th>
                        <th className="text-left px-5 py-3.5">
                          <button onClick={() => handleSort('challan_no')} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                            Challan No <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Branch</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Truck</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Owner Details</th>
                        <th className="text-center px-5 py-3.5">
                          <button onClick={() => handleSort('total_bilty_count')} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 mx-auto">
                            Bilties <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="text-left px-5 py-3.5">
                          <button onClick={() => handleSort('date')} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                            Date <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="text-center px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dispatch Date</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hub Received</th>
                        <th className="text-center px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {challans.map((challan, idx) => (
                        <tr key={challan.id}
                          className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                          onClick={() => router.push(`/hub-management/${challan.challan_no}`)}>
                          <td className="px-5 py-3.5"><span className="text-xs font-medium text-gray-400">{(currentPage - 1) * pageSize + idx + 1}</span></td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                <Hash className="h-3.5 w-3.5 text-indigo-500" />
                              </div>
                              <span className="font-bold text-indigo-600 text-sm">{challan.challan_no}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-700 font-medium">{challan.branch_name || '-'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                              <span className="text-xs text-gray-800 font-semibold">{challan.truck?.truck_number || '-'}</span>
                            </div>
                            {challan.truck?.truck_type && <span className="text-[10px] text-gray-400 ml-5">{challan.truck.truck_type}</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="text-sm text-gray-700 font-medium">{challan.owner?.name || '-'}</div>
                            {challan.owner?.mobile_number && <div className="text-[10px] text-gray-400">{challan.owner.mobile_number}</div>}
                            {challan.driver?.name && (
                              <div className="mt-1 pt-1 border-t border-gray-100 flex items-center gap-1">
                                <User className="h-3 w-3 text-gray-400 shrink-0" />
                                <span className="text-xs text-gray-600">{challan.driver.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-bold border border-indigo-100">
                              {challan.total_bilty_count || 0}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-600 font-medium">
                                {challan.date ? format(new Date(challan.date), 'dd MMM yyyy') : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {challan.is_dispatched ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Dispatched
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="h-3.5 w-3.5" /> Pending
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-500">
                              {challan.dispatch_date ? format(new Date(challan.dispatch_date), 'dd MMM yyyy, hh:mm a') : <span className="text-gray-300">—</span>}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {challan.is_received_at_hub ? (
                              <div className="flex items-center gap-2">
                                <PackageCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <div>
                                  <span className="text-xs font-semibold text-emerald-700">Received</span>
                                  {challan.received_at_hub_timing && (
                                    <div className="text-[11px] text-gray-500">{format(new Date(challan.received_at_hub_timing), 'dd MMM yyyy, hh:mm a')}</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300 italic">Not received</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <button
                              onClick={e => { e.stopPropagation(); router.push(`/hub-management/${challan.challan_no}`); }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm">
                              View <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {challans.map(challan => (
                    <div key={challan.id} className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/hub-management/${challan.challan_no}`)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                            <Hash className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-bold text-indigo-600 text-sm">{challan.challan_no}</p>
                            <p className="text-xs text-gray-500">{challan.date ? format(new Date(challan.date), 'dd MMM yyyy') : '-'}</p>
                          </div>
                        </div>
                        {challan.is_dispatched ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Dispatched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-2">
                          <Truck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          <span className="truncate font-medium">{challan.truck?.truck_number || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-2">
                          <Package className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          <span className="font-bold text-indigo-600">{challan.total_bilty_count || 0}</span>
                          <span>bilties</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                    <p className="text-sm text-gray-500 font-medium">
                      Showing <span className="text-gray-800 font-semibold">{(currentPage - 1) * pageSize + 1}</span>–<span className="text-gray-800 font-semibold">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="text-gray-800 font-semibold">{totalCount}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 bg-white">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                        let page = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
                        return (
                          <button key={page} onClick={() => setCurrentPage(page)}
                            className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${currentPage === page ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-300'}`}>
                            {page}
                          </button>
                        );
                      })}
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 bg-white">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TRIPS TABLE ── */}
        {mainTab === 'trips' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
            {tripsLoading ? (
              <div className="p-16 text-center">
                <div className="inline-flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-[3px] border-blue-200" />
                    <div className="absolute inset-0 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin" />
                  </div>
                  <span className="text-gray-500 font-medium">Loading trips...</span>
                </div>
              </div>
            ) : trips.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Route className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No trips found</h3>
                <p className="text-gray-500 text-sm">{tripsSearch ? 'Try a different search term' : 'No trips created yet'}</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[4%]">#</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Trip No</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Truck</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Driver</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Owner</th>
                        <th className="text-center px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Challans</th>
                        <th className="text-center px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dispatch Date</th>
                        <th className="text-center px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {trips.map((trip, idx) => {
                        const StatusIcon = TRIP_STATUS_ICONS[trip.status] || Clock;
                        const statusCls = TRIP_STATUS_COLORS[trip.status] || TRIP_STATUS_COLORS.pending;
                        return (
                          <tr key={trip.id}
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                            onClick={() => router.push(`/hub-management/trips/${trip.id}`)}>
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-medium text-gray-400">{(tripsPage - 1) * tripsPageSize + idx + 1}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                  <Route className="h-3.5 w-3.5 text-blue-500" />
                                </div>
                                <span className="font-bold text-blue-600 text-sm">{trip.trip_no}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                <span className="text-xs text-gray-800 font-semibold">
                                  {trip.truck?.truck_number || trip.truck_number || '-'}
                                </span>
                              </div>
                              {(trip.truck?.truck_type) && (
                                <span className="text-[10px] text-gray-400 ml-5">{trip.truck.truck_type}</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="text-sm text-gray-700">{trip.driver?.name || trip.driver_name || '-'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-gray-700">{trip.owner?.name || trip.owner_name || '-'}</span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold border border-blue-100">
                                {trip.total_challan_count || 0}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusCls}`}>
                                <StatusIcon className="h-3 w-3" />
                                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-gray-500">
                                {trip.dispatch_date
                                  ? format(new Date(trip.dispatch_date), 'dd MMM yyyy, hh:mm a')
                                  : <span className="text-gray-300">—</span>}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <button
                                onClick={e => { e.stopPropagation(); router.push(`/hub-management/trips/${trip.id}`); }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm">
                                Open <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {trips.map(trip => {
                    const StatusIcon = TRIP_STATUS_ICONS[trip.status] || Clock;
                    const statusCls = TRIP_STATUS_COLORS[trip.status] || TRIP_STATUS_COLORS.pending;
                    return (
                      <div key={trip.id} className="p-4 hover:bg-gray-50/50 cursor-pointer"
                        onClick={() => router.push(`/hub-management/trips/${trip.id}`)}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
                              <Route className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-bold text-blue-600 text-sm">{trip.trip_no}</p>
                              <p className="text-xs text-gray-500">{trip.truck?.truck_number || trip.truck_number || '-'}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusCls}`}>
                            <StatusIcon className="h-3 w-3" />
                            {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{trip.total_challan_count || 0} challans</span>
                          <span className="text-blue-600 font-semibold flex items-center gap-1">
                            View Trip <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Trips Pagination */}
                {tripsTotalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                    <p className="text-sm text-gray-500 font-medium">
                      Showing <span className="text-gray-800 font-semibold">{(tripsPage - 1) * tripsPageSize + 1}</span>–<span className="text-gray-800 font-semibold">{Math.min(tripsPage * tripsPageSize, tripsTotal)}</span> of <span className="text-gray-800 font-semibold">{tripsTotal}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setTripsPage(p => Math.max(1, p - 1))} disabled={tripsPage === 1}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 bg-white">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: Math.min(7, tripsTotalPages) }, (_, i) => {
                        let page = tripsTotalPages <= 7 ? i + 1 : tripsPage <= 4 ? i + 1 : tripsPage >= tripsTotalPages - 3 ? tripsTotalPages - 6 + i : tripsPage - 3 + i;
                        return (
                          <button key={page} onClick={() => setTripsPage(page)}
                            className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${tripsPage === page ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-300'}`}>
                            {page}
                          </button>
                        );
                      })}
                      <button onClick={() => setTripsPage(p => Math.min(tripsTotalPages, p + 1))} disabled={tripsPage === tripsTotalPages}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 bg-white">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <TruckTripsModal isOpen={tripsModalOpen} onClose={() => setTripsModalOpen(false)} user={user} />
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    blue:   { bg: 'bg-white', iconBg: 'bg-blue-50',    iconColor: 'text-blue-600',    valueColor: 'text-blue-700',    border: 'border-blue-100',    accent: 'bg-blue-500' },
    green:  { bg: 'bg-white', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueColor: 'text-emerald-700', border: 'border-emerald-100', accent: 'bg-emerald-500' },
    amber:  { bg: 'bg-white', iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   valueColor: 'text-amber-700',   border: 'border-amber-100',   accent: 'bg-amber-500' },
    purple: { bg: 'bg-white', iconBg: 'bg-purple-50',  iconColor: 'text-purple-600',  valueColor: 'text-purple-700',  border: 'border-purple-100',  accent: 'bg-purple-500' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`${c.bg} rounded-2xl p-4 border ${c.border} shadow-sm relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${c.accent} rounded-l-2xl`} />
      <div className="flex items-center gap-3 pl-2">
        <div className={`p-2.5 ${c.iconBg} rounded-xl ${c.iconColor}`}>{icon}</div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold ${c.valueColor}`}>{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
