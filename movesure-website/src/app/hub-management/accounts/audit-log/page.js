'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, History, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { ledgerApi, ENTITY_TYPES } from '@/components/hub-management/accounts/api';

const PAGE_SIZE = 50;

const ACTION_BADGE = {
  create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  update: 'bg-blue-50 text-blue-700 border-blue-200',
  deactivate: 'bg-amber-50 text-amber-700 border-amber-200',
  reactivate: 'bg-teal-50 text-teal-700 border-teal-200',
  cancel: 'bg-rose-50 text-rose-700 border-rose-200',
  delete: 'bg-red-50 text-red-700 border-red-200',
};

function AuditRow({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <td className="px-4 py-3 w-6">{open ? <ChevronDown className="w-4 h-4 text-black" /> : <ChevronRight className="w-4 h-4 text-black" />}</td>
        <td className="px-4 py-3 text-black whitespace-nowrap">{row.changed_at ? new Date(row.changed_at).toLocaleString('en-IN') : '-'}</td>
        <td className="px-4 py-3">
          <span className="font-medium text-black">{row.entity_type}</span>
          <span className="text-black ml-1 text-xs">#{String(row.entity_id).slice(0, 8)}</span>
        </td>
        <td className="px-4 py-3">
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${ACTION_BADGE[row.action] || 'bg-gray-50 text-black border-gray-200'}`}>
            {row.action}
          </span>
        </td>
        <td className="px-4 py-3 text-black">{row.changed_by || '-'}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="px-4 pb-4 bg-gray-50/60">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-black mb-1">Old</p>
                <pre className="text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-64">{JSON.stringify(row.old_data, null, 2) || '—'}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-black mb-1">New</p>
                <pre className="text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-64">{JSON.stringify(row.new_data, null, 2) || '—'}</pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function AuditLogContent() {
  const searchParams = useSearchParams();
  const [entityType, setEntityType] = useState(searchParams.get('entity_type') || '');
  const [entityId, setEntityId] = useState(searchParams.get('entity_id') || '');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ledgerApi.auditLog.list({
        entity_type: entityType || undefined,
        entity_id: entityId || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setRows(res.data?.rows || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-gray-600 to-slate-800 p-2.5 rounded-xl shadow-md">
          <History className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-black">Audit Log</h1>
          <p className="text-sm text-black">Who changed what, when</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={entityType}
          onChange={(e) => { setPage(1); setEntityType(e.target.value); }}
          className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {entityId && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-xs text-black">
            entity_id: {entityId}
            <button onClick={() => { setEntityId(''); setPage(1); }} className="text-black hover:text-black font-bold">×</button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-black text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 w-6"></th>
                <th className="text-left px-4 py-3 font-semibold">When</th>
                <th className="text-left px-4 py-3 font-semibold">Entity</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Changed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-black">
              {loading && (
                <tr><td colSpan={5} className="text-center py-10"><Loader2 className="w-6 h-6 mx-auto text-emerald-600 animate-spin" /></td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-black">No audit entries found</td></tr>
              )}
              {!loading && rows.map((row) => <AuditRow key={row.id} row={row} />)}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-black">Page {page} of {totalPages} · {total} entries</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full py-20"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>}>
      <AuditLogContent />
    </Suspense>
  );
}
