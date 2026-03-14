'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  FileText, Send, Loader2, CheckCircle, AlertTriangle, Plus, Trash2, Copy,
  ExternalLink, Download, ChevronDown, ChevronUp, Package, Truck, MapPin, IndianRupee,
  Upload, X, ClipboardPaste, FileJson, Zap, Search, Hash, Building
} from 'lucide-react';
import supabase from '../../app/utils/supabase';

// ── Indian states list ──
const INDIAN_STATES = [
  'ANDAMAN AND NICOBAR ISLANDS', 'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM',
  'BIHAR', 'CHANDIGARH', 'CHHATTISGARH', 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  'DELHI', 'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH', 'JAMMU AND KASHMIR',
  'JHARKHAND', 'KARNATAKA', 'KERALA', 'LADAKH', 'LAKSHADWEEP', 'MADHYA PRADESH',
  'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA',
  'PUDUCHERRY', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL NADU', 'TELANGANA',
  'TRIPURA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL'
];

const SUPPLY_TYPES = ['outward', 'inward'];
const DOC_TYPES = ['Tax Invoice', 'Bill of Supply', 'Bill of Entry', 'Delivery Challan', 'Credit Note', 'Others'];
const TRANSPORT_MODES = ['Road', 'Rail', 'Air', 'Ship', 'In Transit'];
const VEHICLE_TYPES = ['Regular', 'ODC'];
const UNIT_OPTIONS = ['PCS', 'BOX', 'KGS', 'NOS', 'MTR', 'LTR', 'BAG', 'SET', 'BDL', 'ROL', 'OTH'];

const EMPTY_ITEM = {
  product_name: '',
  product_description: '',
  hsn_code: '',
  quantity: '',
  unit_of_product: 'PCS',
  cgst_rate: 0,
  sgst_rate: 0,
  igst_rate: 0,
  cess_rate: 0,
  cessNonAdvol: 0,
  taxable_amount: '',
};

function todayDDMMYYYY() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// ── Extracted sub-components (outside main component to avoid re-mount on every render) ──

