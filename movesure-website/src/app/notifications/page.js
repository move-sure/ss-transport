'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import Navbar from '../../components/dashboard/navbar';
import { Bell, AlertTriangle, Clock, CheckCircle, XCircle, Search, RefreshCw, ChevronDown, ChevronUp, Package, ArrowLeft, Truck, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [challanData, setChallanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('expiring');
  const [expandedChallans, setExpandedChallans] = useState({});

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAhead = new Date(now);
      twoDaysAhead.setDate(twoDaysAhead.getDate() + 2);

      // Fetch EWBs within ±2 day window
      const { data: ewbRows, error: ewbErr } = await supabase
        .from('ewb_validations')
        .select('*')
        .not('valid_upto', 'is', null)
        .gte('valid_upto', twoDaysAgo.toISOString())
        .lte('valid_upto', twoDaysAhead.toISOString())
        .order('valid_upto', { ascending: true });

      if (ewbErr) throw ewbErr;

      // Get unique challan numbers
      const challanNos = [...new Set((ewbRows || []).filter(e => e.challan_no).map(e => e.challan_no))];

      // Fetch challan details for those challan numbers
      let challanMap = {};
      if (challanNos.length > 0) {
        const { data: challans, error: chErr } = await supabase
          .from('challan_details')
          .select('challan_no, date, dispatch_date, is_dispatched, truck_id, is_received_at_hub, received_at_hub_timing')
          .in('challan_no', challanNos);

        if (!chErr && challans) {
          challans.forEach(c => { challanMap[c.challan_no] = c; });
        }
      }

      // Group EWBs by challan_no
      const grouped = {};
      (ewbRows || []).forEach(e => {
        const key = e.challan_no || '__no_challan__';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(e);
      });

      // Build challan-wise array
      const result = Object.entries(grouped).map(([challanNo, ewbs]) => {
        const info = challanMap[challanNo] || null;
        return {
          challan_no: challanNo === '__no_challan__' ? null : challanNo,
          challan_info: info,
          dispatch_date: info?.dispatch_date || info?.date || null,
          is_dispatched: info?.is_dispatched || false,
          ewbs,
          expiredCount: ewbs.filter(e => new Date(e.valid_upto) < now).length,
          expiringCount: ewbs.filter(e => new Date(e.valid_upto) >= now).length,
        };
      });

      // Sort by dispatch_date descending (most recent first), null at end
      result.sort((a, b) => {
        const da = a.dispatch_date ? new Date(a.dispatch_date).getTime() : 0;
        const db = b.dispatch_date ? new Date(b.dispatch_date).getTime() : 0;
        return db - da;
      });

      setChallanData(result);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const now = useMemo(() => new Date(), [challanData]);

  const getEwbStatus = (validUpto) => {
    if (!validUpto) return { label: 'Unknown', color: 'gray', icon: 'unknown' };
    const expiry = new Date(validUpto);
    const diffMs = expiry - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs < 0) {
      const hoursAgo = Math.abs(diffHours);
      if (hoursAgo < 1) return { label: `Expired ${Math.round(hoursAgo * 60)}m ago`, color: 'red', icon: 'expired' };
      if (hoursAgo < 24) return { label: `Expired ${Math.round(hoursAgo)}h ago`, color: 'red', icon: 'expired' };
      return { label: `Expired ${Math.round(hoursAgo / 24)}d ago`, color: 'red', icon: 'expired' };
    } else {
      if (diffHours < 1) return { label: `Expires in ${Math.round(diffHours * 60)}m`, color: 'red', icon: 'urgent' };
      if (diffHours < 6) return { label: `Expires in ${Math.round(diffHours)}h`, color: 'orange', icon: 'urgent' };
      if (diffHours < 24) return { label: `Expires in ${Math.round(diffHours)}h`, color: 'amber', icon: 'warning' };
      return { label: `Expires in ${Math.round(diffHours / 24)}d ${Math.round(diffHours % 24)}h`, color: 'yellow', icon: 'warning' };
    }
  };

  const statusBadge = (status) => {
    const colors = {
      red: 'bg-red-100 text-red-700 border-red-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      amber: 'bg-amber-100 text-amber-700 border-amber-200',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      gray: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return colors[status.color] || colors.gray;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const formatShortDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  // Filter challans based on active tab and search
  const filtered = useMemo(() => {
    let items = [...challanData];

    if (activeFilter === 'expired') {
      items = items.filter(c => c.expiredCount > 0);
    } else if (activeFilter === 'expiring') {
      items = items.filter(c => c.expiringCount > 0);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      items = items.filter(c =>
        (c.challan_no || '').toLowerCase().includes(q) ||
        c.ewbs.some(e =>
          (e.ewb_number || '').toLowerCase().includes(q) ||
          (e.gr_no || '').toLowerCase().includes(q)
        )
      );
    }

    return items;
  }, [challanData, activeFilter, searchTerm]);

  const totalEwbs = useMemo(() => challanData.reduce((s, c) => s + c.ewbs.length, 0), [challanData]);
  const totalExpired = useMemo(() => challanData.reduce((s, c) => s + c.expiredCount, 0), [challanData]);
  const totalExpiring = useMemo(() => challanData.reduce((s, c) => s + c.expiringCount, 0), [challanData]);

  const toggleChallan = (challanNo) => {
    setExpandedChallans(prev => ({ ...prev, [challanNo]: !prev[challanNo] }));
  };

  const expandAll = () => {
    const expanded = {};
    filtered.forEach(c => { expanded[c.challan_no || '__no_challan__'] = true; });
    setExpandedChallans(expanded);
  };

  const collapseAll = () => setExpandedChallans({});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-red-50/20">
      <Navbar />

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </button>
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-200">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">EWB Notifications</h1>
                <p className="text-xs text-gray-500">Challan-wise E-Way Bill expiry alerts (±2 days)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <ChevronDown className="h-3.5 w-3.5" /> Expand
              </button>
              <button
                onClick={collapseAll}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <ChevronUp className="h-3.5 w-3.5" /> Collapse
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setActiveFilter('all')}
            className={`rounded-2xl p-3 sm:p-4 border-2 transition-all text-left ${
              activeFilter === 'all'
                ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                : 'bg-white border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-xl ${activeFilter === 'all' ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                <Bell className={`h-4 w-4 sm:h-5 sm:w-5 ${activeFilter === 'all' ? 'text-indigo-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">All</p>
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900">{totalEwbs}</p>
                <p className="text-[10px] text-gray-400">{challanData.length} challans</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setActiveFilter('expired')}
            className={`rounded-2xl p-3 sm:p-4 border-2 transition-all text-left ${
              activeFilter === 'expired'
                ? 'bg-red-50 border-red-300 shadow-sm'
                : 'bg-white border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-xl ${activeFilter === 'expired' ? 'bg-red-100' : 'bg-gray-100'}`}>
                <XCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${activeFilter === 'expired' ? 'text-red-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Expired</p>
                <p className="text-xl sm:text-2xl font-extrabold text-red-600">{totalExpired}</p>
                <p className="text-[10px] text-gray-400">Last 2 days</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setActiveFilter('expiring')}
            className={`rounded-2xl p-3 sm:p-4 border-2 transition-all text-left ${
              activeFilter === 'expiring'
                ? 'bg-amber-50 border-amber-300 shadow-sm'
                : 'bg-white border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-xl ${activeFilter === 'expiring' ? 'bg-amber-100' : 'bg-gray-100'}`}>
                <Clock className={`h-4 w-4 sm:h-5 sm:w-5 ${activeFilter === 'expiring' ? 'text-amber-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Expiring</p>
                <p className="text-xl sm:text-2xl font-extrabold text-amber-600">{totalExpiring}</p>
                <p className="text-[10px] text-gray-400">Next 2 days</p>
              </div>
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by EWB number, GR number, or Challan number..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="relative w-10 h-10 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
              <div className="absolute inset-0 rounded-full border-4 border-orange-600 border-t-transparent animate-spin" />
            </div>
            <p className="mt-4 text-gray-500 text-sm">Loading EWB alerts...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No EWB alerts found</p>
            <p className="text-xs text-gray-400 mt-1">All clear! No E-Way Bills expiring or expired in the ±2 day window.</p>
          </div>
        )}

        {/* Challan-wise Accordion Cards */}
        {!loading && filtered.map((challan) => {
          const key = challan.challan_no || '__no_challan__';
          const isExpanded = expandedChallans[key];
          const hasExpired = challan.expiredCount > 0;
          const ci = challan.challan_info;

          return (
            <div key={key} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${hasExpired ? 'border-red-200' : 'border-gray-100'}`}>
              {/* Challan Header */}
              <button
                onClick={() => toggleChallan(key)}
                className={`w-full px-4 sm:px-5 py-4 flex items-center justify-between gap-3 text-left transition-colors ${
                  isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${hasExpired ? 'bg-red-100' : 'bg-teal-100'}`}>
                    <Package className={`h-5 w-5 ${hasExpired ? 'text-red-600' : 'text-teal-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {challan.challan_no ? (
                        <span
                          onClick={(e) => { e.stopPropagation(); router.push(`/ewb/${challan.challan_no}`); }}
                          className="text-sm font-bold text-indigo-700 hover:text-indigo-900 underline decoration-indigo-300 hover:decoration-indigo-500 cursor-pointer transition-colors"
                        >
                          {challan.challan_no}
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-gray-900">No Challan</span>
                      )}
                      {ci?.is_dispatched && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                          <Truck className="h-3 w-3" /> Dispatched
                        </span>
                      )}
                      {ci && !ci.is_dispatched && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                          Pending
                        </span>
                      )}
                      {ci?.is_received_at_hub && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                          Hub Received
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                      {ci?.dispatch_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Dispatched: <b className="text-gray-700">{formatDate(ci.dispatch_date)}</b>
                        </span>
                      )}
                      {!ci?.dispatch_date && ci?.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Date: <b className="text-gray-700">{formatShortDate(ci.date)}</b>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-900">{challan.ewbs.length} EWB{challan.ewbs.length > 1 ? 's' : ''}</span>
                    {challan.expiredCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                        <XCircle className="h-2.5 w-2.5" /> {challan.expiredCount}
                      </span>
                    )}
                    {challan.expiringCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        <Clock className="h-2.5 w-2.5" /> {challan.expiringCount}
                      </span>
                    )}
                  </div>
                  <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-indigo-600" />
                      : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              </button>

              {/* Expanded EWB Table */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">#</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">EWB Number</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">GR No</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Valid Upto</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {challan.ewbs.map((e, i) => {
                          const st = getEwbStatus(e.valid_upto);
                          const isExpiredRow = new Date(e.valid_upto) < now;
                          return (
                            <tr key={e.id} className={`hover:bg-gray-50 ${isExpiredRow ? 'bg-red-50/30' : ''}`}>
                              <td className="px-4 py-2.5 text-xs text-gray-400 font-medium">{i + 1}</td>
                              <td className="px-4 py-2.5">
                                <span className="text-sm font-bold text-indigo-700">{e.ewb_number}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-xs font-semibold text-gray-800">{e.gr_no || '-'}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <p className="text-xs font-semibold text-gray-800">{formatDate(e.valid_upto)}</p>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${statusBadge(st)}`}>
                                  {st.icon === 'expired' && <XCircle className="h-3 w-3" />}
                                  {st.icon === 'urgent' && <AlertTriangle className="h-3 w-3" />}
                                  {st.icon === 'warning' && <Clock className="h-3 w-3" />}
                                  {st.label}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                {e.is_valid ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200">
                                    <CheckCircle className="h-3 w-3" /> Valid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                                    <XCircle className="h-3 w-3" /> Invalid
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {challan.ewbs.map((e, i) => {
                      const st = getEwbStatus(e.valid_upto);
                      const isExpiredRow = new Date(e.valid_upto) < now;
                      return (
                        <div key={e.id} className={`p-4 ${isExpiredRow ? 'bg-red-50/30' : ''}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-indigo-100 rounded-lg text-indigo-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                              <span className="text-sm font-bold text-indigo-700">{e.ewb_number}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${statusBadge(st)}`}>
                              {st.icon === 'expired' && <XCircle className="h-3 w-3" />}
                              {st.icon === 'urgent' && <AlertTriangle className="h-3 w-3" />}
                              {st.icon === 'warning' && <Clock className="h-3 w-3" />}
                              {st.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                            {e.gr_no && <span>GR: <b className="text-gray-800">{e.gr_no}</b></span>}
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-xs">
                            <span className="text-gray-500">Valid upto: <b className="text-gray-700">{formatDate(e.valid_upto)}</b></span>
                            {e.is_valid ? (
                              <span className="text-green-700 font-bold flex items-center gap-0.5"><CheckCircle className="h-3 w-3" /> Valid</span>
                            ) : (
                              <span className="text-red-700 font-bold flex items-center gap-0.5"><XCircle className="h-3 w-3" /> Invalid</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="text-center text-xs text-gray-400 py-2">
            Showing {filtered.length} challan{filtered.length > 1 ? 's' : ''} with {filtered.reduce((s, c) => s + c.ewbs.length, 0)} EWB alerts
          </div>
        )}
      </div>
    </div>
  );
}
