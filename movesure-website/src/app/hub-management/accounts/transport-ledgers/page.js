'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Plus, Search, Building2 } from 'lucide-react';
import { useAuth } from '@/app/utils/auth';
import { useBranch } from '@/components/hub-management/accounts/useBranch';
import { transportLedgersApi } from '@/components/hub-management/accounts/api';
import { formatINR, OWES_LABEL } from '@/components/hub-management/accounts/helpers';
import NewTransportLedgerModal from '@/components/hub-management/accounts/transport-ledgers/NewTransportLedgerModal';

// Delivery transports with their per-bilty pf balance.
export default function TransportLedgersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { branchId, isAllBranches, branches } = useBranch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Kept in the hub's books - the branch bar doesn't filter transport ledgers
      const res = await transportLedgersApi.list();
      setRows(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load transport ledgers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const q = search.trim().toUpperCase();
  const visible = rows.filter((r) => !q || [r.name, r.transport_gstin].some((v) => String(v || '').toUpperCase().includes(q)));
  const net = visible.reduce((t, r) => t + (r.balance_type === 'cr' ? -1 : 1) * (Number(r.balance) || 0), 0);
  const totals = visible.reduce((t, r) => ({
    bilties: t.bilties + (r.bilty_count || 0),
    toPay: t.toPay + (Number(r.to_pay_total) || 0),
    kaat: t.kaat + (Number(r.kaat_total) || 0)
  }), { bilties: 0, toPay: 0, kaat: 0 });

  const open = (id) => id && router.push(`/hub-management/accounts/transport-ledgers/${id}`);

  return (
    <div className="px-6 py-6 w-full">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-md"><Building2 className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-black">Transport Ledgers</h1>
            <p className="text-sm text-black">Per bilty: to-pay = <b>Dr pf</b> (total − kaat − dd, they owe us) · paid = <b>Cr kaat</b> (we owe them). Kept in the hub&apos;s books, all branches.</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
          <Plus className="w-4 h-4" /> Transport Ledger
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-black uppercase">Net balance</p>
          <p className={`text-2xl font-bold mt-1 ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>₹{formatINR(Math.abs(net))} {net >= 0 ? 'Dr' : 'Cr'}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-black uppercase">Bilties posted</p>
          <p className="text-2xl font-bold text-black mt-1">{totals.bilties}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-black uppercase">To-pay total</p>
          <p className="text-2xl font-bold text-black mt-1">₹{formatINR(totals.toPay)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-black uppercase">Kaat total</p>
          <p className="text-2xl font-bold text-black mt-1">₹{formatINR(totals.kaat)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transport / GSTIN"
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-black w-72" />
        </div>
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
              <th className="text-left px-4 py-3">Transport</th>
              <th className="text-left px-4 py-3">GSTIN</th>
              <th className="text-right px-4 py-3">Rows</th>
              <th className="text-right px-4 py-3">Bilties</th>
              <th className="text-right px-4 py-3">To-pay</th>
              <th className="text-right px-4 py-3">Kaat</th>
              <th className="text-right px-4 py-3">pf total</th>
              <th className="text-right px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-black">
            {loading && <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></td></tr>}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-gray-500">
                {rows.length === 0 ? 'No transport ledgers yet. They are created automatically when you assign bilties on Hub Challans.' : 'No match'}
              </td></tr>
            )}
            {!loading && visible.map((r) => (
              <tr key={r.ledger_id} onClick={() => open(r.ledger_id)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="font-semibold">{r.name}</div>
                  {r.allow_zero_kaat && <span className="text-[10px] font-semibold text-amber-700">zero kaat allowed</span>}
                </td>
                <td className="px-4 py-3 text-xs">{r.transport_gstin || '-'}</td>
                <td className="px-4 py-3 text-right">{r.transport_ids?.length || 0}</td>
                <td className="px-4 py-3 text-right">{r.bilty_count ?? 0}</td>
                <td className="px-4 py-3 text-right">₹{formatINR(r.to_pay_total)}</td>
                <td className="px-4 py-3 text-right">₹{formatINR(r.kaat_total)}</td>
                <td className="px-4 py-3 text-right">₹{formatINR(r.pf_total)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${r.balance_type === 'cr' ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {Number(r.balance) ? `₹${formatINR(r.balance)} ${OWES_LABEL[r.balance_type] || ''}` : 'Nil'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewTransportLedgerModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        branches={branches}
        defaultBranchId={isAllBranches ? user?.branch_id : branchId}
        userId={user?.id}
        onCreated={(id) => { setShowNew(false); id ? open(id) : load(); }}
      />
    </div>
  );
}
