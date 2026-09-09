'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, Truck, Phone, AlertCircle } from 'lucide-react';

const API_URL = 'https://api.movesure.io';

export default function StationsSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '100' });
        if (query.trim()) params.set('search', query.trim());
        const res = await fetch(`${API_URL}/api/directory/lookup?${params}`);
        const json = await res.json();
        if (!res.ok || json.status === 'error') {
          throw new Error(json.message || 'Could not load stations right now.');
        }
        setResults(json.data?.results || []);
      } catch (err) {
        setError(err.message || 'Could not load stations right now. Please try again shortly.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div>
      <div className="relative max-w-xl mx-auto mb-8">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by city code, city, transport, or phone number…"
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700 shadow-sm"
        />
        {loading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
      </div>

      {error && (
        <div className="max-w-xl mx-auto mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!error && !loading && results.length === 0 && (
        <p className="text-center text-slate-500 text-sm">No stations found for that search.</p>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Mobile: stacked cards, one field per line, nothing scrolls sideways */}
          <ul className="sm:hidden divide-y divide-slate-100">
            {results.map((r) => (
              <li key={`${r.type}-${r.id}`} className="p-4 space-y-1.5">
                {r.type === 'city' ? (
                  <>
                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      {r.city_name}
                      {r.city_code && <span className="text-amber-700 font-semibold">({r.city_code})</span>}
                    </p>
                    <p className="text-xs text-slate-500 pl-5">{r.state_name || 'City'}</p>
                  </>
                ) : (
                  <>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <Truck className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                      <span className="truncate">{r.transport_name}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      {r.city_name || '-'}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs">
                      <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      {r.mob_number ? (
                        <a href={`tel:${r.mob_number}`} className="text-amber-800 font-medium">{r.mob_number}</a>
                      ) : (
                        <span className="text-slate-400">Not available</span>
                      )}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>

          {/* Desktop / tablet: table */}
          <table className="hidden sm:table w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">City</th>
                <th className="text-left px-5 py-3 font-semibold">Transport</th>
                <th className="text-left px-5 py-3 font-semibold">Mobile Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r) => (
                <tr key={`${r.type}-${r.id}`} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      {r.city_name || '-'}
                      {r.type === 'city' && r.city_code && <span className="text-amber-700 font-semibold">({r.city_code})</span>}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {r.type === 'transport' ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                        <Truck className="w-3.5 h-3.5 text-amber-800" /> {r.transport_name}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {r.type === 'transport' && r.mob_number ? (
                      <a href={`tel:${r.mob_number}`} className="inline-flex items-center gap-1.5 hover:text-amber-700">
                        <Phone className="w-3.5 h-3.5 text-amber-600" /> {r.mob_number}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
