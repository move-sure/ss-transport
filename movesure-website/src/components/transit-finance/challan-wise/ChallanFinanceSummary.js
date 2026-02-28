'use client';

import React from 'react';
import { DollarSign, Package, TrendingUp, CreditCard, Banknote, Gift } from 'lucide-react';

function StatCard({ icon: Icon, iconBg, iconColor, label, value, valueColor = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm px-3 py-2 flex items-center gap-2.5 min-w-0">
      <div className={`p-1.5 rounded-lg ${iconBg} flex-shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}</div>
        <div className={`text-sm font-extrabold ${valueColor} truncate`}>{value}</div>
      </div>
    </div>
  );
}

export default function ChallanFinanceSummary({ financialSummary, filteredCount, totalCount }) {
  if (!financialSummary) return null;

  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200 p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-blue-600" />
          Financial Summary
        </h3>
        <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
          {filteredCount} of {totalCount} bilties
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <StatCard
          icon={DollarSign}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="Total Amount"
          value={`₹${(financialSummary.totalAmount / 1000).toFixed(1)}K`}
          valueColor="text-blue-800"
        />
        <StatCard
          icon={CreditCard}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Paid"
          value={financialSummary.paidCount}
          valueColor="text-green-700"
        />
        <StatCard
          icon={Banknote}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          label="To Pay"
          value={financialSummary.toBillCount}
          valueColor="text-orange-700"
        />
        <StatCard
          icon={Gift}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label="FOC"
          value={financialSummary.toPaidCount}
          valueColor="text-purple-700"
        />
        <StatCard
          icon={Package}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
          label="Packages"
          value={financialSummary.totalPackages.toLocaleString()}
          valueColor="text-indigo-700"
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
          label="Weight"
          value={`${(financialSummary.totalWeight / 1000).toFixed(2)}T`}
          valueColor="text-violet-700"
        />
      </div>
    </div>
  );
}
