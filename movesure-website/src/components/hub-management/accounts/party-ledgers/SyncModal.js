'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { partyLedgersApi } from '../api';
import { formatINR, formatDate } from '../helpers';
import { inputCls, runSyncBatches } from './shared';

// Sync a party ledger: preview (dry run) new / changed / no-longer-matching bilties, then apply in batches.
export default function SyncModal({ isOpen, onClose, ledger, userId, onSynced }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setFromDate(''); setToDate(''); setPreview(null); setDone(null); setError(null);
    setLoading(false); setApplying(false); setProgress('');
  }, [isOpen]);

  if (!isOpen) return null;

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const res = await partyLedgersApi.sync(ledger.id, { dry_run: true, from_date: fromDate || null, to_date: toDate || null });
      setPreview(res.data || {});
    } catch (err) {
      setError(err.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    setError(null);
    try {
      const { added } = await runSyncBatches(ledger.id, {
        userId, fromDate, toDate,
        onProgress: (a, r) => setProgress(`${a} added, ${r} left…`)
      });
      setDone(`Sync complete: ${added} new bilties added${preview?.amount_changed?.length ? `, ${preview.amount_changed.length} amounts updated` : ''}.`);
      setPreview(null);
      onSynced?.();
    } catch (err) {
      setError(err.message || 'Sync failed');
    } finally {
      setApplying(false);
      setProgress('');
    }
  };

  const newB = preview?.new_bilties || [];
  const changed = preview?.amount_changed || [];
  const stale = preview?.no_longer_matching || [];
  const nothing = preview && !newB.length && !changed.length && !stale.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-black">Sync — {ledger?.name}</h3>
            <p className="text-xs text-gray-500">Picks up manual (station) bilties and anything missed; updates changed amounts.</p>
          </div>
          <button onClick={onClose} disabled={applying} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>

        <div className="p-4 border-b border-gray-100 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">From (optional)</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">To (optional)</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
          </div>
          <button onClick={runPreview} disabled={loading || applying}
            className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Preview
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4 text-sm text-black">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> {done}
            </div>
          )}
          {!preview && !done && !loading && <p className="text-gray-500">Click <b>Preview</b> to see what Sync would change.</p>}
          {nothing && <p className="text-emerald-700 font-semibold">Everything is up to date.</p>}

          {newB.length > 0 && (
            <section>
              <h4 className="font-semibold mb-1">New bilties: {newB.length} · ₹{formatINR(preview.new_total)}</h4>
              <div className="border border-gray-200 rounded-lg max-h-56 overflow-auto">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-gray-50">
                    {newB.slice(0, 200).map((b, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 font-semibold">{b.gr_no}</td>
                        <td className="px-3 py-1.5">{formatDate(b.bilty_date)}</td>
                        <td className="px-3 py-1.5 capitalize">{b.bilty_type}</td>
                        <td className="px-3 py-1.5">{b.consignor || b.consignee || ''}</td>
                        <td className="px-3 py-1.5 text-right">₹{formatINR(b.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {newB.length > 200 && <div className="px-3 py-1.5 text-xs text-gray-500">…and {newB.length - 200} more</div>}
              </div>
            </section>
          )}

          {changed.length > 0 && (
            <section>
              <h4 className="font-semibold mb-1">Amount changed: {changed.length}</h4>
              <ul className="text-xs space-y-0.5">
                {changed.map((c) => <li key={c.link_id}><b>{c.gr_no}</b>: ₹{formatINR(c.old_amount)} → ₹{formatINR(c.new_amount)}</li>)}
              </ul>
            </section>
          )}

          {stale.length > 0 && (
            <section>
              <h4 className="font-semibold mb-1 text-amber-800">No longer matching: {stale.length} (not changed — remove by hand if wrong)</h4>
              <ul className="text-xs space-y-0.5 text-amber-900">
                {stale.map((s) => <li key={s.link_id}><b>{s.gr_no}</b>: {s.reason}</li>)}
              </ul>
            </section>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
          {applying && <span className="mr-auto text-sm text-emerald-700 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{progress || 'Syncing…'}</span>}
          <button onClick={onClose} disabled={applying} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Close</button>
          <button onClick={apply} disabled={applying || !preview || (!newB.length && !changed.length)}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50">
            Apply Sync
          </button>
        </div>
      </div>
    </div>
  );
}
