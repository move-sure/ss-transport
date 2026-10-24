// Shared helpers for the Hub → Transport screens.

export const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

// Where the suggested transport came from -> short tag
export const SOURCE_TAG = {
  kaat_table: { label: 'kaat', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  bilty: { label: 'bilty', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  bilty_gst: { label: 'gst', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  station_rate: { label: 'rate', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  station_rate_prior: { label: 'rate·priority', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  city_prior: { label: 'priority', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  manual: { label: 'chosen', cls: 'bg-gray-900 text-white border-gray-900' }
};

export const KAAT_SOURCE_LABEL = { kaat_table: 'kaat table', hub_rate: 'station rate', zero: 'no kaat' };

const text = (v) => (typeof v === 'string' ? v : v?.reason || v?.message || '');

/**
 * Status of a received bilty row. `override` = transport the user picked in the table.
 * key: assigned | blocked | undetected | nokaat | ready
 */
export function rowStatus(r, override) {
  if (r.assigned) return { key: 'assigned', label: `In ${r.assigned.ledger_name || 'ledger'}`, cls: 'bg-emerald-50 text-emerald-700' };
  if (r.blocked) return { key: 'blocked', label: text(r.blocked) || 'Blocked', cls: 'bg-red-50 text-red-700' };
  if (!override && !r.suggested?.transport_id) return { key: 'undetected', label: text(r.suggested?.reason || r.reason) || 'No transport found — pick one', cls: 'bg-amber-50 text-amber-800' };
  if (!override && !Number(r.estimate?.kaat)) return { key: 'nokaat', label: 'No kaat', cls: 'bg-amber-50 text-amber-800' };
  return { key: 'ready', label: override ? 'Ready (chosen)' : 'Ready', cls: 'bg-blue-50 text-blue-700' };
}

// Pohonch / crossing challan / transport bilty no = proof the transport received the bilty
// (information only - the bilty is still assigned and posted normally).
export function proofBadges(r) {
  const p = r.proof || {};
  return [
    p.pohonch_no && `Pohonch ${p.pohonch_no}`,
    p.crossing_challan_no && `Crossing ${p.crossing_challan_no}`,
    p.bilty_number && `Bilty no ${p.bilty_number}`
  ].filter(Boolean);
}

// City code per city id (loaded once, shared) - used to order bilties like the printed challan
let cityCodeCache = null;
export async function loadCityCodes() {
  if (cityCodeCache) return cityCodeCache;
  const { default: supabase } = await import('@/app/utils/supabase');
  const { data } = await supabase.from('cities').select('id, city_code, city_name');
  cityCodeCache = Object.fromEntries((data || []).map((c) => [c.id, (c.city_code || c.city_name || '').toUpperCase()]));
  return cityCodeCache;
}

// Same order as the challan print (ChallanPDFPreview): destination city code A-Z,
// then GR no in natural order (A15702 before A15710) within each city.
export function challanOrder(cityCodes = {}) {
  const code = (r) => (cityCodes[r.station_city_id] || r.to_city_code || r.station || '').toUpperCase();
  return (a, b) => {
    const ca = code(a);
    const cb = code(b);
    if (ca !== cb) return ca.localeCompare(cb);
    return String(a.gr_no || '').toUpperCase()
      .localeCompare(String(b.gr_no || '').toUpperCase(), undefined, { numeric: true, sensitivity: 'base' });
  };
}

// Signed pf: to-pay -> + (transport owes us, Dr), paid -> - (we owe kaat, Cr)
export const pfOf = (r) => Number(r.estimate?.pf) || 0;

export const monthStart = (today) => `${today.slice(0, 8)}01`;
export const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
