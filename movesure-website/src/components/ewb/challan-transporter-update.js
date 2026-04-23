'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Truck, Search, Loader2, CheckCircle, AlertTriangle, Send,
  Download, ExternalLink, Edit3, ChevronDown, X, Package,
  MapPin, Plus, Hash, Zap, XCircle
} from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { formatEwbNumber } from '../../utils/ewbValidation';
import { saveTransporterUpdate } from '../../utils/ewbValidationStorage';
import { useAuth } from '../../app/utils/auth';

const DEFAULT_USER_GSTIN = '09COVPS5556J1ZT';

export default function ChallanTransporterUpdate({ transitDetails, challanDetails }) {
  const { user: currentUser } = useAuth();

  // ── EWB list from challan ──
  const challanEwbList = useMemo(() => {
    if (!transitDetails) return [];
    const list = [];
    transitDetails.forEach(transit => {
      const ewbs = [];
      if (transit.bilty?.e_way_bill) {
        transit.bilty.e_way_bill.split(',').filter(e => e.trim()).forEach(e => ewbs.push(e.trim()));
      }
      if (transit.station?.e_way_bill) {
        transit.station.e_way_bill.split(',').filter(e => e.trim()).forEach(e => ewbs.push(e.trim()));
      }
      ewbs.forEach(ewb => {
        list.push({
          ewb,
          grNo: transit.gr_no,
          consignor: transit.bilty?.consignor_name || transit.station?.consignor || '',
          consignee: transit.bilty?.consignee_name || transit.station?.consignee || '',
          destination: transit.toCity?.city_name || transit.station?.station || transit.bilty?.to_location || '',
        });
      });
    });
    // deduplicate by ewb
    const seen = new Set();
    return list.filter(item => {
      const key = item.ewb.replace(/[-\s]/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [transitDetails]);

  // ── State ──
  const [mode, setMode] = useState('challan'); // 'challan' | 'manual'
  const [selectedEwb, setSelectedEwb] = useState(null);
  const [manualEwb, setManualEwb] = useState('');
  const [ewbFilter, setEwbFilter] = useState('');

  // Transporter search
  const [transporterSuggestions, setTransporterSuggestions] = useState([]);
  const [transporterSearch, setTransporterSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [loadingTransporters, setLoadingTransporters] = useState(false);
  const [transportersFetched, setTransportersFetched] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Form
  const [formData, setFormData] = useState({
    user_gstin: DEFAULT_USER_GSTIN,
    transporter_id: '',
    transporter_name: ''
  });

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Existing updates tracking
  const [existingUpdates, setExistingUpdates] = useState({});
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Bulk transfer
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, results: [] });
  const [bulkSelected, setBulkSelected] = useState(new Set());

  // ── Active EWB number (from challan selection or manual) ──
  const activeEwb = useMemo(() => {
    if (mode === 'manual') return manualEwb.replace(/[-\s]/g, '');
    return selectedEwb?.ewb?.replace(/[-\s]/g, '') || '';
  }, [mode, selectedEwb, manualEwb]);

  const activeEwbDisplay = useMemo(() => {
    if (mode === 'manual') return manualEwb;
    return selectedEwb?.ewb || '';
  }, [mode, selectedEwb, manualEwb]);

  // ── Format EWB input ──
  const formatEwbInput = (value) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 12);
    const parts = [];
    for (let i = 0; i < limited.length; i += 4) {
      parts.push(limited.slice(i, i + 4));
    }
    return parts.join('-');
  };

  // ── Fetch existing transporter updates for all challan EWBs ──
  useEffect(() => {
    if (challanEwbList.length === 0) return;
    const fetchExisting = async () => {
      setLoadingExisting(true);
      try {
        const allFormats = [];
        challanEwbList.forEach(item => {
          const clean = item.ewb.replace(/[-\s]/g, '');
          allFormats.push(clean);
          if (clean.length === 12) {
            allFormats.push(`${clean.slice(0,4)}-${clean.slice(4,8)}-${clean.slice(8,12)}`);
          }
          allFormats.push(item.ewb);
        });
        const unique = [...new Set(allFormats)];
        const { data, error } = await supabase
          .from('transporter_updates')
          .select('*')
          .in('ewb_number', unique)
          .order('updated_at', { ascending: false });

        if (!error && data) {
          const map = {};
          data.forEach(u => {
            const key = u.ewb_number.replace(/[-\s]/g, '');
            if (!map[key]) map[key] = u;
          });
          setExistingUpdates(map);
        }
      } catch (err) {
        console.error('Error fetching existing updates:', err);
      } finally {
        setLoadingExisting(false);
      }
    };
    fetchExisting();
  }, [challanEwbList]);

  // ── Fetch all transporters once ──
  const fetchAllTransporters = useCallback(async () => {
    if (transportersFetched) return;
    setLoadingTransporters(true);
    try {
      const { data, error } = await supabase
        .from('transports')
        .select('id, transport_name, gst_number, city_name, mob_number, address, branch_owner_name')
        .not('transport_name', 'is', null)
        .order('transport_name', { ascending: true });

      if (error) throw error;
      setTransporterSuggestions((data || []).map(t => ({
        id: t.id,
        name: t.transport_name,
        gst: t.gst_number || '',
        city: t.city_name || '',
        phone: t.mob_number || '',
        address: t.address || '',
        branchOwner: t.branch_owner_name || ''
      })));
      setTransportersFetched(true);
    } catch (err) {
      console.error('Error fetching transporters:', err);
    } finally {
      setLoadingTransporters(false);
    }
  }, [transportersFetched]);

  // Fetch transporters on mount
  useEffect(() => {
    fetchAllTransporters();
  }, [fetchAllTransporters]);

  // ── Filter suggestions ──
  const filteredSuggestions = useMemo(() => {
    if (!transporterSearch.trim()) return transporterSuggestions;
    const q = transporterSearch.toLowerCase();
    return transporterSuggestions.filter(t =>
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.gst && t.gst.toLowerCase().includes(q)) ||
      (t.city && t.city.toLowerCase().includes(q)) ||
      (t.phone && t.phone.includes(q))
    );
  }, [transporterSuggestions, transporterSearch]);

  // ── Filter challan EWBs ──
  const filteredEwbs = useMemo(() => {
    if (!ewbFilter.trim()) return challanEwbList;
    const q = ewbFilter.toLowerCase();
    return challanEwbList.filter(item =>
      item.ewb.toLowerCase().includes(q) ||
      (item.grNo && item.grNo.toLowerCase().includes(q)) ||
      (item.consignee && item.consignee.toLowerCase().includes(q)) ||
      (item.destination && item.destination.toLowerCase().includes(q))
    );
  }, [challanEwbList, ewbFilter]);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Handlers ──
  const handleSelectTransporter = (transporter) => {
    setFormData(prev => ({
      ...prev,
      transporter_id: transporter.gst ? transporter.gst.toUpperCase() : '',
      transporter_name: transporter.name || ''
    }));
    setTransporterSearch('');
    setShowDropdown(false);
    setSelectedIdx(-1);
    setResult(null);
    setError(null);
  };

  const handleSelectEwb = (item) => {
    setSelectedEwb(item);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    const ewbToUpdate = activeEwb;
    if (!ewbToUpdate) {
      setError('Please select or enter an E-Way Bill number');
      return;
    }
    if (!formData.transporter_id) {
      setError('Please select a transporter or enter Transporter ID');
      return;
    }
    if (!formData.transporter_name) {
      setError('Please enter Transporter Name');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        user_gstin: formData.user_gstin,
        eway_bill_number: ewbToUpdate,
        transporter_id: formData.transporter_id,
        transporter_name: formData.transporter_name
      };

      // First API call — update
      const res1 = await fetch('https://api.movesure.io//api/transporter-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data1 = await res1.json();

      if (data1.results?.status === 'No Content' || data1.results?.code >= 400) {
        const errData = data1.error?.results || data1.results || data1;
        throw new Error(errData.message || data1.message || 'Failed to update transporter');
      }

      const isSuccess = (data1.status === 'success' || data1.results?.status === 'Success') &&
                        (data1.status_code === 200 || data1.results?.code === 200);
      if (!isSuccess) throw new Error('Update failed: unexpected response');

      // Second API call — get PDF
      let data2 = null;
      try {
        const res2 = await fetch('https://api.movesure.io//api/transporter-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const text2 = await res2.text();
        if (text2.trim()) {
          data2 = JSON.parse(text2);
        } else {
          console.warn('⚠️ Second transporter-update call returned empty body (likely 204)');
        }
      } catch (e) {
        console.warn('⚠️ Second transporter-update call failed (non-critical):', e.message);
      }
      const isSuccess2 = data2 && (data2.status === 'success' || data2.results?.status === 'Success') &&
                        (data2.status_code === 200 || data2.results?.code === 200);
      const finalData = isSuccess2 ? data2 : data1;

      let pdfUrl = finalData.results?.message?.url || finalData.pdfUrl ||
                   data2?.results?.message?.url || data2?.pdfUrl ||
                   data1.results?.message?.url || data1.pdfUrl;
      if (pdfUrl && !pdfUrl.startsWith('http')) pdfUrl = `https://${pdfUrl}`;

      const ewbFormatted = formatEwbNumber(ewbToUpdate);
      const successResult = {
        success: true,
        message: finalData.message || 'Transporter updated successfully!',
        ewbNumber: finalData.results?.message?.ewayBillNo || ewbFormatted,
        transporterId: finalData.results?.message?.transporterId || formData.transporter_id,
        transporterName: formData.transporter_name,
        updateDate: finalData.results?.message?.transUpdateDate,
        pdfUrl,
        rawResponse: finalData
      };

      setResult(successResult);

      // Update existing updates map
      setExistingUpdates(prev => ({
        ...prev,
        [ewbToUpdate]: {
          ewb_number: ewbFormatted,
          transporter_id: formData.transporter_id,
          transporter_name: formData.transporter_name,
          is_success: true,
          pdf_url: pdfUrl,
          update_date: successResult.updateDate,
          updated_at: new Date().toISOString()
        }
      }));

      // Save to database
      if (currentUser?.id) {
        saveTransporterUpdate({
          challanNo: challanDetails?.challan_no || null,
          grNo: selectedEwb?.grNo || null,
          ewbNumber: ewbFormatted,
          transporterId: formData.transporter_id,
          transporterName: formData.transporter_name,
          userGstin: formData.user_gstin,
          updateResult: successResult,
          userId: currentUser.id
        }).catch(err => console.error('Save error:', err));
      }
    } catch (err) {
      console.error('Update error:', err);
      const errorMsg = err.message || 'Failed to update transporter';
      setError(errorMsg);

      // Save error to database
      if (currentUser?.id && ewbToUpdate) {
        saveTransporterUpdate({
          challanNo: challanDetails?.challan_no || null,
          grNo: selectedEwb?.grNo || null,
          ewbNumber: formatEwbNumber(ewbToUpdate),
          transporterId: formData.transporter_id,
          transporterName: formData.transporter_name,
          userGstin: formData.user_gstin,
          updateResult: { success: false, error: errorMsg },
          userId: currentUser.id
        }).catch(err => console.error('Save error:', err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Bulk Transfer Selected to Our GSTIN ──
  const handleBulkTransfer = async () => {
    const toTransfer = challanEwbList.filter(item => {
      const clean = item.ewb.replace(/[-\s]/g, '');
      return bulkSelected.has(clean);
    });
    if (toTransfer.length === 0) return;

    setBulkRunning(true);
    setBulkProgress({ current: 0, total: toTransfer.length, results: [] });

    for (let i = 0; i < toTransfer.length; i++) {
      const item = toTransfer[i];
      const ewbClean = item.ewb.replace(/[-\s]/g, '');
      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const payload = {
          user_gstin: DEFAULT_USER_GSTIN,
          eway_bill_number: ewbClean,
          transporter_id: DEFAULT_USER_GSTIN,
          transporter_name: 'SS TRANSPORT CORPORATION'
        };

        const res1 = await fetch('https://api.movesure.io//api/transporter-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data1 = await res1.json();

        const isSuccess = (data1.status === 'success' || data1.results?.status === 'Success') &&
                          (data1.status_code === 200 || data1.results?.code === 200);

        if (!isSuccess) {
          const errMsg = data1.results?.message || data1.message || 'Failed';
          throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
        }

        // Second call for PDF
        let data2Bulk = null;
        try {
          const res2 = await fetch('https://api.movesure.io//api/transporter-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const text2 = await res2.text();
          if (text2.trim()) {
            data2Bulk = JSON.parse(text2);
          } else {
            console.warn('⚠️ Second bulk transporter-update call returned empty body (likely 204)');
          }
        } catch (e) {
          console.warn('⚠️ Second bulk transporter-update call failed (non-critical):', e.message);
        }
        const isBulkSuccess2 = data2Bulk && (data2Bulk.status === 'success' || data2Bulk.results?.status === 'Success');
        const finalData = isBulkSuccess2 ? data2Bulk : data1;
        let pdfUrl = finalData.results?.message?.url || finalData.pdfUrl ||
                     data2Bulk?.results?.message?.url || data2Bulk?.pdfUrl ||
                     data1.results?.message?.url || data1.pdfUrl || null;
        if (pdfUrl && !pdfUrl.startsWith('http')) pdfUrl = `https://${pdfUrl}`;

        const ewbHyphenated = formatEwbNumber(ewbClean);
        setExistingUpdates(prev => ({
          ...prev,
          [ewbClean]: {
            ewb_number: ewbHyphenated,
            transporter_id: DEFAULT_USER_GSTIN,
            transporter_name: 'SS TRANSPORT CORPORATION',
            is_success: true,
            pdf_url: pdfUrl,
            update_date: finalData.results?.message?.transUpdateDate,
            updated_at: new Date().toISOString()
          }
        }));

        setBulkProgress(prev => ({
          ...prev,
          results: [...prev.results, { ewb: ewbClean, grNo: item.grNo, success: true, pdfUrl }]
        }));

        // Save to DB
        if (currentUser?.id) {
          saveTransporterUpdate({
            challanNo: challanDetails?.challan_no || null,
            grNo: item.grNo || null,
            ewbNumber: ewbHyphenated,
            transporterId: DEFAULT_USER_GSTIN,
            transporterName: 'SS TRANSPORT CORPORATION',
            userGstin: DEFAULT_USER_GSTIN,
            updateResult: { success: true, pdfUrl },
            userId: currentUser.id
          }).catch(err => console.error('Save error:', err));
        }
      } catch (err) {
        setBulkProgress(prev => ({
          ...prev,
          results: [...prev.results, { ewb: ewbClean, grNo: item.grNo, success: false, error: err.message }]
        }));
      }

      // Small delay between calls
      if (i < toTransfer.length - 1) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    setBulkRunning(false);
    setBulkSelected(new Set());
  };

  const currentExisting = activeEwb ? existingUpdates[activeEwb] : null;

  // Count updated vs total
  const updatedCount = challanEwbList.filter(item => {
    const clean = item.ewb.replace(/[-\s]/g, '');
    return existingUpdates[clean]?.is_success;
  }).length;

  const bulkSuccessCount = bulkProgress.results.filter(r => r.success).length;
  const bulkFailCount = bulkProgress.results.filter(r => !r.success).length;

  const toggleBulkSelect = (ewbClean) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(ewbClean)) next.delete(ewbClean);
      else next.add(ewbClean);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (bulkSelected.size === challanEwbList.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(challanEwbList.map(item => item.ewb.replace(/[-\s]/g, ''))));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 rounded-xl">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Transporter Update</h2>
                <p className="text-sm text-violet-100">
                  Challan #{challanDetails?.challan_no} &middot; {challanEwbList.length} E-Way Bill{challanEwbList.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {challanEwbList.length > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{updatedCount}/{challanEwbList.length}</div>
                <div className="text-xs text-violet-200">Updated</div>
              </div>
            )}
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setMode('challan'); setBulkMode(false); setResult(null); setError(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'challan' && !bulkMode
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Package className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              From Challan
            </button>
            <button
              onClick={() => { setMode('manual'); setBulkMode(false); setSelectedEwb(null); setResult(null); setError(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'manual' && !bulkMode
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Other EWB
            </button>
            {challanEwbList.length > 0 && (
              <button
                onClick={() => { setBulkMode(true); setMode('challan'); setSelectedEwb(null); setResult(null); setError(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  bulkMode
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Zap className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Transfer All to SS Transport
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {bulkMode
              ? 'Bulk transfer all pending EWBs to SS TRANSPORT CORPORATION (09COVPS5556J1ZT) in one click.'
              : mode === 'challan'
                ? 'Select an E-Way Bill from this challan to update its transporter.'
                : 'Enter any E-Way Bill number (not in this challan) to update its transporter.'}
          </p>
        </div>
      </div>

      {/* ── Bulk Transfer Panel ── */}
      {bulkMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <Zap className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Transfer All to SS Transport</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    GSTIN: <span className="font-mono font-semibold">{DEFAULT_USER_GSTIN}</span> &middot; SS TRANSPORT CORPORATION
                  </p>
                </div>
              </div>
              <button onClick={() => setBulkMode(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Selection UI before start */}
            {!bulkRunning && bulkProgress.results.length === 0 && (
              <div className="space-y-4">
                {/* Select All / Stats Row */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={bulkSelected.size === challanEwbList.length && challanEwbList.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      {bulkSelected.size === challanEwbList.length ? 'Deselect All' : 'Select All'}
                    </span>
                  </label>
                  <span className="text-xs font-medium text-gray-500">
                    {bulkSelected.size} of {challanEwbList.length} selected
                  </span>
                </div>

                {/* EWB Checkbox List */}
                <div className="max-h-[360px] overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {challanEwbList.map((item) => {
                    const clean = item.ewb.replace(/[-\s]/g, '');
                    const isChecked = bulkSelected.has(clean);
                    const alreadyDone = existingUpdates[clean]?.is_success;
                    return (
                      <label
                        key={clean}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-emerald-50 ${
                          isChecked ? 'bg-emerald-50/60' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBulkSelect(clean)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-gray-900">{formatEwbNumber(item.ewb)}</span>
                            {alreadyDone && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Already Done</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            {item.grNo && <span>GR: {item.grNo}</span>}
                            {item.destination && <span>&middot; {item.destination}</span>}
                            {item.consignee && <span>&middot; {item.consignee}</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Transfer Button */}
                {bulkSelected.size > 0 ? (
                  <button
                    onClick={handleBulkTransfer}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                  >
                    <Zap className="w-5 h-5" />
                    Transfer {bulkSelected.size} EWB{bulkSelected.size !== 1 ? 's' : ''} to SS Transport
                  </button>
                ) : (
                  <div className="text-center py-3 text-sm text-gray-400">
                    Select EWBs above to transfer them
                  </div>
                )}
              </div>
            )}

            {/* Progress while running */}
            {bulkRunning && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    Transferring {bulkProgress.current} of {bulkProgress.total}...
                  </p>
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                  />
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-600 font-medium">{bulkSuccessCount} success</span>
                  {bulkFailCount > 0 && <span className="text-red-600 font-medium">{bulkFailCount} failed</span>}
                </div>
                {/* Live results */}
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {[...bulkProgress.results].reverse().map((r, idx) => (
                    <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                      r.success ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        {r.success ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                        <span className="font-mono font-semibold">{formatEwbNumber(r.ewb)}</span>
                        {r.grNo && <span className="text-gray-400">GR: {r.grNo}</span>}
                      </div>
                      {r.success ? (
                        <span className="text-emerald-600 font-medium">Done</span>
                      ) : (
                        <span className="text-red-600 truncate max-w-[200px]" title={r.error}>{r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed summary */}
            {!bulkRunning && bulkProgress.results.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold text-base">Bulk Transfer Complete</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-lg font-bold text-gray-900">{bulkProgress.total}</p>
                    <p className="text-xs text-gray-500">Processed</p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-lg font-bold text-emerald-700">{bulkSuccessCount}</p>
                    <p className="text-xs text-emerald-600">Success</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-lg font-bold text-red-700">{bulkFailCount}</p>
                    <p className="text-xs text-red-600">Failed</p>
                  </div>
                </div>
                {/* Results list */}
                <div className="max-h-64 overflow-y-auto space-y-1.5">
                  {bulkProgress.results.map((r, idx) => (
                    <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                      r.success ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        {r.success ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                        <span className="font-mono font-semibold">{formatEwbNumber(r.ewb)}</span>
                        {r.grNo && <span className="text-gray-400">GR: {r.grNo}</span>}
                      </div>
                      {r.success ? (
                        r.pdfUrl ? (
                          <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-medium hover:underline flex items-center gap-1">
                            <Download className="w-3 h-3" /> PDF
                          </a>
                        ) : <span className="text-emerald-600 font-medium">Done</span>
                      ) : (
                        <span className="text-red-600 truncate max-w-[200px]" title={r.error}>{r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
                {bulkFailCount > 0 && (
                  <button
                    onClick={() => {
                      const failedEwbs = bulkProgress.results.filter(r => !r.success).map(r => r.ewb);
                      setBulkSelected(new Set(failedEwbs));
                      setBulkProgress({ current: 0, total: 0, results: [] });
                    }}
                    className="w-full py-2.5 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Select {bulkFailCount} Failed EWB{bulkFailCount !== 1 ? 's' : ''} to Retry
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!bulkMode && (
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Left: EWB Selection ── */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full">
            {mode === 'challan' ? (
              <>
                {/* Search / filter EWBs */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={ewbFilter}
                      onChange={(e) => setEwbFilter(e.target.value)}
                      placeholder="Filter by EWB, GR, consignee, city..."
                      className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 placeholder-gray-400"
                    />
                    {ewbFilter && (
                      <button onClick={() => setEwbFilter('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {/* EWB list */}
                <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                  {loadingExisting && (
                    <div className="p-4 text-center text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading...
                    </div>
                  )}
                  {filteredEwbs.length === 0 && !loadingExisting && (
                    <div className="p-6 text-center text-sm text-gray-400">
                      {ewbFilter ? 'No matching E-Way Bills' : 'No E-Way Bills in this challan'}
                    </div>
                  )}
                  {filteredEwbs.map((item, idx) => {
                    const clean = item.ewb.replace(/[-\s]/g, '');
                    const isUpdated = existingUpdates[clean]?.is_success;
                    const isSelected = selectedEwb && selectedEwb.ewb.replace(/[-\s]/g, '') === clean;
                    return (
                      <button
                        key={clean}
                        onClick={() => handleSelectEwb(item)}
                        className={`w-full text-left px-4 py-3 transition-all hover:bg-violet-50 ${
                          isSelected
                            ? 'bg-violet-50 border-l-4 border-l-violet-500'
                            : 'border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-gray-900">{formatEwbNumber(item.ewb)}</span>
                              {isUpdated && (
                                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                              {item.grNo && <span className="font-medium">GR: {item.grNo}</span>}
                              {item.destination && <span>&middot; {item.destination}</span>}
                            </div>
                            {item.consignee && (
                              <div className="text-xs text-gray-400 mt-0.5 truncate">To: {item.consignee}</div>
                            )}
                          </div>
                          {isUpdated && (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium flex-shrink-0">
                              Done
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Manual EWB Entry */
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Hash className="w-4 h-4 inline mr-1 -mt-0.5 text-violet-500" />
                    E-Way Bill Number
                  </label>
                  <input
                    type="text"
                    value={formatEwbInput(manualEwb)}
                    onChange={(e) => {
                      const formatted = formatEwbInput(e.target.value);
                      setManualEwb(formatted.replace(/-/g, ''));
                    }}
                    placeholder="Enter EWB (e.g. 4480-0919-5664)"
                    maxLength={14}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-violet-500 focus:border-violet-500 placeholder-gray-400"
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    Enter any E-Way Bill number that is not part of this challan.
                  </p>
                </div>
                {manualEwb && manualEwb.length === 12 && (
                  <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
                    <div className="flex items-center gap-2 text-violet-700 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">EWB: {formatEwbNumber(manualEwb)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Transporter Selection & Update ── */}
        <div className="xl:col-span-3 space-y-5">
          {/* Selected EWB Info */}
          {(activeEwb && mode === 'challan' && selectedEwb) && (
            <div className={`rounded-2xl p-4 border-2 ${
              currentExisting?.is_success
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-violet-50 border-violet-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Selected E-Way Bill</p>
                  <p className="font-mono text-lg font-bold text-gray-900">{formatEwbNumber(selectedEwb.ewb)}</p>
                </div>
                {currentExisting?.is_success && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-200 text-emerald-800 rounded-full text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Previously Updated
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                {selectedEwb.grNo && (
                  <span className="px-2 py-1 bg-white rounded-md border border-gray-200">GR: {selectedEwb.grNo}</span>
                )}
                {selectedEwb.destination && (
                  <span className="px-2 py-1 bg-white rounded-md border border-gray-200">
                    <MapPin className="w-3 h-3 inline mr-1 -mt-0.5" />{selectedEwb.destination}
                  </span>
                )}
                {selectedEwb.consignee && (
                  <span className="px-2 py-1 bg-white rounded-md border border-gray-200">To: {selectedEwb.consignee}</span>
                )}
              </div>
              {currentExisting?.is_success && (
                <div className="mt-3 pt-3 border-t border-emerald-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-emerald-600 font-medium">Transporter</p>
                    <p className="text-gray-900 font-semibold">{currentExisting.transporter_name}</p>
                  </div>
                  <div>
                    <p className="text-emerald-600 font-medium">GSTIN</p>
                    <p className="font-mono text-gray-900">{currentExisting.transporter_id}</p>
                  </div>
                  {currentExisting.update_date && (
                    <div>
                      <p className="text-emerald-600 font-medium">Updated</p>
                      <p className="text-gray-900">{currentExisting.update_date}</p>
                    </div>
                  )}
                  {(currentExisting.pdf_url || currentExisting.raw_result_metadata?.pdfUrl) && (
                    <div className="col-span-full mt-1">
                      <a
                        href={currentExisting.pdf_url || currentExisting.raw_result_metadata?.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-emerald-700 font-medium hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Previous EWB PDF
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No selection prompt */}
          {!activeEwb && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-violet-100 rounded-full flex items-center justify-center">
                <Truck className="w-7 h-7 text-violet-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">
                {mode === 'challan' ? 'Select an E-Way Bill' : 'Enter an E-Way Bill'}
              </h3>
              <p className="text-sm text-gray-400">
                {mode === 'challan'
                  ? 'Choose an E-Way Bill from the list on the left to update its transporter.'
                  : 'Type an E-Way Bill number in the input above to get started.'}
              </p>
            </div>
          )}

          {/* Transporter Search & Form */}
          {activeEwb && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-5">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-violet-600" />
                {currentExisting?.is_success ? 'Re-update Transporter' : 'Update Transporter'}
              </h3>

              {/* Transporter Searchable Dropdown */}
              <div ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Search className="w-4 h-4 inline mr-1 -mt-0.5 text-violet-500" />
                  Search Transporter
                  <span className="text-gray-400 font-normal ml-1">
                    ({transporterSuggestions.length} available)
                  </span>
                </label>
                <div className="relative">
                  <div
                    className="w-full flex items-center border-2 border-gray-200 rounded-xl bg-white hover:border-violet-300 transition-colors cursor-pointer"
                    onClick={() => {
                      setShowDropdown(!showDropdown);
                      setTimeout(() => searchInputRef.current?.focus(), 100);
                    }}
                  >
                    <div className="flex-1 px-3 py-2.5">
                      {showDropdown ? (
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={transporterSearch}
                          onChange={(e) => {
                            setTransporterSearch(e.target.value);
                            setShowDropdown(true);
                            setSelectedIdx(-1);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setShowDropdown(false);
                              setTransporterSearch('');
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setSelectedIdx(prev => prev < filteredSuggestions.length - 1 ? prev + 1 : 0);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setSelectedIdx(prev => prev > 0 ? prev - 1 : filteredSuggestions.length - 1);
                            } else if (e.key === 'Enter' && selectedIdx >= 0) {
                              e.preventDefault();
                              handleSelectTransporter(filteredSuggestions[selectedIdx]);
                            }
                          }}
                          className="w-full outline-none text-sm text-gray-900 placeholder-gray-400"
                          placeholder="Search by name, GSTIN, city, or phone..."
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {formData.transporter_name ? (
                            <>
                              <Truck className="w-4 h-4 text-violet-500" />
                              <span className="text-sm font-semibold text-gray-900">{formData.transporter_name}</span>
                              {formData.transporter_id && (
                                <span className="text-xs font-mono bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md">
                                  {formData.transporter_id}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">Click to search for a transporter...</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="px-3 text-gray-400">
                      {loadingTransporters ? (
                        <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                      ) : (
                        <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </div>

                  {showDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-violet-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                      {loadingTransporters ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                          Loading transporters...
                        </div>
                      ) : filteredSuggestions.length === 0 ? (
                        <div className="px-4 py-4 text-center text-sm text-gray-500">
                          No transporters match &quot;{transporterSearch}&quot;
                        </div>
                      ) : (
                        filteredSuggestions.map((t, idx) => {
                          const isCurrently = formData.transporter_id === (t.gst?.toUpperCase() || '') && formData.transporter_name === t.name;
                          const isKb = idx === selectedIdx;
                          return (
                            <div
                              key={t.id || idx}
                              onClick={() => handleSelectTransporter(t)}
                              className={`px-4 py-3 cursor-pointer transition-all border-b border-gray-50 last:border-0 ${
                                isCurrently ? 'bg-violet-50 border-l-4 border-l-violet-500'
                                : isKb ? 'bg-gray-100'
                                : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-violet-500 flex-shrink-0" />
                                <span className="text-sm font-semibold text-gray-900 truncate">{t.name}</span>
                                {isCurrently && (
                                  <span className="flex-shrink-0 px-2 py-0.5 bg-violet-600 text-white text-[10px] font-bold rounded-full">
                                    SELECTED
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 ml-6">
                                {t.gst ? (
                                  <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                    GST: {t.gst}
                                  </span>
                                ) : (
                                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                    No GSTIN
                                  </span>
                                )}
                                {t.city && <span className="text-xs text-gray-400">📍 {t.city}</span>}
                                {t.phone && <span className="text-xs text-gray-500">📞 {t.phone}</span>}
                              </div>
                              {t.branchOwner && (
                                <div className="mt-0.5 ml-6 text-xs text-gray-400">Owner: {t.branchOwner}</div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Override Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transporter ID (GSTIN) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.transporter_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, transporter_id: e.target.value.toUpperCase() }))}
                    placeholder="Enter GSTIN"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transporter Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.transporter_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, transporter_name: e.target.value }))}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
              </div>

              {/* User GSTIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User GSTIN
                </label>
                <input
                  type="text"
                  value={formData.user_gstin}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_gstin: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-gray-50"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{typeof error === 'object' ? error.message || JSON.stringify(error) : error}</p>
                </div>
              )}

              {/* Success */}
              {result?.success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-700 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Transporter Updated!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-emerald-600">
                    <p>EWB: {formatEwbNumber(result.ewbNumber)}</p>
                    <p>Transporter: {result.transporterName}</p>
                    {result.updateDate && <p>Date: {result.updateDate}</p>}
                  </div>
                  {result.pdfUrl && (
                    <a
                      href={result.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Updated EWB PDF
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !activeEwb || !formData.transporter_id || !formData.transporter_name}
                className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating Transporter...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Update Transporter
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
