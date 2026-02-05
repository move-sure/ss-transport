'use client';

import React from 'react';

export default function PDFCheckboxOption({ id, label, description, checked, onChange, color = 'emerald' }) {
  const colorClasses = {
    emerald: 'text-emerald-600 focus:ring-emerald-500',
    purple: 'text-purple-600 focus:ring-purple-500',
    blue: 'text-blue-600 focus:ring-blue-500'
  };

  return (
    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className={`w-5 h-5 rounded focus:ring-2 ${colorClasses[color]}`}
      />
      <div>
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
    </label>
  );
}
