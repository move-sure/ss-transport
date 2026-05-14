'use client';
import React, { useState, useMemo } from 'react';
import { X, Printer, Loader2, ArrowLeft, Search } from 'lucide-react';
import { fmtN } from './transportReportUtils';
import { ALL_COLS, DEFAULT_SELECTED_COLS } from './crossingBillsColumns';

const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '';

// Single data row
function DataRow({ b, activeCols, excluded = false, onToggle }) {
  const isPaid = b.payment_mode === 'paid' || b.payment_mode === 'foc';
  const dd = Number(b.kaat_dd) || 0;
  const kaat = Number(b.kaat) || 0;

  const getCellContent = (col) => {
    switch (col.id) {
      case 'gr_no':
        return (
          <>
            {onToggle && (
              <span className={`inline-flex items-center justify-center mr-1.5 w-3.5 h-3.5 rounded border-2 align-middle ${
                excluded ? 'border-red-400 bg-red-100' : 'border-gray-500 bg-white'
              }`}>
                {!excluded && <span className="block w-1.5 h-1.5 bg-gray-700 rounded-sm" />}
              </span>
            )}
            {b.gr_no}
          </>
        );
      case 'pohonch_no':
        return b.dest_pohonch_no || b.bilty_number ? (b.dest_pohonch_no || b.bilty_number) : <span className="text-gray-400 italic text-[10px]">Not Provided Yet</span>;
      case 'bilty_date':
        return <>{b.bilty_date ? new Date(b.bilty_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : ''}</>;
      case 'station':
        return b.to_city || b.destination || '';
      case 'consignor':
        return b.consignor_name || '';
      case 'consignee':
        return b.consignee_name || '';
      case 'pkgs':
        return b.no_of_pkg ?? '';
      case 'wt':
        return b.wt ?? '';
      case 'dd':
        return dd !== 0 ? fmtN(dd) : '';
      case 'rate':
        return b.kaat_rate ?? '';
      case 'total':
        return isPaid ? 'PAID' : (b.total != null ? `₹${fmtN(Number(b.total))}` : '');
      case 'to_pay_pf':
        return !isPaid ? fmtN(Number(b.kaat_pf) || 0) : '';
      case 'paid_kaat':
        return isPaid ? fmtN(dd + kaat) : '';
      default:
        return '';
    }
  };

  const getCellClass = (col) => {
    const baseClass = 'px-2 py-1.5 text-xs';
    switch (col.id) {
      case 'gr_no':
        return `${baseClass} font-black text-gray-900 whitespace-nowrap`;
      case 'pohonch_no':
        return `${baseClass} font-semibold text-gray-800 whitespace-nowrap`;
      case 'to_pay_pf':
        return `${baseClass} text-right font-bold text-blue-700 whitespace-nowrap`;
      case 'paid_kaat':
        return `${baseClass} text-right font-bold text-red-700 whitespace-nowrap`;
      case 'pkgs':
        return `${baseClass} text-center text-gray-700 font-semibold`;
      case 'wt':
      case 'dd':
        return `${baseClass} text-right text-gray-700`;
      case 'rate':
        return `${baseClass} text-right text-gray-500`;
      case 'total':
        return `${baseClass} text-right font-bold text-gray-900`;
      default:
        return `${baseClass} text-gray-600`;
    }
  };

  return (
    <tr
      onClick={onToggle ? () => onToggle(b.gr_no) : undefined}
      className={`border-b border-gray-100 transition-colors ${
        onToggle ? 'cursor-pointer' : ''
      } ${
        excluded
          ? 'opacity-40 bg-red-50 line-through'
          : isPaid
          ? 'bg-green-50 hover:bg-green-100'
          : 'bg-white hover:bg-gray-50'
      }`}
    >
      {activeCols.map((col) => (
        <td key={col.id} className={getCellClass(col)}>
          {getCellContent(col)}
        </td>
      ))}
    </tr>
  );
}

// Subtotal / Grand total row
function TotalsRow({ bilties, label, activeCols, isGrand = false }) {
  const pf   = bilties
                 .filter(b => b.payment_mode === 'to-pay')
                 .reduce((s, b) => s + (Number(b.kaat_pf) || 0), 0);
  const paid = bilties
                 .filter(b => b.payment_mode === 'paid' || b.payment_mode === 'foc')
                 .reduce((s, b) => s + (Number(b.kaat_dd) || 0) + (Number(b.kaat) || 0), 0);
  const pkgs = bilties.reduce((s, b) => s + (Number(b.no_of_pkg) || 0), 0);
  const wt   = bilties.reduce((s, b) => s + (Number(b.wt)        || 0), 0);
  const dd   = bilties.reduce((s, b) => s + (Number(b.kaat_dd)   || 0), 0);
  const netPf = pf - paid;

  const getCellContent = (col) => {
    switch (col.id) {
      case 'pkgs': return String(pkgs);
      case 'wt': return fmtN(wt);
      case 'dd': return fmtN(dd);
      case 'to_pay_pf': return fmtN(pf);
      case 'paid_kaat': return fmtN(paid);
      default: return '';
    }
  };

  if (isGrand) {
    return (
      <>
        <tr className='bg-gray-800 text-white text-xs font-bold border-t-2 border-gray-600'>
          {activeCols.map((col, idx) => {
            const content = getCellContent(col);
            const isLabel = idx === 0;
            const isCount = idx === 1;
            let tdClass = 'px-3 py-2';
            if (col.id === 'to_pay_pf') tdClass += ' text-right text-blue-300';
            else if (col.id === 'paid_kaat') tdClass += ' text-right text-red-300';
            else if (col.id === 'pkgs') tdClass += ' text-center';
            else if (col.id === 'wt' || col.id === 'dd') tdClass += ' text-right';
            return (
              <td
                key={col.id}
                className={tdClass}
              >
                {isLabel ? label : isCount ? `(${bilties.length})` : content}
              </td>
            );
          })}
        </tr>
        <tr className='bg-gray-950 text-white text-xs font-black border-t border-gray-700'>
          <td colSpan={activeCols.length} className='px-4 py-3 text-center tracking-wide'>
            {'NET PF = To-Pay PF - Paid KAAT = '}
            <span className='text-blue-300'>{fmtN(pf)}</span>
            {' - '}
            <span className='text-red-300'>{fmtN(paid)}</span>
            {' = '}
            <span className={netPf >= 0 ? 'text-base font-black text-white' : 'text-base font-black text-red-400'}>
              {'Rs. ' + fmtN(netPf)}
            </span>
          </td>
        </tr>
      </>
    );
  }

  return (
    <tr className="bg-gray-200 text-gray-800 text-xs font-bold border-y border-gray-300">
      {activeCols.map((col) => {
        const content = getCellContent(col);
        return (
          <td
            key={col.id}
            className={`px-2 py-1.5 ${
              col.id === 'to_pay_pf'
                ? 'text-right text-blue-700'
                : col.id === 'paid_kaat'
                ? 'text-right text-red-700'
                : col.id === 'pkgs'
                ? 'text-center'
                : col.id === 'wt' || col.id === 'dd'
                ? 'text-right'
                : ''
            }`}
          >
            {content}
          </td>
        );
      })}
    </tr>
  );
}

// Group header row
function GroupHeader({ label, count, colCount }) {
  return (
    <tr className="bg-gray-700 text-white">
      <td colSpan={colCount} className="px-4 py-2.5">
        <span className="font-black text-base">{label}</span>
        <span className="ml-3 text-xs font-normal text-gray-300 bg-gray-600 px-2 py-0.5 rounded-full">
          {count} bilties
        </span>
      </td>
    </tr>
  );
}

// Main preview component
export default function CrossingBillsPreviewTable({
  pohonchGroups,
  noPohonchGroup,
  excludedGroups,
  excludedBilties,
  printFormat,
  transportName,
  transportGst,
  fromDate,
  toDate,
  billDate,
  selectedCols = DEFAULT_SELECTED_COLS,
  onClose,
  onBackToSettings,
  onPrint,
  onToggleBilty,
  pdfLoading,
}) {
  const [searchText, setSearchText] = useState('');
  const activeCols = ALL_COLS.filter(c => selectedCols.includes(c.id));

  const inclPohonch   = (pohonchGroups   || []).filter(g => !excludedGroups.has(g.key));
  const inclNoPohonch = ((noPohonchGroup?.bilties) || []).filter(b => !excludedBilties.has(b.gr_no));
  const allIncluded   = [...inclPohonch.flatMap(g => g.bilties), ...inclNoPohonch];

  // Bilty format: all bilties from ALL groups (ignore group-level exclusions), sorted
  const allBiltyFlat = useMemo(() => {
    const all = [
      ...(pohonchGroups || []).flatMap(g => g.bilties),
      ...((noPohonchGroup?.bilties) || []),
    ];
    return all.sort((a, b) => {
      const da = a.dest_pohonch_no || a.bilty_number || '';
      const db = b.dest_pohonch_no || b.bilty_number || '';
      if (da === '' && db !== '') return 1;
      if (da !== '' && db === '') return -1;
      const na = parseInt(da, 10), nb = parseInt(db, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return da.localeCompare(db);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pohonchGroups, noPohonchGroup]);

  // Bilty rows for PDF/totals = non-excluded only
  const biltyRows = useMemo(
    () => allBiltyFlat.filter(b => !excludedBilties.has(b.gr_no)),
    [allBiltyFlat, excludedBilties]
  );

  // Table display rows — filtered by search text
  const displayBilties = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return allBiltyFlat;
    return allBiltyFlat.filter(b =>
      (b.gr_no           || '').toLowerCase().includes(q) ||
      (b.dest_pohonch_no || '').toLowerCase().includes(q) ||
      (b.bilty_number    || '').toLowerCase().includes(q) ||
      (b.to_city         || '').toLowerCase().includes(q) ||
      (b.destination     || '').toLowerCase().includes(q)
    );
  }, [allBiltyFlat, searchText]);

  // Unique stations for bulk-select chips
  const stations = useMemo(() => {
    const map = new Map();
    for (const b of allBiltyFlat) {
      const st = b.to_city || b.destination || 'Unknown';
      if (!map.has(st)) map.set(st, []);
      map.get(st).push(b);
    }
    return [...map.entries()]
      .map(([name, bs]) => ({ name, bs }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allBiltyFlat]);

  const grandBilties = printFormat === 'bilty' ? biltyRows : allIncluded;

  // Toggle-all for bilty format
  const allSelected = allBiltyFlat.every(b => !excludedBilties.has(b.gr_no));
  const toggleAll = () => {
    if (!onToggleBilty) return;
    if (allSelected) {
      allBiltyFlat.forEach(b => { if (!excludedBilties.has(b.gr_no)) onToggleBilty(b.gr_no); });
    } else {
      allBiltyFlat.forEach(b => { if (excludedBilties.has(b.gr_no))  onToggleBilty(b.gr_no); });
    }
  };

  // Toggle all bilties for a given station
  const toggleStation = (stBilties) => {
    if (!onToggleBilty) return;
    const allSel = stBilties.every(b => !excludedBilties.has(b.gr_no));
    stBilties.forEach(b => {
      if (allSel) { if (!excludedBilties.has(b.gr_no)) onToggleBilty(b.gr_no); }
      else        { if ( excludedBilties.has(b.gr_no)) onToggleBilty(b.gr_no); }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">

      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="h-4 w-px bg-gray-700" />
          <div>
            <p className="text-sm font-black text-white leading-tight">{transportName || 'Transport'}</p>
            <p className="text-[10px] text-gray-400">
              {fromDate} to {toDate}
              {billDate && <> &middot; Bill: {billDate}</>}
              {' \u00B7 '}
              {printFormat === 'bilty' ? 'Bilty Format' : 'Pohonch Format'}
              {' \u00B7 '}
              <span className="text-white font-bold">{grandBilties.length} bilties</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-bold hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {pdfLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Printer className="h-3.5 w-3.5" />}
            {pdfLoading ? 'Generating...' : 'Generate PDF'}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="shrink-0 flex flex-wrap items-center gap-4 px-4 py-2 bg-gray-800 border-b border-gray-700 text-[11px]">
        <span className="text-gray-400 font-semibold">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-700" />
          <span className="text-gray-300">To-Pay (PF) = kaat_pf for to-pay bilties</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-700" />
          <span className="text-gray-300">Paid (KAAT) = DD + KAAT for paid/foc bilties</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
          <span className="text-gray-300">Green = paid/foc rows</span>
        </span>
        {printFormat === 'bilty' && onToggleBilty && (
          <span className="flex items-center gap-1.5 ml-auto">
            <span className="text-gray-400">Click row to toggle</span>
            <button
              onClick={toggleAll}
              className="px-2.5 py-1 text-[10px] font-bold rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-white font-bold">{biltyRows.length}/{allBiltyFlat.length} selected</span>
          </span>
        )}
      </div>

      {/* Search + Station bulk-select (bilty format only) */}
      {printFormat === 'bilty' && (
        <div className="shrink-0 flex flex-col gap-2 px-4 py-2.5 bg-[#111827] border-b border-gray-700">
          {/* Search row */}
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search GR No, Pohonch No, Station..."
                className="w-full pl-8 pr-7 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {searchText && (
              <span className="text-[11px] text-gray-400">
                Showing <span className="text-white font-bold">{displayBilties.length}</span> of {allBiltyFlat.length} bilties
              </span>
            )}
          </div>

          {/* Station bulk-select chips */}
          {onToggleBilty && stations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-gray-500 font-semibold shrink-0">Bulk by Station:</span>
              {stations.map(({ name, bs }) => {
                const selCount = bs.filter(b => !excludedBilties.has(b.gr_no)).length;
                const allSel  = selCount === bs.length;
                const noneSel = selCount === 0;
                return (
                  <button
                    key={name}
                    onClick={() => toggleStation(bs)}
                    title={allSel ? `Deselect all bilties from ${name}` : `Select all bilties from ${name}`}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                      allSel
                        ? 'bg-green-800 border-green-600 text-green-100 hover:bg-green-700'
                        : noneSel
                        ? 'bg-red-900 border-red-700 text-red-200 hover:bg-red-800'
                        : 'bg-yellow-900 border-yellow-600 text-yellow-200 hover:bg-yellow-800'
                    }`}
                  >
                    {name}
                    <span className={`px-1 rounded-full text-[9px] font-bold ${
                      allSel ? 'bg-green-600 text-white' : noneSel ? 'bg-red-800 text-red-300' : 'bg-yellow-700 text-yellow-100'
                    }`}>
                      {selCount}/{bs.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 780 }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-800 text-white text-[10px] uppercase tracking-wider">
              {activeCols.map(col => (
                <th
                  key={col.id}
                  className={`px-2 py-2 font-bold whitespace-nowrap border-r border-gray-700 last:border-r-0 ${
                    col.id === 'pkgs'                                                      ? 'text-center' :
                    ['wt','dd','rate','to_pay_pf','paid_kaat'].includes(col.id) ? 'text-right'  : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {printFormat === 'bilty' ? (
              <>
                {displayBilties.map((b, i) => (
                  <DataRow
                    key={`${b.gr_no}-${i}`}
                    b={b}
                    activeCols={activeCols}
                    excluded={excludedBilties.has(b.gr_no)}
                    onToggle={onToggleBilty}
                  />
                ))}
                {displayBilties.length === 0 && (
                  <tr>
                    <td colSpan={activeCols.length} className="px-4 py-10 text-center text-gray-400 italic">
                      {searchText
                        ? <><span className="block text-base mb-1">No bilties match</span><span className="text-gray-500">"{searchText}"</span></>
                        : 'No bilties to display.'}
                    </td>
                  </tr>
                )}
                <TotalsRow bilties={biltyRows} label={`GRAND TOTAL - ${biltyRows.length} bilties`} activeCols={activeCols} isGrand />
              </>
            ) : (
              <>
                {inclPohonch.map(grp => (
                  <React.Fragment key={grp.key}>
                    <GroupHeader label={`Pohonch: ${grp.key}`} count={grp.bilties.length} colCount={activeCols.length} />
                    {grp.bilties.map((b, i) => <DataRow key={`${b.gr_no}-${i}`} b={b} activeCols={activeCols} />)}
                    {grp.bilties.length === 0 && (
                      <tr><td colSpan={activeCols.length} className="px-4 py-3 text-center text-gray-400 italic">No bilties.</td></tr>
                    )}
                    <TotalsRow bilties={grp.bilties} label={`Subtotal: ${grp.key} (${grp.bilties.length})`} activeCols={activeCols} />
                  </React.Fragment>
                ))}

                {inclNoPohonch.length > 0 && (
                  <React.Fragment key="__no_pohonch__">
                    <GroupHeader label="No Pohonch Available" count={inclNoPohonch.length} colCount={activeCols.length} />
                    {inclNoPohonch.map((b, i) => <DataRow key={`${b.gr_no}-${i}`} b={b} activeCols={activeCols} />)}
                    <TotalsRow bilties={inclNoPohonch} label={`Subtotal: No Pohonch (${inclNoPohonch.length})`} activeCols={activeCols} />
                  </React.Fragment>
                )}

                {allIncluded.length === 0 && (
                  <tr><td colSpan={activeCols.length} className="px-4 py-8 text-center text-gray-400 italic">No bilties to display.</td></tr>
                )}

                <TotalsRow bilties={grandBilties} label={`GRAND TOTAL - ${grandBilties.length} bilties`} activeCols={activeCols} isGrand />
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="shrink-0 px-4 py-2 bg-gray-900 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          <span className="font-bold text-white">{grandBilties.length}</span> bilties included in PDF
        </p>
      </div>

    </div>
  );
}
