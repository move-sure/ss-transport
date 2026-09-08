'use client';

import { useState } from 'react';
import { useAuth } from '@/app/utils/auth';
import { useBranch } from '@/components/hub-management/accounts/useBranch';
import { Loader2, Truck, FileText, ArrowUpCircle } from 'lucide-react';
import { driversApi } from '@/components/hub-management/accounts/api';
import { customAlert } from '@/components/common/alert-system';
import PartyMasterDetail from '@/components/hub-management/accounts/PartyMasterDetail';
import AddChargeModal from '@/components/hub-management/accounts/AddChargeModal';
import PayModal from '@/components/hub-management/accounts/PayModal';

const ADD_FIELDS = [
  { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Ramu Driver (UP78 XX 1234)' },
  { key: 'phone', label: 'Phone (optional)' },
];

const BHADA_FIELDS = [
  { key: 'challan_no', label: 'Challan No', required: true, placeholder: 'e.g. 0350' },
  { key: 'truck_number', label: 'Truck Number (optional)', placeholder: 'e.g. UP78 XX 1234' },
];

export default function TruckBhadaPage() {
  const { user } = useAuth();
  const { branchId, isAllBranches } = useBranch();
  // Party accounts are always tied to one physical branch, even when "All
  // Branches" is picked elsewhere.
  const effectiveBranchId = isAllBranches ? user?.branch_id : branchId;
  const [showAddBhada, setShowAddBhada] = useState(false);
  const [showPay, setShowPay] = useState(false);

  if (!user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  return (
    <PartyMasterDetail
      icon={Truck}
      title="Truck Bhada"
      partyLabel="Driver"
      addFields={ADD_FIELDS}
      listFn={driversApi.list}
      createFn={driversApi.create}
      detailFn={driversApi.get}
      branchId={effectiveBranchId}
      userId={user.id}
    >
      {({ detail, refreshDetail }) => (
        <>
          <button onClick={() => setShowAddBhada(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
            <FileText className="h-4 w-4" /> Add Trip Bhada
          </button>
          <button onClick={() => setShowPay(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold hover:bg-rose-50 shadow-sm">
            <ArrowUpCircle className="h-4 w-4" /> Pay
          </button>

          <AddChargeModal
            isOpen={showAddBhada}
            onClose={() => setShowAddBhada(false)}
            title="Add Trip Bhada"
            subtitle={`This records what you owe ${detail.ledger?.name} for this trip.`}
            fields={BHADA_FIELDS}
            submitLabel="Add Bhada"
            onSubmit={async (payload) => {
              await driversApi.addBhada(detail.ledger.id, { branch_id: effectiveBranchId, ...payload, created_by: user.id });
              setShowAddBhada(false);
              customAlert('Trip bhada added', 'success');
              refreshDetail();
            }}
          />

          <PayModal
            isOpen={showPay}
            onClose={() => setShowPay(false)}
            title="Pay Driver"
            subtitle="How much, cash or bank?"
            bills={(detail.bills || []).filter((b) => !b.is_settled)}
            branchId={effectiveBranchId}
            onSubmit={async (payload) => {
              await driversApi.pay(detail.ledger.id, { branch_id: effectiveBranchId, ...payload, created_by: user.id });
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
