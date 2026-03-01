import React from 'react';
import {
  CheckCircle, Edit3, Square, CheckSquare, Loader2,
  Image, ImageOff, Plus, Truck,
} from 'lucide-react';
import TransitCircles from './TransitCircles';
import { getStatus, stClr, payBadge, kTotal } from './HubHelpers';

const BiltyMobileCard = React.memo(function BiltyMobileCard({
  b, isSelected, isKanpur, kanpurFilter, kd, cityTransports,
  selectedTransportId, isSavingTransport, selectedTransport,
  onToggleSelect, onTransportChange, onOpenKaat, onOpenAddTransport,
  onPreviewImage, updatingTransit, onBranch, onOut, onDelivered, userName,
}) {
  const st = getStatus(b);
  const kt = kTotal(kd);
  const isMNL = b.source !== 'bilty';
  const pohonchVal = kd?.pohonch_no || kd?.bilty_number || '';

  return (
    <div className={`p-3 ${isSelected ? 'bg-indigo-50/60' : ''} ${isKanpur && !kanpurFilter ? 'border-l-3 border-l-orange-400 bg-orange-50/30' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <button onClick={onToggleSelect} className="text-indigo-600">
            {isSelected ? <CheckSquare className="h-4 w-4"/> : <Square className="h-4 w-4 text-gray-300"/>}
          </button>
          <span className="w-5 h-5 bg-indigo-100 rounded text-indigo-700 text-[10px] font-bold flex items-center justify-center">{b.idx}</span>
          <span className="font-bold text-indigo-700 text-sm">{b.gr_no}</span>
          <button
            onClick={() => b.bilty_image ? onPreviewImage({ url: b.bilty_image, gr: b.gr_no, type: isMNL ? 'MNL' : 'REG' }) : null}
            className={`w-5 h-5 rounded-full flex items-center justify-center ${b.bilty_image ? 'bg-green-100 text-green-600 ring-1 ring-green-300' : 'bg-red-100 text-red-400 ring-1 ring-red-200'}`}
            title={b.bilty_image ? 'View bilty image' : 'No image'}
          >
            {b.bilty_image ? <Image className="h-2.5 w-2.5"/> : <ImageOff className="h-2.5 w-2.5"/>}
          </button>
          {isKanpur && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700">KNP</span>}
          <span className="text-[9px] text-gray-500 font-medium">{isMNL ? 'MNL' : 'REG'}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stClr[st.c]}`}>{st.l}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
        <div><span className="text-gray-400 text-[10px]">Dest:</span> <span className="font-bold text-black text-[11px]">{b.destination}</span></div>
        <div><span className="text-gray-400 text-[10px]">Pay:</span> <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${payBadge(b.payment)}`}>{b.payment}</span></div>
        <div className="truncate"><span className="text-gray-400 text-[10px]">S:</span> <span className="text-[10px] text-gray-700">{b.consignor}</span></div>
        <div className="truncate"><span className="text-gray-400 text-[10px]">R:</span> <span className="text-[10px] text-gray-700">{b.consignee}</span></div>
        <div><span className="text-gray-400 text-[10px]">Pkts:</span> <b className="text-black text-[11px]">{b.packets}</b> <span className="text-gray-300">|</span> <span className="text-gray-400 text-[10px]">Wt:</span> <b className="text-black text-[11px]">{parseFloat(b.weight || 0).toFixed(1)}</b></div>
        <div><span className="text-gray-400 text-[10px]">Amt:</span> <b className="text-black text-[11px]">₹{parseFloat(b.amount || 0).toLocaleString('en-IN')}</b></div>
        {pohonchVal && <div><span className="text-gray-400 text-[10px]">{kd?.pohonch_no ? 'Pohonch:' : 'Bilty#:'}</span> <b className="text-black text-[11px]">{pohonchVal}</b></div>}
        {kt > 0 && <div><span className="text-gray-400 text-[10px]">Kaat:</span> <b className="text-emerald-700 text-[11px]">₹{kt.toFixed(0)}</b></div>}
      </div>
      {/* Transport Selection - Mobile */}
      {cityTransports.length > 0 ? (
        <div className="mb-2">
          <div className="relative">
            <select
              value={selectedTransportId}
              onChange={(e) => onTransportChange(b.gr_no, e.target.value || null)}
              disabled={isSavingTransport}
              className={`w-full text-[11px] border rounded-lg px-2 py-1.5 outline-none font-semibold ${
                selectedTransportId
                  ? 'border-teal-300 bg-teal-50 text-teal-800'
                  : 'border-gray-200 bg-white text-gray-700'
              } disabled:opacity-50`}
            >
              <option value="">Select Transport for {b.destination}</option>
              {cityTransports.map(t => (
                <option key={t.id} value={t.id}>{t.transport_name}</option>
              ))}
            </select>
            {isSavingTransport && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-indigo-500"/>}
          </div>
        </div>
      ) : b.to_city_id && (
        <button onClick={() => onOpenAddTransport(b.to_city_id)}
          className="mb-2 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors">
          <Plus className="h-3 w-3"/>Add Transport for {b.destination}
        </button>
      )}
      <div className="flex flex-wrap items-center gap-1.5 mb-1">
        <button onClick={() => onOpenKaat(b.gr_no)} className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${kt > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}>
          {kt > 0 ? <CheckCircle className="h-3 w-3 inline mr-0.5"/> : <Edit3 className="h-3 w-3 inline mr-0.5"/>}{kt > 0 ? `₹${kt.toFixed(0)}` : 'Kaat'}
        </button>
        {selectedTransport && <span className="text-[9px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-semibold"><Truck className="h-2.5 w-2.5 inline mr-0.5"/>{selectedTransport.transport_name}</span>}
      </div>
      <TransitCircles b={b} updatingTransit={updatingTransit}
        onBranch={onBranch} onOut={onOut} onDelivered={onDelivered} userName={userName}
      />
    </div>
  );
});

export default BiltyMobileCard;
