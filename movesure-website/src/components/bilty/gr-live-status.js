'use client';

/**
 * GR LIVE STATUS COMPONENT (v3 - Compact)
 * Compact inline panel for GR reservations. Collapsed by default.
 */

import React, { useState, useMemo } from 'react';
import { Users, Radio, RefreshCw, ChevronDown, ChevronUp, XCircle } from 'lucide-react';

const GRLiveStatus = ({ 
  branchReservations = [],
  recentBilties = [],
  currentUserId,
  currentReservation,
  reserving,
  onRefresh,
  onReleaseById,
  onSwitchToReservation,
  myPendingReservations = [],
  nextAvailable = [],
  grReservation = null,
  enabled = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const otherReservations = useMemo(() => 
    branchReservations.filter(r => r.user_id !== currentUserId),
    [branchReservations, currentUserId]
  );

  const myReservations = useMemo(() =>
    branchReservations.filter(r => r.user_id === currentUserId).sort((a, b) => a.gr_number - b.gr_number),
    [branchReservations, currentUserId]
  );

  if (!enabled) return null;

  const othersCount = otherReservations.length;

  return (
    <div className="bg-white/95 rounded border border-slate-200 shadow-sm text-xs">
      {/* Compact header bar - click anywhere to expand */}
      <div 
        className="flex items-center justify-between px-2 py-1.5 gap-2 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <Radio className="w-3 h-3 text-green-500 animate-pulse flex-shrink-0" />
          {othersCount > 0 && (
            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" />{othersCount} other{othersCount > 1 ? 's' : ''}
            </span>
          )}
          {myReservations.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">
              You: {myReservations.map(r => r.gr_no).join(', ')}
            </span>
          )}
          {myReservations.length === 0 && othersCount === 0 && (
            <span className="text-slate-400 font-medium">No reservations</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {reserving && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
          <button onClick={(e) => { e.stopPropagation(); onRefresh?.(); }} className="p-0.5 hover:bg-slate-100 rounded" title="Refresh">
            <RefreshCw className="w-3 h-3 text-slate-400" />
          </button>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </div>

      {/* Expanded: compact details */}
      {isExpanded && (
        <div className="border-t border-slate-100 px-2 py-1.5 space-y-1.5">

          {/* Your reservations - compact list */}
          {myReservations.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-purple-600 uppercase">Your Reservations</span>
              {myReservations.map((res) => {
                const isActive = currentReservation?.id === res.id;
                return (
                  <div key={res.id} className={`flex items-center justify-between px-1.5 py-1 rounded ${isActive ? 'bg-indigo-50 border border-indigo-300' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-1">
                      <span className={`font-bold ${isActive ? 'text-indigo-700' : 'text-purple-700'}`}>{res.gr_no}</span>
                      {isActive && <span className="text-[9px] font-bold bg-indigo-500 text-white px-1 rounded">ACTIVE</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isActive && onSwitchToReservation && (
                        <button onClick={() => onSwitchToReservation(res)} className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500 text-white rounded hover:bg-indigo-600">USE</button>
                      )}
                      {onReleaseById && (
                        <button onClick={() => onReleaseById(res.id)} className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-0.5">
                          <XCircle className="w-2.5 h-2.5" />REL
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Other users - compact */}
          {otherReservations.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-amber-600 uppercase">Others</span>
              {otherReservations.map((res) => (
                <div key={res.id} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-amber-50">
                  <span className="font-bold text-amber-700">{res.gr_no}</span>
                  <span className="text-amber-600">{res.user_name}</span>
                </div>
              ))}
            </div>
          )}

          {/* 🎫 NEXT 5 AVAILABLE GR — pick & reserve */}
          {nextAvailable?.length > 0 && !grReservation?.hasReservation && (
            <div className="pt-1.5 border-t border-slate-100">
              <span className="text-[10px] font-bold text-blue-600 uppercase">Next {nextAvailable.length} Available GR Numbers</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {nextAvailable.map((item, idx) => (
                  <button
                    key={item.number}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      grReservation?.reserveSpecific?.(item.number);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors shadow-sm ${
                      idx === 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300'
                        : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-100'
                    }`}
                    title={`Reserve GR ${item.gr_no}`}
                  >
                    {idx === 0 && '⭐ '}{item.gr_no}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent bilties - only show count, not full list */}
          {recentBilties.length > 0 && (
            <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-100">
              {recentBilties.length} bilties saved in last hour
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GRLiveStatus;
