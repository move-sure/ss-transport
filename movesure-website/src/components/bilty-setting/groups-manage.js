'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Power, RotateCcw, Check, X, RefreshCw, Users, AlertTriangle, Eye } from 'lucide-react';
import { biltyGroupsApi } from '../manual/station-bilty-api';

const EMPTY_FORM = { name: '', description: '' };

// Settings -> Groups: create, rename, deactivate / reactivate bilty groups (MRM, RONKEY METAL, ...)
export default function GroupsManageComponent({ userId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [busyId, setBusyId] = useState(null);
  const [viewGroup, setViewGroup] = useState(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setGroups(await biltyGroupsApi.list({ includeInactive: true }));
    } catch (err) {
      setError(`Could not load groups: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError('');
    try {
      await biltyGroupsApi.create({ name: form.name.trim(), description: form.description.trim(), createdBy: userId });
      setForm(EMPTY_FORM);
      await loadGroups();
    } catch (err) {
      setError(err.status === 409 ? `Group "${form.name.trim().toUpperCase()}" already exists` : err.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (group) => {
    setEditId(group.id);
    setEditForm({ name: group.name, description: group.description || '' });
    setError('');
  };

  const handleSaveEdit = async (group) => {
    if (!editForm.name.trim()) return;
    const fields = {};
    if (editForm.name.trim().toUpperCase() !== group.name) fields.name = editForm.name.trim();
    if ((editForm.description.trim() || '') !== (group.description || '')) fields.description = editForm.description.trim() || null;
    if (Object.keys(fields).length === 0) { setEditId(null); return; }

    setBusyId(group.id);
    setError('');
    try {
      await biltyGroupsApi.update(group.id, fields, userId);
      setEditId(null);
      await loadGroups();
    } catch (err) {
      setError(err.status === 409 ? `Group "${editForm.name.trim().toUpperCase()}" already exists` : err.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (group) => {
    if (group.is_active && !confirm(
      `Deactivate group ${group.name}?\n\nIt will disappear from the manual bilty dropdown. ` +
      `Bilties already tagged keep it.`
    )) return;
    setBusyId(group.id);
    setError('');
    try {
      if (group.is_active) await biltyGroupsApi.deactivate(group.id, userId);
      else await biltyGroupsApi.update(group.id, { is_active: true }, userId);
      await loadGroups();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const q = search.trim().toUpperCase();
  const visible = groups.filter(g =>
    (showInactive || g.is_active) &&
    (!q || g.name.includes(q) || g.description?.toUpperCase().includes(q))
  );
  const activeCount = groups.filter(g => g.is_active).length;

  return (
    <div className="space-y-6">
      {/* Create */}
      <form onSubmit={handleCreate} className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600" /> New Group
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
            placeholder="Group name, e.g. RONKEY METAL"
            maxLength={100}
            className="px-3 py-2 border border-gray-300 rounded-lg text-black bg-white font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optional), e.g. All Ronkey part names"
            className="px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={creating || !form.name.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Group bilties whose party names differ but belong together. Pick the group on the manual bilty entry form.
        </p>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-indigo-600" />
          Show deactivated
        </label>
        <span className="text-sm text-gray-500">{activeCount} active / {groups.length} total</span>
        <button onClick={loadGroups} disabled={loading} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* List */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="p-3 text-left">Group</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && groups.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading groups...</td></tr>
            )}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-500">
                {groups.length === 0 ? 'No groups yet. Create one above.' : 'No groups match your search.'}
              </td></tr>
            )}
            {visible.map(group => {
              const isEditing = editId === group.id;
              const busy = busyId === group.id;
              return (
                <tr key={group.id} className={`border-t border-gray-100 ${group.is_active ? '' : 'bg-gray-50 text-gray-400'}`}>
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value.toUpperCase() })}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(group); if (e.key === 'Escape') setEditId(null); }}
                        maxLength={100}
                        autoFocus
                        className="w-full px-2 py-1 border border-indigo-300 rounded text-black bg-white font-semibold uppercase"
                      />
                    ) : (
                      <span className={`font-bold ${group.is_active ? 'text-gray-900' : ''}`}>{group.name}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(group); if (e.key === 'Escape') setEditId(null); }}
                        className="w-full px-2 py-1 border border-indigo-300 rounded text-black bg-white"
                      />
                    ) : (
                      <span className={group.is_active ? 'text-gray-600' : ''}>{group.description || '-'}</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      group.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {group.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleSaveEdit(group)} disabled={busy} title="Save"
                            className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditId(null)} title="Cancel"
                            className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setViewGroup(group)} title="View bilties"
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => startEdit(group)} disabled={busy} title="Rename / edit"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => toggleActive(group)} disabled={busy}
                            title={group.is_active ? 'Deactivate' : 'Reactivate'}
                            className={`p-1.5 rounded disabled:opacity-50 ${group.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                            {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : group.is_active ? <Power className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewGroup && <GroupBiltiesModal group={viewGroup} onClose={() => setViewGroup(null)} />}
    </div>
  );
}

// Manual bilties tagged with one group
const GroupBiltiesModal = ({ group, onClose }) => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 50;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    biltyGroupsApi.bilties(group.id, page, pageSize)
      .then(res => { if (!cancelled) { setRows(res.data || []); setTotal(res.total || 0); setError(''); } })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [group.id, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" /> {group.name}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="overflow-auto flex-1">
          {error && <div className="m-4 text-sm text-red-600">{error}</div>}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase sticky top-0">
              <tr>
                <th className="p-2 text-left">GR No</th>
                <th className="p-2 text-left">Station</th>
                <th className="p-2 text-left">Consignor</th>
                <th className="p-2 text-left">Consignee</th>
                <th className="p-2 text-right">Pkgs</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-left">Payment</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-6 text-center text-gray-500">Loading...</td></tr>}
              {!loading && rows.length === 0 && !error && (
                <tr><td colSpan={7} className="p-6 text-center text-gray-500">No bilties tagged with this group yet.</td></tr>
              )}
              {!loading && rows.map(b => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="p-2 font-semibold text-gray-900">{b.gr_no}</td>
                  <td className="p-2 text-gray-700">{b.station}</td>
                  <td className="p-2 text-gray-700">{b.consignor || '-'}</td>
                  <td className="p-2 text-gray-700">{b.consignee || '-'}</td>
                  <td className="p-2 text-right text-gray-700">{b.no_of_packets ?? 0}</td>
                  <td className="p-2 text-right text-gray-700">₹{Number(b.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="p-2 text-gray-700 uppercase text-xs">{b.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 p-3 border-t text-sm">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <span className="text-gray-600">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
};
