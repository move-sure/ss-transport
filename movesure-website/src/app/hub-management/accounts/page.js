'use client';

import { useRouter } from 'next/navigation';
import {
  BookUser, ScrollText, History, ArrowRight,
  Truck, Wallet, Package, Users,
} from 'lucide-react';

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

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Accounting</h1>
        <p className="text-sm text-black mt-1">
          All your accounts and transactions in one place.
        </p>
      </div>

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
