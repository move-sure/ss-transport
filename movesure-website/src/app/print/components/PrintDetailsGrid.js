'use client';

import React, { useMemo } from 'react';
import {
  User,
  Users,
  Truck,
  Package,
  Receipt,
  Info,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';

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

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy');
  } catch (error) {
    return value;
  }
};

const PrintDetailsGrid = ({ biltyData, toCityName, t }) => {
  const ewayBills = useMemo(() => {
    if (!biltyData?.e_way_bill) return [];
    return biltyData.e_way_bill
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }, [biltyData?.e_way_bill]);

  const charges = useMemo(
    () => [
      { label: t('amount'), value: formatCurrency(biltyData?.freight_amount) },
      { label: t('labourCharge'), value: formatCurrency(biltyData?.labour_charge) },
      { label: t('biltyCharge'), value: formatCurrency(biltyData?.bill_charge) },
      { label: t('tollTax'), value: formatCurrency(biltyData?.toll_charge) },
      { label: t('pf'), value: formatCurrency(biltyData?.pf_charge) },
      { label: t('otherCharges'), value: formatCurrency(biltyData?.other_charge) }
    ],
    [biltyData, t]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg sm:p-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">
              <User className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">{t('consignor')}</h3>
          </div>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('name')}</dt>
              <dd className="font-semibold text-slate-900">{biltyData?.consignor_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">GST</dt>
              <dd className="font-mono text-[13px]">{biltyData?.consignor_gst || '—'}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-mono text-[13px] font-semibold text-indigo-600">
                {biltyData?.consignor_number || '—'}
              </span>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-purple-100 bg-purple-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">
              <Users className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">{t('consignee')}</h3>
          </div>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('name')}</dt>
              <dd className="font-semibold text-slate-900">{biltyData?.consignee_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">GST</dt>
              <dd className="font-mono text-[13px]">{biltyData?.consignee_gst || '—'}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-purple-500" />
              <span className="font-mono text-[13px] font-semibold text-purple-600">
                {biltyData?.consignee_number || '—'}
              </span>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">
              <Truck className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">{t('transport')}</h3>
          </div>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('name')}</dt>
              <dd className="font-semibold text-slate-900">{biltyData?.transport_name || '—'}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-mono text-[13px] font-semibold text-emerald-600">
                {biltyData?.transport_number || '—'}
              </span>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('deliveryType')}</dt>
              <dd className="font-semibold text-slate-900">{biltyData?.delivery_type ? biltyData.delivery_type.replace(/-/g, ' ').toUpperCase() : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('destination')}</dt>
              <dd className="font-semibold text-slate-900">{toCityName || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-cyan-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">
              <Package className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">{t('packageDetails')}</h3>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('packages')}</dt>
              <dd className="text-lg font-semibold text-cyan-600">{biltyData?.no_of_pkg ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('weight')}</dt>
              <dd className="text-lg font-semibold text-cyan-600">{biltyData?.wt ? `${biltyData.wt} KG` : '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('contents')}</dt>
              <dd className="font-semibold text-slate-900">{biltyData?.contain || '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('privateMarks')}</dt>
              <dd className="font-semibold text-slate-900">{biltyData?.pvt_marks || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">
              <Receipt className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">{t('invoiceDetails')}</h3>
          </div>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('invoiceNo')}</dt>
                <dd className="font-mono text-[13px]">{biltyData?.invoice_no || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('invoiceDate')}</dt>
                <dd className="font-semibold text-slate-900">{formatDate(biltyData?.invoice_date)}</dd>
              </div>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('invoiceValue')}</dt>
              <dd className="text-lg font-semibold text-amber-600">{formatCurrency(biltyData?.invoice_value)}</dd>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {charges.map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-white/60 bg-white/50 px-3 py-2 text-xs">
                  <p className="font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                  <p className="mt-1 font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">
              <Info className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">{t('trackingInformation')}</h3>
          </div>
          <div className="mt-3 space-y-3 text-sm text-slate-700">
            <div className="rounded-lg border border-white/60 bg-white/50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">E-Way Bill</p>
              {ewayBills.length > 0 ? (
                <ul className="mt-1 space-y-1 text-xs font-mono">
                  {ewayBills.map((bill) => (
                    <li key={bill} className="rounded bg-rose-100/70 px-2 py-1 text-rose-700">
                      {bill}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 font-semibold text-slate-900">—</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrintDetailsGrid;
