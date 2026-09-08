'use client';

import { Building2 } from 'lucide-react';
import { useBranch } from './useBranch';

/**
 * The one place the selected branch is changed — every accounting screen
 * reads it back via useBranch(). Lives in the layout so it survives
 * navigation between screens instead of resetting per page.
 */
export default function BranchBar() {
  const { branches, branchId, setBranch } = useBranch();

  return (
    <div className="flex items-center gap-2 px-6 py-2.5 bg-white border-b border-gray-100">
      <Building2 className="w-4 h-4 text-black flex-shrink-0" />
      <span className="text-xs font-semibold text-black uppercase tracking-wide">Branch</span>
      <select
        value={branchId || ''}
        onChange={(e) => setBranch(e.target.value)}
        className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-emerald-500"
      >
        <option value="all">All Branches</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.branch_name}</option>
        ))}
      </select>
      <span className="text-xs text-black">
        Kanpur Delivery, Cash Manager, and Banks always use one specific branch regardless of this.
      </span>
    </div>
  );
}
