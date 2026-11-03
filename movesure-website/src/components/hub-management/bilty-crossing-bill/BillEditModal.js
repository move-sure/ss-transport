'use client';

import { useState } from 'react';
import { X, Pencil, Loader2, CheckCircle2 } from 'lucide-react';
import KaatEditModal from './KaatEditModal';
import { MONTHS } from './billPdf';

const Rs = (n) => `Rs.${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * A saved bill's bilties - edit any row's kaat / rate / charges / pf.
 * Each save goes to PUT /api/bilty-crossing-bill/{id}/gr/{gr}, which re-totals the bill;
 * the page then re-prints and re-uploads the PDF (pdfStatus shows that).
 */
export default function BillEditModal({ bill, token, userId, pdfStatus, onClose, onBillUpdated }) {
  const [current, setCurrent] = useState(bill);
  const [editGr, setEditGr] = useState(null);
  const rows = Array.isArray(current.metadata) ? current.metadata : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
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
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
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
                return (
                  <tr key={m.gr_no} className={i % 2 ? 'bg-slate-50/50' : 'bg-white'}>
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-slate-900">{m.gr_no}</td>
                    <td className="px-3 py-2 font-mono">{m.bilty_number || '—'}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate" title={m.consignee_name}>{m.consignee_name || '—'}</td>
                    <td className="px-3 py-2">{m.destination || '—'}</td>
                    <td className="px-3 py-2 text-xs uppercase">{m.payment_mode || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {Rs(m.kaat)}
                      {kd?.rate ? <span className="block text-[10px] text-slate-400">@{kd.rate}/{kd.rate_type === 'per_pkg' ? 'pkg' : 'kg'}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{Rs(m.pf)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">{Rs(m.amount)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => setEditGr(m)} title="Edit kaat"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200 bg-teal-50 hover:bg-teal-100">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold text-slate-900">
              <tr>
                <td colSpan={6} className="px-3 py-3 text-right text-[11px] uppercase tracking-wider text-slate-500">Total</td>
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
