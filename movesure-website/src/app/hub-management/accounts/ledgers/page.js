'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/utils/auth';
import supabase from '@/app/utils/supabase';
import { Loader2, AlertCircle, Plus, Search, BookUser, ChevronLeft, ChevronRight, Ban, CheckCircle2 } from 'lucide-react';
import { ledgerApi } from '@/components/hub-management/accounts/api';
import { flattenGroups, formatINR, OWES_SHORT } from '@/components/hub-management/accounts/helpers';
import { customAlert } from '@/components/common/alert-system';
import { useBranch } from '@/components/hub-management/accounts/useBranch';
import LedgerFormModal from '@/components/hub-management/accounts/LedgerFormModal';

const PAGE_SIZE = 50;

export default function LedgerMasterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { branchId, isAllBranches } = useBranch();
  const [mounted, setMounted] = useState(false);

  const [rows, setRows] = useState([]);
  const [balances, setBalances] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [flatGroups, setFlatGroups] = useState([]);
  const [cities, setCities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    (async () => {
      try {
        const [groupsRes, citiesRes] = await Promise.all([
          ledgerApi.groups.tree({ is_active: true }),
          supabase.from('cities').select('id, city_name').order('city_name'),
        ]);
        setFlatGroups(flattenGroups(groupsRes.data || []));
        setCities(citiesRes.data || []);
      } catch (err) {
        console.error('Failed loading groups/cities', err);
      }
    })();
  }, [mounted]);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await ledgerApi.ledgers.list({
        // Owner's "All Branches" view: omit branch_id entirely rather than
        // sending the string "all" — the backend then returns every branch's
        // ledgers, each tagged with branch_name.
        branch_id: isAllBranches ? undefined : branchId,
        group_id: groupFilter || undefined,
        search: search.trim() || undefined,
        is_active: true,
        page,
        page_size: PAGE_SIZE,
      });
      const list = res.data?.rows || [];
      setRows(list);
      setTotal(res.data?.total || 0);

      const balanceEntries = await Promise.all(
        list.map((l) => ledgerApi.ledgers.balance(l.id).then((r) => [l.id, r.data]).catch(() => [l.id, null]))
      );
      setBalances(Object.fromEntries(balanceEntries));
    } catch (err) {
      setError(err.message || 'Failed to load ledgers');
    } finally {
      setLoading(false);
    }
  }, [branchId, isAllBranches, groupFilter, search, page]);

  useEffect(() => {
    if (mounted && branchId) load();
  }, [mounted, branchId, load]);

  const openAdd = () => { setEditingLedger(null); setModalOpen(true); };
  const openEdit = (ledger) => { setEditingLedger(ledger); setModalOpen(true); };

  const handleSubmit = async (payload) => {
    if (editingLedger) {
      await ledgerApi.ledgers.update(editingLedger.id, payload);
      customAlert('Ledger updated', 'success');
    } else {
      await ledgerApi.ledgers.create({ ...payload, created_by: user?.id });
      customAlert('Ledger created', 'success');
    }
    setModalOpen(false);
    load();
  };

  const handleToggleActive = async (ledger) => {
    try {
      if (ledger.is_active) {
        await ledgerApi.ledgers.deactivate(ledger.id, { updated_by: user?.id });
        customAlert('Ledger deactivated', 'success');
      } else {
        await ledgerApi.ledgers.activate(ledger.id, { updated_by: user?.id });
        customAlert('Ledger activated', 'success');
      }
      load();
    } catch (err) {
      customAlert(err.message || 'Action failed', 'error');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!mounted || !user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-md">
            <BookUser className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">Ledger Master</h1>
            <p className="text-sm text-black">Manage your parties and accounts</p>
          </div>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
          <Plus className="h-4 w-4" /> New Ledger
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search by name…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm text-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) => { setPage(1); setGroupFilter(e.target.value); }}
          className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">All groups</option>
          {flatGroups.map((g) => (
            <option key={g.id} value={g.id}>{'—'.repeat(g.depth || 0)} {g.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-black text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                {isAllBranches && <th className="text-left px-4 py-3 font-semibold">Branch</th>}
                <th className="text-left px-4 py-3 font-semibold">Group</th>
                <th className="text-left px-4 py-3 font-semibold">GSTIN</th>
                <th className="text-right px-4 py-3 font-semibold">Balance</th>
                <th className="text-center px-4 py-3 font-semibold">Active</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-black">
              {loading && rows.length === 0 && (
                <tr><td colSpan={isAllBranches ? 7 : 6} className="text-center py-10"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={isAllBranches ? 7 : 6} className="text-center py-10 text-black">No ledgers found</td></tr>
              )}
              {rows.map((l) => {
                const bal = balances[l.id];
                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => router.push(`/hub-management/accounts/ledgers/${l.id}`)} className="font-medium text-emerald-700 hover:underline">
                        {l.name}
                      </button>
                    </td>
                    {isAllBranches && <td className="px-4 py-3 text-black">{l.branch_name || '-'}</td>}
                    <td className="px-4 py-3 text-black">{flatGroups.find((g) => g.id === l.group_id)?.name || '-'}</td>
                    <td className="px-4 py-3 text-black">{l.gstin || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {bal ? (
                        <span className={bal.balance_type === 'dr' ? 'text-emerald-700' : 'text-rose-700'}>
                          ₹{formatINR(bal.balance)} <span className="text-xs font-normal">({OWES_SHORT[bal.balance_type]})</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {l.is_active ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <Ban className="w-4 h-4 text-black inline" />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(l)} className="text-xs font-semibold text-blue-600 hover:underline mr-3">Edit</button>
                      <button onClick={() => handleToggleActive(l)} className="text-xs font-semibold text-black hover:underline">
                        {l.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-black">Page {page} of {totalPages} · {total} ledgers</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      <LedgerFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingLedger}
        flatGroups={flatGroups}
        cities={cities}
        branchId={isAllBranches ? user?.branch_id : branchId}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
