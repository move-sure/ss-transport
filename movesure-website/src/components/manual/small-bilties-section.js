'use client';

import { useState, useEffect, useRef } from 'react';
import { Layers, Plus, Pencil, Trash2, Check, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { stationBiltyApi, summarizeSmallBilties } from './station-bilty-api';

const EMPTY_ROW = { small_gr_no: '', no_of_packets: '' };

// Current local date-time (YYYY-MM-DDTHH:mm), sent as booked_at so each slip records when it was added
const nowLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const inputCls = 'w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-black bg-white';

/**
 * Small slips merged into one manual bilty - just a small GR no and its packages.
 * - With `biltyId` (editing a saved bilty): every add/edit/delete goes straight to the API.
 * - Without it (new bilty): rows are kept in `pendingItems` and saved after the bilty is created.
 */
const SmallBiltiesSection = ({
  biltyId,
  pendingItems,
  onPendingChange,
  mainPackets = 0,
  currentUserId,
  onCountChange
}) => {
  const isLive = !!biltyId;
  const [liveItems, setItems] = useState([]);
  const items = isLive ? liveItems : (pendingItems || []);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newRow, setNewRow] = useState(EMPTY_ROW);
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState(EMPTY_ROW);
  const newGrRef = useRef(null);

  // Load saved small bilties when editing
  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    stationBiltyApi.getMeta(biltyId)
      .then(data => { if (!cancelled) setItems(data?.small_bilties || []); })
      .catch(err => { if (!cancelled) setError(`Could not load small bilties: ${err.message}`); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [biltyId, isLive]);

  // Let the parent show the count on the collapsed "More options" header
  useEffect(() => {
    onCountChange?.(items.length);
  }, [items.length, onCountChange]);

  const setLocal = (next) => onPendingChange?.(next);

  const isDuplicate = (grNo, exceptId) =>
    items.some(i => i.small_gr_no?.toUpperCase() === grNo.trim().toUpperCase() && i.id !== exceptId);

  const handleAdd = async () => {
    setError('');
    if (!newRow.small_gr_no.trim()) {
      setError('Small GR No is required');
      newGrRef.current?.focus();
      return;
    }
    if (isDuplicate(newRow.small_gr_no)) {
      setError(`Small GR ${newRow.small_gr_no.toUpperCase()} is already added`);
      return;
    }
    const payload = {
      small_gr_no: newRow.small_gr_no.trim().toUpperCase(),
      no_of_packets: parseInt(newRow.no_of_packets) || 0,
      booked_at: nowLocal()
    };

    if (isLive) {
      setBusy(true);
      try {
        const data = await stationBiltyApi.addSmallBilty(biltyId, { ...payload, updated_by: currentUserId });
        setItems(data?.small_bilties || []);
      } catch (err) {
        setError(err.status === 409 ? `Small GR ${payload.small_gr_no} is already on this bilty` : err.message);
        return;
      } finally {
        setBusy(false);
      }
    } else {
      setLocal([...items, { ...payload, id: `local-${Date.now()}` }]);
    }
    setNewRow(EMPTY_ROW);
    setTimeout(() => newGrRef.current?.focus(), 0);
  };

  const startEdit = (item) => {
    setError('');
    setEditId(item.id);
    setEditRow({ small_gr_no: item.small_gr_no || '', no_of_packets: item.no_of_packets ?? '' });
  };

  const handleSaveEdit = async () => {
    setError('');
    if (!editRow.small_gr_no.trim()) {
      setError('Small GR No is required');
      return;
    }
    if (isDuplicate(editRow.small_gr_no, editId)) {
      setError(`Small GR ${editRow.small_gr_no.toUpperCase()} is already added`);
      return;
    }
    const fields = {
      small_gr_no: editRow.small_gr_no.trim().toUpperCase(),
      no_of_packets: parseInt(editRow.no_of_packets) || 0
    };

    if (isLive) {
      setBusy(true);
      try {
        const data = await stationBiltyApi.updateSmallBilty(biltyId, editId, { ...fields, updated_by: currentUserId });
        setItems(data?.small_bilties || []);
      } catch (err) {
        setError(err.status === 409 ? `Small GR ${fields.small_gr_no} is already on this bilty` : err.message);
        return;
      } finally {
        setBusy(false);
      }
    } else {
      setLocal(items.map(i => (i.id === editId ? { ...i, ...fields } : i)));
    }
    setEditId(null);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Remove small bilty ${item.small_gr_no}?`)) return;
    setError('');
    if (isLive) {
      setBusy(true);
      try {
        const data = await stationBiltyApi.deleteSmallBilty(biltyId, item.id, currentUserId);
        setItems(data?.small_bilties || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    } else {
      setLocal(items.filter(i => i.id !== item.id));
    }
  };

  // Enter inside these inputs must not submit the outer bilty form
  const onRowKeyDown = (action) => (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      action();
    } else if (e.key === 'Escape' && editId) {
      e.preventDefault();
      setEditId(null);
    }
  };

  const summary = summarizeSmallBilties(items);
  const packetsMismatch = summary.count > 0 && summary.total_packets !== (Number(mainPackets) || 0);

  const renderInputs = (row, setRow, onEnter, grRef) => (
    <>
      <td className="p-1"><input ref={grRef} className={`${inputCls} uppercase font-semibold`} value={row.small_gr_no} placeholder="Small GR No"
        onChange={e => setRow({ ...row, small_gr_no: e.target.value.toUpperCase() })} onKeyDown={onRowKeyDown(onEnter)} /></td>
      <td className="p-1"><input type="number" min="0" className={inputCls} value={row.no_of_packets} placeholder="Pkgs"
        onChange={e => setRow({ ...row, no_of_packets: e.target.value })} onKeyDown={onRowKeyDown(onEnter)} /></td>
    </>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <Layers className="w-4 h-4 text-teal-600" />
          Small Bilties
          {summary.count > 0 && (
            <span className="ml-1 text-xs font-bold bg-teal-600 text-white px-2 py-0.5 rounded-full">{summary.count}</span>
          )}
        </div>
        {(loading || busy) && <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />}
      </div>

      {error && (
        <div className="mb-2 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg border border-teal-200 max-w-md">
        <table className="w-full text-sm">
          <thead className="bg-teal-50 text-teal-900 text-xs uppercase">
            <tr>
              <th className="p-2 text-left">Small GR *</th>
              <th className="p-2 text-left w-24">Pkgs</th>
              <th className="p-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} className="p-3 text-center text-gray-500 text-xs">Loading...</td></tr>
            )}
            {!loading && items.map(item => (
              editId === item.id ? (
                <tr key={item.id} className="bg-amber-50 border-t border-teal-100">
                  {renderInputs(editRow, setEditRow, handleSaveEdit)}
                  <td className="p-1">
                    <div className="flex gap-1 justify-end">
                      <button type="button" onClick={handleSaveEdit} disabled={busy} title="Save (Enter)"
                        className="p-1.5 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"><Check className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setEditId(null)} title="Cancel (Esc)"
                        className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"><X className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={item.id} className="border-t border-teal-100">
                  <td className="p-2 font-bold text-gray-900">{item.small_gr_no}</td>
                  <td className="p-2 text-gray-800">{item.no_of_packets ?? 0}</td>
                  <td className="p-2">
                    <div className="flex gap-1 justify-end">
                      <button type="button" onClick={() => startEdit(item)} disabled={busy} title="Edit" tabIndex={-1}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"><Pencil className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleDelete(item)} disabled={busy} title="Remove" tabIndex={-1}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )
            ))}

            {/* Add row */}
            {!loading && (
              <tr className="border-t border-teal-200 bg-teal-50/40">
                {renderInputs(newRow, setNewRow, handleAdd, newGrRef)}
                <td className="p-1">
                  <button type="button" onClick={handleAdd} disabled={busy} title="Add (Enter)"
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 text-xs font-semibold">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </td>
              </tr>
            )}
          </tbody>

          {summary.count > 0 && (
            <tfoot className="bg-teal-50 text-xs font-semibold text-teal-900 border-t border-teal-200">
              <tr>
                <td className="p-2">TOTAL ({summary.count})</td>
                <td className={`p-2 ${packetsMismatch ? 'text-red-600' : ''}`}>{summary.total_packets}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {packetsMismatch && (
        <div className="mt-2 flex items-center gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Small bilties total <b>{summary.total_packets}</b> pkgs, but this bilty has <b>{Number(mainPackets) || 0}</b> bags.
          </span>
        </div>
      )}
    </div>
  );
};

export default SmallBiltiesSection;
