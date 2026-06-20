'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/dashboard/navbar';
import {
  FileText, Settings, PlusCircle, Building2, Layers, Users, Package,
  Loader2, RefreshCw, Eye, Search, X, CheckCircle, Clock, AlertCircle,
  XCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';

const API_BASE = 'https://api.movesure.io';
function apiFetch(path) {
  return fetch(`${API_BASE}${path}`)
    .then(r => r.json())
    .then(j => j.data ?? j);
}

const STATUS_BADGE = {
  DRAFT:       { cls: 'bg-gray-100 text-gray-600',   icon: Clock,         label: 'Draft' },
  SENT:        { cls: 'bg-blue-100 text-blue-700',   icon: CheckCircle,   label: 'Sent' },
  ACKNOWLEDGED:{ cls: 'bg-green-100 text-green-700', icon: CheckCircle,   label: 'Acknowledged' },
  CANCELLED:   { cls: 'bg-red-100 text-red-700',     icon: XCircle,       label: 'Cancelled' },
};
const PAY_BADGE = {
  UNPAID:  { cls: 'bg-orange-100 text-orange-700', label: 'Unpaid' },
  PARTIAL: { cls: 'bg-yellow-100 text-yellow-700', label: 'Partial' },
  PAID:    { cls: 'bg-green-100 text-green-700',   label: 'Paid' },
  OVERDUE: { cls: 'bg-red-100 text-red-700',       label: 'Overdue' },
};

const SETUP_STEPS = [
  { step:1, icon:Building2, label:'Tenant',    desc:'Issuing company' },
  { step:2, icon:Layers,    label:'Series',    desc:'INV/2024-25/0001' },
  { step:3, icon:Users,     label:'Receivers', desc:'Buyers' },
  { step:4, icon:Package,   label:'Inventory', desc:'Items/services' },
  { step:5, icon:FileText,  label:'Invoice',   desc:'Create & print' },
];

export default function InvoicePage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [payFilter, setPayFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page_size: 50 });
    if (statusFilter) params.set('status', statusFilter);
    if (payFilter)    params.set('payment_status', payFilter);
    apiFetch(`/api/invoice/list?${params}`)
      .then(data => setInvoices(Array.isArray(data) ? data : []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [statusFilter, payFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = invoices.filter(inv => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (inv.invoice_no || '').toLowerCase().includes(q) ||
      (inv.seller_name || '').toLowerCase().includes(q) ||
      (inv.buyer_name || '').toLowerCase().includes(q) ||
      (inv.gr_no || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB'); } catch { return d || ''; } };
  const fm = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> Invoice Management
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Create GST invoices, manage buyers, inventory and track payments</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/invoice-setup')}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors font-medium">
              <Settings className="h-4 w-4" /> Setup
            </button>
            <button onClick={() => router.push('/invoice/create')}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
              <PlusCircle className="h-4 w-4" /> Create Invoice
            </button>
          </div>
        </div>

        {/* Setup flow strip */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-500 mr-2">Setup Flow:</span>
          {SETUP_STEPS.map(({ step, icon: Icon, label, desc }, i) => (
            <div key={step} className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{step}</span>
                <Icon className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                <div><p className="text-[11px] font-semibold text-gray-800 leading-none">{label}</p><p className="text-[9px] text-gray-400 mt-0.5">{desc}</p></div>
              </div>
              {i < SETUP_STEPS.length - 1 && <span className="text-gray-300 text-sm">→</span>}
            </div>
          ))}
        </div>

        {/* Invoice list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                className="w-full border border-gray-200 rounded-lg pl-8 pr-7 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Search invoice, buyer, GR…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select value={payFilter} onChange={e => { setPayFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              <option value="">All Payment</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            <button onClick={load} disabled={loading}
              className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <span className="text-xs text-gray-400">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="h-12 w-12 mb-3 text-gray-200" />
              <p className="text-sm font-medium">{invoices.length === 0 ? 'No invoices yet' : 'No results'}</p>
              {invoices.length === 0 && (
                <button onClick={() => router.push('/invoice/create')}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
                  <PlusCircle className="h-4 w-4" /> Create First Invoice
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Invoice No.','Date','Seller','Buyer','GR No.','Amount (₹)','Status','Payment',''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paged.map((inv) => {
                    const sb = STATUS_BADGE[inv.status] || STATUS_BADGE.DRAFT;
                    const pb = PAY_BADGE[inv.payment_status] || PAY_BADGE.UNPAID;
                    const SIcon = sb.icon;
                    return (
                      <tr key={inv.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-blue-700 font-semibold text-xs whitespace-nowrap">{inv.invoice_no || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{fmtDate(inv.invoice_date)}</td>
                        <td className="px-4 py-3 text-gray-800 font-medium max-w-[140px] truncate">{inv.seller_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-800 max-w-[140px] truncate">{inv.buyer_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">{inv.gr_no || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums whitespace-nowrap">₹{fm(inv.total_amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sb.cls}`}>
                            <SIcon className="h-3 w-3" /> {sb.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${pb.cls}`}>
                            {pb.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => router.push(`/invoice/${inv.id}`)}
                            className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500 transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  return pg <= totalPages ? (
                    <button key={pg} onClick={() => setPage(pg)}
                      className={`h-7 w-7 rounded-lg text-xs font-medium ${pg === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                      {pg}
                    </button>
                  ) : null;
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                  className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-40">
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
