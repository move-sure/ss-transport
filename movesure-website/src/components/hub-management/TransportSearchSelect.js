'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import supabase from '../../app/utils/supabase';
import { Truck, Search, Check, X, Loader2, Building2, Phone } from 'lucide-react';

/**
 * TransportSearchSelect
 *
 * Props:
 *   value       — currently selected transport object { id, transport_name, gst_number, ... } or null
 *   onChange    — (transport | null) => void
 *   placeholder — string  (optional)
 *   className   — extra wrapper class (optional)
 *   disabled    — bool (optional)
 */
export default function TransportSearchSelect({
  value,
  onChange,
  placeholder = 'Type transport name or GSTIN…',
  className = '',
  disabled = false,
}) {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [open,        setOpen]        = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);

  const wrapperRef  = useRef(null);
  const inputRef    = useRef(null);
  const debounceRef = useRef(null);

  // ── close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── fetch suggestions ──────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transports')
        .select('id, transport_name, gst_number, mob_number, city_name')
        .or(`transport_name.ilike.%${q.trim()}%,gst_number.ilike.%${q.trim()}%`)
        .order('transport_name')
        .limit(20);

      if (!error && data) {
        // deduplicate by gst_number (prefer exact GST)
        const seen = new Set();
        const unique = data.filter(t => {
          const key = t.gst_number
            ? t.gst_number.trim().toUpperCase()
            : `name:${t.transport_name?.trim().toUpperCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setSuggestions(unique);
        setOpen(unique.length > 0);
        setActiveIdx(-1);
      }
    } catch (_) {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  // ── debounce input ─────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange(null); // clear selection while typing
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 250);
  };

  // ── keyboard nav ───────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // ── select ─────────────────────────────────────────────────────────────────
  const handleSelect = (transport) => {
    onChange(transport);
    setQuery('');
    setOpen(false);
    setSuggestions([]);
    setActiveIdx(-1);
  };

  // ── clear ──────────────────────────────────────────────────────────────────
  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const isSelected = !!value;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* ── Input / Selected pill ──────────────────────────────────────────── */}
      {isSelected ? (
        /* Selected state */
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-teal-50 border-2 border-teal-400 rounded-xl">
          <div className="p-1 bg-teal-100 rounded-lg">
            <Truck className="h-4 w-4 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-teal-900 truncate">{value.transport_name}</p>
            <div className="flex flex-wrap gap-2 mt-0.5">
              {value.gst_number && (
                <span className="text-[11px] text-teal-700 font-mono font-semibold">{value.gst_number}</span>
              )}
              {value.city_name && (
                <span className="text-[11px] text-teal-600">• {value.city_name}</span>
              )}
              {value.mob_number && (
                <span className="text-[11px] text-teal-600">• {value.mob_number}</span>
              )}
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg hover:bg-teal-200 transition-colors text-teal-500 hover:text-teal-700 shrink-0"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        /* Search state */
        <div className={`flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 border-2 rounded-xl transition-colors ${
          open ? 'border-teal-400 ring-2 ring-teal-500/20' : 'border-gray-200'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
          {loading
            ? <Loader2 className="h-4 w-4 text-teal-500 animate-spin shrink-0" />
            : <Search className="h-4 w-4 text-gray-400 shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400 min-w-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); onChange(null); }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ── Dropdown ───────────────────────────────────────────────────────── */}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              {suggestions.length} result{suggestions.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] text-gray-400">↑↓ navigate · Enter select · Esc close</span>
          </div>

          {suggestions.map((t, idx) => (
            <button
              key={t.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(t); }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 transition-colors flex items-start gap-2.5 ${
                idx === activeIdx ? 'bg-teal-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${idx === activeIdx ? 'bg-teal-100' : 'bg-gray-100'}`}>
                <Truck className={`h-3.5 w-3.5 ${idx === activeIdx ? 'text-teal-600' : 'text-gray-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900 truncate">{t.transport_name}</span>
                  {idx === activeIdx && <Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />}
                </div>
                <div className="flex flex-wrap gap-3 mt-0.5">
                  {t.gst_number && (
                    <span className="text-[11px] text-indigo-600 font-mono font-semibold">{t.gst_number}</span>
                  )}
                  {t.city_name && (
                    <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                      <Building2 className="h-3 w-3" />{t.city_name}
                    </span>
                  )}
                  {t.mob_number && (
                    <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                      <Phone className="h-3 w-3" />{t.mob_number}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results hint */}
      {open && !loading && suggestions.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-4 text-center">
          <p className="text-sm text-gray-500">No transports found for <span className="font-semibold text-gray-700">&quot;{query}&quot;</span></p>
          <p className="text-xs text-gray-400 mt-1">Try a different name or GSTIN</p>
        </div>
      )}
    </div>
  );
}
