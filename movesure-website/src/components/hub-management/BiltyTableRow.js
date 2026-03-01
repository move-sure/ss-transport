import React from 'react';
import {
  CheckCircle, Edit3, CircleDot, Square, CheckSquare, Loader2,
  Image, ImageOff, Plus,
} from 'lucide-react';
import TransitCircles from './TransitCircles';
import { getStatus, stClr, payBadge, kTotal } from './HubHelpers';

const BiltyTableRow = React.memo(function BiltyTableRow({
  b, isSelected, isKanpur, kanpurFilter, kd, cityTransports,
  selectedTransportId, isSavingTransport,
  onToggleSelect, onTransportChange, onOpenKaat, onOpenAddTransport,
  onPreviewImage, updatingTransit, onBranch, onOut, onDelivered, userName,
}) {
  const st = getStatus(b);
  const kt = kTotal(kd);
  const isMNL = b.source !== 'bilty';

  return (
    <tr className={`hover:bg-blue-50/40 ${isSelected ? 'bg-indigo-50/60' : ''} ${isKanpur && !kanpurFilter ? 'border-l-2 border-l-orange-400 bg-orange-50/30' : ''}`}>
      <td className="px-1.5 py-1.5 text-center">
        <button onClick={onToggleSelect} className="text-indigo-600 hover:text-indigo-800">
          {isSelected ? <CheckSquare className="h-3.5 w-3.5"/> : <Square className="h-3.5 w-3.5 text-gray-300"/>}
        </button>
      </td>
      <td className="px-1 py-1.5 text-gray-400 font-medium text-[10px]">{b.idx}</td>
      <td className="px-1 py-1.5 text-center">
        <button
          onClick={() => b.bilty_image ? onPreviewImage({ url: b.bilty_image, gr: b.gr_no, type: isMNL ? 'MNL' : 'REG' }) : null}
          title={b.bilty_image ? `View bilty image - ${b.gr_no}` : 'No bilty image'}
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${b.bilty_image ? 'bg-green-100 text-green-600 hover:bg-green-200 hover:scale-110 cursor-pointer ring-1 ring-green-300' : 'bg-red-100 text-red-400 cursor-default ring-1 ring-red-200'}`}
        >
          {b.bilty_image ? <Image className="h-2.5 w-2.5"/> : <ImageOff className="h-2.5 w-2.5"/>}
        </button>
      </td>
      <td className="px-1.5 py-1.5">
        <div className="font-bold text-indigo-700 text-[11px]">{b.gr_no}</div>
        <div className="text-[9px] text-gray-400">{isMNL ? 'MNL' : 'REG'}{isKanpur && <span className="ml-1 text-orange-600 font-bold">•KNP</span>}</div>
      </td>
      <td className="px-1.5 py-1.5">
        <div className="font-semibold text-black text-[11px] truncate max-w-[80px]" title={b.destination}>{b.destination}</div>
      </td>
      <td className="px-1.5 py-1.5">
        <div className="text-[10px] text-gray-800 truncate max-w-[120px]" title={b.consignor}><span className="text-gray-400">S:</span> {b.consignor}</div>
        <div className="text-[10px] text-gray-800 truncate max-w-[120px]" title={b.consignee}><span className="text-gray-400">R:</span> {b.consignee}</div>
      </td>
      <td className="px-1 py-1.5 text-center font-bold text-black text-[11px]">{b.packets}</td>
      <td className="px-1 py-1.5 text-center font-medium text-black text-[11px]">{parseFloat(b.weight || 0).toFixed(1)}</td>
      <td className="px-1.5 py-1.5 text-right font-bold text-black text-[11px]">₹{parseFloat(b.amount || 0).toLocaleString('en-IN')}</td>
      <td className="px-1 py-1.5 text-center">
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${payBadge(b.payment)}`}>{b.payment}</span>
      </td>
      <td className="px-1.5 py-1.5">
        {cityTransports.length > 0 ? (
          <div className="relative">
            <select
              value={selectedTransportId}
              onChange={(e) => onTransportChange(b.gr_no, e.target.value || null)}
              disabled={isSavingTransport}
              className={`w-full text-[10px] border rounded-md px-1.5 py-1 outline-none transition-colors font-semibold ${
                selectedTransportId
                  ? 'border-teal-300 bg-teal-50 text-teal-800 focus:ring-1 focus:ring-teal-300'
                  : 'border-gray-200 bg-white text-gray-700 focus:ring-1 focus:ring-indigo-300'
              } disabled:opacity-50 disabled:cursor-wait`}
            >
              <option value="">Select Transport</option>
              {cityTransports.map(t => (
                <option key={t.id} value={t.id}>{t.transport_name}</option>
              ))}
            </select>
            {isSavingTransport && <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-indigo-500"/>}
          </div>
        ) : b.to_city_id ? (
          <button onClick={() => onOpenAddTransport(b.to_city_id)}
            className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-1.5 py-0.5 rounded transition-colors"
            title="Add transport for this city">
            <Plus className="h-2.5 w-2.5"/>Add
          </button>
        ) : (
          <span className="text-[9px] text-gray-300 italic">No city</span>
        )}
      </td>
      <td className="px-1.5 py-1.5 text-center">
        {(kd?.pohonch_no || kd?.bilty_number) ? (
          <span className="font-bold text-black text-[10px]">
            {kd?.pohonch_no ? kd.pohonch_no : kd.bilty_number}
          </span>
        ) : (
          <span className="text-gray-300 text-[10px]">-</span>
        )}
        <div className="text-[8px] text-gray-400">
          {kd?.pohonch_no ? 'Pohonch' : kd?.bilty_number ? 'Bilty#' : ''}
        </div>
      </td>
      <td className="px-1 py-1.5 text-center">
        <button onClick={() => onOpenKaat(b.gr_no)}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
            kt > 0
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          }`}>
          {kt > 0 ? <CheckCircle className="h-2.5 w-2.5"/> : <Edit3 className="h-2.5 w-2.5"/>} {kt > 0 ? `₹${kt.toFixed(0)}` : 'Add'}
        </button>
      </td>
      <td className="px-1 py-1.5 text-center">
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${stClr[st.c]}`}>
          <CircleDot className="h-2 w-2"/>{st.l}
        </span>
      </td>
      <td className="px-1 py-1.5">
        <TransitCircles b={b} updatingTransit={updatingTransit}
          onBranch={onBranch} onOut={onOut} onDelivered={onDelivered} userName={userName}
        />
      </td>
    </tr>
  );
});

export default BiltyTableRow;
