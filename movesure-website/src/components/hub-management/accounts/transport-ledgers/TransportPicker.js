'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Loader2, Star, BookOpen, RotateCcw, MapPin, AlertTriangle } from 'lucide-react';
import { transportLedgersApi } from '../api';

/**
 * Transport chooser - one row per transport COMPANY (grouped by PAN), from
 * GET /transport-ledgers/transport-options. Pass the bilty's `stationCityId` so only
 * transports at that station are listed; `allStations` lifts that (admin / settings use).
 * value = chosen option { transport_id, transport_ids, transport_name, gstins, station_count, ledger_id, … } or null.
 * The list opens in a fixed popover so it isn't clipped by scrolling tables.
 */
export default function TransportPicker({ label, value, onChange, onReset, stationCityId, allStations = false, disabled, placeholder = 'Pick transport' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 340 });
  const btnRef = useRef(null);
  const boxRef = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    if (!open) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await transportLedgersApi.transportOptions({
          station_city_id: allStations ? undefined : stationCityId,
          all_stations: allStations || !stationCityId ? true : undefined,
          q: q.trim() || undefined
        });
        setOptions(res.data || []);
      } catch { setOptions([]); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(debounce.current);
  }, [q, open, stationCityId, allStations]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (boxRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = Math.max(340, r.width);
    const left = Math.min(r.left, window.innerWidth - width - 8);
    const below = window.innerHeight - r.bottom > 330;
    setPos({ top: below ? r.bottom + 4 : Math.max(8, r.top - 334), left, width });
    setQ('');
    setOpen((o) => !o);
  };

  const shown = value?.transport_name || label;
  const keyOf = (o) => o.group_key || o.transport_id || o.id;

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle} disabled={disabled}
        className={`w-full flex items-center justify-between gap-1 px-2 py-1 rounded-md border text-left text-xs ${
          disabled ? 'bg-gray-50 border-gray-100 text-gray-500 cursor-default' : value ? 'border-gray-900 bg-white' : 'border-gray-200 bg-white hover:border-emerald-400'
        }`}>
        <span className={`truncate ${shown ? 'font-semibold text-black' : 'text-gray-400'}`}>{shown || placeholder}</span>
        {!disabled && <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div ref={boxRef} style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="fixed z-[60] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transport"
              className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm text-black" />
            {!allStations && stationCityId && (
              <p className="text-[10px] text-gray-500 mt-1 px-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Only transports at this bilty&apos;s station</p>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {value && onReset && (
              <button type="button" onClick={() => { onReset(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 border-b border-gray-50">
                <RotateCcw className="w-3.5 h-3.5" /> Back to suggested
              </button>
            )}
            {loading && <div className="px-3 py-3 text-xs text-gray-500"><Loader2 className="w-4 h-4 inline animate-spin" /> Searching…</div>}
            {!loading && options.length === 0 && <div className="px-3 py-3 text-xs text-gray-500">No transports registered at this station</div>}
            {!loading && options.map((o) => {
              const selected = value && keyOf(value) === keyOf(o);
              return (
                <button key={keyOf(o)} type="button" onClick={() => { onChange(o); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-gray-50 ${selected ? 'bg-emerald-50' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-black truncate">{o.transport_name}</span>
                    {o.is_prior && <Star className="w-3 h-3 text-amber-500 fill-amber-400 flex-shrink-0" title="Priority transport" />}
                    {o.ledger_id && <BookOpen className="w-3 h-3 text-emerald-600 flex-shrink-0" title={`Ledger: ${o.ledger_name || ''}`} />}
                    {o.at_station && <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1">at station</span>}
                    {o.has_gst === false && <span className="text-[9px] font-semibold text-gray-600 bg-gray-100 rounded px-1">no GST</span>}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {o.station_count ? `${o.station_count} station${o.station_count > 1 ? 's' : ''}` : (o.city_name || '')}
                    {o.gstins?.length ? ` · ${o.gstins.join(', ')}` : (o.gst_number ? ` · ${o.gst_number}` : '')}
                    {o.other_names?.length ? ` · also "${o.other_names[0]}"` : ''}
                  </div>
                  {o.looks_like && (
                    <div className="text-[10px] text-amber-800 mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Looks like {typeof o.looks_like === 'string' ? o.looks_like : o.looks_like.ledger_name || o.looks_like.transport_name} — add to that ledger
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
