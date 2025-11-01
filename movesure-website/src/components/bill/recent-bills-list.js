'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';

const numberFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const amountFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2
});

const BASE_METRICS = {
  totalBilties: 0,
  totalAmount: 0,
  paidAmount: 0,
  toPayAmount: 0,
  latestCreatedAt: null
};

const metrics = (bills) => {
  if (!Array.isArray(bills) || bills.length === 0) {
    return { ...BASE_METRICS };
  }

  return bills.reduce((acc, bill) => {
    const total = Number(bill.total_amount) || 0;
    const paid = Number(bill.paid_amount) || 0;
    const toPay = Number(bill.topay_amount) || 0;
    const createdAt = bill.created_at ? new Date(bill.created_at) : null;

    const updatedLatest =
      !acc.latestCreatedAt || (createdAt && createdAt > acc.latestCreatedAt)
        ? createdAt
        : acc.latestCreatedAt;

    return {
      totalBilties: acc.totalBilties + (Number(bill.total_bilties) || 0),
      totalAmount: acc.totalAmount + total,
      paidAmount: acc.paidAmount + paid,
      toPayAmount: acc.toPayAmount + toPay,
      latestCreatedAt: updatedLatest
    };
  }, { ...BASE_METRICS });
};

const resolveBillDate = (bill) => {
  const candidate = bill?.created_at || bill?.date_to || bill?.date_from;
  if (!candidate) {
    return null;
  }
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const groupBillsByMonth = (bills) => {
  if (!Array.isArray(bills) || bills.length === 0) {
    return {};
  }

  return bills.reduce((acc, bill) => {
    const date = resolveBillDate(bill);
    const key = date ? format(date, 'yyyy-MM') : 'unknown';
    const label = date ? format(date, 'MMMM yyyy') : 'Unknown Date';

    if (!acc[key]) {
      acc[key] = {
        key,
        label,
        bills: []
      };
    }

    acc[key].bills.push(bill);
    return acc;
  }, {});
};

const EmptyState = ({ loadingRecentBills, onRefresh }) => (
  <div className="bg-white shadow-xl rounded-2xl overflow-hidden mb-6 border border-gray-100">
    <div className="px-8 py-5 border-b border-gray-200 bg-gradient-to-r from-sky-50 via-indigo-50 to-fuchsia-50">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">📄</span>
          Recent Bills
        </h3>
        <button
          onClick={onRefresh}
          disabled={loadingRecentBills}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-700 hover:text-sky-900 bg-white hover:bg-sky-50 border border-sky-200 rounded-xl transition-colors disabled:opacity-50"
        >
          <span>{loadingRecentBills ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
    </div>

    <div className="p-12 text-center space-y-6 bg-gradient-to-br from-white to-gray-50">
      <div className="mx-auto w-28 h-28 bg-white shadow-inner shadow-sky-100 rounded-full flex items-center justify-center">
        <svg className="w-14 h-14 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.364 5.636A9 9 0 018.636 18.364m6.728-12.728L7.5 17.5M9 19h10a2 2 0 002-2V9" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 9H5a2 2 0 00-2 2v8a2 2 0 002 2h12" />
        </svg>
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-gray-900">No bills yet</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Generate your first bill by selecting bilties from the search results. Saved bills will appear here instantly.
        </p>
      </div>
      <button
        onClick={onRefresh}
        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow hover:shadow-lg transition-all"
      >
        🔄 Refresh now
      </button>
    </div>
  </div>
);

const LoadingState = () => (
  <div className="bg-white shadow-xl rounded-2xl overflow-hidden mb-6 border border-blue-100">
    <div className="px-8 py-5 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-fuchsia-50">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">📄</span>
          Recent Bills
        </h3>
        <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></span>
          Refreshing...
        </span>
      </div>
    </div>

    <div className="p-10 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="p-6 bg-gradient-to-br from-white to-blue-50 border border-blue-100 rounded-2xl animate-pulse">
            <div className="h-4 w-24 bg-blue-200/60 rounded"></div>
            <div className="mt-4 h-6 w-32 bg-blue-200/70 rounded"></div>
            <div className="mt-3 h-12 w-full bg-blue-200/40 rounded-lg"></div>
          </div>
        ))}
      </div>

      <div className="border border-blue-100 rounded-2xl overflow-hidden">
        <div className="h-12 bg-blue-50"></div>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-14 bg-white even:bg-blue-50/40"></div>
        ))}
      </div>
    </div>
  </div>
);

