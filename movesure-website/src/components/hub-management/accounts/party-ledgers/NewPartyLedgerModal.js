'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle, Search, Check, Info } from 'lucide-react';
import { partyLedgersApi } from '../api';
import { todayLocalDate } from '../helpers';
import { inputCls, normalizeName, runSyncBatches, nextDay } from './shared';

/**
 * New Party Ledger: pick a consignor/consignee, tick the other spellings of its name,
 * choose where the ledger starts (opening balance + import-from date), create, then
 * keep syncing until every matching bilty is posted.
 */
export default function NewPartyLedgerModal({ isOpen, onClose, branches = [], defaultBranchId, userId, onCreated }) {
  const [partyType, setPartyType] = useState('consignor');
  const [branchId, setBranchId] = useState('');
  const [query, setQuery] = useState('');
  const [parties, setParties] = useState([]);
  const [searching, setSearching] = useState(false);
  const [party, setParty] = useState(null);

  const [variantQuery, setVariantQuery] = useState('');
  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [ticked, setTicked] = useState({}); // name -> true

  const [gstin, setGstin] = useState('');
  const [autoAdd, setAutoAdd] = useState(true);
  const [ownBranchOnly, setOwnBranchOnly] = useState(false);

  const [openingBalance, setOpeningBalance] = useState('');
  const [openingType, setOpeningType] = useState('dr');
  const [openingDate, setOpeningDate] = useState('');
  const [importExisting, setImportExisting] = useState(true);
  const [importFrom, setImportFrom] = useState('');
  const [importTo, setImportTo] = useState('');

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const debounce = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const today = todayLocalDate();
    setPartyType('consignor');
    setBranchId(defaultBranchId && defaultBranchId !== 'all' ? defaultBranchId : '');
    setQuery(''); setParties([]); setParty(null);
    setVariantQuery(''); setVariants([]); setTicked({});
    setGstin(''); setAutoAdd(true); setOwnBranchOnly(false);
    setOpeningBalance(''); setOpeningType('dr'); setOpeningDate(today);
    setImportExisting(true); setImportFrom(nextDay(today)); setImportTo('');
    setSaving(false); setProgress(''); setError(null);
  }, [isOpen, defaultBranchId]);

  // party master search
  useEffect(() => {
    if (!isOpen || party) return;
    clearTimeout(debounce.current);
    if (query.trim().length < 2) { setParties([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await partyLedgersApi.parties({ type: partyType, q: query.trim() });
        setParties(res.data || []);
      } catch { setParties([]); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query, partyType, isOpen, party]);

  // spelling variants
  const loadVariants = async (q) => {
    if (!q?.trim()) { setVariants([]); return; }
    setVariantsLoading(true);
    try {
      const res = await partyLedgersApi.nameVariants({ type: partyType, q: q.trim() });
      setVariants(res.data || []);
    } catch { setVariants([]); } finally { setVariantsLoading(false); }
  };

  const pickParty = (p) => {
    setParty(p);
    setGstin(p.gst_num || '');
    // search spellings with the first two words of the name
    const q = (p.company_name || '').split(/\s+/).slice(0, 2).join(' ');
    setVariantQuery(q);
    setTicked({});
    loadVariants(q);
  };

  if (!isOpen) return null;

  const partyNorm = normalizeName(party?.company_name);
  const matchNames = Object.keys(ticked).filter((n) => ticked[n]);

  const handleOpeningDate = (d) => {
    setOpeningDate(d);
    setImportFrom(nextDay(d));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!branchId) { setError('Select a branch'); return; }
    if (!party) { setError(`Pick the ${partyType}`); return; }
    setSaving(true);
    setError(null);
    setProgress('Creating ledger…');
    try {
      const res = await partyLedgersApi.create({
        kind: 'party',
        branch_id: branchId,
        party_type: partyType,
        party_id: party.id,
        match_names: matchNames,
        gstin: gstin.trim() || null,
        auto_add: autoAdd,
        own_branch_only: ownBranchOnly,
        import_existing: importExisting,
        import_from_date: importExisting ? (importFrom || null) : null,
        import_to_date: importExisting ? (importTo || null) : null,
        opening_balance: Number(openingBalance) || 0,
        opening_balance_type: openingType,
        opening_balance_date: openingDate || null,
        created_by: userId
      });
      const data = res.data || {};
      const ledgerId = data.ledger?.id || data.ledger_id || data.id;
      let added = data.import?.added_count || 0;
      let remaining = data.import?.remaining || 0;
      setProgress(importExisting ? `${added} bilties added, ${remaining} left…` : 'Created');

      if (importExisting && remaining > 0 && ledgerId) {
        await runSyncBatches(ledgerId, {
          userId,
          fromDate: importFrom,
          toDate: importTo,
          onProgress: (a, r) => setProgress(`${added + a} bilties added, ${r} left…`)
        });
      }
      onCreated?.(ledgerId);
    } catch (err) {
      setError(err.message || 'Failed to create ledger');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-black">New Party Ledger</h3>
          <button type="button" onClick={onClose} disabled={saving} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-black" /></button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* 1. Party */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">1. Party</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {['consignor', 'consignee'].map((t) => (
                  <button key={t} type="button" disabled={!!party}
                    onClick={() => { setPartyType(t); setParties([]); }}
                    className={`flex-1 py-2 text-sm font-semibold capitalize ${partyType === t ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputCls}>
                <option value="">— Branch —</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-500">
              {partyType === 'consignor' ? 'Consignor ledger counts that party\'s PAID bilties.' : 'Consignee ledger counts that party\'s TO-PAY bilties.'}
            </p>

            {party ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <div>
                  <div className="font-semibold text-black">{party.company_name}</div>
                  <div className="text-xs text-gray-600">{party.gst_num || 'No GST'}{party.number ? ` · ${party.number}` : ''}</div>
                </div>
                <button type="button" onClick={() => { setParty(null); setVariants([]); setTicked({}); }}
                  className="text-xs font-semibold text-emerald-700 hover:underline">Change</button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
                  placeholder={`Search ${partyType}…`} className={`${inputCls} pl-9`} />
                {(searching || parties.length > 0) && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {searching && <div className="px-3 py-2 text-xs text-gray-500">Searching…</div>}
                    {parties.map((p) => (
                      <button key={p.id} type="button" onClick={() => pickParty(p)}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-gray-50">
                        <div className="text-sm font-semibold text-black">{p.company_name}</div>
                        <div className="text-xs text-gray-500">{p.gst_num || 'No GST'}{p.number ? ` · ${p.number}` : ''}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 2. Spellings */}
          {party && (
            <section className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">2. Other spellings on bilties</h4>
              <div className="flex gap-2">
                <input value={variantQuery} onChange={(e) => setVariantQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadVariants(variantQuery); } }}
                  className={inputCls} placeholder="Search spellings, e.g. anil lock" />
                <button type="button" onClick={() => loadVariants(variantQuery)}
                  className="px-3 py-2 text-sm font-semibold bg-gray-100 rounded-lg hover:bg-gray-200">Search</button>
              </div>
              <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                {variantsLoading && <div className="px-3 py-3 text-xs text-gray-500"><Loader2 className="w-4 h-4 inline animate-spin" /> Loading…</div>}
                {!variantsLoading && variants.length === 0 && <div className="px-3 py-3 text-xs text-gray-500">No spellings found</div>}
                {!variantsLoading && variants.map((v) => {
                  const auto = v.normalized === partyNorm;
                  return (
                    <label key={v.name} className={`flex items-center gap-3 px-3 py-2 text-sm ${auto ? 'bg-gray-50' : 'cursor-pointer hover:bg-gray-50'}`}>
                      <input type="checkbox" className="accent-emerald-600" disabled={auto}
                        checked={auto || !!ticked[v.name]}
                        onChange={(e) => setTicked((t) => ({ ...t, [v.name]: e.target.checked }))} />
                      <span className="flex-1 font-medium text-black">{v.name}</span>
                      <span className="text-xs text-gray-500">{v.regular} regular · {v.manual} manual</span>
                      {auto && <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-0.5"><Check className="w-3 h-3" />matches</span>}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">Names are matched ignoring case, spaces and punctuation; greyed rows already match. Tick only the spellings that really are this party.</p>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">GSTIN (also matched)</label>
                  <input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} className={inputCls} />
                </div>
                <label className="flex items-center gap-2 text-sm text-black mt-5">
                  <input type="checkbox" className="accent-emerald-600" checked={autoAdd} onChange={(e) => setAutoAdd(e.target.checked)} />
                  Auto-add new bilties
                </label>
                <label className="flex items-center gap-2 text-sm text-black mt-5">
                  <input type="checkbox" className="accent-emerald-600" checked={ownBranchOnly} onChange={(e) => setOwnBranchOnly(e.target.checked)} />
                  This branch only
                </label>
              </div>
            </section>
          )}

          {/* 3. Start */}
          {party && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">3. Where the ledger starts</h4>
              <div className="flex gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                Old bilties are usually already paid. Enter what the party owes <b>today</b> as the opening balance and import only bilties from the next day.
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Opening balance (₹)</label>
                  <input type="number" step="0.01" min="0" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Dr / Cr</label>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button type="button" onClick={() => setOpeningType('dr')} className={`flex-1 py-2 text-sm font-bold ${openingType === 'dr' ? 'bg-emerald-600 text-white' : 'bg-white text-black'}`}>Dr</button>
                    <button type="button" onClick={() => setOpeningType('cr')} className={`flex-1 py-2 text-sm font-bold ${openingType === 'cr' ? 'bg-rose-600 text-white' : 'bg-white text-black'}`}>Cr</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">As on date</label>
                  <input type="date" value={openingDate} onChange={(e) => handleOpeningDate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-black">
                <input type="checkbox" className="accent-emerald-600" checked={importExisting} onChange={(e) => setImportExisting(e.target.checked)} />
                Import existing bilties
              </label>
              {importExisting && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">From date</label>
                    <input type="date" value={importFrom} onChange={(e) => setImportFrom(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">To date (optional)</label>
                    <input type="date" value={importTo} onChange={(e) => setImportTo(e.target.value)} className={inputCls} />
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 sticky bottom-0 bg-white">
          {progress && saving && <span className="mr-auto text-sm text-emerald-700 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{progress}</span>}
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" disabled={saving || !party}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Ledger
          </button>
        </div>
      </form>
    </div>
  );
}
