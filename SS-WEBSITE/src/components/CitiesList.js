'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, AlertCircle } from 'lucide-react';

const API_URL = 'https://api.movesure.io';

export default function CitiesList() {
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '200' });
        if (query.trim()) params.set('search', query.trim());
        const res = await fetch(`${API_URL}/api/directory/lookup?${params}`);
        const json = await res.json();
        if (!res.ok || json.status === 'error') {
          throw new Error(json.message || 'Could not load cities right now.');
        }
        setCities(json.data?.cities || []);
      } catch (err) {
        setError(err.message || 'Could not load cities right now.');
        setCities([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div>
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a city…"
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700"
        />
        {loading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!error && !loading && cities.length === 0 && (
        <p className="text-slate-500 text-sm">No cities found for that search.</p>
      )}

      {cities.length > 0 && (
        <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto">
          {cities.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-sm font-semibold px-3 py-1.5 rounded-full border border-amber-100"
            >
              <MapPin className="w-3.5 h-3.5" /> {c.city_name}
              {c.city_code && <span className="text-amber-600 font-normal">({c.city_code})</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
