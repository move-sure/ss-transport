'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { X, Loader2, Truck, CheckSquare, Square, Printer, FileText, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { generatePohonchPDF } from '../transit-finance/pohonch-print/pohonch-pdf-generator';

const SKIP_WORDS = ['AND', '&', 'THE', 'OF', 'PVT', 'LTD', 'PRIVATE', 'LIMITED', 'CO', 'COMPANY', 'TRANSPORT', 'TRANSPORTS', 'LOGISTICS'];
const EXCLUDED_GSTINS = ['09COVPS5556J1ZT'];

function generatePrefix(transportName, gstNumber) {
  const words = (transportName || 'TRANSPORT').trim().split(/\s+/).filter(w => w.length > 0);
  let initials = words.filter(w => !SKIP_WORDS.includes(w.toUpperCase())).map(w => w[0].toUpperCase()).join('').substring(0, 3);
  if (!initials) initials = (transportName || 'TRN').substring(0, 3).toUpperCase();
  const gstSuffix = gstNumber ? gstNumber.slice(-4).toUpperCase() : '';
  return initials + gstSuffix;
}

export default function BulkCrossChallanModal({
  isOpen, onClose, enrichedBilties, kaatData, transportsByCity, transports,
  challan, user, buildCcPdfBilties, fetchCrossChallanData,
}) {
  const [selectedTransportIds, setSelectedTransportIds] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [expandedTransport, setExpandedTransport] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewTransportName, setPreviewTransportName] = useState('');

  // Group bilties by assigned transport
  const transportGroups = useMemo(() => {
    const groups = {};
    enrichedBilties.forEach(b => {
      const kd = kaatData[b.gr_no];
      if (!kd?.transport_id) return;
      const tid = String(kd.transport_id);
      // Resolve transport object
      const cityList = b.to_city_id ? (transportsByCity[b.to_city_id] || []) : [];
      const match = cityList.find(tr => String(tr.id) === tid);
      const fromAll = !match ? transports.find(tr => String(tr.id) === tid) : null;
      const transport = match || fromAll;
      // Group by GST number (unique transport identity), fallback to name
      const gst = transport?.gst_number || '';
      if (EXCLUDED_GSTINS.includes(gst.toUpperCase())) return;
      const groupKey = gst || transport?.transport_name || tid;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          transportId: groupKey,
          transport,
          transportName: transport?.transport_name || `Transport #${tid}`,
          gstNumber: gst,
          bilties: [],
          totalPkg: 0, totalWt: 0, totalAmt: 0, totalKaat: 0,
        };
      }
      const g = groups[groupKey];
      // Keep the first resolved transport object (but update if we find one with more data)
      if (transport && (!g.transport || (!g.transport.gst_number && transport.gst_number))) g.transport = transport;
      g.bilties.push(b);
      g.totalPkg += parseFloat(b.packets) || 0;
      g.totalWt += parseFloat(b.weight) || 0;
      const payMode = (b.payment || '').toUpperCase();
      const isPaid = payMode.includes('PAID') && !payMode.includes('TO');
      g.totalAmt += isPaid ? 0 : (parseFloat(b.amount) || 0);
      g.totalKaat += parseFloat(kd.kaat) || 0;
    });
    return Object.values(groups).sort((a, b) => b.bilties.length - a.bilties.length);
  }, [enrichedBilties, kaatData, transportsByCity, transports]);

  const toggleTransport = useCallback((tid) => {
    setSelectedTransportIds(prev => {
      const next = new Set(prev);
      if (next.has(tid)) next.delete(tid); else next.add(tid);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedTransportIds.size === transportGroups.length)
      setSelectedTransportIds(new Set());
    else
      setSelectedTransportIds(new Set(transportGroups.map(g => g.transportId)));
  }, [selectedTransportIds.size, transportGroups]);

  const handleBulkCreate = useCallback(async () => {
    if (!selectedTransportIds.size || !user?.id) return;
    setProcessing(true);
    setResults([]);
    const newResults = [];

    try {
      // Fetch all existing pohonch for duplicate check
      const { data: existing } = await supabase.from('pohonch').select('pohonch_number, bilty_metadata').eq('is_active', true);
      const grToPohonch = {};
      (existing || []).forEach(p => {
        (Array.isArray(p.bilty_metadata) ? p.bilty_metadata : []).forEach(b => {
          if (b.gr_no) grToPohonch[b.gr_no] = p.pohonch_number;
        });
      });

      const selectedGroups = transportGroups.filter(g => selectedTransportIds.has(g.transportId));

      for (const group of selectedGroups) {
        try {
          // Check duplicates for this group
          const grNos = group.bilties.map(b => b.gr_no).filter(Boolean);
          const dupes = grNos.filter(gr => grToPohonch[gr]);
          if (dupes.length > 0) {
            newResults.push({
              transportId: group.transportId,
              transportName: group.transportName,
              status: 'skipped',
              message: `${dupes.length} GR(s) already in pohonch: ${dupes.slice(0, 3).map(gr => `${gr} (${grToPohonch[gr]})`).join(', ')}${dupes.length > 3 ? '...' : ''}`,
            });
            continue;
          }

          // Generate prefix + number
          const tName = group.transportName;
          const gstNum = group.gstNumber;
          let prefix = generatePrefix(tName, gstNum);

          // Smart prefix detection
          const gstQuery = gstNum
            ? supabase.from('pohonch').select('pohonch_number').eq('transport_gstin', gstNum).eq('is_active', true).order('created_at', { ascending: false }).limit(5)
            : supabase.from('pohonch').select('pohonch_number').eq('transport_name', tName).eq('is_active', true).order('created_at', { ascending: false }).limit(5);
          const { data: prevPohonch } = await gstQuery;
          if (prevPohonch?.length > 0) {
            const m = prevPohonch[0].pohonch_number.match(/^([A-Za-z]+)(\d+)$/);
            if (m) prefix = m[1];
          }

          // Get next number
          let nextNum = 1;
          const { data: lastData } = await supabase.from('pohonch').select('pohonch_number')
            .ilike('pohonch_number', `${prefix}%`).order('pohonch_number', { ascending: false }).limit(1);
          if (lastData?.length > 0) {
            const m = lastData[0].pohonch_number.match(/^([A-Za-z]+)(\d+)$/);
            if (m) nextNum = parseInt(m[2], 10) + 1;
          }

          const pohonchNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

          // Race condition check
          const { data: dupCheck } = await supabase.from('pohonch').select('id').eq('pohonch_number', pohonchNumber).eq('is_active', true).limit(1);
          if (dupCheck?.length > 0) {
            newResults.push({ transportId: group.transportId, transportName: group.transportName, status: 'error', message: `Pohonch ${pohonchNumber} already exists` });
            continue;
          }

          // Build bilty metadata using buildCcPdfBilties
          const pdfBilties = buildCcPdfBilties(group.bilties);
          const challanNos = [...new Set(pdfBilties.map(b => b.challan_no).filter(Boolean))];
          const biltyMeta = pdfBilties.map(b => ({
            gr_no: b.gr_no, challan_no: b.challan_no, pohonch_bilty: b.pohonch_bilty || null,
            consignor: b.consignor, consignee: b.consignee, destination: b.destination,
            packages: b.packages, weight: b.weight, amount: b.amount,
            kaat: b.kaat, kaat_rate: b.kaat_rate || 0, dd: b.dd, pf: b.pf,
            payment_mode: b.payment_mode, is_paid: b.is_paid,
            date: b.date || null, e_way_bill: b.e_way_bill || null,
          }));

          let tAmt = 0, tKaat = 0, tPF = 0, tDD = 0, tPkg = 0, tWt = 0;
          pdfBilties.forEach(b => {
            tAmt += b.amount || 0; tKaat += b.kaat || 0; tPF += b.pf || 0;
            tDD += b.dd || 0; tPkg += b.packages || 0; tWt += b.weight || 0;
          });

          const { error } = await supabase.from('pohonch').insert({
            pohonch_number: pohonchNumber,
            transport_name: tName,
            transport_gstin: gstNum || null,
            admin_transport_id: group.transport?.id || null,
            challan_metadata: challanNos,
            bilty_metadata: biltyMeta,
            total_bilties: pdfBilties.length,
            total_amount: tAmt, total_kaat: tKaat, total_pf: tPF, total_dd: tDD,
            total_packages: tPkg, total_weight: tWt,
            created_by: user.id,
          });

          if (error) throw error;

          // Mark these GRs as mapped so next group in loop knows
          grNos.forEach(gr => { grToPohonch[gr] = pohonchNumber; });

          newResults.push({
            transportId: group.transportId,
            transportName: group.transportName,
            status: 'success',
            pohonchNumber,
            biltyCount: pdfBilties.length,
            pdfBilties,
            transport: group.transport,
          });
        } catch (err) {
          newResults.push({
            transportId: group.transportId,
            transportName: group.transportName,
            status: 'error',
            message: err?.message || 'Unknown error',
          });
        }
      }

      setResults(newResults);

      // Refresh cross challan data
      const allGrNos = enrichedBilties.map(b => b.gr_no).filter(Boolean);
      if (allGrNos.length) fetchCrossChallanData(allGrNos);

    } catch (err) {
      alert('Bulk cross challan failed: ' + (err?.message || err));
    } finally {
      setProcessing(false);
    }
  }, [selectedTransportIds, user?.id, transportGroups, buildCcPdfBilties, enrichedBilties, fetchCrossChallanData]);

  const handlePreviewPdf = useCallback((result) => {
    if (!result.pdfBilties || !result.transport) return;
    const url = generatePohonchPDF(result.pdfBilties, result.transport, true, result.pohonchNumber);
    if (url) {
      setPreviewUrl(url);
      setPreviewTransportName(`${result.transportName} — ${result.pohonchNumber}`);
    }
  }, []);

  const handleDownloadPdf = useCallback((result) => {
    if (!result.pdfBilties || !result.transport) return;
    generatePohonchPDF(result.pdfBilties, result.transport, false, result.pohonchNumber);
  }, []);

  const closePreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewTransportName('');
  }, [previewUrl]);

  const successCount = results.filter(r => r.status === 'success').length;
  const hasResults = results.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-100 rounded-xl"><Truck className="h-4 w-4 text-violet-600"/></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Bulk Cross Challan — Challan #{challan?.challan_no}</h3>
              <p className="text-[10px] text-gray-500">
                {transportGroups.length} transports · {enrichedBilties.filter(b => kaatData[b.gr_no]?.transport_id).length} assigned bilties
                {hasResults && <span className="ml-2 text-green-600 font-semibold">{successCount}/{results.length} saved</span>}
              </p>
            </div>
          </div>
          <button onClick={() => { closePreview(); onClose(); setResults([]); setSelectedTransportIds(new Set()); }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500"/></button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {transportGroups.length === 0 ? (
            <div className="text-center py-10">
              <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2"/>
              <p className="text-sm text-gray-500">No transports assigned in this challan.</p>
              <p className="text-[10px] text-gray-400 mt-1">Assign transports to bilties first using the Kaat modal.</p>
            </div>
          ) : (
            <>
              {/* SELECT ALL */}
              {!hasResults && (
                <div className="flex items-center justify-between">
                  <button onClick={selectAll} className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900">
                    {selectedTransportIds.size === transportGroups.length
                      ? <CheckSquare className="h-3.5 w-3.5"/>
                      : <Square className="h-3.5 w-3.5"/>}
                    Select All ({transportGroups.length})
                  </button>
                  <span className="text-[10px] text-gray-400">{selectedTransportIds.size} selected</span>
                </div>
              )}

              {/* TRANSPORT CARDS */}
              {transportGroups.map(group => {
                const isSelected = selectedTransportIds.has(group.transportId);
                const result = results.find(r => r.transportId === group.transportId);
                const isExpanded = expandedTransport === group.transportId;

                return (
                  <div key={group.transportId}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      result?.status === 'success' ? 'border-green-200 bg-green-50/50' :
                      result?.status === 'error' ? 'border-red-200 bg-red-50/50' :
                      result?.status === 'skipped' ? 'border-amber-200 bg-amber-50/50' :
                      isSelected ? 'border-violet-300 bg-violet-50/30 shadow-sm' : 'border-gray-200'
                    }`}>
                    <div className="px-4 py-3 flex items-center gap-3">
                      {/* Checkbox */}
                      {!hasResults && (
                        <button onClick={() => toggleTransport(group.transportId)} className="flex-shrink-0">
                          {isSelected
                            ? <CheckSquare className="h-4 w-4 text-violet-600"/>
                            : <Square className="h-4 w-4 text-gray-400"/>}
                        </button>
                      )}

                      {/* Result icon */}
                      {result?.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0"/>}
                      {result?.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0"/>}
                      {result?.status === 'skipped' && <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0"/>}

                      {/* Transport info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-900 truncate">{group.transportName}</span>
                          {group.gstNumber && <span className="text-[9px] text-gray-400 font-mono">{group.gstNumber}</span>}
                          {result?.pohonchNumber && (
                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">{result.pohonchNumber}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
                          <span className="font-semibold text-gray-700">{group.bilties.length} GR</span>
                          <span>{group.totalPkg} Pkts</span>
                          <span>{group.totalWt.toFixed(1)} kg</span>
                          <span className="font-semibold text-gray-700">₹{group.totalAmt.toLocaleString('en-IN')}</span>
                          <span className="text-orange-600">Kaat: ₹{group.totalKaat.toLocaleString('en-IN')}</span>
                        </div>
                        {result?.status === 'error' && <p className="text-[10px] text-red-600 mt-1">{result.message}</p>}
                        {result?.status === 'skipped' && <p className="text-[10px] text-amber-600 mt-1">{result.message}</p>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {result?.status === 'success' && (
                          <>
                            <button onClick={() => handlePreviewPdf(result)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 border border-violet-200 transition-colors">
                              <Printer className="h-3 w-3 inline mr-0.5"/>Preview
                            </button>
                            <button onClick={() => handleDownloadPdf(result)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 border border-teal-200 transition-colors">
                              <FileText className="h-3 w-3 inline mr-0.5"/>Download
                            </button>
                          </>
                        )}
                        <button onClick={() => setExpandedTransport(isExpanded ? null : group.transportId)}
                          className="p-1 rounded-lg hover:bg-gray-100">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400"/> : <ChevronDown className="h-3.5 w-3.5 text-gray-400"/>}
                        </button>
                      </div>
                    </div>

                    {/* Expanded GR list */}
                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-gray-100 pt-2">
                        <div className="max-h-40 overflow-y-auto">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="text-gray-500 border-b border-gray-100">
                                <th className="text-left py-1 pr-2 font-semibold">GR No</th>
                                <th className="text-left py-1 pr-2 font-semibold">Consignor</th>
                                <th className="text-left py-1 pr-2 font-semibold">Consignee</th>
                                <th className="text-left py-1 pr-2 font-semibold">Dest</th>
                                <th className="text-right py-1 pr-2 font-semibold">Pkts</th>
                                <th className="text-right py-1 pr-2 font-semibold">Wt</th>
                                <th className="text-right py-1 font-semibold">Amt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.bilties.map(b => (
                                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                  <td className="py-1 pr-2 font-bold text-gray-800">{b.gr_no}</td>
                                  <td className="py-1 pr-2 text-gray-600 truncate max-w-[100px]">{b.consignor}</td>
                                  <td className="py-1 pr-2 text-gray-600 truncate max-w-[100px]">{b.consignee}</td>
                                  <td className="py-1 pr-2 text-gray-600">{b.destination}</td>
                                  <td className="py-1 pr-2 text-right text-gray-700">{b.packets}</td>
                                  <td className="py-1 pr-2 text-right text-gray-700">{parseFloat(b.weight) || 0}</td>
                                  <td className="py-1 text-right font-semibold text-gray-800">₹{(parseFloat(b.amount) || 0).toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-[10px] text-gray-500">
            {hasResults ? (
              <span className="font-semibold">
                <span className="text-green-600">{successCount} saved</span>
                {results.filter(r => r.status === 'error').length > 0 && <span className="text-red-500 ml-2">{results.filter(r => r.status === 'error').length} failed</span>}
                {results.filter(r => r.status === 'skipped').length > 0 && <span className="text-amber-500 ml-2">{results.filter(r => r.status === 'skipped').length} skipped</span>}
              </span>
            ) : (
              `${selectedTransportIds.size} of ${transportGroups.length} transports selected`
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { closePreview(); onClose(); setResults([]); setSelectedTransportIds(new Set()); }}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              {hasResults ? 'Close' : 'Cancel'}
            </button>
            {!hasResults && (
              <button onClick={handleBulkCreate} disabled={processing || !selectedTransportIds.size}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-all">
                {processing ? <><Loader2 className="h-3 w-3 animate-spin"/>Creating...</> : <><Truck className="h-3 w-3"/>Create {selectedTransportIds.size} Cross Challan{selectedTransportIds.size > 1 ? 's' : ''}</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PDF PREVIEW OVERLAY */}
      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-teal-50 to-emerald-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 rounded-xl"><Printer className="h-4 w-4 text-teal-600"/></div>
                <h3 className="text-sm font-bold text-gray-900">{previewTransportName}</h3>
              </div>
              <button onClick={closePreview} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500"/></button>
            </div>
            <div className="flex-1 overflow-hidden p-4 bg-gray-100">
              <iframe src={previewUrl} className="w-full h-full rounded-lg border border-gray-200" title="Cross Challan PDF Preview"/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
