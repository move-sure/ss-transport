'use client';

import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../../utils/supabase';
import { useAuth } from '../../utils/auth';
import Navbar from '@/components/dashboard/navbar';
import Link from 'next/link';
import { Search, History, Clock, AlertTriangle, CheckCircle2, Shield, ChevronLeft, ChevronRight, Filter, ArrowLeft, Eye, User, Calendar, Hash, Package } from 'lucide-react';

export default function TrackingHistoryPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, complaints, resolved, investigating
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const PAGE_SIZE = 20;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('search_tracking_master')
        .select('*', { count: 'exact' })
        .order('last_searched_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Filters
      if (searchTerm.trim()) {
        query = query.ilike('gr_no', `%${searchTerm.trim()}%`);
      }
      if (filterType === 'complaints') {
        query = query.eq('is_complaint', true);
      } else if (filterType === 'investigating') {
        query = query.eq('in_investigation', true).eq('is_resolved', false);
      } else if (filterType === 'resolved') {
        query = query.eq('is_resolved', true);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Batch resolve all user details
      if (data && data.length > 0) {
        const userIds = [...new Set(
          data.flatMap(r => [r.first_searched_by, r.last_searched_by, r.complaint_registered_by, r.resolved_by]).filter(Boolean)
        )];
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name, username, post')
            .in('id', userIds);
          const usersMap = Object.fromEntries((usersData || []).map(u => [u.id, u]));
          data.forEach(r => {
            r.first_user = usersMap[r.first_searched_by] || null;
            r.last_user = usersMap[r.last_searched_by] || null;
            r.complaint_user = usersMap[r.complaint_registered_by] || null;
            r.resolved_user = usersMap[r.resolved_by] || null;
          });
        }
      }

      setRecords(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching tracking history:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterType]);

  useEffect(() => {
    if (user) fetchRecords();
  }, [user, fetchRecords]);

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(0);
  }, [searchTerm, filterType]);

  const handleExpandRow = async (grNo) => {
    if (expandedRow === grNo) {
      setExpandedRow(null);
      setExpandedLogs([]);
      return;
    }
    setExpandedRow(grNo);
    setLogsLoading(true);
    try {
      const { data } = await supabase
        .from('search_tracking_log')
        .select('*')
        .eq('gr_no', grNo)
        .order('searched_at', { ascending: false })
        .limit(30);
      // Batch resolve user details
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(l => l.searched_by).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name, username, post')
            .in('id', userIds);
          const usersMap = Object.fromEntries((usersData || []).map(u => [u.id, u]));
          data.forEach(l => { l.users = usersMap[l.searched_by] || null; });
        }
      }
      setExpandedLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const formatShortDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';

  const getStatusBadge = (rec) => {
    if (rec.is_resolved) return <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded-full border border-emerald-300 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Resolved</span>;
    if (rec.in_investigation) return <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 font-bold rounded-full border border-amber-300 inline-flex items-center gap-1"><Search className="w-3 h-3" /> Investigating</span>;
    if (rec.is_complaint) return <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-full border border-red-300 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Complaint</span>;
    return <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded-full border border-blue-200 inline-flex items-center gap-1"><Eye className="w-3 h-3" /> Searched</span>;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      <div className="p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/tracking" className="p-1.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition shadow-sm">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <History className="w-7 h-7 text-indigo-600" />
                Search Tracking History
              </h1>
            </div>
            <p className="text-gray-500 text-sm ml-11">All GR searches, complaints & resolutions</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-indigo-700">{totalCount}</div>
            <div className="text-[10px] text-gray-500 font-semibold uppercase">Total Records</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by GR No..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-gray-400" />
              {[
                { key: 'all', label: 'All', icon: null },
                { key: 'complaints', label: 'Complaints', icon: '🚨' },
                { key: 'investigating', label: 'Investigating', icon: '🔍' },
                { key: 'resolved', label: 'Resolved', icon: '✅' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    filterType === f.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.icon && <span className="mr-1">{f.icon}</span>}
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table / Cards */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm font-semibold">Loading history...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-semibold">No search records found</p>
              <p className="text-gray-400 text-sm mt-1">Searches will appear here when bilties are tracked</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[11px] uppercase">
                      <th className="px-3 py-2.5 text-left font-bold">GR No</th>
                      <th className="px-3 py-2.5 text-left font-bold">Type</th>
                      <th className="px-3 py-2.5 text-center font-bold">Searches</th>
                      <th className="px-3 py-2.5 text-left font-bold">First Searched</th>
                      <th className="px-3 py-2.5 text-left font-bold">Last Searched</th>
                      <th className="px-3 py-2.5 text-left font-bold">Last By</th>
                      <th className="px-3 py-2.5 text-center font-bold">Status</th>
                      <th className="px-3 py-2.5 text-center font-bold">Logs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((rec) => (
                      <React.Fragment key={rec.id}>
                        <tr className={`hover:bg-slate-50 transition ${expandedRow === rec.gr_no ? 'bg-indigo-50' : ''}`}>
                          <td className="px-3 py-2.5">
                            <Link href={`/tracking?gr=${rec.gr_no}`} className="text-sm font-bold text-indigo-700 hover:underline">
                              {rec.gr_no}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              rec.source_type === 'MNL' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {rec.source_type === 'MNL' ? 'MANUAL' : 'REGULAR'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-sm font-black ${rec.search_count > 3 ? 'text-red-600' : rec.search_count > 1 ? 'text-amber-600' : 'text-gray-700'}`}>
                              {rec.search_count}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-xs text-gray-700">{formatDate(rec.first_searched_at)}</div>
                            <div className="text-[10px] text-gray-400">{rec.first_user?.name || rec.first_user?.username || '-'}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-xs text-gray-700">{formatDate(rec.last_searched_at)}</div>
                            <div className="text-[10px] text-gray-400">{rec.last_user?.name || rec.last_user?.username || '-'}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-xs font-semibold text-gray-800">{rec.last_user?.name || rec.last_user?.username || '-'}</div>
                            {rec.last_user?.post && <div className="text-[10px] text-gray-400">{rec.last_user.post}</div>}
                          </td>
                          <td className="px-3 py-2.5 text-center">{getStatusBadge(rec)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => handleExpandRow(rec.gr_no)}
                              className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                                expandedRow === rec.gr_no
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {expandedRow === rec.gr_no ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>
                        {/* Expanded Logs Row */}
                        {expandedRow === rec.gr_no && (
                          <tr>
                            <td colSpan={8} className="px-4 py-3 bg-slate-50 border-b-2 border-indigo-200">
                              {logsLoading ? (
                                <div className="text-center py-3 text-gray-400 text-xs">Loading logs...</div>
                              ) : expandedLogs.length === 0 ? (
                                <div className="text-center py-3 text-gray-400 text-xs">No logs found</div>
                              ) : (
                                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                  <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">Search Log Timeline — {rec.gr_no}</div>
                                  {expandedLogs.map((log, idx) => (
                                    <div key={log.id} className="flex items-center gap-3 px-3 py-1.5 bg-white rounded border border-slate-200 text-xs">
                                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                                        idx === 0 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
                                      }`}>{expandedLogs.length - idx}</span>
                                      <span className="font-bold text-gray-800 min-w-[100px]">{log.users?.name || log.users?.username || 'Unknown'}</span>
                                      {log.users?.post && <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-semibold">{log.users.post}</span>}
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                        log.source_type === 'MNL' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                      }`}>{log.source_type === 'MNL' ? 'MNL' : 'REG'}</span>
                                      <span className="text-gray-500 ml-auto">{formatDate(log.searched_at)}</span>
                                      {idx === 0 && <span className="text-[8px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold">Latest</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {records.map((rec) => (
                  <div key={rec.id} className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <Link href={`/tracking?gr=${rec.gr_no}`} className="text-sm font-bold text-indigo-700 hover:underline">
                          {rec.gr_no}
                        </Link>
                        <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          rec.source_type === 'MNL' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {rec.source_type === 'MNL' ? 'MNL' : 'REG'}
                        </span>
                      </div>
                      {getStatusBadge(rec)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] mb-2">
                      <div>
                        <div className="text-gray-400 font-semibold">Searches</div>
                        <div className={`font-black text-base ${rec.search_count > 3 ? 'text-red-600' : rec.search_count > 1 ? 'text-amber-600' : 'text-gray-700'}`}>
                          {rec.search_count}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-semibold">First</div>
                        <div className="font-bold text-gray-700">{formatShortDate(rec.first_searched_at)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-semibold">Last</div>
                        <div className="font-bold text-gray-700">{formatShortDate(rec.last_searched_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-gray-400">
                        By: <span className="font-semibold text-gray-600">{rec.last_user?.name || '-'}</span>
                      </div>
                      <button
                        onClick={() => handleExpandRow(rec.gr_no)}
                        className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 font-bold rounded hover:bg-slate-200 transition"
                      >
                        {expandedRow === rec.gr_no ? 'Hide Logs' : 'View Logs'}
                      </button>
                    </div>
                    {expandedRow === rec.gr_no && (
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {logsLoading ? (
                          <div className="text-center py-2 text-gray-400 text-[10px]">Loading...</div>
                        ) : expandedLogs.map((log, idx) => (
                          <div key={log.id} className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded text-[10px]">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${
                              idx === 0 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
                            }`}>{expandedLogs.length - idx}</span>
                            <span className="font-bold text-gray-700">{log.users?.name || 'Unknown'}</span>
                            <span className="text-gray-400 ml-auto">{formatShortDate(log.searched_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                  <div className="text-xs text-gray-500">
                    Showing <span className="font-bold text-gray-700">{page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)}</span> of <span className="font-bold text-gray-700">{totalCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-gray-700">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
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
