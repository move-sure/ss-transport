'use client';

import React from 'react';
import { Printer, Save, UserCircle2, Users2, Truck, AlignJustify, AlignLeft } from 'lucide-react';

const BillOptions = ({
  billType,
  setBillType,
  customName,
  setCustomName,
  printTemplate,
  setPrintTemplate,
  onPrint,
  onSaveAndPrint,
  disabled,
  isSaving
}) => {
  const billTypes = [
    {
      value: 'consignor',
      label: 'Consignor bill',
      description: 'Best when billing consignors directly.',
      icon: UserCircle2
    },
    {
      value: 'consignee',
      label: 'Consignee bill',
      description: 'Use for consignee-focused statements.',
      icon: Users2
    },
    {
      value: 'transport',
      label: 'Transport bill',
      description: 'Transporter summary for internal records.',
      icon: Truck
    }
  ];

  const templates = [
    {
      value: 'portrait',
      label: 'Portrait',
      description: 'Compact layout with key fields.',
      icon: AlignJustify
    },
    {
      value: 'landscape',
      label: 'Landscape',
      description: 'Wider view including consignor details.',
      icon: AlignLeft
    }
  ];

  const selectedType = billTypes.find(type => type.value === billType);
  const helperLabel = customName?.trim() || selectedType?.label || 'Not selected';

  return (
    <aside className="flex h-full w-[420px] min-w-[380px] flex-col border-l border-blue-100 bg-white px-7 py-7">
      <div className="flex items-center justify-between pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-blue-900">Bill configuration</h3>
            <p className="text-xs text-blue-500/80">Adjust layout and labelling before export.</p>
          </div>
        </div>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
          Ready
        </span>
      </div>

  <div className="flex-1 space-y-6 overflow-y-auto pr-2 pb-1 min-h-0">
        <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">Current label</p>
          <p className="mt-1 text-sm font-semibold text-blue-900">{helperLabel}</p>
          <p className="mt-1 text-[11px] text-blue-500/80">Leave blank to use the default bill title for the selected type.</p>
        </div>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-blue-800">Print template</h4>
          <div className="grid gap-2">
            {templates.map(({ value, label, description, icon: Icon }) => {
              const isActive = printTemplate === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPrintTemplate(value)}
                  disabled={disabled}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <div className={`mt-1 flex h-9 w-9 items-center justify-center rounded-md ${
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-500'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-blue-900'}`}>{label}</p>
                    <p className={`mt-1 text-xs ${isActive ? 'text-blue-50/90' : 'text-blue-500/80'}`}>{description}</p>
                  </div>
                  {isActive && <span className="text-[11px] font-semibold text-white">Selected</span>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-blue-800">Bill type</h4>
          <div className="space-y-2">
            {billTypes.map(({ value, label, description, icon: Icon }) => {
              const isActive = billType === value;
              return (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="billType"
                    value={value}
                    checked={isActive}
                    onChange={(e) => setBillType(e.target.value)}
                    className="mt-1 h-4 w-4 accent-blue-600"
                    disabled={disabled}
                  />
                  <div className={`mt-1 flex h-9 w-9 items-center justify-center rounded-md ${
                    isActive ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white' : 'bg-blue-50 text-blue-500'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900">{label}</p>
                    <p className="mt-1 text-xs text-blue-500/80">{description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <label className="text-sm font-semibold text-blue-800" htmlFor="bill-custom-name">
            Custom name
          </label>
          <div className="relative">
            <input
              id="bill-custom-name"
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value.slice(0, 40))}
              placeholder="April 2025 consignor statement"
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-900 placeholder:text-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={disabled}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-blue-300">
              {customName?.length || 0}/40
            </span>
          </div>
          <p className="text-[11px] text-blue-500/80">A descriptive title helps locate saved PDFs later.</p>
        </section>

        <section className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-[11px] text-blue-600">
          <p className="font-semibold text-blue-800">Quick tip</p>
          <p className="mt-1">“Print only” generates a PDF instantly. “Save &amp; print” stores the bill before opening the PDF preview.</p>
        </section>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={onPrint}
            disabled={disabled || isSaving}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-sm font-semibold text-white shadow-sm transition hover:from-blue-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:from-blue-200 disabled:via-blue-200 disabled:to-blue-200"
          >
            <Printer className="h-5 w-5" />
            <span>Print only</span>
          </button>
          <button
            type="button"
            onClick={onSaveAndPrint}
            disabled={disabled || isSaving}
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-blue-500 text-sm font-semibold text-blue-600 transition hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:border-blue-200 disabled:text-blue-300"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-[2px] border-blue-500 border-t-transparent"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save &amp; print</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default BillOptions;
