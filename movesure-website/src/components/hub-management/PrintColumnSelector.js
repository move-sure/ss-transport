'use client';
import React from 'react';
import { Lock, Check, Plus } from 'lucide-react';
import { ALL_COLS } from './crossingBillsColumns';

export default function PrintColumnSelector({ selectedCols, onToggle }) {
  const required = ALL_COLS.filter(c => c.required);
  const optional = ALL_COLS.filter(c => !c.required);

  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
        Print Columns
      </p>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
        {/* Required columns */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2.5">Always shown</p>
          <div className="flex flex-wrap gap-2">
            {required.map(col => (
              <span
                key={col.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-semibold"
              >
                <Lock className="h-3.5 w-3.5" />
                {col.label}
              </span>
            ))}
          </div>
        </div>

        {/* Optional columns */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2.5">Toggle columns</p>
          <div className="flex flex-wrap gap-2">
            {optional.map(col => {
              const on = selectedCols.includes(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => onToggle(col.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                    on
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
