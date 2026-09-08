'use client';

import { useState } from 'react';
import { useAuth } from '@/app/utils/auth';
import { useBranch } from '@/components/hub-management/accounts/useBranch';
import { Loader2, Users, FileText, ArrowUpCircle } from 'lucide-react';
import { labourApi } from '@/components/hub-management/accounts/api';
import { customAlert } from '@/components/common/alert-system';
import PartyMasterDetail from '@/components/hub-management/accounts/PartyMasterDetail';
import AddLabourExpenseModal from '@/components/hub-management/accounts/AddLabourExpenseModal';
import PayModal from '@/components/hub-management/accounts/PayModal';

const ADD_FIELDS = [
  { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Suresh Loader' },
];

export default function LabourKharchaPage() {
  const { user } = useAuth();
  const { branchId, isAllBranches } = useBranch();
  // Party accounts are always tied to one physical branch, even when "All
  // Branches" is picked elsewhere.
  const effectiveBranchId = isAllBranches ? user?.branch_id : branchId;
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showPay, setShowPay] = useState(false);

  if (!user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  return (
    <PartyMasterDetail
      icon={Users}
      title="Labour Kharcha"
      partyLabel="Labourer"
      addFields={ADD_FIELDS}
      listFn={labourApi.list}
      createFn={labourApi.create}
      detailFn={labourApi.get}
      branchId={effectiveBranchId}
      userId={user.id}
    >
      {({ detail, refreshDetail }) => (
        <>
          <button onClick={() => setShowAddExpense(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
            <FileText className="h-4 w-4" /> Add Expense
          </button>
          <button onClick={() => setShowPay(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold hover:bg-rose-50 shadow-sm">
            <ArrowUpCircle className="h-4 w-4" /> Pay
          </button>

          <AddLabourExpenseModal
            isOpen={showAddExpense}
            onClose={() => setShowAddExpense(false)}
            subtitle={`This records what you owe ${detail.ledger?.name}.`}
            onSubmit={async (payload) => {
              await labourApi.addExpense(detail.ledger.id, { branch_id: effectiveBranchId, ...payload, created_by: user.id });
              setShowAddExpense(false);
              customAlert('Expense added', 'success');
              refreshDetail();
            }}
          />

          <PayModal
            isOpen={showPay}
            onClose={() => setShowPay(false)}
            title="Pay Labourer"
            subtitle="How much, cash or bank?"
            bills={(detail.bills || []).filter((b) => !b.is_settled)}
            branchId={effectiveBranchId}
            onSubmit={async (payload) => {
              await labourApi.pay(detail.ledger.id, { branch_id: effectiveBranchId, ...payload, created_by: user.id });
              setShowPay(false);
              customAlert('Payment recorded', 'success');
              refreshDetail();
            }}
          />
        </>
      )}
    </PartyMasterDetail>
  );
}
