'use client';

import { useAuth } from '@/app/utils/auth';
import Navbar from '@/components/dashboard/navbar';
import AccountsSideNavbar from '@/components/hub-management/accounts/SideNavbar';
import BranchBar from '@/components/hub-management/accounts/BranchBar';
import { BranchProvider } from '@/components/hub-management/accounts/useBranch';
import AlertSystem from '@/components/common/alert-system';

export default function AccountsLayout({ children }) {
  const { user } = useAuth();

  return (
    <BranchProvider defaultBranchId={user?.branch_id}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <AlertSystem />

        <div className="flex h-[calc(100vh-64px)]">
          <AccountsSideNavbar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <BranchBar />
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </BranchProvider>
  );
}
