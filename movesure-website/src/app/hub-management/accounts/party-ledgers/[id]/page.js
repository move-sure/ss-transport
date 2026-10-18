'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft, History, IndianRupee, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/utils/auth';
import { customAlert } from '@/components/common/alert-system';
import { partyLedgersApi } from '@/components/hub-management/accounts/api';
import { formatINR, OWES_LABEL } from '@/components/hub-management/accounts/helpers';
import StatementView from '@/components/hub-management/accounts/StatementView';
import { KIND_TAG } from '@/components/hub-management/accounts/party-ledgers/shared';
import PartyBiltiesTab from '@/components/hub-management/accounts/party-ledgers/PartyBiltiesTab';
import PartyLedgerSettings from '@/components/hub-management/accounts/party-ledgers/PartyLedgerSettings';
import ReceivePaymentModal from '@/components/hub-management/accounts/party-ledgers/ReceivePaymentModal';
import AddBiltiesModal from '@/components/hub-management/accounts/party-ledgers/AddBiltiesModal';
import SyncModal from '@/components/hub-management/accounts/party-ledgers/SyncModal';

export default function PartyLedgerPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('bilties');
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState(null); // 'pay' | 'add' | 'sync'

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await partyLedgersApi.get(id);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  // reload header + whichever tab is open
  const refresh = () => { load(); setReloadKey((k) => k + 1); };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }
  if (error || !data) {
    return (
      <div className="px-6 py-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error || 'Ledger not found'}
        </div>
      </div>
    );
  }

  const { ledger, profile, balance, open_bills: openBills = [], bilty_summary: summary } = data;
  const isParty = profile?.kind === 'party';
  const tag = isParty ? profile.party_type : 'custom';

  return (
    <div className="px-6 py-6 w-full">
      <button onClick={() => router.push('/hub-management/accounts/party-ledgers')} className="flex items-center gap-1.5 text-sm text-black mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Party Ledgers
      </button>

      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-black">{ledger?.name}</h1>
            <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold capitalize ${KIND_TAG[tag] || ''}`}>{tag}</span>
          </div>
          <p className="text-sm text-black mt-0.5">
            {isParty ? (profile.party_type === 'consignor' ? 'Paid bilties of this consignor' : 'To-pay bilties of this consignee') : 'Bilties added by hand'}
            {ledger?.gstin ? ` · GSTIN ${ledger.gstin}` : ''}
            {isParty && profile.auto_add === false ? ' · auto-add off' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setModal('pay')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
            <IndianRupee className="w-4 h-4" /> Receive Payment
          </button>
          <button onClick={() => setModal('add')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-black hover:bg-gray-50">
            <Plus className="w-4 h-4" /> Add Bilties
          </button>
          {isParty && (
            <button onClick={() => setModal('sync')}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-black hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" /> Sync
            </button>
          )}
          <button onClick={() => router.push(`/hub-management/accounts/audit-log?entity_type=ledger&entity_id=${ledger?.id}`)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-black hover:bg-gray-50">
            <History className="w-4 h-4" /> History
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 col-span-2 md:col-span-1">
          <p className="text-xs font-semibold text-black uppercase">Balance</p>
          <p className={`text-2xl font-bold mt-1 ${balance?.balance_type === 'cr' ? 'text-rose-700' : 'text-emerald-700'}`}>
            {Number(balance?.balance) ? `₹${formatINR(balance.balance)} ${OWES_LABEL[balance.balance_type] || ''}` : 'Nil'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-black uppercase">Total Dr</p>
          <p className="text-lg font-bold text-black mt-1">₹{formatINR(balance?.total_dr)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-black uppercase">Total Cr</p>
          <p className="text-lg font-bold text-black mt-1">₹{formatINR(balance?.total_cr)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-black uppercase">Bilties</p>
          <p className="text-lg font-bold text-black mt-1">{summary?.bilty_count ?? 0} · ₹{formatINR(summary?.bilty_total)}</p>
          <p className="text-xs text-gray-500">{openBills.length} open</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[['bilties', 'Bilties'], ['statement', 'Statement'], ['settings', 'Settings']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === v ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-black'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'bilties' && <PartyBiltiesTab ledgerId={id} userId={user?.id} reloadKey={reloadKey} onChanged={load} />}
      {tab === 'statement' && (
        <StatementView
          key={reloadKey}
          ledgerId={id}
          userId={user?.id}
          onChanged={load}
          defaultCurrentMonth
          exportMeta={{
            name: ledger?.name,
            gstin: ledger?.gstin,
            subtitle: isParty ? `${profile.party_type === 'consignor' ? 'Consignor' : 'Consignee'} ledger` : 'Custom ledger'
          }}
        />
      )}
      {tab === 'settings' && <PartyLedgerSettings ledger={ledger} profile={profile} userId={user?.id} onSaved={load} />}

      <ReceivePaymentModal
        isOpen={modal === 'pay'}
        onClose={() => setModal(null)}
        ledger={ledger}
        openBills={openBills}
        userId={user?.id}
        onSaved={() => { setModal(null); customAlert('Payment saved', 'success'); refresh(); }}
      />
      <AddBiltiesModal
        isOpen={modal === 'add'}
        onClose={() => setModal(null)}
        ledger={ledger}
        isParty={isParty}
        userId={user?.id}
        onAdded={refresh}
      />
      <SyncModal
        isOpen={modal === 'sync'}
        onClose={() => setModal(null)}
        ledger={ledger}
        userId={user?.id}
        onSynced={refresh}
      />
    </div>
  );
}
