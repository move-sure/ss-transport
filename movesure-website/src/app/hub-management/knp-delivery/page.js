'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import Navbar from '../../../components/dashboard/navbar';
import PodModal from '../../../components/hub-management/delivery/PodModal';
import {
  ArrowLeft, Loader2, RefreshCw, Search, PackageCheck, Clock, CheckCircle2,
  X, AlertCircle, Undo2, MapPin, IndianRupee, ChevronLeft, ChevronRight,
  PackageSearch, Calendar, FileText, Hash,
} from 'lucide-react';

const API_URL = 'https://api.movesure.io';
// Real destination city filter (NOT branch_id — that's the transit hub and
// inflates the list with bilties only passing through Kanpur). The backend
// hides the B-series by default, so no exclude_series param is sent.
const STATION_NAME = 'KANPUR';
const PAGE_SIZES = [25, 50, 100];


const Rs = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const num = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));
const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};
const fmtDateTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// Default list → pending Kanpur bilties.
// Search → EVERY bilty on a challan: delivered or not, any destination, any
// series — so a user can find a delivered GR and Undo it, not just pending ones.
function deliveryUrl({ search, page, pageSize }) {
  const usp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search) {
    usp.set('search', search);
    usp.set('exclude_series', ''); // include B-series too while searching
  } else {
    usp.set('station_name', STATION_NAME);
    usp.set('is_delivered', 'false');
  }
  return `${API_URL}/api/challan/transit/delivery?${usp}`;
}
const isKanpurRow = (r) => (r.destination_city_name || '').toUpperCase() === STATION_NAME;

