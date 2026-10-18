'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Wand2, CheckCircle2 } from 'lucide-react';
import { transportLedgersApi } from '../api';
import { formatINR } from '../helpers';
import { SOURCE_TAG } from './shared';

// Auto-assign a challan: preview (dry run) what goes where, then apply.
export default function AutoAssignModal({ challanNo, userId, onClose, onDone }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!challanNo) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await transportLedgersApi.autoAssign(challanNo, { dry_run: true });
        if (!cancelled) setPreview(res.data || res);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Preview failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [challanNo]);

  if (!challanNo) return null;

  const will = preview?.will_assign || [];
  const left = preview?.left_unassigned || [];

  // group the preview by transport
  const groups = will.reduce((m, b) => {
    const k = b.transport_name || 'Unknown';
    m[k] = m[k] || { count: 0, pf: 0 };
    m[k].count += 1;
    m[k].pf += Number(b.pf) || 0;
    return m;
  }, {});

  const apply = async () => {
    setApplying(true);
    setError(null);
    try {
      const res = await transportLedgersApi.autoAssign(challanNo, { dry_run: false, updated_by: userId });
      const d = res.data || res;
      setDone({ assigned: (d.assigned || d.will_assign || []).length, skipped: d.skipped || d.left_unassigned || [] });
      onDone?.();
    } catch (err) {
      setError(err.message || 'Auto-assign failed');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-black flex items-center gap-2"><Wand2 className="w-5 h-5 text-emerald-600" /> Auto-assign challan {challanNo}</h3>
          <button onClick={onClose} disabled={applying} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4 text-sm text-black">
          {loading && <div className="py-10 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></div>}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {done && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-800"><CheckCircle2 className="w-4 h-4" /> {done.assigned} bilties assigned</div>
              {done.skipped.length > 0 && (
                <ul className="mt-1 text-xs text-amber-900 list-disc pl-5 max-h-32 overflow-auto">
                  {done.skipped.map((s, i) => <li key={i}><b>{s.gr_no}</b>: {s.reason}</li>)}
                </ul>
              )}
            </div>
          )}

          {preview && !done && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-xs font-semibold text-emerald-800 uppercase">Will assign</div>
                  <div className="text-2xl font-bold text-emerald-800">{will.length}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="text-xs font-semibold text-amber-800 uppercase">Left unassigned</div>
                  <div className="text-2xl font-bold text-amber-800">{left.length}</div>
                </div>
              </div>

              {Object.keys(groups).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1">By transport</h4>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {Object.entries(groups).sort((a, b) => b[1].count - a[1].count).map(([name, g]) => (
                      <div key={name} className="flex items-center justify-between px-3 py-2">
                        <span className="font-medium">{name}</span>
                        <span className="text-xs text-gray-600">{g.count} bilties · <b className={g.pf >= 0 ? 'text-emerald-700' : 'text-rose-700'}>₹{formatINR(Math.abs(g.pf))} {g.pf >= 0 ? 'Dr' : 'Cr'}</b></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {will.length > 0 && (
                <details>
                  <summary className="cursor-pointer font-semibold">Bilty list ({will.length})</summary>
                  <div className="mt-1 border border-gray-200 rounded-lg max-h-56 overflow-auto">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-50">
                        {will.map((b, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 font-semibold">{b.gr_no}</td>
                            <td className="px-3 py-1.5">{b.transport_name}</td>
                            <td className="px-3 py-1.5">
                              {SOURCE_TAG[b.source] && <span className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${SOURCE_TAG[b.source].cls}`}>{SOURCE_TAG[b.source].label}</span>}
                            </td>
                            <td className="px-3 py-1.5 text-right">kaat {formatINR(b.kaat)}</td>
                            <td className="px-3 py-1.5 text-right font-semibold">pf {formatINR(b.pf)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

              {left.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1 text-amber-800">Left unassigned (pick a transport for these in the table)</h4>
                  <ul className="text-xs text-amber-900 list-disc pl-5 max-h-40 overflow-auto">
                    {left.map((b, i) => <li key={i}><b>{b.gr_no}</b>: {b.reason || 'no transport / kaat'}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button onClick={onClose} disabled={applying} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">{done ? 'Close' : 'Cancel'}</button>
          {!done && (
            <button onClick={apply} disabled={applying || loading || !will.length}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
              {applying && <Loader2 className="w-4 h-4 animate-spin" />} Assign {will.length} bilties
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
