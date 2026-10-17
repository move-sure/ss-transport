'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Save, RefreshCw, Search, AlertTriangle, Building2 } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const API_BASE = 'https://api.movesure.io/api/bilty';

const EMPTY_FORM = {
  branch_id: '',
  company_id: '', // '' = branch default (no company)
  transport_name: '',
  gst: '',
  mobile_number: '',
  transport_address: '',
  website: '',
  bank_act_no_1: '',
  ifsc_code_1: '',
  bank_act_no_2: '',
  ifsc_code_2: ''
};

const TEXT_FIELDS = [
  { key: 'transport_name', label: 'Transport / Company Name', required: true, span: 2 },
  { key: 'gst', label: 'GST No' },
  { key: 'mobile_number', label: 'Mobile' },
  { key: 'transport_address', label: 'Address', span: 2, textarea: true },
  { key: 'website', label: 'Website', span: 2 },
  { key: 'bank_act_no_1', label: 'Bank 1 A/C No' },
  { key: 'ifsc_code_1', label: 'IFSC 1' },
  { key: 'bank_act_no_2', label: 'Bank 2 A/C No' },
  { key: 'ifsc_code_2', label: 'IFSC 2' }
];

const api = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || json?.status === 'error') {
    const err = new Error(json?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return json;
};

// Settings -> Permanent Details: one print header per branch (default) plus one row per company.
// The print layout is chosen per series in Settings -> Bill Books (bill_books.print_template).
const PermanentDetailsComponent = () => {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // row being edited, or null for create
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await api(`/permanent-details${branchFilter ? `?branch_id=${branchFilter}` : ''}`);
      setRows(json.data || []);
    } catch (err) {
      setError(`Could not load permanent details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [branchFilter]);

  // Reference data: branches + companies
  useEffect(() => {
    (async () => {
      const [branchRes, companyRes] = await Promise.all([
        supabase.from('branches').select('id, branch_name, branch_code').eq('is_active', true).order('branch_name'),
        supabase.from('companies').select('id, company_name').eq('is_active', true).order('company_name')
      ]);
      setBranches(branchRes.data || []);
      setCompanies(companyRes.data || []);
    })();
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);


  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, branch_id: branchFilter || '' });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...EMPTY_FORM,
      ...Object.fromEntries(Object.keys(EMPTY_FORM).map(k => [k, row[k] ?? '']))
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.branch_id) { setFormError('Select a branch'); return; }
    if (!form.transport_name.trim()) { setFormError('Transport / company name is required'); return; }

    const clean = (v) => (typeof v === 'string' ? v.trim() || null : v);
    setSaving(true);
    try {
      if (editing) {
        // branch_id / company_id can't change - send only changed fields
        const changes = {};
        TEXT_FIELDS.map(f => f.key).forEach(k => {
          const next = clean(form[k]);
          if ((next ?? null) !== (editing[k] ?? null)) changes[k] = next;
        });
        if (Object.keys(changes).length === 0) { setShowForm(false); return; }
        await api(`/permanent-details/${editing.id}`, { method: 'PUT', body: changes });
      } else {
        const body = {
          branch_id: form.branch_id,
          company_id: form.company_id || null,
          ...Object.fromEntries(TEXT_FIELDS.map(f => [f.key, clean(form[f.key])]))
        };
        await api('/permanent-details', { method: 'POST', body });
      }
      setShowForm(false);
      setEditing(null);
      await loadRows();
    } catch (err) {
      setFormError(
        err.status === 409
          ? (form.company_id ? 'This branch already has a header for that company.' : 'This branch already has a default header.')
          : err.message
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (row.is_default) return;
    if (!confirm(`Delete the ${row.company_name || 'company'} header for ${row.branch_name}?\n\nBilties of this company will print with the branch default header.`)) return;
    setDeletingId(row.id);
    setError('');
    try {
      await api(`/permanent-details/${row.id}`, { method: 'DELETE' });
      await loadRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const visible = rows
    .filter(r => !q || [r.branch_name, r.company_name, r.transport_name, r.gst, r.mobile_number]
      .some(v => v?.toLowerCase().includes(q)))
    .sort((a, b) =>
      (a.branch_name || '').localeCompare(b.branch_name || '') ||
      (a.is_default === b.is_default ? 0 : a.is_default ? -1 : 1) ||
      (a.company_name || '').localeCompare(b.company_name || ''));

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500';

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className={`${inputCls} md:w-64`}>
          <option value="">All branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
        </select>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, GST, mobile..."
            className={`${inputCls} pl-9`} />
        </div>
        <button onClick={loadRows} disabled={loading} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Header
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Each branch has one <b>Default</b> header (old bilties and bilties with no company). Add a header per company
        so that company&apos;s bills print its own name, GST and banks. The print layout is set per series in Bill Books.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* List */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="p-3 text-left">Branch</th>
              <th className="p-3 text-left">Header For</th>
              <th className="p-3 text-left">Name / GST</th>
              <th className="p-3 text-left">Mobile</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">Loading...</td></tr>
            )}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">No permanent details found.</td></tr>
            )}
            {visible.map(row => (
              <tr key={row.id} className="border-t border-gray-100 align-top">
                <td className="p-3 font-semibold text-gray-900">{row.branch_name || '-'}</td>
                <td className="p-3">
                  {row.is_default ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Default</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold text-xs">
                      <Building2 className="w-3.5 h-3.5" /> {row.company_name || 'Company'}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <div className="font-semibold text-gray-900">{row.transport_name || '-'}</div>
                  <div className="text-xs text-gray-500">{row.gst || 'No GST'}</div>
                </td>
                <td className="p-3 text-gray-700">{row.mobile_number || '-'}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(row)} title="Edit"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    {!row.is_default && (
                      <button onClick={() => handleDelete(row)} disabled={deletingId === row.id} title="Delete company header"
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50">
                        {deletingId === row.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={closeForm}>
          <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">
                {editing ? `Edit Header — ${editing.branch_name}${editing.is_default ? ' (Default)' : ` · ${editing.company_name}`}` : 'Add Print Header'}
              </h3>
              <button type="button" onClick={closeForm} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="p-5 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Branch *</label>
                  <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    disabled={!!editing} className={inputCls} required>
                    <option value="">Select branch...</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Company</label>
                  <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                    disabled={!!editing} className={inputCls}>
                    <option value="">Default (no company)</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
              </div>
              {editing && (
                <p className="text-xs text-gray-500 -mt-2">Branch and company can&apos;t be changed — add a new header instead.</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEXT_FIELDS.map(f => (
                  <div key={f.key} className={f.span === 2 ? 'md:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}{f.required && ' *'}</label>
                    {f.textarea ? (
                      <textarea rows={2} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className={inputCls} />
                    ) : (
                      <input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className={inputCls} required={f.required} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PermanentDetailsComponent;
