'use client';

import { usePathname, useRouter } from 'next/navigation';
import { 
  Clock, 
  Search,
  BookOpen,
  Building2,
  ChevronRight
} from 'lucide-react';

// Side menu options
const MENU_OPTIONS = [
  {
    id: 'recent-bill',
    name: 'Recent Bills',
    icon: Clock,
    description: 'View recently created bills',
    path: '/company-ledger/recent-bill'
  },
  {
    id: 'search',
    name: 'Search',
    icon: Search,
    description: 'Search bills & ledger entries',
    path: '/company-ledger/search'
  },
  {
    id: 'company-ledger',
    name: 'Company Wise Ledger',
    icon: BookOpen,
    description: 'View ledger by company',
    path: '/company-ledger/company-ledger'
  },
  {
    id: 'company-profile',
    name: 'Company Management',
    icon: Building2,
    description: 'Manage company profiles',
    path: '/company-ledger/company-profile'
  }
];

export default function SideNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveMenu = () => {
    const current = MENU_OPTIONS.find(option => pathname === option.path || pathname.startsWith(option.path + '/'));
    return current?.id || 'recent-bill';
  };

  const activeMenu = getActiveMenu();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
      {/* Header Section */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Ledger Hub</h2>
            <p className="text-xs text-blue-100">Financial Management</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Section */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {MENU_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = activeMenu === option.id;
          
          return (
            <button
              key={option.id}
              onClick={() => router.push(option.path)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' 
                  : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                    {option.name}
                  </p>
                  <p className="text-xs text-gray-400">{option.description}</p>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'text-blue-600 rotate-90' : 'text-gray-300'}`} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
