'use client';

import { useState, useMemo } from 'react';
import { Loader2, Search, CheckCircle2, AlertTriangle, X, Send, Calculator } from 'lucide-react';
import { transportLedgersApi } from '../api';
import { formatINR, formatDate } from '../helpers';
import TransportPicker from './TransportPicker';
import AddKaatModal from './AddKaatModal';
import { SOURCE_TAG, rowStatus, pfOf } from './shared';

const FILTERS = [
  ['todo', 'To assign'],
  ['all', 'All'],
  ['undetected', 'No transport'],
  ['nokaat', 'No kaat'],
  ['assigned', 'Assigned'],
  ['blocked', 'Blocked'],
  ['settled', 'Settled elsewhere']
];

/**
 * Received bilties with a transport per row (suggested, or picked by the user),
 * selection, totals and "Assign selected". Used by a challan and by Unassigned Bilties.
 */
export default function BiltyAssignTable({ rows = [], loading, userId, onAssigned, showChallan = false, toolbar = null }) {
  const [filter, setFilter] = useState('todo');
  const [q, setQ] = useState('');
  const [overrides, setOverrides] = useState({}); // gr_no -> option
  const [selected, setSelected] = useState({});   // gr_no -> true
  const [includeSettled, setIncludeSettled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [kaatRows, setKaatRows] = useState(null); // rows for the Add kaat modal

  const withStatus = useMemo(
    () => rows.map((r) => ({ r, s: rowStatus(r, overrides[r.gr_no]) })),
    [rows, overrides]
  );

  const counts = useMemo(() => {
    const c = { all: withStatus.length, todo: 0 };
    withStatus.forEach(({ s }) => {
      c[s.key] = (c[s.key] || 0) + 1;
      if (['ready', 'nokaat', 'undetected'].includes(s.key)) c.todo += 1;
    });
    return c;
  }, [withStatus]);

  const needle = q.trim().toUpperCase();
  const visible = withStatus.filter(({ r, s }) => {
    if (filter === 'todo' && !['ready', 'nokaat', 'undetected'].includes(s.key)) return false;
    if (!['all', 'todo'].includes(filter) && s.key !== filter) return false;
    if (!needle) return true;
    return [r.gr_no, r.station, r.consignor, r.consignee, r.challan_no, overrides[r.gr_no]?.transport_name, r.suggested?.transport_name]
      .some((v) => String(v || '').toUpperCase().includes(needle));
  });

  const canSelect = (s) => !['assigned', 'blocked'].includes(s.key) && (s.key !== 'settled' || includeSettled);
  const selectable = visible.filter(({ s }) => canSelect(s));
  const allTicked = selectable.length > 0 && selectable.every(({ r }) => selected[r.gr_no]);
  const toggleAll = () => {
    if (allTicked) {
      setSelected((sel) => { const n = { ...sel }; selectable.forEach(({ r }) => delete n[r.gr_no]); return n; });
    } else {
      setSelected((sel) => ({ ...sel, ...Object.fromEntries(selectable.map(({ r }) => [r.gr_no, true])) }));
    }
  };

  const pickedRows = withStatus.filter(({ r, s }) => selected[r.gr_no] && canSelect(s)).map(({ r }) => r);
  const pickedDr = pickedRows.filter((r) => pfOf(r) > 0).reduce((t, r) => t + pfOf(r), 0);
  const pickedCr = pickedRows.filter((r) => pfOf(r) < 0).reduce((t, r) => t - pfOf(r), 0);

  const assign = async () => {
    if (!pickedRows.length) return;
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const res = await transportLedgersApi.assign({
        items: pickedRows.map((r) => (overrides[r.gr_no] ? { gr_no: r.gr_no, transport_id: overrides[r.gr_no].transport_id || overrides[r.gr_no].id } : { gr_no: r.gr_no })),
        updated_by: userId,
        include_settled: includeSettled
      });
      const d = res.data || res;
      setResult({
        assigned: d.assigned || [],
        skipped: d.skipped || [],
        differs: d.kaat_record_transport_differs || []
      });
      setSelected({});
      setOverrides({});
      onAssigned?.();
    } catch (err) {
      setError(err.message || 'Assign failed');
    } finally {
      setSaving(false);
    }
  };

  // Add kaat works per station: refuse a mixed selection
  const openAddKaat = (list) => {
    const target = list.filter((r) => !r.assigned);
    if (!target.length) return;
    const stations = [...new Set(target.map((r) => r.station_city_id || r.station))];
    if (stations.length > 1) {
      setError(`Add kaat works one station at a time - your selection has ${stations.length} stations (${[...new Set(target.map((r) => r.station))].join(', ')}). Search by station first.`);
      return;
    }
    setError(null);
    setKaatRows(target);
  };
  const noKaatSkipped = result
    ? rows.filter((r) => result.skipped.some((s) => s.gr_no === r.gr_no && /kaat/i.test(s.reason || '')))
    : [];

  return (
    <div>
      {kaatRows && (
        <AddKaatModal rows={kaatRows} userId={userId} onClose={() => setKaatRows(null)}
          onDone={() => { setSelected({}); onAssigned?.(); }} />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${filter === k ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-black hover:bg-gray-50'}`}>
              {l} <span className={filter === k ? 'text-gray-300' : 'text-gray-400'}>{counts[k] || 0}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="GR, station, party, transport"
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-black w-64" />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-black">
          <input type="checkbox" className="accent-emerald-600" checked={includeSettled} onChange={(e) => setIncludeSettled(e.target.checked)} />
          Allow settled-elsewhere
        </label>
        {toolbar}
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="mb-3 bg-white border border-gray-200 rounded-xl p-4 text-sm text-black relative">
          <button onClick={() => setResult(null)} className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
          <div className="flex items-center gap-2 font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> {result.assigned.length} assigned
            {result.assigned.length > 0 && (
              <span className="font-normal text-gray-600">
                → {[...new Set(result.assigned.map((a) => a.ledger_name))].join(', ')}
              </span>
            )}
          </div>
          {result.skipped.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold text-amber-800 flex items-center gap-3">
                {result.skipped.length} skipped
                {noKaatSkipped.length > 0 && (
                  <button onClick={() => openAddKaat(noKaatSkipped)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
                    <Calculator className="w-3.5 h-3.5" /> Add kaat rate for {noKaatSkipped.length}
                  </button>
                )}
              </div>
              <ul className="text-xs text-amber-900 list-disc pl-5 max-h-32 overflow-auto">
                {result.skipped.map((s, i) => <li key={i}><b>{s.gr_no}</b>: {s.reason}</li>)}
              </ul>
            </div>
          )}
          {result.differs.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold text-blue-800">Posted to a different transport than the kaat record ({result.differs.length})</div>
              <ul className="text-xs text-blue-900 list-disc pl-5 max-h-24 overflow-auto">
                {result.differs.map((s, i) => <li key={i}><b>{s.gr_no}</b>: kaat record says {s.kaat_record_transport}, posted to {s.posted_to}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-black uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5 w-8"><input type="checkbox" className="accent-emerald-600" checked={allTicked} onChange={toggleAll} /></th>
              <th className="text-left px-3 py-2.5">GR</th>
              {showChallan && <th className="text-left px-3 py-2.5">Challan</th>}
              <th className="text-left px-3 py-2.5">Date</th>
              <th className="text-left px-3 py-2.5">Station</th>
              <th className="text-left px-3 py-2.5">Consignor</th>
              <th className="text-left px-3 py-2.5">Consignee</th>
              <th className="text-right px-3 py-2.5">To-pay</th>
              <th className="text-right px-3 py-2.5">Paid</th>
              <th className="text-right px-3 py-2.5">Wt</th>
              <th className="text-right px-3 py-2.5">Kaat</th>
              <th className="text-right px-3 py-2.5">pf</th>
              <th className="text-left px-3 py-2.5 w-56">Transport</th>
              <th className="text-left px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-black">
            {loading && <tr><td colSpan={14} className="py-12 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></td></tr>}
            {!loading && visible.length === 0 && <tr><td colSpan={14} className="py-12 text-center text-gray-500">Nothing here</td></tr>}
            {!loading && visible.map(({ r, s }) => {
              const ov = overrides[r.gr_no];
              const locked = ['assigned', 'blocked'].includes(s.key);
              const src = ov ? SOURCE_TAG.manual : SOURCE_TAG[r.suggested?.source];
              const pf = pfOf(r);
              const dim = s.key === 'settled' && !includeSettled;
              return (
                <tr key={`${r.bilty_type || ''}-${r.gr_no}`} className={`${dim ? 'opacity-50' : ''} ${selected[r.gr_no] ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" className="accent-emerald-600" disabled={!canSelect(s)} checked={!!selected[r.gr_no] && canSelect(s)}
                      onChange={(e) => setSelected((sel) => ({ ...sel, [r.gr_no]: e.target.checked }))} />
                  </td>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">
                    {r.gr_no}{r.bilty_type === 'manual' && <span className="ml-1 text-[9px] text-amber-700">M</span>}
                  </td>
                  {showChallan && <td className="px-3 py-2">{r.challan_no}</td>}
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.bilty_date)}</td>
                  <td className="px-3 py-2 font-medium">{r.station || '-'}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate" title={r.consignor}>{r.consignor || '-'}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate" title={r.consignee}>{r.consignee || '-'}</td>
                  <td className="px-3 py-2 text-right">{Number(r.to_pay_amount) ? formatINR(r.to_pay_amount) : ''}</td>
                  <td className="px-3 py-2 text-right">{Number(r.paid_amount) ? formatINR(r.paid_amount) : ''}</td>
                  <td className="px-3 py-2 text-right">{r.weight ?? ''}</td>
                  <td className={`px-3 py-2 text-right ${Number(r.estimate?.kaat) ? '' : 'text-amber-700 font-semibold'}`}
                    title={r.estimate ? `${r.estimate.kaat_rate ?? ''} · ${r.estimate.kaat_source || ''}${r.estimate.dd ? ` · dd ${r.estimate.dd}` : ''}` : ''}>
                    {formatINR(r.estimate?.kaat)}{ov ? '*' : ''}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${pf >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatINR(Math.abs(pf))} {pf >= 0 ? 'Dr' : 'Cr'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        <TransportPicker
                          label={locked ? (r.assigned?.ledger_name || r.suggested?.transport_name) : r.suggested?.transport_name}
                          value={ov || null}
                          disabled={locked}
                          stationCityId={r.station_city_id}
                          onChange={(o) => {
                            setOverrides((m) => ({ ...m, [r.gr_no]: o }));
                            setSelected((sel) => ({ ...sel, [r.gr_no]: true }));
                          }}
                          onReset={() => setOverrides((m) => { const n = { ...m }; delete n[r.gr_no]; return n; })}
                        />
                      </div>
                      {src && !locked && <span className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold whitespace-nowrap ${src.cls}`}>{src.label}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold max-w-[200px] truncate ${s.cls}`} title={s.label}>{s.label}</span>
                      {s.key === 'nokaat' && (
                        <button onClick={() => openAddKaat([r])} title="Add kaat rate" className="p-0.5 text-emerald-700 hover:bg-emerald-50 rounded">
                          <Calculator className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {Object.keys(overrides).length > 0 && (
        <p className="text-[11px] text-gray-500 mt-1">* Kaat / pf shown are for the suggested transport; they are recalculated for your chosen transport on assign.</p>
      )}

      {/* Sticky action bar */}
      <div className="sticky bottom-0 mt-3 bg-white/95 backdrop-blur border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-4 shadow-sm">
        <span className="text-sm text-black"><b>{pickedRows.length}</b> selected</span>
        <span className="text-sm text-emerald-700">Dr (they owe) <b>₹{formatINR(pickedDr)}</b></span>
        <span className="text-sm text-rose-700">Cr (we owe kaat) <b>₹{formatINR(pickedCr)}</b></span>
        <span className="text-sm text-black">Net <b>₹{formatINR(Math.abs(pickedDr - pickedCr))} {pickedDr - pickedCr >= 0 ? 'Dr' : 'Cr'}</b></span>
        <button onClick={() => openAddKaat(pickedRows)} disabled={!pickedRows.length}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-black rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          title="Set kaat for the selected bilties (one station at a time)">
          <Calculator className="w-4 h-4" /> Add kaat rate
        </button>
        <button onClick={assign} disabled={saving || !pickedRows.length}
          className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Assign selected
        </button>
      </div>
    </div>
  );
}
