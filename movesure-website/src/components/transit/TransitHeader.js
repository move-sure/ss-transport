'use client';

import React from 'react';
import { format } from 'date-fns';
import { Truck, Package, AlertCircle, RefreshCw, Eye, FileText } from 'lucide-react';
import SampleLoadingChallan from './SampleLoadingChallan';

const TransitHeader = ({ 
  userBranch, 
  user, 
  bilties, 
  transitBilties, 
  selectedBilties, 
  selectedChallan,
  onRefresh,
  onPreviewLoadingChallan,
  onPreviewChallanBilties,
  availableCount, // filtered count from BiltyList
  permanentDetails
}) => {
  // Calculate total weight of bilties in challan
  const totalWeightRaw = transitBilties.reduce(
    (total, bilty) => total + (parseFloat(bilty.wt) || 0),
    0
  );

  const totalWeightRounded = Number(totalWeightRaw.toFixed(2));
  const weightWholeKg = Number.isInteger(totalWeightRounded)
    ? totalWeightRounded
    : totalWeightRounded;

  const tons = Math.floor(totalWeightRounded / 1000);
  const remainderAfterTons = totalWeightRounded - tons * 1000;
  const quintals = Math.floor(remainderAfterTons / 100);
  const remainderAfterQuintals = remainderAfterTons - quintals * 100;
  const remainingKg = Number(remainderAfterQuintals.toFixed(2));

  const formatWeightValue = (value) =>
    Number.isInteger(value) ? value.toString() : Number(value.toFixed(2)).toString();

  const weightLabel = `${formatWeightValue(weightWholeKg)} KG`;

  const breakdownParts = [
    tons > 0 ? `${tons} ton` : null,
    quintals > 0 ? `${quintals} quintal` : null,
    remainingKg > 0 || totalWeightRounded === 0
      ? `${formatWeightValue(remainingKg)} kg`
      : null
  ].filter(Boolean);

  const weightBreakdown = breakdownParts.join(' ');

  const now = format(new Date(), 'dd MMM yyyy • HH:mm');
  const isChallanDispatched = Boolean(selectedChallan?.is_dispatched);
  const challanNumber = selectedChallan?.challan_no || null;
  const challanLabel = challanNumber ? `Challan ${challanNumber}` : 'No challan selected';

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-sm px-3 py-2.5 md:px-4 md:py-3 space-y-2.5">
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8EDFF] text-[#5A39E9]">
            <Truck className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{userBranch?.branch_name || 'Unknown Branch'}</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-slate-500">{user?.username || 'Guest'}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{now}</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 text-sm text-slate-500 md:items-end">
          {challanNumber ? (
            <div className="inline-flex flex-col items-start rounded-xl bg-[#ede9ff] px-4 py-2 text-[#2f20a0] shadow-sm md:items-end">
              <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#8376d8]">
                Challan
              </span>
              <span className="text-2xl font-bold leading-tight md:text-3xl">{challanNumber}</span>
            </div>
          ) : (
            <span className="text-base font-semibold text-slate-900 md:text-lg">{challanLabel}</span>
          )}
          {isChallanDispatched && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
              <AlertCircle className="h-3.5 w-3.5" /> Dispatched
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            <span>Available</span>
            <Package className="h-4 w-4 text-[#5A39E9]" />
          </div>
          <p className="mt-1 text-[24px] font-semibold leading-none text-slate-900">{availableCount ?? 0}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            <span>In Transit</span>
            <Truck className="h-4 w-4 text-[#5A39E9]" />
          </div>
          <p className="mt-1 flex items-center gap-2 text-[24px] font-semibold leading-none text-slate-900">
            {transitBilties.length}
            {isChallanDispatched && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                DISP
              </span>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            <span>Weight</span>
            <AlertCircle className="h-4 w-4 text-[#5A39E9]" />
          </div>
          <p className="mt-1 text-[24px] font-semibold leading-none text-slate-900">{weightLabel}</p>
          {weightBreakdown && (
            <p className="mt-1 text-[11px] font-medium text-slate-500">{weightBreakdown}</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            <span>Selected</span>
            <FileText className="h-4 w-4 text-[#5A39E9]" />
          </div>
          <p className="mt-1 text-[24px] font-semibold leading-none text-slate-900">{selectedBilties.length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:w-auto">
          <SampleLoadingChallan userBranch={userBranch} permanentDetails={permanentDetails} />
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            onClick={onPreviewLoadingChallan}
            disabled={bilties.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#5A39E9] bg-white px-4 py-2.5 text-base font-semibold text-[#5A39E9] transition hover:bg-[#f3f1ff] hover:text-[#4329ce] disabled:cursor-not-allowed disabled:opacity-60"
            title="Preview or download all available bilties as PDF"
          >
            <Eye className="h-4 w-4" />
            Loading Challan
          </button>

          <button
            onClick={onPreviewChallanBilties}
            disabled={!selectedChallan || transitBilties.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#5A39E9] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#4a2dd7] disabled:cursor-not-allowed disabled:bg-opacity-60"
            title={selectedChallan?.challan_no ? `Preview or download challan ${selectedChallan.challan_no} bilties as PDF` : 'Select a challan first'}
          >
            <FileText className="h-4 w-4" />
            {selectedChallan?.challan_no ? `Challan ${selectedChallan.challan_no}` : 'Print Challan'}
          </button>

          <button
            onClick={onRefresh}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransitHeader;