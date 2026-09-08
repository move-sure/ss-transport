'use client';

import { useState } from 'react';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDate, formatINR, isOverdue } from './helpers';

const METADATA_LABELS = {
  challan_no: 'Challan No',
  weight: 'Weight',
  unloading: 'Unloading',
  crossing: 'Crossing',
  dala_munshiyana: 'Dala Munshiyana',
  labour_wage: 'Labour Wage',
  other_charge: 'Other Charge',
};

function BillRow({ b, onPay, colSpan }) {
  const [open, setOpen] = useState(false);
  const overdue = isOverdue(b.due_date, b.is_settled);
  const hasBreakdown = b.metadata && Object.keys(b.metadata).length > 0;

  return (
    <>
      <tr
        className={`${overdue ? 'bg-red-50/60' : 'hover:bg-gray-50'} ${hasBreakdown ? 'cursor-pointer' : ''}`}
        onClick={hasBreakdown ? () => setOpen((o) => !o) : undefined}
      >
        <td className="px-4 py-2.5 font-medium text-black">
          <span className="flex items-center gap-1">
            {hasBreakdown && (open ? <ChevronDown className="w-3.5 h-3.5 text-black" /> : <ChevronRight className="w-3.5 h-3.5 text-black" />)}
            {b.reference_no}
          </span>
        </td>
        <td className="px-4 py-2.5 text-black">{formatDate(b.reference_date)}</td>
        <td className={`px-4 py-2.5 ${overdue ? 'text-red-600 font-semibold' : 'text-black'}`}>{formatDate(b.due_date)}</td>
        <td className="px-4 py-2.5 text-right">₹{formatINR(b.bill_amount)}</td>
        <td className="px-4 py-2.5 text-right font-medium">₹{formatINR(b.balance_amount)}</td>
        <td className="px-4 py-2.5 text-center">
          {b.is_settled ? (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Settled</span>
          ) : overdue ? (
            <span className="text-[10px] font-semibold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">Overdue</span>
          ) : (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Open</span>
          )}
        </td>
        {onPay && (
          <td className="px-4 py-2.5 text-right">
            {!b.is_settled && (
              <button onClick={(e) => { e.stopPropagation(); onPay(b); }} className="text-xs font-semibold text-emerald-700 hover:underline">Record Payment</button>
            )}
          </td>
        )}
      </tr>
      {open && hasBreakdown && (
        <tr>
          <td colSpan={colSpan} className="px-4 pb-4 bg-gray-50/60">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-black pt-2">
              {Object.entries(b.metadata).map(([key, val]) => (
                <span key={key}>
                  <span className="font-semibold">{METADATA_LABELS[key] || key}:</span>{' '}
                  {key === 'weight' ? val : `₹${formatINR(val)}`}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function BillsTable({ bills, loading, emptyLabel = 'No bills found', onPay }) {
  if (loading) {
    return <div className="py-10 text-center"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></div>;
  }

  if (!bills?.length) {
    return <div className="py-10 text-center text-black text-sm">{emptyLabel}</div>;
  }

  const colSpan = onPay ? 7 : 6;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-black text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold">Reference No</th>
            <th className="text-left px-4 py-2.5 font-semibold">Date</th>
            <th className="text-left px-4 py-2.5 font-semibold">Due Date</th>
            <th className="text-right px-4 py-2.5 font-semibold">Bill Amount</th>
            <th className="text-right px-4 py-2.5 font-semibold">Balance</th>
            <th className="text-center px-4 py-2.5 font-semibold">Settled?</th>
            {onPay && <th className="text-right px-4 py-2.5 font-semibold">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 text-black">
          {bills.map((b) => <BillRow key={b.id} b={b} onPay={onPay} colSpan={colSpan} />)}
        </tbody>
      </table>
    </div>
  );
}
