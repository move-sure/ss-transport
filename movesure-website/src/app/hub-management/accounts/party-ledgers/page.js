'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Plus, Search, BookOpen } from 'lucide-react';
import { useAuth } from '@/app/utils/auth';
import { useBranch } from '@/components/hub-management/accounts/useBranch';
import { partyLedgersApi } from '@/components/hub-management/accounts/api';
import { formatINR, OWES_LABEL } from '@/components/hub-management/accounts/helpers';
import { KIND_TAG } from '@/components/hub-management/accounts/party-ledgers/shared';
import NewPartyLedgerModal from '@/components/hub-management/accounts/party-ledgers/NewPartyLedgerModal';
import NewCustomLedgerModal from '@/components/hub-management/accounts/party-ledgers/NewCustomLedgerModal';

// Party Ledgers: consignor / consignee ledgers built from their bilties, plus custom bilty ledgers.
export default function PartyLedgersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { branchId, isAllBranches, branches } = useBranch();

  const [kind, setKind] = useState('party');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showParty, setShowParty] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await partyLedgersApi.list({ branch_id: isAllBranches ? undefined : branchId, kind });
      setRows(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load party ledgers');
    } finally {
      setLoading(false);
    }
  }, [branchId, isAllBranches, kind]);

  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const visible = rows.filter((r) => !q || [r.name, r.party_name, ...(r.match_names || []), r.gstin]
    .some((v) => v?.toLowerCase().includes(q)));
  const totalDr = visible.filter((r) => r.balance_type === 'dr').reduce((s, r) => s + (Number(r.balance) || 0), 0);

  const defaultBranch = isAllBranches ? user?.branch_id : branchId;
  const openLedger = (id) => id && router.push(`/hub-management/accounts/party-ledgers/${id}`);

  return (
    <div className="px-6 py-6 w-full">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-md">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black">Party Ledgers</h1>
            <p className="text-sm text-black">Bilty-wise ledgers for consignors, consignees and custom groups.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowParty(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
            <Plus className="w-4 h-4" /> Party Ledger
          </button>
          <button onClick={() => setShowCustom(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-black hover:bg-gray-50">
            <Plus className="w-4 h-4" /> Custom Ledger
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 border-b border-gray-200">
          {[['party', 'Party'], ['custom', 'Custom']].map(([v, l]) => (
            <button key={v} onClick={() => setKind(v)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${kind === v ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-black'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / GSTIN"
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-black w-64" />
        </div>
        <span className="text-sm text-black">Total receivable: <b className="text-emerald-700">₹{formatINR(totalDr)} Dr</b></span>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-black text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Ledger</th>
              <th className="text-left px-4 py-3">Type</th>
              {isAllBranches && <th className="text-left px-4 py-3">Branch</th>}
              <th className="text-right px-4 py-3">Bilties</th>
              <th className="text-right px-4 py-3">Bilty Total</th>
              <th className="text-right px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-black">
            {loading && <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></td></tr>}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-gray-500">
                {rows.length === 0 ? `No ${kind} ledgers yet. Create one with the buttons above.` : 'No match'}
              </td></tr>
            )}
            {!loading && visible.map((r) => {
              const tag = r.kind === 'custom' ? 'custom' : r.party_type;
              return (
                <tr key={r.ledger_id} onClick={() => openLedger(r.ledger_id)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-black">{r.name}</div>
                    {r.match_names?.length > 0 && <div className="text-xs text-gray-500">+{r.match_names.length} spelling{r.match_names.length > 1 ? 's' : ''}{r.auto_add === false ? ' · auto-add off' : ''}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold capitalize ${KIND_TAG[tag] || ''}`}>{tag}</span>
                  </td>
                  {isAllBranches && <td className="px-4 py-3">{r.branch_name || '-'}</td>}
                  <td className="px-4 py-3 text-right">{r.bilty_count ?? 0}</td>
                  <td className="px-4 py-3 text-right">₹{formatINR(r.bilty_total)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${r.balance_type === 'cr' ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {Number(r.balance) ? `₹${formatINR(r.balance)} ${OWES_LABEL[r.balance_type] || ''}` : 'Nil'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <NewPartyLedgerModal
        isOpen={showParty}
        onClose={() => setShowParty(false)}
        branches={branches}
        defaultBranchId={defaultBranch}
        userId={user?.id}
        onCreated={(id) => { setShowParty(false); id ? openLedger(id) : load(); }}
      />
      <NewCustomLedgerModal
        isOpen={showCustom}
        onClose={() => setShowCustom(false)}
        branches={branches}
        defaultBranchId={defaultBranch}
        userId={user?.id}
        onCreated={(id) => { setShowCustom(false); id ? openLedger(id) : load(); }}
      />
    </div>
  );
}
