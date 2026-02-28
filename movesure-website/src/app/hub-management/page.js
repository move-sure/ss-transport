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
  Filter,
  ArrowUpDown,
  Eye,
  MapPin,
  User,
  Hash,
  TrendingUp,
  Box,
  Send,
  XCircle,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';

export default function HubManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Data states
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'dispatched', 'pending'
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    dispatched: 0,
    pending: 0,
    todayCount: 0,
  });

  // Fetch challans
  const fetchChallans = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch branches for name lookup
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, branch_name')
        .eq('is_active', true);

      const branchMap = {};
      (branchesData || []).forEach(b => { branchMap[b.id] = b.branch_name; });

      // Build query
      let query = supabase
        .from('challan_details')
        .select(`
          id, challan_no, branch_id, truck_id, owner_id, driver_id, date,
          total_bilty_count, remarks, is_active, is_dispatched, dispatch_date,
          created_by, created_at, updated_at,
          truck:trucks(id, truck_number, truck_type),
          owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
          driver:staff!challan_details_driver_id_fkey(id, name, mobile_number)
        `, { count: 'exact' })
        .eq('is_active', true);

      // Apply search filter
      if (searchTerm.trim()) {
        query = query.ilike('challan_no', `%${searchTerm.trim()}%`);
      }

      // Apply status filter
      if (filterStatus === 'dispatched') {
        query = query.eq('is_dispatched', true);
      } else if (filterStatus === 'pending') {
        query = query.eq('is_dispatched', false);
      }

      // Apply sort
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Enrich with branch names
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

  // Fetch stats
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

  // Handlers
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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
          <CheckCircle2 className="h-3 w-3" />
          Dispatched
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
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
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition-all"
              >
                <Hash className="h-4 w-4" />
                GR-wise Search
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Box className="h-5 w-5" />}
            label="Total Challans"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={<Send className="h-5 w-5" />}
            label="Dispatched"
            value={stats.dispatched}
            color="green"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Pending"
            value={stats.pending}
            color="amber"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Today's Challans"
            value={stats.todayCount}
            color="purple"
          />
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by challan number..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'dispatched', label: 'Dispatched' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => handleFilterChange(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterStatus === f.key
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={handleRefresh} className="ml-auto text-sm font-medium text-red-600 hover:text-red-800 underline">
              Retry
            </button>
          </div>
        )}

        {/* Challans Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-500" />
              Challans List
              <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {totalCount} total
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Page {currentPage} of {totalPages || 1}
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 rounded-full border-3 border-indigo-200"></div>
                  <div className="absolute inset-0 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin"></div>
                </div>
                <span className="text-gray-500 font-medium">Loading challans...</span>
              </div>
            </div>
          ) : challans.length === 0 ? (
            <div className="p-12 text-center">
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
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="text-left px-6 py-3">
                        <button onClick={() => handleSort('challan_no')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                          Challan No
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Truck</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                      <th className="text-center px-4 py-3">
                        <button onClick={() => handleSort('total_bilty_count')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 mx-auto">
                          Bilties
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3">
                        <button onClick={() => handleSort('date')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                          Date
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dispatch Date</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {challans.map((challan, idx) => (
                      <tr
                        key={challan.id}
                        className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                        onClick={() => handleViewChallan(challan.challan_no)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-indigo-400" />
                            <span className="font-semibold text-indigo-600 text-sm">{challan.challan_no}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-700">{challan.branch_name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-700">{challan.truck?.truck_number || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-700">{challan.driver?.name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-bold">
                            {challan.total_bilty_count || 0}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {challan.date ? format(new Date(challan.date), 'dd MMM yyyy') : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {getDispatchBadge(challan)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">
                            {challan.dispatch_date
                              ? format(new Date(challan.dispatch_date), 'dd MMM yyyy, hh:mm a')
                              : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewChallan(challan.challan_no);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors group-hover:bg-indigo-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
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
                    className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => handleViewChallan(challan.challan_no)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 rounded-lg">
                          <Hash className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-indigo-600 text-sm">{challan.challan_no}</p>
                          <p className="text-xs text-gray-500">
                            {challan.date ? format(new Date(challan.date), 'dd MMM yyyy') : '-'}
                          </p>
                        </div>
                      </div>
                      {getDispatchBadge(challan)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {challan.branch_name || '-'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Truck className="h-3 w-3 text-gray-400" />
                        {challan.truck?.truck_number || '-'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <User className="h-3 w-3 text-gray-400" />
                        {challan.driver?.name || '-'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Package className="h-3 w-3 text-gray-400" />
                        {challan.total_bilty_count || 0} bilties
                      </div>
                    </div>

                    {challan.dispatch_date && (
                      <p className="text-xs text-gray-500">
                        Dispatched: {format(new Date(challan.dispatch_date), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    )}

                    <div className="flex items-center justify-end mt-2">
                      <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                        View Details <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

// Stats Card Component
function StatCard({ icon, label, value, color }) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-700',
    },
    green: {
      bg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-green-700',
    },
    amber: {
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
    },
    purple: {
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-700',
    },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`${c.bg} rounded-2xl p-4 border border-white/60`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 ${c.iconBg} rounded-xl ${c.iconColor}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold ${c.valueColor}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