async function getJson(url, headers, retries = 1) {
  try {
    const res = await fetch(url, { headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === 'error') {
      const err = new Error(json.message || `Request failed (${res.status})`);
      err.retryable = res.status >= 500;
      throw err;
    }
    return json.data || {};
  } catch (e) {
    if (retries > 0 && e.retryable !== false) {
      await new Promise(r => setTimeout(r, 600));
      return getJson(url, headers, retries - 1);
    }
    throw e;
  }
}

export default function KnpDeliveryPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Pending count + amount — taken from the list call itself whenever no search
  // is active (same query), so the page makes ONE request instead of three.
  const [stats, setStats] = useState({ pending: null, pendingAmount: null, loading: true });

  // Suggestions — same Supabase RPC the GR-wise search page uses
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchBoxRef = useRef(null);
  const suggestReq = useRef(0);

  // Per-GR extras for the visible rows — pohonch/bilty no (bilty_wise_kaat) and POD status
  const [kaatMap, setKaatMap] = useState({});   // gr_no → { pohonch_no, bilty_number }
  const [podSet, setPodSet] = useState(new Set());
  const [podRow, setPodRow] = useState(null);    // row whose POD modal is open
  const [pohonchRow, setPohonchRow] = useState(null);
  const [pohonchForm, setPohonchForm] = useState({ pohonch_no: '', bilty_number: '' });
  const [savingPohonch, setSavingPohonch] = useState(false);

  const [busyIds, setBusyIds] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const reqId = useRef(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pushToast = (msg, type = 'success', undoRow = null) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type, undoRow }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), undoRow ? 6000 : 3500);
  };
  const dismissToast = (id) => setToasts(t => t.filter(x => x.id !== id));

  // Debounced search (400ms) — broad terms can take seconds server-side
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Suggestions: search_all_bilties RPC (bilty + manual/station bilties), 250ms debounce
  useEffect(() => {
    const term = searchInput.trim();
    if (term.length < 2) { setSuggestions([]); setSuggestLoading(false); return; }
    const my = ++suggestReq.current;
    setSuggestLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('search_all_bilties', { p_search_term: term, p_limit: 8, p_offset: 0 });
        if (error) throw error;
        if (my === suggestReq.current) { setSuggestions(data || []); setActiveIdx(-1); }
      } catch (e) {
        console.error('Suggestion search failed:', e);
        if (my === suggestReq.current) setSuggestions([]);
      } finally {
        if (my === suggestReq.current) setSuggestLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Close suggestions on outside click
  useEffect(() => {
    const onDown = (e) => { if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setShowSuggest(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const pickSuggestion = (b) => {
    setSearchInput(b.gr_no);
    setSearch(b.gr_no); // skip the debounce — load it right away
    setShowSuggest(false);
    setSuggestions([]);
  };

  const onSearchKey = (e) => {
    if (e.key === 'Escape') { setShowSuggest(false); return; }
    if (!showSuggest || !suggestions.length) {
      if (e.key === 'Enter') setSearch(searchInput.trim());
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => (i + 1) % suggestions.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => (i <= 0 ? suggestions.length - 1 : i - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) pickSuggestion(suggestions[activeIdx]);
      else { setSearch(searchInput.trim()); setShowSuggest(false); }
    }
  };

  // Any filter change → back to page 1
  useEffect(() => { setPage(1); }, [search, pageSize]);

  const loadRows = useCallback(async () => {
    const my = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const d = await getJson(deliveryUrl({ search, page, pageSize }), authHeaders);
      if (my !== reqId.current) return;
      setRows(d.rows || []);
      setTotal(d.total || 0);
      setHasMore(!!d.has_more);
      if (!search) setStats({ pending: d.total ?? 0, pendingAmount: d.total_amount ?? null, loading: false });
    } catch (e) {
      if (my !== reqId.current) return;
      setRows([]); setTotal(0); setHasMore(false);
      setError(e.message || 'Failed to load deliveries');
      setStats(s => (s.loading ? { ...s, loading: false } : s));
    } finally {
      if (my === reqId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, pageSize, token]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    const grNos = [...new Set(rows.map(r => r.gr_no).filter(Boolean))];
    if (!grNos.length) return;
    let cancelled = false;
    (async () => {
      const [k, pd] = await Promise.all([
        supabase.from('bilty_wise_kaat').select('gr_no, pohonch_no, bilty_number').in('gr_no', grNos),
        supabase.from('pod_details').select('gr_no').in('gr_no', grNos),
      ]);
      if (cancelled) return;
      setKaatMap(prev => {
        const n = { ...prev };
        (k.data || []).forEach(x => { n[x.gr_no] = { pohonch_no: x.pohonch_no || '', bilty_number: x.bilty_number || '' }; });
        return n;
      });
      setPodSet(prev => new Set([...prev, ...(pd.data || []).map(x => x.gr_no)]));
    })();
    return () => { cancelled = true; };
  }, [rows]);

  const openPohonch = (row) => {
    const k = kaatMap[row.gr_no] || {};
    setPohonchForm({ pohonch_no: k.pohonch_no || '', bilty_number: k.bilty_number || '' });
    setPohonchRow(row);
  };

  // Same table + rule as the hub challan page: pohonch no OR bilty number, not both
  const savePohonch = async () => {
    if (!pohonchRow || !user?.id) return;
    setSavingPohonch(true);
    try {
      const gr = pohonchRow.gr_no;
      const now = new Date().toISOString();
      const { data: existing } = await supabase.from('bilty_wise_kaat').select('gr_no').eq('gr_no', gr).maybeSingle();
      const payload = {
        gr_no: gr,
        challan_no: pohonchRow.challan_no || null,
        pohonch_no: pohonchForm.pohonch_no.trim() || null,
        bilty_number: pohonchForm.bilty_number.trim() || null,
        updated_by: user.id, updated_at: now,
      };
      if (!existing) Object.assign(payload, { destination_city_id: pohonchRow.to_city_id || null, kaat: 0, pf: 0, created_by: user.id });
      const { data, error } = await supabase.from('bilty_wise_kaat').upsert(payload, { onConflict: 'gr_no' })
        .select('gr_no, pohonch_no, bilty_number').single();
      if (error) throw error;
      setKaatMap(m => ({ ...m, [gr]: { pohonch_no: data.pohonch_no || '', bilty_number: data.bilty_number || '' } }));
      setPohonchRow(null);
      pushToast(`GR ${gr}: ${data.pohonch_no ? `pohonch ${data.pohonch_no}` : data.bilty_number ? `bilty no ${data.bilty_number}` : 'pohonch cleared'}`);
    } catch (e) {
      pushToast(`Pohonch save failed: ${e.message}`, 'error');
    } finally { setSavingPohonch(false); }
  };
  const refreshAll = () => { loadRows(); };

  const setBusy = (id, on) => setBusyIds(prev => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });

  // Optimistic local flip + move stat counts by one — no full refetch
  const applyFlip = (row, delivered) => {
    const flipped = { ...row, is_delivered_at_destination: delivered, delivered_at_destination_date: delivered ? new Date().toISOString() : null };
    if (search) {
      // Search results show every status — just flip the row in place
      setRows(prev => prev.map(r => (r.id === row.id ? flipped : r)));
    } else {
      // Pending list: Delivered → drops off; Undo → comes back on top
      setRows(prev => delivered ? prev.filter(r => r.id !== row.id) : [flipped, ...prev.filter(r => r.id !== row.id)]);
      setTotal(t => Math.max(0, t - (delivered ? 1 : -1)));
    }
    // Stat cards only track Kanpur bilties
    if (!isKanpurRow(row)) return;
    const sign = delivered ? 1 : -1;
    const amt = Number(row.total) || 0;
    setStats(s => ({
      ...s,
      pending: s.pending == null ? s.pending : Math.max(0, s.pending - sign),
      pendingAmount: s.pendingAmount == null ? s.pendingAmount : Math.max(0, s.pendingAmount - sign * amt),
    }));
  };

  const act = async (row, action) => {
    setBusy(row.id, true);
    try {
      const res = await fetch(`${API_URL}/api/challan/transit/${row.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ user_id: user?.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || `Request failed (${res.status})`);
      const delivered = action === 'deliver';
      applyFlip(row, delivered);
      pushToast(json.message || `GR ${row.gr_no} ${delivered ? 'marked delivered' : 'moved back to pending'}`,
        delivered ? 'success' : 'info', delivered ? row : null);
    } catch (e) {
      pushToast(`GR ${row.gr_no}: ${e.message}`, 'error');
    } finally { setBusy(row.id, false); }
  };

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, (page - 1) * pageSize + rows.length);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ── Header ── */}
        <header className="flex items-start sm:items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/hub-management')}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white transition" aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Kanpur Delivery</h1>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5" /> Bilties destined for Kanpur city — mark them delivered
              </p>
            </div>
          </div>
          <button onClick={refreshAll} disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60 transition">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </header>

        {/* ── Stat cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <StatCard icon={Clock} accent="amber" label="Pending Delivery" loading={stats.loading} value={num(stats.pending)} />
          <StatCard icon={IndianRupee} accent="slate" label="Pending Amount" loading={stats.loading}
            value={stats.pendingAmount == null ? '—' : Rs(stats.pendingAmount)} />
        </section>

        {/* ── Table card ── */}
        <section className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
          {/* Controls */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-slate-50/60 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{search ? 'Search results' : 'Pending bilties'}</h2>
              <p className="text-xs text-slate-500">
                {search ? `${total.toLocaleString('en-IN')} matching “${search}” — all bilties, delivered or not` : 'Not yet delivered in Kanpur'}
              </p>
            </div>
            <div ref={searchBoxRef} className="relative flex-1 md:max-w-lg md:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setShowSuggest(true); }}
                onFocus={() => setShowSuggest(true)}
                onKeyDown={onSearchKey}
                placeholder="Search GR no, challan no, consignor, consignee, or transport..."
                className="w-full pl-9 pr-9 py-2 rounded-lg bg-white text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition" />
              {searchInput && (
                <button onClick={() => setSearchInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700" aria-label="Clear search">
                  <X className="w-4 h-4" />
                </button>
              )}
              {(loading && search) || suggestLoading ? (
                <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500 animate-spin" />
              ) : null}

              {showSuggest && searchInput.trim().length >= 2 && (suggestions.length > 0 || !suggestLoading) && (
                <div className="absolute z-30 mt-1.5 w-full rounded-xl bg-white shadow-xl ring-1 ring-slate-200 overflow-hidden">
                  {suggestions.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500">No bilty found for “{searchInput.trim()}”</p>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto py-1">
                      {suggestions.map((b, i) => (
                        <li key={`${b.gr_no}-${i}`}>
                          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => pickSuggestion(b)}
                            onMouseEnter={() => setActiveIdx(i)}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 ${i === activeIdx ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
                            <span className="font-mono font-semibold text-slate-900 w-20 flex-shrink-0">{b.gr_no}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm text-slate-700 truncate">
                                {b.consignor_name || '—'} <span className="text-slate-300">→</span> {b.consignee_name || '—'}
                              </span>
                              <span className="block text-xs text-slate-400 truncate">
                                {[fmtDate(b.bilty_date || b.created_at), b.destination || b.station, b.source_type === 'MNL' ? 'Manual' : null].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            {b.total != null && <span className="text-sm font-medium text-slate-600 flex-shrink-0">{Rs(b.total)}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="m-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Couldn&apos;t load bilties</p>
                <p className="text-red-600/80">{error}</p>
              </div>
              <button onClick={loadRows} className="ml-auto text-sm font-medium text-red-700 hover:underline">Retry</button>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-[0_1px_0_0_rgb(241_245_249)]">
                <tr>
                  <Th>GR No</Th>
                  <Th>Challan</Th>
                  <Th>Date</Th>
                  <Th>Consignor</Th>
                  <Th>Consignee</Th>
                  <Th>Contents</Th>
                  <Th>Pvt Mark</Th>
                  <Th className="text-center">Pkg</Th>
                  <Th className="text-right">Weight</Th>
                  <Th className="text-center">Payment</Th>
                  <Th className="text-right">Amount</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} i={i} />)
                  : rows.map((r, i) => (
                    <tr key={r.id} className={`${i % 2 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-teal-50/40 transition-colors`}>
                      <Td>
                        <span className="font-mono font-semibold text-slate-900">{r.gr_no}</span>
                        <PohonchTag k={kaatMap[r.gr_no]} />
                      </Td>
                      <Td><span className="font-mono text-slate-500">{r.challan_no || '—'}</span></Td>
                      <Td className="whitespace-nowrap">{fmtDate(r.bilty_date)}</Td>
                      <Td className="max-w-[200px]"><p className="truncate" title={r.consignor_name}>{r.consignor_name || '—'}</p></Td>
                      <Td className="max-w-[200px]"><p className="truncate font-medium text-slate-900" title={r.consignee_name}>{r.consignee_name || '—'}</p></Td>
                      <Td className="max-w-[170px]"><p className="truncate" title={r.contain}>{r.contain || '—'}</p></Td>
                      <Td className="max-w-[160px]"><p className="truncate font-medium text-slate-900" title={r.pvt_marks || ''}>{r.pvt_marks || '—'}</p></Td>
                      <Td className="text-center tabular-nums">{r.no_of_pkg ?? '—'}</Td>
                      <Td className="text-right whitespace-nowrap tabular-nums text-slate-600">{r.wt != null ? `${Number(r.wt).toFixed(0)} kg` : '—'}</Td>
                      <Td className="text-center"><PayBadge mode={r.payment_mode} /></Td>
                      <Td className="text-right font-semibold text-slate-900 whitespace-nowrap">{Rs(r.total)}</Td>
                      <Td className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <RowTools onPod={() => setPodRow(r)} onPohonch={() => openPohonch(r)} hasPod={podSet.has(r.gr_no)} hasPohonch={!!(kaatMap[r.gr_no]?.pohonch_no || kaatMap[r.gr_no]?.bilty_number)} />
                          <ActionButton row={r} busy={busyIds.has(r.id)} onAct={act} />
                        </div>
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2 animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
              ))
              : rows.map(r => (
                <article key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono font-semibold text-slate-900">{r.gr_no}</p>
                      <PohonchTag k={kaatMap[r.gr_no]} />
                      <p className="text-xs text-slate-400 font-mono">Challan {r.challan_no || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{Rs(r.total)}</p>
                      <PayBadge mode={r.payment_mode} />
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <dt className="text-slate-400">Consignor</dt><dd className="text-slate-700 truncate">{r.consignor_name || '—'}</dd>
                    <dt className="text-slate-400">Consignee</dt><dd className="text-slate-900 font-medium truncate">{r.consignee_name || '—'}</dd>
                    <dt className="text-slate-400">Contents</dt><dd className="text-slate-700 truncate">{r.contain || '—'}</dd>
                    <dt className="text-slate-400">Pvt Mark</dt><dd className="text-slate-900 font-medium truncate">{r.pvt_marks || '—'}</dd>
                    <dt className="text-slate-400">Pkg</dt><dd className="text-slate-700">{r.no_of_pkg ?? '—'}</dd>
                    <dt className="text-slate-400">Weight</dt><dd className="text-slate-700">{r.wt != null ? `${Number(r.wt).toFixed(0)} kg` : '—'}</dd>
                  </dl>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate(r.bilty_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RowTools onPod={() => setPodRow(r)} onPohonch={() => openPohonch(r)} hasPod={podSet.has(r.gr_no)} hasPohonch={!!(kaatMap[r.gr_no]?.pohonch_no || kaatMap[r.gr_no]?.bilty_number)} />
                      <ActionButton row={r} busy={busyIds.has(r.id)} onAct={act} />
                    </div>
                  </div>
                </article>
              ))}
          </div>

          {/* Empty state */}
          {!loading && !error && rows.length === 0 && (
            <div className="py-16 px-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <PackageSearch className="w-6 h-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900">
                {search ? 'No bilties match' : 'All caught up'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {search ? `No bilty on any challan matches “${search}”. It may not be loaded on a challan yet.` : 'Every Kanpur bilty has been delivered.'}
              </p>
              {search && (
                <button onClick={() => setSearchInput('')} className="mt-3 text-sm font-medium text-teal-700 hover:underline">Clear search</button>
              )}
            </div>
          )}

          {/* Pagination */}
          <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60 text-sm">
            <p className="text-slate-500">
              Showing <span className="font-medium text-slate-900">{from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')}</span> of{' '}
              <span className="font-medium text-slate-900">{total.toLocaleString('en-IN')}</span>
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-slate-500">
                Rows
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
                  className="rounded-md bg-white py-1 pl-2 pr-7 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                  className="p-1.5 rounded-md text-slate-600 ring-1 ring-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40" aria-label="Previous page">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-slate-600 tabular-nums">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={!hasMore || loading}
                  className="p-1.5 rounded-md text-slate-600 ring-1 ring-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40" aria-label="Next page">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </footer>
        </section>
      </main>

      {/* ── POD modal ── */}
      {podRow && (
        <PodModal row={podRow} onClose={() => setPodRow(null)}
          onSaved={(gr) => setPodSet(prev => new Set([...prev, gr]))} />
      )}

      {/* ── Pohonch modal ── */}
      {pohonchRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setPohonchRow(null); }}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Pohonch — {pohonchRow.gr_no}</h3>
                <p className="text-xs text-slate-500">{pohonchRow.consignee_name || '—'} · Challan {pohonchRow.challan_no || '—'}</p>
              </div>
              <button onClick={() => setPohonchRow(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500">Enter either the pohonch no or the bilty number — not both.</p>
              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">Pohonch No</span>
                <input autoFocus value={pohonchForm.pohonch_no} disabled={!!pohonchForm.bilty_number}
                  onChange={e => setPohonchForm({ pohonch_no: e.target.value.toUpperCase(), bilty_number: '' })}
                  onKeyDown={e => { if (e.key === 'Enter') savePohonch(); }}
                  placeholder="e.g. NS0066"
                  className="w-full rounded-lg px-3 py-2.5 text-lg font-mono font-semibold text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-400" />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">Bilty Number</span>
                <input value={pohonchForm.bilty_number} disabled={!!pohonchForm.pohonch_no}
                  onChange={e => setPohonchForm({ bilty_number: e.target.value.toUpperCase(), pohonch_no: '' })}
                  onKeyDown={e => { if (e.key === 'Enter') savePohonch(); }}
                  placeholder="Transport's bilty no"
                  className="w-full rounded-lg px-3 py-2.5 text-lg font-mono font-semibold text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-400" />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setPohonchRow(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={savePohonch} disabled={savingPohonch}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
                  {savingPohonch && <Loader2 className="w-4 h-4 animate-spin" />} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ── */}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 sm:w-96">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ring-1 ${
              t.type === 'error' ? 'bg-white text-red-700 ring-red-200'
              : t.type === 'info' ? 'bg-white text-slate-700 ring-slate-200'
              : 'bg-white text-emerald-700 ring-emerald-200'}`}>
            {t.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" />
              : t.type === 'info' ? <Undo2 className="w-4 h-4 flex-shrink-0" />
              : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1">{t.msg}</span>
            {t.undoRow && (
              <button onClick={() => { dismissToast(t.id); act(t.undoRow, 'undeliver'); }}
                className="font-semibold text-slate-700 hover:text-slate-900">Undo</button>
            )}
            <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Th({ children, className = '' }) {
  return <th className={`px-4 py-3 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

function SkeletonRow({ i }) {
  const w = ['w-16', 'w-10', 'w-14', 'w-28', 'w-28', 'w-20', 'w-16', 'w-6', 'w-12', 'w-14', 'w-12', 'w-20'];
  return (
    <tr className={i % 2 ? 'bg-slate-50/50' : 'bg-white'}>
      {w.map((cls, j) => (
        <td key={j} className="px-4 py-3.5">
          <div className={`h-3.5 ${cls} rounded bg-slate-200/70 animate-pulse ${j === 8 || j >= 10 ? 'ml-auto' : ''} ${j === 7 || j === 9 ? 'mx-auto' : ''}`} />
        </td>
      ))}
    </tr>
  );
}

function PayBadge({ mode }) {
  const m = (mode || '').toLowerCase();
  const toPay = m.includes('to');
  const label = toPay ? 'To Pay' : m.includes('paid') ? 'Paid' : (mode || '—');
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
      toPay ? 'bg-amber-50 text-amber-700' : m.includes('paid') ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  );
}

function PohonchTag({ k }) {
  if (!k?.pohonch_no && !k?.bilty_number) return null;
  return (
    <span className="mt-0.5 flex items-center gap-1 text-[11px] font-mono text-indigo-600" title={k.pohonch_no ? 'Pohonch no' : 'Bilty number'}>
      <Hash className="w-3 h-3" />{k.pohonch_no || k.bilty_number}
    </span>
  );
}

function RowTools({ onPod, onPohonch, hasPod, hasPohonch }) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition';
  return (
    <>
      <button onClick={onPohonch} title={hasPohonch ? 'Edit pohonch no' : 'Add pohonch no'}
        className={`${base} ${hasPohonch ? 'text-indigo-700 ring-indigo-200 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-600 ring-slate-200 bg-white hover:bg-slate-50'}`}>
        <Hash className="w-3.5 h-3.5" /> Pohonch
      </button>
      <button onClick={onPod} title={hasPod ? 'POD saved — reprint / edit' : 'Fill & print POD'}
        className={`${base} ${hasPod ? 'text-teal-700 ring-teal-200 bg-teal-50 hover:bg-teal-100' : 'text-slate-600 ring-slate-200 bg-white hover:bg-slate-50'}`}>
        <FileText className="w-3.5 h-3.5" /> POD{hasPod && <CheckCircle2 className="w-3 h-3" />}
      </button>
    </>
  );
}

function ActionButton({ row, busy, onAct }) {
  if (row.is_delivered_at_destination) {
    return (
      <div className="inline-flex flex-col items-end gap-0.5">
        <button onClick={() => onAct(row, 'undeliver')} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300 bg-white hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition"
          title="Move back to pending">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />} Undo
        </button>
        {row.delivered_at_destination_date && (
          <span className="text-[11px] text-slate-400">Delivered {fmtDateTime(row.delivered_at_destination_date)}</span>
        )}
      </div>
    );
  }
  return (
    <button onClick={() => onAct(row, 'deliver')} disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-60 transition">
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />} Deliver
    </button>
  );
}

function StatCard({ icon: Icon, accent, label, value, loading }) {
  const a = {
    amber:   'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    slate:   'bg-slate-100 text-slate-600',
  }[accent];
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${a}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        {loading
          ? <div className="mt-1.5 h-6 w-24 rounded bg-slate-200/70 animate-pulse" />
          : <p className="text-2xl font-semibold text-slate-900 tracking-tight tabular-nums">{value}</p>}
      </div>
    </div>
  );
}
