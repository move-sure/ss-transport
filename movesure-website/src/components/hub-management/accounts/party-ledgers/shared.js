// Shared bits for the Party Ledgers screens.
import { partyLedgersApi } from '../api';

export const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

export const KIND_TAG = {
  consignor: 'bg-blue-50 text-blue-700 border-blue-200',
  consignee: 'bg-purple-50 text-purple-700 border-purple-200',
  custom: 'bg-amber-50 text-amber-800 border-amber-200'
};

export const ADDED_VIA_TAG = {
  import: 'bg-gray-100 text-gray-700',
  auto: 'bg-emerald-50 text-emerald-700',
  sync: 'bg-blue-50 text-blue-700',
  manual: 'bg-amber-50 text-amber-800'
};

// Same normalisation the backend uses for name matching: ignore case, spaces, punctuation
export const normalizeName = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Pull a number out of whichever field the API used
const num = (...vals) => {
  for (const v of vals) if (typeof v === 'number') return v;
  return 0;
};

/**
 * Apply Sync in batches (each call posts up to `limit` bilties) until nothing remains.
 * onProgress(addedSoFar, remaining) is called after every batch.
 */
export async function runSyncBatches(ledgerId, { userId, fromDate, toDate, onProgress, maxBatches = 100 } = {}) {
  let added = 0;
  let lastResponse = null;
  for (let i = 0; i < maxBatches; i++) {
    const res = await partyLedgersApi.sync(ledgerId, {
      dry_run: false,
      from_date: fromDate || null,
      to_date: toDate || null,
      user_id: userId
    });
    lastResponse = res;
    const d = res.data || {};
    added += num(d.added_count, res.added_count, Array.isArray(d.added) ? d.added.length : undefined, Array.isArray(d.new_bilties) ? d.new_bilties.length : undefined);
    const remaining = num(res.remaining, d.remaining);
    onProgress?.(added, remaining);
    if (!remaining) break;
  }
  return { added, lastResponse };
}

export const nextDay = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
