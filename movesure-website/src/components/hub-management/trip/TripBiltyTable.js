'use client';

import React, { useRef, useState } from 'react';
import {
  ClipboardList, Search, X, Filter, Loader2,
  Square, CheckSquare, FileText, Printer, Box, Hash, ChevronDown,
} from 'lucide-react';
import BiltyTableRow from '../BiltyTableRow';
import BiltyMobileCard from '../BiltyMobileCard';
import { kTotal } from '../HubHelpers';

export default function TripBiltyTable({
  displayed, enrichedBilties, footerTotals, kaatData, selectedGrs, toggleSelectAll,
  toggleSelect, bulkLoading, kanpurFilter, setKanpurFilter, loadingKanpur, kanpurCount,
  kanpurGrNos, grSearch, setGrSearch, citySearch, setCitySearch, transportSearch, setTransportSearch,
  uniqueCities, uniqueTransports, transportsByCity, savingTransport, updatingTransit,
  crossChallanMap, crossChallanPrint, userName, podGrNos,
  onTransportChange, onOpenKaat, onOpenAddTransport, setPreviewImage,
  onDeliveredAtBranch2, onOutFromBranch2, onDeliveredAtDestination,
  onBulkAction, onPrintCrossChallan, ccGenerating, onShowBulkPohonch,
}) {
  const transportDropdownRef = useRef(null);
  const [transportDropdownOpen, setTransportDropdownOpen] = useState(false);
  const [transportFilterText, setTransportFilterText] = useState('');

  // Close dropdown on outside click
  React.useEffect(() => {
    const h = (e) => { if (transportDropdownRef.current && !transportDropdownRef.current.contains(e.target)) setTransportDropdownOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const clearFilters = () => { setGrSearch(''); setCitySearch(''); setTransportSearch(''); setKanpurFilter(false); };
  const hasFilters = grSearch || citySearch || transportSearch || kanpurFilter;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* SEARCH + FILTERS */}
      <div className="px-3 py-2 border-b border-gray-100 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5 text-indigo-500" />
            GR Details — All Trip Bilties
            <span className="text-[10px] font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {displayed.length}/{enrichedBilties.length}
            </span>
            <span className="text-[10px] text-gray-400">· A→Z by station</span>
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasFilters && (
              <button onClick={clearFilters} className="text-[10px] px-2 py-1 bg-red-100 text-red-700 font-semibold border border-red-200 rounded-lg hover:bg-red-200 flex items-center gap-0.5">
                <X className="h-2.5 w-2.5" />Clear
              </button>
            )}
            <button
              onClick={() => setKanpurFilter(!kanpurFilter)}
              disabled={loadingKanpur}
              className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${kanpurFilter ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200'} disabled:opacity-50`}
            >
              {loadingKanpur ? <Loader2 className="h-2.5 w-2.5 animate-spin inline mr-0.5" /> : <Filter className="h-2.5 w-2.5 inline mr-0.5" />}
              Kanpur ({kanpurCount})
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* GR search */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search GR No, City, Challan No, Transport..."
              value={grSearch}
              onChange={e => setGrSearch(e.target.value)}
              className="w-full pl-7 pr-7 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
            />
            {grSearch && <button onClick={() => setGrSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-3 w-3 text-gray-400 hover:text-gray-600" /></button>}
          </div>

          {/* City filter */}
          <select
            value={citySearch}
            onChange={e => setCitySearch(e.target.value)}
            className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-300 outline-none min-w-[140px] bg-white"
          >
            <option value="">All Cities ({uniqueCities.length})</option>
            {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Transport dropdown */}
          <div className="relative min-w-[220px]" ref={transportDropdownRef}>
            <button
              type="button"
              onClick={() => { setTransportDropdownOpen(!transportDropdownOpen); setTransportFilterText(''); }}
              className={`w-full text-xs border rounded-lg px-3 py-2 focus:ring-1 outline-none bg-white text-left flex items-center justify-between gap-1 ${transportSearch ? 'border-indigo-400 font-bold text-black' : 'border-gray-200 text-gray-500'}`}
            >
              <span className="truncate">{transportSearch || `All Transports (${uniqueTransports.length})`}</span>
              {transportSearch
                ? <X className="h-3.5 w-3.5 hover:text-red-500 shrink-0" onClick={e => { e.stopPropagation(); setTransportSearch(''); setTransportDropdownOpen(false); }} />
                : <ChevronDown className="h-3.5 w-3.5 text-gray-500 shrink-0" />}
            </button>
            {transportDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <input autoFocus type="text" placeholder="Search transport..." value={transportFilterText} onChange={e => setTransportFilterText(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:ring-1 outline-none" />
                </div>
                <div className="overflow-y-auto max-h-56">
                  <button onClick={() => { setTransportSearch(''); setTransportDropdownOpen(false); }} className={`w-full text-left text-xs px-3 py-2 hover:bg-indigo-50 ${!transportSearch ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-black'}`}>
                    All Transports ({uniqueTransports.length})
                  </button>
                  {uniqueTransports.filter(t => t.toLowerCase().includes(transportFilterText.toLowerCase())).map(t => (
                    <button key={t} onClick={() => { setTransportSearch(t); setTransportDropdownOpen(false); }} className={`w-full text-left text-xs px-3 py-2 hover:bg-indigo-50 ${transportSearch === t ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-black'}`}>{t}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedGrs.size > 0 && (
        <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-800">{selectedGrs.size} selected</span>
            {selectedGrs.size !== displayed.length && (
              <button onClick={() => toggleSelectAll()} className="text-[10px] px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-semibold">Clear</button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onShowBulkPohonch} disabled={!!bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 shadow-sm">
              <FileText className="h-3 w-3" />Assign Pohonch
            </button>
            <button onClick={onPrintCrossChallan} disabled={ccGenerating || !!bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:opacity-40 shadow-sm">
              {ccGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
              {ccGenerating ? 'Generating...' : 'Print Cross Challan'}
            </button>
            {[
              { type: 'branch',    label: 'Delivered at Branch',       color: 'bg-red-500 hover:bg-red-600' },
              { type: 'out',       label: 'Out for Delivery',           color: 'bg-orange-500 hover:bg-orange-600' },
              { type: 'delivered', label: 'Delivered at Destination',   color: 'bg-green-500 hover:bg-green-600' },
            ].map(({ type, label, color }) => (
              <button key={type} onClick={() => onBulkAction(type, displayed)} disabled={!!bulkLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white ${color} disabled:opacity-40 shadow-sm`}>
                {bulkLoading === type ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="w-3 h-3 rounded-full bg-white/30 inline-block" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TABLE / EMPTY */}
      {displayed.length === 0 ? (
        <div className="p-10 text-center">
          <Box className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-xs">
            {grSearch || citySearch || transportSearch ? 'No matching bilties' : kanpurFilter ? 'No Kanpur bilties' : 'No bilties in this trip'}
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-1.5 py-2 text-center w-7">
                    <button onClick={toggleSelectAll} className="text-indigo-600 hover:text-indigo-800">
                      {selectedGrs.size === displayed.length && displayed.length > 0 ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                    </button>
                  </th>
                  <th className="px-1 py-2 text-left font-bold text-gray-700 w-6 text-[10px]">#</th>
                  <th className="px-1.5 py-2 text-left font-bold text-blue-700 text-[10px] bg-blue-50/50">Challan No</th>
                  <th className="px-1 py-2 text-center font-bold text-gray-700 w-6 text-[10px]">Img</th>
                  <th className="px-1.5 py-2 text-left font-bold text-gray-700 text-[10px]">GR No</th>
                  <th className="px-1.5 py-2 text-left font-bold text-gray-700 text-[10px]">Dest</th>
                  <th className="px-1.5 py-2 text-left font-bold text-gray-700 text-[10px]">Consignor / Consignee</th>
                  <th className="px-1.5 py-2 text-left font-bold text-gray-700 text-[10px]">Pvt Marks</th>
                  <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Pkts</th>
                  <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Wt</th>
                  <th className="px-1.5 py-2 text-right font-bold text-gray-700 text-[10px]">Amt</th>
                  <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Pay</th>
                  <th className="px-1.5 py-2 text-left font-bold text-gray-700 text-[10px] min-w-[130px]">Transport</th>
                  <th className="px-1.5 py-2 text-center font-bold text-gray-700 text-[10px]">Pohonch/Bilty#</th>
                  <th className="px-1.5 py-2 text-center font-bold text-gray-700 text-[10px]">Cross Challan</th>
                  <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Kaat</th>
                  <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Status</th>
                  <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px]">Transit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((b, i) => (
                  <BiltyTableRow
                    key={b.id}
                    b={b}
                    displayIdx={i + 1}
                    isSelected={selectedGrs.has(b.id)}
                    isKanpur={kanpurGrNos.has(b.gr_no)}
                    kanpurFilter={kanpurFilter}
                    kd={kaatData[b.gr_no]}
                    cityTransports={b.to_city_id ? (transportsByCity[b.to_city_id] || []) : []}
                    selectedTransportId={kaatData[b.gr_no]?.transport_id || ''}
                    isSavingTransport={!!savingTransport[b.gr_no]}
                    onToggleSelect={() => toggleSelect(b.id)}
                    onTransportChange={onTransportChange}
                    onOpenKaat={onOpenKaat}
                    onOpenAddTransport={onOpenAddTransport}
                    onPreviewImage={setPreviewImage}
                    updatingTransit={updatingTransit}
                    onBranch={() => onDeliveredAtBranch2(b)}
                    onOut={() => onOutFromBranch2(b)}
                    onDelivered={() => onDeliveredAtDestination(b)}
                    userName={userName}
                    crossChallanNo={crossChallanMap[b.gr_no] || null}
                    onPrintCrossChallan={crossChallanPrint?.handlePrint}
                    printingCrossChallan={crossChallanPrint?.printingPohonch}
                    challanNo={b.challan_no}
                    showChallanNo={true}
                  />
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr className="font-bold text-[11px] text-black">
                  <td className="px-1.5 py-2" colSpan={8}>TOTAL ({displayed.length} GR)</td>
                  <td className="px-1 py-2 text-center">{footerTotals.packets}</td>
                  <td className="px-1 py-2 text-center">{footerTotals.weight.toFixed(1)}</td>
                  <td className="px-1.5 py-2 text-right">₹{footerTotals.amount.toLocaleString('en-IN')}</td>
                  <td colSpan={4} />
                  <td className="px-1 py-2 text-center text-emerald-700">₹{footerTotals.kaat.toFixed(0)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="lg:hidden divide-y divide-gray-100">
            {displayed.map((b, i) => (
              <div key={b.id}>
                <div className="px-3 pt-2 pb-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold rounded-lg">
                    <Hash className="h-2.5 w-2.5" />{b.challan_no}
                  </span>
                </div>
                <BiltyMobileCard
                  b={b}
                  displayIdx={i + 1}
                  isSelected={selectedGrs.has(b.id)}
                  isKanpur={kanpurGrNos.has(b.gr_no)}
                  kanpurFilter={kanpurFilter}
                  kd={kaatData[b.gr_no]}
                  cityTransports={b.to_city_id ? (transportsByCity[b.to_city_id] || []) : []}
                  selectedTransportId={kaatData[b.gr_no]?.transport_id || ''}
                  isSavingTransport={!!savingTransport[b.gr_no]}
                  onToggleSelect={() => toggleSelect(b.id)}
                  onTransportChange={onTransportChange}
                  onOpenKaat={onOpenKaat}
                  onOpenAddTransport={onOpenAddTransport}
                  onPreviewImage={setPreviewImage}
                  updatingTransit={updatingTransit}
                  onBranch={() => onDeliveredAtBranch2(b)}
                  onOut={() => onOutFromBranch2(b)}
                  onDelivered={() => onDeliveredAtDestination(b)}
                  userName={userName}
                  crossChallanNo={crossChallanMap[b.gr_no] || null}
                  onPrintCrossChallan={crossChallanPrint?.handlePrint}
                  printingCrossChallan={crossChallanPrint?.printingPohonch}
                  challanNo={b.challan_no}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
