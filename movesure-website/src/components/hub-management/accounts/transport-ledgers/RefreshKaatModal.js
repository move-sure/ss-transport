'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { transportLedgersApi } from '../api';
import { formatINR } from '../helpers';

// Refresh: re-check every bilty in the ledger against the bilty + its kaat record
// (preview, then apply). Also rewrites old short narrations.
export default function RefreshKaatModal({ ledger, userId, onClose, onDone }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  // -> { updated, unassigned, review, unchanged, message }
  const normalize = (res) => {
    const d = res.data || res;
    return {
      updated: d.updated || d.changes || [],
      unassigned: d.unassigned || [],
      review: d.needs_review || [],
      unchanged: d.unchanged ?? null,
      message: res.status === 'skipped' ? res.message : d.message
    };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await transportLedgersApi.refresh(ledger.id, { dry_run: true });
        if (!cancelled) setPreview(normalize(res));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Preview failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ledger.id]);

  const apply = async () => {
    setApplying(true);
    setError(null);
    try {
      const res = await transportLedgersApi.refresh(ledger.id, { dry_run: false, updated_by: userId });
      setDone(normalize(res));
      onDone?.();
    } catch (err) {
      setError(err.message || 'Refresh failed');
    } finally {
      setApplying(false);
    }
  };

  const p = done || preview;
  const nothing = p && !p.updated.length && !p.unassigned.length && !p.review.length;
  const netChange = (p?.updated || []).reduce((t, c) => t + ((Number(c.new_pf) || 0) - (Number(c.old_pf) || 0)), 0);
  const delta = (a, b) => (a == null || Number(a) === Number(b) ? formatINR(b) : <>{formatINR(a)} → <b>{formatINR(b)}</b></>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-black flex items-center gap-2"><RefreshCw className="w-5 h-5 text-emerald-600" /> Refresh — {ledger.name}</h3>
            <p className="text-xs text-gray-500">Re-checks every bilty against the bilty and its kaat record, and rewrites the statement narration.</p>
          </div>
          <button onClick={onClose} disabled={applying} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 text-sm text-black space-y-4">
          {loading && <div className="py-10 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></div>}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4" /> Applied: {done.updated.length} updated, {done.unassigned.length} unassigned, {done.review.length} need review
            </div>
          )}
          {p?.message && <p className="text-gray-600">{p.message}</p>}
          {p && nothing && !p.message && (
            <p className="text-emerald-700 font-semibold">Everything matches the bilties and kaat records{p.unchanged != null ? ` (${p.unchanged} bilties)` : ''}.</p>
          )}

          {p && !nothing && (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-blue-50 rounded-lg p-2"><div className="text-xl font-bold text-blue-800">{p.updated.length}</div><div className="text-[11px] text-blue-800">{done ? 'updated' : 'to update'}</div></div>
              <div className="bg-amber-50 rounded-lg p-2"><div className="text-xl font-bold text-amber-800">{p.unassigned.length}</div><div className="text-[11px] text-amber-800">{done ? 'unassigned' : 'to unassign'}</div></div>
              <div className="bg-red-50 rounded-lg p-2"><div className="text-xl font-bold text-red-700">{p.review.length}</div><div className="text-[11px] text-red-700">need review</div></div>
              <div className="bg-gray-50 rounded-lg p-2"><div className="text-xl font-bold text-gray-700">{p.unchanged ?? '-'}</div><div className="text-[11px] text-gray-600">unchanged</div></div>
            </div>
          )}

          {p?.updated.length > 0 && (
            <section>
              <h4 className="font-semibold mb-1">
                Updated · net pf change <span className={netChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}>₹{formatINR(Math.abs(netChange))} {netChange >= 0 ? 'Dr' : 'Cr'}</span>
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 uppercase sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">GR</th>
                      <th className="text-right px-3 py-2">Total</th>
                      <th className="text-right px-3 py-2">Kaat</th>
                      <th className="text-right px-3 py-2">pf</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {p.updated.map((c, i) => (
                      <tr key={i} title={c.narration || ''}>
                        <td className="px-3 py-1.5 font-semibold">{c.gr_no}</td>
                        <td className="px-3 py-1.5 text-right">{c.new_total != null ? delta(c.old_total, c.new_total) : ''}</td>
                        <td className="px-3 py-1.5 text-right">{delta(c.old_kaat, c.new_kaat)}</td>
                        <td className="px-3 py-1.5 text-right">{delta(c.old_pf, c.new_pf)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {p?.unassigned.length > 0 && (
            <section>
              <h4 className="font-semibold mb-1 text-amber-800">Unassigned (station changed / bilty deleted) — they return to Unassigned Bilties</h4>
              <ul className="text-xs text-amber-900 list-disc pl-5">{p.unassigned.map((s, i) => <li key={i}><b>{s.gr_no}</b>: {s.reason}</li>)}</ul>
            </section>
          )}

          {p?.review.length > 0 && (
            <section>
              <h4 className="font-semibold mb-1 text-red-700">Need review (a payment is applied past the new amount — nothing changed)</h4>
              <ul className="text-xs text-red-800 list-disc pl-5">{p.review.map((s, i) => <li key={i}><b>{s.gr_no}</b>: {s.reason || s.message || ''}</li>)}</ul>
            </section>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button onClick={onClose} disabled={applying} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">{done ? 'Close' : 'Cancel'}</button>
          {!done && (
            <button onClick={apply} disabled={applying || loading || !preview || nothing}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
              {applying && <Loader2 className="w-4 h-4 animate-spin" />} Apply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
