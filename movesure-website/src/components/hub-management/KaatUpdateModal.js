'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Loader2, CheckCircle2, AlertCircle,
  TrendingDown, Zap, Edit3, ChevronRight,
  MapPin, Search, ChevronDown, Hash,
} from 'lucide-react';

const API_BASE = 'https://api.movesure.io';

// ────────────────────────────────────────────────────────────────────────────────
// Derive city stats from bilties list
// ────────────────────────────────────────────────────────────────────────────────
function buildCityStats(bilties) {
  const map = {};
  for (const b of bilties) {
    const city = (b.to_city || '').trim().toUpperCase();
    if (!city) continue;
    if (!map[city]) map[city] = { city, rates: [], count: 0 };
    map[city].count++;
    if (b.kaat_rate != null) map[city].rates.push(parseFloat(b.kaat_rate));
  }
  return Object.values(map)
    .map(c => ({
      city:    c.city,
      count:   c.count,
      avgRate: c.rates.length
        ? +(c.rates.reduce((a, b) => a + b, 0) / c.rates.length).toFixed(2)
        : null,
    }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

// ────────────────────────────────────────────────────────────────────────────────
// CityPicker — searchable dropdown with avg kaat rate
// ────────────────────────────────────────────────────────────────────────────────
function CityPicker({ cityStats, value, onChange }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const filtered = useMemo(
    () => cityStats.filter(c => c.city.includes(query.toUpperCase())),
    [cityStats, query]
  );

  const selected = cityStats.find(c => c.city === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border rounded-xl text-sm transition-all text-left ${
          open ? 'border-teal-400 ring-2 ring-teal-500/30' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-teal-500 shrink-0" />
          {selected
            ? <span className="font-bold font-mono text-gray-900 truncate">{selected.city}</span>
            : <span className="text-gray-400">Select destination station…</span>
          }
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selected?.avgRate != null && (
            <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-black rounded-full">
              avg {selected.avgRate}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
              <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search city…"
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-xs text-gray-400 text-center py-4">No cities found</p>
              : filtered.map(c => (
                <button
                  key={c.city}
                  type="button"
                  onClick={() => { onChange(c.city); setOpen(false); setQuery(''); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-teal-50 transition-colors text-left ${value === c.city ? 'bg-teal-50' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className={`h-3 w-3 shrink-0 ${value === c.city ? 'text-teal-600' : 'text-gray-300'}`} />
                    <span className={`text-sm font-mono font-bold ${value === c.city ? 'text-teal-700' : 'text-gray-800'}`}>
                      {c.city}
                    </span>
                    <span className="text-[10px] text-gray-400">{c.count} bilty</span>
                  </div>
                  {c.avgRate != null
                    ? <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] text-gray-400 font-medium uppercase">Avg Rate</span>
                        <span className={`text-xs font-black ${value === c.city ? 'text-teal-700' : 'text-rose-500'}`}>
                          {c.avgRate}
                        </span>
                      </div>
                    : <span className="text-[10px] text-gray-300 italic">no rate data</span>
                  }
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// GrPicker — searchable dropdown from bilties list
// ────────────────────────────────────────────────────────────────────────────────
function GrPicker({ bilties, value, onChange }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toUpperCase();
    const list = q
      ? bilties.filter(b =>
          (b.gr_no || '').toUpperCase().includes(q) ||
          (b.consignor_name || '').toUpperCase().includes(q) ||
          (b.to_city || '').toUpperCase().includes(q)
        )
      : bilties;
    return list.slice(0, 60);
  }, [bilties, query]);

  const selected = bilties.find(b => b.gr_no === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border rounded-xl text-sm transition-all text-left ${
          open ? 'border-indigo-400 ring-2 ring-indigo-500/30' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          {selected
            ? <span className="font-black font-mono text-indigo-700 truncate">{selected.gr_no}</span>
            : <span className="text-gray-400">Select GR from list…</span>
          }
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selected && <span className="text-[10px] text-gray-500 truncate max-w-[100px]">{selected.to_city}</span>}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
              <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search GR, consignor, city…"
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-xs text-gray-400 text-center py-4">No bilties found</p>
              : filtered.map((b, i) => (
                <button
                  key={`${b.gr_no}-${i}`}
                  type="button"
                  onClick={() => { onChange(b); setOpen(false); setQuery(''); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left border-b border-gray-50 last:border-0 ${value === b.gr_no ? 'bg-indigo-50' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black font-mono ${value === b.gr_no ? 'text-indigo-700' : 'text-gray-800'}`}>
                        {b.gr_no}
                      </span>
                      {b.kaat_rate != null && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-500 rounded-full font-bold border border-rose-100">
                          ₹{b.kaat_rate}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {b.consignor_name ? `${b.consignor_name} → ` : ''}{b.to_city || '—'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right ml-2">
                    {b.kaat != null && <p className="text-xs font-bold text-rose-600">₹{b.kaat}</p>}
                    {b.wt  != null && <p className="text-[10px] text-gray-400">{b.wt} kg</p>}
                  </div>
                </button>
              ))
            }
          </div>
          {bilties.length > 60 && !query && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 text-center">
                Showing first 60 — type to search all {bilties.length}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Station multi-select dropdown
// ────────────────────────────────────────────────────────────────────────────────
function StationMultiDropdown({ stations, selectedNames, onToggle, onSelectAll, onClearAll }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const filtered = useMemo(
    () => stations.filter(s => s.name.includes(query.toUpperCase())),
    [stations, query]
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border rounded-xl text-sm transition-all text-left ${
          open ? 'border-teal-400 ring-2 ring-teal-500/30' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MapPin className="h-3.5 w-3.5 text-teal-500 shrink-0" />
          {selectedNames.size === 0
            ? <span className="text-gray-400">Select stations…</span>
            : selectedNames.size === stations.length
            ? <span className="font-bold text-teal-700">All {stations.length} stations selected</span>
            : (
              <span className="font-bold text-gray-800 truncate">
                {[...selectedNames].join(', ')}
              </span>
            )
          }
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedNames.size > 0 && (
            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-black rounded-full">
              {selectedNames.size}/{stations.length}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          {/* Search + bulk buttons */}
          <div className="p-2 border-b border-gray-100 space-y-1.5">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl">
              <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search station…"
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-400"
              />
            </div>
            <div className="flex gap-1 px-1">
              <button type="button" onClick={onSelectAll}
                className="flex-1 text-[10px] font-bold text-teal-600 hover:bg-teal-50 py-1 rounded-lg transition-colors">
                Select All
              </button>
              <button type="button" onClick={onClearAll}
                className="flex-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 py-1 rounded-lg transition-colors">
                Clear All
              </button>
            </div>
          </div>

          {/* Station list */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-xs text-gray-400 text-center py-4">No stations found</p>
              : filtered.map(s => {
                const checked = selectedNames.has(s.name);
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => onToggle(s.name)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-teal-50 transition-colors text-left border-b border-gray-50 last:border-0 ${checked ? 'bg-teal-50' : ''}`}
                  >
                    <span className={`h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center ${checked ? 'border-teal-500 bg-teal-500' : 'border-gray-300 bg-white'}`}>
                      {checked && <span className="block w-2 h-2 bg-white rounded-sm" />}
                    </span>
                    <span className={`text-sm font-mono font-bold flex-1 ${checked ? 'text-teal-800' : 'text-gray-700'}`}>{s.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      {s.avgRate != null && (
                        <div className="text-right">
                          <p className="text-[9px] text-gray-400 uppercase font-semibold">Avg Rate</p>
                          <p className={`text-xs font-black ${checked ? 'text-teal-700' : 'text-rose-500'}`}>@{s.avgRate}</p>
                        </div>
                      )}
                      <span className="text-[10px] text-gray-400 font-medium">{s.count} bilties</span>
                    </div>
                  </button>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Bulk Update by GR List (POST /api/kaat/bulk-update-by-grs)
// ────────────────────────────────────────────────────────────────────────────────
function BulkUpdateTab({ transportGstin, bilties, token, onSuccess }) {
  const cityStats = useMemo(() => buildCityStats(bilties), [bilties]);

  // Station list
  const stations = useMemo(() => {
    const map = new Map();
    for (const b of bilties) {
      const st = (b.to_city || 'Unknown').trim().toUpperCase();
      if (!map.has(st)) map.set(st, []);
      map.get(st).push(b);
    }
    return [...map.entries()]
      .map(([name, bs]) => {
        const stat = cityStats.find(c => c.city === name);
        return { name, bs, count: bs.length, avgRate: stat?.avgRate ?? null };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bilties, cityStats]);

  // Selected station names
  const [selectedNames, setSelectedNames] = useState(() => new Set());

  // Per-station rate state: { [stationName]: { rate: string, dd: string } }
  const [stationRates, setStationRates] = useState(() => {
    const init = {};
    stations.forEach(s => {
      init[s.name] = { rate: s.avgRate != null ? String(s.avgRate) : '', dd: '' };
    });
    return init;
  });

  const [loading,  setLoading]  = useState(false);
  const [results,  setResults]  = useState(null); // { [stationName]: { data, error } }

  const setRate = (name, val) =>
    setStationRates(prev => ({ ...prev, [name]: { ...prev[name], rate: val } }));
  const setDd = (name, val) =>
    setStationRates(prev => ({ ...prev, [name]: { ...prev[name], dd: val } }));

  const toggleName = (name) => {
    setSelectedNames(prev => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
    setResults(null);
  };

  const selectAll = () => { setSelectedNames(new Set(stations.map(s => s.name))); setResults(null); };
  const clearAll  = () => { setSelectedNames(new Set()); setResults(null); };

  const selectedStations = stations.filter(s => selectedNames.has(s.name));
  const totalBilties = selectedStations.reduce((sum, s) => sum + s.bs.length, 0);
  const allRatesFilled = selectedStations.every(s => stationRates[s.name]?.rate);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStations.length || !allRatesFilled) return;
    setLoading(true); setResults(null);
    const out = {};
    for (const s of selectedStations) {
      const { rate, dd } = stationRates[s.name] || {};
      const gr_nos = s.bs.map(b => b.gr_no);
      try {
        const body = { gr_nos, new_kaat_rate: parseFloat(rate) };
        if (dd !== '') body.new_kaat_dd = parseFloat(dd);
        const res = await fetch(`${API_BASE}/api/kaat/bulk-update-by-grs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || data.status === 'error') throw new Error(data.message || 'API error');
        out[s.name] = { data };
      } catch (err) {
        out[s.name] = { error: err.message };
      }
    }
    setResults(out);
    setLoading(false);
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Context row */}
      <div className="flex flex-wrap gap-2 px-4 py-3 bg-teal-50 border border-teal-200 rounded-2xl">
        <div className="flex items-center gap-2 bg-white/80 border border-teal-100 rounded-xl px-3 py-1.5">
          <span className="text-[10px] font-bold text-teal-500 uppercase">GSTIN</span>
          <span className="text-xs font-mono font-bold text-teal-800">{transportGstin || '—'}</span>
        </div>
        <div className="flex items-center gap-2 bg-white/80 border border-teal-100 rounded-xl px-3 py-1.5">
          <span className="text-[10px] font-bold text-teal-500 uppercase">Bilties</span>
          <span className="text-xs font-mono font-bold text-teal-800">{bilties.length}</span>
        </div>
        {selectedNames.size > 0 && (
          <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-200 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Selected</span>
            <span className="text-xs font-mono font-bold text-emerald-800">{totalBilties} bilties · {selectedNames.size} stations</span>
          </div>
        )}
      </div>

      {/* Station multi-select dropdown */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
          Select Stations <span className="text-rose-500">*</span>
        </label>
        <StationMultiDropdown
          stations={stations}
          selectedNames={selectedNames}
          onToggle={toggleName}
          onSelectAll={selectAll}
          onClearAll={clearAll}
        />
      </div>

      {/* Per-station rate cards */}
      {selectedStations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Set Rate Per Station</p>
          {selectedStations.map(s => {
            const { rate, dd } = stationRates[s.name] || { rate: '', dd: '' };
            return (
              <div key={s.name} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                {/* Station header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                    <span className="font-black text-sm text-gray-900 font-mono">{s.name}</span>
                    <span className="text-xs text-gray-400 font-medium">{s.count} bilties</span>
                  </div>
                  {s.avgRate != null && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Avg</span>
                      <span className="text-xs font-black text-rose-500">@{s.avgRate}</span>
                    </div>
                  )}
                </div>
                {/* Rate inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                      New Rate <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      value={rate}
                      onChange={e => setRate(s.name, e.target.value)}
                      placeholder={s.avgRate != null ? `avg ${s.avgRate}` : '1.50'}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">DD (optional)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={dd}
                      onChange={e => setDd(s.name, e.target.value)}
                      placeholder="blank = keep"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Results per station */}
      {results && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Results</p>
          {Object.entries(results).map(([name, { data, error }]) => (
            <div key={name} className={`rounded-xl px-4 py-3 border ${error ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {error
                  ? <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  : <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                }
                <span className="font-black text-sm font-mono">{name}</span>
                {error
                  ? <span className="text-xs text-red-600 ml-1">{error}</span>
                  : <span className="text-xs text-emerald-700 ml-1">
                      {data.updated_count} updated · rate {data.new_kaat_rate}
                      {data.pohonch_rows_synced > 0 ? ` · ${data.pohonch_rows_synced} pohonch synced` : ''}
                    </span>
                }
              </div>
              {!error && (data.skipped_count > 0 || data.not_found_count > 0) && (
                <div className="flex gap-2 mt-1">
                  {data.skipped_count > 0 && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg font-bold">
                      {data.skipped_count} skipped: {data.skipped_gr_nos?.join(', ')}
                    </span>
                  )}
                  {data.not_found_count > 0 && (
                    <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg font-bold">
                      {data.not_found_count} not found
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || selectedStations.length === 0 || !allRatesFilled}
        className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-sm font-black hover:from-teal-700 hover:to-emerald-700 transition-all shadow-lg shadow-teal-200/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
          : <><Zap className="h-4 w-4" /> Update {totalBilties} Bilties across {selectedStations.length} Station{selectedStations.length !== 1 ? 's' : ''}</>
        }
      </button>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Single GR Update
// ────────────────────────────────────────────────────────────────────────────────
function SingleGrTab({ initialBilty, bilties, token, onSuccess }) {
  const [activeBilty, setActiveBilty] = useState(initialBilty || null);
  const [grNo,      setGrNo]      = useState(initialBilty?.gr_no     || '');
  const [kaatRate,  setKaatRate]  = useState(initialBilty?.kaat_rate != null ? String(initialBilty.kaat_rate) : '');
  const [kaatDd,    setKaatDd]    = useState(initialBilty?.kaat_dd   != null ? String(initialBilty.kaat_dd)   : '');
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    setActiveBilty(initialBilty || null);
    setGrNo(initialBilty?.gr_no || '');
    setKaatRate(initialBilty?.kaat_rate != null ? String(initialBilty.kaat_rate) : '');
    setKaatDd(initialBilty?.kaat_dd   != null ? String(initialBilty.kaat_dd)   : '');
    setResult(null); setError(null);
  }, [initialBilty?.gr_no]);

  const handlePickGr = (b) => {
    setActiveBilty(b);
    setGrNo(b.gr_no);
    setKaatRate(b.kaat_rate != null ? String(b.kaat_rate) : '');
    setKaatDd(b.kaat_dd   != null ? String(b.kaat_dd)   : '');
    setResult(null); setError(null);
  };

  const previewKaat = kaatRate !== '' && activeBilty?.wt != null
    ? (parseFloat(activeBilty.wt) * parseFloat(kaatRate)).toFixed(2)
    : null;
  const previewPf = previewKaat != null
    ? Math.max(0, parseFloat(activeBilty.total || 0) - parseFloat(previewKaat)).toFixed(2)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!grNo.trim()) return;
    const body = {};
    if (kaatRate !== '') body.kaat_rate = parseFloat(kaatRate);
    if (kaatDd   !== '') body.kaat_dd   = parseFloat(kaatDd);
    if (!Object.keys(body).length) { setError('Provide at least one field to update.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/kaat/gr/${encodeURIComponent(grNo.trim())}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.status === 'error') throw new Error(data.message || 'API error');
      setResult(data);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* GR Picker */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
          GR Number <span className="text-rose-500">*</span>
        </label>
        {bilties?.length > 0 && (
          <GrPicker bilties={bilties} value={grNo} onChange={handlePickGr} />
        )}
        {bilties?.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] text-gray-400">or type manually</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
        )}
        <input
          type="text"
          value={grNo}
          onChange={e => { setGrNo(e.target.value); if (!e.target.value) setActiveBilty(null); }}
          placeholder="e.g. A09066, 22677"
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
          required
        />
      </div>

      {/* Bilty context card */}
      {activeBilty ? (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl px-4 py-3.5">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Selected Bilty</p>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-black text-indigo-800 font-mono leading-tight">{activeBilty.gr_no}</p>
              {activeBilty.consignor_name && (
                <p className="text-xs text-indigo-600 mt-0.5">
                  {activeBilty.consignor_name}
                  {activeBilty.to_city && <><span className="mx-1 text-indigo-400">→</span>{activeBilty.to_city}</>}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              {activeBilty.wt    != null && <p className="text-[11px] text-indigo-500 font-semibold">Wt: {activeBilty.wt} kg</p>}
              {activeBilty.total != null && <p className="text-[11px] text-indigo-700 font-bold">₹{activeBilty.total}</p>}
            </div>
          </div>
          {(activeBilty.kaat_rate != null || activeBilty.kaat != null) && (
            <div className="flex gap-4 mt-2.5 pt-2.5 border-t border-indigo-100">
              <div className="text-xs">
                <p className="text-indigo-400 font-semibold uppercase text-[10px]">Current Rate</p>
                <p className="font-black text-indigo-700">{activeBilty.kaat_rate ?? '—'}</p>
              </div>
              <div className="text-xs">
                <p className="text-rose-400 font-semibold uppercase text-[10px]">Current Kaat</p>
                <p className="font-black text-rose-600">{activeBilty.kaat != null ? `₹${activeBilty.kaat}` : '—'}</p>
              </div>
              <div className="text-xs">
                <p className="text-teal-400 font-semibold uppercase text-[10px]">Current PF</p>
                <p className="font-black text-teal-700">{activeBilty.kaat_pf != null ? `₹${activeBilty.kaat_pf}` : '—'}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl px-4 py-3 text-center">
          <p className="text-xs text-gray-400">Select a GR from the list above or click ✏️ on a bilty row</p>
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">New Kaat Rate</label>
          <input
            type="number" step="0.01" min="0"
            value={kaatRate}
            onChange={e => setKaatRate(e.target.value)}
            placeholder={activeBilty?.kaat_rate != null ? `Current: ${activeBilty.kaat_rate}` : '1.75'}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
          />
          <p className="text-[11px] text-gray-400">Recalculates kaat + pf</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Kaat DD</label>
          <input
            type="number" step="0.01" min="0"
            value={kaatDd}
            onChange={e => setKaatDd(e.target.value)}
            placeholder={activeBilty?.kaat_dd != null ? `Current: ${activeBilty.kaat_dd}` : '0.00'}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
          />
          <p className="text-[11px] text-gray-400">Independent of kaat/pf</p>
        </div>
      </div>

      {/* Live preview */}
      {previewKaat !== null && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Preview After Update</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-rose-100 px-3 py-2.5 text-center">
              <p className="text-[10px] text-rose-400 font-bold uppercase">New Kaat</p>
              <p className="text-base font-black text-rose-600 mt-0.5">₹{previewKaat}</p>
            </div>
            <div className="bg-white rounded-xl border border-teal-100 px-3 py-2.5 text-center">
              <p className="text-[10px] text-teal-400 font-bold uppercase">New PF</p>
              <p className="text-base font-black text-teal-700 mt-0.5">₹{previewPf}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Rate</p>
              <p className="text-base font-black text-gray-700 mt-0.5">{kaatRate}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-black text-emerald-800">
              GR <span className="font-mono">{result.gr_no}</span> updated successfully
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {result.updated?.kaat_rate != null && (
              <div className="bg-white rounded-xl border border-emerald-100 px-3 py-2.5">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Rate</p>
                <p className="text-base font-black text-gray-800">{result.updated.kaat_rate}</p>
              </div>
            )}
            {result.updated?.kaat != null && (
              <div className="bg-white rounded-xl border border-emerald-100 px-3 py-2.5">
                <p className="text-[10px] text-rose-400 font-bold uppercase">Kaat</p>
                <p className="text-base font-black text-rose-600">₹{result.updated.kaat}</p>
              </div>
            )}
            {result.updated?.pf != null && (
              <div className="bg-white rounded-xl border border-emerald-100 px-3 py-2.5">
                <p className="text-[10px] text-teal-400 font-bold uppercase">PF</p>
                <p className="text-base font-black text-teal-700">₹{result.updated.pf}</p>
              </div>
            )}
            {result.updated?.kaat_dd != null && (
              <div className="bg-white rounded-xl border border-emerald-100 px-3 py-2.5">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Kaat DD</p>
                <p className="text-base font-black text-gray-800">₹{result.updated.kaat_dd}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !grNo.trim()}
        className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-black hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
          : <><Edit3 className="h-4 w-4" /> Update GR {grNo || '—'}</>
        }
      </button>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Modal
// ────────────────────────────────────────────────────────────────────────────────
export default function KaatUpdateModal({
  isOpen,
  onClose,
  tab,
  onTabChange,
  transportGstin,
  fromDate,
  toDate,
  bilties,
  bilty,
  token,
  onSuccess,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[94vh] sm:h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl shadow-lg shadow-teal-200/50">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Update Kaat Rate</h2>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">{transportGstin || 'No transport selected'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5 px-6 pt-4 shrink-0">
          <button
            type="button"
            onClick={() => onTabChange('bulk')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'bulk'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-200/50'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Zap className="h-3.5 w-3.5" /> Bulk by GR List
          </button>
          <button
            type="button"
            onClick={() => onTabChange('single')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'single'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200/50'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" /> Single GR
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {tab === 'bulk' ? (
            <BulkUpdateTab
              transportGstin={transportGstin}
              bilties={bilties || []}
              token={token}
              onSuccess={onSuccess}
            />
          ) : (
            <SingleGrTab
              initialBilty={bilty}
              bilties={bilties || []}
              token={token}
              onSuccess={onSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
