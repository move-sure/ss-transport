'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft, History, Pencil } from 'lucide-react';
import { ledgerApi } from '@/components/hub-management/accounts/api';
import { formatINR, OWES_LABEL } from '@/components/hub-management/accounts/helpers';
import StatementView from '@/components/hub-management/accounts/StatementView';
import BillsTable from '@/components/hub-management/accounts/BillsTable';

export default function LedgerDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [ledger, setLedger] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState('statement'); // 'statement' | 'bills'
  const [billsSubTab, setBillsSubTab] = useState('outstanding'); // 'outstanding' | 'all'
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ledgerRes, balanceRes] = await Promise.all([
        ledgerApi.ledgers.get(id),
        ledgerApi.ledgers.balance(id),
      ]);
      setLedger(ledgerRes.data);
      setBalance(balanceRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const loadBills = useCallback(async () => {
    if (!id) return;
    try {
      setBillsLoading(true);
      const res = await ledgerApi.bills.list({
        ledger_id: id,
        is_settled: billsSubTab === 'outstanding' ? false : undefined,
      });
      setBills(res.data || []);
    } catch (err) {
      setBills([]);
    } finally {
      setBillsLoading(false);
    }
  }, [id, billsSubTab]);

  useEffect(() => {
    if (tab === 'bills') loadBills();
  }, [tab, loadBills]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  if (error || !ledger) {
    return (
      <div className="px-6 py-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error || 'Ledger not found'}
        </div>
      </div>
    );
  }

  const isDr = balance?.balance_type === 'dr';

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <button onClick={() => router.push('/hub-management/accounts/ledgers')} className="flex items-center gap-1.5 text-sm text-black hover:text-black mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Ledger Master
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">{ledger.name}</h1>
          <p className="text-sm text-black mt-0.5">{ledger.gstin ? `GSTIN: ${ledger.gstin}` : 'No GSTIN on file'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/hub-management/accounts/audit-log?entity_type=ledger&entity_id=${id}`)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-black hover:bg-gray-50"
          >
            <History className="w-4 h-4" /> History
          </button>
        </div>
      </div>

      {/* Balance card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <p className="text-xs font-semibold text-black uppercase tracking-wide mb-1">Current Balance</p>
        <p className={`text-3xl font-bold ${isDr ? 'text-emerald-700' : 'text-rose-700'}`}>
          ₹{formatINR(balance?.balance)} — {OWES_LABEL[balance?.balance_type] || ''}
        </p>
        <div className="flex gap-6 mt-3 text-sm text-black">
          <span>Total Money In: <span className="font-medium text-black">₹{formatINR(balance?.total_dr)}</span></span>
          <span>Total Money Out: <span className="font-medium text-black">₹{formatINR(balance?.total_cr)}</span></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab('statement')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === 'statement' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-black hover:text-black'}`}
        >
          Statement
        </button>
        {ledger.is_bill_wise && (
          <button
            onClick={() => setTab('bills')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === 'bills' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-black hover:text-black'}`}
          >
            Bills
          </button>
        )}
      </div>

      {tab === 'statement' && <StatementView ledgerId={id} />}

      {tab === 'bills' && ledger.is_bill_wise && (
        <div>
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setBillsSubTab('outstanding')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${billsSubTab === 'outstanding' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-black'}`}
            >
              Outstanding
            </button>
            <button
              onClick={() => setBillsSubTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${billsSubTab === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-black'}`}
            >
              All Bills
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <BillsTable bills={bills} loading={billsLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
