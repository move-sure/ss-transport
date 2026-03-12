'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import Navbar from '../../../components/dashboard/navbar';
import Link from 'next/link';
import {
  Monitor, Smartphone, Tablet, Globe, Clock, MapPin, Wifi, WifiOff,
  Search, X, ChevronDown, ChevronUp, ArrowLeft, RefreshCw, User,
  Shield, Chrome, Laptop, Info, Map, Activity, Eye, Power, CheckSquare, Square, XCircle, Loader2
} from 'lucide-react';

// Parse user_agent JSON safely
const parseUA = (raw) => {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed;
  } catch {
    // Old-style plain user agent string
    return { raw_user_agent: raw };
  }
};

// Device icon based on type
const DeviceIcon = ({ type, className = 'w-5 h-5' }) => {
  const t = (type || '').toLowerCase();
  if (t.includes('mobile')) return <Smartphone className={className} />;
  if (t.includes('tablet')) return <Tablet className={className} />;
  return <Monitor className={className} />;
};

// Format datetime
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
}) : '-';

// Time ago
const timeAgo = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default function SessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // all, active, inactive
  const [expandedSession, setExpandedSession] = useState(null);
  const [mapSession, setMapSession] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [closingIds, setClosingIds] = useState(new Set());
  const [bulkClosing, setBulkClosing] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    try {
      setLoading(true);

      const [sessionsRes, usersRes] = await Promise.all([
        supabase
          .from('user_sessions')
          .select('*')
          .order('login_time', { ascending: false })
          .limit(200),
        supabase
          .from('users')
          .select('id, name, username, post, image_url, is_active, is_staff')
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (usersRes.error) throw usersRes.error;

      const usersMap = Object.fromEntries((usersRes.data || []).map(u => [u.id, u]));
      setUsers(usersMap);
      setSessions(sessionsRes.data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
    setSelectedIds(new Set());
    setRefreshing(false);
  };

  // Toggle single selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Select / deselect all visible active sessions
  const toggleSelectAll = () => {
    const activeVisible = filteredSessions.filter(s => s.is_active).map(s => s.id);
    const allSelected = activeVisible.length > 0 && activeVisible.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeVisible));
    }
  };

  // Close a single session
  const closeSession = async (sessionId) => {
    if (!confirm('End this session? The user will be logged out.')) return;
    setClosingIds(prev => new Set(prev).add(sessionId));
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false, logout_time: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_active: false, logout_time: new Date().toISOString() } : s));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(sessionId); return next; });
    } catch (err) {
      console.error('Error closing session:', err);
      alert('Failed to close session');
    } finally {
      setClosingIds(prev => { const next = new Set(prev); next.delete(sessionId); return next; });
    }
  };

  // Bulk close selected sessions
  const bulkCloseSessions = async () => {
    const ids = [...selectedIds].filter(id => sessions.find(s => s.id === id && s.is_active));
    if (ids.length === 0) return;
    if (!confirm(`End ${ids.length} session${ids.length > 1 ? 's' : ''}? These users will be logged out.`)) return;
    setBulkClosing(true);
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false, logout_time: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      const now = new Date().toISOString();
      setSessions(prev => prev.map(s => ids.includes(s.id) ? { ...s, is_active: false, logout_time: now } : s));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Error bulk closing sessions:', err);
      alert('Failed to close sessions');
    } finally {
      setBulkClosing(false);
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const u = users[s.user_id];
      const ua = parseUA(s.user_agent);
      const term = searchTerm.toLowerCase();

      // Search filter
      if (term) {
        const searchIn = [
          u?.name, u?.username, u?.post,
          ua?.browser, ua?.os, ua?.device_type, ua?.city, ua?.country, ua?.isp,
          s.ip_address
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchIn.includes(term)) return false;
      }

      // Active filter
      if (filterActive === 'active' && !s.is_active) return false;
      if (filterActive === 'inactive' && s.is_active) return false;

      return true;
    });
  }, [sessions, users, searchTerm, filterActive]);

  // Count active sessions
  const activeCount = sessions.filter(s => s.is_active).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      {/* Map Modal */}
      {mapSession && (() => {
        const ua = parseUA(mapSession.user_agent);
        const lat = ua?.latitude;
        const lng = ua?.longitude;
        const u = users[mapSession.user_id];
        if (!lat || !lng) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setMapSession(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-red-400" />
                  <div>
                    <span className="text-sm font-bold">{u?.name || u?.username || 'User'} — Location</span>
                    <div className="text-[10px] text-slate-400">
                      {ua?.city && <span>{ua.city}, </span>}
                      {ua?.region && <span>{ua.region}, </span>}
                      {ua?.country && <span>{ua.country}</span>}
                      <span className="ml-2 text-slate-500">({lat.toFixed(4)}, {lng.toFixed(4)})</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setMapSession(null)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="h-[450px] w-full">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02},${lat - 0.015},${lng + 0.02},${lat + 0.015}&layer=mapnik&marker=${lat},${lng}`}
                  className="w-full h-full border-0"
                  title="User Location Map"
                  loading="lazy"
                />
              </div>
              <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Login:</span> {fmtDT(mapSession.login_time)}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Globe className="w-3.5 h-3.5" /> Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/test" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">User Sessions</h1>
                <p className="text-sm text-gray-500">{sessions.length} sessions • <span className="text-emerald-600 font-semibold">{activeCount} active</span></p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm flex items-center gap-2 self-start"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, browser, city, IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'inactive'].map(f => (
              <button
                key={f}
                onClick={() => setFilterActive(f)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition border ${
                  filterActive === f
                    ? f === 'active' ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : f === 'inactive' ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? `All (${sessions.length})` : f === 'active' ? `Active (${activeCount})` : `Inactive (${sessions.length - activeCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const u = users[session.user_id];
            const ua = parseUA(session.user_agent);
            const isExpanded = expandedSession === session.id;
            const hasLocation = ua?.latitude && ua?.longitude;
            const isSelected = selectedIds.has(session.id);
            const isClosing = closingIds.has(session.id);

            return (
              <div key={session.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-all ${
                isSelected ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'
              }`}>
                {/* Main Row */}
                <div className="p-4 flex items-center gap-3 sm:gap-4">
                  {/* Checkbox */}
                  {session.is_active && (
                    <button
                      onClick={() => toggleSelect(session.id)}
                      className={`flex-shrink-0 p-0.5 rounded transition ${
                        isSelected ? 'text-red-500' : 'text-gray-300 hover:text-gray-500'
                      }`}
                    >
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </button>
                  )}
                  {!session.is_active && <div className="w-6 flex-shrink-0" />}

                  {/* Active indicator + Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center overflow-hidden ${
                      session.is_active
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500 ring-2 ring-emerald-300 ring-offset-2'
                        : 'bg-gradient-to-br from-gray-300 to-gray-400'
                    }`}>
                      {u?.image_url ? (
                        <img src={u.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {(u?.name || u?.username || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    {session.is_active && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
                    )}
                  </div>

                  {/* User + device summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 truncate">{u?.name || u?.username || 'Unknown'}</span>
                      {u?.post && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">{u.post}</span>}
                      {session.is_active ? (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold flex items-center gap-1">
                          <Wifi className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold flex items-center gap-1">
                          <WifiOff className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 flex-wrap">
                      {ua?.device_type && (
                        <span className="flex items-center gap-1">
                          <DeviceIcon type={ua.device_type} className="w-3.5 h-3.5" />
                          {ua.device_type}
                        </span>
                      )}
                      {ua?.browser && <span className="font-medium text-gray-600">{ua.browser.split(' ')[0]}</span>}
                      {ua?.os && <span>{ua.os}</span>}
                      {ua?.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{ua.city}{ua.country ? `, ${ua.country}` : ''}</span>}
                      {session.ip_address && <span className="text-gray-400">{session.ip_address}</span>}
                    </div>
                  </div>

                  {/* Time + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-[11px] font-semibold text-gray-700">{timeAgo(session.login_time)}</div>
                      <div className="text-[10px] text-gray-400">{fmtDT(session.login_time)}</div>
                    </div>
                    {session.is_active && (
                      <button
                        onClick={() => closeSession(session.id)}
                        disabled={isClosing}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-xl transition disabled:opacity-50"
                        title="End session"
                      >
                        {isClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                      </button>
                    )}
                    {hasLocation && (
                      <button
                        onClick={() => setMapSession(session)}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition"
                        title="View on map"
                      >
                        <Map className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className={`p-2 rounded-xl transition ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Session & Device Details */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" /> Session Details
                        </h4>
                        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                          <DetailRow label="Session ID" value={session.id} mono />
                          <DetailRow label="Status" value={
                            session.is_active
                              ? <span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Now</span>
                              : <span className="text-gray-500 font-semibold">Inactive</span>
                          } />
                          <DetailRow label="Login Time" value={fmtDT(session.login_time)} />
                          {session.logout_time && <DetailRow label="Logout Time" value={fmtDT(session.logout_time)} />}
                          <DetailRow label="IP Address" value={session.ip_address || '-'} mono />
                          {ua?.isp && <DetailRow label="ISP / Org" value={ua.isp} />}
                        </div>

                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 pt-2">
                          <Monitor className="w-3.5 h-3.5" /> Device & Browser
                        </h4>
                        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                          {ua?.device_type && <DetailRow label="Device Type" value={
                            <span className="flex items-center gap-1.5"><DeviceIcon type={ua.device_type} className="w-4 h-4" /> {ua.device_type}</span>
                          } />}
                          {ua?.browser && <DetailRow label="Browser" value={ua.browser} />}
                          {ua?.os && <DetailRow label="Operating System" value={ua.os} />}
                          {ua?.platform && <DetailRow label="Platform" value={ua.platform} />}
                          {ua?.screen_resolution && <DetailRow label="Screen Resolution" value={ua.screen_resolution} />}
                          {ua?.viewport && <DetailRow label="Viewport" value={ua.viewport} />}
                          {ua?.language && <DetailRow label="Language" value={ua.language} />}
                        </div>

                        {ua?.raw_user_agent && (
                          <div className="bg-white rounded-xl border border-gray-200 p-3">
                            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Raw User Agent</div>
                            <div className="text-[11px] text-gray-600 break-all font-mono leading-relaxed bg-gray-50 p-2 rounded-lg">{ua.raw_user_agent}</div>
                          </div>
                        )}
                      </div>

                      {/* Location + Map */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> Location
                        </h4>
                        {hasLocation ? (
                          <>
                            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                              {ua?.city && <DetailRow label="City" value={ua.city} />}
                              {ua?.region && <DetailRow label="Region" value={ua.region} />}
                              {ua?.country && <DetailRow label="Country" value={ua.country} />}
                              <DetailRow label="Latitude" value={ua.latitude?.toFixed(6)} mono />
                              <DetailRow label="Longitude" value={ua.longitude?.toFixed(6)} mono />
                            </div>
                            {/* Inline Map */}
                            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                              <iframe
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${ua.longitude - 0.015},${ua.latitude - 0.01},${ua.longitude + 0.015},${ua.latitude + 0.01}&layer=mapnik&marker=${ua.latitude},${ua.longitude}`}
                                className="w-full h-56 border-0"
                                title="Session Location"
                                loading="lazy"
                              />
                              <div className="bg-white px-3 py-2 flex items-center justify-between">
                                <span className="text-[10px] text-gray-500">
                                  📍 {ua.city || ''}{ua.region ? `, ${ua.region}` : ''}{ua.country ? `, ${ua.country}` : ''}
                                </span>
                                <a
                                  href={`https://www.google.com/maps?q=${ua.latitude},${ua.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  <Globe className="w-3 h-3" /> Google Maps
                                </a>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                            <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 font-semibold">Location not available</p>
                            <p className="text-xs text-gray-400 mt-1">This session was created before location tracking was enabled</p>
                          </div>
                        )}

                        {/* User card */}
                        {u && (
                          <>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 pt-2">
                              <User className="w-3.5 h-3.5" /> User Info
                            </h4>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {u.image_url ? (
                                  <img src={u.image_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-white font-bold text-xl">{(u.name || u.username || '?')[0].toUpperCase()}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900">{u.name || u.username}</div>
                                <div className="text-sm text-gray-500">@{u.username}</div>
                                {u.post && <div className="text-xs text-gray-400 mt-0.5">{u.post}</div>}
                              </div>
                              <div className="ml-auto flex flex-col items-end gap-1">
                                {u.is_staff && (
                                  <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> Admin
                                  </span>
                                )}
                                {u.is_active ? (
                                  <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">Active</span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">Disabled</span>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredSessions.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No sessions found</h3>
            <p className="text-gray-500">{searchTerm ? 'Try a different search term' : 'No sessions recorded yet'}</p>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom">
          <div className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-red-400" />
              <span className="text-sm font-bold">{selectedIds.size} session{selectedIds.size > 1 ? 's' : ''} selected</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg transition"
            >
              {filteredSessions.filter(s => s.is_active).every(s => selectedIds.has(s.id)) ? 'Deselect All' : 'Select All Active'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg transition flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
            <button
              onClick={bulkCloseSessions}
              disabled={bulkClosing}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {bulkClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              {bulkClosing ? 'Closing...' : `End ${selectedIds.size} Session${selectedIds.size > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable detail row
function DetailRow({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between px-3 py-2">
      <span className="text-[11px] text-gray-400 font-medium flex-shrink-0 w-28">{label}</span>
      <span className={`text-[11px] text-gray-800 font-semibold text-right ${mono ? 'font-mono' : ''}`}>{value || '-'}</span>
    </div>
  );
}
