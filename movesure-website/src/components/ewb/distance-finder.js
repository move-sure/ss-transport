'use client';

import React, { useState, useCallback } from 'react';
import { MapPin, Navigation, Loader2, AlertTriangle, CheckCircle, Search } from 'lucide-react';

const DISTANCE_API = 'http://xok5owjast5f4mxl1hu7ztq5.46.202.162.119.sslip.io/api/distance';

export default function DistanceFinder({ onDistanceFound }) {
  const [fromPincode, setFromPincode] = useState('');
  const [toPincode, setToPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);   // { distance: number } or null
  const [error, setError] = useState('');

  const isValidPincode = (pin) => /^\d{6}$/.test(pin);

  const handleFindDistance = useCallback(async () => {
    setError('');
    setResult(null);

    if (!isValidPincode(fromPincode)) {
      setError('Enter a valid 6-digit From Pincode');
      return;
    }
    if (!isValidPincode(toPincode)) {
      setError('Enter a valid 6-digit To Pincode');
      return;
    }

    setLoading(true);
    try {
      const url = `${DISTANCE_API}?fromPincode=${fromPincode}&toPincode=${toPincode}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data?.results?.distance) {
        const msg = data?.results?.message || data?.message || 'Failed to fetch distance';
        setError(msg);
        return;
      }

      const distanceKm = Math.round(data.results.distance);
      setResult({ distance: distanceKm });

      // Pass distance back to parent if callback provided
      if (onDistanceFound) {
        onDistanceFound(distanceKm);
      }
    } catch (err) {
      console.error('Distance API error:', err);
      setError('Network error – please check your connection');
    } finally {
      setLoading(false);
    }
  }, [fromPincode, toPincode, onDistanceFound]);

  const handleReset = () => {
    setFromPincode('');
    setToPincode('');
    setResult(null);
    setError('');
  };

  return (
    <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center">
          <Navigation className="w-4 h-4 text-white" />
        </div>
        <h4 className="text-sm font-bold text-sky-800">Distance Finder</h4>
        <span className="text-xs text-sky-500 ml-auto">Pincode → Distance (km)</span>
      </div>

      {/* Input Row */}
      <div className="flex flex-col sm:flex-row items-end gap-3">
        {/* From Pincode */}
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <MapPin className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-sky-500" />
            From Pincode
          </label>
          <input
            type="text"
            maxLength={6}
            value={fromPincode}
            onChange={(e) => {
              setFromPincode(e.target.value.replace(/\D/g, ''));
              setResult(null);
              setError('');
            }}
            placeholder="e.g. 248001"
            className="w-full px-3 py-2 border border-sky-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white"
          />
        </div>

        {/* Arrow icon */}
        <div className="hidden sm:flex items-center pb-2 text-sky-400">
          <span className="text-lg">→</span>
        </div>

        {/* To Pincode */}
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <MapPin className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-sky-500" />
            To Pincode
          </label>
          <input
            type="text"
            maxLength={6}
            value={toPincode}
            onChange={(e) => {
              setToPincode(e.target.value.replace(/\D/g, ''));
              setResult(null);
              setError('');
            }}
            placeholder="e.g. 110001"
            className="w-full px-3 py-2 border border-sky-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white"
          />
        </div>

        {/* Find Button */}
        <button
          onClick={handleFindDistance}
          disabled={loading || !fromPincode || !toPincode}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Finding…
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Find Distance
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="flex items-center justify-between bg-white border border-sky-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-700">
              Distance from <span className="font-mono font-bold text-sky-700">{fromPincode}</span>
              {' → '}
              <span className="font-mono font-bold text-sky-700">{toPincode}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-extrabold text-sky-700">{result.distance} km</span>
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
