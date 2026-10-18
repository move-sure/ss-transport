const API_URL = 'https://api.movesure.io';

function qs(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });

  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    // no body
  }

  if (!res.ok || json?.status === 'error') {
    const message = json?.message || json?.detail || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return json || {};
}

const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body || {}) });
const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body || {}) });
const del = (path) => request(path, { method: 'DELETE' });

export const ledgerApi = {
  groups: {
    tree: (params) => request(`/api/ledger/groups/tree${qs(params)}`),
    list: (params) => request(`/api/ledger/groups${qs(params)}`),
    get: (id) => request(`/api/ledger/groups/${id}`),
    create: (body) => post('/api/ledger/groups', body),
    update: (id, body) => put(`/api/ledger/groups/${id}`, body),
    activate: (id, body) => post(`/api/ledger/groups/${id}/activate`, body),
    deactivate: (id, body) => post(`/api/ledger/groups/${id}/deactivate`, body),
  },
  ledgers: {
    list: (params) => request(`/api/ledger/ledgers${qs(params)}`),
    get: (id) => request(`/api/ledger/ledgers/${id}`),
    create: (body) => post('/api/ledger/ledgers', body),
    update: (id, body) => put(`/api/ledger/ledgers/${id}`, body),
    activate: (id, body) => post(`/api/ledger/ledgers/${id}/activate`, body),
    deactivate: (id, body) => post(`/api/ledger/ledgers/${id}/deactivate`, body),
    balance: (id) => request(`/api/ledger/ledgers/${id}/balance`),
    statement: (id, params) => request(`/api/ledger/ledgers/${id}/statement${qs(params)}`),
  },
  bills: {
    list: (params) => request(`/api/ledger/bills${qs(params)}`),
    get: (id) => request(`/api/ledger/bills/${id}`),
    create: (body) => post('/api/ledger/bills', body),
  },
  vouchers: {
    list: (params) => request(`/api/ledger/vouchers${qs(params)}`),
    get: (id) => request(`/api/ledger/vouchers/${id}`),
    create: (body) => post('/api/ledger/vouchers', body),
    // Edit in place - same voucher_no; bills are recalculated server-side
    update: (id, body) => put(`/api/ledger/vouchers/${id}`, body),
    cancel: (id, body) => post(`/api/ledger/vouchers/${id}/cancel`, body),
  },
  auditLog: {
    list: (params) => request(`/api/ledger/audit-log${qs(params)}`),
  },
};

// Party ledgers (consignor / consignee, built from their bilties) + custom bilty ledgers.
// Each bilty in a ledger = one Sales voucher (Dr party as a bill ref = GR no / Cr Freight Income).
const PL = '/api/ledger/party-ledgers';
export const partyLedgersApi = {
  list: (params) => request(`${PL}${qs(params)}`),                       // { branch_id, kind: party|custom }
  parties: (params) => request(`${PL}/parties${qs(params)}`),            // { type: consignor|consignee, q }
  nameVariants: (params) => request(`${PL}/name-variants${qs(params)}`), // { type, q }
  create: (body) => post(PL, body),
  get: (id) => request(`${PL}/${id}`),
  bilties: (id, params) => request(`${PL}/${id}/bilties${qs(params)}`),  // { status: open|settled, q, page, page_size }
  addBilties: (id, body) => post(`${PL}/${id}/bilties`, body),           // { items: [{ bilty_type, bilty_id }], added_by }
  removeBilty: (id, linkId, params) => del(`${PL}/${id}/bilties/${linkId}${qs(params)}`), // { user_id, reason }
  biltySearch: (params) => request(`${PL}/bilty-search${qs(params)}`),
  sync: (id, body) => post(`${PL}/${id}/sync`, body),                    // { dry_run, from_date, to_date, user_id, limit }
  autoAdd: (body) => post(`${PL}/auto-add`, body),                       // { bilty_type, bilty_id, user_id }
  collect: (id, body) => post(`${PL}/${id}/collect`, body),
  updateCollect: (id, voucherId, body) => put(`${PL}/${id}/collect/${voucherId}`, body),
  updateProfile: (id, body) => put(`${PL}/${id}/profile`, body),
};

// Transport ledgers: bilties on challans received at the hub, posted per bilty into the
// delivery transport's ledger (to-pay -> Dr pf = total - kaat - dd, paid -> Cr kaat).
const TL = '/api/ledger/transport-ledgers';
const enc = encodeURIComponent;
export const transportLedgersApi = {
  challans: (params) => request(`${TL}/challans${qs(params)}`),            // { from_date, to_date, branch_id, page, page_size }
  challan: (no) => request(`${TL}/challans/${enc(no)}`),
  autoAssign: (no, body) => post(`${TL}/challans/${enc(no)}/auto-assign`, body), // { dry_run, updated_by }
  assign: (body) => post(`${TL}/assign`, body),                             // { items: [{ gr_no, transport_id?, ledger_id? }], updated_by, include_settled }
  unassigned: (params) => request(`${TL}/unassigned${qs(params)}`),         // { from_date, to_date, only_undetected, include_settled }
  // One row per transport company (grouped by PAN). Always send the bilty's station_city_id.
  transportOptions: (params) => request(`${TL}/transport-options${qs(params)}`), // { station_city_id, q, all_stations, grouped }
  list: (params) => request(`${TL}${qs(params)}`),
  create: (body) => post(TL, body),
  get: (id) => request(`${TL}/${id}`),
  update: (id, body) => put(`${TL}/${id}`, body),                           // { add_transport_ids, remove_transport_ids, allow_zero_kaat, updated_by }
  bilties: (id, params) => request(`${TL}/${id}/bilties${qs(params)}`),     // { challan_no, payment_mode, status, q, page, page_size }
  unassign: (id, linkId, params) => del(`${TL}/${id}/bilties/${linkId}${qs(params)}`),
  refresh: (id, body) => post(`${TL}/${id}/refresh`, body),                 // { dry_run, updated_by }
  merge: (id, body) => post(`${TL}/${id}/merge`, body),                     // { into_ledger_id, updated_by }
  // Set kaat (rate x weight / packages) for bilties without one; optionally save station rate + assign
  addKaat: (body) => post(`${TL}/kaat`, body),                              // { gr_nos, transport_id, pricing_mode, rate, dd, save_station_rate, assign, updated_by }
  // Manual (station) bilty edited outside the API -> re-sync its transport ledger entry
  biltyChanged: (body) => post(`${TL}/bilty-changed`, body),                // { gr_no | gr_nos, user_id }
};

