'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/utils/auth';
import { Loader2, AlertCircle, ArrowLeft, History, Ban, X } from 'lucide-react';
import { ledgerApi } from '@/components/hub-management/accounts/api';
import { formatDate, formatINR, FLOW_LABEL } from '@/components/hub-management/accounts/helpers';
import { customAlert } from '@/components/common/alert-system';

function CancelDialog({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-black">Cancel Voucher</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block text-sm font-medium text-black">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Entered by mistake"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Back</button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VoucherDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ledgerApi.vouchers.get(id);
      setVoucher(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load voucher');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const handleCancel = async (reason) => {
    try {
      await ledgerApi.vouchers.cancel(id, { cancelled_by: user?.id, reason });
      customAlert('Voucher cancelled', 'success');
      setCancelOpen(false);
      load();
    } catch (err) {
      customAlert(err.message || 'Failed to cancel voucher', 'error');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  if (error || !voucher) {
    return (
      <div className="px-6 py-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error || 'Voucher not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <button onClick={() => router.push('/hub-management/accounts/vouchers')} className="flex items-center gap-1.5 text-sm text-black hover:text-black mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Day Book
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-black">{voucher.voucher_no}</h1>
            {!voucher.is_active && (
              <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">Cancelled</span>
            )}
          </div>
          <p className="text-sm text-black mt-1 capitalize">
            {voucher.voucher_type?.replace('_', ' ')} · {formatDate(voucher.voucher_date)}
            {voucher.reference_no ? ` · Ref: ${voucher.reference_no}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/hub-management/accounts/audit-log?entity_type=voucher&entity_id=${id}`)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-black hover:bg-gray-50"
          >
            <History className="w-4 h-4" /> History
          </button>
          {voucher.is_active && (
            <button
              onClick={() => setCancelOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              <Ban className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {voucher.narration && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-black mb-4">{voucher.narration}</div>
      )}

      {!voucher.is_active && voucher.cancel_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
          <span className="font-semibold">Cancellation reason:</span> {voucher.cancel_reason}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-black text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Ledger</th>
              <th className="text-left px-4 py-3 font-semibold">Narration</th>
              <th className="text-right px-4 py-3 font-semibold">{FLOW_LABEL.dr}</th>
              <th className="text-right px-4 py-3 font-semibold">{FLOW_LABEL.cr}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-black">
            {(voucher.entries || []).map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 font-medium text-black">{e.ledger_name}</td>
                <td className="px-4 py-3 text-black">{e.narration || '-'}</td>
                <td className="px-4 py-3 text-right">{e.entry_type === 'dr' ? `₹${formatINR(e.amount)}` : ''}</td>
                <td className="px-4 py-3 text-right">{e.entry_type === 'cr' ? `₹${formatINR(e.amount)}` : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold text-black">
              <td className="px-4 py-3" colSpan={2}>Total</td>
              <td className="px-4 py-3 text-right">₹{formatINR(voucher.total_amount)}</td>
              <td className="px-4 py-3 text-right">₹{formatINR(voucher.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <CancelDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleCancel} />
    </div>
  );
}