const SummaryCards = ({ totals }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-lg">
      <p className="text-sm uppercase tracking-wide text-sky-100">Total Bills</p>
      <p className="mt-2 text-3xl font-semibold">{numberFormatter.format(totals.count)}</p>
      <p className="mt-1 text-sky-100/80">Saved statements</p>
    </div>
    <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
      <p className="text-sm font-medium text-gray-500">Total Amount</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{amountFormatter.format(totals.totalAmount)}</p>
      <p className="mt-1 text-sm text-gray-500">Across all bills</p>
    </div>
    <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
      <p className="text-sm font-medium text-gray-500">Paid vs To-Pay</p>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-green-600 font-semibold">{amountFormatter.format(totals.paidAmount)}</span>
        <span className="text-gray-400">|</span>
        <span className="text-orange-500 font-semibold">{amountFormatter.format(totals.toPayAmount)}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">Cleared vs pending</p>
    </div>
    <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
      <p className="text-sm font-medium text-gray-500">Last Updated</p>
      <p className="mt-2 text-xl font-semibold text-gray-900">
        {totals.latestCreatedAt ? formatDistanceToNow(totals.latestCreatedAt, { addSuffix: true }) : '—'}
      </p>
      <p className="mt-1 text-sm text-gray-500">Most recent bill</p>
    </div>
  </div>
);

