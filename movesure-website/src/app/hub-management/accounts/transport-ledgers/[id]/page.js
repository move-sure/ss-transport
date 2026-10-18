'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft, History, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/utils/auth';
import { customAlert } from '@/components/common/alert-system';
import { transportLedgersApi, transportersApi, ledgerApi } from '@/components/hub-management/accounts/api';
import { formatINR, OWES_LABEL } from '@/components/hub-management/accounts/helpers';
import StatementView from '@/components/hub-management/accounts/StatementView';
import PayModal from '@/components/hub-management/accounts/PayModal';
import TransportBiltiesTab from '@/components/hub-management/accounts/transport-ledgers/TransportBiltiesTab';
import TransportLedgerSettings from '@/components/hub-management/accounts/transport-ledgers/TransportLedgerSettings';
import RefreshKaatModal from '@/components/hub-management/accounts/transport-ledgers/RefreshKaatModal';

export default function TransportLedgerPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('bilties');
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState(null); // 'collect' | 'give' | 'refresh'
  const [bills, setBills] = useState([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await transportLedgersApi.get(id);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);
  const refresh = () => { load(); setReloadKey((k) => k + 1); };

  // Collect = receivable bills (to-pay pf), Give = payable bills (paid-bilty kaat)
  const openPay = async (kind) => {
    setModal(kind);
    setBills([]);
    try {
      const res = await ledgerApi.bills.list({ ledger_id: id, direction: kind === 'collect' ? 'receivable' : 'payable', is_settled: false });
      setBills(res.data?.rows || res.data || []);
    } catch { setBills([]); }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  if (error || !data) {
    return (
      <div className="px-6 py-6">
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error || 'Ledger not found'}
        </div>
      </div>
    );
  }

  const { ledger, profile, transports = [], balance, summary } = data;
  const branchId = ledger?.branch_id;
  const card = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-4';

  return (
    <div className="px-6 py-6 w-full">
      <button onClick={() => router.push('/hub-management/accounts/transport-ledgers')} className="flex items-center gap-1.5 text-sm text-black mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Transport Ledgers
      </button>

      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">{ledger?.name}</h1>
          <p className="text-sm text-black mt-0.5">
            {profile?.transport_gstin ? `GSTIN ${profile.transport_gstin}` : 'No GSTIN'} · {transports.length} transport row{transports.length === 1 ? '' : 's'}
            {profile?.allow_zero_kaat ? ' · zero kaat allowed' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => openPay('collect')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
            <ArrowDownLeft className="w-4 h-4" /> Collect (they pay us)
          </button>
          <button onClick={() => openPay('give')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-black hover:bg-gray-50">
            <ArrowUpRight className="w-4 h-4" /> Give (we pay kaat)
          </button>
          <button onClick={() => setModal('refresh')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-black hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => router.push(`/hub-management/accounts/audit-log?entity_type=ledger&entity_id=${ledger?.id}`)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-black hover:bg-gray-50">
            <History className="w-4 h-4" /> History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className={`${card} col-span-2 md:col-span-1`}>
          <p className="text-xs font-semibold text-black uppercase">Balance</p>
          <p className={`text-2xl font-bold mt-1 ${balance?.balance_type === 'cr' ? 'text-rose-700' : 'text-emerald-700'}`}>
            {Number(balance?.balance) ? `₹${formatINR(balance.balance)} ${OWES_LABEL[balance.balance_type] || ''}` : 'Nil'}
          </p>
          <p className="text-xs text-gray-500">{balance?.balance_type === 'cr' ? 'We owe them' : 'They owe us'}</p>
        </div>
        <div className={card}><p className="text-xs font-semibold text-black uppercase">Bilties</p><p className="text-lg font-bold text-black mt-1">{summary?.bilty_count ?? 0}</p></div>
        <div className={card}><p className="text-xs font-semibold text-black uppercase">To-pay total</p><p className="text-lg font-bold text-black mt-1">₹{formatINR(summary?.to_pay_total)}</p></div>
        <div className={card}><p className="text-xs font-semibold text-black uppercase">Kaat total</p><p className="text-lg font-bold text-black mt-1">₹{formatINR(summary?.kaat_total)}</p></div>
        <div className={card}><p className="text-xs font-semibold text-black uppercase">pf total</p><p className="text-lg font-bold text-black mt-1">₹{formatINR(summary?.pf_total)}</p></div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[['bilties', 'Bilties'], ['statement', 'Statement'], ['settings', 'Settings']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === v ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-black'}`}>{l}</button>
        ))}
      </div>

      {tab === 'bilties' && <TransportBiltiesTab ledgerId={id} userId={user?.id} reloadKey={reloadKey} onChanged={load} />}
      {tab === 'statement' && (
        <StatementView key={reloadKey} ledgerId={id} userId={user?.id} onChanged={load} defaultCurrentMonth
          exportMeta={{ name: ledger?.name, gstin: profile?.transport_gstin, subtitle: 'Transport ledger', landscape: true }} />
      )}
      {tab === 'settings' && <TransportLedgerSettings ledger={ledger} profile={profile} transports={transports} userId={user?.id} onSaved={load} />}

      <PayModal
        isOpen={modal === 'collect'}
        onClose={() => setModal(null)}
        title="Collect from transport"
        subtitle="Money the transport collected on to-pay bilties, minus its kaat. Pick a bilty bill or leave it on account."
        bills={bills}
        branchId={branchId}
        onSubmit={async (payload) => {
          await transportersApi.collect(id, { branch_id: branchId, ...payload, created_by: user.id });
          setModal(null);
          customAlert('Payment collected', 'success');
          refresh();
        }}
      />
      <PayModal
        isOpen={modal === 'give'}
        onClose={() => setModal(null)}
        title="Pay transport"
        subtitle="Kaat we owe on paid bilties. Pick a bilty bill or leave it on account."
        bills={bills}
        branchId={branchId}
        onSubmit={async (payload) => {
          await transportersApi.give(id, { branch_id: branchId, ...payload, created_by: user.id });
          setModal(null);
          customAlert('Payment given', 'success');
          refresh();
        }}
      />
      {modal === 'refresh' && (
        <RefreshKaatModal ledger={ledger} userId={user?.id} onClose={() => setModal(null)} onDone={refresh} />
      )}
    </div>
  );
}
