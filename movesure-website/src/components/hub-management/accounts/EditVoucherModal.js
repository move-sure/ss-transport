'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Ban, Save } from 'lucide-react';
import { ledgerApi } from './api';
import { formatINR, todayLocalDate } from './helpers';
import { customAlert } from '@/components/common/alert-system';

/**
 * Correct or cancel a saved transaction (voucher).
 * Correct = PUT /vouchers/{id}: edited in place, same voucher no; the server recalculates
 * the bills it touches and writes the audit log. Works for bills too.
 */
export default function EditVoucherModal({ voucherId, userId, onClose, onDone }) {
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('edit'); // 'edit' | 'cancel'

  const [date, setDate] = useState('');
  const [narration, setNarration] = useState('');
  const [amounts, setAmounts] = useState({}); // entry id -> amount (string)
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!voucherId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await ledgerApi.vouchers.get(voucherId);
        if (cancelled) return;
        const v = res.data;
        setVoucher(v);
        setDate(v.voucher_date || todayLocalDate());
        setNarration(v.narration || '');
        setAmounts(Object.fromEntries((v.entries || []).map((e) => [e.id, String(e.amount ?? '')])));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load transaction');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [voucherId]);

  if (!voucherId) return null;

  const entries = voucher?.entries || [];
  const isCancelled = voucher && !voucher.is_active;
  const simple = entries.length === 2; // one Dr + one Cr -> a single amount box

  const setAmount = (entryId, value) => {
    if (simple) {
      // keep both sides equal
      setAmounts(Object.fromEntries(entries.map((e) => [e.id, value])));
    } else {
      setAmounts((a) => ({ ...a, [entryId]: value }));
    }
  };

  const totalDr = entries.filter((e) => e.entry_type === 'dr').reduce((s, e) => s + (Number(amounts[e.id]) || 0), 0);
  const totalCr = entries.filter((e) => e.entry_type === 'cr').reduce((s, e) => s + (Number(amounts[e.id]) || 0), 0);
  const balanced = Math.abs(totalDr - totalCr) < 0.005 && totalDr > 0;
  const changed = voucher && (
    date !== (voucher.voucher_date || '') ||
    narration !== (voucher.narration || '') ||
    entries.some((e) => Number(amounts[e.id]) !== Number(e.amount))
  );

  const handleCorrect = async () => {
    if (!balanced) { setError(`Dr ₹${formatINR(totalDr)} and Cr ₹${formatINR(totalCr)} must be equal`); return; }
    setSaving(true);
    setError(null);
    try {
      const amountsChanged = entries.some((e) => Number(amounts[e.id]) !== Number(e.amount));
      await ledgerApi.vouchers.update(voucher.id, {
        voucher_date: date,
        narration: narration.trim() || null,
        ...(amountsChanged ? {
          entries: entries.map((e) => ({
            id: e.id,
            ledger_id: e.ledger_id,
            entry_type: e.entry_type,
            amount: Number(amounts[e.id]) || 0,
            ...(e.bill_reference_id ? { bill_reference_id: e.bill_reference_id, bill_allocation_type: e.bill_allocation_type } : {})
          }))
        } : {}),
        updated_by: userId,
        edit_reason: reason.trim() || null
      });
      customAlert(`${voucher.voucher_no} updated`, 'success');
      onDone?.();
    } catch (err) {
      setError(err.message || 'Could not save the correction');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setSaving(true);
    setError(null);
    try {
      await ledgerApi.vouchers.cancel(voucher.id, { cancelled_by: userId, reason: reason.trim() || 'Entered by mistake' });
      customAlert(`${voucher.voucher_no} cancelled`, 'success');
      onDone?.();
    } catch (err) {
      setError(err.message || 'Failed to cancel');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-bold text-black">
            {voucher ? `Transaction ${voucher.voucher_no}` : 'Transaction'}
            {voucher && <span className="ml-2 text-xs font-semibold uppercase text-gray-500">{voucher.voucher_type}</span>}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></div>
        ) : !voucher ? (
          <div className="p-5 text-sm text-red-700">{error || 'Not found'}</div>
        ) : (
          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
              </div>
            )}

            {isCancelled ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                Already cancelled{voucher.cancel_reason ? `: ${voucher.cancel_reason}` : ''}.
              </div>
            ) : (
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button type="button" onClick={() => setMode('edit')}
                  className={`flex-1 py-2 text-sm font-semibold ${mode === 'edit' ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>
                  Correct
                </button>
                <button type="button" onClick={() => setMode('cancel')}
                  className={`flex-1 py-2 text-sm font-semibold ${mode === 'cancel' ? 'bg-red-600 text-white' : 'bg-white text-black'}`}>
                  Cancel transaction
                </button>
              </div>
            )}


            {/* Entries */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-black">
                  <tr>
                    <th className="text-left px-3 py-2">Ledger</th>
                    <th className="text-center px-3 py-2 w-14">Dr/Cr</th>
                    <th className="text-right px-3 py-2 w-36">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-black">
                  {entries.map((e, i) => {
                    const editable = !isCancelled && mode === 'edit' && (!simple || i === 0);
                    return (
                      <tr key={e.id}>
                        <td className="px-3 py-2">{e.ledger_name || e.ledger_id}</td>
                        <td className="px-3 py-2 text-center font-bold">{e.entry_type === 'dr' ? 'Dr' : 'Cr'}</td>
                        <td className="px-3 py-2 text-right">
                          {editable ? (
                            <input type="number" step="0.01" min="0" value={amounts[e.id] ?? ''}
                              onChange={(ev) => setAmount(e.id, ev.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm" />
                          ) : (
                            <>₹{formatINR(amounts[e.id])}</>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {!simple && mode === 'edit' && !isCancelled && (
                  <tfoot className="bg-gray-50 text-xs font-semibold text-black">
                    <tr>
                      <td className="px-3 py-2" colSpan={2}>Total Dr / Cr</td>
                      <td className={`px-3 py-2 text-right ${balanced ? 'text-emerald-700' : 'text-red-600'}`}>
                        ₹{formatINR(totalDr)} / ₹{formatINR(totalCr)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {!isCancelled && mode === 'edit' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Narration</label>
                    <input value={narration} onChange={(e) => setNarration(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Reason for change</label>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="e.g. Wrong amount" />
                </div>
                <p className="text-xs text-gray-500">
                  Edited in place: {voucher.voucher_no} keeps its number, linked bills are recalculated, and the change is logged in the Audit Log.
                </p>
                <div className="flex justify-end gap-3">
                  <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Close</button>
                  <button onClick={handleCorrect} disabled={saving || !changed || !balanced}
                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save correction
                  </button>
                </div>
              </>
            )}

            {!isCancelled && mode === 'cancel' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Reason</label>
                  <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Entered by mistake / wrong party" className={inputCls} />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Close</button>
                  <button onClick={handleCancel} disabled={saving}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                    Cancel {voucher.voucher_no}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
