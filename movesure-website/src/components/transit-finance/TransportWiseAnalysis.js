'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, X, Truck, Calendar, ChevronLeft, ChevronRight, Hash, FileText } from 'lucide-react';
import Link from 'next/link';

const ITEMS_PER_PAGE = 20;

export default function TransportWiseAnalysis({ allPohonch = [], challanDatesMap = {} }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Build transport-wise aggregation from all pohonch
  const allTransports = useMemo(() => {
    const map = {};
    allPohonch.forEach((p) => {
      const key = p.transport_gstin || p.transport_name;
      if (!map[key]) {
        map[key] = {
          name: p.transport_name,
          gstin: p.transport_gstin,
          pf: 0,
          kaat: 0,
          amt: 0,
          bilties: 0,
          pkg: 0,
          wt: 0,
          pohonchCount: 0,
          pohonchNumbers: [],
          challans: new Set(),
        };
      }
      map[key].pf += p.total_pf || 0;
      map[key].kaat += p.total_kaat || 0;
      map[key].amt += p.total_amount || 0;
      map[key].bilties += p.total_bilties || 0;
      map[key].pkg += p.total_packages || 0;
      map[key].wt += p.total_weight || 0;
      map[key].pohonchCount += 1;
      map[key].pohonchNumbers.push(p.pohonch_number);
      const challans = Array.isArray(p.challan_metadata) ? p.challan_metadata : [];
      challans.forEach((c) => map[key].challans.add(c));
    });

    return Object.values(map).map((t) => {
      const challanArr = [...t.challans].sort();
      let firstDate = null, lastDate = null;
      challanArr.forEach((cNo) => {
        const cd = challanDatesMap[cNo];
        if (cd) {
          const d = cd.dispatch_date || cd.date;
          if (d) {
            const dt = new Date(d);
            if (!firstDate || dt < firstDate) firstDate = dt;
            if (!lastDate || dt > lastDate) lastDate = dt;
          }
        }
      });
      return {
        ...t,
        challans: challanArr,
        firstChallan: challanArr[0] || '-',
        lastChallan: challanArr[challanArr.length - 1] || '-',
        firstDate,
        lastDate,
      };
    }).sort((a, b) => b.pf - a.pf);
  }, [allPohonch, challanDatesMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTransports;
    return allTransports.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.gstin || '').toLowerCase().includes(q)
    );
  }, [allTransports, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = page * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  // Summary totals across filtered
  const totals = useMemo(() => {
    let amt = 0, kaat = 0, pf = 0, bilties = 0;
    filtered.forEach((t) => { amt += t.amt; kaat += t.kaat; pf += t.pf; bilties += t.bilties; });
    return { amt, kaat, pf, bilties };
  }, [filtered]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(0);
  };

  if (allPohonch.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-gray-800">Transport-wise Analysis</h2>
        </div>
        <span className="text-[10px] text-gray-500">{allTransports.length} transports · {allPohonch.length} pohonch</span>

        {/* Search */}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search transport / GSTIN..."
              className="pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent w-52"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(0); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary strip */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-4 px-4 py-2 bg-blue-50/40 border-b border-blue-100 text-xs">
          <span className="text-gray-500">Showing <span className="font-bold text-gray-800">{filtered.length}</span> transport(s)</span>
          <span className="text-gray-500">Bilties: <span className="font-bold text-gray-800">{totals.bilties}</span></span>
          <span className="text-gray-500">Amount: <span className="font-bold text-gray-800">₹{Math.round(totals.amt).toLocaleString()}</span></span>
          <span className="text-gray-500">Kaat: <span className="font-bold text-emerald-700">₹{Math.round(totals.kaat).toLocaleString()}</span></span>
          <span className="text-gray-500">PF: <span className="font-bold text-amber-700">₹{Math.round(totals.pf).toLocaleString()}</span></span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No transports match your search.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Transport</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">GSTIN</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Pohonch</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Bilties</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Pohonch Nos.</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">First Challan</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Last Challan</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Date Range</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Amount</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Kaat</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-amber-600 uppercase">PF</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t, i) => {
                  const globalIdx = page * ITEMS_PER_PAGE + i;
                  return (
                    <tr
                      key={t.gstin || t.name}
                      className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${globalIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-3 py-2 text-gray-500 font-medium">{globalIdx + 1}</td>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-gray-800 text-xs">{t.name}</span>
                      </td>
                      <td className="px-3 py-2 text-[10px] font-mono text-gray-500">{t.gstin || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-full">{t.pohonchCount}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">{t.bilties}</td>
                      <td className="px-3 py-2 text-[10px] text-gray-600 max-w-[160px]">
                        <div className="flex flex-wrap gap-1">
                          {t.pohonchNumbers.slice(0, 3).map((pn) => (
                            <span key={pn} className="font-mono bg-teal-50 text-teal-700 border border-teal-200 rounded px-1 py-0.5 text-[9px]">{pn}</span>
                          ))}
                          {t.pohonchNumbers.length > 3 && (
                            <span className="text-gray-400 text-[9px]">+{t.pohonchNumbers.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[10px] font-mono">
                        {t.firstChallan !== '-' ? (
                          <Link href={`/hub-management/${t.firstChallan}`} className="text-blue-700 hover:underline">{t.firstChallan}</Link>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-[10px] font-mono">
                        {t.lastChallan !== '-' ? (
                          <Link href={`/hub-management/${t.lastChallan}`} className="text-blue-700 hover:underline">{t.lastChallan}</Link>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-gray-600">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {t.firstDate ? format(t.firstDate, 'dd/MM/yy') : '-'}
                          {t.firstDate && t.lastDate ? ' → ' : ''}
                          {t.lastDate && t.firstDate?.getTime() !== t.lastDate?.getTime() ? format(t.lastDate, 'dd/MM/yy') : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800 font-medium">₹{Math.round(t.amt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-emerald-700 font-medium">₹{Math.round(t.kaat).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-extrabold text-amber-700">₹{Math.round(t.pf).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals footer */}
              <tfoot>
                <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold text-xs">
                  <td colSpan={9} className="px-3 py-2 text-right text-gray-600 text-[10px] uppercase">
                    Total ({filtered.length} transports)
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900">₹{Math.round(totals.amt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-emerald-700">₹{Math.round(totals.kaat).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-amber-700">₹{Math.round(totals.pf).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 bg-gray-50/50">
              <p className="text-[11px] text-gray-500">
                {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-xs font-medium text-gray-700">{page + 1} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
