import React from 'react';

export const KF = React.memo(function KF({ label, value, onChange, type = 'number', big, disabled }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none text-black font-semibold ${big ? 'px-3 py-2.5 text-base' : 'px-2.5 py-2 text-sm'} ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
        step={type === 'number' ? '0.01' : undefined}
        placeholder={type === 'text' ? `Enter ${label}...` : '0'}
        disabled={disabled}
      />
    </div>
  );
});

export const IC = React.memo(function IC({ icon, t, v, s, bg }) {
  return (
    <div className={`${bg} rounded-lg p-2 border border-white/60`}>
      <div className="flex items-center gap-2">
        <div className="p-1 bg-white/80 rounded">{icon}</div>
        <div className="min-w-0">
          <p className="text-[9px] font-medium text-gray-500 uppercase">{t}</p>
          <p className="text-[11px] font-bold text-gray-900 truncate">{v}</p>
          {s && <p className="text-[9px] text-gray-500 truncate">{s}</p>}
        </div>
      </div>
    </div>
  );
});

export const DI = React.memo(function DI({ l, v }) {
  return (
    <div>
      <p className="text-[9px] text-gray-400 uppercase">{l}</p>
      <p className="text-xs font-bold text-gray-800">{v}</p>
    </div>
  );
});

export const SC = React.memo(function SC({ icon, n, l, c }) {
  const cs = {
    green: 'bg-green-50 border-green-100 text-green-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    gray: 'bg-gray-50 border-gray-200 text-gray-500',
    orange: 'bg-orange-50 border-orange-100 text-orange-600',
  };
  return (
    <div className={`rounded-lg p-2 border text-center ${cs[c] || cs.gray}`}>
      <div className="flex justify-center mb-0.5">{icon}</div>
      <p className="text-lg font-bold">{n}</p>
      <p className="text-[9px] font-medium">{l}</p>
    </div>
  );
});
