'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Clock, Search, Loader2, CheckCircle, AlertTriangle, Send,
  Download, ExternalLink, ChevronDown, X, Package, MapPin,
  Plus, Hash, Truck, Calendar, FileText, RefreshCw, Info,
  Navigation, Building, MapPinned
} from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { formatEwbNumber } from '../../utils/ewbValidation';
import { useAuth } from '../../app/utils/auth';
import DistanceFinder from './distance-finder';

const DEFAULT_USER_GSTIN = '09COVPS5556J1ZT';

const INDIAN_STATES = [
  'ANDAMAN AND NICOBAR ISLANDS', 'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM',
  'BIHAR', 'CHANDIGARH', 'CHHATTISGARH', 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  'DELHI', 'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH', 'JAMMU AND KASHMIR',
  'JHARKHAND', 'KARNATAKA', 'KERALA', 'LADAKH', 'LAKSHADWEEP', 'MADHYA PRADESH',
  'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA',
  'PUDUCHERRY', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL NADU', 'TELANGANA',
  'TRIPURA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL'
];

const TRANSPORT_MODES = [
  { value: '1', label: 'Road', icon: '🚛' },
  { value: '5', label: 'In Transit', icon: '📦' },
];

const EXTEND_REASONS = [
  'Natural Calamity',
  'Law and Order Situation',
  'Transhipment',
  'Accident',
  'Others',
];

const EXTEND_REMARKS_OPTIONS = [
  'Breakdown',
  'Transit',
  'Documents Issues',
];

const TRANSIT_TYPES = [
  { value: 'R', label: 'Road' },
  { value: 'W', label: 'Warehouse' },
  { value: 'O', label: 'Others' },
];

