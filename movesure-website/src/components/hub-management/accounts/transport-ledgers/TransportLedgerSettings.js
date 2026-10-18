'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Plus, GitMerge } from 'lucide-react';
import { transportLedgersApi } from '../api';
import { customAlert } from '@/components/common/alert-system';
import TransportPicker from './TransportPicker';

// Member transport rows (one ledger per company / PAN; no-GSTIN rows grouped by hand),
// allow zero kaat, and merging a split ledger into another.
export default function TransportLedgerSettings({ ledger, profile, transports = [], userId, onSaved }) {
  const router = useRouter();
  const [adding, setAdding] = useState(null);
  const [busy, setBusy] = useState(false);
  const [others, setOthers] = useState([]);
  const [mergeInto, setMergeInto] = useState('');
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    transportLedgersApi.list()
      .then((res) => setOthers((res.data || []).filter((l) => l.ledger_id !== ledger.id)))
      .catch(() => setOthers([]));
  }, [ledger.id]);

  const update = async (body, msg) => {
    setBusy(true);
    try {
      await transportLedgersApi.update(ledger.id, { ...body, updated_by: userId });
      customAlert(msg, 'success');
      setAdding(null);
      onSaved?.();
    } catch (err) {
      customAlert(err.message || 'Update failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const merge = async () => {
    const target = others.find((o) => o.ledger_id === mergeInto);
    if (!target) return;
    if (!window.confirm(`Merge "${ledger.name}" into "${target.name}"?\n\nAll bilties, vouchers, bills and transport rows move to ${target.name}, and this ledger is deactivated.`)) return;
    setMerging(true);
    try {
      await transportLedgersApi.merge(ledger.id, { into_ledger_id: target.ledger_id, updated_by: userId });
      customAlert(`Merged into ${target.name}`, 'success');
      router.push(`/hub-management/accounts/transport-ledgers/${target.ledger_id}`);
    } catch (err) {
      customAlert(err.message || 'Merge failed', 'error');
      setMerging(false);
    }
  };

  // Adding a company option adds all of its rows; a single row option adds just that row
  const idsOf = (o) => (o?.transport_ids?.length ? o.transport_ids : [o?.transport_id || o?.id].filter(Boolean));

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h4 className="font-semibold text-black mb-1">Transport rows in this ledger ({transports.length})</h4>
        <p className="text-xs text-gray-500 mb-3">
          Rows are grouped by the PAN inside their GSTIN{profile?.transport_gstin ? ` (${profile.transport_gstin})` : ''}, so every station row of one company shares this ledger. Add no-GSTIN rows of the same company by hand.
        </p>
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {transports.length === 0 && <div className="px-3 py-3 text-sm text-gray-500">No rows</div>}
          {transports.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <div className="font-semibold text-black">{t.transport_name}{t.is_prior && <span className="ml-1 text-[10px] text-amber-700">★ priority</span>}</div>
                <div className="text-xs text-gray-500">{t.city_name || t.city || '-'}{t.gst_number ? ` · ${t.gst_number}` : ' · no GSTIN'}</div>
              </div>
              <button onClick={() => update({ remove_transport_ids: [t.id] }, 'Transport removed')} disabled={busy || transports.length <= 1}
                title={transports.length <= 1 ? 'A ledger needs at least one transport' : 'Remove from this ledger'}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1"><TransportPicker value={adding} onChange={setAdding} allStations placeholder="Add a transport (e.g. a no-GSTIN look-alike)…" /></div>
          <button onClick={() => adding && update({ add_transport_ids: idsOf(adding) }, 'Transport added')} disabled={!adding || busy}
            className="px-3 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-1">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add{adding && idsOf(adding).length > 1 ? ` ${idsOf(adding).length} rows` : ''}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="flex items-start gap-3 text-sm text-black">
          <input type="checkbox" className="accent-emerald-600 mt-0.5" checked={!!profile?.allow_zero_kaat} disabled={busy}
            onChange={(e) => update({ allow_zero_kaat: e.target.checked }, 'Saved')} />
          <span>
            <b>Allow zero kaat</b>
            <span className="block text-xs text-gray-500">Post bilties even when no kaat is found. Use only for your own delivery transport (e.g. S S TRANSPORT in Kanpur); otherwise a missing kaat would overstate what the transport owes.</span>
          </span>
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
        <h4 className="font-semibold text-black mb-1 flex items-center gap-2"><GitMerge className="w-4 h-4 text-red-600" /> Merge into another ledger</h4>
        <p className="text-xs text-gray-500 mb-3">For a split company (e.g. a stray no-GSTIN &quot;swastic transport&quot;). Everything moves to the target and this ledger is deactivated.</p>
        <div className="flex gap-2">
          <select value={mergeInto} onChange={(e) => setMergeInto(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black">
            <option value="">— Pick the ledger to keep —</option>
            {others.map((o) => <option key={o.ledger_id} value={o.ledger_id}>{o.name}{o.transport_gstin ? ` (${o.transport_gstin})` : ''}</option>)}
          </select>
          <button onClick={merge} disabled={!mergeInto || merging}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {merging && <Loader2 className="w-4 h-4 animate-spin" />} Merge
          </button>
        </div>
      </div>
    </div>
  );
}
