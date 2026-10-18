'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { transportLedgersApi } from '../api';
import LedgerPicker from '../LedgerPicker';
import TransportPicker from './TransportPicker';
import { inputCls } from './shared';

// Create a transport ledger up front (assign also creates them on the fly).
export default function NewTransportLedgerModal({ isOpen, onClose, branches = [], defaultBranchId, userId, onCreated }) {
  const [transport, setTransport] = useState(null);
  const [branchId, setBranchId] = useState('');
  const [allowZero, setAllowZero] = useState(false);
  const [attach, setAttach] = useState(null); // existing Transport PF ledger to attach to
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setTransport(null);
    setBranchId(defaultBranchId && defaultBranchId !== 'all' ? defaultBranchId : '');
    setAllowZero(false); setAttach(null); setSaving(false); setError(null); setConflict(null);
  }, [isOpen, defaultBranchId]);

  if (!isOpen) return null;

  const save = async (e) => {
    e.preventDefault();
    if (!transport) { setError('Pick a transport'); return; }
    if (!branchId) { setError('Pick the branch (usually the hub, e.g. Kanpur)'); return; }
    setSaving(true);
    setError(null);
    setConflict(null);
    try {
      const res = await transportLedgersApi.create({
        transport_id: transport.transport_id || transport.id,
        branch_id: branchId,
        allow_zero_kaat: allowZero,
        ...(attach ? { ledger_id: attach.id } : {}),
        created_by: userId
      });
      const d = res.data || {};
      onCreated?.(d.ledger?.id || d.ledger_id || d.id);
    } catch (err) {
      setError(err.message || 'Failed to create');
      if (/exist|looks like/i.test(err.message || '')) setConflict(true);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={save} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-black">New Transport Ledger</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                {error}
                {conflict && <div className="text-xs mt-1">Attach it to the existing ledger below, or open that ledger from the list.</div>}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Transport</label>
            <TransportPicker value={transport} onChange={setTransport} allStations placeholder="Search transport…" />
            {transport && (
              <p className="text-xs text-gray-500 mt-1">
                {transport.station_count ? `${transport.station_count} stations` : ''}
                {transport.gstins?.length ? ` · ${transport.gstins.join(', ')} - every row of this company shares one ledger` : ' · no GSTIN'}
                {transport.ledger_id && <span className="block text-amber-700">Already has a ledger: {transport.ledger_name}</span>}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Branch</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputCls}>
              <option value="">— Select branch —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>
          <label className="flex items-start gap-2 text-sm text-black">
            <input type="checkbox" className="accent-emerald-600 mt-0.5" checked={allowZero} onChange={(e) => setAllowZero(e.target.checked)} />
            <span>Allow zero kaat <span className="block text-xs text-gray-500">For your own delivery transport (e.g. S S TRANSPORT in Kanpur) — bilties post even without kaat.</span></span>
          </label>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Attach to an existing Transport PF ledger (optional)</label>
            <LedgerPicker value={attach} onChange={setAttach} branchId={branchId || undefined} placeholder="Search existing ledger…" />
            <p className="text-xs text-amber-700 mt-1">If attached, its manual monthly PF bills and these per-bilty entries both count in the balance.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create
          </button>
        </div>
      </form>
    </div>
  );
}
