'use client';
import { useState, useEffect } from 'react';
import supabase from '../../../app/utils/supabase';
import { Loader2, X, Trash2, Plus, Search, AlertCircle, CheckCircle, Edit3, Package, Info } from 'lucide-react';
import { format } from 'date-fns';

export default function EditPohonchModal({
  show, onClose,
  pohonchNo,
  user,
  token,
  sbCitiesMap,
  sbCityCodeMap,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [pohonch, setPohonch] = useState(null);
  const [editedBilties, setEditedBilties] = useState([]);
  const [originalBilties, setOriginalBilties] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Add bilty state
  const [grInput, setGrInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    if (show && pohonchNo) {
      fetchPohonch();
    }
    if (!show) {
      setPohonch(null);
      setEditedBilties([]);
      setOriginalBilties([]);
      setError(null);
      setSaveSuccess(false);
      setGrInput('');
      setSearchResult(null);
      setSearchError(null);
    }
  }, [show, pohonchNo]);

  const fetchPohonch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('pohonch')
        .select('*')
        .eq('pohonch_number', pohonchNo)
        .limit(1);
      if (err) throw err;
      if (!data?.length) throw new Error(`Pohonch ${pohonchNo} not found`);
      const row = data[0];
      setPohonch(row);
      const meta = Array.isArray(row.bilty_metadata) ? [...row.bilty_metadata] : [];
      setEditedBilties(meta);
      setOriginalBilties(meta);
    } catch (err) {
      setError(err.message || 'Failed to load pohonch');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (grNo) => {
    setEditedBilties(prev => prev.filter(b => b.gr_no !== grNo));
  };

  const handleSearchGr = async () => {
    const val = grInput.trim().toUpperCase();
    if (!val) return;
    if (editedBilties.some(b => b.gr_no === val)) {
      setSearchError('This GR is already in the pohonch');
      return;
    }
    setSearching(true);
    setSearchResult(null);
    setSearchError(null);
    try {
      const { data: kaatData, error: kaatErr } = await supabase
        .from('bilty_wise_kaat')
        .select('*')
        .eq('gr_no', val)
        .limit(1);
      if (kaatErr) throw kaatErr;
      if (!kaatData?.length) {
        setSearchError(`GR ${val} not found in kaat records`);
        return;
      }
      const kaat = kaatData[0];

      // Fetch bilty + station details in parallel
      const [biltyRes, stationRes] = await Promise.all([
        supabase.from('bilty').select('gr_no,bilty_date,consignor_name,consignee_name,no_of_pkg,wt,total,payment_mode,delivery_type,to_city_id,from_city_id,e_way_bill').eq('gr_no', val).eq('is_active', true).limit(1),
        supabase.from('station_bilty_summary').select('gr_no,created_at,consignor,consignee,no_of_packets,weight,amount,payment_status,delivery_type,station,e_way_bill').eq('gr_no', val).limit(1),
      ]);
      const bilty = biltyRes.data?.[0];
      const station = stationRes.data?.[0];

      const isPaid = (bilty?.payment_mode || station?.payment_status || '').toUpperCase().includes('PAID');

      // Resolve destination
      let destName = '-';
      if (kaat.destination_city_id && sbCitiesMap?.[kaat.destination_city_id]) destName = sbCitiesMap[kaat.destination_city_id];
      else if (bilty?.to_city_id && sbCitiesMap?.[bilty.to_city_id]) destName = sbCitiesMap[bilty.to_city_id];
      else if (station?.station && station.station !== '-') destName = station.station;

      const pohonchBilty = kaat.pohonch_no && kaat.bilty_number
        ? `${kaat.pohonch_no}/${kaat.bilty_number}`
        : kaat.pohonch_no || kaat.bilty_number || null;

      setSearchResult({
        gr_no: val,
        challan_no: kaat.challan_no || null,
        pohonch_bilty: pohonchBilty,
        pohonch_no: kaat.pohonch_no || null,
        consignor: bilty?.consignor_name || station?.consignor || '-',
        consignee: bilty?.consignee_name || station?.consignee || '-',
        destination: destName,
        packages: parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0),
        weight: parseFloat(bilty?.wt || station?.weight || 0),
        amount: isPaid ? 0 : parseFloat(bilty?.total || station?.amount || 0),
        kaat: parseFloat(kaat.kaat) || 0,
        kaat_rate: parseFloat(kaat.actual_kaat_rate) || 0,
        dd: parseFloat(kaat.dd_chrg) || 0,
        pf: parseFloat(kaat.pf) || 0,
        payment_mode: bilty?.payment_mode || station?.payment_status || '-',
        is_paid: isPaid,
        date: bilty?.bilty_date || station?.created_at || null,
        e_way_bill: bilty?.e_way_bill || station?.e_way_bill || '',
      });
    } catch (err) {
      setSearchError(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleAddBilty = () => {
    if (!searchResult) return;
    setEditedBilties(prev => [...prev, searchResult]);
    setSearchResult(null);
    setGrInput('');
    setSearchError(null);
  };

  const handleSave = async () => {
    if (!pohonch) return;
    if (!token) { setError('Authentication required — please log in again'); return; }
    if (editedBilties.length === 0) {
      if (!confirm('This will remove all bilties. The pohonch will be deactivated. Continue?')) return;
    }

    const originalGrNos = new Set(originalBilties.map(b => b.gr_no));
    const currentGrNos = new Set(editedBilties.map(b => b.gr_no));
    const remove_gr_nos = [...originalGrNos].filter(gr => !currentGrNos.has(gr));
    const add_gr_items = editedBilties
      .filter(b => !originalGrNos.has(b.gr_no))
      .map(b => ({ gr_no: b.gr_no, challan_no: b.challan_no || null, pohonch_bilty: b.pohonch_bilty || null }));

    if (!remove_gr_nos.length && !add_gr_items.length) {
      setError('No changes to save');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = { user_id: user?.id || null };
      if (remove_gr_nos.length) payload.remove_gr_nos = remove_gr_nos;
      if (add_gr_items.length) payload.add_gr_items = add_gr_items;

      const res = await fetch(`https://api.movesure.io/api/pohonch/${pohonch.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || `Request failed (${res.status})`);

      setSaveSuccess(true);
      onSaved?.();
      setTimeout(() => { setSaveSuccess(false); onClose(); }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  const origCount = pohonch?.total_bilties || 0;
  const diff = editedBilties.length - origCount;
  const totalKaat = editedBilties.reduce((s, b) => s + (b.kaat || 0), 0);
  const totalPF = editedBilties.reduce((s, b) => s + (b.pf || 0), 0);
  const totalWt = editedBilties.reduce((s, b) => s + (b.weight || 0), 0);
  const totalAmt = editedBilties.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Edit3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Pohonch</h2>
              {pohonch && (
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-indigo-600">{pohonch.pohonch_number}</span>
                  {' · '}{pohonch.transport_name}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : error && !pohonch ? (
          <div className="p-6 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        ) : pohonch ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3">
              {[
                ['Bilties', editedBilties.length],
                ['Total Kaat', `₹${totalKaat.toFixed(0)}`],
                ['Total PF', `₹${totalPF.toFixed(0)}`],
                ['Weight', `${totalWt.toFixed(1)} kg`],
              ].map(([label, val]) => (
                <div key={label} className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-indigo-500 font-medium">{label}</p>
                  <p className="text-lg font-bold text-indigo-900">{val}</p>
                </div>
              ))}
            </div>

            {/* Bilties list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-700">Bilties in Pohonch ({editedBilties.length})</h3>
                {diff !== 0 && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diff > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {diff > 0 ? '+' : ''}{diff} from original
                  </span>
                )}
              </div>

              {editedBilties.length === 0 ? (
                <div className="text-center py-10 text-gray-400 border border-dashed border-gray-300 rounded-xl">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No bilties remaining — pohonch will be deactivated on save</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">GR No.</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Challan</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Consignor</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Consignee</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Dest</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Wt</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Amt</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Kaat</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">PF</th>
                        <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editedBilties.map((b, i) => (
                        <tr key={b.gr_no} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-gray-800 text-xs">{b.gr_no}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">{b.challan_no || '-'}</td>
                          <td className="px-3 py-2 text-gray-700 text-xs truncate max-w-[100px]" title={b.consignor}>{(b.consignor || '-').substring(0, 16)}</td>
                          <td className="px-3 py-2 text-gray-700 text-xs truncate max-w-[100px]" title={b.consignee}>{(b.consignee || '-').substring(0, 16)}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">{(b.destination || '-').substring(0, 12)}</td>
                          <td className="px-3 py-2 text-right text-xs text-gray-600">{(b.weight || 0).toFixed(1)}</td>
                          <td className="px-3 py-2 text-right text-xs">{b.is_paid ? <span className="text-yellow-600 font-medium">PAID</span> : `₹${(b.amount || 0).toFixed(0)}`}</td>
                          <td className="px-3 py-2 text-right font-medium text-emerald-700 text-xs">₹{(b.kaat || 0).toFixed(0)}</td>
                          <td className="px-3 py-2 text-right font-bold text-teal-700 text-xs">₹{(b.pf || 0).toFixed(0)}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleRemove(b.gr_no)}
                              className="p-1 hover:bg-red-50 rounded transition-colors text-red-400 hover:text-red-600"
                              title="Remove from pohonch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add bilty section */}
            <div className="border border-dashed border-indigo-300 rounded-xl p-4 bg-indigo-50/30">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Add Bilty to Pohonch
              </h3>
              <div className="flex gap-2">
                <input
                  value={grInput}
                  onChange={e => {
                    setGrInput(e.target.value.toUpperCase());
                    setSearchError(null);
                    setSearchResult(null);
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleSearchGr()}
                  placeholder="Enter GR Number and press Enter or Search"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-300 outline-none bg-white"
                />
                <button
                  onClick={handleSearchGr}
                  disabled={!grInput.trim() || searching}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </button>
              </div>

              {searchError && (
                <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {searchError}
                </p>
              )}

              {searchResult && (
                <div className="mt-3 border border-indigo-200 rounded-xl p-3 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 grid grid-cols-5 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400 mb-0.5">GR No.</p>
                        <p className="font-mono font-bold text-gray-900">{searchResult.gr_no}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">Consignor</p>
                        <p className="font-medium text-gray-700 truncate">{(searchResult.consignor || '-').substring(0, 16)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">Destination</p>
                        <p className="font-medium text-gray-700">{searchResult.destination}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">Kaat</p>
                        <p className="font-bold text-emerald-700">₹{(searchResult.kaat || 0).toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">PF</p>
                        <p className="font-bold text-teal-700">₹{(searchResult.pf || 0).toFixed(0)}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleAddBilty}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-1 transition-colors flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  {searchResult.pohonch_no && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <Info className="w-3 h-3 flex-shrink-0" />
                      This GR is already in pohonch <strong>{searchResult.pohonch_no}</strong> — adding it here may create a duplicate
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            {saveSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> Pohonch updated successfully!
              </div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        {pohonch && !loading && (
          <div className="border-t border-gray-200 p-4 flex items-center justify-between bg-gray-50 rounded-b-2xl flex-shrink-0">
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>
                <span className="font-medium text-gray-700">{editedBilties.length}</span> bilties
                {diff !== 0 && (
                  <span className={`ml-2 font-semibold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({diff > 0 ? '+' : ''}{diff} from original)
                  </span>
                )}
              </p>
              <p>Kaat: <span className="font-medium">₹{totalKaat.toFixed(0)}</span> · PF: <span className="font-medium">₹{totalPF.toFixed(0)}</span> · Amt: <span className="font-medium">₹{totalAmt.toFixed(0)}</span></p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || saveSuccess}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle className="w-4 h-4" /> : null}
                {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
