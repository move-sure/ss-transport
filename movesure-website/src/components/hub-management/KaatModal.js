import React from 'react';
import {
  Edit3, Save, X, ArrowRight, Loader2, AlertCircle, Building2, Plus,
} from 'lucide-react';
import { KF } from './SmallComponents';
import { getHubRateForTransport } from './HubHelpers';

const KaatModal = React.memo(function KaatModal({
  editingKaat, setEditingKaat, kaatForm, setKaatForm,
  savingKaat, onSave, enrichedBilties, transportsByCity,
  hubRatesByTransport, onOpenAddTransport, onOpenAddHubRate, transports,
}) {
  if (!editingKaat) return null;

  const bi = enrichedBilties.find(b => b.gr_no === editingKaat);
  const cityTr = bi?.to_city_id ? (transportsByCity[bi.to_city_id] || []) : [];
  const selectedTrId = kaatForm.transport_id;
  const hubRate = selectedTrId && bi?.to_city_id ? getHubRateForTransport(hubRatesByTransport, selectedTrId, bi.to_city_id) : null;

  const formTotal = ['kaat', 'pf', 'dd_chrg', 'bilty_chrg', 'ewb_chrg', 'labour_chrg', 'other_chrg']
    .reduce((s, f) => s + (parseFloat(kaatForm[f]) || 0), 0);

  const handleTransportSelect = (tid) => {
    const hr = tid && bi?.to_city_id ? getHubRateForTransport(hubRatesByTransport, tid, bi.to_city_id) : null;
    setKaatForm(p => ({
      ...p,
      transport_id: tid,
      ...(hr ? {
        bilty_chrg: hr.bilty_chrg || p.bilty_chrg,
        ewb_chrg: hr.ewb_chrg || p.ewb_chrg,
        labour_chrg: hr.labour_chrg || p.labour_chrg,
        other_chrg: hr.other_chrg || p.other_chrg,
      } : {})
    }));
  };

  const applyHubRateCharges = () => {
    if (!hubRate || !bi) return;
    let computedKaat = 0;
    if (hubRate.pricing_mode === 'per_kg') {
      computedKaat = (parseFloat(hubRate.rate_per_kg) || 0) * (parseFloat(bi?.weight) || 0);
    } else if (hubRate.pricing_mode === 'per_pkg') {
      computedKaat = (parseFloat(hubRate.rate_per_pkg) || 0) * (bi?.packets || 0);
    }
    if (hubRate.min_charge && computedKaat < parseFloat(hubRate.min_charge)) {
      computedKaat = parseFloat(hubRate.min_charge);
    }
    setKaatForm(p => ({
      ...p,
      kaat: parseFloat(computedKaat.toFixed(2)),
      actual_kaat_rate: hubRate.pricing_mode === 'per_kg' ? (parseFloat(hubRate.rate_per_kg) || 0) : (parseFloat(hubRate.rate_per_pkg) || 0),
      bilty_chrg: parseFloat(hubRate.bilty_chrg) || 0,
      ewb_chrg: parseFloat(hubRate.ewb_chrg) || 0,
      labour_chrg: parseFloat(hubRate.labour_chrg) || 0,
      other_chrg: parseFloat(hubRate.other_chrg) || 0,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingKaat(null)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto ring-1 ring-gray-200/50" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
                <Edit3 className="h-5 w-5 text-white"/>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Kaat & Pohonch</h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[11px] font-bold">{editingKaat}</span>
                  {bi?.destination && (
                    <span className="text-[11px] text-gray-500 flex items-center gap-0.5"><ArrowRight className="h-3 w-3"/>{bi.destination}</span>
                  )}
                  {bi && <span className="text-[10px] text-gray-400">{bi.packets} pkts · {parseFloat(bi.weight || 0).toFixed(1)} kg</span>}
                </div>
              </div>
            </div>
            <button onClick={() => setEditingKaat(null)} className="p-2 rounded-xl hover:bg-white/80 transition-colors"><X className="h-4 w-4 text-gray-400 hover:text-gray-600"/></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Identification */}
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase mb-2">Identification</p>
            <div className="grid grid-cols-2 gap-3">
              <KF label="Pohonch No" value={kaatForm.pohonch_no} onChange={v => setKaatForm(p => ({...p, pohonch_no: v, bilty_number: v ? '' : kaatForm.bilty_number}))} type="text" big disabled={!!kaatForm.bilty_number}/>
              <KF label="Bilty Number" value={kaatForm.bilty_number} onChange={v => setKaatForm(p => ({...p, bilty_number: v, pohonch_no: v ? '' : kaatForm.pohonch_no}))} type="text" big disabled={!!kaatForm.pohonch_no}/>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Only one can be filled at a time.</p>
          </div>

          {/* Transport Selection */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-700 uppercase mb-2">Transport</p>
            {cityTr.length > 0 ? (
              <select
                value={selectedTrId || ''}
                onChange={e => handleTransportSelect(e.target.value || '')}
                className={`w-full text-sm border rounded-lg px-3 py-2.5 outline-none font-semibold ${
                  selectedTrId
                    ? 'border-teal-300 bg-teal-50 text-teal-800 focus:ring-2 focus:ring-teal-300'
                    : 'border-gray-200 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-300'
                }`}
              >
                <option value="">Select Transport for {bi?.destination || 'destination'}</option>
                {cityTr.map(t => (
                  <option key={t.id} value={t.id}>{t.transport_name}{t.mob_number ? ` (${t.mob_number})` : ''}</option>
                ))}
              </select>
            ) : bi?.to_city_id ? (
              <button type="button" onClick={() => onOpenAddTransport(bi.to_city_id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm font-semibold text-gray-500 hover:text-teal-600 hover:border-teal-300 hover:bg-teal-50 transition-all">
                <Plus className="h-4 w-4"/>Add Transport for {bi?.destination || 'this city'}
              </button>
            ) : (
              <p className="text-[11px] text-gray-400 italic py-2">No destination city available</p>
            )}
          </div>

          {/* Hub Rate Info Card */}
          {hubRate && (
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-sky-800 uppercase flex items-center gap-1">
                  <Building2 className="h-3 w-3"/>Hub Rate
                </p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                  {hubRate.pricing_mode === 'per_kg' ? 'Per KG' : hubRate.pricing_mode === 'per_pkg' ? 'Per PKG' : hubRate.pricing_mode}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white rounded p-1.5">
                  <p className="text-[9px] text-gray-400">Rate/KG</p>
                  <p className="text-xs font-bold text-sky-700">₹{parseFloat(hubRate.rate_per_kg || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white rounded p-1.5">
                  <p className="text-[9px] text-gray-400">Rate/PKG</p>
                  <p className="text-xs font-bold text-sky-700">₹{parseFloat(hubRate.rate_per_pkg || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white rounded p-1.5">
                  <p className="text-[9px] text-gray-400">Min Chrg</p>
                  <p className="text-xs font-bold text-sky-700">₹{parseFloat(hubRate.min_charge || 0).toFixed(0)}</p>
                </div>
                <div className="bg-white rounded p-1.5">
                  <p className="text-[9px] text-gray-400">Goods</p>
                  <p className="text-xs font-bold text-sky-700 truncate">{hubRate.goods_type || 'All'}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center mt-1.5">
                <div className="bg-white rounded p-1.5">
                  <p className="text-[9px] text-gray-400">Bilty</p>
                  <p className="text-[10px] font-bold text-gray-700">₹{parseFloat(hubRate.bilty_chrg || 0).toFixed(0)}</p>
                </div>
                <div className="bg-white rounded p-1.5">
                  <p className="text-[9px] text-gray-400">EWB</p>
                  <p className="text-[10px] font-bold text-gray-700">₹{parseFloat(hubRate.ewb_chrg || 0).toFixed(0)}</p>
                </div>
                <div className="bg-white rounded p-1.5">
                  <p className="text-[9px] text-gray-400">Labour</p>
                  <p className="text-[10px] font-bold text-gray-700">₹{parseFloat(hubRate.labour_chrg || 0).toFixed(0)}</p>
                </div>
                <div className="bg-white rounded p-1.5">
                  <p className="text-[9px] text-gray-400">Other</p>
                  <p className="text-[10px] font-bold text-gray-700">₹{parseFloat(hubRate.other_chrg || 0).toFixed(0)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={applyHubRateCharges}
                className="mt-2 w-full text-[10px] font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 border border-sky-300 rounded-lg py-1.5 transition-colors flex items-center justify-center gap-1"
              >
                <ArrowRight className="h-3 w-3"/>Apply Hub Rate Charges
              </button>
            </div>
          )}

          {/* No Hub Rate Warning */}
          {selectedTrId && !hubRate && bi?.to_city_id && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 rounded-lg"><AlertCircle className="h-3.5 w-3.5 text-amber-600"/></div>
                  <div>
                    <p className="text-[11px] font-bold text-amber-800">No Hub Rate Found</p>
                    <p className="text-[10px] text-amber-600">Add rate for this transport + destination</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAddHubRate(selectedTrId, bi.to_city_id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-lg shadow-sm transition-all"
                >
                  <Plus className="h-3 w-3"/>Add Hub Rate
                </button>
              </div>
            </div>
          )}

          {/* Charges */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-700 uppercase mb-2">Charges & Kaat</p>
            <div className="grid grid-cols-3 gap-2">
              <KF label="Kaat (₹)" value={kaatForm.kaat} onChange={v => setKaatForm(p => ({...p, kaat: v}))}/>
              <KF label="PF (₹)" value={kaatForm.pf} onChange={v => setKaatForm(p => ({...p, pf: v}))}/>
              <KF label="Actual Rate" value={kaatForm.actual_kaat_rate} onChange={v => setKaatForm(p => ({...p, actual_kaat_rate: v}))}/>
              <KF label="DD Chrg (₹)" value={kaatForm.dd_chrg} onChange={v => setKaatForm(p => ({...p, dd_chrg: v}))}/>
              <KF label="Bilty Chrg (₹)" value={kaatForm.bilty_chrg} onChange={v => setKaatForm(p => ({...p, bilty_chrg: v}))}/>
              <KF label="EWB Chrg (₹)" value={kaatForm.ewb_chrg} onChange={v => setKaatForm(p => ({...p, ewb_chrg: v}))}/>
              <KF label="Labour (₹)" value={kaatForm.labour_chrg} onChange={v => setKaatForm(p => ({...p, labour_chrg: v}))}/>
              <KF label="Other (₹)" value={kaatForm.other_chrg} onChange={v => setKaatForm(p => ({...p, other_chrg: v}))}/>
            </div>
          </div>

          {/* Total & Save */}
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-gray-500">Total Charges:</span>
              <span className="ml-1 font-bold text-indigo-700 text-base">₹{formTotal.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingKaat(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={onSave} disabled={savingKaat}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                {savingKaat ? <Loader2 className="h-3 w-3 animate-spin"/> : <Save className="h-3 w-3"/>} Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default KaatModal;
