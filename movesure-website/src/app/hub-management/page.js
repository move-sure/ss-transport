'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import Navbar from '../../components/dashboard/navbar';
import { format } from 'date-fns';
import {
  Warehouse,
  Truck,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Search,
  ArrowUpDown,
  Eye,
  MapPin,
  User,
  Hash,
  TrendingUp,
  Box,
  Send,
  ChevronLeft,
  ArrowRight,
  PackageCheck,
  FileText,
} from 'lucide-react';

export default function HubManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

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

  const [stats, setStats] = useState({
    total: 0,
    dispatched: 0,
    pending: 0,
    todayCount: 0,
  });

  const fetchChallans = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, branch_name')
        .eq('is_active', true);

      const branchMap = {};
      (branchesData || []).forEach(b => { branchMap[b.id] = b.branch_name; });

      let query = supabase
        .from('challan_details')
        .select(`
          id, challan_no, branch_id, truck_id, owner_id, driver_id, date,
          total_bilty_count, remarks, is_active, is_dispatched, dispatch_date,
          is_received_at_hub, received_at_hub_timing,
          created_by, created_at, updated_at,
          truck:trucks(id, truck_number, truck_type),
          owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
          driver:staff!challan_details_driver_id_fkey(id, name, mobile_number)
        `, { count: 'exact' })
        .eq('is_active', true);

      if (searchTerm.trim()) {
        query = query.ilike('challan_no', `%${searchTerm.trim()}%`);
      }

      if (filterStatus === 'dispatched') {
        query = query.eq('is_dispatched', true);
      } else if (filterStatus === 'pending') {
        query = query.eq('is_dispatched', false);
      }

      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      const enriched = (data || []).map(c => ({
        ...c,
        branch_name: branchMap[c.branch_id] || '-',
      }));

      setChallans(enriched);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching challans:', err);
      setError('Failed to load challans. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, searchTerm, filterStatus, sortField, sortOrder, currentPage]);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const [totalRes, dispatchedRes, pendingRes, todayRes] = await Promise.all([
        supabase.from('challan_details').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('challan_details').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_dispatched', true),
        supabase.from('challan_details').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_dispatched', false),
        supabase.from('challan_details').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('date', today),
      ]);

      setStats({
        total: totalRes.count || 0,
        dispatched: dispatchedRes.count || 0,
        pending: pendingRes.count || 0,
        todayCount: todayRes.count || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchChallans();
    fetchStats();
  }, [fetchChallans, fetchStats]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchChallans();
    fetchStats();
  };

  const handleViewChallan = (challanNo) => {
    router.push(`/hub-management/${challanNo}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const getDispatchBadge = (challan) => {
    if (challan.is_dispatched) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Dispatched
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
        <Clock className="h-3.5 w-3.5" />
        Pending
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Full-width Header */}
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/hub-management/gr-wise-management')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-semibold text-indigo-600 hover:bg-indigo-100 transition-all"
              >
                <Hash className="h-4 w-4" />
                GR-wise Search
              </button>
              <button
                onClick={() => router.push('/hub-management/gr-wise-management/bulk-update-pohonch')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-xl text-sm font-semibold text-purple-600 hover:bg-purple-100 transition-all"
              >
                <FileText className="h-4 w-4" />
                Bulk Pohonch
              </button>
              <button
                onClick={() => router.push('/hub-management/remaining-crossing-proof')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-all"
              >
                <FileText className="h-4 w-4" />
                Crossing Proof
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Content */}
      <div className="px-4 sm:px-6 xl:px-10 py-6 space-y-5">

        {/* Stats + Search Row */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-5">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<Box className="h-5 w-5" />} label="Total Challans" value={stats.total} color="blue" />
            <StatCard icon={<Send className="h-5 w-5" />} label="Dispatched" value={stats.dispatched} color="green" />
            <StatCard icon={<Clock className="h-5 w-5" />} label="Pending" value={stats.pending} color="amber" />
            <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Today" value={stats.todayCount} color="purple" />
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by challan number..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 shrink-0">
              {[
                { key: 'all', label: 'All', count: stats.total },
                { key: 'pending', label: 'Pending', count: stats.pending },
                { key: 'dispatched', label: 'Dispatched', count: stats.dispatched },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleFilterChange(f.key)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    filterStatus === f.key
                      ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    filterStatus === f.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Results count */}
            <div className="hidden lg:flex items-center text-sm text-gray-500 font-medium shrink-0">
              {totalCount} results
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={handleRefresh} className="ml-auto text-sm font-medium text-red-600 hover:text-red-800 underline">
              Retry
            </button>
          </div>
        )}

        {/* Challans Table - Full Width */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 rounded-full border-[3px] border-indigo-200"></div>
                  <div className="absolute inset-0 rounded-full border-[3px] border-indigo-600 border-t-transparent animate-spin"></div>
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
              <p className="text-gray-500 text-sm">
                {searchTerm ? 'Try a different search term' : 'No challans available yet'}
              </p>
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
                        <button onClick={() => handleSort('challan_no')} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors">
                          Challan No
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Truck</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Owner Details</th>
                      <th className="text-center px-5 py-3.5">
                        <button onClick={() => handleSort('total_bilty_count')} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 mx-auto transition-colors">
                          Bilties
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left px-5 py-3.5">
                        <button onClick={() => handleSort('date')} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors">
                          Date
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-center px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dispatch Date</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kanpur Received</th>
                      <th className="text-center px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {challans.map((challan, idx) => (
                      <tr
                        key={challan.id}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                        onClick={() => handleViewChallan(challan.challan_no)}
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-medium text-gray-400">
                            {(currentPage - 1) * pageSize + idx + 1}
                          </span>
                        </td>
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
                          {challan.truck?.truck_type && (
                            <span className="text-[10px] text-gray-400 ml-5">{challan.truck.truck_type}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-sm text-gray-700 font-medium">{challan.owner?.name || '-'}</div>
                          {challan.owner?.mobile_number && (
                            <div className="text-[10px] text-gray-400">{challan.owner.mobile_number}</div>
                          )}
                          {challan.driver?.name && (
                            <div className="mt-1 pt-1 border-t border-gray-100">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-gray-400 shrink-0" />
                                <span className="text-xs text-gray-600">{challan.driver.name}</span>
                              </div>
                              {challan.driver?.mobile_number && (
                                <div className="text-[10px] text-gray-400 ml-4">{challan.driver.mobile_number}</div>
                              )}
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
                          {getDispatchBadge(challan)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-500">
                            {challan.dispatch_date
                              ? format(new Date(challan.dispatch_date), 'dd MMM yyyy, hh:mm a')
                              : <span className="text-gray-300">—</span>}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {challan.is_received_at_hub ? (
                            <div className="flex items-center gap-2">
                              <PackageCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <div>
                                <span className="text-xs font-semibold text-emerald-700">Received</span>
                                {challan.received_at_hub_timing && (
                                  <div className="text-[11px] text-gray-500">
                                    {format(new Date(challan.received_at_hub_timing), 'dd MMM yyyy, hh:mm a')}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 italic">Not received</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewChallan(challan.challan_no);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md group-hover:shadow-md"
                          >
                            View
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-100">
                {challans.map((challan) => (
                  <div
                    key={challan.id}
                    className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer active:bg-gray-100"
                    onClick={() => handleViewChallan(challan.challan_no)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                          <Hash className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-bold text-indigo-600 text-sm">{challan.challan_no}</p>
                          <p className="text-xs text-gray-500">
                            {challan.date ? format(new Date(challan.date), 'dd MMM yyyy') : '-'}
                          </p>
                        </div>
                      </div>
                      {getDispatchBadge(challan)}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-2">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate font-medium">{challan.branch_name || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-2">
                        <Truck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span className="truncate font-medium">{challan.truck?.truck_number || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-2">
                        <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate font-medium">{challan.driver?.name || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-2">
                        <Package className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="font-bold text-indigo-600">{challan.total_bilty_count || 0}</span>
                        <span>bilties</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {challan.dispatch_date && (
                        <p className="text-[11px] text-gray-500 bg-blue-50 rounded-lg px-2.5 py-1.5 inline-block">
                          Dispatched: {format(new Date(challan.dispatch_date), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      )}
                      {challan.is_received_at_hub && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1">
                          <PackageCheck className="h-3 w-3" />
                          Hub Received{challan.received_at_hub_timing ? `: ${format(new Date(challan.received_at_hub_timing), 'dd MMM, hh:mm a')}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
                        View Details <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                  <p className="text-sm text-gray-500 font-medium">
                    Showing <span className="text-gray-800 font-semibold">{(currentPage - 1) * pageSize + 1}</span> - <span className="text-gray-800 font-semibold">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="text-gray-800 font-semibold">{totalCount}</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 7) {
                        page = i + 1;
                      } else if (currentPage <= 4) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        page = totalPages - 6 + i;
                      } else {
                        page = currentPage - 3 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                              : 'text-gray-600 hover:bg-white hover:border-gray-300 border border-transparent'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    blue: {
      bg: 'bg-white',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-700',
      border: 'border-blue-100',
      accent: 'bg-blue-500',
    },
    green: {
      bg: 'bg-white',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
      border: 'border-emerald-100',
      accent: 'bg-emerald-500',
    },
    amber: {
      bg: 'bg-white',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
      border: 'border-amber-100',
      accent: 'bg-amber-500',
    },
    purple: {
      bg: 'bg-white',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-700',
      border: 'border-purple-100',
      accent: 'bg-purple-500',
    },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`${c.bg} rounded-2xl p-4 border ${c.border} shadow-sm relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${c.accent} rounded-l-2xl`}></div>
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
