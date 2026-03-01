import React from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Loader2 } from 'lucide-react';

const TransitCircles = React.memo(function TransitCircles({ b, updatingTransit, onBranch, onOut, onDelivered, userName }) {
  const fmt = (d) => {
    if (!d) return '';
    try { return format(new Date(d), 'dd MMM, HH:mm'); } catch { return ''; }
  };

  const circles = [
    {
      key: 'branch', done: b.is_delivered_at_branch2, loading: updatingTransit[`${b.id}-is_delivered_at_branch2`],
      onClick: onBranch, label: 'Branch', date: b.delivered_at_branch2_date,
      activeColor: 'bg-red-500 ring-red-300 shadow-red-200', pendingColor: 'bg-red-200 hover:bg-red-400 hover:ring-red-200',
      doneText: 'text-red-700', doneBg: 'bg-red-50',
    },
    {
      key: 'out', done: b.is_out_of_delivery_from_branch2, loading: updatingTransit[`${b.id}-is_out_of_delivery_from_branch2`],
      onClick: onOut, label: 'Out', date: b.out_of_delivery_from_branch2_date,
      activeColor: 'bg-orange-500 ring-orange-300 shadow-orange-200', pendingColor: 'bg-orange-200 hover:bg-orange-400 hover:ring-orange-200',
      doneText: 'text-orange-700', doneBg: 'bg-orange-50',
    },
    {
      key: 'delivered', done: b.is_delivered_at_destination, loading: updatingTransit[`${b.id}-is_delivered_at_destination`],
      onClick: onDelivered, label: 'Delivered', date: b.delivered_at_destination_date,
      activeColor: 'bg-green-500 ring-green-300 shadow-green-200', pendingColor: 'bg-green-200 hover:bg-green-400 hover:ring-green-200',
      doneText: 'text-green-700', doneBg: 'bg-green-50',
    },
  ];

  return (
    <div className="flex items-start gap-1">
      {circles.map((c, i) => (
        <React.Fragment key={c.key}>
          <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
            <button
              onClick={c.done ? undefined : c.onClick}
              disabled={c.loading || c.done}
              title={c.done ? `${c.label}: ${fmt(c.date)}` : `Mark as ${c.label}`}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ring-2 shadow-sm ${
                c.loading ? 'bg-gray-300 ring-gray-200 cursor-wait'
                : c.done ? `${c.activeColor} cursor-default ring-offset-1`
                : `${c.pendingColor} cursor-pointer ring-transparent hover:ring-2 hover:scale-110`
              }`}
            >
              {c.loading ? (
                <Loader2 className="h-3.5 w-3.5 text-white animate-spin"/>
              ) : c.done ? (
                <CheckCircle2 className="h-4 w-4 text-white"/>
              ) : (
                <span className="w-2 h-2 rounded-full bg-white/60"/>
              )}
            </button>
            <span className={`text-[8px] font-bold leading-tight ${c.done ? c.doneText : 'text-gray-400'}`}>{c.label}</span>
            {c.done && c.date && (
              <span className={`text-[7px] font-semibold ${c.doneText} ${c.doneBg} px-1 py-0.5 rounded leading-tight text-center`}>{fmt(c.date)}</span>
            )}
            {c.done && userName && (
              <span className="text-[7px] text-gray-400 leading-tight truncate max-w-[52px]" title={userName}>{userName}</span>
            )}
          </div>
          {i < circles.length - 1 && (
            <div className={`mt-3 w-3 h-0.5 rounded-full flex-shrink-0 ${c.done ? c.activeColor.split(' ')[0] : 'bg-gray-200'}`}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
});

export default TransitCircles;