// Screen 1 — Transport PF Collection
export const transportersApi = {
  list: (branchId) => request(`/api/ledger/transporters${qs({ branch_id: branchId })}`),
  // Every transporter's live balance + a grand total across all of them.
  // Pass { branch_id, bill_month, bill_year } or { branch_id, from_date, to_date }
  // to also get billing-period totals; omit both for just live balances.
  summary: (params) => request(`/api/ledger/transporters/summary${qs(params)}`),
  create: (body) => post('/api/ledger/transporters', body),
  get: (id) => request(`/api/ledger/transporters/${id}`),
  raiseBill: (id, body) => post(`/api/ledger/transporters/${id}/pf-bill`, body),
  // A bill on the SAME ledger, opposite side — the transporter billed YOU
  // (e.g. they carried freight for you). Settled via `give` below with a
  // bill_reference_id, not a second ledger.
  raisePayableBill: (id, body) => post(`/api/ledger/transporters/${id}/payable-bill`, body),
  collect: (id, body) => post(`/api/ledger/transporters/${id}/collect`, body),
  give: (id, body) => post(`/api/ledger/transporters/${id}/give`, body),
};

// Screen 2 — Kanpur Delivery
export const deliveryApi = {
  getMerged: (params) => request(`/api/ledger/delivery${qs(params)}`),
  getIncome: (params) => request(`/api/ledger/delivery/income${qs(params)}`),
  getExpense: (params) => request(`/api/ledger/delivery/expense${qs(params)}`),
  income: (body) => post('/api/ledger/delivery/income', body),
  expense: (body) => post('/api/ledger/delivery/expense', body),
};

// One source of truth for "which branch am I looking at" — GET /api/branches.
export const branchesApi = {
  list: () => request(`/api/branches${qs({ is_active: true })}`),
};

// Screen 3 — Cash Manager (Galla)
export const cashManagerApi = {
  get: (params) => request(`/api/ledger/cash-manager${qs(params)}`),
  expense: (body) => post('/api/ledger/cash-manager/expense', body),
};

// Screen 4 — Truck Bhada
export const driversApi = {
  list: (branchId) => request(`/api/ledger/drivers${qs({ branch_id: branchId })}`),
  create: (body) => post('/api/ledger/drivers', body),
  get: (id) => request(`/api/ledger/drivers/${id}`),
  addBhada: (id, body) => post(`/api/ledger/drivers/${id}/bhada`, body),
  pay: (id, body) => post(`/api/ledger/drivers/${id}/pay`, body),
};

// Screen 5 — Labour Kharcha
export const labourApi = {
  list: (branchId) => request(`/api/ledger/labour${qs({ branch_id: branchId })}`),
  create: (body) => post('/api/ledger/labour', body),
  get: (id) => request(`/api/ledger/labour/${id}`),
  addExpense: (id, body) => post(`/api/ledger/labour/${id}/expense`, body),
  pay: (id, body) => post(`/api/ledger/labour/${id}/pay`, body),
};

// Screen 6 — Ledgers overview
export const overviewApi = {
  get: (branchId) => request(`/api/ledger/overview${qs({ branch_id: branchId })}`),
};

// Shared "cash or bank" plumbing — banks are picked from this list, or left
// blank to let the server use whichever bank is marked default.
export const banksApi = {
  list: (branchId) => request(`/api/ledger/banks${qs({ branch_id: branchId })}`),
  setDefault: (id, body) => post(`/api/ledger/banks/${id}/set-default`, body),
};

export const VOUCHER_TYPES = [
  { value: 'payment', label: 'Payment' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'journal', label: 'Journal' },
  { value: 'contra', label: 'Contra' },
  { value: 'sales', label: 'Sales' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'debit_note', label: 'Debit Note' },
  { value: 'credit_note', label: 'Credit Note' },
];

export const ENTITY_TYPES = [
  { value: '', label: 'All' },
  { value: 'ledger_group', label: 'Group' },
  { value: 'ledger', label: 'Ledger' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'voucher_entry', label: 'Voucher Entry' },
  { value: 'ledger_bill_reference', label: 'Bill Reference' },
];

export const AUDIT_ACTIONS = ['create', 'update', 'deactivate', 'reactivate', 'cancel', 'delete'];
