'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Plus, Search } from 'lucide-react';
import { formatINR, formatDate, OWES_LABEL, FLOW_LABEL } from './helpers';
import { customAlert } from '@/components/common/alert-system';
import BillsTable from './BillsTable';
import AddPartyModal from './AddPartyModal';

/**
 * Shared list-left / detail-right layout for the three "who owes what"
 * screens (Transporters, Drivers, Labour) — same shape every time: search a
 * party, see their balance + bills + full history, act on them with whatever
 * buttons the screen passes in as children.
 */
export default function PartyMasterDetail({
  icon: Icon, title, partyLabel, addFields,
  listFn, createFn, detailFn,
  branchId, userId,
  children,
}) {
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [showAdd, setShowAdd] = useState(false);

  const loadList = useCallback(async () => {
    if (!branchId) return;
    try {
      setListLoading(true);
      setListError(null);
      const res = await listFn(branchId);
      setList(res.data || []);
    } catch (err) {
      setListError(err.message || `Failed to load ${partyLabel.toLowerCase()}s`);
    } finally {
      setListLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      setDetailLoading(true);
      setDetailError(null);
      const res = await detailFn(id);
      setDetail(res.data);
    } catch (err) {
      setDetailError(err.message || 'Failed to load');
    } finally {
      setDetailLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId, loadDetail]);

  const refreshDetail = () => { loadDetail(selectedId); loadList(); };

  const filteredList = list.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex">
      {/* Left: list */}
      <div className="w-80 border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-black flex items-center gap-2">
              <Icon className="w-5 h-5 text-emerald-600" /> {title}
            </h1>
            <button onClick={() => setShowAdd(true)} className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {listLoading && <div className="p-6 text-center"><Loader2 className="w-5 h-5 mx-auto text-emerald-600 animate-spin" /></div>}
          {listError && <div className="p-4 text-sm text-red-700">{listError}</div>}
          {!listLoading && filteredList.length === 0 && <div className="p-4 text-sm text-black">No {partyLabel.toLowerCase()}s yet.</div>}
          {filteredList.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${selectedId === t.id ? 'bg-emerald-50' : ''}`}
            >
              <p className="text-sm font-medium text-black truncate">{t.name}</p>
              <p className={`text-xs font-semibold ${t.balance_type === 'dr' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {t.balance > 0 ? `₹${formatINR(t.balance)} ${OWES_LABEL[t.balance_type] || ''}` : 'Settled'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedId ? (
          <div className="py-16 text-center text-black text-sm">Select a {partyLabel.toLowerCase()} on the left.</div>
        ) : detailLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-emerald-600 animate-spin" /></div>
        ) : detailError ? (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {detailError}
          </div>
        ) : detail ? (
          <>
            <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-black">{detail.ledger?.name}</h2>
                <p className={`text-2xl font-bold mt-1 ${detail.balance?.balance_type === 'dr' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {detail.balance?.balance > 0
                    ? `${detail.balance?.balance_type === 'cr' ? 'You owe them' : 'Owes you'}: ₹${formatINR(detail.balance?.balance)}`
                    : 'Settled: ₹0'}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {children({ detail, refreshDetail })}
              </div>
            </div>

            <h3 className="text-sm font-semibold text-black mb-2">Bills</h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
              <BillsTable bills={detail.bills || []} loading={false} />
            </div>

            <h3 className="text-sm font-semibold text-black mb-2">History</h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-black text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Voucher No</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Narration</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Amount</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-black">
                  {(detail.statement || []).map((s, i) => (
                    <tr key={s.voucher_id || i}>
                      <td className="px-4 py-2.5">
                        {formatDate(s.voucher_date)}
                        {s.time && <span className="text-xs text-black block">{new Date(s.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{s.voucher_no}</td>
                      <td className="px-4 py-2.5 text-black">{s.narration || '-'}</td>
                      <td className="px-4 py-2.5">{s.entry_type === 'dr' ? FLOW_LABEL.dr : FLOW_LABEL.cr}</td>
                      <td className="px-4 py-2.5 text-right">₹{formatINR(s.amount)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">₹{formatINR(s.running_balance)}</td>
                    </tr>
                  ))}
                  {!detail.statement?.length && (
                    <tr><td colSpan={6} className="text-center py-8 text-black">No history yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>

      <AddPartyModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={`Add ${partyLabel}`}
        fields={addFields}
        onSubmit={async (values) => {
          const res = await createFn({ branch_id: branchId, ...values, created_by: userId });
          setShowAdd(false);
          customAlert(`${partyLabel} added`, 'success');
          loadList();
          if (res.data?.id) setSelectedId(res.data.id);
        }}
      />
    </div>
  );
}
