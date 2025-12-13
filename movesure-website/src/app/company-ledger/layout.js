'use client';

import Navbar from '../../components/dashboard/navbar';
import SideNavbar from '../../components/company-ledger/common/SideNavbar';

export default function CompanyLedgerLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      <Navbar />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Side Navbar Component */}
        <SideNavbar />

        {/* Main Content Area - Full Width */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
