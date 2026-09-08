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
    cancel: (id, body) => post(`/api/ledger/vouchers/${id}/cancel`, body),
  },
  auditLog: {
    list: (params) => request(`/api/ledger/audit-log${qs(params)}`),
  },
};

// Screen 1 — Transport PF Collection
export const transportersApi = {
  list: (branchId) => request(`/api/ledger/transporters${qs({ branch_id: branchId })}`),
  create: (body) => post('/api/ledger/transporters', body),
  get: (id) => request(`/api/ledger/transporters/${id}`),
  raiseBill: (id, body) => post(`/api/ledger/transporters/${id}/pf-bill`, body),
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
