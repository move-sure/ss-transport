'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { banksApi } from './api';

/**
 * Cash / Bank toggle. When "Bank" is picked, shows a dropdown of this
 * branch's bank accounts (from GET /api/ledger/banks) — leaving it on
 * "Use default bank" omits bank_ledger_id so the server picks whichever
 * bank is marked default.
 */
export default function PaymentModeField({ branchId, mode, onModeChange, bankLedgerId, onBankChange }) {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'bank' || banks.length > 0) return;
    (async () => {
      setLoading(true);
      try {
        const res = await banksApi.list(branchId);
        setBanks(res.data || []);
      } catch (_) {
        setBanks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, branchId, banks.length]);

  return (
    <div>
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        <button type="button" onClick={() => onModeChange('cash')}
          className={`flex-1 py-2 text-sm font-semibold ${mode === 'cash' ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>Cash</button>
        <button type="button" onClick={() => onModeChange('bank')}
          className={`flex-1 py-2 text-sm font-semibold ${mode === 'bank' ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>Bank / Cheque</button>
      </div>

      {mode === 'bank' && (
        <div className="mt-2">
          {loading ? (
            <Loader2 className="w-4 h-4 text-black animate-spin" />
          ) : (
            <select
              value={bankLedgerId}
              onChange={(e) => onBankChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Use default bank</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.is_default ? ' (default)' : ''}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
