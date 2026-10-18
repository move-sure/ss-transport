'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, Plus, Save, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { partyLedgersApi } from '../api';
import { customAlert } from '@/components/common/alert-system';
import { inputCls, normalizeName } from './shared';

// Settings tab: matching rules for party ledgers (name, spellings, GSTIN, auto-add, branch-only).
export default function PartyLedgerSettings({ ledger, profile, userId, onSaved }) {
  const router = useRouter();
  const isParty = profile?.kind === 'party';
  const [form, setForm] = useState({});
  const [newName, setNewName] = useState('');
  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      party_name: profile?.party_name || '',
      match_names: profile?.match_names || [],
      gstin: profile?.gstin || '',
      auto_add: profile?.auto_add ?? true,
      own_branch_only: !!profile?.own_branch_only
    });
  }, [profile]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addName = (name) => {
    const n = name.trim();
    if (!n || (form.match_names || []).includes(n)) return;
    set('match_names', [...(form.match_names || []), n]);
  };

  const findVariants = async () => {
    setVariantsLoading(true);
    try {
      const q = (form.party_name || '').split(/\s+/).slice(0, 2).join(' ');
      const res = await partyLedgersApi.nameVariants({ type: profile.party_type, q });
      setVariants(res.data || []);
    } catch { setVariants([]); } finally { setVariantsLoading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await partyLedgersApi.updateProfile(ledger.id, {
        party_name: form.party_name.trim(),
        match_names: form.match_names,
        gstin: form.gstin.trim() || null,
        auto_add: form.auto_add,
        own_branch_only: form.own_branch_only,
        updated_by: userId
      });
      customAlert('Settings saved', 'success');
      onSaved?.();
    } catch (err) {
      customAlert(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const matched = new Set([normalizeName(form.party_name), ...(form.match_names || []).map(normalizeName)]);

  return (
    <div className="space-y-5 max-w-2xl">
      {isParty ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Party name</label>
              <input value={form.party_name || ''} onChange={(e) => set('party_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">GSTIN (also matched)</label>
              <input value={form.gstin || ''} onChange={(e) => set('gstin', e.target.value.toUpperCase())} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Other spellings matched</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.match_names || []).length === 0 && <span className="text-xs text-gray-500">None</span>}
              {(form.match_names || []).map((n) => (
                <span key={n} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {n}
                  <button type="button" onClick={() => set('match_names', form.match_names.filter((x) => x !== n))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addName(newName); setNewName(''); } }}
                placeholder="Add a spelling" className={inputCls} />
              <button type="button" onClick={() => { addName(newName); setNewName(''); }}
                className="px-3 py-2 text-sm font-semibold bg-gray-100 rounded-lg hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
              <button type="button" onClick={findVariants}
                className="px-3 py-2 text-sm font-semibold bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap">
                {variantsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find spellings'}
              </button>
            </div>
            {variants.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-auto divide-y divide-gray-100">
                {variants.map((v) => {
                  const already = matched.has(v.normalized);
                  return (
                    <div key={v.name} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                      <span className="flex-1 text-black">{v.name}</span>
                      <span className="text-xs text-gray-500">{v.regular} regular · {v.manual} manual</span>
                      {already
                        ? <span className="text-[10px] font-semibold text-emerald-700">matched</span>
                        : <button type="button" onClick={() => addName(v.name)} className="text-xs font-semibold text-blue-700 hover:underline">Add</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-black">
              <input type="checkbox" className="accent-emerald-600" checked={!!form.auto_add} onChange={(e) => set('auto_add', e.target.checked)} />
              Auto-add new bilties on booking
            </label>
            <label className="flex items-center gap-2 text-sm text-black">
              <input type="checkbox" className="accent-emerald-600" checked={!!form.own_branch_only} onChange={(e) => set('own_branch_only', e.target.checked)} />
              Only bilties booked in this branch
            </label>
          </div>

          <div className="flex justify-end">
            <button onClick={save} disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save settings
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-black">Custom ledgers accept any bilty you add — there are no matching rules.</p>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-black flex items-center justify-between gap-3">
        <span>Rename the ledger, change phone/address or the opening balance in Ledger Master.</span>
        <button onClick={() => router.push(`/hub-management/accounts/ledgers?edit=${ledger.id}`)}
          className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline whitespace-nowrap">
          Ledger Master <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
