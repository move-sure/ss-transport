'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/utils/auth';
import { useBranch } from '@/components/hub-management/accounts/useBranch';
import { Loader2, Truck, FileText, FileMinus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { transportersApi } from '@/components/hub-management/accounts/api';
import { formatINR } from '@/components/hub-management/accounts/helpers';
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
  // Backdate a bill (e.g. raising August's bill in early September) by picking
  // a date in that period — the backend derives bill_month/bill_year from it.
  { key: 'date', label: 'Bill Date (optional — defaults to today)', type: 'date' },
  { key: 'due_date', label: 'Due Date (optional)', type: 'date' },
];

// Same shape as BILL_FIELDS — payable-bill doesn't take bill_month/bill_year,
// just reference_no/date/due_date.
const PAYABLE_BILL_FIELDS = [
  { key: 'reference_no', label: 'Their Invoice/Reference No', required: true, placeholder: 'e.g. NIR-INV-204' },
  { key: 'date', label: 'Bill Date (optional — defaults to today)', type: 'date' },
  { key: 'due_date', label: 'Due Date (optional)', type: 'date' },
];

export default function TransportPfCollectionPage() {
  const { user } = useAuth();
  const { branchId, isAllBranches } = useBranch();
  // Party accounts are always tied to one physical branch, even when "All
  // Branches" is picked elsewhere.
  const effectiveBranchId = isAllBranches ? user?.branch_id : branchId;
  const [showNewBill, setShowNewBill] = useState(false);
  const [showPayableBill, setShowPayableBill] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [showGive, setShowGive] = useState(false);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    if (!effectiveBranchId) { setSummaryLoading(false); return; }
    try {
      setSummaryLoading(true);
      const res = await transportersApi.summary({ branch_id: effectiveBranchId });
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load transporter summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [effectiveBranchId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  if (!user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Total across every transporter — live balances, not affected by any date filter */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-gray-100 bg-white flex items-center gap-6 flex-wrap">
        {summaryLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
        ) : summary ? (
          <>
            <div>
              <p className="text-[10px] font-semibold text-black uppercase tracking-wide">Total They Owe You</p>
              <p className="text-lg font-bold text-emerald-700">₹{formatINR(summary.totals?.total_they_owe_you)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-black uppercase tracking-wide">Total You Owe Them</p>
              <p className="text-lg font-bold text-rose-700">₹{formatINR(summary.totals?.total_you_owe_them)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-black uppercase tracking-wide">Net</p>
              <p className="text-lg font-bold text-black">₹{formatINR(summary.totals?.net)}</p>
            </div>
            <span className="text-xs text-black">across {summary.totals?.transporter_count ?? 0} transporter(s)</span>
          </>
        ) : null}
      </div>

      <div className="flex-1 min-h-0">
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
          {({ detail, refreshDetail }) => {
            const refreshAll = () => { refreshDetail(); loadSummary(); };
            const openBills = (detail.bills || []).filter((b) => !b.is_settled);
            return (
              <>
                <button onClick={() => setShowNewBill(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
                  <FileText className="h-4 w-4" /> New Bill
                </button>
                <button onClick={() => setShowPayableBill(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-200 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50 shadow-sm"
                  title="They billed you — e.g. they carried freight for you">
                  <FileMinus className="h-4 w-4" /> Payable Bill
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
                    refreshAll();
                  }}
                />

                {/* Same ledger, opposite side — they billed you (e.g. freight they carried
                    for you). Settle it later from Give Payment by picking it there. */}
                <AddChargeModal
                  isOpen={showPayableBill}
                  onClose={() => setShowPayableBill(false)}
                  title="Payable Bill"
                  subtitle={`You will owe ${detail.ledger?.name} this amount — settle it later from Give Payment.`}
                  fields={PAYABLE_BILL_FIELDS}
                  submitLabel="Raise Payable Bill"
                  onSubmit={async (payload) => {
                    await transportersApi.raisePayableBill(detail.ledger.id, { branch_id: effectiveBranchId, ...payload, created_by: user.id });
                    setShowPayableBill(false);
                    customAlert('Payable bill raised', 'success');
                    refreshAll();
                  }}
                />

                <PayModal
                  isOpen={showCollect}
                  onClose={() => setShowCollect(false)}
                  title="Collect Payment"
                  subtitle="How much did they pay? Bill list isn't filtered by direction yet — make sure you pick a bill THEY owe you, not a Payable Bill."
                  bills={openBills}
                  branchId={effectiveBranchId}
                  onSubmit={async (payload) => {
                    await transportersApi.collect(detail.ledger.id, { branch_id: effectiveBranchId, ...payload, created_by: user.id });
                    setShowCollect(false);
                    customAlert('Payment collected', 'success');
                    refreshAll();
                  }}
                />

                <PayModal
                  isOpen={showGive}
                  onClose={() => setShowGive(false)}
                  title="Give Payment"
                  subtitle="An advance, or settling a Payable Bill. Bill list isn't filtered by direction yet — make sure you pick a Payable Bill, not one THEY owe you."
                  bills={openBills}
                  branchId={effectiveBranchId}
                  onSubmit={async (payload) => {
                    await transportersApi.give(detail.ledger.id, { branch_id: effectiveBranchId, ...payload, created_by: user.id });
                    setShowGive(false);
                    customAlert('Payment given', 'success');
                    refreshAll();
                  }}
                />
              </>
            );
          }}
        </PartyMasterDetail>
      </div>
    </div>
  );
}
