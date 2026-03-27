'use client';

import React, { useState, useEffect, useMemo } from 'react';
import supabase from '../../../utils/supabase';
import { useAuth } from '../../../utils/auth';
import CrossChallanPrintModal, { useCrossChallanPrint } from '../../../../components/transit-finance/pohonch-print/CrossChallanPrintModal';
import {
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  PenTool,
  Trash2,
  Edit3,
  X,
  Check,
  Save,
  Search,
  ArrowLeft,
  Package,
  Hash,
  Truck,
  Filter,
  ChevronLeft,
  User,
  Printer,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

const ITEMS_PER_PAGE = 30;

export default function PohonchListPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Data
  const [allPohonch, setAllPohonch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [usersMap, setUsersMap] = useState({});
  const [challanDatesMap, setChallanDatesMap] = useState({}); // challan_no -> { dispatch_date }

  // Search
  const [searchGR, setSearchGR] = useState('');
  const [searchTransport, setSearchTransport] = useState('');
  const [searchChallan, setSearchChallan] = useState('');
  const [activeSearch, setActiveSearch] = useState({ gr: '', transport: '', challan: '' });

  // Pagination
  const [page, setPage] = useState(0);

  // Row actions
  const [editingId, setEditingId] = useState(null);
  const [editTransportName, setEditTransportName] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editPohonchNumber, setEditPohonchNumber] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  // Shared cross challan print hook — fetches fresh data on every print
  const crossChallanPrint = useCrossChallanPrint({
    onDataRefreshed: (pohonchNumber, updatedPohonch) => {
      // Update local list with refreshed data
      setAllPohonch(prev =>
        prev.map(p => p.pohonch_number === pohonchNumber ? { ...p, ...updatedPohonch } : p)
      );
    },
  });

  // ====== Fetch challan dispatch dates for Top PF analysis ======
  const fetchChallanDates = async (challanNos) => {
    if (!challanNos || challanNos.length === 0) return;
    const unique = [...new Set(challanNos.filter(Boolean))];
    if (unique.length === 0) return;
    try {
      const { data } = await supabase
        .from('challan_details')
        .select('challan_no, dispatch_date, date')
        .in('challan_no', unique);
      if (data) {
        const map = {};
        data.forEach(c => { map[c.challan_no] = c; });
        setChallanDatesMap(prev => ({ ...prev, ...map }));
      }
    } catch (err) {
      console.error('Error fetching challan dates:', err);
    }
  };

  // ====== Fetch users map ======
  const fetchUsersMap = async (userIds) => {
    if (!userIds || userIds.length === 0) return;
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, username, post')
        .in('id', uniqueIds);
      if (data) {
        const map = {};
        data.forEach(u => { map[u.id] = u; });
        setUsersMap(map);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // ====== Fetch all pohonch ======
  const fetchPohonch = async () => {
    try {
      setLoading(true);
      setExpandedRow(null);
      setEditingId(null);

      let query = supabase
        .from('pohonch')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (activeSearch.transport.trim()) {
        query = query.ilike('transport_name', `%${activeSearch.transport.trim()}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      let results = data || [];

      if (activeSearch.gr.trim()) {
        const grSearch = activeSearch.gr.trim().toLowerCase();
        results = results.filter(p => {
          const bilties = Array.isArray(p.bilty_metadata) ? p.bilty_metadata : [];
          return bilties.some(b => (b.gr_no || '').toString().toLowerCase().includes(grSearch));
        });
      }

      if (activeSearch.challan.trim()) {
        const challanSearch = activeSearch.challan.trim().toLowerCase();
        results = results.filter(p => {
          const challans = Array.isArray(p.challan_metadata) ? p.challan_metadata : [];
          return challans.some(c => (c || '').toString().toLowerCase().includes(challanSearch));
        });
      }

      setAllPohonch(results);
      setTotalCount(results.length);
      setPage(0);

      // Fetch user details for created_by and updated_by
      const userIds = results.flatMap(p => [p.created_by, p.updated_by, p.signed_by]).filter(Boolean);
      await fetchUsersMap(userIds);

      // Fetch challan dispatch dates for analysis
      const allChallans = results.flatMap(p => Array.isArray(p.challan_metadata) ? p.challan_metadata : []);
      await fetchChallanDates(allChallans);
    } catch (err) {
      console.error('Error fetching pohonch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) fetchPohonch();
  }, [mounted, activeSearch]);

  const handleSearch = () => {
    setActiveSearch({ gr: searchGR, transport: searchTransport, challan: searchChallan });
  };

  const handleClearSearch = () => {
    setSearchGR('');
    setSearchTransport('');
    setSearchChallan('');
    setActiveSearch({ gr: '', transport: '', challan: '' });
  };

  const hasActiveFilters = activeSearch.gr || activeSearch.transport || activeSearch.challan;

  const paginatedData = useMemo(() => {
    const start = page * ITEMS_PER_PAGE;
    return allPohonch.slice(start, start + ITEMS_PER_PAGE);
  }, [allPohonch, page]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const totals = useMemo(() => {
    let amt = 0, kaat = 0, pf = 0, dd = 0, bilties = 0, pkg = 0, wt = 0;
    allPohonch.forEach(p => {
      amt += p.total_amount || 0;
      kaat += p.total_kaat || 0;
      pf += p.total_pf || 0;
      dd += p.total_dd || 0;
      bilties += p.total_bilties || 0;
      pkg += p.total_packages || 0;
      wt += p.total_weight || 0;
    });
    return { amt, kaat, pf, dd, bilties, pkg, wt };
  }, [allPohonch]);

  const getUserName = (userId) => {
    if (!userId) return '-';
    const u = usersMap[userId];
    return u ? (u.name || u.username || 'Unknown') : 'Loading...';
  };

  // ====== Top PF Givers Analysis ======
  const topPFGivers = useMemo(() => {
    const transportMap = {};
    allPohonch.forEach(p => {
      const key = p.transport_gstin || p.transport_name;
      if (!transportMap[key]) {
        transportMap[key] = { name: p.transport_name, gstin: p.transport_gstin, pf: 0, kaat: 0, amt: 0, bilties: 0, pohonchCount: 0, challans: new Set() };
      }
      transportMap[key].pf += p.total_pf || 0;
      transportMap[key].kaat += p.total_kaat || 0;
      transportMap[key].amt += p.total_amount || 0;
      transportMap[key].bilties += p.total_bilties || 0;
      transportMap[key].pohonchCount += 1;
      const challans = Array.isArray(p.challan_metadata) ? p.challan_metadata : [];
      challans.forEach(c => transportMap[key].challans.add(c));
    });
    // Convert Sets to sorted arrays and compute date ranges
    return Object.values(transportMap).map(t => {
      const challanArr = [...t.challans].sort();
      let firstDate = null, lastDate = null;
      challanArr.forEach(cNo => {
        const cd = challanDatesMap[cNo];
        if (cd) {
          const d = cd.dispatch_date || cd.date;
          if (d) {
            const dt = new Date(d);
            if (!firstDate || dt < firstDate) firstDate = dt;
            if (!lastDate || dt > lastDate) lastDate = dt;
          }
        }
      });
      return { ...t, challans: challanArr, firstChallan: challanArr[0] || '-', lastChallan: challanArr[challanArr.length - 1] || '-', firstDate, lastDate };
    }).sort((a, b) => b.pf - a.pf).slice(0, 10);
  }, [allPohonch, challanDatesMap]);

  // ====== Toggle sign ======
  const handleToggleSign = async (pohonch) => {
    if (!user?.id) return;
    try {
      setActionLoading(pohonch.id);
      const newSigned = !pohonch.is_signed;
      const { error } = await supabase
        .from('pohonch')
        .update({
          is_signed: newSigned,
          signed_at: newSigned ? new Date().toISOString() : null,
          signed_by: newSigned ? user.id : null,
          updated_by: user.id,
        })
        .eq('id', pohonch.id);
      if (error) throw error;
      setAllPohonch(prev =>
        prev.map(p =>
          p.id === pohonch.id
            ? { ...p, is_signed: newSigned, signed_at: newSigned ? new Date().toISOString() : null, signed_by: newSigned ? user.id : null, updated_by: user.id }
            : p
        )
      );
      // Update usersMap if needed
      if (!usersMap[user.id]) {
        setUsersMap(prev => ({ ...prev, [user.id]: { id: user.id, name: user.name || user.username, username: user.username } }));
      }
    } catch (err) {
      alert('Failed to update sign status: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ====== Delete (permanent) ======
  const handleDelete = async (pohonch) => {
    if (!confirm(`Permanently delete pohonch ${pohonch.pohonch_number}? This cannot be undone.`)) return;
    try {
      setActionLoading(pohonch.id);
      const { error } = await supabase
        .from('pohonch')
        .delete()
        .eq('id', pohonch.id);
      if (error) throw error;
      setAllPohonch(prev => prev.filter(p => p.id !== pohonch.id));
      setTotalCount(prev => prev - 1);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ====== Edit ======
  const handleStartEdit = (pohonch) => {
    setEditingId(pohonch.id);
    setEditTransportName(pohonch.transport_name);
    setEditGstin(pohonch.transport_gstin || '');
    setEditPohonchNumber(pohonch.pohonch_number || '');
  };

  const handleSaveEdit = async (pohonchId) => {
    try {
      setActionLoading(pohonchId);

      const currentPohonch = allPohonch.find(p => p.id === pohonchId);

      // If pohonch number changed, check for duplicates
      if (editPohonchNumber && editPohonchNumber !== currentPohonch?.pohonch_number) {
        const { data: dupCheck } = await supabase
          .from('pohonch')
          .select('id')
          .eq('pohonch_number', editPohonchNumber.trim())
          .eq('is_active', true)
          .neq('id', pohonchId)
          .limit(1);
        if (dupCheck && dupCheck.length > 0) {
          alert(`Pohonch number "${editPohonchNumber}" already exists! Please use a different number.`);
          setActionLoading(null);
          return;
        }
      }

      const { error } = await supabase
        .from('pohonch')
        .update({
          transport_name: editTransportName,
          transport_gstin: editGstin || null,
          pohonch_number: editPohonchNumber.trim() || currentPohonch?.pohonch_number,
          updated_by: user?.id,
        })
        .eq('id', pohonchId);
      if (error) throw error;
      setAllPohonch(prev =>
        prev.map(p =>
          p.id === pohonchId
            ? { ...p, transport_name: editTransportName, transport_gstin: editGstin || null, pohonch_number: editPohonchNumber.trim() || p.pohonch_number, updated_by: user?.id }
            : p
        )
      );
      setEditingId(null);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 p-3 sm:p-4">
      <div className="w-full mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/transit-finance/cross-challan"
            className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-gray-900">Pohonch List</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              All pohonch records &middot; Search by GR, Transport or Challan
            </p>
          </div>
          <button
            onClick={fetchPohonch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-gray-800">Search Pohonch</h2>
            {hasActiveFilters && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filtered
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">GR Number</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchGR}
                  onChange={(e) => setSearchGR(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by GR no..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Transport Name</label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTransport}
                  onChange={(e) => setSearchTransport(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by transport..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Challan Number</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchChallan}
                  onChange={(e) => setSearchChallan(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by challan no..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSearch}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Search
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleClearSearch}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {!loading && allPohonch.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <SummaryCard label="Pohonch" value={totalCount} color="teal" />
            <SummaryCard label="Total Bilties" value={totals.bilties} color="blue" />
            <SummaryCard label="Packages" value={totals.pkg} color="purple" />
            <SummaryCard label="Weight" value={`${totals.wt.toFixed(1)} kg`} color="indigo" />
            <SummaryCard label="Amount" value={`₹${Math.round(totals.amt).toLocaleString()}`} color="gray" />
            <SummaryCard label="Kaat" value={`₹${Math.round(totals.kaat).toLocaleString()}`} color="emerald" />
            <SummaryCard label="PF" value={`₹${Math.round(totals.pf).toLocaleString()}`} color="cyan" />
          </div>
        )}

        {/* Top PF Givers Analysis */}
        {!loading && topPFGivers.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <h2 className="text-sm font-bold text-gray-800">Top PF Givers (Transport-wise Analysis)</h2>
              <span className="text-[10px] text-gray-500 ml-auto">{topPFGivers.length} transports</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Rank</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Transport</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">GSTIN</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Pohonch</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Bilties</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">First Challan</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Last Challan</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Date Range</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Amount</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Kaat</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-amber-600 uppercase">Total PF</th>
                  </tr>
                </thead>
                <tbody>
                  {topPFGivers.map((t, i) => (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-amber-50/50 transition-colors`}>
                      <td className="px-3 py-2 text-center">
                        {i === 0 ? <span className="text-base">🥇</span> : i === 1 ? <span className="text-base">🥈</span> : i === 2 ? <span className="text-base">🥉</span> : <span className="text-gray-500 font-semibold">{i + 1}</span>}
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-800">{t.name}</td>
                      <td className="px-3 py-2 text-[10px] font-mono text-gray-500">{t.gstin || '-'}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{t.pohonchCount}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{t.bilties}</td>
                      <td className="px-3 py-2 text-[10px] font-mono">
                        <Link href={`/hub-management/${t.firstChallan}`} className="text-blue-700 hover:text-blue-900 hover:underline">{t.firstChallan}</Link>
                      </td>
                      <td className="px-3 py-2 text-[10px] font-mono">
                        <Link href={`/hub-management/${t.lastChallan}`} className="text-blue-700 hover:text-blue-900 hover:underline">{t.lastChallan}</Link>
                      </td>
                      <td className="px-3 py-2 text-center text-[10px]">
                        <div className="flex items-center justify-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">
                            {t.firstDate ? format(t.firstDate, 'dd/MM/yy') : '-'}
                            {t.firstDate && t.lastDate ? ' → ' : ''}
                            {t.lastDate ? format(t.lastDate, 'dd/MM/yy') : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">₹{Math.round(t.amt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">₹{Math.round(t.kaat).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-extrabold text-amber-700">₹{Math.round(t.pf).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Loading pohonch records...</p>
            </div>
          ) : allPohonch.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No pohonch records found</p>
              {hasActiveFilters && (
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search filters</p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">#</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Pohonch No.</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Transport</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">GSTIN</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Challans</th>
                      <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Bilties</th>
                      <th className="px-2 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Amt</th>
                      <th className="px-2 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Kaat</th>
                      <th className="px-2 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">PF</th>
                      <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Signed</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Created By</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Updated By</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Created</th>
                      <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Print</th>
                      <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((p, idx) => {
                      const challans = Array.isArray(p.challan_metadata) ? p.challan_metadata : [];
                      const isEditing = editingId === p.id;
                      const isActionLoading = actionLoading === p.id;
                      const isExpanded = expandedRow === p.id;
                      const bilties = Array.isArray(p.bilty_metadata) ? p.bilty_metadata : [];
                      const globalIdx = page * ITEMS_PER_PAGE + idx;

                      return (
                        <React.Fragment key={p.id}>
                          <tr
                            className={`border-b border-gray-100 transition-colors ${
                              globalIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                            } ${isExpanded ? 'bg-teal-50/50' : 'hover:bg-gray-50'}`}
                          >
                            <td className="px-2 py-2 text-gray-500 text-xs">{globalIdx + 1}</td>
                            <td className="px-2 py-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editPohonchNumber}
                                  onChange={(e) => setEditPohonchNumber(e.target.value.toUpperCase())}
                                  className="w-full px-2 py-1 border border-teal-300 rounded text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                                  style={{ minWidth: '90px' }}
                                />
                              ) : (
                                <button
                                  onClick={() => setExpandedRow(isExpanded ? null : p.id)}
                                  className="font-mono font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 text-xs"
                                >
                                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  {p.pohonch_number}
                                </button>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editTransportName}
                                  onChange={(e) => setEditTransportName(e.target.value)}
                                  className="w-full px-2 py-1 border border-teal-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              ) : (
                                <span className="font-semibold text-gray-800 truncate max-w-[180px] block text-xs" title={p.transport_name}>
                                  {p.transport_name}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editGstin}
                                  onChange={(e) => setEditGstin(e.target.value)}
                                  className="w-full px-2 py-1 border border-teal-300 rounded text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              ) : (
                                <span className="text-gray-600 text-[10px] font-mono">{p.transport_gstin || '-'}</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-gray-700 text-[10px]">
                              {challans.length > 3
                                ? `${challans.slice(0, 3).join(', ')} +${challans.length - 3}`
                                : challans.join(', ') || '-'}
                            </td>
                            <td className="px-2 py-2 text-center font-medium text-gray-900">{p.total_bilties}</td>
                            <td className="px-2 py-2 text-right font-medium text-gray-900">₹{Math.round(p.total_amount || 0).toLocaleString()}</td>
                            <td className="px-2 py-2 text-right font-medium text-emerald-700">₹{Math.round(p.total_kaat || 0).toLocaleString()}</td>
                            <td className="px-2 py-2 text-right font-bold text-teal-700">₹{Math.round(p.total_pf || 0).toLocaleString()}</td>
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => handleToggleSign(p)}
                                disabled={isActionLoading}
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-sm ${
                                  p.is_signed
                                    ? 'text-white bg-green-600 hover:bg-green-700 shadow-green-200'
                                    : 'text-white bg-red-500 hover:bg-red-600 shadow-red-200'
                                }`}
                                title={p.is_signed ? `Signed by ${getUserName(p.signed_by)}${p.signed_at ? ' at ' + format(new Date(p.signed_at), 'dd/MM/yy HH:mm') : ''}` : 'Click to mark as signed'}
                              >
                                {isActionLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <PenTool className="w-3 h-3" />
                                )}
                                {p.is_signed ? 'Signed' : 'Not Signed'}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-[10px]">
                              <div className="flex items-center gap-1 text-gray-600" title={p.created_by || ''}>
                                <User className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                <span className="truncate max-w-[80px]">{getUserName(p.created_by)}</span>
                              </div>
                            </td>
                            <td className="px-2 py-2 text-[10px]">
                              {p.updated_by ? (
                                <div className="flex items-center gap-1 text-gray-600" title={p.updated_by || ''}>
                                  <User className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                  <span className="truncate max-w-[80px]">{getUserName(p.updated_by)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-gray-600 text-[10px]">
                              {p.created_at ? format(new Date(p.created_at), 'dd/MM/yy HH:mm') : '-'}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => crossChallanPrint.handlePrint(p.pohonch_number)}
                                disabled={crossChallanPrint.printingPohonch === p.pohonch_number}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors shadow-sm border border-teal-200"
                                title="Print Pohonch PDF (fetches latest data)"
                              >
                                {crossChallanPrint.printingPohonch === p.pohonch_number ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                Print
                              </button>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveEdit(p.id)}
                                      disabled={isActionLoading}
                                      className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                      title="Save"
                                    >
                                      {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleStartEdit(p)}
                                      className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                      title="Edit"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(p)}
                                      disabled={isActionLoading}
                                      className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                                      title="Delete"
                                    >
                                      {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded row — bilty details */}
                          {isExpanded && bilties.length > 0 && (
                            <tr>
                              <td colSpan={16} className="px-4 py-3 bg-teal-50/70 border-b border-teal-100">
                                <div className="text-xs font-bold text-gray-600 mb-2">
                                  Bilties in {p.pohonch_number} ({bilties.length} GRs) — Challans: {challans.join(', ')}
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-gray-100">
                                        <th className="px-2 py-1.5 text-left font-bold text-gray-500">#</th>
                                        <th className="px-2 py-1.5 text-left font-bold text-gray-500">GR No.</th>
                                        <th className="px-2 py-1.5 text-left font-bold text-gray-500">EWB</th>
                                        <th className="px-2 py-1.5 text-left font-bold text-gray-500">P/B No.</th>
                                        <th className="px-2 py-1.5 text-left font-bold text-gray-500">Challan</th>
                                        <th className="px-2 py-1.5 text-left font-bold text-gray-500">Consignor</th>
                                        <th className="px-2 py-1.5 text-left font-bold text-gray-500">Consignee</th>
                                        <th className="px-2 py-1.5 text-left font-bold text-gray-500">Dest</th>
                                        <th className="px-2 py-1.5 text-center font-bold text-gray-500">Pkg</th>
                                        <th className="px-2 py-1.5 text-right font-bold text-gray-500">Wt</th>
                                        <th className="px-2 py-1.5 text-right font-bold text-gray-500">Amt</th>
                                        <th className="px-2 py-1.5 text-right font-bold text-gray-500">Kaat</th>
                                        <th className="px-2 py-1.5 text-right font-bold text-gray-500">Rate</th>
                                        <th className="px-2 py-1.5 text-right font-bold text-gray-500">DD</th>
                                        <th className="px-2 py-1.5 text-right font-bold text-gray-500">PF</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {bilties.map((b, bIdx) => {
                                        const grSearch = activeSearch.gr.trim().toLowerCase();
                                        const isHighlighted = grSearch && (b.gr_no || '').toString().toLowerCase().includes(grSearch);
                                        return (
                                          <tr key={b.gr_no || bIdx} className={`${bIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${isHighlighted ? '!bg-yellow-100' : ''}`}>
                                            <td className="px-2 py-1 text-gray-400">{bIdx + 1}</td>
                                            <td className={`px-2 py-1 font-mono font-semibold ${isHighlighted ? 'text-amber-800' : 'text-gray-800'}`}>
                                              {b.gr_no || '-'}
                                              {b.e_way_bill && <span className="text-green-600 font-bold ml-0.5 text-[9px]">(E)</span>}
                                            </td>
                                            <td className="px-2 py-1 text-[9px] font-mono text-gray-500 max-w-[70px] truncate" title={b.e_way_bill || '-'}>{b.e_way_bill || '-'}</td>
                                            <td className="px-2 py-1 text-gray-600 font-mono">{b.pohonch_bilty || '-'}</td>
                                            <td className="px-2 py-1 text-gray-600">{b.challan_no || '-'}</td>
                                            <td className="px-2 py-1 text-gray-700 truncate max-w-[120px]">{b.consignor || '-'}</td>
                                            <td className="px-2 py-1 text-gray-700 truncate max-w-[120px]">{b.consignee || '-'}</td>
                                            <td className="px-2 py-1 text-gray-600">{b.destination || '-'}</td>
                                            <td className="px-2 py-1 text-center">{Math.round(b.packages || 0)}</td>
                                            <td className="px-2 py-1 text-right">{(b.weight || 0).toFixed(1)}</td>
                                            <td className="px-2 py-1 text-right font-medium">{b.is_paid ? 'PAID' : `₹${Math.round(b.amount || 0)}`}</td>
                                            <td className="px-2 py-1 text-right text-emerald-700">₹{Math.round(b.kaat || 0)}</td>
                                            <td className="px-2 py-1 text-right text-gray-500 text-[10px]">{b.kaat_rate ? `₹${b.kaat_rate}` : '-'}</td>
                                            <td className="px-2 py-1 text-right text-red-600">{b.dd > 0 ? `-₹${Math.round(b.dd)}` : '-'}</td>
                                            <td className="px-2 py-1 text-right font-bold text-teal-700">₹{Math.round(b.pf || 0)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  {/* Table footer totals */}
                  <tfoot>
                    <tr className="bg-gradient-to-r from-gray-100 to-slate-100 border-t-2 border-gray-300 font-bold text-xs">
                      <td colSpan={5} className="px-2 py-3 text-right text-gray-600 uppercase text-[10px]">
                        Total ({totalCount} pohonch)
                      </td>
                      <td className="px-2 py-3 text-center text-gray-900">{totals.bilties}</td>
                      <td className="px-2 py-3 text-right text-gray-900">₹{Math.round(totals.amt).toLocaleString()}</td>
                      <td className="px-2 py-3 text-right text-emerald-700">₹{Math.round(totals.kaat).toLocaleString()}</td>
                      <td className="px-2 py-3 text-right text-teal-700">₹{Math.round(totals.pf).toLocaleString()}</td>
                      <td colSpan={6}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50/50">
                  <p className="text-sm text-gray-500">
                    Showing {page * ITEMS_PER_PAGE + 1} - {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <span className="text-sm font-medium text-gray-700 px-2">
                      Page {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Print Preview Modal (shared component — fetches fresh data) */}
      <CrossChallanPrintModal
        previewUrl={crossChallanPrint.previewUrl}
        previewName={crossChallanPrint.previewName}
        onDownload={crossChallanPrint.handleDownload}
        onClose={crossChallanPrint.handleClose}
      />
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const colorMap = {
    teal: 'from-teal-500 to-teal-600 ring-teal-200',
    blue: 'from-blue-500 to-blue-600 ring-blue-200',
    purple: 'from-purple-500 to-purple-600 ring-purple-200',
    indigo: 'from-indigo-500 to-indigo-600 ring-indigo-200',
    gray: 'from-gray-600 to-gray-700 ring-gray-200',
    emerald: 'from-emerald-500 to-emerald-600 ring-emerald-200',
    cyan: 'from-cyan-500 to-cyan-600 ring-cyan-200',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
      <p className="text-xs font-bold text-gray-400 uppercase mb-1">{label}</p>
      <p className={`text-lg font-extrabold bg-gradient-to-r ${colorMap[color] || colorMap.teal} bg-clip-text text-transparent`}>
        {value}
      </p>
    </div>
  );
}