export default function ExtendEwbSection({ transitDetails, challanDetails }) {
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
    const seen = new Set();
    return list.filter(item => {
      const key = item.ewb.replace(/[-\s]/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [transitDetails]);

  // ── Truck number from challan ──
  const truckNumber = useMemo(() => {
    if (challanDetails?.truck?.truck_number) {
      return challanDetails.truck.truck_number.replace(/-/g, '').toUpperCase();
    }
    return '';
  }, [challanDetails]);

  // ── State ──
  const [mode, setMode] = useState('challan'); // 'challan' | 'manual'
  const [selectedEwb, setSelectedEwb] = useState(null);
  const [manualEwb, setManualEwb] = useState('');
  const [ewbFilter, setEwbFilter] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    userGstin: DEFAULT_USER_GSTIN,
    vehicle_number: '',
    place_of_consignor: 'ALIGARH',
    state_of_consignor: 'UTTAR PRADESH',
    remaining_distance: '',
    transporter_document_number: '',
    transporter_document_date: '',
    mode_of_transport: '1',
    extend_validity_reason: 'Natural Calamity',
    extend_remarks: '',
    consignment_status: 'M',
    from_pincode: '202001',
    transit_type: '',
    address_line1: '',
    address_line2: '',
    address_line3: '',
  });

  // Auto-fetch EWB details
  const [ewbFetchLoading, setEwbFetchLoading] = useState(false);
  const [toPincode, setToPincode] = useState('');

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // History
  const [extensionHistory, setExtensionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Existing extensions from DB
  const [existingExtensions, setExistingExtensions] = useState({});
  const [loadingExisting, setLoadingExisting] = useState(false);

  // State dropdown
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const stateDropdownRef = useRef(null);

  // ── Active EWB ──
  const activeEwb = useMemo(() => {
    if (mode === 'manual') return manualEwb.replace(/[-\s]/g, '');
    return selectedEwb?.ewb?.replace(/[-\s]/g, '') || '';
  }, [mode, selectedEwb, manualEwb]);

  // ── Challan number & dispatch date for defaults ──
  const challanNo = challanDetails?.challan_no || '';
  const dispatchDate = useMemo(() => {
    if (!challanDetails?.dispatch_date) return '';
    try {
      const d = new Date(challanDetails.dispatch_date);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch { return ''; }
  }, [challanDetails]);

  // ── Set truck number, transporter doc defaults from challan ──
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      vehicle_number: truckNumber || prev.vehicle_number,
      transporter_document_number: challanNo || prev.transporter_document_number,
      transporter_document_date: dispatchDate || prev.transporter_document_date,
      extend_remarks: prev.extend_remarks || 'Breakdown',
    }));
  }, [truckNumber, challanNo, dispatchDate]);

  // ── Auto-set consignment_status, transit_type & address based on mode ──
  // Modes 1-4 (On Road): consignment_status=M, transit_type="", address blank
  // Mode 5 (In Transit): consignment_status=T, transit_type=R/W/O, address required
  useEffect(() => {
    const m = formData.mode_of_transport;
    if (m === '5') {
      setFormData(prev => ({
        ...prev,
        consignment_status: 'T',
        transit_type: prev.transit_type || 'R'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        consignment_status: 'M',
        transit_type: '',
        address_line1: '',
        address_line2: '',
        address_line3: '',
      }));
    }
  }, [formData.mode_of_transport]);

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

  // ── Filtered states ──
  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return INDIAN_STATES;
    return INDIAN_STATES.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));
  }, [stateSearch]);

  // ── Fetch existing extensions from DB ──
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
          .from('extended_ewb_validations')
          .select('*')
          .in('ewb_number', unique)
          .eq('is_success', true)
          .order('extended_at', { ascending: false });

        if (!error && data) {
          const map = {};
          data.forEach(u => {
            const key = u.ewb_number.replace(/[-\s]/g, '');
            if (!map[key]) map[key] = u;
          });
          setExistingExtensions(map);
        }
      } catch (err) {
        console.error('Error fetching existing extensions:', err);
      } finally {
        setLoadingExisting(false);
      }
    };
    fetchExisting();
  }, [challanEwbList]);

  // ── Close state dropdown on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target)) {
        setShowStateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Auto-fetch EWB details to get distance & to_pincode ──
  const fetchEwbAutoData = useCallback(async (ewbNumber) => {
    if (!ewbNumber || ewbNumber.length < 10) return;
    setEwbFetchLoading(true);
    try {
      const url = `https://movesure-backend.onrender.com//api/ewaybill?eway_bill_number=${ewbNumber}&gstin=${DEFAULT_USER_GSTIN}`;
      const res = await fetch(url);
      const json = await res.json();
      if ((json.status === 'success' || json.success) && json.data?.results?.message) {
        const msg = json.data.results.message;
        if (msg.transportation_distance) {
          setFormData(prev => ({ ...prev, remaining_distance: String(msg.transportation_distance) }));
        }
        if (msg.pincode_of_consignee) {
          setToPincode(String(msg.pincode_of_consignee));
        }
      }
    } catch (err) {
      console.error('Auto-fetch EWB details failed:', err);
    } finally {
      setEwbFetchLoading(false);
    }
  }, []);

  // ── Handlers ──
  const handleSelectEwb = (item) => {
    setSelectedEwb(item);
    setResult(null);
    setError(null);
    // Auto-fetch EWB details for distance & pincode
    const cleaned = item.ewb.replace(/[-\s]/g, '');
    fetchEwbAutoData(cleaned);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ── Submit extend validity ──
  const handleSubmit = async () => {
    if (!activeEwb) {
      setError('Please select or enter an E-Way Bill number');
      return;
    }
    if (!formData.vehicle_number && formData.mode_of_transport === '1') {
      setError('Vehicle number is required for Road transport');
      return;
    }

    if (!formData.place_of_consignor) {
      setError('Place of consignor is required');
      return;
    }
    if (!formData.remaining_distance) {
      setError('Remaining distance is required');
      return;
    }
    if (!formData.extend_validity_reason) {
      setError('Reason for extension is required');
      return;
    }
    if (!formData.extend_remarks) {
      setError('Remarks are required');
      return;
    }
    if (!formData.from_pincode) {
      setError('Pincode is required');
      return;
    }
    // Address fields required only for Mode 5 (In Transit)
    if (formData.mode_of_transport === '5' && !formData.address_line1) {
      setError('Address Line 1 is required for In Transit mode');
      return;
    }
    if (formData.mode_of_transport === '5' && !formData.transit_type) {
      setError('Transit Type is required for In Transit mode');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        userGstin: formData.userGstin,
        eway_bill_number: parseInt(activeEwb, 10),
        vehicle_number: formData.vehicle_number,
        place_of_consignor: formData.place_of_consignor,
        state_of_consignor: formData.state_of_consignor,
        remaining_distance: parseInt(formData.remaining_distance, 10),
        transporter_document_number: formData.transporter_document_number || '',
        transporter_document_date: formData.transporter_document_date || '',
        mode_of_transport: formData.mode_of_transport,
        extend_validity_reason: formData.extend_validity_reason,
        extend_remarks: formData.extend_remarks,
        consignment_status: formData.consignment_status,
        from_pincode: parseInt(formData.from_pincode, 10),
        transit_type: formData.mode_of_transport === '5' ? formData.transit_type : '',
        address_line1: formData.mode_of_transport === '5' ? formData.address_line1 : '',
        address_line2: formData.mode_of_transport === '5' ? (formData.address_line2 || formData.address_line1) : '',
        address_line3: formData.mode_of_transport === '5' ? (formData.address_line3 || formData.address_line1) : '',
      };

      const response = await fetch('https://movesure-backend.onrender.com//api/extend-ewaybill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Handle empty response body (e.g. HTTP 204 No Content)
      const responseText = await response.text();
      let data = {};
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (parseErr) {
          throw new Error(`API returned invalid response (HTTP ${response.status}): ${responseText.slice(0, 200)}`);
        }
      } else {
        // Empty body — treat as error with HTTP status info
        throw new Error(`API returned empty response (HTTP ${response.status}). The server may have rejected the request.`);
      }

      if (data.status === 'error' || data.status_code === 204 || data.results?.code >= 300) {
        const rawMsg = data.results?.message || data.message || 'Failed to extend E-Way Bill';
        const nicCode = data.results?.code || data.status_code || '';
        const rawMsgStr = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
        // Build a clear error string showing API code + NIC code + message
        const errMsg = nicCode
          ? `API Error (Code ${data.status_code || 'N/A'}, NIC: ${nicCode}): ${rawMsgStr}`
          : rawMsgStr;
        // Save failed attempt to DB
        try {
          await supabase.from('extended_ewb_validations').insert({
            extended_by: currentUser?.id || null,
            challan_no: challanDetails?.challan_no || null,
            ewb_number: activeEwb,
            is_success: false,
            vehicle_number: formData.vehicle_number,
            mode_of_transport: formData.mode_of_transport,
            extend_validity_reason: formData.extend_validity_reason,
            extend_remarks: formData.extend_remarks,
            error_message: errMsg,
            raw_result_metadata: data,
            extended_at: new Date().toISOString(),
          });
        } catch (dbErr) { console.error('Failed to save error to DB:', dbErr); }
        throw new Error(errMsg);
      }

      const isSuccess = (data.status === 'success' || data.results?.status === 'Success') &&
                        (data.status_code === 200 || data.results?.code === 200);

      if (!isSuccess) throw new Error(data.message || 'Unexpected response from server');

      const msg = data.results?.message || {};
      let pdfUrl = msg.url || data.pdfUrl || null;
      if (pdfUrl && !pdfUrl.startsWith('http')) pdfUrl = `https://${pdfUrl}`;

      const successResult = {
        success: true,
        ewbNumber: msg.ewayBillNo || activeEwb,
        updatedDate: msg.updatedDate || '',
        validUpto: msg.validUpto || '',
        pdfUrl,
        rawResponse: data
      };

      setResult(successResult);

      // Save to extension history in local state
      setExtensionHistory(prev => [{
        ewb: activeEwb,
        ...successResult,
        timestamp: new Date().toISOString()
      }, ...prev]);

      // Update existing extensions map for immediate UI feedback
      setExistingExtensions(prev => ({
        ...prev,
        [activeEwb]: {
          ewb_number: activeEwb,
          is_success: true,
          vehicle_number: formData.vehicle_number,
          mode_of_transport: formData.mode_of_transport,
          transport_mode_label: TRANSPORT_MODES.find(m => m.value === formData.mode_of_transport)?.label || '',
          place_of_consignor: formData.place_of_consignor,
          state_of_consignor: formData.state_of_consignor,
          remaining_distance: parseInt(formData.remaining_distance, 10) || null,
          from_pincode: formData.from_pincode,
          extend_validity_reason: formData.extend_validity_reason,
          extend_remarks: formData.extend_remarks,
          transporter_document_number: formData.transporter_document_number,
          transporter_document_date: formData.transporter_document_date,
          valid_upto: successResult.validUpto,
          updated_date: successResult.updatedDate,
          pdf_url: successResult.pdfUrl,
          extended_at: new Date().toISOString(),
        }
      }));

      // ── Save to Supabase extended_ewb_validations ──
      try {
        const modeLabel = TRANSPORT_MODES.find(m => m.value === formData.mode_of_transport)?.label || '';
        await supabase.from('extended_ewb_validations').insert({
          extended_by: currentUser?.id || null,
          challan_no: challanDetails?.challan_no || null,
          ewb_number: activeEwb,
          is_success: true,
          vehicle_number: formData.vehicle_number,
          mode_of_transport: formData.mode_of_transport,
          transport_mode_label: modeLabel,
          place_of_consignor: formData.place_of_consignor,
          state_of_consignor: formData.state_of_consignor,
          remaining_distance: parseInt(formData.remaining_distance, 10) || null,
          from_pincode: formData.from_pincode,
          consignment_status: formData.consignment_status,
          transit_type: formData.mode_of_transport === '5' ? formData.transit_type : '',
          extend_validity_reason: formData.extend_validity_reason,
          extend_remarks: formData.extend_remarks,
          transporter_document_number: formData.transporter_document_number,
          transporter_document_date: formData.transporter_document_date,
          valid_upto: successResult.validUpto || null,
          updated_date: successResult.updatedDate || null,
          pdf_url: successResult.pdfUrl || null,
          raw_result_metadata: data,
          extended_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.error('Failed to save extension to DB:', dbErr);
      }

    } catch (err) {
      console.error('Extend error:', err);
      setError(err.message || 'Failed to extend E-Way Bill validity');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if EWB was extended (DB or this session)
  const isExtended = (ewbClean) =>
    extensionHistory.some(h => h.ewb === ewbClean && h.success) ||
    existingExtensions[ewbClean]?.is_success;

  const getExistingExtension = (ewbClean) => existingExtensions[ewbClean] || null;
  const currentExisting = activeEwb ? getExistingExtension(activeEwb) : null;

  const extendedCount = challanEwbList.filter(item => isExtended(item.ewb.replace(/[-\s]/g, ''))).length;

  return (
    <div className="space-y-6">
      {/* ── Header Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 rounded-xl">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Extend E-Way Bill Validity</h2>
                <p className="text-sm text-amber-100">
                  Challan #{challanDetails?.challan_no} &middot; {challanEwbList.length} EWB{challanEwbList.length !== 1 ? 's' : ''}
                  {truckNumber && <span> &middot; Truck: {truckNumber}</span>}
                </p>
              </div>
            </div>
            {challanEwbList.length > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{extendedCount}/{challanEwbList.length}</div>
                <div className="text-xs text-amber-100">Extended</div>
              </div>
            )}
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMode('challan'); setResult(null); setError(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'challan'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Package className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              From Challan
            </button>
            <button
              onClick={() => { setMode('manual'); setSelectedEwb(null); setResult(null); setError(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'manual'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Other EWB
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {mode === 'challan'
              ? 'Select an E-Way Bill from this challan to extend its validity.'
              : 'Enter any E-Way Bill number to extend its validity.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Left: EWB Selection ── */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full">
            {mode === 'challan' ? (
              <>
                {/* Filter */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={ewbFilter}
                      onChange={(e) => setEwbFilter(e.target.value)}
                      placeholder="Filter by EWB, GR, consignee, city..."
                      className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-gray-400"
                    />
                    {ewbFilter && (
                      <button onClick={() => setEwbFilter('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {/* EWB List */}
                <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
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
                  {filteredEwbs.map((item) => {
                    const clean = item.ewb.replace(/[-\s]/g, '');
                    const extended = isExtended(clean);
                    const extData = getExistingExtension(clean);
                    const isSelected = selectedEwb && selectedEwb.ewb.replace(/[-\s]/g, '') === clean;
                    return (
                      <button
                        key={clean}
                        onClick={() => handleSelectEwb(item)}
                        className={`w-full text-left px-4 py-3 transition-all hover:bg-amber-50 ${
                          isSelected
                            ? 'bg-amber-50 border-l-4 border-l-amber-500'
                            : 'border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-gray-900">{formatEwbNumber(item.ewb)}</span>
                              {extended && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                              {item.grNo && <span className="font-medium">GR: {item.grNo}</span>}
                              {item.destination && <span>&middot; {item.destination}</span>}
                            </div>
                            {item.consignee && (
                              <div className="text-xs text-gray-400 mt-0.5 truncate">To: {item.consignee}</div>
                            )}
                            {extData?.valid_upto && (
                              <div className="text-xs text-emerald-600 mt-0.5 font-medium">Valid upto: {extData.valid_upto}</div>
                            )}
                          </div>
                          {extended && (
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
                    <Hash className="w-4 h-4 inline mr-1 -mt-0.5 text-amber-500" />
                    E-Way Bill Number
                  </label>
                  <input
                    type="text"
                    value={formatEwbInput(manualEwb)}
                    onChange={(e) => {
                      const formatted = formatEwbInput(e.target.value);
                      const cleaned = formatted.replace(/-/g, '');
                      setManualEwb(cleaned);
                      // Auto-fetch when 12 digits entered
                      if (cleaned.length === 12) {
                        fetchEwbAutoData(cleaned);
                      }
                    }}
                    placeholder="Enter EWB (e.g. 4480-0919-5664)"
                    maxLength={14}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-gray-400"
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    Enter any E-Way Bill number to extend its validity.
                  </p>
                </div>
                {manualEwb && manualEwb.length === 12 && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-700 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">EWB: {formatEwbNumber(manualEwb)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Extend Form ── */}
        <div className="xl:col-span-3 space-y-5">
          {/* Selected EWB Info */}
          {activeEwb && mode === 'challan' && selectedEwb && (
            <div className={`rounded-2xl p-4 border-2 ${
              currentExisting?.is_success
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Selected E-Way Bill</p>
                  <p className="font-mono text-lg font-bold text-gray-900">{formatEwbNumber(selectedEwb.ewb)}</p>
                </div>
                {currentExisting?.is_success && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-200 text-emerald-800 rounded-full text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Previously Extended
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
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
              {/* Show existing extension details */}
              {currentExisting?.is_success && (
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {currentExisting.valid_upto && (
                      <div>
                        <p className="text-emerald-600 font-medium">Valid Upto</p>
                        <p className="text-gray-900 font-semibold">{currentExisting.valid_upto}</p>
                      </div>
                    )}
                    {currentExisting.updated_date && (
                      <div>
                        <p className="text-emerald-600 font-medium">Extended On</p>
                        <p className="text-gray-900 font-semibold">{currentExisting.updated_date}</p>
                      </div>
                    )}
                    {currentExisting.vehicle_number && (
                      <div>
                        <p className="text-emerald-600 font-medium">Vehicle</p>
                        <p className="font-mono text-gray-900 font-semibold">{currentExisting.vehicle_number}</p>
                      </div>
                    )}
                    {currentExisting.transport_mode_label && (
                      <div>
                        <p className="text-emerald-600 font-medium">Mode</p>
                        <p className="text-gray-900">{currentExisting.transport_mode_label}</p>
                      </div>
                    )}
                    {currentExisting.remaining_distance && (
                      <div>
                        <p className="text-emerald-600 font-medium">Distance</p>
                        <p className="text-gray-900">{currentExisting.remaining_distance} km</p>
                      </div>
                    )}
                    {currentExisting.place_of_consignor && (
                      <div>
                        <p className="text-emerald-600 font-medium">Place</p>
                        <p className="text-gray-900">{currentExisting.place_of_consignor}</p>
                      </div>
                    )}
                    {currentExisting.extend_validity_reason && (
                      <div>
                        <p className="text-emerald-600 font-medium">Reason</p>
                        <p className="text-gray-900">{currentExisting.extend_validity_reason}</p>
                      </div>
                    )}
                    {currentExisting.extend_remarks && (
                      <div>
                        <p className="text-emerald-600 font-medium">Remarks</p>
                        <p className="text-gray-900">{currentExisting.extend_remarks}</p>
                      </div>
                    )}
                    {currentExisting.from_pincode && (
                      <div>
                        <p className="text-emerald-600 font-medium">Pincode</p>
                        <p className="font-mono text-gray-900">{currentExisting.from_pincode}</p>
                      </div>
                    )}
                  </div>
                  {currentExisting.pdf_url && (
                    <a
                      href={currentExisting.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Previous EWB PDF
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No selection prompt */}
          {!activeEwb && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">
                {mode === 'challan' ? 'Select an E-Way Bill' : 'Enter an E-Way Bill'}
              </h3>
              <p className="text-sm text-gray-400">
                {mode === 'challan'
                  ? 'Choose an E-Way Bill from the list to extend its validity.'
                  : 'Type an E-Way Bill number above to get started.'}
              </p>
            </div>
          )}

          {/* ── Extend Form ── */}
          {activeEwb && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  {currentExisting?.is_success ? 'Re-extend Validity' : 'Extend Validity Details'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Fill in the required information to extend the E-Way Bill validity.</p>
              </div>

              <div className="p-5 space-y-5">
                {/* ── Row 1: Vehicle & Transport Mode ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Truck className="w-4 h-4 inline mr-1 -mt-0.5 text-amber-500" />
                      Vehicle Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.vehicle_number}
                      onChange={(e) => handleInputChange('vehicle_number', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="e.g. KA12TR1234"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    {truckNumber && formData.vehicle_number === truckNumber && (
                      <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Auto-filled from challan
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Mode of Transport <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {TRANSPORT_MODES.map(m => (
                        <button
                          key={m.value}
                          onClick={() => handleInputChange('mode_of_transport', m.value)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                            formData.mode_of_transport === m.value
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Row 2: Location & State ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <MapPin className="w-4 h-4 inline mr-1 -mt-0.5 text-amber-500" />
                      Place of Consignment <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.place_of_consignor}
                      onChange={(e) => handleInputChange('place_of_consignor', e.target.value)}
                      placeholder="e.g. Dehradun"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div ref={stateDropdownRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <MapPinned className="w-4 h-4 inline mr-1 -mt-0.5 text-amber-500" />
                      State <span className="text-red-500">*</span>
                    </label>
                    <div
                      className="w-full flex items-center border border-gray-300 rounded-xl bg-white hover:border-amber-400 transition-colors cursor-pointer"
                      onClick={() => setShowStateDropdown(!showStateDropdown)}
                    >
                      <span className="flex-1 px-3 py-2.5 text-sm text-gray-900">
                        {formData.state_of_consignor || 'Select state...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 mx-3 text-gray-400 transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />
                    </div>
                    {showStateDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={stateSearch}
                            onChange={(e) => setStateSearch(e.target.value)}
                            placeholder="Search state..."
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-44 overflow-y-auto">
                          {filteredStates.map(state => (
                            <div
                              key={state}
                              onClick={() => {
                                handleInputChange('state_of_consignor', state);
                                setShowStateDropdown(false);
                                setStateSearch('');
                              }}
                              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                                formData.state_of_consignor === state
                                  ? 'bg-amber-50 text-amber-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {state}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Distance Finder ── */}
                <DistanceFinder
                  onDistanceFound={(km) => handleInputChange('remaining_distance', String(km))}
                />

                {/* ── Row 3: Distance & Pincodes ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Navigation className="w-4 h-4 inline mr-1 -mt-0.5 text-amber-500" />
                      Remaining Distance (km) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.remaining_distance}
                      onChange={(e) => handleInputChange('remaining_distance', e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    {ewbFetchLoading && (
                      <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Fetching from EWB...
                      </p>
                    )}
                    {!ewbFetchLoading && formData.remaining_distance && activeEwb && (
                      <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Auto-filled from EWB
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Building className="w-4 h-4 inline mr-1 -mt-0.5 text-amber-500" />
                      From Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.from_pincode}
                      onChange={(e) => handleInputChange('from_pincode', e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 202001"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <p className="mt-1 text-xs text-gray-400">Default: 202001</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <MapPin className="w-4 h-4 inline mr-1 -mt-0.5 text-amber-500" />
                      To Pincode
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={toPincode}
                      onChange={(e) => setToPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Auto from EWB"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    {ewbFetchLoading && (
                      <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Fetching...
                      </p>
                    )}
                    {!ewbFetchLoading && toPincode && (
                      <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> From EWB consignee
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Row 4: Reason & Remarks ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reason for Extension <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.extend_validity_reason}
                      onChange={(e) => handleInputChange('extend_validity_reason', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      {EXTEND_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Remarks <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.extend_remarks}
                      onChange={(e) => handleInputChange('extend_remarks', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Select Remarks...</option>
                      {EXTEND_REMARKS_OPTIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── Conditional: Road - optional doc ── */}
                {formData.mode_of_transport === '1' && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Transporter Document
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Document Number</label>
                        <input
                          type="text"
                          value={formData.transporter_document_number}
                          onChange={(e) => handleInputChange('transporter_document_number', e.target.value)}
                          placeholder="Document number (optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                        {formData.transporter_document_number === challanNo && challanNo && (
                          <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Auto-filled from challan
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Document Date</label>
                        <input
                          type="text"
                          value={formData.transporter_document_date}
                          onChange={(e) => handleInputChange('transporter_document_date', e.target.value)}
                          placeholder="DD/MM/YYYY (optional)"
                          maxLength={10}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                        {formData.transporter_document_date === dispatchDate && dispatchDate && (
                          <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Auto-filled dispatch date
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Conditional: In Transit (mode 5) — transit type + address ── */}
                {formData.mode_of_transport === '5' && (
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 space-y-4">
                    <p className="text-sm font-medium text-purple-800 flex items-center gap-1.5">
                      <Info className="w-4 h-4" />
                      In Transit Details
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-purple-700 mb-1.5">Transit Type <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        {TRANSIT_TYPES.map(tt => (
                          <button
                            key={tt.value}
                            onClick={() => handleInputChange('transit_type', tt.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                              formData.transit_type === tt.value
                                ? 'bg-purple-500 text-white border-purple-500'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            {tt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Address fields — only for mode 5 */}
                    <div>
                      <label className="block text-xs font-medium text-purple-700 mb-1.5">
                        <Building className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                        Address <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={formData.address_line1}
                          onChange={(e) => handleInputChange('address_line1', e.target.value)}
                          placeholder="Address Line 1"
                          className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <input
                          type="text"
                          value={formData.address_line2}
                          onChange={(e) => handleInputChange('address_line2', e.target.value)}
                          placeholder="Address Line 2"
                          className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <input
                          type="text"
                          value={formData.address_line3}
                          onChange={(e) => handleInputChange('address_line3', e.target.value)}
                          placeholder="Address Line 3"
                          className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Info: Road mode address not needed ── */}
                {formData.mode_of_transport === '1' && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600">
                      <strong>Road Mode:</strong> Consignment is on road — address fields and transit type are not required and will be sent as blank.
                    </p>
                  </div>
                )}

                {/* ── User GSTIN ── */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User GSTIN</label>
                  <input
                    type="text"
                    value={formData.userGstin}
                    onChange={(e) => handleInputChange('userGstin', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono bg-gray-50"
                  />
                </div>

                {/* ── Timing Info ── */}
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    <strong>Note:</strong> E-Way Bill validity can only be extended within 8 hours before or 8 hours after the expiry time. Only the current transporter (or the generator if no transporter is assigned) can extend.
                  </p>
                </div>

                {/* ── Error ── */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* ── Success ── */}
                {result?.success && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-emerald-700 mb-3">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-bold text-base">E-Way Bill Validity Extended!</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-emerald-600 text-xs font-medium">EWB Number</p>
                        <p className="font-mono font-semibold text-gray-900">{formatEwbNumber(result.ewbNumber)}</p>
                      </div>
                      {result.validUpto && (
                        <div>
                          <p className="text-emerald-600 text-xs font-medium">Valid Upto</p>
                          <p className="font-semibold text-gray-900">{result.validUpto}</p>
                        </div>
                      )}
                      {result.updatedDate && (
                        <div>
                          <p className="text-emerald-600 text-xs font-medium">Updated Date</p>
                          <p className="font-semibold text-gray-900">{result.updatedDate}</p>
                        </div>
                      )}
                    </div>
                    {result.pdfUrl && (
                      <a
                        href={result.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download Updated EWB PDF
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* ── Submit ── */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !activeEwb}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Extending Validity...
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5" />
                      Extend E-Way Bill Validity
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Extension History (this session) ── */}
          {extensionHistory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Extension History (this session)
                </h3>
                <span className="text-xs px-2 py-1 bg-emerald-200 text-emerald-800 rounded-full font-medium">
                  {extensionHistory.length} extended
                </span>
              </div>
              <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                {extensionHistory.map((h, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <span className="font-mono text-sm font-semibold text-gray-900">{formatEwbNumber(h.ewb)}</span>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        {h.validUpto && <span>Valid upto: {h.validUpto}</span>}
                        {h.updatedDate && <span>Updated: {h.updatedDate}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {h.pdfUrl && (
                        <a
                          href={h.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-medium hover:bg-emerald-200 transition-colors flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </a>
                      )}
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