function FormInput({ label, value, onChange, placeholder, required, type = 'text', maxLength, disabled, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options, required, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function FormSection({ id, icon: Icon, title, color, expanded, onToggle, children }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-3 ${color} transition-colors`}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && <div className="px-5 py-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function GenerateEwbSection({ transitDetails, challanDetails }) {

  const DEFAULT_USER_GSTIN = '09COVPS5556J1ZT';

  // ── GR list from challan transit details (grouped by GR number) ──
  const challanGrList = useMemo(() => {
    if (!transitDetails) return [];
    const grMap = {};
    transitDetails.forEach(transit => {
      const grNo = transit.gr_no;
      if (!grNo) return;
      if (!grMap[grNo]) {
        grMap[grNo] = {
          grNo,
          ewbs: [],
          consignor: transit.bilty?.consignor_name || transit.station?.consignor || '',
          consignee: transit.bilty?.consignee_name || transit.station?.consignee || '',
          destination: transit.toCity?.city_name || transit.station?.station || transit.bilty?.to_location || '',
        };
      }
      if (transit.bilty?.e_way_bill) {
        transit.bilty.e_way_bill.split(',').filter(e => e.trim()).forEach(e => {
          if (!grMap[grNo].ewbs.includes(e.trim())) grMap[grNo].ewbs.push(e.trim());
        });
      }
      if (transit.station?.e_way_bill) {
        transit.station.e_way_bill.split(',').filter(e => e.trim()).forEach(e => {
          if (!grMap[grNo].ewbs.includes(e.trim())) grMap[grNo].ewbs.push(e.trim());
        });
      }
    });
    // Only include GRs that have at least one EWB
    return Object.values(grMap).filter(gr => gr.ewbs.length > 0);
  }, [transitDetails]);

  // ── Truck number from challan ──
  const truckNumber = useMemo(() => {
    if (challanDetails?.truck?.truck_number) {
      return challanDetails.truck.truck_number.replace(/-/g, '').toUpperCase();
    }
    return '';
  }, [challanDetails]);

  // ── Form state ──
  const [formData, setFormData] = useState({
    userGstin: '09COVPS5556J1ZT',
    supply_type: 'outward',
    sub_supply_type: 'Supply',
    sub_supply_description: '',
    document_type: 'Tax Invoice',
    document_number: '',
    document_date: todayDDMMYYYY(),
    gstin_of_consignor: '',
    legal_name_of_consignor: '',
    address1_of_consignor: '',
    address2_of_consignor: '',
    place_of_consignor: '',
    pincode_of_consignor: '',
    state_of_consignor: 'UTTAR PRADESH',
    actual_from_state_name: 'UTTAR PRADESH',
    gstin_of_consignee: '',
    legal_name_of_consignee: '',
    address1_of_consignee: '',
    address2_of_consignee: '',
    place_of_consignee: '',
    pincode_of_consignee: '',
    state_of_supply: 'UTTAR PRADESH',
    actual_to_state_name: 'UTTAR PRADESH',
    transaction_type: 1,
    taxable_amount: '',
    cgst_amount: '',
    sgst_amount: '',
    igst_amount: 0,
    cess_amount: 0,
    cess_nonadvol_value: 0,
    other_value: 0,
    total_invoice_value: '',
    transporter_id: '09COVPS5556J1ZT',
    transporter_name: 'S S TRANSPORT CORPORATION',
    transporter_document_number: '',
    transporter_document_date: '',
    vehicle_number: '',
    vehicle_type: 'Regular',
    transportation_mode: 'Road',
    transportation_distance: '',
    generate_status: 1,
    data_source: 'erp',
  });

  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState(null);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [jsonSuccess, setJsonSuccess] = useState('');

  // ── GR selector state ──
  const [grFilter, setGrFilter] = useState('');
  const [selectedGr, setSelectedGr] = useState(null); // selected GR item
  const [grEwbRecords, setGrEwbRecords] = useState([]); // ewb_validations rows for selected GR
  const [selectedEwbRecord, setSelectedEwbRecord] = useState(null); // chosen EWB record from DB
  const [loadingEwbData, setLoadingEwbData] = useState(false);
  const [grFetchError, setGrFetchError] = useState('');
  const [grFetchSuccess, setGrFetchSuccess] = useState('');

  // Filtered GR list
  const filteredGrList = useMemo(() => {
    if (!grFilter.trim()) return challanGrList;
    const q = grFilter.toLowerCase();
    return challanGrList.filter(item =>
      (item.grNo && item.grNo.toLowerCase().includes(q)) ||
      (item.consignor && item.consignor.toLowerCase().includes(q)) ||
      (item.consignee && item.consignee.toLowerCase().includes(q)) ||
      (item.destination && item.destination.toLowerCase().includes(q)) ||
      item.ewbs.some(e => e.toLowerCase().includes(q))
    );
  }, [challanGrList, grFilter]);

  const [expandedSections, setExpandedSections] = useState({
    consignor: true,
    consignee: true,
    transport: true,
    amounts: true,
    items: true,
  });

  // Toggle collapse
  const toggle = (key) => setExpandedSections((p) => ({ ...p, [key]: !p[key] }));

  // ── Helpers ──
  const handleChange = useCallback((field, value) => {
    setFormData((p) => ({ ...p, [field]: value }));
  }, []);

  const handleItemChange = useCallback((idx, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }, []);

  const addItem = () => setItems((p) => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));

  // ── JSON Import: parse and fill ──
  // Returns { success, filledFields, error } — callers decide where to show feedback
  const parseAndFillJson = useCallback((raw) => {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      // Dig into nested structure — handle all possible nesting patterns:
      // data.data.results.message | data.results.message | results.message | message | top-level
      const msg = parsed?.data?.data?.results?.message
        || parsed?.data?.results?.message
        || parsed?.results?.message
        || parsed?.message
        || parsed;

      // If msg is a string (not object), it's not the data we need
      if (typeof msg !== 'object' || msg === null) {
        return { success: false, error: 'Could not find EWB data in the JSON. Expected data.results.message object.' };
      }

      // Transaction type mapping
      const txnMap = { 'Regular': 1, 'Bill To-Ship To': 2, 'Bill From-Dispatch From': 3, 'Combination of 2 and 3': 4 };

      // Vehicle from VehiclListDetails array or top-level
      const veh = msg.VehiclListDetails?.[0] || msg.vehiclListDetails?.[0] || {};

      // Use functional update to avoid stale closure on formData
      setFormData(prev => {
        const newForm = { ...prev };

        // Always force userGstin to locked value
        newForm.userGstin = DEFAULT_USER_GSTIN;
        if (msg.supply_type) newForm.supply_type = msg.supply_type.toLowerCase();
        if (msg.sub_supply_type) newForm.sub_supply_type = msg.sub_supply_type;
        if (msg.sub_supply_description) newForm.sub_supply_description = msg.sub_supply_description;
        if (msg.document_type) newForm.document_type = msg.document_type;
        if (msg.document_number) newForm.document_number = msg.document_number;
        if (msg.document_date) newForm.document_date = msg.document_date;

        // Consignor
        if (msg.gstin_of_consignor) newForm.gstin_of_consignor = String(msg.gstin_of_consignor).trim();
        if (msg.legal_name_of_consignor) newForm.legal_name_of_consignor = String(msg.legal_name_of_consignor).trim();
        if (msg.address1_of_consignor) newForm.address1_of_consignor = String(msg.address1_of_consignor).trim();
        if (msg.address2_of_consignor) newForm.address2_of_consignor = String(msg.address2_of_consignor).trim();
        if (msg.place_of_consignor) newForm.place_of_consignor = String(msg.place_of_consignor).trim();
        if (msg.pincode_of_consignor) newForm.pincode_of_consignor = String(msg.pincode_of_consignor).trim();
        if (msg.state_of_consignor) newForm.state_of_consignor = String(msg.state_of_consignor).trim().toUpperCase();
        if (msg.actual_from_state_name) newForm.actual_from_state_name = String(msg.actual_from_state_name).trim().toUpperCase();

        // Consignee
        if (msg.gstin_of_consignee) newForm.gstin_of_consignee = String(msg.gstin_of_consignee).trim();
        if (msg.legal_name_of_consignee) newForm.legal_name_of_consignee = String(msg.legal_name_of_consignee).trim();
        if (msg.address1_of_consignee) newForm.address1_of_consignee = String(msg.address1_of_consignee).trim();
        if (msg.address2_of_consignee) newForm.address2_of_consignee = String(msg.address2_of_consignee).trim();
        if (msg.place_of_consignee) newForm.place_of_consignee = String(msg.place_of_consignee).trim();
        if (msg.pincode_of_consignee) newForm.pincode_of_consignee = String(msg.pincode_of_consignee).trim();
        if (msg.state_of_supply) newForm.state_of_supply = String(msg.state_of_supply).trim().toUpperCase();
        if (msg.actual_to_state_name) newForm.actual_to_state_name = String(msg.actual_to_state_name).trim().toUpperCase();

        // Transaction
        if (msg.transaction_type) {
          newForm.transaction_type = typeof msg.transaction_type === 'string'
            ? (txnMap[msg.transaction_type] || 1)
            : msg.transaction_type;
        }

        // Amounts
        if (msg.taxable_amount != null) newForm.taxable_amount = msg.taxable_amount;
        if (msg.cgst_amount != null) newForm.cgst_amount = msg.cgst_amount;
        if (msg.sgst_amount != null) newForm.sgst_amount = msg.sgst_amount;
        if (msg.igst_amount != null) newForm.igst_amount = msg.igst_amount;
        if (msg.cess_amount != null) newForm.cess_amount = msg.cess_amount;
        if (msg.cess_nonadvol_value != null) newForm.cess_nonadvol_value = msg.cess_nonadvol_value;
        if (msg.other_value != null) newForm.other_value = msg.other_value;
        if (msg.total_invoice_value != null) newForm.total_invoice_value = msg.total_invoice_value;

        // Transport
        if (msg.transporter_id) newForm.transporter_id = msg.transporter_id;
        if (msg.transporter_name) newForm.transporter_name = msg.transporter_name;
        if (msg.transportation_distance != null) newForm.transportation_distance = String(msg.transportation_distance);

        // Vehicle
        if (msg.vehicle_number || veh.vehicle_number) {
          newForm.vehicle_number = (msg.vehicle_number || veh.vehicle_number || '').toUpperCase();
        }
        if (msg.vehicle_type || veh.vehicle_type) {
          const vt = (msg.vehicle_type || veh.vehicle_type || 'Regular');
          newForm.vehicle_type = vt.charAt(0).toUpperCase() + vt.slice(1).toLowerCase();
        }
        if (veh.transportation_mode) {
          const modeStr = veh.transportation_mode;
          if (TRANSPORT_MODES.includes(modeStr)) newForm.transportation_mode = modeStr;
        }
        if (veh.transporter_document_number) newForm.transporter_document_number = veh.transporter_document_number;
        if (veh.transporter_document_date) newForm.transporter_document_date = veh.transporter_document_date;

        return newForm;
      });

      // Items
      if (Array.isArray(msg.itemList) && msg.itemList.length > 0) {
        const newItems = msg.itemList.map((it) => ({
          product_name: it.product_name || it.product_description || '',
          product_description: it.product_description || it.product_name || '',
          hsn_code: String(it.hsn_code || ''),
          quantity: it.quantity || '',
          unit_of_product: it.unit_of_product || 'PCS',
          cgst_rate: it.cgst_rate || 0,
          sgst_rate: it.sgst_rate || 0,
          igst_rate: it.igst_rate || 0,
          cess_rate: it.cess_rate || 0,
          cessNonAdvol: it.cessNonAdvol || 0,
          taxable_amount: it.taxable_amount || '',
        }));
        setItems(newItems);
      }

      // Count what was filled
      const filledFields = [];
      if (msg.document_number) filledFields.push('Document');
      if (msg.gstin_of_consignor) filledFields.push('Consignor');
      if (msg.gstin_of_consignee) filledFields.push('Consignee');
      if (msg.taxable_amount != null) filledFields.push('Amounts');
      if (msg.itemList?.length) filledFields.push(`${msg.itemList.length} Items`);
      if (veh.vehicle_number || msg.vehicle_number) filledFields.push('Vehicle');

      setResult(null);
      setErrors(null);
      return { success: true, filledFields };
    } catch (err) {
      return { success: false, error: `Invalid JSON: ${err.message}` };
    }
  }, []); // No dependency on formData — uses functional setFormData

  const handleJsonImport = () => {
    if (!jsonInput.trim()) {
      setJsonError('Please paste JSON data');
      return;
    }
    setJsonError('');
    setJsonSuccess('');
    const res = parseAndFillJson(jsonInput);
    if (res?.success) {
      setJsonSuccess(`Filled: ${res.filledFields.join(', ')}`);
    } else {
      setJsonError(res?.error || 'Failed to parse JSON');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      setJsonInput(text);
      setJsonError('');
      setJsonSuccess('');
      const res = parseAndFillJson(text);
      if (res?.success) {
        setJsonSuccess(`Filled: ${res.filledFields.join(', ')}`);
      } else {
        setJsonError(res?.error || 'Failed to parse JSON');
      }
    };
    reader.onerror = () => setJsonError('Failed to read file');
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJsonInput(text);
        setJsonError('');
        setJsonSuccess('');
        const res = parseAndFillJson(text);
        if (res?.success) {
          setJsonSuccess(`Filled: ${res.filledFields.join(', ')}`);
        } else {
          setJsonError(res?.error || 'Failed to parse JSON');
        }
      }
    } catch {
      setJsonError('Clipboard access denied. Please paste manually.');
    }
  };

  // ── Step 2: Pick a specific EWB record and auto-fill the form ──
  const handlePickEwbRecord = useCallback((record, grItem) => {
    setSelectedEwbRecord(record);
    setGrFetchError('');
    setGrFetchSuccess('');

    const rawJson = record.raw_result_metadata;
    if (!rawJson) {
      setGrFetchError(`EWB ${record.ewb_number} found but raw_result_metadata is empty`);
      return;
    }

    // Use the same parseAndFillJson logic as Import JSON
    const res = parseAndFillJson(rawJson);

    if (res?.success) {
      // Force userGstin & vehicle number from challan
      setFormData(prev => ({
        ...prev,
        userGstin: DEFAULT_USER_GSTIN,
        vehicle_number: truckNumber || prev.vehicle_number,
      }));

      const gr = grItem || selectedGr;
      setGrFetchSuccess(`Auto-filled from EWB ${record.ewb_number} (GR: ${gr?.grNo || record.gr_no}) — ${res.filledFields.join(', ')}`);
    } else {
      setGrFetchError(res?.error || `Failed to parse EWB data for ${record.ewb_number}. Try Copy JSON → Import JSON.`);
    }
  }, [parseAndFillJson, truckNumber, selectedGr]);

  // ── Step 1: Fetch all EWB records for a GR from ewb_validations ──
  const handleSelectGr = useCallback(async (grItem) => {
    setSelectedGr(grItem);
    setSelectedEwbRecord(null);
    setGrEwbRecords([]);
    setGrFetchError('');
    setGrFetchSuccess('');
    setLoadingEwbData(true);

    try {
      const { data, error } = await supabase
        .from('ewb_validations')
        .select('id, raw_result_metadata, ewb_number, gr_no, is_valid, validation_status, validated_at, valid_upto')
        .eq('gr_no', grItem.grNo)
        .order('validated_at', { ascending: false });

      if (error) {
        setGrFetchError(`DB error: ${error.message}`);
        setLoadingEwbData(false);
        return;
      }

      if (!data || data.length === 0) {
        setGrFetchError(`No EWB data found in ewb_validations for GR ${grItem.grNo}`);
        setLoadingEwbData(false);
        return;
      }

      // Deduplicate: keep latest record per ewb_number
      const seen = new Set();
      const unique = data.filter(row => {
        const key = row.ewb_number?.replace(/[-\s]/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setGrEwbRecords(unique);

      // If only one EWB, auto-select it
      if (unique.length === 1) {
        handlePickEwbRecord(unique[0], grItem);
      }
    } catch (err) {
      setGrFetchError(`Failed to fetch: ${err.message}`);
    } finally {
      setLoadingEwbData(false);
    }
  }, [handlePickEwbRecord]);

  // Copy raw JSON to clipboard
  const handleCopyRawJson = useCallback((record) => {
    const json = typeof record.raw_result_metadata === 'string'
      ? record.raw_result_metadata
      : JSON.stringify(record.raw_result_metadata, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setGrFetchSuccess(`Raw JSON for EWB ${record.ewb_number} copied to clipboard!`);
    }).catch(() => {
      setGrFetchError('Failed to copy to clipboard');
    });
  }, []);

  // Pre-fill from challan transits
  const grOptions = useMemo(() => {
    if (!transitDetails) return [];
    return transitDetails.map((t) => ({
      gr_no: t.gr_no,
      consignor: t.bilty?.consigner_name || t.station?.consigner_name || '',
      consignee: t.bilty?.consignee_name || t.station?.consignee_name || '',
      consignorGstin: t.bilty?.consigner_gst || t.station?.consigner_gst || '',
      consigneeGstin: t.bilty?.consignee_gst || t.station?.consignee_gst || '',
    }));
  }, [transitDetails]);

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    setErrors(null);

    try {
      const payload = {
        ...formData,
        pincode_of_consignor: Number(formData.pincode_of_consignor) || 0,
        pincode_of_consignee: Number(formData.pincode_of_consignee) || 0,
        taxable_amount: Number(formData.taxable_amount) || 0,
        cgst_amount: Number(formData.cgst_amount) || 0,
        sgst_amount: Number(formData.sgst_amount) || 0,
        igst_amount: Number(formData.igst_amount) || 0,
        cess_amount: Number(formData.cess_amount) || 0,
        cess_nonadvol_value: Number(formData.cess_nonadvol_value) || 0,
        other_value: Number(formData.other_value) || 0,
        total_invoice_value: Number(formData.total_invoice_value) || 0,
        transportation_distance: String(formData.transportation_distance || '0'),
        itemList: items.map((it) => ({
          ...it,
          quantity: Number(it.quantity) || 0,
          cgst_rate: Number(it.cgst_rate) || 0,
          sgst_rate: Number(it.sgst_rate) || 0,
          igst_rate: Number(it.igst_rate) || 0,
          cess_rate: Number(it.cess_rate) || 0,
          cessNonAdvol: Number(it.cessNonAdvol) || 0,
          taxable_amount: Number(it.taxable_amount) || 0,
        })),
      };

      const res = await fetch('/api/ewb/generate-ewaybill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.status === 'success') {
        setResult(data);
      } else {
        setErrors(data.errors || [data.message || 'Unknown error']);
      }
    } catch (err) {
      setErrors([err.message || 'Network error']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ──

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Generate E-Way Bill</h2>
              <p className="text-sm text-indigo-100">
                Create a new E-Way Bill for Challan #{challanDetails?.challan_no || '...'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setShowJsonImport(true); setJsonError(''); setJsonSuccess(''); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            <FileJson className="w-4 h-4" /> Import JSON
          </button>
        </div>
      </div>

      {/* JSON Import Modal */}
      {showJsonImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowJsonImport(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileJson className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Import EWB JSON</h3>
                  <p className="text-xs text-gray-500">Paste EWB validation/details JSON to auto-fill the form</p>
                </div>
              </div>
              <button onClick={() => setShowJsonImport(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4 flex-1 overflow-y-auto">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" /> Paste from Clipboard
                </button>
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Upload .json File
                  <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">JSON Data</label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => { setJsonInput(e.target.value); setJsonError(''); setJsonSuccess(''); }}
                  placeholder={'Paste your EWB JSON here...\n\nSupported formats:\n- Full API response: { data: { results: { message: {...} } } }\n- Direct message object: { itemList: [...], gstin_of_consignor: "...", ... }'}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-gray-50"
                />
              </div>

              {/* Error */}
              {jsonError && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              {/* Success */}
              {jsonSuccess && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{jsonSuccess}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => { setJsonInput(''); setJsonError(''); setJsonSuccess(''); }}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowJsonImport(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleJsonImport();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Zap className="w-4 h-4" /> Fill Form
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GR Number Selector ── */}
      {challanGrList.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="px-5 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-violet-600" />
                <span className="font-semibold text-sm text-violet-800">Select GR to Auto-Fill from EWB Data</span>
                <span className="text-xs bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-medium">{challanGrList.length} GRs</span>
              </div>
              {selectedGr && (
                <button
                  type="button"
                  onClick={() => { setSelectedGr(null); setGrEwbRecords([]); setSelectedEwbRecord(null); setGrFetchError(''); setGrFetchSuccess(''); }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {/* Search */}
            {challanGrList.length > 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={grFilter}
                  onChange={(e) => setGrFilter(e.target.value)}
                  placeholder="Search by GR no, EWB, consignor, consignee, destination..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            )}

            {/* GR cards */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredGrList.map((item, idx) => {
                const isActive = selectedGr?.grNo === item.grNo;
                return (
                  <button
                    key={`${item.grNo}-${idx}`}
                    type="button"
                    onClick={() => handleSelectGr(item)}
                    disabled={loadingEwbData}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      isActive
                        ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                        : 'border-gray-200 bg-gray-50/50 hover:bg-violet-50 hover:border-violet-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-800">GR: {item.grNo}</span>
                          <span className="text-xs text-gray-500 font-mono">
                            {item.ewbs.length} EWB{item.ewbs.length > 1 ? 's' : ''}: {item.ewbs.join(', ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {item.consignor && <span className="hidden sm:inline">{item.consignor}</span>}
                        {item.destination && (
                          <span className="flex items-center gap-1 text-violet-600 font-medium">
                            <MapPin className="w-3 h-3" /> {item.destination}
                          </span>
                        )}
                        {isActive && loadingEwbData && <Loader2 className="w-4 h-4 animate-spin text-violet-600" />}
                        {isActive && !loadingEwbData && selectedEwbRecord && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                    </div>
                    {item.consignee && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                        <Building className="w-3 h-3" /> To: {item.consignee}
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredGrList.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">No matching GR found</p>
              )}
            </div>

            {/* Step 2: EWB records found for a GR — pick one to auto-fill */}
            {selectedGr && grEwbRecords.length > 0 && (
              <div className="border border-indigo-200 rounded-lg bg-indigo-50/50 p-4 space-y-2">
                <p className="text-xs font-semibold text-indigo-800">
                  {grEwbRecords.length} EWB{grEwbRecords.length > 1 ? 's' : ''} found for GR {selectedGr.grNo} — {grEwbRecords.length > 1 ? 'select one to auto-fill:' : 'click to auto-fill or copy JSON:'}
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {grEwbRecords.map((rec) => {
                    const isChosen = selectedEwbRecord?.id === rec.id;
                    const validDate = rec.valid_upto ? new Date(rec.valid_upto).toLocaleDateString('en-IN') : '';
                    return (
                      <div
                        key={rec.id}
                        className={`px-3 py-2.5 rounded-md border text-xs transition-all ${
                          isChosen
                            ? 'border-indigo-400 bg-indigo-100 ring-1 ring-indigo-300'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-800">{rec.ewb_number}</span>
                            {rec.is_valid ? (
                              <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[10px] font-medium">Valid</span>
                            ) : (
                              <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[10px] font-medium">Invalid</span>
                            )}
                            {validDate && <span className="text-gray-400">till {validDate}</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleCopyRawJson(rec); }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded transition-colors"
                              title="Copy raw JSON to clipboard"
                            >
                              <Copy className="w-3 h-3" /> Copy JSON
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handlePickEwbRecord(rec); }}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                                isChosen
                                  ? 'text-green-700 bg-green-100 border border-green-300'
                                  : 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200 border border-indigo-200'
                              }`}
                            >
                              {isChosen ? <><CheckCircle className="w-3 h-3" /> Filled</> : <><Zap className="w-3 h-3" /> Fill Form</>}
                            </button>
                          </div>
                        </div>
                        {rec.validation_status && (
                          <p className="mt-0.5 text-gray-500">{rec.validation_status}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fetch feedback */}
            {grFetchError && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{grFetchError}</span>
              </div>
            )}
            {grFetchSuccess && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{grFetchSuccess}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">E-Way Bill Generated Successfully!</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3 border border-green-100">
              <p className="text-xs text-gray-500">EWB Number</p>
              <p className="font-bold text-green-800 text-lg">{result.ewayBillNo}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-100">
              <p className="text-xs text-gray-500">Generated On</p>
              <p className="font-semibold text-gray-800">{result.ewayBillDate}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-100">
              <p className="text-xs text-gray-500">Valid Upto</p>
              <p className="font-semibold text-gray-800">{result.validUpto}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" /> Download PDF
              </a>
            )}
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-green-700 border border-green-300 rounded-lg text-sm hover:bg-green-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open PDF
              </a>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(String(result.ewayBillNo));
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-4 h-4" /> Copy EWB No.
            </button>
            <button
              onClick={() => { setResult(null); setErrors(null); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Generate Another
            </button>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Errors Found</span>
          </div>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          <button
            onClick={() => setErrors(null)}
            className="text-xs text-red-500 hover:underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Document Info */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="font-semibold text-sm text-gray-700">Document Information</span>
              </div>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormInput label="User GSTIN" value={formData.userGstin} onChange={(v) => handleChange('userGstin', v)} placeholder="09COVPS5556J1ZT" required disabled />
              <FormSelect label="Supply Type" value={formData.supply_type} onChange={(v) => handleChange('supply_type', v)} options={SUPPLY_TYPES} required />
              <FormInput label="Sub Supply Type" value={formData.sub_supply_type} onChange={(v) => handleChange('sub_supply_type', v)} placeholder="Supply" required />
              <FormSelect label="Document Type" value={formData.document_type} onChange={(v) => handleChange('document_type', v)} options={DOC_TYPES} required />
              <FormInput label="Document Number" value={formData.document_number} onChange={(v) => handleChange('document_number', v)} placeholder="INV/25-26/001" required maxLength={16} />
              <FormInput label="Document Date (dd/mm/yyyy)" value={formData.document_date} onChange={(v) => handleChange('document_date', v)} placeholder="14/03/2026" required />
            </div>
          </div>

          {/* Consignor */}
          <FormSection id="consignor" icon={MapPin} title="Consignor (From) Details" color="bg-blue-50 text-blue-800 hover:bg-blue-100" expanded={expandedSections.consignor} onToggle={() => toggle('consignor')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormInput label="GSTIN" value={formData.gstin_of_consignor} onChange={(v) => handleChange('gstin_of_consignor', v)} placeholder="09AABFM8846M1ZM or URP" required />
              <FormInput label="Legal Name" value={formData.legal_name_of_consignor} onChange={(v) => handleChange('legal_name_of_consignor', v)} placeholder="MODERN LOCK MFG. CO." />
              <FormInput label="Address Line 1" value={formData.address1_of_consignor} onChange={(v) => handleChange('address1_of_consignor', v)} placeholder="KOTHI NO.1 BANNA DEVI" />
              <FormInput label="Address Line 2" value={formData.address2_of_consignor} onChange={(v) => handleChange('address2_of_consignor', v)} placeholder="" />
              <FormInput label="Place" value={formData.place_of_consignor} onChange={(v) => handleChange('place_of_consignor', v)} placeholder="ALIGARH" />
              <FormInput label="Pincode" value={formData.pincode_of_consignor} onChange={(v) => handleChange('pincode_of_consignor', v)} placeholder="202001" required type="number" />
              <FormSelect label="State" value={formData.state_of_consignor} onChange={(v) => handleChange('state_of_consignor', v)} options={INDIAN_STATES} required />
              <FormSelect label="Actual From State" value={formData.actual_from_state_name} onChange={(v) => handleChange('actual_from_state_name', v)} options={INDIAN_STATES} />
            </div>
          </FormSection>

          {/* Consignee */}
          <FormSection id="consignee" icon={MapPin} title="Consignee (To) Details" color="bg-green-50 text-green-800 hover:bg-green-100" expanded={expandedSections.consignee} onToggle={() => toggle('consignee')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormInput label="GSTIN" value={formData.gstin_of_consignee} onChange={(v) => handleChange('gstin_of_consignee', v)} placeholder="09ASMPS6146H1Z5 or URP" required />
              <FormInput label="Legal Name" value={formData.legal_name_of_consignee} onChange={(v) => handleChange('legal_name_of_consignee', v)} placeholder="M.A ENTERPRISES" />
              <FormInput label="Address Line 1" value={formData.address1_of_consignee} onChange={(v) => handleChange('address1_of_consignee', v)} placeholder="127, DONDIPUR ALLAHABAD" />
              <FormInput label="Address Line 2" value={formData.address2_of_consignee} onChange={(v) => handleChange('address2_of_consignee', v)} placeholder="" />
              <FormInput label="Place" value={formData.place_of_consignee} onChange={(v) => handleChange('place_of_consignee', v)} placeholder="ALLAHABAD" />
              <FormInput label="Pincode" value={formData.pincode_of_consignee} onChange={(v) => handleChange('pincode_of_consignee', v)} placeholder="211003" required type="number" />
              <FormSelect label="State of Supply" value={formData.state_of_supply} onChange={(v) => handleChange('state_of_supply', v)} options={INDIAN_STATES} required />
              <FormSelect label="Actual To State" value={formData.actual_to_state_name} onChange={(v) => handleChange('actual_to_state_name', v)} options={INDIAN_STATES} />
            </div>
          </FormSection>

          {/* Transport */}
          <FormSection id="transport" icon={Truck} title="Transportation Details" color="bg-purple-50 text-purple-800 hover:bg-purple-100" expanded={expandedSections.transport} onToggle={() => toggle('transport')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormSelect label="Mode" value={formData.transportation_mode} onChange={(v) => handleChange('transportation_mode', v)} options={TRANSPORT_MODES} required />
              <FormInput label="Distance (km)" value={formData.transportation_distance} onChange={(v) => handleChange('transportation_distance', v)} placeholder="563 or 0 for auto" required />
              <FormInput label="Vehicle Number" value={formData.vehicle_number} onChange={(v) => handleChange('vehicle_number', v)} placeholder="UP81CT9947" />
              <FormSelect label="Vehicle Type" value={formData.vehicle_type} onChange={(v) => handleChange('vehicle_type', v)} options={VEHICLE_TYPES} />
              <FormInput label="Transporter GSTIN" value={formData.transporter_id} onChange={(v) => handleChange('transporter_id', v)} placeholder="09COVPS5556J1ZT" />
              <FormInput label="Transporter Name" value={formData.transporter_name} onChange={(v) => handleChange('transporter_name', v)} placeholder="S S TRANSPORT CORPORATION" />
              <FormInput label="Transporter Doc No." value={formData.transporter_document_number} onChange={(v) => handleChange('transporter_document_number', v)} placeholder="" />
              <FormInput label="Transporter Doc Date" value={formData.transporter_document_date} onChange={(v) => handleChange('transporter_document_date', v)} placeholder="dd/mm/yyyy" />
            </div>
          </FormSection>

          {/* Amounts */}
          <FormSection id="amounts" icon={IndianRupee} title="Amount Details" color="bg-amber-50 text-amber-800 hover:bg-amber-100" expanded={expandedSections.amounts} onToggle={() => toggle('amounts')}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <FormInput label="Taxable Amount" value={formData.taxable_amount} onChange={(v) => handleChange('taxable_amount', v)} placeholder="303239.75" required type="number" />
              <FormInput label="CGST Amount" value={formData.cgst_amount} onChange={(v) => handleChange('cgst_amount', v)} placeholder="27291.59" type="number" />
              <FormInput label="SGST Amount" value={formData.sgst_amount} onChange={(v) => handleChange('sgst_amount', v)} placeholder="27291.59" type="number" />
              <FormInput label="IGST Amount" value={formData.igst_amount} onChange={(v) => handleChange('igst_amount', v)} placeholder="0" type="number" />
              <FormInput label="CESS Amount" value={formData.cess_amount} onChange={(v) => handleChange('cess_amount', v)} placeholder="0" type="number" />
              <FormInput label="CESS Non-Advol" value={formData.cess_nonadvol_value} onChange={(v) => handleChange('cess_nonadvol_value', v)} placeholder="0" type="number" />
              <FormInput label="Other Value" value={formData.other_value} onChange={(v) => handleChange('other_value', v)} placeholder="0" type="number" />
              <FormInput label="Total Invoice Value" value={formData.total_invoice_value} onChange={(v) => handleChange('total_invoice_value', v)} placeholder="357823" required type="number" />
            </div>
            <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700">
              <strong>Note:</strong> Sum of taxable + cgst + sgst + igst + cess + other must be &le; total_invoice_value (Rs.2 grace).
              Use CGST+SGST for intra-state, IGST for inter-state.
            </div>
          </FormSection>

          {/* Items */}
          <FormSection id="items" icon={Package} title={`Item List (${items.length} item${items.length > 1 ? 's' : ''})`} color="bg-teal-50 text-teal-800 hover:bg-teal-100" expanded={expandedSections.items} onToggle={() => toggle('items')}>
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase">Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Product Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={item.product_name}
                        onChange={(e) => handleItemChange(idx, 'product_name', e.target.value)}
                        placeholder="DOVE CAB HDL"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <input
                        type="text"
                        value={item.product_description}
                        onChange={(e) => handleItemChange(idx, 'product_description', e.target.value)}
                        placeholder="DOVE CAB HDL ROSE GOLD 8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">HSN Code <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={item.hsn_code}
                        onChange={(e) => handleItemChange(idx, 'hsn_code', e.target.value)}
                        placeholder="83024110"
                        maxLength={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quantity <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        placeholder="36"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Unit <span className="text-red-500">*</span></label>
                      <select
                        value={item.unit_of_product}
                        onChange={(e) => handleItemChange(idx, 'unit_of_product', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CGST Rate (%)</label>
                      <input
                        type="number"
                        value={item.cgst_rate}
                        onChange={(e) => handleItemChange(idx, 'cgst_rate', e.target.value)}
                        placeholder="9"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">SGST Rate (%)</label>
                      <input
                        type="number"
                        value={item.sgst_rate}
                        onChange={(e) => handleItemChange(idx, 'sgst_rate', e.target.value)}
                        placeholder="9"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">IGST Rate (%)</label>
                      <input
                        type="number"
                        value={item.igst_rate}
                        onChange={(e) => handleItemChange(idx, 'igst_rate', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Taxable Amount <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        value={item.taxable_amount}
                        onChange={(e) => handleItemChange(idx, 'taxable_amount', e.target.value)}
                        placeholder="2745"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CESS Rate</label>
                      <input
                        type="number"
                        value={item.cess_rate}
                        onChange={(e) => handleItemChange(idx, 'cess_rate', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CESS Non-Advol</label>
                      <input
                        type="number"
                        value={item.cessNonAdvol}
                        onChange={(e) => handleItemChange(idx, 'cessNonAdvol', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addItem}
                className="w-full py-2.5 border-2 border-dashed border-teal-300 rounded-lg text-sm font-medium text-teal-600 hover:bg-teal-50 hover:border-teal-400 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </FormSection>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating E-Way Bill...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Generate E-Way Bill
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 hidden sm:block">
              All required fields marked with <span className="text-red-500">*</span> must be filled.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
