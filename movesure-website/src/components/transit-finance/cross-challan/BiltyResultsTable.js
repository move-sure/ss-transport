'use client';
import { ChevronDown, ChevronRight, Hash, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';

export default function BiltyResultsTable({
  sbGroupedByChallan, sbBiltyDetails, selectedGrNos,
  sbExpandedChallans, sbCitiesMap,
  resolveDestination,
  toggleSbChallan, selectChallanBilties, toggleSelectBilty,
}) {
  return (
    <>
      {sbGroupedByChallan.map(([challanNo, kaatItems]) => {
        const isExpanded = sbExpandedChallans[challanNo] !== false;
        const challanGrNos = kaatItems.map(k => k.gr_no).filter(Boolean);
        const allChallanSelected = challanGrNos.length > 0 && challanGrNos.every(gr => selectedGrNos.has(gr));
        const someChallanSelected = challanGrNos.some(gr => selectedGrNos.has(gr));

        let cPkg = 0, cWt = 0, cAmt = 0, cKaat = 0, cDD = 0, cPF = 0;
        kaatItems.forEach(k => {
          const detail = sbBiltyDetails[k.gr_no];
          const bilty = detail?.bilty;
          const station = detail?.station;
          cPkg += parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
          cWt += parseFloat(bilty?.wt || station?.weight || 0);
          const payMode = (bilty?.payment_mode || station?.payment_status || '').toUpperCase();
          const isPaid = payMode.includes('PAID');
          cAmt += isPaid ? 0 : parseFloat(bilty?.total || station?.amount || 0);
          cKaat += parseFloat(k.kaat) || 0;
          cDD += parseFloat(k.dd_chrg) || 0;
          cPF += parseFloat(k.pf) || 0;
        });

        return (
          <div key={challanNo} className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Challan Header */}
            <div className="flex items-center bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
              <button
                onClick={(e) => { e.stopPropagation(); selectChallanBilties(challanNo); }}
                className="px-3 py-3 hover:bg-white/10 transition-colors"
                title={allChallanSelected ? 'Deselect all in challan' : 'Select all in challan'}
              >
                {allChallanSelected ? (
                  <CheckSquare className="w-4 h-4" />
                ) : someChallanSelected ? (
                  <div className="w-4 h-4 border-2 border-white rounded-sm bg-white/30" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => toggleSbChallan(challanNo)}
                className="flex-1 flex items-center justify-between px-2 py-3 hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Hash className="w-4 h-4" />
                  <span className="font-bold">Challan {challanNo}</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">{kaatItems.length} bilties</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span>Pkg: {Math.round(cPkg)}</span>
                  <span>Wt: {cWt.toFixed(1)}</span>
                  <span>Amt: &#8377;{cAmt.toFixed(0)}</span>
                  <span>Kaat: &#8377;{cKaat.toFixed(0)}</span>
                  {cDD > 0 && <span className="text-red-200">DD: -&#8377;{cDD.toFixed(0)}</span>}
                  <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold">PF: &#8377;{cPF.toFixed(0)}</span>
                </div>
              </button>
            </div>

            {/* Bilties Table */}
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 uppercase w-8"></th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">GR No.</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">EWB</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">P/B No.</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">Consignor</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">Consignee</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">Dest</th>
                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 uppercase">Pay</th>
                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 uppercase">Pkg</th>
                      <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">Wt</th>
                      <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">Amt</th>
                      <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">DD</th>
                      <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">Kaat</th>
                      <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">Rate</th>
                      <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">PF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kaatItems.map((k, idx) => {
                      const detail = sbBiltyDetails[k.gr_no] || {};
                      const bilty = detail.bilty;
                      const station = detail.station;
                      const weight = parseFloat(bilty?.wt || station?.weight || 0);
                      const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
                      const kaatAmt = parseFloat(k.kaat) || 0;
                      const pfAmt = parseFloat(k.pf) || 0;
                      const actualKaatRate = parseFloat(k.actual_kaat_rate) || 0;
                      const ddChrg = parseFloat(k.dd_chrg) || 0;
                      const payMode = (bilty?.payment_mode || station?.payment_status || '').toUpperCase();
                      const isPaid = payMode.includes('PAID');
                      const amt = isPaid ? 0 : parseFloat(bilty?.total || station?.amount || 0);
                      const payDisplay = bilty?.payment_mode?.toUpperCase() || station?.payment_status?.toUpperCase() || '-';
                      const ddSuffix = (bilty?.delivery_type || station?.delivery_type || '').toLowerCase().includes('door') ? '/DD' : '';
                      const dateStr = bilty?.bilty_date ? format(new Date(bilty.bilty_date), 'dd/MM/yy') : station?.created_at ? format(new Date(station.created_at), 'dd/MM/yy') : '-';
                      const destName = resolveDestination(k, bilty, station, sbCitiesMap);
                      const pohonchBilty = k.pohonch_no && k.bilty_number ? `${k.pohonch_no}/${k.bilty_number}` : k.pohonch_no || k.bilty_number || '-';
                      const isSelected = selectedGrNos.has(k.gr_no);
                      const ewb = bilty?.e_way_bill || station?.e_way_bill || '';

                      return (
                        <tr
                          key={k.gr_no || idx}
                          onClick={() => toggleSelectBilty(k.gr_no)}
                          className={`border-b border-gray-100 cursor-pointer transition-colors ${
                            isSelected ? 'bg-teal-50 hover:bg-teal-100' : isPaid ? 'bg-yellow-50/50 hover:bg-yellow-50' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/30 hover:bg-gray-100'
                          }`}
                        >
                          <td className="px-2 py-2 text-center">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-teal-600 mx-auto" /> : <Square className="w-4 h-4 text-gray-300 mx-auto" />}
                          </td>
                          <td className="px-2 py-2 text-gray-500 font-mono text-xs">{idx + 1}</td>
                          <td className="px-2 py-2 font-mono font-semibold text-gray-800">
                            {k.gr_no || '-'}
                            {ewb && <span className="text-green-600 font-bold ml-0.5 text-[10px]">(E)</span>}
                          </td>
                          <td className="px-2 py-2 text-[10px] font-mono text-gray-500 max-w-[80px] truncate" title={ewb || '-'}>{ewb || '-'}</td>
                          <td className="px-2 py-2 text-gray-700 text-xs">{pohonchBilty}</td>
                          <td className="px-2 py-2 text-gray-600 text-xs">{dateStr}</td>
                          <td className="px-2 py-2 text-gray-700 truncate max-w-[120px]" title={bilty?.consignor_name || station?.consignor || '-'}>{(bilty?.consignor_name || station?.consignor || '-').substring(0, 15)}</td>
                          <td className="px-2 py-2 text-gray-700 truncate max-w-[120px]" title={bilty?.consignee_name || station?.consignee || '-'}>{(bilty?.consignee_name || station?.consignee || '-').substring(0, 15)}</td>
                          <td className="px-2 py-2 text-gray-600 text-xs">{destName.substring(0, 12)}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isPaid ? 'bg-yellow-100 text-yellow-700' : payMode.includes('TO PAY') || payMode.includes('TO-PAY') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                              {payDisplay}{ddSuffix}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center font-medium text-gray-900">{packages}</td>
                          <td className="px-2 py-2 text-right font-medium text-gray-900">{weight.toFixed(1)}</td>
                          <td className="px-2 py-2 text-right font-medium text-gray-900">{isPaid ? <span className="text-yellow-600 text-xs">PAID</span> : `₹${amt.toFixed(0)}`}</td>
                          <td className="px-2 py-2 text-right">{ddChrg > 0 ? <span className="text-red-600 font-medium">-₹{ddChrg.toFixed(0)}</span> : '-'}</td>
                          <td className="px-2 py-2 text-right font-medium text-emerald-700">₹{kaatAmt.toFixed(0)}</td>
                          <td className="px-2 py-2 text-right text-xs text-gray-500">{actualKaatRate > 0 ? `₹${actualKaatRate}` : '-'}</td>
                          <td className="px-2 py-2 text-right font-bold text-teal-700">₹{pfAmt.toFixed(0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
