'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Clock, 
  Search,
  BookOpen,
  Building2,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getActiveMenu = () => {
    const current = MENU_OPTIONS.find(option => pathname === option.path || pathname.startsWith(option.path + '/'));
    return current?.id || 'recent-bill';
  };

  const activeMenu = getActiveMenu();

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex-shrink-0 flex flex-col transition-all duration-300`}>
      {/* Header Section */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-semibold text-white">Ledger Hub</h2>
              <p className="text-xs text-blue-100">Financial Management</p>
            </div>
          )}
        </div>
        
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>
      
      {/* Navigation Section */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {MENU_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = activeMenu === option.id;
          
          return (
            <button
              key={option.id}
              onClick={() => router.push(option.path)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between p-3'} rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' 
                  : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
              }`}
              title={isCollapsed ? option.name : ''}
            >
              <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                {!isCollapsed && (
                  <div className="text-left">
                    <p className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                      {option.name}
                    </p>
                    <p className="text-xs text-gray-400">{option.description}</p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'text-blue-600 rotate-90' : 'text-gray-300'}`} />
              )}
            </button>
          );
        })}
      </nav>
      
      {/* Collapse indicator at bottom */}
      {!isCollapsed && (
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setIsCollapsed(true)}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
            <span>Collapse</span>
          </button>
        </div>
      )}
    </div>
  );
}
