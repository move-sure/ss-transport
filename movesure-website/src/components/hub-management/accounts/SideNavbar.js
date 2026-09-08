'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  BookUser,
  ScrollText,
  History,
  Truck,
  Wallet,
  Package,
  Users,
} from 'lucide-react';

const DAILY_OPTIONS = [
  { id: 'transporters', name: 'Transport PF Collection', icon: Truck, description: 'Bill, collect, or advance a transporter', path: '/hub-management/accounts/transporters' },
  { id: 'delivery', name: 'Kanpur Delivery', icon: Package, description: 'Income & expense by GR no.', path: '/hub-management/accounts/delivery' },
  { id: 'cash-register', name: 'Cash Manager (Galla)', icon: Wallet, description: 'Day-by-day view of everything that touched your cash box', path: '/hub-management/accounts/cash-register' },
  { id: 'drivers', name: 'Truck Bhada', icon: Truck, description: 'What you owe each driver, per trip', path: '/hub-management/accounts/drivers' },
  { id: 'labour', name: 'Labour Kharcha', icon: Users, description: 'What you owe your loading labour, itemized', path: '/hub-management/accounts/labour' },
];

const ADVANCED_OPTIONS = [
  { id: 'ledgers', name: 'Ledger Master', icon: BookUser, description: 'Create banks, expense types, etc. — click any ledger for its full history', path: '/hub-management/accounts/ledgers' },
  { id: 'vouchers', name: 'Day Book', icon: ScrollText, description: 'Every voucher, from any screen', path: '/hub-management/accounts/vouchers' },
  { id: 'audit-log', name: 'Audit Log', icon: History, description: 'Who changed what, when', path: '/hub-management/accounts/audit-log' },
];

const MENU_OPTIONS = [...DAILY_OPTIONS, ...ADVANCED_OPTIONS];

export default function AccountsSideNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveMenu = () => {
    // ledgers/[id] detail pages still belong to the "Ledger Master" tab
    const current = MENU_OPTIONS.find(
      (option) => pathname === option.path || pathname.startsWith(option.path + '/')
    );
    return current?.id || 'transporters';
  };

  const activeMenu = getActiveMenu();

  const renderOption = (option) => {
    const Icon = option.icon;
    const isActive = activeMenu === option.id;

    return (
      <button
        key={option.id}
        onClick={() => router.push(option.path)}
        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group ${
          isActive
            ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600'
            : 'text-black hover:bg-gray-50 border-l-4 border-transparent'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-black group-hover:text-black'}`} />
          <div className="text-left">
            <p className={`text-sm font-medium ${isActive ? 'text-emerald-700' : 'text-black'}`}>
              {option.name}
            </p>
            <p className="text-xs text-black">{option.description}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-teal-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookUser className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Accounting</h2>
            <p className="text-xs text-emerald-100">Ledger & Vouchers</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {DAILY_OPTIONS.map(renderOption)}

        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-black uppercase tracking-wide">Advanced</p>
        {ADVANCED_OPTIONS.map(renderOption)}
      </nav>
    </div>
  );
}
