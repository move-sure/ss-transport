'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Edit2, Trash2, Loader2, X, ChevronDown, ChevronUp, FileText,
  Lock, Unlock, RefreshCw, Package, AlertCircle, CheckCircle2,
} from 'lucide-react';

const API_BASE = 'https://movesure-backend.onrender.com';

/* ─── helpers ─────────────────────────────────────────────────────────── */
function fmt(n) { return (parseFloat(n) || 0).toLocaleString('en-IN'); }

/* ─── Transport autocomplete input ────────────────────────────────────── */
function TransportAutocomplete({ value, onChange, onGstFill, transports, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);
  const ref = useRef(null);

  useEffect(() => { setQ(value); }, [value]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return transports.slice(0, 20);
    const lq = q.toLowerCase();
    return transports.filter(t => t.transport_name?.toLowerCase().includes(lq)).slice(0, 20);
  }, [q, transports]);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={q}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || 'Transport name...'}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto text-xs">
          {filtered.map(t => (
            <li key={t.id}
              className="px-3 py-2 hover:bg-violet-50 cursor-pointer flex flex-col"
              onMouseDown={() => {
                setQ(t.transport_name);
                onChange(t.transport_name);
                onGstFill?.(t.gst_number || '');
                setOpen(false);
              }}>
              <span className="font-semibold text-gray-900">{t.transport_name}</span>
              {t.gst_number && <span className="text-gray-400 text-[10px]">{t.gst_number}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Create Modal ─────────────────────────────────────────────────────── */
function CreateModal({ challanNo, enrichedBilties, transports, token, userId, onCreated, onClose }) {
  const [transportName, setTransportName] = useState('');
  const [transportGstin, setTransportGstin] = useState('');
  const [pohonchPrefix, setPohonchPrefix] = useState('');
  const [grInput, setGrInput] = useState('');
  const [selectedGrs, setSelectedGrs] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);

  const allGrs = useMemo(() => enrichedBilties.map(b => b.gr_no).filter(Boolean), [enrichedBilties]);

  const grList = useMemo(() => {
    const typed = grInput.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean);
    const combined = [...new Set([...typed, ...[...selectedGrs]])];
    return combined;
  }, [grInput, selectedGrs]);

  const toggleGr = (gr) => {
    setSelectedGrs(prev => {
      const n = new Set(prev);
      n.has(gr) ? n.delete(gr) : n.add(gr);
      return n;
    });
  };

  const handleCreate = async () => {
    setError('');
    if (!transportName.trim()) { setError('Transport name is required.'); return; }
    if (!grList.length) { setError('Add at least one GR number.'); return; }
    setSaving(true);
    try {
      const payload = {
        transport_name: transportName.trim(),
        transport_gstin: transportGstin.trim() || undefined,
        challan_nos: [challanNo],
        gr_items: grList.map(gr => ({ gr_no: gr, challan_no: challanNo })),
        pohonch_prefix: pohonchPrefix.trim() || undefined,
        created_by: userId,
      };
      const res = await fetch(`${API_BASE}/api/pohonch/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.status === 'success') {
        if (json.warnings?.unmatched_gr_nos?.length) setWarnings(json.warnings.unmatched_gr_nos);
        onCreated(json.pohonch_number);
      } else {
        setError(json.message || json.detail || 'Failed to create.');
      }
    } catch (e) {
      setError('Network error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-100 rounded-xl"><Plus className="h-4 w-4 text-violet-600"/></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Create Cross Challan</h3>
              <p className="text-[10px] text-gray-500">Challan #{challanNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Transport */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">TRANSPORT NAME *</label>
              <TransportAutocomplete
                value={transportName}
                onChange={setTransportName}
                onGstFill={setTransportGstin}
                transports={transports}
                placeholder="Type transport name..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">TRANSPORT GSTIN</label>
              <input type="text" value={transportGstin} onChange={e => setTransportGstin(e.target.value.toUpperCase())}
                placeholder="09AACPY1378F3ZC"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none font-mono"/>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">PREFIX (optional)</label>
              <input type="text" value={pohonchPrefix} onChange={e => setPohonchPrefix(e.target.value.toUpperCase())}
                placeholder="Auto-derived if blank"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none font-mono uppercase"/>
            </div>
          </div>

          {/* GR Selection */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">SELECT / ENTER GR NUMBERS *</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Quick-select from challan bilties */}
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] text-gray-500 mb-2">Quick-select from this challan ({allGrs.length} GRs):</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {allGrs.map(gr => (
                    <button key={gr} onClick={() => toggleGr(gr)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border font-mono transition-colors ${selectedGrs.has(gr) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300'}`}>
                      {gr}
                    </button>
                  ))}
                </div>
              </div>
              {/* Manual entry */}
              <div className="p-3">
                <label className="text-[10px] text-gray-400 block mb-1">Or type GR numbers (comma / newline separated):</label>
                <textarea value={grInput} onChange={e => setGrInput(e.target.value)}
                  rows={3} placeholder="22789, 22790, 22791..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none resize-none"/>
              </div>
            </div>
            {grList.length > 0 && (
              <p className="text-[10px] text-violet-700 mt-1 font-semibold">{grList.length} GR(s) selected: {grList.slice(0, 6).join(', ')}{grList.length > 6 ? ` +${grList.length - 6} more` : ''}</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0"/>{error}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <p className="font-semibold mb-1">Unmatched GRs (amounts will be 0):</p>
              <p>{warnings.join(', ')}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !transportName.trim() || !grList.length}
            className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm">
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/>Creating...</> : <><Plus className="h-3.5 w-3.5"/>Create Cross Challan</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Modal ───────────────────────────────────────────────────────── */
function EditModal({ pohonch, challanNo, enrichedBilties, token, userId, onEdited, onClose }) {
  const [newNumber, setNewNumber] = useState(pohonch.pohonch_number);
  const [removeGrs, setRemoveGrs] = useState(new Set());
  const [addGrInput, setAddGrInput] = useState('');
  const [force, setForce] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentGrs = useMemo(() =>
    Array.isArray(pohonch.bilty_metadata) ? pohonch.bilty_metadata : [],
    [pohonch]
  );

  const toggleRemove = (gr) => {
    setRemoveGrs(prev => { const n = new Set(prev); n.has(gr) ? n.delete(gr) : n.add(gr); return n; });
  };

  const handleEdit = async () => {
    setError('');
    const body = { user_id: userId };
    if (newNumber.trim() !== pohonch.pohonch_number) body.new_pohonch_number = newNumber.trim();
    const addGrs = addGrInput.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean);
    if (addGrs.length) body.add_gr_items = addGrs.map(gr => ({ gr_no: gr, challan_no: challanNo }));
    if (removeGrs.size) body.remove_gr_nos = [...removeGrs];
    if (force) body.force = true;

    if (!body.new_pohonch_number && !body.add_gr_items && !body.remove_gr_nos) {
      setError('No changes to save.'); return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/pohonch/${pohonch.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.status === 'success') {
        onEdited(json.message || 'Updated successfully');
      } else if (res.status === 409 && !force) {
        setError('This pohonch is signed. Enable "Force Edit" to override.');
      } else {
        setError(json.message || json.detail || `Error ${res.status}`);
      }
    } catch (e) {
      setError('Network error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-xl"><Edit2 className="h-4 w-4 text-blue-600"/></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Edit Cross Challan</h3>
              <p className="text-[10px] text-gray-500 font-mono">{pohonch.pohonch_number} · {pohonch.transport_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Rename */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">POHONCH NUMBER</label>
            <input type="text" value={newNumber} onChange={e => setNewNumber(e.target.value.toUpperCase())}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"/>
            {newNumber !== pohonch.pohonch_number && (
              <p className="text-[10px] text-amber-600 mt-0.5">Will rename from {pohonch.pohonch_number} → {newNumber}</p>
            )}
          </div>

          {/* Current GRs — with remove toggles */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">CURRENT GRs ({currentGrs.length}) — check to remove</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {currentGrs.length === 0 ? (
                <p className="text-xs text-gray-400 p-3">No GRs</p>
              ) : (
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-bold text-gray-500">GR#</th>
                      <th className="px-2 py-1.5 text-left font-bold text-gray-500">Consignee</th>
                      <th className="px-2 py-1.5 text-right font-bold text-gray-500">Amt</th>
                      <th className="px-2 py-1.5 text-center font-bold text-gray-500">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {currentGrs.map(b => (
                      <tr key={b.gr_no} className={removeGrs.has(b.gr_no) ? 'bg-red-50 line-through text-gray-700' : ''}>
                        <td className="px-2 py-1.5 font-mono font-semibold">{b.gr_no}</td>
                        <td className="px-2 py-1.5 text-gray-600 truncate max-w-[120px]">{b.consignee || '-'}</td>
                        <td className="px-2 py-1.5 text-right">₹{fmt(b.amount)}</td>
                        <td className="px-2 py-1.5 text-center">
                          <button onClick={() => toggleRemove(b.gr_no)}
                            className={`text-[10px] px-2 py-0.5 rounded border font-semibold transition-colors ${removeGrs.has(b.gr_no) ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-500'}`}>
                            {removeGrs.has(b.gr_no) ? 'Undo' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {removeGrs.size > 0 && (
              <p className="text-[10px] text-red-600 mt-1 font-semibold">{removeGrs.size} GR(s) marked for removal</p>
            )}
          </div>

          {/* Add new GRs */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">ADD NEW GR NUMBERS</label>
            <textarea value={addGrInput} onChange={e => setAddGrInput(e.target.value)}
              rows={2} placeholder="22900, 22901..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none resize-none"/>
          </div>

          {/* Force edit */}
          {pohonch.is_signed && (
            <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} className="rounded"/>
              <Lock className="h-3.5 w-3.5"/>
              <span>Force edit (pohonch is signed)</span>
            </label>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0"/>{error}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleEdit} disabled={saving}
            className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm">
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/>Saving...</> : <><Edit2 className="h-3.5 w-3.5"/>Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Section Component ───────────────────────────────────────────── */
export default function CrossChallanManagement({
  challanNo,
  enrichedBilties,
  transports,
  token,
  user,
  onRefreshCrossMap,
}) {
  const [pohonchList, setPohonchList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [editingPohonch, setEditingPohonch] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [signing, setSigning] = useState(null);
  const [sectionOpen, setSectionOpen] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const fetchList = useCallback(async () => {
    if (!challanNo) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/pohonch/list?page_size=200`, {
        headers: headers(),
      });
      const json = await res.json();
      if (json.status === 'success') {
        const filtered = (json.data || []).filter(p => {
          const meta = p.challan_metadata;
          if (Array.isArray(meta)) return meta.includes(challanNo);
          if (typeof meta === 'string') {
            try { const arr = JSON.parse(meta); return Array.isArray(arr) && arr.includes(challanNo); } catch { return false; }
          }
          return false;
        });
        setPohonchList(filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }
    } catch (e) {
      console.error('CrossChallan list error:', e);
    } finally {
      setLoading(false);
    }
  }, [challanNo, headers]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleCreated = async (pohonchNumber) => {
    setShowCreate(false);
    await fetchList();
    onRefreshCrossMap?.();
    flash(`Cross Challan ${pohonchNumber} created successfully!`);
  };

  const handleEdited = async (message) => {
    setEditingPohonch(null);
    await fetchList();
    onRefreshCrossMap?.();
    flash(message);
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete Cross Challan "${p.pohonch_number}"?\n\nThis is permanent and cannot be undone.`)) return;
    setDeleting(p.id);
    try {
      const res = await fetch(`${API_BASE}/api/pohonch/${p.id}${user?.id ? `?user_id=${user.id}` : ''}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const json = await res.json();
      if (json.status === 'success') {
        await fetchList();
        onRefreshCrossMap?.();
        flash(`${p.pohonch_number} deleted.`);
      } else {
        alert('Delete failed: ' + (json.message || json.detail || JSON.stringify(json)));
      }
    } catch (e) {
      alert('Network error: ' + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleSignToggle = async (p) => {
    const isSigned = p.is_signed;
    const action = isSigned ? 'unsign' : 'sign';
    if (!confirm(`${isSigned ? 'Unsign' : 'Sign'} Cross Challan "${p.pohonch_number}"?`)) return;
    setSigning(p.id);
    try {
      const res = await fetch(`${API_BASE}/api/pohonch/${p.id}/${action}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ user_id: user?.id }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        await fetchList();
        flash(`${p.pohonch_number} ${isSigned ? 'unsigned' : 'signed'}.`);
      } else {
        alert(`${action} failed: ` + (json.message || JSON.stringify(json)));
      }
    } catch (e) {
      alert('Network error: ' + e.message);
    } finally {
      setSigning(null);
    }
  };

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const totalBilties = pohonchList.reduce((s, p) => s + (p.total_bilties || 0), 0);
  const totalAmt = pohonchList.reduce((s, p) => s + (parseFloat(p.total_amount) || 0), 0);
  const totalKaat = pohonchList.reduce((s, p) => s + (parseFloat(p.total_kaat) || 0), 0);

  return (
    <>
      {/* ── Section Panel ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Section header */}
        <button
          onClick={() => setSectionOpen(p => !p)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
              <FileText className="h-4 w-4 text-white"/>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">Cross Challan Management</p>
              <p className="text-[10px] text-gray-500">
                {loading ? 'Loading...' : `${pohonchList.length} cross challan${pohonchList.length !== 1 ? 's' : ''} · ${totalBilties} GRs · ₹${fmt(totalAmt)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {successMsg && (
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3"/>{successMsg}
              </span>
            )}
            <button
              onClick={e => { e.stopPropagation(); fetchList(); }}
              className="p-1 rounded-lg hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`}/>
            </button>
            <button
              onClick={e => { e.stopPropagation(); setShowCreate(true); }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[11px] font-bold rounded-lg hover:from-violet-600 hover:to-purple-700 shadow-sm"
            >
              <Plus className="h-3 w-3"/>New
            </button>
            {sectionOpen ? <ChevronUp className="h-4 w-4 text-gray-400"/> : <ChevronDown className="h-4 w-4 text-gray-400"/>}
          </div>
        </button>

        {/* Section body */}
        {sectionOpen && (
          <div className="border-t border-gray-100">
            {loading && pohonchList.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 text-violet-500 animate-spin"/>
                <span className="ml-2 text-xs text-gray-500">Loading cross challans...</span>
              </div>
            ) : pohonchList.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2"/>
                <p className="text-xs text-gray-400">No cross challans yet for this challan.</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg border border-violet-200 hover:bg-violet-100">
                  <Plus className="h-3.5 w-3.5"/>Create First Cross Challan
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {pohonchList.map(p => {
                  const bilties = Array.isArray(p.bilty_metadata) ? p.bilty_metadata : [];
                  return (
                    <div key={p.id} className="px-4 py-3">
                      {/* Row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Number + status */}
                        <div className="flex items-center gap-2 min-w-[110px]">
                          <span className="font-mono text-sm font-bold text-violet-700">{p.pohonch_number}</span>
                          {p.is_signed
                            ? <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Lock className="h-2.5 w-2.5"/>SIGNED</span>
                            : <span className="text-[9px] font-bold bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded-full">DRAFT</span>
                          }
                        </div>

                        {/* Transport */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{p.transport_name}</p>
                          {p.transport_gstin && <p className="text-[10px] text-gray-400 font-mono">{p.transport_gstin}</p>}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                            <Package className="h-3 w-3 inline text-gray-400 mr-0.5"/>{p.total_bilties || bilties.length} GRs
                          </span>
                          <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-100">
                            Amt: ₹{fmt(p.total_amount)}
                          </span>
                          <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold border border-rose-100">
                            Kaat: ₹{fmt(p.total_kaat)}
                          </span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100">
                            PF: ₹{fmt(p.total_pf)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => toggleExpand(p.id)} title="Show GR list"
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                            {expanded[p.id] ? <ChevronUp className="h-3.5 w-3.5"/> : <ChevronDown className="h-3.5 w-3.5"/>}
                          </button>
                          <button onClick={() => handleSignToggle(p)} disabled={signing === p.id} title={p.is_signed ? 'Unsign' : 'Sign'}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${p.is_signed ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-emerald-50 text-emerald-600'}`}>
                            {signing === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : p.is_signed ? <Unlock className="h-3.5 w-3.5"/> : <Lock className="h-3.5 w-3.5"/>}
                          </button>
                          <button onClick={() => setEditingPohonch(p)} title="Edit"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                            <Edit2 className="h-3.5 w-3.5"/>
                          </button>
                          <button onClick={() => handleDelete(p)} disabled={deleting === p.id} title="Delete"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50">
                            {deleting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Trash2 className="h-3.5 w-3.5"/>}
                          </button>
                        </div>
                      </div>

                      {/* Expanded GR table */}
                      {expanded[p.id] && bilties.length > 0 && (
                        <div className="mt-3 ml-1 rounded-xl border border-gray-100 overflow-hidden">
                          <table className="w-full text-[11px]">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                <th className="px-2.5 py-1.5 text-left font-bold text-gray-500">GR#</th>
                                <th className="px-2.5 py-1.5 text-left font-bold text-gray-500">Consignor</th>
                                <th className="px-2.5 py-1.5 text-left font-bold text-gray-500">Consignee</th>
                                <th className="px-2.5 py-1.5 text-left font-bold text-gray-500">Dest</th>
                                <th className="px-2.5 py-1.5 text-center font-bold text-gray-500">Pkts</th>
                                <th className="px-2.5 py-1.5 text-right font-bold text-gray-500">Amt</th>
                                <th className="px-2.5 py-1.5 text-right font-bold text-gray-500">Kaat</th>
                                <th className="px-2.5 py-1.5 text-right font-bold text-gray-500">PF</th>
                                <th className="px-2.5 py-1.5 text-center font-bold text-gray-500">Pay</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {bilties.map((b, idx) => (
                                <tr key={b.gr_no || idx} className="hover:bg-gray-50">
                                  <td className="px-2.5 py-1.5 font-mono font-semibold text-violet-700">{b.gr_no}</td>
                                  <td className="px-2.5 py-1.5 text-gray-700 max-w-[100px] truncate">{b.consignor || '-'}</td>
                                  <td className="px-2.5 py-1.5 text-gray-700 max-w-[100px] truncate">{b.consignee || '-'}</td>
                                  <td className="px-2.5 py-1.5 text-gray-600">{b.destination || '-'}</td>
                                  <td className="px-2.5 py-1.5 text-center text-gray-600">{b.packages || 0}</td>
                                  <td className="px-2.5 py-1.5 text-right font-semibold text-gray-600">₹{fmt(b.amount)}</td>
                                  <td className="px-2.5 py-1.5 text-right text-rose-600 font-semibold">₹{fmt(b.kaat)}</td>
                                  <td className="px-2.5 py-1.5 text-right text-emerald-700 font-semibold">₹{fmt(b.pf)}</td>
                                  <td className="px-2.5 py-1.5 text-center">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${b.is_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                      {b.payment_mode || '-'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t border-gray-200">
                              <tr className="font-bold text-[11px]">
                                <td colSpan={5} className="px-2.5 py-1.5 text-gray-700">TOTAL ({bilties.length})</td>
                                <td className="px-2.5 py-1.5 text-right text-gray-700">₹{fmt(p.total_amount)}</td>
                                <td className="px-2.5 py-1.5 text-right text-rose-600">₹{fmt(p.total_kaat)}</td>
                                <td className="px-2.5 py-1.5 text-right text-emerald-700">₹{fmt(p.total_pf)}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Summary footer */}
                {pohonchList.length > 1 && (
                  <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <span className="text-gray-600">{pohonchList.length} cross challans · {totalBilties} GRs</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">Amt: ₹{fmt(totalAmt)}</span>
                    <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">Kaat: ₹{fmt(totalKaat)}</span>
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">PF: ₹{fmt(totalAmt - totalKaat)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <CreateModal
          challanNo={challanNo}
          enrichedBilties={enrichedBilties}
          transports={transports}
          token={token}
          userId={user?.id}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* ── Edit Modal ── */}
      {editingPohonch && (
        <EditModal
          pohonch={editingPohonch}
          challanNo={challanNo}
          enrichedBilties={enrichedBilties}
          token={token}
          userId={user?.id}
          onEdited={handleEdited}
          onClose={() => setEditingPohonch(null)}
        />
      )}
    </>
  );
}
