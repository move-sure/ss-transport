'use client';

import React, { useState, useMemo } from 'react';
import { Search, FileText, Package, Truck, MapPin, Calendar, IndianRupee, User, Building2, Hash, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp, ArrowRight, X, Plus, Eye, Code } from 'lucide-react';
import { formatEwbNumber } from '../../utils/ewbValidation';

const DEFAULT_USER_GSTIN = '09COVPS5556J1ZT';
const API_BASE = 'https://movesure-backend.onrender.com';

export default function EwbDetailSection({ transitDetails = [], challanDetails = null }) {
  const [mode, setMode] = useState('challan'); // 'challan' | 'manual'
  const [selectedEwb, setSelectedEwb] = useState(null);
  const [manualEwb, setManualEwb] = useState('');
  const [ewbFilter, setEwbFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ewbData, setEwbData] = useState(null);
  const [showItems, setShowItems] = useState(false);
  const [showVehicles, setShowVehicles] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // Extract EWB list from challan (same pattern as extend-ewb-section)
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

  // Filter challan EWBs
  const filteredEwbs = useMemo(() => {
    if (!ewbFilter.trim()) return challanEwbList;
    const q = ewbFilter.toLowerCase();
    return challanEwbList.filter(item =>
      item.ewb.toLowerCase().includes(q) ||
      (item.grNo && String(item.grNo).toLowerCase().includes(q)) ||
      item.consignee.toLowerCase().includes(q) ||
      item.consignor.toLowerCase().includes(q) ||
      item.destination.toLowerCase().includes(q)
    );
  }, [challanEwbList, ewbFilter]);

  // Active EWB number
  const activeEwb = useMemo(() => {
    if (mode === 'challan' && selectedEwb) return selectedEwb.ewb.replace(/[-\s]/g, '');
    if (mode === 'manual' && manualEwb.trim()) return manualEwb.replace(/[-\s]/g, '');
    return null;
  }, [mode, selectedEwb, manualEwb]);

  const fetchEwbDetails = async (ewbNumber) => {
    if (!ewbNumber) {
      setError('Please enter or select an EWB number');
      return;
    }

    const cleaned = String(ewbNumber).replace(/[-\s]/g, '');
    if (!cleaned || cleaned.length < 10) {
      setError('Invalid EWB number');
      return;
    }

    setLoading(true);
    setError('');
    setEwbData(null);
    setShowItems(false);
    setShowVehicles(false);

    try {
      const url = `${API_BASE}/api/ewaybill?eway_bill_number=${cleaned}&gstin=${DEFAULT_USER_GSTIN}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || json.message || 'Failed to fetch EWB details');
      }

      // API returns { status: "success", data: { results: { message: {...} } } }
      if (json.status !== 'success' && !json.success) {
        throw new Error(json.error || json.message || 'Failed to fetch EWB details');
      }

      const message = json.data?.results?.message;
      if (!message) {
        throw new Error('No EWB data found in response');
      }

      setEwbData(message);
      setShowRaw(false);
    } catch (err) {
      setError(err.message || 'Failed to fetch EWB details');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEwb = (item) => {
    setSelectedEwb(item);
    setError('');
    fetchEwbDetails(item.ewb);
  };

  const handleManualSearch = () => {
    if (!manualEwb.trim()) return;
    setError('');
    fetchEwbDetails(manualEwb.trim());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    if (dateStr.includes('/')) return dateStr;
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '₹0.00';
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status) => {
    if (!status) return 'gray';
    const s = String(status).toUpperCase();
    if (s === 'ACT' || s === 'ACTIVE') return 'green';
    if (s === 'CNL' || s === 'CANCELLED') return 'red';
    if (s === 'EXP' || s === 'EXPIRED') return 'orange';
    if (s === 'GENERATED') return 'green';
    return 'blue';
  };

  // Get latest vehicle number from VehiclListDetails
  const getLatestVehicle = (data) => {
    if (data?.VehiclListDetails?.length > 0) {
      return data.VehiclListDetails[data.VehiclListDetails.length - 1].vehicle_number || '-';
    }
    return '-';
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 rounded-xl">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">E-Way Bill Details</h2>
                <p className="text-sm text-teal-100">
                  Challan #{challanDetails?.challan_no} &middot; {challanEwbList.length} EWB{challanEwbList.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {challanEwbList.length > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{challanEwbList.length}</div>
                <div className="text-xs text-teal-100">Total EWBs</div>
              </div>
            )}
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMode('challan'); setError(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'challan'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Package className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              From Challan
            </button>
            <button
              onClick={() => { setMode('manual'); setSelectedEwb(null); setError(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'manual'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Other EWB
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {mode === 'challan'
              ? 'Select an E-Way Bill from this challan to view its full details.'
              : 'Enter any E-Way Bill number to search and view details.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left: EWB Selection */}
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
                      className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400"
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
                  {filteredEwbs.length === 0 && (
                    <div className="p-6 text-center text-sm text-gray-400">
                      {ewbFilter ? 'No matching E-Way Bills' : 'No E-Way Bills in this challan'}
                    </div>
                  )}
                  {filteredEwbs.map((item) => {
                    const clean = item.ewb.replace(/[-\s]/g, '');
                    const isSelected = selectedEwb && selectedEwb.ewb.replace(/[-\s]/g, '') === clean;
                    return (
                      <button
                        key={clean}
                        onClick={() => handleSelectEwb(item)}
                        className={`w-full text-left px-4 py-3 transition-all hover:bg-teal-50 ${
                          isSelected
                            ? 'bg-teal-50 border-l-4 border-l-teal-500'
                            : 'border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-gray-900">{formatEwbNumber(item.ewb)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                              {item.grNo && <span className="font-medium">GR: {item.grNo}</span>}
                              {item.destination && <span>&middot; {item.destination}</span>}
                            </div>
                            {item.consignee && (
                              <div className="text-xs text-gray-400 mt-0.5 truncate">To: {item.consignee}</div>
                            )}
                          </div>
                          {isSelected && (
                            <ArrowRight className="w-4 h-4 text-teal-500 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Manual EWB Entry */
              <div className="p-5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
                  Enter EWB Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualEwb}
                    onChange={(e) => setManualEwb(e.target.value)}
                    placeholder="e.g. 4516 9364 4839"
                    className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                  />
                  <button
                    onClick={handleManualSearch}
                    disabled={loading || !manualEwb.trim()}
                    className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors font-medium text-sm"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-3">Search any E-Way Bill by entering its number above.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: EWB Details */}
        <div className="xl:col-span-3">
          {/* Error */}
          {error && (
            (error.includes('325') || error.toLowerCase().includes('could not retrieve')) ? (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-300 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-orange-100 rounded-lg flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-orange-800">EWB Not Assigned to Your GSTIN</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      This E-Way Bill is not transferred to your GSTIN —{' '}
                      <span className="font-mono font-semibold text-orange-900">{DEFAULT_USER_GSTIN}</span>.
                      You cannot view its details until the transporter is updated to your GSTIN.
                    </p>
                    <div className="mt-3 flex items-start gap-2.5 p-3 bg-white border border-orange-200 rounded-lg">
                      <div className="p-1 bg-teal-100 rounded flex-shrink-0 mt-0.5">
                        <Truck className="w-3.5 h-3.5 text-teal-700" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">How to fix:</p>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                          Go to{' '}
                          <span className="font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            Step 3 → Transporter Update
                          </span>{' '}
                          in the left menu and update the transporter GSTIN to{' '}
                          <span className="font-mono font-semibold text-teal-800">{DEFAULT_USER_GSTIN}</span>.
                          Then come back here to view the full EWB details.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )
          )}

          {/* Loading */}
          {loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-10 h-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-sm text-gray-500">Fetching EWB details...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !ewbData && !error && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-teal-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">View E-Way Bill Details</h3>
              <p className="text-sm text-gray-500">Select an EWB from the challan list or search any EWB to view complete details</p>
            </div>
          )}

        {/* EWB Details */}
        {ewbData && !loading && (
          <div className="space-y-4">
            {/* Status Header */}
            <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
              getStatusColor(ewbData.eway_bill_status) === 'green' ? 'border-green-200' :
              getStatusColor(ewbData.eway_bill_status) === 'red' ? 'border-red-200' :
              getStatusColor(ewbData.eway_bill_status) === 'orange' ? 'border-orange-200' : 'border-blue-200'
            }`}>
              <div className={`px-5 py-4 ${
                getStatusColor(ewbData.eway_bill_status) === 'green' ? 'bg-gradient-to-r from-green-600 to-green-700' :
                getStatusColor(ewbData.eway_bill_status) === 'red' ? 'bg-gradient-to-r from-red-600 to-red-700' :
                getStatusColor(ewbData.eway_bill_status) === 'orange' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                'bg-gradient-to-r from-blue-600 to-blue-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">EWB: {formatEwbNumber(String(ewbData.eway_bill_number || ''))}</h2>
                      <p className="text-white/80 text-xs">Generated: {formatDate(ewbData.eway_bill_date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-sm font-semibold text-white">
                      {getStatusColor(ewbData.eway_bill_status) === 'green' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      {ewbData.eway_bill_status || 'Unknown'}
                    </span>
                    {ewbData.extended_times > 0 && (
                      <p className="text-white/70 text-xs mt-1">Extended {ewbData.extended_times} time(s)</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Value</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{formatCurrency(ewbData.total_invoice_value)}</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 uppercase font-medium">Distance</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{ewbData.transportation_distance || 0} KM</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 uppercase font-medium">Valid Upto</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{formatDate(ewbData.eway_bill_valid_date)}</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 uppercase font-medium">Doc No</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{ewbData.document_number || '-'}</p>
                </div>
              </div>
            </div>

            {/* Consignor & Consignee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Consignor */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Consignor (From)</h3>
                </div>
                <div className="p-4 space-y-2">
                  <InfoRow label="Name" value={ewbData.legal_name_of_consignor} />
                  <InfoRow label="GSTIN" value={ewbData.gstin_of_consignor} mono />
                  <InfoRow label="Address" value={[ewbData.address1_of_consignor, ewbData.address2_of_consignor].filter(Boolean).join(', ')} />
                  <InfoRow label="Place" value={ewbData.place_of_consignor} />
                  <InfoRow label="State" value={ewbData.actual_from_state_name || ewbData.state_of_consignor || '-'} />
                  <InfoRow label="Pincode" value={ewbData.pincode_of_consignor} />
                </div>
              </div>

              {/* Consignee */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Consignee (To)</h3>
                </div>
                <div className="p-4 space-y-2">
                  <InfoRow label="Name" value={ewbData.legal_name_of_consignee} />
                  <InfoRow label="GSTIN" value={ewbData.gstin_of_consignee} mono />
                  <InfoRow label="Address" value={[ewbData.address1_of_consignee, ewbData.address2_of_consignee].filter(Boolean).join(', ')} />
                  <InfoRow label="Place" value={ewbData.place_of_consignee} />
                  <InfoRow label="State" value={ewbData.actual_to_state_name || ewbData.state_of_supply || '-'} />
                  <InfoRow label="Pincode" value={ewbData.pincode_of_consignee} />
                </div>
              </div>
            </div>

            {/* Transport & Tax Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Transport */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Transport Details</h3>
                </div>
                <div className="p-4 space-y-2">
                  <InfoRow label="Transporter ID" value={ewbData.transporter_id} mono />
                  <InfoRow label="Transporter" value={ewbData.transporter_name} />
                  <InfoRow label="Vehicle No" value={getLatestVehicle(ewbData)} />
                  <InfoRow label="Vehicle Type" value={ewbData.vehicle_type} />
                  <InfoRow label="Transaction" value={ewbData.transaction_type} />
                  <InfoRow label="Supply Type" value={ewbData.supply_type} />
                  <InfoRow label="Sub Supply" value={ewbData.sub_supply_type} />
                  <InfoRow label="Document Type" value={ewbData.document_type} />
                  <InfoRow label="Document Date" value={formatDate(ewbData.document_date)} />
                  <InfoRow label="Generate Mode" value={ewbData.generate_mode} />
                </div>
              </div>

              {/* Tax */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Tax & Value Details</h3>
                </div>
                <div className="p-4 space-y-2">
                  <InfoRow label="Taxable Amount" value={formatCurrency(ewbData.taxable_amount)} />
                  <InfoRow label="CGST" value={formatCurrency(ewbData.cgst_amount)} />
                  <InfoRow label="SGST" value={formatCurrency(ewbData.sgst_amount)} />
                  <InfoRow label="IGST" value={formatCurrency(ewbData.igst_amount)} />
                  <InfoRow label="CESS" value={formatCurrency(ewbData.cess_amount)} />
                  <InfoRow label="Non-Advol CESS" value={formatCurrency(ewbData.cess_nonadvol_value)} />
                  <InfoRow label="Other Amount" value={formatCurrency(ewbData.other_value)} />
                  <div className="pt-2 mt-2 border-t border-gray-100">
                    <InfoRow label="Total Value" value={formatCurrency(ewbData.total_invoice_value)} bold />
                  </div>
                </div>
              </div>
            </div>

            {/* Validity & Dates */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-semibold text-gray-800">Validity & Timeline</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
                <DateCard label="EWB Date" value={formatDate(ewbData.eway_bill_date)} />
                <DateCard label="Valid Upto" value={formatDate(ewbData.eway_bill_valid_date)} highlight />
                <DateCard label="Extended Times" value={ewbData.extended_times || 0} />
                <DateCard label="Valid Days" value={ewbData.number_of_valid_days || '-'} />
              </div>
            </div>

            {/* Item List (Collapsible) */}
            {ewbData.itemList && ewbData.itemList.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setShowItems(!showItems)}
                  className="w-full px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Items ({ewbData.itemList.length})</h3>
                  </div>
                  {showItems ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {showItems && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="px-4 py-2 text-left text-xs font-semibold">#</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">HSN</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold">Taxable</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold">CGST</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold">SGST</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold">IGST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ewbData.itemList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-500">{item.item_number || idx + 1}</td>
                            <td className="px-4 py-2 text-gray-900 font-medium">{item.product_description || item.product_name || '-'}</td>
                            <td className="px-4 py-2 text-gray-600 font-mono text-xs">{item.hsn_code || '-'}</td>
                            <td className="px-4 py-2 text-right text-gray-600">{item.quantity || '-'} {item.unit_of_product || ''}</td>
                            <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(item.taxable_amount)}</td>
                            <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(item.cgst_rate)}</td>
                            <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(item.sgst_rate)}</td>
                            <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(item.igst_rate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Vehicle History (Collapsible) */}
            {ewbData.VehiclListDetails && ewbData.VehiclListDetails.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setShowVehicles(!showVehicles)}
                  className="w-full px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Vehicle History ({ewbData.VehiclListDetails.length})</h3>
                  </div>
                  {showVehicles ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {showVehicles && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="px-4 py-2 text-left text-xs font-semibold">#</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">Vehicle No</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">From</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">Updated On</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">Transporter Doc</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ewbData.VehiclListDetails.map((v, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                            <td className="px-4 py-2 text-gray-900 font-semibold font-mono">{v.vehicle_number || '-'}</td>
                            <td className="px-4 py-2 text-gray-600">{v.place_of_consignor || '-'} ({v.state_of_consignor || ''})</td>
                            <td className="px-4 py-2 text-gray-600">{formatDate(v.vehicle_number_update_date)}</td>
                            <td className="px-4 py-2 text-gray-600 font-mono text-xs">{v.transporter_document_number || '-'}</td>
                            <td className="px-4 py-2 text-gray-600">{v.transportation_mode || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Generator Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <Hash className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-semibold text-gray-800">Additional Info</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <InfoRow label="Generate Mode" value={ewbData.generate_mode} />
                <InfoRow label="User GSTIN" value={ewbData.userGstin} mono />
                <InfoRow label="Status" value={ewbData.eway_bill_status} />
                <InfoRow label="Reject Status" value={ewbData.reject_status || 'N'} />
                <InfoRow label="Transaction" value={ewbData.transaction_type} />
                <InfoRow label="Valid Days" value={ewbData.number_of_valid_days} />
              </div>
            </div>
            {/* Raw JSON View */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="w-full px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Raw JSON Response</h3>
                </div>
                {showRaw ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showRaw && (
                <div className="p-4 max-h-96 overflow-auto">
                  <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap break-all bg-gray-50 p-4 rounded-lg border border-gray-100">
                    {JSON.stringify(ewbData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// Helper components
function InfoRow({ label, value, mono = false, bold = false }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-500 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-800'} ${mono ? 'font-mono text-xs' : ''} break-all`}>
        {value || '-'}
      </span>
    </div>
  );
}

function DateCard({ label, value, highlight = false }) {
  return (
    <div className={`p-3 rounded-lg border text-center ${highlight ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-gray-100'}`}>
      <p className={`text-xs font-medium ${highlight ? 'text-teal-600' : 'text-gray-500'} uppercase`}>{label}</p>
      <p className={`text-sm font-bold mt-1 ${highlight ? 'text-teal-800' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
