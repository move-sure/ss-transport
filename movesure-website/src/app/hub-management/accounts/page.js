'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookUser, ScrollText, History, ArrowRight,
  Truck, Wallet, Package, Users, Loader2,
} from 'lucide-react';
import { useBranch } from '@/components/hub-management/accounts/useBranch';
import { transportersApi } from '@/components/hub-management/accounts/api';
import { formatINR } from '@/components/hub-management/accounts/helpers';

const DAILY_CARDS = [
  {
    id: 'transporters', name: 'Transport PF Collection', icon: Truck, color: 'from-emerald-500 to-teal-600',
    description: 'Bill a transporter, collect from them, or give an advance.',
    path: '/hub-management/accounts/transporters',
  },
  {
    id: 'delivery', name: 'Kanpur Delivery', icon: Package, color: 'from-purple-500 to-pink-600',
    description: 'Income & expense by GR number.',
    path: '/hub-management/accounts/delivery',
  },
  {
    id: 'cash-register', name: 'Cash Manager (Galla)', icon: Wallet, color: 'from-amber-500 to-orange-600',
    description: 'Day-by-day view of everything that touched your cash box.',
    path: '/hub-management/accounts/cash-register',
  },
  {
    id: 'drivers', name: 'Truck Bhada', icon: Truck, color: 'from-blue-500 to-indigo-600',
    description: 'What you owe each driver, per trip.',
    path: '/hub-management/accounts/drivers',
  },
  {
    id: 'labour', name: 'Labour Kharcha', icon: Users, color: 'from-cyan-500 to-blue-600',
    description: 'What you owe your loading labour, itemized per trip.',
    path: '/hub-management/accounts/labour',
  },
];

const ADVANCED_CARDS = [
  {
    id: 'ledgers', name: 'Ledger Master', icon: BookUser, color: 'from-emerald-500 to-teal-600',
    description: 'Create banks, expense types, or any other ledger.',
    path: '/hub-management/accounts/ledgers',
  },
  {
    id: 'vouchers', name: 'Day Book', icon: ScrollText, color: 'from-amber-500 to-orange-600',
    description: 'Every voucher created by the screens above.',
    path: '/hub-management/accounts/vouchers',
  },
  {
    id: 'audit-log', name: 'Audit Log', icon: History, color: 'from-black to-slate-700',
    description: 'See who changed what, and when.',
    path: '/hub-management/accounts/audit-log',
  },
];

function Card({ card, router }) {
  const Icon = card.icon;
  return (
    <button
      onClick={() => router.push(card.path)}
      className="group text-left bg-white rounded-xl border-2 border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 p-5"
    >
      <div className="flex items-start justify-between">
        <div className={`bg-gradient-to-br ${card.color} p-3 rounded-xl shadow-md`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <ArrowRight className="w-5 h-5 text-black group-hover:translate-x-1 transition-all" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-black">{card.name}</h3>
      <p className="mt-1 text-sm text-black">{card.description}</p>
    </button>
  );
}

export default function AccountsOverviewPage() {
  const router = useRouter();
  const { branchId, isAllBranches } = useBranch();

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    if (!branchId) { setSummaryLoading(false); return; }
    try {
      setSummaryLoading(true);
      // The overview is exactly where "All Branches" is most useful — omit
      // branch_id entirely (not the user's own branch) so an owner sees the
      // real total across every branch, matching Ledger Master's pattern.
      const res = await transportersApi.summary({ branch_id: isAllBranches ? undefined : branchId });
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load transporter summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [branchId, isAllBranches]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Accounting</h1>
        <p className="text-sm text-black mt-1">
          All your accounts and transactions in one place.
        </p>
      </div>

      {/* Headline stat: how much every transporter collectively owes you, right now */}
      <button
        onClick={() => router.push('/hub-management/accounts/transporters')}
        className="w-full text-left mb-8 bg-white rounded-2xl border-2 border-gray-100 hover:border-emerald-200 shadow-sm hover:shadow-md transition-all p-5 flex items-center gap-6 flex-wrap"
      >
        {summaryLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        ) : summary ? (
          <>
            <div>
              <p className="text-[10px] font-semibold text-black uppercase tracking-wide">Transport PF — Total Outstanding</p>
              <p className="text-2xl font-bold text-emerald-700">₹{formatINR(summary.totals?.total_they_owe_you)}</p>
            </div>
            <div className="text-sm text-black">
              You owe them: <span className="font-semibold text-rose-700">₹{formatINR(summary.totals?.total_you_owe_them)}</span>
            </div>
            <div className="text-sm text-black">
              Net: <span className="font-semibold text-black">₹{formatINR(summary.totals?.net)}</span>
            </div>
            <span className="text-xs text-black">across {summary.totals?.transporter_count ?? 0} transporter(s)</span>
          </>
        ) : (
          <span className="text-sm text-black">No transporter data yet — click to get started.</span>
        )}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {DAILY_CARDS.map((card) => <Card key={card.id} card={card} router={router} />)}
      </div>

      <p className="text-xs font-semibold text-black uppercase tracking-wide mb-3">Advanced</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ADVANCED_CARDS.map((card) => <Card key={card.id} card={card} router={router} />)}
      </div>
    </div>
  );
}
