'use client';

import { useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import SummaryCards from './SummaryCards';
import TrendChart from './TrendChart';
import CityChart from './CityChart';
import CityDeltaCards from './CityDeltaCards';
import CounterpartyTable from './CounterpartyTable';
import PaymentDonut from './PaymentDonut';

const API_URL = 'https://api.movesure.io';

export default function ConsignorAnalytics() {
  const [query, setQuery]   = useState('');
  const [type, setType]     = useState('consignor');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(
        `${API_URL}/api/analytics/party?query=${encodeURIComponent(q)}&type=${type}`
      );
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
      } else {
        setError(json.message || 'Not found');
      }
    } catch (e) {
      setError('Failed to connect to the analytics API. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleClear = () => {
    setQuery('');
    setData(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Search Party
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter GSTIN (15 chars) or company name..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="consignor">Consignor</option>
            <option value="consignee">Consignee</option>
          </select>

          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? 'Analysing...' : 'Analyse'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-5">
          {/* Entity header */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-wrap justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{data.entity.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-sm text-gray-500">{data.entity.gstin || 'No GSTIN'}</span>
                <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full uppercase">
                  {data.party_type}
                </span>
                <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  matched by {data.entity.matched_by}
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-gray-400 space-y-0.5">
              <div>This month: {data.windows.this_month?.from} → {data.windows.this_month?.to}</div>
              <div>Last month: {data.windows.last_month?.from} → {data.windows.last_month?.to}</div>
              <div className="font-semibold text-gray-600">{data.total_rows_fetched} bilties loaded</div>
            </div>
          </div>

          {/* KPI cards */}
          <SummaryCards data={data} />

          {/* Trend + Payment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <TrendChart data={data} />
            </div>
            <PaymentDonut data={data} />
          </div>

          {/* City bar chart */}
          <CityChart data={data} />

          {/* City delta */}
          <CityDeltaCards data={data} />

          {/* Counterparty table */}
          <CounterpartyTable data={data} />
        </div>
      )}
    </div>
  );
}
