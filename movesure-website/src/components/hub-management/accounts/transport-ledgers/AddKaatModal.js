'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, Calculator } from 'lucide-react';
import { transportLedgersApi } from '../api';
import { formatINR } from '../helpers';
import TransportPicker from './TransportPicker';
import { inputCls } from './shared';

/**
 * Add kaat for bilties that have none (all from one station): rate x weight (per_kg) or
 * x packages (per_pkg). Saved to bilty_wise_kaat; optionally as the transport's station rate,
 * and optionally assigned straight into the transport's ledger.
 */
export default function AddKaatModal({ rows = [], userId, onClose, onDone }) {
  const first = rows[0] || {};
  const [transport, setTransport] = useState(null);
  const [mode, setMode] = useState('per_kg');
  const [rate, setRate] = useState('');
  const [dd, setDd] = useState('');
  const [saveRate, setSaveRate] = useState(true);
  const [assign, setAssign] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // pre-select the suggested transport when every bilty suggests the same one
    const ids = [...new Set(rows.map((r) => r.suggested?.transport_id).filter(Boolean))];
    if (ids.length === 1) {
      const s = rows.find((r) => r.suggested?.transport_id === ids[0]).suggested;
      setTransport({ transport_id: s.transport_id, transport_name: s.transport_name, gstins: s.gstin ? [s.gstin] : [] });
    }
  }, [rows]);

  const r = Number(rate) || 0;
  const ddNum = dd === '' ? null : Number(dd) || 0;
  const preview = rows.map((b) => {
    const base = mode === 'per_kg' ? Number(b.weight) || 0 : Number(b.packages) || 0;
    const kaat = Math.round(r * base * 100) / 100;
    const ddVal = ddNum ?? (Number(b.estimate?.dd) || 0);
    const toPay = b.payment_mode === 'to-pay';
    const pf = toPay ? (Number(b.total) || 0) - kaat - ddVal : -kaat;
    return { ...b, base, kaat, pf };
  });
  const net = preview.reduce((t, b) => t + b.pf, 0);

  const save = async () => {
    if (!transport) { setError('Pick the transport at this station'); return; }
    if (!r) { setError('Enter the rate'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await transportLedgersApi.addKaat({
        gr_nos: rows.map((b) => b.gr_no),
        transport_id: transport.transport_id,
        pricing_mode: mode,
        rate: r,
        dd: ddNum,
        save_station_rate: saveRate,
        assign,
        updated_by: userId
      });
      setResult(res.data || res);
      onDone?.();
    } catch (err) {
      setError(err.message || 'Failed to set kaat');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-black flex items-center gap-2"><Calculator className="w-5 h-5 text-emerald-600" /> Add kaat rate</h3>
            <p className="text-xs text-gray-500">{rows.length} bilt{rows.length === 1 ? 'y' : 'ies'} to <b>{first.station || 'station'}</b></p>
          </div>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4 text-sm text-black">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {result ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-4 h-4" /> Kaat set on {(result.kaat_set || []).length} bilties
                {result.assign && ` · ${(result.assign.assigned || []).length} assigned`}
              </div>
              {(result.station_rates || []).map((s, i) => (
                <div key={i} className="text-xs text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                  Station rate {s.station}: {s.status}{s.message ? ` — ${s.message}` : ''}
                </div>
              ))}
              {[...(result.skipped || []), ...(result.assign?.skipped || [])].length > 0 && (
                <ul className="text-xs text-amber-900 list-disc pl-5">
                  {[...(result.skipped || []), ...(result.assign?.skipped || [])].map((s, i) => <li key={i}><b>{s.gr_no}</b>: {s.reason}</li>)}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Transport at {first.station || 'this station'}</label>
                <TransportPicker value={transport} onChange={setTransport} stationCityId={first.station_city_id} placeholder="Pick transport…" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Pricing</label>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button type="button" onClick={() => setMode('per_kg')} className={`flex-1 py-2 text-sm font-semibold ${mode === 'per_kg' ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>Per kg</button>
                    <button type="button" onClick={() => setMode('per_pkg')} className={`flex-1 py-2 text-sm font-semibold ${mode === 'per_pkg' ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>Per pkg</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Rate (₹ / {mode === 'per_kg' ? 'kg' : 'pkg'})</label>
                  <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">DD (optional, each)</label>
                  <input type="number" step="0.01" min="0" value={dd} onChange={(e) => setDd(e.target.value)} className={inputCls} placeholder="keep current" />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2"><input type="checkbox" className="accent-emerald-600" checked={saveRate} onChange={(e) => setSaveRate(e.target.checked)} /> Save as this transport&apos;s station rate</label>
                <label className="flex items-center gap-2"><input type="checkbox" className="accent-emerald-600" checked={assign} onChange={(e) => setAssign(e.target.checked)} /> Assign to the transport&apos;s ledger</label>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 uppercase sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">GR</th>
                      <th className="text-left px-3 py-2">Mode</th>
                      <th className="text-right px-3 py-2">Total</th>
                      <th className="text-right px-3 py-2">{mode === 'per_kg' ? 'Weight' : 'Pkgs'}</th>
                      <th className="text-right px-3 py-2">Kaat</th>
                      <th className="text-right px-3 py-2">pf</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.map((b) => (
                      <tr key={b.gr_no}>
                        <td className="px-3 py-1.5 font-semibold">{b.gr_no}</td>
                        <td className="px-3 py-1.5 uppercase">{b.payment_mode}</td>
                        <td className="px-3 py-1.5 text-right">{formatINR(b.total)}</td>
                        <td className="px-3 py-1.5 text-right">{b.base}</td>
                        <td className="px-3 py-1.5 text-right">{formatINR(b.kaat)}</td>
                        <td className={`px-3 py-1.5 text-right font-semibold ${b.pf >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatINR(Math.abs(b.pf))} {b.pf >= 0 ? 'Dr' : 'Cr'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">Estimate. The server works out the final kaat (and the minimum charge if a station rate applies). Net: <b>₹{formatINR(Math.abs(net))} {net >= 0 ? 'Dr' : 'Cr'}</b></p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">{result ? 'Close' : 'Cancel'}</button>
          {!result && (
            <button onClick={save} disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save kaat{assign ? ' & assign' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
