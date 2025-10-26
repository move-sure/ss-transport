import React, { useMemo } from 'react';

function formatDate(value, options = {}) {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      ...options
    });
  } catch (err) {
    return 'N/A';
  }
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (err) {
    return 'N/A';
  }
}

export default function ChallanDetailsView({ challanDetails }) {
  const branchLabel = challanDetails?.branch?.branch_name
    || challanDetails?.branch?.name
    || challanDetails?.branch?.code
    || 'N/A';

  const detailBlocks = useMemo(() => {
    if (!challanDetails) return [];

    return [
      {
        label: 'Challan Number',
        value: challanDetails.challan_no || 'N/A',
        accent: 'from-blue-500/10 to-blue-500/20',
      },
      {
        label: 'Branch',
        value: branchLabel,
        helper: challanDetails.branch?.code && challanDetails.branch?.branch_name ? challanDetails.branch.code : null,
        accent: 'from-emerald-500/10 to-emerald-500/20',
      },
      {
        label: 'Challan Date',
        value: formatDate(challanDetails.date),
        accent: 'from-purple-500/10 to-purple-500/20',
      },
      {
        label: 'Truck Number',
        value: challanDetails.truck?.truck_number || 'Not Assigned',
        helper: challanDetails.truck?.owner || null,
        accent: 'from-amber-500/10 to-amber-500/20',
      },
      {
        label: 'Driver',
        value: challanDetails.driver?.driver_name || challanDetails.driver?.name || 'Not Assigned',
        helper: challanDetails.driver?.phone || null,
        accent: 'from-rose-500/10 to-rose-500/20',
      },
      {
        label: 'Owner',
        value: challanDetails.owner?.owner_name || challanDetails.owner?.name || 'Not Assigned',
        helper: challanDetails.owner?.phone || null,
        accent: 'from-indigo-500/10 to-indigo-500/20',
      },
      {
        label: 'Total Bilties',
        value: challanDetails.total_bilty_count || 0,
        accent: 'from-pink-500/10 to-pink-500/20',
      },
      {
        label: 'Dispatch Status',
        value: challanDetails.is_dispatched ? 'Dispatched' : 'Pending Dispatch',
        helper: challanDetails.is_dispatched && challanDetails.dispatch_date
          ? formatDateTime(challanDetails.dispatch_date)
          : 'Awaiting confirmation',
        accent: challanDetails.is_dispatched
          ? 'from-green-500/10 to-green-500/20'
          : 'from-yellow-500/10 to-yellow-500/20',
        valueClassName: challanDetails.is_dispatched ? 'text-emerald-600' : 'text-amber-600'
      }
    ];
  }, [branchLabel, challanDetails]);

  if (!challanDetails) return null;

  return (
    <section className="w-full rounded-3xl bg-white shadow-lg border border-slate-200 overflow-hidden">
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Challan Details</h2>
          <p className="text-sm text-slate-500">Snapshot of the challan, fleet, and ownership information</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium">
            Created {formatDate(challanDetails.created_at)}
          </span>
          {challanDetails.updated_at && (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium">
              Updated {formatDateTime(challanDetails.updated_at)}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          {detailBlocks.map((block, idx) => (
            <div
              key={block.label}
              className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${block.accent} p-4 sm:p-5 transition-shadow hover:shadow-md`}
            >
              <div className="relative z-10 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{block.label}</p>
                <p className={`text-lg font-semibold text-slate-900 ${block.valueClassName || ''}`}>{block.value}</p>
                {block.helper && (
                  <p className="text-xs text-slate-500">{block.helper}</p>
                )}
              </div>
              <div className="absolute right-3 top-3 h-12 w-12 rounded-full bg-white/60 blur-xl group-hover:opacity-70 transition-opacity" aria-hidden="true"></div>
              <div className="absolute left-3 bottom-3 h-10 w-10 rounded-full bg-white/40 blur-3xl group-hover:opacity-70 transition-opacity" aria-hidden="true"></div>
            </div>
          ))}
        </div>

        {challanDetails.remarks && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks</p>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">{challanDetails.remarks}</p>
          </div>
        )}
      </div>
    </section>
  );
}
