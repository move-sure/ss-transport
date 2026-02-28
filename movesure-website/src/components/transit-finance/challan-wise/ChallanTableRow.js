'use client';

import React, { memo, useState, useRef, useCallback } from 'react';
import { Package, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import BiltyKaatCell from '../bilty-kaat-cell';
import TransportChangeCell from '../transport-change-cell';
import {
  getCityNameById,
  getCityNameByCode,
  getCityIdByCode,
  calculateOtherCharges,
  getPaymentModeBadgeClass,
  formatCurrency,
  formatWeight
} from '../finance-bilty-helpers';

// Inline editable cell — click to type, saves on blur or Enter
function InlineEditCell({ value, grNo, field, placeholder, onSave }) {
  const [localVal, setLocalVal] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const lastSaved = useRef(value || '');

  // Sync when parent value changes (e.g. from realtime)
  React.useEffect(() => {
    if (!inputRef.current || document.activeElement !== inputRef.current) {
      setLocalVal(value || '');
      lastSaved.current = value || '';
    }
  }, [value]);

  const doSave = useCallback(async () => {
    const trimmed = localVal.trim();
    if (trimmed === (lastSaved.current || '').trim()) return;
    setSaving(true);
    await onSave(grNo, field, trimmed);
    lastSaved.current = trimmed;
    setSaving(false);
  }, [localVal, grNo, field, onSave]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={doSave}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
      className={`w-full min-w-[50px] max-w-[80px] px-1 py-0.5 text-[10px] border rounded outline-none transition-colors
        ${saving ? 'border-blue-400 bg-blue-50' : localVal ? 'border-gray-300 bg-white' : 'border-transparent bg-transparent hover:border-gray-200 hover:bg-gray-50'}
        focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-200`}
      placeholder={placeholder}
      title={`Click to enter ${field === 'pohonch_no' ? 'Pohonch No' : 'Bilty Number'}`}
    />
  );
}

function ChallanTableRow({
  transit,
  index,
  cities,
  selectedChallan,
  isSelected,
  isAlreadySaved,
  editMode,
  allKaatData,
  transportsByCity,
  preloadedHubRates,
  userNamesMap,
  getAdminNameForBilty,
  onToggleSelect,
  onKaatUpdate,
  onKaatDelete,
  onTransportChanged,
  onInlineFieldSave,
  transportLookup,
}) {
  const bilty = transit.bilty;
  const station = transit.station;
  const data = bilty || station;
  const normalizedGrNo = String(transit.gr_no).trim().toUpperCase();
  const isClickable = editMode || !isAlreadySaved;
  const kaatData = allKaatData[transit.gr_no];

  const handleRowClick = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    if (e.target.closest('[data-transport-cell]') || e.target.closest('[data-kaat-cell]')) return;
    if (!isClickable) return;
    onToggleSelect(normalizedGrNo);
  };

  const getCityName = (cityId) => getCityNameById(cityId, cities);
  const getCityByCode = (code) => getCityNameByCode(code, cities);

  // Compute payment/delivery info
  const paymentMode = bilty?.payment_mode || station?.payment_status;
  const deliveryType = bilty?.delivery_type || station?.delivery_type || '';
  const isPaidOrDD = paymentMode?.toLowerCase().includes('paid') || deliveryType.toLowerCase().includes('door');
  const hasDDFlag = deliveryType.toLowerCase().includes('door');
  const ddChrg = kaatData?.dd_chrg ? parseFloat(kaatData.dd_chrg) : 0;

  // Kaat calculation
  let kaatAmount = 0;
  if (kaatData) {
    if (kaatData.kaat != null) {
      kaatAmount = parseFloat(kaatData.kaat);
    } else {
      const weight = parseFloat(bilty?.wt || station?.weight || 0);
      const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
      const rateKg = parseFloat(kaatData.rate_per_kg) || 0;
      const ratePkg = parseFloat(kaatData.rate_per_pkg) || 0;
      const effectiveWeight = Math.max(weight, 50);
      if (kaatData.rate_type === 'per_kg') kaatAmount = effectiveWeight * rateKg;
      else if (kaatData.rate_type === 'per_pkg') kaatAmount = packages * ratePkg;
      else if (kaatData.rate_type === 'hybrid') kaatAmount = (effectiveWeight * rateKg) + (packages * ratePkg);
      kaatAmount += parseFloat(kaatData.bilty_chrg || 0) + parseFloat(kaatData.ewb_chrg || 0) + parseFloat(kaatData.labour_chrg || 0) + parseFloat(kaatData.other_chrg || 0);
    }
  }

  const totalAmount = isPaidOrDD ? 0 : parseFloat(bilty?.total || station?.amount || 0);
  const profit = kaatData ? totalAmount - kaatAmount - ddChrg : totalAmount - ddChrg;

  return (
    <tr
      onClick={handleRowClick}
      className={`transition-colors border-b border-gray-100 ${
        isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
      } ${
        isAlreadySaved
          ? 'bg-amber-50 hover:bg-amber-100'
          : isSelected
          ? 'bg-emerald-50 hover:bg-emerald-100'
          : 'hover:bg-blue-50/50'
      }`}
      title={isClickable ? 'Click to select/deselect' : 'Already saved in a kaat bill'}
    >
      {/* # */}
      <td className="px-1 py-1.5 text-center text-[10px] font-semibold text-gray-400 whitespace-nowrap">{index + 1}</td>

      {/* Checkbox */}
      <td className="px-1 py-1.5 text-center whitespace-nowrap">
        {isAlreadySaved ? (
          <span className="text-amber-500 text-xs" title="Saved in kaat bill">🔒</span>
        ) : (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(normalizedGrNo);
            }}
            className="cursor-pointer w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
        )}
      </td>

      {/* GR No */}
      <td className="px-1 py-1.5 whitespace-nowrap">
        <span className={`font-bold text-[10px] ${isAlreadySaved ? 'text-amber-700' : 'text-blue-700'}`}>
          {transit.gr_no}
          {isAlreadySaved && <span className="ml-0.5 text-[8px] text-amber-500">✓</span>}
        </span>
      </td>

      {/* Date */}
      <td className="px-1 py-1.5 text-gray-500 text-[10px] whitespace-nowrap">
        {data?.bilty_date || data?.created_at
          ? format(new Date(data.bilty_date || data.created_at), 'dd/MM')
          : '-'}
      </td>

      {/* Consignor */}
      <td className="px-1 py-1.5 text-gray-800 text-[10px] max-w-[100px]" title={bilty?.consignor_name || station?.consignor || 'N/A'}>
        <span className="block truncate">{bilty?.consignor_name || station?.consignor || 'N/A'}</span>
      </td>

      {/* Consignee */}
      <td className="px-1 py-1.5 text-gray-800 text-[10px] max-w-[100px]" title={bilty?.consignee_name || station?.consignee || 'N/A'}>
        <span className="block truncate">{bilty?.consignee_name || station?.consignee || 'N/A'}</span>
      </td>

      {/* Transport - Clickable to change */}
      <td className="px-1 py-1.5" data-transport-cell>
        <TransportChangeCell
          transit={transit}
          cities={cities}
          transportsByCity={transportsByCity}
          preloadedHubRates={preloadedHubRates}
          getAdminNameForBilty={getAdminNameForBilty}
          onTransportChanged={onTransportChanged}
          kaatData={kaatData}
          transportLookup={transportLookup}
          challanNo={selectedChallan.challan_no}
        />
      </td>

      {/* Destination */}
      <td className="px-1 py-1.5 whitespace-nowrap">
        <span className="font-semibold text-purple-700 text-[10px]">
          {bilty ? getCityName(bilty.to_city_id) : getCityByCode(station?.station)}
        </span>
      </td>

      {/* Contents */}
      <td className="px-1 py-1.5 text-gray-500 text-[10px] max-w-[80px]" title={bilty?.contain || station?.contents || 'N/A'}>
        <span className="block truncate">{bilty?.contain || station?.contents || 'N/A'}</span>
      </td>

      {/* Packages */}
      <td className="px-1 py-1.5 text-right text-[10px] whitespace-nowrap">
        <span className="text-gray-800 font-medium">{bilty?.no_of_pkg || station?.no_of_packets || 0}</span>
      </td>

      {/* Weight */}
      <td className="px-1 py-1.5 text-right whitespace-nowrap">
        <span className="font-semibold text-gray-900 text-[10px]">
          {formatWeight(bilty?.wt || station?.weight || 0)}
        </span>
      </td>

      {/* Total */}
      <td className="px-1 py-1.5 text-right whitespace-nowrap">
        <span className="text-blue-800 font-bold text-[10px] bg-blue-50 px-1 py-0.5 rounded border border-blue-100 inline-block">
          {isPaidOrDD ? '0' : formatCurrency(bilty?.total || station?.amount || 0)}
        </span>
      </td>

      {/* Payment Mode */}
      <td className="px-1 py-1.5 text-center whitespace-nowrap">
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${getPaymentModeBadgeClass(paymentMode)}`}>
          {(() => {
            const payment = paymentMode?.toUpperCase().replace('-', ' ') || 'N/A';
            const delivery = hasDDFlag ? '/DD' : '';
            return payment + delivery;
          })()}
        </span>
      </td>

      {/* DD Charge */}
      <td className="px-1 py-1.5 text-right whitespace-nowrap">
        {!hasDDFlag ? (
          <span className="text-gray-200 text-[10px]">-</span>
        ) : ddChrg > 0 ? (
          <span className="font-bold text-[10px] text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-100 inline-block">
            -₹{ddChrg.toFixed(0)}
          </span>
        ) : (
          <span className="text-[9px] text-orange-400 font-semibold">DD⚠</span>
        )}
      </td>

      {/* Pohonch No - inline editable */}
      <td className="px-0.5 py-0.5" onClick={(e) => e.stopPropagation()}>
        <InlineEditCell
          value={kaatData?.pohonch_no || ''}
          grNo={transit.gr_no}
          field="pohonch_no"
          placeholder="-"
          onSave={onInlineFieldSave}
        />
      </td>

      {/* Bilty Number - inline editable */}
      <td className="px-0.5 py-0.5" onClick={(e) => e.stopPropagation()}>
        <InlineEditCell
          value={kaatData?.bilty_number || ''}
          grNo={transit.gr_no}
          field="bilty_number"
          placeholder="-"
          onSave={onInlineFieldSave}
        />
      </td>

      {/* Kaat */}
      <td className="px-1 py-1.5" data-kaat-cell>
        <BiltyKaatCell
          grNo={transit.gr_no}
          challanNo={selectedChallan.challan_no}
          destinationCityId={bilty?.to_city_id || getCityIdByCode(station?.station, cities)}
          biltyWeight={bilty?.wt || station?.weight || 0}
          biltyPackages={bilty?.no_of_pkg || station?.no_of_packets || 0}
          biltyTransportGst={bilty?.transport_gst || null}
          paymentMode={paymentMode || ''}
          deliveryType={deliveryType}
          kaatData={kaatData || null}
          preloadedHubRates={preloadedHubRates}
          userNamesMap={userNamesMap}
          onKaatUpdate={onKaatUpdate}
          onKaatDelete={onKaatDelete}
        />
      </td>

      {/* PF */}
      <td className="px-1 py-1.5 text-right whitespace-nowrap">
        {kaatData?.pf != null ? (
          <span className={`font-bold text-[10px] px-1 py-0.5 rounded border inline-block ${
            parseFloat(kaatData.pf) > 0 ? 'text-green-700 bg-green-50 border-green-100' :
            parseFloat(kaatData.pf) < 0 ? 'text-red-700 bg-red-50 border-red-100' :
            'text-gray-600 bg-gray-50 border-gray-100'
          }`}>
            ₹{parseFloat(kaatData.pf).toFixed(0)}
          </span>
        ) : <span className="text-gray-200 text-[10px]">-</span>}
      </td>

      {/* Act.Rate */}
      <td className="px-1 py-1.5 text-right whitespace-nowrap">
        {kaatData?.actual_kaat_rate ? (
          <span className="font-semibold text-indigo-700 text-[10px]">₹{parseFloat(kaatData.actual_kaat_rate).toFixed(2)}</span>
        ) : <span className="text-gray-200 text-[10px]">-</span>}
      </td>

      {/* Profit */}
      <td className="px-1 py-1.5 text-right whitespace-nowrap">
        {(kaatData || totalAmount > 0 || ddChrg > 0) ? (
          <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded border inline-block ${
            profit > 0 ? 'text-green-700 bg-green-50 border-green-100' :
            profit < 0 ? 'text-red-700 bg-red-50 border-red-100' :
            'text-gray-600 bg-gray-50 border-gray-100'
          }`}>
            ₹{profit.toFixed(0)}
          </span>
        ) : <span className="text-gray-200 text-[10px]">-</span>}
      </td>
    </tr>
  );
}

export default memo(ChallanTableRow, (prev, next) => {
  return (
    prev.transit === next.transit &&
    prev.index === next.index &&
    prev.isSelected === next.isSelected &&
    prev.isAlreadySaved === next.isAlreadySaved &&
    prev.editMode === next.editMode &&
    prev.allKaatData[prev.transit.gr_no] === next.allKaatData[next.transit.gr_no] &&
    prev.preloadedHubRates === next.preloadedHubRates &&
    prev.userNamesMap === next.userNamesMap &&
    prev.transportLookup === next.transportLookup
  );
});
