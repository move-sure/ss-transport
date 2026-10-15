// Client for the manual (station) bilty extras API:
// small bilties, group ref, short packages and advance.
// Always address a bilty by its row `id` - the same manual GR no can exist under two stations.

const API_ROOT = 'https://api.movesure.io/api';
const API_BASE = `${API_ROOT}/station-bilty`;

const request = async (path, { method = 'GET', body } = {}, base = API_BASE) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON error body
  }

  if (!res.ok || json?.status === 'error') {
    const err = new Error(json?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return json;
};

const enc = encodeURIComponent;

export const stationBiltyApi = {
  lookup: (grNo, station) =>
    request(`/lookup?gr_no=${enc(grNo)}${station ? `&station=${enc(station)}` : ''}`).then(r => r.data || []),

  getMeta: (id) => request(`/${id}/meta`).then(r => r.data),

  // Send only the fields to change
  updateMeta: (id, fields) => request(`/${id}/meta`, { method: 'PATCH', body: fields }).then(r => r.data),

  addSmallBilty: (id, item) =>
    request(`/${id}/small-bilties`, { method: 'POST', body: item }).then(r => r.data),

  updateSmallBilty: (id, itemId, fields) =>
    request(`/${id}/small-bilties/${itemId}`, { method: 'PUT', body: fields }).then(r => r.data),

  deleteSmallBilty: (id, itemId, updatedBy) =>
    request(`/${id}/small-bilties/${itemId}${updatedBy ? `?updated_by=${enc(updatedBy)}` : ''}`, { method: 'DELETE' })
      .then(r => r.data),

  findBySmallGr: (smallGrNo) => request(`/by-small-gr/${enc(smallGrNo)}`).then(r => r.data || [])
};

// Bilty groups (MRM, RONKEY METAL, ...) managed in Settings -> Groups
const groupsRequest = (path, options) => request(path, options, `${API_ROOT}/bilty-groups`);

export const biltyGroupsApi = {
  // Active groups only unless includeInactive
  list: ({ includeInactive = false, q = '' } = {}) => {
    const params = new URLSearchParams();
    if (includeInactive) params.set('include_inactive', 'true');
    if (q.trim()) params.set('q', q.trim());
    const qs = params.toString();
    return groupsRequest(qs ? `?${qs}` : '').then(r => r.data || []);
  },

  get: (id) => groupsRequest(`/${id}`).then(r => r.data),

  create: ({ name, description, createdBy }) =>
    groupsRequest('', { method: 'POST', body: { name, description: description || null, created_by: createdBy } })
      .then(r => r.data),

  // Send only the fields to change (name, description, is_active)
  update: (id, fields, updatedBy) =>
    groupsRequest(`/${id}`, { method: 'PUT', body: { ...fields, updated_by: updatedBy } }).then(r => r.data),

  // Soft delete (is_active = false); reactivate with update(id, { is_active: true })
  deactivate: (id, updatedBy) =>
    groupsRequest(`/${id}${updatedBy ? `?updated_by=${enc(updatedBy)}` : ''}`, { method: 'DELETE' }).then(r => r.data),

  bilties: (id, page = 1, pageSize = 50) => groupsRequest(`/${id}/bilties?page=${page}&page_size=${pageSize}`)
};

// Totals for a list of small bilties (same shape as the server's small_bilty_summary)
export const summarizeSmallBilties = (items = []) => ({
  count: items.length,
  total_packets: items.reduce((s, i) => s + (Number(i.no_of_packets) || 0), 0),
  total_weight: items.reduce((s, i) => s + (Number(i.weight) || 0), 0),
  total_amount: items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
});

// Body for PATCH /meta from the form's extra fields
export const buildMetaPayload = (formData, updatedBy) => {
  const isAdvance = !!formData.is_advance_bilty;
  const payload = {
    group_id: formData.group_id || null,
    short_packages_count: parseInt(formData.short_packages_count) || 0,
    is_advance_bilty: isAdvance,
    advance_amount: isAdvance ? (parseFloat(formData.advance_amount) || 0) : null
  };
  // When advance is on, the server works out remaining = amount - advance
  if (!isAdvance) payload.remaining_amount = null;
  if (updatedBy) payload.updated_by = updatedBy;
  return payload;
};
