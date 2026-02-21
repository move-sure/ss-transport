'use client';

/**
 * GR LIVE STATUS COMPONENT (v3 - Compact)
 * Compact inline panel for GR reservations. Collapsed by default.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Radio, RefreshCw, ChevronDown, ChevronUp, XCircle, ArrowRight } from 'lucide-react';

const GRLiveStatus = ({ 
  branchReservations = [],
  recentBilties = [],
  currentUserId,
  currentReservation,
  reserving,
  onRefresh,
  onReleaseById,
  onSwitchToReservation,
  onReserveRange,
  myPendingReservations = [],
  enabled = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeResult, setRangeResult] = useState(null);

  const otherReservations = useMemo(() => 
    branchReservations.filter(r => r.user_id !== currentUserId),
    [branchReservations, currentUserId]
  );

  const myReservations = useMemo(() =>
    branchReservations.filter(r => r.user_id === currentUserId).sort((a, b) => a.gr_number - b.gr_number),
    [branchReservations, currentUserId]
  );

  const handleReserveRange = async () => {
    if (!rangeFrom || !rangeTo || !onReserveRange) return;
    const from = parseInt(rangeFrom), to = parseInt(rangeTo);
    if (isNaN(from) || isNaN(to) || from > to) {
      setRangeResult({ success: false, error: 'From must be ≤ To' });
      return;
    }
    setRangeLoading(true);
    setRangeResult(null);
    try {
      const result = await onReserveRange(from, to);
      setRangeResult(result);
      if (result?.success) { setRangeFrom(''); setRangeTo(''); setTimeout(() => setRangeResult(null), 3000); }
    } catch (err) { setRangeResult({ success: false, error: err.message }); }
    finally { setRangeLoading(false); }
  };

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

          {/* Reserve Range - inline compact */}
          <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-blue-600 whitespace-nowrap">Range:</span>
            <input type="number" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)}
              placeholder="From" className="w-16 px-1 py-0.5 text-[10px] font-bold border border-blue-200 rounded bg-white focus:border-blue-400 focus:ring-0 focus:outline-none" />
            <ArrowRight className="w-3 h-3 text-blue-300 flex-shrink-0" />
            <input type="number" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)}
              placeholder="To" className="w-16 px-1 py-0.5 text-[10px] font-bold border border-blue-200 rounded bg-white focus:border-blue-400 focus:ring-0 focus:outline-none" />
            <button onClick={handleReserveRange} disabled={rangeLoading || !rangeFrom || !rangeTo}
              className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap">
              {rangeLoading ? '...' : 'GO'}
            </button>
          </div>
          {rangeResult && (
            <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${rangeResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {rangeResult.success ? `✅ ${rangeResult.reserved_count} reserved${rangeResult.skipped?.length ? `, ${rangeResult.skipped.length} skipped` : ''}` : `❌ ${rangeResult.error}`}
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
