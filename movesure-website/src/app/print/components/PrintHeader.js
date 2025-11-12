'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  MapPin,
  ArrowRight,
  Wallet,
  Truck,
  Receipt,
  Boxes,
  IndianRupee
} from 'lucide-react';

const accentStyles = {
  indigo: { border: 'border-indigo-100', icon: 'text-indigo-500' },
  blue: { border: 'border-blue-100', icon: 'text-blue-500' },
  amber: { border: 'border-amber-100', icon: 'text-amber-500' },
  emerald: { border: 'border-emerald-100', icon: 'text-emerald-500' },
  violet: { border: 'border-violet-100', icon: 'text-violet-500' }
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  const numeric = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numeric);
};

const toTitleCase = (text) => {
  if (!text) return '—';
  return text
    .toLowerCase()
    .split(/\s|-/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const PrintHeader = ({ biltyData, branchData, fromCityName, toCityName, t }) => {
  const biltyDate = useMemo(() => {
    if (!biltyData?.bilty_date) return '—';
    try {
      return format(new Date(biltyData.bilty_date), 'dd MMM yyyy • hh:mm a');
    } catch (error) {
      return biltyData.bilty_date;
    }
  }, [biltyData?.bilty_date]);

  const paymentModeLabel = useMemo(() => toTitleCase(biltyData?.payment_mode), [biltyData?.payment_mode]);
  const deliveryTypeLabel = useMemo(() => toTitleCase(biltyData?.delivery_type), [biltyData?.delivery_type]);

  const inTransitLabel = (typeof t === 'function' ? t('inTransit') : null) || 'In Transit';

  const quickStats = useMemo(
    () => [
      {
        label: t('packages'),
        value: biltyData?.no_of_pkg ?? 0,
        subLabel: `${biltyData?.wt ?? 0} KG`,
        icon: Boxes,
        accent: 'indigo'
      },
      {
        label: t('invoiceValue'),
        value: formatCurrency(biltyData?.invoice_value),
        subLabel: `${t('invoiceNo')} ${biltyData?.invoice_no || '—'}`,
        icon: Receipt,
        accent: 'violet'
      },
      {
        label: t('paymentMode'),
        value: paymentModeLabel,
        subLabel: `${t('totalAmount')} ${formatCurrency(biltyData?.total)}`,
        icon: Wallet,
        accent: 'amber'
      },
      {
        label: t('transport'),
        value: biltyData?.transport_name || '—',
        subLabel: biltyData?.transport_number ? `${t('mobile')}: ${biltyData.transport_number}` : `${t('mobile')}: —`,
        icon: Truck,
        accent: 'blue'
      }
    ], [biltyData, paymentModeLabel, t]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-lg sm:px-6 sm:py-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {t('grNumber')}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="h-4 w-4" />
            </span>
            <span className="font-mono text-lg font-semibold sm:text-2xl">
              SSTC-2025-26-{biltyData?.gr_no || '—'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {biltyDate} • {branchData?.branch_name || '—'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {paymentModeLabel !== '—' && (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
              <Wallet className="h-3.5 w-3.5" />
              {paymentModeLabel}
            </span>
          )}
          {deliveryTypeLabel !== '—' && (
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
              <Truck className="h-3.5 w-3.5" />
              {deliveryTypeLabel}
            </span>
          )}
          {biltyData?.e_way_bill && (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              <Receipt className="h-3.5 w-3.5" />
              E-Way Bill
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 shadow-inner">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t('origin')}
                  </p>
                  <p className="text-base font-semibold text-slate-900">{fromCityName || '—'}</p>
                </div>
                <ArrowRight className="hidden h-5 w-5 text-slate-400 sm:inline" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t('destination')}
                  </p>
                  <p className="text-base font-semibold text-slate-900">{toCityName || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-1 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span>{fromCityName || '—'}</span>
              <span className="text-slate-400">{inTransitLabel}</span>
              <span>{toCityName || '—'}</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-slate-200">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" style={{ width: '100%' }} />
              <span className="absolute -top-2 left-0 h-4 w-4 rounded-full border-2 border-white bg-indigo-500 shadow-md" />
              <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 animate-pulse rounded-full border-2 border-white bg-blue-500 shadow-md" />
              <span className="absolute -top-2 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-md" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-3 shadow-sm">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <IndianRupee className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t('totalAmount')}
            </p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(biltyData?.total)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {quickStats.map(({ label, value, subLabel, icon: Icon, accent }) => {
          const accentStyle = accentStyles[accent] || accentStyles.indigo;
          return (
            <div
              key={label}
              className={`rounded-xl border ${accentStyle.border} bg-white/85 px-3 py-2 shadow-sm`}
            >
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>{label}</span>
                <Icon className={`h-4 w-4 ${accentStyle.icon}`} />
              </div>
              <div className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">{value}</div>
              {subLabel && <p className="mt-0.5 text-[10px] text-slate-500">{subLabel}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrintHeader;