const BillsTable = ({ bills, onDelete, deletingBillId }) => (
  <div className="overflow-hidden border border-gray-100 rounded-2xl shadow-sm">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50/80 backdrop-blur">
          <tr>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Bill
            </th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Period
            </th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Party / City
            </th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Bilties
            </th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Financials
            </th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Template
            </th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Created
            </th>
            <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {bills.map((bill, index) => {
            const isEven = index % 2 === 0;
            const partyName = bill.consignor_name || bill.consignee_name || bill.city_name || 'N/A';
            const periodStart = bill.date_from ? format(new Date(bill.date_from), 'dd MMM yyyy') : '—';
            const periodEnd = bill.date_to ? format(new Date(bill.date_to), 'dd MMM yyyy') : '—';
            const createdAt = bill.created_at ? format(new Date(bill.created_at), 'dd MMM yyyy, HH:mm') : '—';

            return (
              <tr
                key={bill.id}
                className={`${isEven ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/70 transition-colors`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 inline-flex items-center justify-center h-9 w-9 rounded-full text-sm font-semibold shadow-inner ${
                        bill.bill_type === 'consignor'
                          ? 'bg-blue-100 text-blue-700'
                          : bill.bill_type === 'consignee'
                          ? 'bg-green-100 text-green-700'
                          : bill.bill_type === 'transport'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {(bill.bill_name || bill.bill_type || 'NA').substring(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {bill.bill_name || bill.bill_type?.toUpperCase() || 'Unnamed Bill'}
                      </p>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{bill.bill_type || 'custom'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex flex-col">
                    <span className="font-medium">{periodStart}</span>
                    <span className="text-xs text-gray-500">to {periodEnd}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <p className="font-medium max-w-[220px] truncate" title={partyName}>
                    {partyName}
                  </p>
                  {bill.payment_mode && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                      Filter: {bill.payment_mode}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                  {numberFormatter.format(Number(bill.total_bilties) || 0)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="font-semibold text-gray-900">
                    {amountFormatter.format(Number(bill.total_amount) || 0)}
                  </div>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    {bill.paid_amount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-600 border border-green-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
                        Paid {amountFormatter.format(Number(bill.paid_amount) || 0)}
                      </span>
                    )}
                    {bill.topay_amount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                        To-Pay {amountFormatter.format(Number(bill.topay_amount) || 0)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-inner ${
                      bill.pdf_template === 'landscape'
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    <span>📄</span>
                    {bill.pdf_template === 'landscape' ? 'Landscape' : 'Portrait'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div>{createdAt}</div>
                  {bill.created_at && (
                    <div className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(bill.created_at), { addSuffix: true })}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    {bill.pdf_url ? (
                      <a
                        href={bill.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow hover:shadow-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View PDF
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-gray-400">PDF unavailable</span>
                    )}
                    <button
                      onClick={() => onDelete(bill.id, bill.bill_name || bill.bill_type || 'this bill')}
                      disabled={deletingBillId === bill.id}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-red-600 to-rose-600 shadow hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete bill"
                    >
                      {deletingBillId === bill.id ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const MonthFolder = ({ label, bills, onDelete, deletingBillId }) => {
  const monthMetrics = metrics(bills);

  return (
    <article className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📁</span>
          <div>
            <p className="text-lg font-semibold text-gray-900">{label}</p>
            <p className="text-sm text-gray-500">
              {bills.length} {bills.length === 1 ? 'bill' : 'bills'} · {numberFormatter.format(monthMetrics.totalBilties)} bilties
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-600 border border-green-100">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
            Paid {amountFormatter.format(monthMetrics.paidAmount)}
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
            To-Pay {amountFormatter.format(monthMetrics.toPayAmount)}
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
            Total {amountFormatter.format(monthMetrics.totalAmount)}
          </span>
        </div>
      </div>
      <BillsTable bills={bills} onDelete={onDelete} deletingBillId={deletingBillId} />
    </article>
  );
};

const RecentBillsList = ({ recentBills, loadingRecentBills, onRefresh }) => {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [deletingBillId, setDeletingBillId] = useState(null);

  const handleDeleteBill = async (billId, billName) => {
    if (!confirm(`Are you sure you want to delete the bill "${billName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingBillId(billId);

    try {
      const supabase = (await import('@/app/utils/supabase')).default;

      // Delete the bill from monthly_bill table
      const { error: deleteError } = await supabase
        .from('monthly_bill')
        .delete()
        .eq('id', billId);

      if (deleteError) {
        throw deleteError;
      }

      // Optionally delete the PDF from storage if pdf_url exists
      const billToDelete = recentBills.find(b => b.id === billId);
      if (billToDelete?.pdf_url) {
        try {
          // Extract file path from URL
          const urlParts = billToDelete.pdf_url.split('/bill/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1].split('?')[0]; // Remove query params
            await supabase.storage.from('bill').remove([filePath]);
          }
        } catch (storageError) {
          console.warn('Failed to delete PDF from storage:', storageError);
          // Continue even if storage deletion fails
        }
      }

      alert('Bill deleted successfully!');
      
      // Refresh the list
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
      alert(`Failed to delete bill: ${error.message}`);
    } finally {
      setDeletingBillId(null);
    }
  };

  const grouped = useMemo(() => groupBillsByMonth(recentBills), [recentBills]);

  const monthEntries = useMemo(() => {
    return Object.values(grouped).map((entry) => {
      const sortedBills = [...entry.bills].sort((a, b) => {
        const dateA = resolveBillDate(a);
        const dateB = resolveBillDate(b);
        const timeA = dateA ? dateA.getTime() : 0;
        const timeB = dateB ? dateB.getTime() : 0;
        return timeB - timeA;
      });

      return {
        ...entry,
        bills: sortedBills
      };
    }).sort((a, b) => {
      if (a.key === 'unknown') return 1;
      if (b.key === 'unknown') return -1;
      return b.key.localeCompare(a.key);
    });
  }, [grouped]);

  const monthOptions = useMemo(
    () => monthEntries.map(({ key, label }) => ({ key, label })),
    [monthEntries]
  );

  useEffect(() => {
    if (selectedMonth !== 'all' && !monthEntries.some((entry) => entry.key === selectedMonth)) {
      setSelectedMonth('all');
    }
  }, [monthEntries, selectedMonth]);

  const filteredEntries = useMemo(() => {
    if (selectedMonth === 'all') {
      return monthEntries;
    }
    return monthEntries.filter((entry) => entry.key === selectedMonth);
  }, [monthEntries, selectedMonth]);

  const flattenedBills = useMemo(
    () => filteredEntries.flatMap((entry) => entry.bills),
    [filteredEntries]
  );

  const totals = useMemo(() => {
    const summary = metrics(flattenedBills);
    return {
      ...summary,
      count: flattenedBills.length
    };
  }, [flattenedBills]);

  if (loadingRecentBills) {
    return <LoadingState />;
  }

  if (!recentBills || recentBills.length === 0) {
    return <EmptyState loadingRecentBills={loadingRecentBills} onRefresh={onRefresh} />;
  }

  return (
    <section className="mb-10">
      <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 mb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📄</span>
            Recent Bills
          </h2>
          <p className="text-gray-500">Quick access to the latest bills you have generated.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="recent-bills-month-filter" className="text-sm font-medium text-gray-600">
              Month
            </label>
            <select
              id="recent-bills-month-filter"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All months</option>
              {monthOptions.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow hover:shadow-lg transition-all"
          >
            🔄 Refresh list
          </button>
        </div>
      </header>

      <SummaryCards totals={totals} />

      {filteredEntries.map((entry) => (
        <MonthFolder 
          key={entry.key} 
          label={entry.label} 
          bills={entry.bills} 
          onDelete={handleDeleteBill}
          deletingBillId={deletingBillId}
        />
      ))}
    </section>
  );
};

export default RecentBillsList;
