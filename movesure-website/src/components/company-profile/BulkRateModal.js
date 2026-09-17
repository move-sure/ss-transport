'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Zap, Search, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = 'https://api.movesure.io';

// Works for both consignor and consignee — partyType picks the path/field names.
const BulkRateModal = ({ partyType, partyId, partyName, userId, onClose, onApplied }) => {
  const idField = partyType === 'consignor' ? 'consignor_id' : 'consignee_id';
  const label = partyType === 'consignor' ? 'Consignor' : 'Consignee';

  const [loadingStations, setLoadingStations] = useState(true);
  const [stations, setStations] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const [rate, setRate] = useState('');
  const [rateUnit, setRateUnit] = useState('PER_NAG');
  const [paymentMode, setPaymentMode] = useState('to-pay');
  const [excluded, setExcluded] = useState([]);
  const [citySearch, setCitySearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advanced, setAdvanced] = useState({
    labour_rate: '', bilty_charge: '', local_charge_per_nag: '', toll_tax_amount: '', is_no_charge: false,
  });

  useEffect(() => {
    let cancelled = false;
    setLoadingStations(true);
    fetch(`${API_URL}/api/bilty/rates/${partyType}/${partyId}/stations`)
      .then(r => r.json())
      .then(res => {
        if (cancelled) return;
        if (res.status !== 'success') throw new Error(res.message || 'Failed to load stations');
        setStations(res.data.stations || []);
      })
      .catch(e => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoadingStations(false));
    return () => { cancelled = true; };
  }, [partyType, partyId]);

  const totalStations = stations.length;
  const stationsWithProfile = stations.filter(s => s.has_profile).length;

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return [];
    const q = citySearch.toLowerCase();
    return stations
      .filter(s => s.city_name.toLowerCase().includes(q) && !excluded.some(e => e.city_id === s.city_id))
      .slice(0, 8);
  }, [citySearch, stations, excluded]);

  const addExcluded = (s) => {
    setExcluded(prev => [...prev, { city_id: s.city_id, city_name: s.city_name }]);
    setCitySearch('');
  };
  const removeExcluded = (cityId) => setExcluded(prev => prev.filter(e => e.city_id !== cityId));

  const handleSubmit = async () => {
    setError('');
    const rateNum = parseFloat(rate);
    if (rate === '' || isNaN(rateNum) || rateNum < 0) {
      setError('Enter a valid rate (0 or greater)');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        [idField]: partyId,
        rate: rateNum,
        rate_unit: rateUnit,
        default_payment_mode: paymentMode,
        exclude_city_ids: excluded.map(e => e.city_id),
        ...(userId ? { created_by: userId } : {}),
      };
      if (advanced.labour_rate !== '') {
        body.labour_rate = parseFloat(advanced.labour_rate) || 0;
        body.labour_unit = 'PER_NAG';
      }
      if (advanced.bilty_charge !== '') body.bilty_charge = parseFloat(advanced.bilty_charge) || 0;
      if (advanced.local_charge_per_nag !== '') body.local_charge_per_nag = parseFloat(advanced.local_charge_per_nag) || 0;
      if (advanced.toll_tax_amount !== '') {
        body.toll_tax_amount = parseFloat(advanced.toll_tax_amount) || 0;
        body.is_toll_tax_applicable = body.toll_tax_amount > 0;
      }
      if (advanced.is_no_charge) body.is_no_charge = true;

      const res = await fetch(`${API_URL}/api/bilty/rates/${partyType}/bulk-set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.status !== 'success') throw new Error(json.message || 'Bulk update failed');
      setResult(json.data);
      onApplied?.();
    } catch (e) {
      setError(e.message || 'Bulk update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Bulk Set Rate
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-600">
            {label}: <span className="font-semibold text-gray-900">{partyName}</span>
          </div>

          {loadingStations ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading stations...
            </div>
          ) : result ? (
            <div className="rounded-lg border border-green-300 bg-green-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 font-semibold">
                <CheckCircle2 className="w-5 h-5" /> Applied successfully
              </div>
              <div className="text-sm text-green-800 space-y-0.5">
                <p>₹{result.rate}/{result.rate_unit === 'PER_KG' ? 'kg' : 'nag'} applied to <b>{result.applied_cities}</b> of {result.total_cities} stations</p>
                <p>{result.updated_count} rates updated · {result.inserted_count} new rates created</p>
                {result.excluded_cities?.length > 0 && <p>Excluded: {result.excluded_cities.join(', ')}</p>}
              </div>
              <button
                onClick={onClose}
                className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                {totalStations} stations total · {stationsWithProfile} already have a rate profile for this {label.toLowerCase()}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number" step="0.01" autoFocus
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={rateUnit}
                    onChange={(e) => setRateUnit(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="PER_NAG">Per Nag</option>
                    <option value="PER_KG">Per KG</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Payment</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="to-pay">To-Pay</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Exclude stations (optional)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="Search city to exclude, e.g. Kanpur..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {filteredCities.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredCities.map(s => (
                        <button
                          key={s.city_id}
                          type="button"
                          onClick={() => addExcluded(s)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
                        >
                          {s.city_name} <span className="text-gray-400">({s.city_code})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {excluded.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {excluded.map(e => (
                      <span key={e.city_id} className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-xs">
                        {e.city_name}
                        <button type="button" onClick={() => removeExcluded(e.city_id)} className="hover:text-red-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showAdvanced ? 'Hide' : 'More'} charges (labour, bilty, toll, local)
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-lg p-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Labour /Nag</label>
                    <input type="number" step="0.01" value={advanced.labour_rate}
                      onChange={(e) => setAdvanced(a => ({ ...a, labour_rate: e.target.value }))}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bilty Chrg</label>
                    <input type="number" step="0.01" value={advanced.bilty_charge}
                      onChange={(e) => setAdvanced(a => ({ ...a, bilty_charge: e.target.value }))}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Local /Nag</label>
                    <input type="number" step="0.01" value={advanced.local_charge_per_nag}
                      onChange={(e) => setAdvanced(a => ({ ...a, local_charge_per_nag: e.target.value }))}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Toll Tax</label>
                    <input type="number" step="0.01" value={advanced.toll_tax_amount}
                      onChange={(e) => setAdvanced(a => ({ ...a, toll_tax_amount: e.target.value }))}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white" placeholder="0" />
                  </div>
                  <div className="col-span-2 sm:col-span-4 flex items-center gap-2">
                    <input type="checkbox" id="bulk-no-charge" checked={advanced.is_no_charge}
                      onChange={(e) => setAdvanced(a => ({ ...a, is_no_charge: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                    <label htmlFor="bulk-no-charge" className="text-sm text-gray-700">No Charge (zero out bilty/toll/other charges everywhere)</label>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Apply to {Math.max(totalStations - excluded.length, 0)} stations
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkRateModal;
