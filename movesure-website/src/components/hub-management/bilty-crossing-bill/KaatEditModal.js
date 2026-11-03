'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, AlertCircle, Pencil, Calculator } from 'lucide-react';

const API = 'https://api.movesure.io';
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);
const money = (n) => `Rs.${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const str = (v) => (v == null ? '' : String(v));

/**
 * Edit everything that makes up one bilty's kaat:
 *   base = weight x rate_per_kg  (per_kg)  |  packages x rate_per_pkg  (per_pkg)
 *   kaat = base + bilty + labour + ewb + other          (a typed kaat replaces this)
 *   pf   = total - kaat - dd (to-pay / foc)  |  -kaat (paid)   (a typed pf replaces this)
 *
 * - Draft row (no billId): PATCH /api/kaat/gr/{gr}
 * - Row on a saved bill:   PUT /api/bilty-crossing-bill/{billId}/gr/{gr}  (also re-totals the bill)
 * Prefilled from GET /api/kaat/gr/{gr}; only the fields the user changed are sent.
 */
export default function KaatEditModal({ grNo, seed, billId, token, userId, onClose, onSaved }) {
  const [base, setBase] = useState(seed || null); // values as loaded (for "changed" detection)
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/kaat/gr/${encodeURIComponent(grNo)}`, { headers: auth });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.status === 'error') throw new Error(j.message || `Could not load kaat (${res.status})`);
        if (!cancelled) setBase(j.data);
      } catch (e) {
        if (!cancelled) { setLoadError(e.message); if (!seed) setBase(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grNo]);

  // form state from the loaded values
  useEffect(() => {
    if (!base) return;
    const rateType = base.rate_type === 'per_pkg' ? 'per_pkg' : 'per_kg';
    setF({
      rate_type: rateType,
      rate: str(base.rate ?? (rateType === 'per_pkg' ? base.rate_per_pkg : base.rate_per_kg)),
      bilty_chrg: str(base.bilty_chrg),
      labour_mode: 'flat',
      labour_chrg: str(base.labour_chrg),
      labour_per_pkg: '',
      ewb_chrg: str(base.ewb_chrg),
      other_chrg: str(base.other_chrg),
      dd: str(base.dd_chrg),
      kaat_override: '',
      pf_override: ''
    });
  }, [base]);

  const weight = num(base?.weight);
  const packages = num(base?.packages);
  const total = num(base?.total);
  const paid = base?.payment_mode === 'paid';

  const calc = useMemo(() => {
    if (!f) return null;
    const qty = f.rate_type === 'per_pkg' ? packages : weight;
    const baseKaat = qty * num(f.rate);
    const labour = f.labour_mode === 'pkg' ? packages * num(f.labour_per_pkg) : num(f.labour_chrg);
    const formulaKaat = baseKaat + num(f.bilty_chrg) + labour + num(f.ewb_chrg) + num(f.other_chrg);
    const kaat = f.kaat_override !== '' ? num(f.kaat_override) : formulaKaat;
    const formulaPf = paid ? -kaat : total - kaat - num(f.dd);
    const pf = f.pf_override !== '' ? num(f.pf_override) : formulaPf;
    const parts = [
      `${f.rate_type === 'per_pkg' ? `${packages} pkg` : `${weight} kg`} × ${num(f.rate)}`,
      num(f.bilty_chrg) ? `${num(f.bilty_chrg)} bilty` : null,
      labour ? `${Math.round(labour * 100) / 100} labour` : null,
      num(f.ewb_chrg) ? `${num(f.ewb_chrg)} ewb` : null,
      num(f.other_chrg) ? `${num(f.other_chrg)} other` : null
    ].filter(Boolean);
    return {
      labour, formulaKaat, kaat, formulaPf, pf,
      kaatText: parts.join(' + '),
      pfText: paid ? 'paid bilty: −kaat' : `${total} − ${Math.round(kaat * 100) / 100}${num(f.dd) ? ` − ${num(f.dd)} dd` : ''}`
    };
  }, [f, weight, packages, total, paid]);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // only the fields that differ from what was loaded
  const buildBody = () => {
    const body = {};
    const changed = (key, val) => num(val) !== num(base?.[key]);
    const rateTypeChanged = f.rate_type !== (base?.rate_type === 'per_pkg' ? 'per_pkg' : 'per_kg');
    const loadedRate = num(base?.rate ?? (f.rate_type === 'per_pkg' ? base?.rate_per_pkg : base?.rate_per_kg));
    if (rateTypeChanged || num(f.rate) !== loadedRate) {
      body.rate_type = f.rate_type;      // always send the type with the rate (a lone kaat_rate means per kg)
      body.kaat_rate = num(f.rate);
    }
    if (changed('bilty_chrg', f.bilty_chrg)) body.bilty_chrg = num(f.bilty_chrg);
    if (f.labour_mode === 'pkg') { if (f.labour_per_pkg !== '') body.labour_per_pkg = num(f.labour_per_pkg); }
    else if (changed('labour_chrg', f.labour_chrg)) body.labour_chrg = num(f.labour_chrg);
    if (changed('ewb_chrg', f.ewb_chrg)) body.ewb_chrg = num(f.ewb_chrg);
    if (changed('other_chrg', f.other_chrg)) body.other_chrg = num(f.other_chrg);
    if (changed('dd_chrg', f.dd)) body.kaat_dd = num(f.dd);
    if (f.kaat_override !== '') body.kaat = num(f.kaat_override);
    if (f.pf_override !== '') body.pf = num(f.pf_override);
    return body;
  };

  const save = async (e) => {
    e.preventDefault();
    const body = buildBody();
    if (!Object.keys(body).length) { setError('Nothing changed.'); return; }
    if (userId) body.updated_by = userId;
    setSaving(true);
    setError('');
    try {
      const url = billId
        ? `${API}/api/bilty-crossing-bill/${billId}/gr/${encodeURIComponent(grNo)}`
        : `${API}/api/kaat/gr/${encodeURIComponent(grNo)}`;
      const res = await fetch(url, {
        method: billId ? 'PUT' : 'PATCH',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(body)
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.status === 'error') throw new Error(j.message || `Save failed (${res.status})`);
      onSaved?.(j);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const input = 'w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500';
  const lbl = 'block text-[11px] font-semibold text-slate-500 mb-1';

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Pencil className="w-4 h-4 text-teal-600" /> Edit kaat · GR {grNo}</h3>
            {billId && <p className="text-[11px] text-amber-700">On a saved bill — the bill totals and PDF update too</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        {loading && !f ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 mx-auto text-teal-600 animate-spin" /></div>
        ) : !f ? (
          <div className="p-5 text-sm text-red-700">{loadError || 'Could not load this bilty'}</div>
        ) : (
          <div className="p-5 space-y-4">
            {(error || loadError) && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error || loadError}
              </div>
            )}
            {base && base.has_kaat_row === false && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                This GR has no kaat record yet{billId ? ' — the change applies to this bill only' : ''}.
              </p>
            )}

            {/* bilty facts */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[['Weight', `${weight} kg`], ['Pkgs', packages], [paid ? 'Paid' : 'To-pay', money(total)], ['Mode', (base?.payment_mode || '-').toUpperCase()]].map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-lg p-2">
                  <div className="text-[10px] uppercase text-slate-500 font-semibold">{k}</div>
                  <div className="text-sm font-bold text-slate-900">{v}</div>
                </div>
              ))}
            </div>

            {/* rate */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <span className={lbl}>Rate type</span>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                  {[['per_kg', 'Per kg'], ['per_pkg', 'Per package']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set('rate_type', v)}
                      className={`flex-1 py-1.5 text-sm font-semibold ${f.rate_type === v ? 'bg-teal-600 text-white' : 'bg-white text-slate-700'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl}>Rate (Rs / {f.rate_type === 'per_pkg' ? `pkg · ${packages} pkg` : `kg · ${weight} kg`})</label>
                <input type="number" step="0.01" min="0" value={f.rate} onChange={(e) => set('rate', e.target.value)} className={input} autoFocus />
              </div>
            </div>

            {/* charges */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Bilty chrg</label>
                <input type="number" step="0.01" min="0" value={f.bilty_chrg} onChange={(e) => set('bilty_chrg', e.target.value)} className={input} />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <span className={lbl}>Labour</span>
                  <div className="flex text-[10px] font-semibold rounded border border-slate-300 overflow-hidden mb-1">
                    {[['flat', 'Rs flat'], ['pkg', 'per pkg']].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => set('labour_mode', v)}
                        className={`px-2 py-0.5 ${f.labour_mode === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>{l}</button>
                    ))}
                  </div>
                </div>
                {f.labour_mode === 'flat' ? (
                  <input type="number" step="0.01" min="0" value={f.labour_chrg} onChange={(e) => set('labour_chrg', e.target.value)} className={input} />
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.01" min="0" value={f.labour_per_pkg} onChange={(e) => set('labour_per_pkg', e.target.value)} className={input} placeholder="Rs / pkg" />
                    <span className="text-xs text-slate-500 whitespace-nowrap">× {packages} = {money(calc?.labour)}</span>
                  </div>
                )}
              </div>
              <div>
                <label className={lbl}>EWB chrg</label>
                <input type="number" step="0.01" min="0" value={f.ewb_chrg} onChange={(e) => set('ewb_chrg', e.target.value)} className={input} />
              </div>
              <div>
                <label className={lbl}>Other chrg</label>
                <input type="number" step="0.01" min="0" value={f.other_chrg} onChange={(e) => set('other_chrg', e.target.value)} className={input} />
              </div>
              <div>
                <label className={lbl}>DD</label>
                <input type="number" step="0.01" min="0" value={f.dd} onChange={(e) => set('dd', e.target.value)} className={input} />
              </div>
            </div>

            {/* result */}
            {calc && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/60 divide-y divide-teal-100">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-teal-900 flex items-center gap-1"><Calculator className="w-3.5 h-3.5" /> Kaat <b className="text-base">{money(calc.kaat)}</b></div>
                    <div className="text-[11px] text-teal-800 truncate" title={calc.kaatText}>
                      {f.kaat_override !== '' ? <>typed (formula {money(calc.formulaKaat)})</> : `${calc.kaatText} = ${Math.round(calc.formulaKaat * 100) / 100}`}
                    </div>
                  </div>
                  <input type="number" step="0.01" value={f.kaat_override} onChange={(e) => set('kaat_override', e.target.value)}
                    placeholder="override" className="w-28 px-2 py-1 border border-teal-300 rounded text-sm text-slate-900 bg-white" />
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-teal-900">PF <b className="text-base">{money(calc.pf)}</b></div>
                    <div className="text-[11px] text-teal-800 truncate">
                      {f.pf_override !== '' ? <>typed (formula {money(calc.formulaPf)})</> : calc.pfText}
                    </div>
                  </div>
                  <input type="number" step="0.01" value={f.pf_override} onChange={(e) => set('pf_override', e.target.value)}
                    placeholder="override" className="w-28 px-2 py-1 border border-teal-300 rounded text-sm text-slate-900 bg-white" />
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-400">Leave the override boxes empty to use the formula. Freight (total) is never changed here.</p>
          </div>
        )}

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={saving || !f}
            className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </form>
    </div>
  );
}
