'use client';

import React from 'react';
import { format } from 'date-fns';
import { Truck, Package, AlertCircle, RefreshCw, Eye, FileText, IndianRupee, Wallet, CreditCard, Receipt, Boxes } from 'lucide-react';
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

  // Calculate payment mode amounts - Same logic as PDF preview
  const paymentModeData = transitBilties.reduce(
    (acc, bilty) => {
      const amount = parseFloat(bilty.total) || 0; // Use 'total' field like in PDF
      const paymentMode = (bilty.payment_mode || '').toLowerCase();
      
      acc.totalAmount += amount;
      
      if (paymentMode === 'to-pay') {
        acc.toPayAmount += amount;
        acc.toPayCount += 1;
      } else if (paymentMode === 'paid') {
        acc.paidAmount += amount;
        acc.paidCount += 1;
      }
      
      return acc;
    },
    { totalAmount: 0, toPayAmount: 0, paidAmount: 0, toPayCount: 0, paidCount: 0 }
  );

  // Calculate E-way Bills count - Same logic as PDF preview
  const totalEwayBills = transitBilties.reduce((total, bilty) => {
    if (bilty.e_way_bill && bilty.e_way_bill.trim() !== '') {
      // Split by comma and count each individual e-way bill
      const ewayBills = bilty.e_way_bill.split(',').filter(bill => bill.trim() !== '');
      return total + ewayBills.length;
    }
    return total;
  }, 0);

  const totalPackages = transitBilties.reduce(
    (sum, bilty) => sum + (Number(bilty.no_of_pkg) || 0),
    0
  );

  const accentStyles = {
    indigo: { border: 'border-indigo-100', icon: 'text-indigo-500' },
    blue: { border: 'border-blue-100', icon: 'text-blue-500' },
    amber: { border: 'border-amber-100', icon: 'text-amber-500' },
    violet: { border: 'border-violet-100', icon: 'text-violet-500' },
    slate: { border: 'border-slate-200', icon: 'text-slate-500' },
    emerald: { border: 'border-emerald-100', icon: 'text-emerald-500' }
  };

  const now = format(new Date(), 'dd MMM yyyy • HH:mm');
  const isChallanDispatched = Boolean(selectedChallan?.is_dispatched);
  const challanNumber = selectedChallan?.challan_no || null;
  const challanLabel = challanNumber ? `Challan ${challanNumber}` : 'No challan selected';

  const quickStats = [
    {
      label: 'Available',
      value: availableCount ?? 0,
      subLabel: 'Filtered results',
      icon: Package,
      accent: 'indigo'
    },
    {
      label: 'In Transit',
      value: transitBilties.length,
      subLabel: selectedChallan
        ? isChallanDispatched
          ? 'Dispatched'
          : 'Pending dispatch'
        : 'No challan selected',
      icon: Truck,
      accent: 'blue'
    },
    {
      label: 'Weight',
      value: weightLabel,
      subLabel: weightBreakdown || 'Breakdown pending',
      icon: AlertCircle,
      accent: 'amber'
    },
    {
      label: 'E-way Bills',
      value: totalEwayBills,
      subLabel: `${transitBilties.length || 0} ${transitBilties.length === 1 ? 'bilty' : 'bilties'}`,
      icon: Receipt,
      accent: 'violet'
    },
    {
      label: 'Selected',
      value: selectedBilties.length,
      subLabel: 'Marked for challan',
      icon: FileText,
      accent: 'slate'
    },
    {
      label: 'Packages',
      value: totalPackages,
      subLabel: 'Transit packages',
      icon: Boxes,
      accent: 'emerald'
    }
  ];

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white/95 px-3 py-3 shadow-sm space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Truck className="h-4 w-4" />
          </span>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="text-sm font-semibold text-slate-900">{userBranch?.branch_name || 'Unknown Branch'}</span>
              <span className="hidden sm:inline">•</span>
              <span>{user?.username || 'Guest'}</span>
            </div>
            <p className="text-[11px] text-slate-400">{now}</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 text-xs text-slate-500 md:items-end">
          {challanNumber ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-indigo-700">
              <span className="text-[10px] uppercase tracking-[0.3em] text-indigo-500">Challan</span>
              <span className="text-lg font-semibold">{challanNumber}</span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-700">{challanLabel}</span>
          )}
          {selectedChallan && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[10px] font-semibold ${
                isChallanDispatched ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <AlertCircle className="h-3 w-3" />
              {isChallanDispatched ? 'Dispatched' : 'Pending dispatch'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {quickStats.map(({ label, value, subLabel, icon: Icon, accent }) => {
          const accentStyle = accentStyles[accent] || accentStyles.indigo;
          return (
            <div
              key={label}
              className={`rounded-xl border ${accentStyle.border} bg-white/80 px-3 py-2 shadow-sm`}
            >
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>{label}</span>
                <Icon className={`h-4 w-4 ${accentStyle.icon}`} />
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
              {subLabel && <p className="mt-0.5 text-[10px] text-slate-500">{subLabel}</p>}
            </div>
          );
        })}
      </div>

      {selectedChallan && transitBilties.length > 0 && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
              <span>Total Amount</span>
              <IndianRupee className="h-4 w-4" />
            </div>
            <p className="mt-1 text-xl font-semibold text-emerald-700">
              ₹{formatAmount(paymentModeData.totalAmount)}
            </p>
            <p className="text-[10px] text-emerald-600">
              {transitBilties.length} {transitBilties.length === 1 ? 'bilty' : 'bilties'}
            </p>
          </div>

          <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
              <span>To-Pay</span>
              <Wallet className="h-4 w-4" />
            </div>
            <p className="mt-1 text-xl font-semibold text-amber-700">
              ₹{formatAmount(paymentModeData.toPayAmount)}
            </p>
            <p className="text-[10px] text-amber-600">
              {paymentModeData.toPayCount} {paymentModeData.toPayCount === 1 ? 'bilty' : 'bilties'}
            </p>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
              <span>Paid</span>
              <CreditCard className="h-4 w-4" />
            </div>
            <p className="mt-1 text-xl font-semibold text-blue-700">
              ₹{formatAmount(paymentModeData.paidAmount)}
            </p>
            <p className="text-[10px] text-blue-600">
              {paymentModeData.paidCount} {paymentModeData.paidCount === 1 ? 'bilty' : 'bilties'}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:w-auto">
          <SampleLoadingChallan userBranch={userBranch} permanentDetails={permanentDetails} />
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            onClick={onPreviewLoadingChallan}
            disabled={bilties.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            title="Preview or download all available bilties as PDF"
          >
            <Eye className="h-4 w-4" />
            Loading Challan
          </button>

          <button
            onClick={onPreviewChallanBilties}
            disabled={!selectedChallan || transitBilties.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-opacity-60"
            title={selectedChallan?.challan_no ? `Preview or download challan ${selectedChallan.challan_no} bilties as PDF` : 'Select a challan first'}
          >
            <FileText className="h-4 w-4" />
            {selectedChallan?.challan_no ? `Challan ${selectedChallan.challan_no}` : 'Print Challan'}
          </button>

          <button
            onClick={onRefresh}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
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