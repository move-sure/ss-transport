'use client';

import { useState } from 'react';
import { X, Pencil, Loader2, CheckCircle2, Plus, Trash2, Undo2, AlertTriangle, Search } from 'lucide-react';
import KaatEditModal from './KaatEditModal';
import { MONTHS } from './billPdf';

const API = 'https://api.movesure.io';
const Rs = (n) => `Rs.${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * A saved bill's bilties:
 * - Edit any row's kaat / rate / charges / pf  -> PUT /api/bilty-crossing-bill/{id}/gr/{gr} (re-totals the bill)
 * - Add / remove bilties (pending until "Save changes"). The API has no add/remove endpoint, so the page
 *   rebuilds the bill (delete + create with the new GR list) via onRebuild - the bill number changes.
 */
export default function BillEditModal({ bill, token, userId, pdfStatus, rebuilding, onClose, onBillUpdated, onRebuild }) {
  const [current, setCurrent] = useState(bill);
  const [editGr, setEditGr] = useState(null);
  const [toRemove, setToRemove] = useState({}); // gr_no -> true
  const [toAdd, setToAdd] = useState([]);       // gr-preview rows
  const [grInput, setGrInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const rows = Array.isArray(current.metadata) ? current.metadata : [];
  const pending = toAdd.length > 0 || Object.keys(toRemove).some((g) => toRemove[g]);
  const keepCount = rows.filter((m) => !toRemove[m.gr_no]).length + toAdd.length;

  const addGrs = async () => {
    const grs = [...new Set(grInput.split(/[\s,]+/).map((g) => g.trim().toUpperCase()).filter(Boolean))];
    if (!grs.length) return;
    setAdding(true);
    setAddError('');
    const failed = [];
    for (const gr of grs) {
      if (rows.some((m) => m.gr_no.toUpperCase() === gr)) {
        // re-adding a row that was marked for removal just un-marks it
        if (toRemove[gr]) setToRemove((t) => ({ ...t, [gr]: false }));
        else failed.push(`${gr} (already on this bill)`);
        continue;
      }
      if (toAdd.some((m) => m.gr_no.toUpperCase() === gr)) continue;
      try {
        const res = await fetch(`${API}/api/bilty-crossing-bill/gr-preview/${encodeURIComponent(gr)}`, { headers });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.status === 'error') throw new Error(res.status === 404 ? 'not found' : (j.message || res.status));
        setToAdd((prev) => [...prev, j.data]);
      } catch (e) { failed.push(`${gr} (${e.message})`); }
    }
    setAdding(false);
    setGrInput('');
    if (failed.length) setAddError(`Could not add: ${failed.join(', ')}`);
  };

  const saveChanges = () => {
    if (!keepCount) { setAddError('A bill needs at least one bilty. Delete the bill instead.'); return; }
    const grNos = [...rows.filter((m) => !toRemove[m.gr_no]).map((m) => m.gr_no), ...toAdd.map((m) => m.gr_no)];
    const removed = rows.filter((m) => toRemove[m.gr_no]).length;
    if (!window.confirm(
      `Save changes to ${current.bill_no}?\n\n+${toAdd.length} added, −${removed} removed → ${grNos.length} bilties.\n\n`
      + 'The old bill is deleted (kept for audit) and a new bill is created for the same transporter and month, '
      + 'so the BILL NUMBER WILL CHANGE. Kaat edits are kept. The PDF is printed again.'
    )) return;
    onRebuild?.(current, grNos);
  };

  const rowCls = (m, i) => {
    if (toRemove[m.gr_no]) return 'bg-red-50/60 text-slate-400 line-through';
    return i % 2 ? 'bg-slate-50/50' : 'bg-white';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={rebuilding ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900">Edit bill {current.bill_no}</h3>
            <p className="text-xs text-slate-500">
              {current.transport_name} · {MONTHS[(current.bill_month || 1) - 1]} {current.bill_year} · {rows.length} bilties
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pdfStatus === 'uploading' && <span className="text-xs text-amber-700 flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating PDF…</span>}
            {pdfStatus === 'done' && <span className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> PDF updated</span>}
            {pdfStatus === 'error' && <span className="text-xs text-red-700">PDF not updated — use Print</span>}
            <button onClick={onClose} disabled={rebuilding} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
        </div>

        {/* Add bilties */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={grInput} onChange={(e) => setGrInput(e.target.value)} disabled={rebuilding}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGrs(); } }}
              placeholder="Add bilties: GR no(s), separated by space or comma"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-teal-500" />
          </div>
          <button onClick={addGrs} disabled={adding || !grInput.trim() || rebuilding}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
          </button>
          {addError && <p className="w-full text-xs text-red-600">{addError}</p>}
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky top-0">
              <tr>
                <th className="px-3 py-2.5 text-left">#</th>
                <th className="px-3 py-2.5 text-left">GR No</th>
                <th className="px-3 py-2.5 text-left">Bilty No</th>
                <th className="px-3 py-2.5 text-left">Consignee</th>
                <th className="px-3 py-2.5 text-left">Dest</th>
                <th className="px-3 py-2.5 text-left">Mode</th>
                <th className="px-3 py-2.5 text-right">Kaat</th>
                <th className="px-3 py-2.5 text-right">PF</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {rows.map((m, i) => {
                const kd = m.kaat_detail;
                const removed = !!toRemove[m.gr_no];
                return (
                  <tr key={m.gr_no} className={rowCls(m, i)}>
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-mono font-semibold">{m.gr_no}</td>
                    <td className="px-3 py-2 font-mono">{m.bilty_number || '—'}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate" title={m.consignee_name}>{m.consignee_name || '—'}</td>
                    <td className="px-3 py-2">{m.destination || '—'}</td>
                    <td className="px-3 py-2 text-xs uppercase">{m.payment_mode || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {Rs(m.kaat)}
                      {kd?.rate ? <span className="block text-[10px] text-slate-400 no-underline">@{kd.rate}/{kd.rate_type === 'per_pkg' ? 'pkg' : 'kg'}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{Rs(m.pf)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{Rs(m.amount)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {!removed && (
                        <button onClick={() => setEditGr(m)} disabled={pending || rebuilding} title={pending ? 'Save or undo the add / remove changes first' : 'Edit kaat'}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200 bg-teal-50 hover:bg-teal-100 disabled:opacity-40 mr-1">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                      <button onClick={() => setToRemove((t) => ({ ...t, [m.gr_no]: !removed }))} disabled={rebuilding}
                        title={removed ? 'Keep this bilty' : 'Remove from bill'}
                        className={`p-1 rounded ${removed ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}>
                        {removed ? <Undo2 className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {toAdd.map((m, i) => (
                <tr key={`add-${m.gr_no}`} className="bg-emerald-50/70">
                  <td className="px-3 py-2 text-emerald-700 text-xs font-bold">NEW</td>
                  <td className="px-3 py-2 font-mono font-semibold text-slate-900">{m.gr_no}</td>
                  <td className="px-3 py-2 font-mono">{m.bilty_number || '—'}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate" title={m.consignee_name}>{m.consignee_name || '—'}</td>
                  <td className="px-3 py-2">{m.destination || '—'}</td>
                  <td className="px-3 py-2 text-xs uppercase">{m.payment_mode || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Rs(m.kaat)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Rs(m.pf)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{Rs(m.amount)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setToAdd((prev) => prev.filter((_, j) => j !== i))} disabled={rebuilding}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50" title="Don't add"><X className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold text-slate-900">
              <tr>
                <td colSpan={6} className="px-3 py-3 text-right text-[11px] uppercase tracking-wider text-slate-500">Total (saved bill)</td>
                <td className="px-3 py-3 text-right tabular-nums">{Rs(current.total_kaat)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{Rs(current.total_pf)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{Rs(current.total_amount)}</td>
                <td />
              </tr>
              {current.net_payable != null && (
                <tr>
                  <td colSpan={8} className="px-3 pb-3 text-right text-[11px] uppercase tracking-wider text-slate-500">Net payable</td>
                  <td className="px-3 pb-3 text-right tabular-nums">{Rs(current.net_payable)}</td>
                  <td />
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        {/* Pending add / remove */}
        {pending && (
          <div className="px-5 py-3 border-t border-amber-200 bg-amber-50 flex flex-wrap items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span className="text-sm text-amber-900">
              +{toAdd.length} to add, −{rows.filter((m) => toRemove[m.gr_no]).length} to remove → <b>{keepCount}</b> bilties.
              Saving rebuilds the bill (new bill number).
            </span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => { setToAdd([]); setToRemove({}); setAddError(''); }} disabled={rebuilding}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-white">Undo</button>
              <button onClick={saveChanges} disabled={rebuilding}
                className="px-4 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
                {rebuilding && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
              </button>
            </div>
          </div>
        )}
      </div>

      {editGr && (
        <KaatEditModal
          grNo={editGr.gr_no}
          seed={editGr.kaat_detail}
          billId={current.id}
          token={token}
          userId={userId}
          onClose={() => setEditGr(null)}
          onSaved={(j) => {
            setEditGr(null);
            if (j.data) { setCurrent(j.data); onBillUpdated?.(j.data, j.gr); }
          }}
        />
      )}
    </div>
  );
}
