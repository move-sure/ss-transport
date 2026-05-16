// ─── Shared utilities for Transport Bilty Report pages ───────────────────────
// Used by: crossing-summary, crossing-bills

// ── API format detection ──────────────────────────────────────────────────────
// Old format: result.bilties (flat array)
// New format: result.with_pohonch / result.no_pohonch (grouped)
export function isNewFormat(result) {
  return result.with_pohonch != null || result.no_pohonch != null;
}

// ── Flatten grouped API response into a flat bilties array ───────────────────
export function flattenResult(result) {
  if (!isNewFormat(result)) return result.bilties || [];

  const list = [];
  const wp   = result.with_pohonch || {};

  // Natural sort: HC0001, HC0002, … HC0009, HC0010
  const pohonchKeys = Object.keys(wp).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });
  for (const k of pohonchKeys) {
    for (const b of (wp[k].regular || [])) list.push(b);
    for (const b of (wp[k].manual  || [])) list.push(b);
  }

  const np = result.no_pohonch || {};
  for (const k of Object.keys(np)) {
    for (const b of (np[k] || [])) list.push(b);
  }
  return list;
}

// ── Normalise summary fields from either API format ──────────────────────────
export function getSummary(result) {
  if (isNewFormat(result) && result.summary) {
    return {
      total:           result.summary.total,
      with_pohonch:    result.summary.with_pohonch,
      without_pohonch: result.summary.without_pohonch,
      total_weight_kg: result.summary.total_weight_kg,
      total_freight:   result.summary.total_freight,
    };
  }
  return {
    total:           result.total,
    with_pohonch:    result.with_pohonch_count,
    without_pohonch: result.without_pohonch_count,
    total_weight_kg: null,
    total_freight:   null,
  };
}

// ── Build groups: bilties keyed by dest_pohonch_no, sorted numerically ────────
// Returns [{ key, bilties }] — groups sorted ascending, NO_POHONCH last
export function buildDestGroups(bilties) {
  const map = {};
  for (const b of bilties) {
    const key = b.dest_pohonch_no ? String(b.dest_pohonch_no).trim() : 'NO_POHONCH';
    if (!map[key]) map[key] = [];
    map[key].push(b);
  }
  // Sort bilties within each group by bilty_date ascending, then gr_no as tiebreaker
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => {
      const da = a.bilty_date ? new Date(a.bilty_date).getTime() : 0;
      const db = b.bilty_date ? new Date(b.bilty_date).getTime() : 0;
      if (da !== db) return da - db;
      const na = parseInt(a.gr_no, 10);
      const nb = parseInt(b.gr_no, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a.gr_no).localeCompare(String(b.gr_no));
    });
  }
  const keys = Object.keys(map).sort((a, b) => {
    if (a === 'NO_POHONCH') return 1;
    if (b === 'NO_POHONCH') return -1;
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
  return keys.map(k => ({ key: k, bilties: map[k] }));
}

// ── Number / currency helpers ─────────────────────────────────────────────────
export function fmtN(v)    { return v != null ? Number(v).toFixed(2) : ''; }
export function fmtDisp(v) {
  return v != null
    ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '—';
}

// ── Build the correct API query params from a TransportSearchSelect value ─────
// TransportSearchSelect returns { id, transport_name, gst_number, … }
export function buildTransportParams(selectedTransport, fromDate, toDate) {
  const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
  if (selectedTransport.gst_number) {
    params.set('transport_gstin', selectedTransport.gst_number.trim().toUpperCase());
  } else {
    params.set('transport_name', selectedTransport.transport_name.trim());
  }
  return params;
}
