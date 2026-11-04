'use client';

import { useState } from 'react';
import { X, Loader2, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';

const API_URL = 'https://api.movesure.io';

// stored UTC -> "YYYY-MM-DDTHH:mm" in India time for <input type="datetime-local">
const toLocalInput = (iso) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600e3).toISOString().slice(0, 16) : '');
// "now" in India time, used as the max for the inputs (dates can't be in the future)
const nowLocal = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 16);

/** Edit the dispatch date (dispatched challans) and hub received date (received challans). */
export default function ChallanDatesModal({ challan, user, token, onClose, onSaved }) {
  const [dispatch, setDispatch] = useState(toLocalInput(challan.dispatch_date));
  const [received, setReceived] = useState(toLocalInput(challan.received_at_hub_timing));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const origDispatch = toLocalInput(challan.dispatch_date);
  const origReceived = toLocalInput(challan.received_at_hub_timing);
  const changed = (challan.is_dispatched && dispatch && dispatch !== origDispatch)
    || (challan.is_received_at_hub && received && received !== origReceived);

  const save = async () => {
    const body = { user_id: user?.id };
    if (challan.is_dispatched && dispatch && dispatch !== origDispatch) body.dispatch_date = dispatch;
    if (challan.is_received_at_hub && received && received !== origReceived) body.received_at_hub_timing = received;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/challan/${challan.id}/dates`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (j.status !== 'success') throw new Error(j.message || (res.status === 404 ? 'Date editing is not available on the server yet' : `Failed (${res.status})`));
      onSaved?.(j.data);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500';
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-black">Change dates — Challan {challan.challan_no}</h3>
              <p className="text-xs text-gray-500">India time. Challan date: {challan.date ? format(new Date(challan.date), 'dd/MM/yyyy') : '-'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {challan.is_dispatched && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Dispatch date & time</label>
              <input type="datetime-local" value={dispatch} max={received || nowLocal()} onChange={(e) => setDispatch(e.target.value)} className={input} />
            </div>
          )}
          {challan.is_received_at_hub && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Received at hub date & time</label>
              <input type="datetime-local" value={received} min={dispatch || undefined} max={nowLocal()} onChange={(e) => setReceived(e.target.value)} className={input} />
            </div>
          )}
          <p className="text-[11px] text-gray-500">Dates can&apos;t be in the future. Received can&apos;t be before dispatch, and dispatch can&apos;t be before the challan date.</p>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200">Cancel</button>
          <button onClick={save} disabled={!changed || saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save dates
          </button>
        </div>
      </div>
    </div>
  );
}
