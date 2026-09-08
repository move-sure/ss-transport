'use client';

import { useState } from 'react';
import { useAuth } from '@/app/utils/auth';
import { useBranch } from '@/components/hub-management/accounts/useBranch';
import { Loader2, Truck, FileText, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { transportersApi } from '@/components/hub-management/accounts/api';
import { customAlert } from '@/components/common/alert-system';
import PartyMasterDetail from '@/components/hub-management/accounts/PartyMasterDetail';
import AddChargeModal from '@/components/hub-management/accounts/AddChargeModal';
import PayModal from '@/components/hub-management/accounts/PayModal';

const ADD_FIELDS = [
  { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Kanpur Bahraich Forwarding' },
  { key: 'gstin', label: 'GSTIN (optional)' },
  { key: 'phone', label: 'Phone (optional)' },
];

const BILL_FIELDS = [
  { key: 'reference_no', label: 'Bill Reference', required: true, placeholder: 'e.g. AUG-2026-KBF' },
  { key: 'due_date', label: 'Due Date (optional)', type: 'date' },
];

export default function TransportPfCollectionPage() {
  const { user } = useAuth();
  const { branchId, isAllBranches } = useBranch();
  // Party accounts are always tied to one physical branch, even when "All
  // Branches" is picked elsewhere.
  const effectiveBranchId = isAllBranches ? user?.branch_id : branchId;
  const [showNewBill, setShowNewBill] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [showGive, setShowGive] = useState(false);

  if (!user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  return (
    <PartyMasterDetail
      icon={Truck}
      title="Transport PF Collection"
      partyLabel="Transporter"
      addFields={ADD_FIELDS}
      listFn={transportersApi.list}
      createFn={transportersApi.create}
      detailFn={transportersApi.get}
      branchId={effectiveBranchId}
      userId={user.id}
    >
      {({ detail, refreshDetail }) => (
        <>
          <button onClick={() => setShowNewBill(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
            <FileText className="h-4 w-4" /> New Bill
          </button>
          <button onClick={() => setShowCollect(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 shadow-sm">
            <ArrowDownCircle className="h-4 w-4" /> Collect Payment
          </button>
          <button onClick={() => setShowGive(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold hover:bg-rose-50 shadow-sm">
            <ArrowUpCircle className="h-4 w-4" /> Give Payment
          </button>

          <AddChargeModal
            isOpen={showNewBill}
            onClose={() => setShowNewBill(false)}
            title="New Bill"
            subtitle={`${detail.ledger?.name} will owe you this amount.`}
            fields={BILL_FIELDS}
            submitLabel="Raise Bill"
            onSubmit={async (payload) => {
              await transportersApi.raiseBill(detail.ledger.id, { branch_id: effectiveBranchId, ...payload, created_by: user.id });
              setShowNewBill(false);
              customAlert('Bill raised', 'success');
              refreshDetail();
            }}
          />

          <PayModal
            isOpen={showCollect}
            onClose={() => setShowCollect(false)}
            title="Collect Payment"
            subtitle="How much did they pay?"
            bills={(detail.bills || []).filter((b) => !b.is_settled)}
            branchId={effectiveBranchId}
            onSubmit={async (payload) => {
              await transportersApi.collect(detail.ledger.id, { branch_id: effectiveBranchId, ...payload, created_by: user.id });
              setShowCollect(false);
              customAlert('Payment collected', 'success');
              refreshDetail();
            }}
          />

          <PayModal
            isOpen={showGive}
            onClose={() => setShowGive(false)}
            title="Give Payment"
            subtitle="An advance, or something not tied to a bill yet."
            bills={[]}
            branchId={effectiveBranchId}
            onSubmit={async (payload) => {
              await transportersApi.give(detail.ledger.id, { branch_id: effectiveBranchId, ...payload, created_by: user.id });
              setShowGive(false);
              customAlert('Payment given', 'success');
              refreshDetail();
            }}
          />
        </>
      )}
    </PartyMasterDetail>
  );
}
