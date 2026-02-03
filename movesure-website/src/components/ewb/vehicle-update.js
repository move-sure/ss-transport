'use client';

import React, { useState, useCallback } from 'react';
import { Truck, AlertCircle, CheckCircle2, Loader2, FileText, Search, Hash, X, Package, Building, MapPin, Calendar } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const DEFAULT_USER_GSTIN = '09COVPS5556J1ZT';

export default function VehicleUpdate() {
  // Search state
  const [searchType, setSearchType] = useState('grno'); // 'ewb' or 'grno'
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  
  // Fetched data state
  const [biltyData, setBiltyData] = useState(null);
  const [ewbNumbers, setEwbNumbers] = useState([]);
  const [selectedEwbIndex, setSelectedEwbIndex] = useState(0);

  const [formData, setFormData] = useState({
    userGstin: DEFAULT_USER_GSTIN,
    ewayBillNumber: '',
    vehicleNumber: '',
    vehicleType: 'r',
    placeOfConsignor: '',
    stateOfConsignor: '',
    reasonCodeForVehicleUpdation: 'Due To Transhipment',
    modeOfTransport: '1',
    transporterDocumentNumber: '',
    transporterDocumentDate: '',
    reasonForVehicleUpdation: '',
    dataSource: ''
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const transportModes = [
    { value: '1', label: 'Road' },
    { value: '2', label: 'Rail' },
    { value: '3', label: 'Air' },
    { value: '4', label: 'Ship' }
  ];

  const reasonCodes = [
    { value: 'First Time', label: 'First Time' },
    { value: 'Due To Break Down', label: 'Due To Break Down' },
    { value: 'Due To Transhipment', label: 'Due To Transhipment' },
    { value: 'Others', label: 'Others' }
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  // Format EWB number with hyphens as user types (XXXX-XXXX-XXXX)
  const formatEwbInput = (value) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 12);
    const parts = [];
    for (let i = 0; i < limited.length; i += 4) {
      parts.push(limited.slice(i, i + 4));
    }
    return parts.join('-');
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    if (searchType === 'ewb') {
      setSearchQuery(formatEwbInput(value));
    } else {
      setSearchQuery(value.toUpperCase());
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setBiltyData(null);
    setEwbNumbers([]);
    setSelectedEwbIndex(0);
    setSearchError(null);
    setResult(null);
    setError(null);
    setFormData({
      userGstin: DEFAULT_USER_GSTIN,
      ewayBillNumber: '',
      vehicleNumber: '',
      vehicleType: 'r',
      placeOfConsignor: '',
      stateOfConsignor: '',
      reasonCodeForVehicleUpdation: 'Due To Transhipment',
      modeOfTransport: '1',
      transporterDocumentNumber: '',
      transporterDocumentDate: '',
      reasonForVehicleUpdation: '',
      dataSource: ''
    });
  };

  // Search for bilty by EWB or GR number
  const handleSearch = useCallback(async () => {
    const rawQuery = searchQuery.trim();
    const cleanQuery = rawQuery.replace(/[-\s]/g, '');
    
    if (!cleanQuery) {
      setSearchError('Please enter a search term');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setBiltyData(null);
    setEwbNumbers([]);
    setResult(null);
    setError(null);

    try {
      let biltyResult = null;
      let stationResult = null;

      if (searchType === 'ewb') {
        // Search by E-Way Bill number in bilty table
        const { data: biltyData, error: biltyError } = await supabase
          .from('bilty')
          .select(`
            id,
            gr_no,
            branch_id,
            bilty_date,
            consignor_name,
            consignor_gst,
            consignee_name,
            consignee_gst,
            e_way_bill,
            no_of_pkg,
            wt,
            total,
            pvt_marks,
            from_city_id,
            to_city_id,
            contain,
            payment_mode,
            created_at
          `)
          .or(`e_way_bill.ilike.%${cleanQuery}%,e_way_bill.ilike.%${rawQuery}%`)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (biltyError) throw new Error(biltyError.message || 'Failed to search bilty table');
        
        if (biltyData && biltyData.length > 0) {
          biltyResult = biltyData.find(b => {
            if (!b.e_way_bill) return false;
            const ewbList = b.e_way_bill.split(',').map(e => e.trim().replace(/[-\s]/g, ''));
            return ewbList.some(ewb => ewb.includes(cleanQuery) || cleanQuery.includes(ewb));
          }) || biltyData[0];
        }

        // Fetch city details
        if (biltyResult && biltyResult.from_city_id) {
          const { data: cityData } = await supabase
            .from('cities')
            .select('id, city_name, city_code')
            .eq('id', biltyResult.from_city_id)
            .single();
          if (cityData) biltyResult.from_city = cityData;
        }

        // Also search in station_bilty_summary if not found
        if (!biltyResult) {
          const { data: stationData, error: stationError } = await supabase
            .from('station_bilty_summary')
            .select('*')
            .or(`e_way_bill.ilike.%${cleanQuery}%,e_way_bill.ilike.%${rawQuery}%`)
            .order('created_at', { ascending: false })
            .limit(1);

          if (stationError) throw new Error(stationError.message);
          stationResult = stationData?.[0];
        }
      } else {
        // Search by GR number - use EXACT match
        const { data: stationData, error: stationError } = await supabase
          .from('station_bilty_summary')
          .select('*')
          .eq('gr_no', cleanQuery)
          .order('created_at', { ascending: false })
          .limit(1);

        if (stationError) throw new Error(stationError.message);
        stationResult = stationData?.[0];

        // If not found in station, search in bilty table
        if (!stationResult) {
          const { data: biltyData, error: biltyError } = await supabase
            .from('bilty')
            .select(`
              id,
              gr_no,
              branch_id,
              bilty_date,
              consignor_name,
              consignor_gst,
              consignee_name,
              consignee_gst,
              e_way_bill,
              no_of_pkg,
              wt,
              total,
              pvt_marks,
              from_city_id,
              to_city_id,
              contain,
              payment_mode,
              created_at
            `)
            .eq('gr_no', cleanQuery)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);

          if (biltyError) throw new Error(biltyError.message);
          biltyResult = biltyData?.[0];
        }

        // Fetch city details
        if (biltyResult && biltyResult.from_city_id) {
          const { data: cityData } = await supabase
            .from('cities')
            .select('id, city_name, city_code')
            .eq('id', biltyResult.from_city_id)
            .single();
          if (cityData) biltyResult.from_city = cityData;
        }
      }

      const foundData = biltyResult || stationResult;
      
      if (!foundData) {
        setSearchError(`No record found for ${searchType === 'ewb' ? 'E-Way Bill' : 'GR Number'}: ${searchQuery}`);
        return;
      }

      // Extract EWB numbers from the record
      const ewbs = foundData.e_way_bill 
        ? foundData.e_way_bill.split(',').filter(e => e.trim()).map(e => e.trim())
        : [];

      setBiltyData({
        ...foundData,
        source: biltyResult ? 'bilty' : 'station',
        hasNoEwb: ewbs.length === 0
      });

      if (ewbs.length === 0) {
        setEwbNumbers([]);
        setSelectedEwbIndex(0);
        setFormData(prev => ({
          ...prev,
          ewayBillNumber: ''
        }));
        return;
      }

      // If searching by EWB, pre-select the matching EWB
      let selectedIndex = 0;
      if (searchType === 'ewb' && ewbs.length > 1) {
        const matchIndex = ewbs.findIndex(ewb => {
          const cleanEwb = ewb.replace(/[-\s]/g, '');
          return cleanEwb.includes(cleanQuery) || cleanQuery.includes(cleanEwb);
        });
        if (matchIndex >= 0) selectedIndex = matchIndex;
      }

      setEwbNumbers(ewbs);
      setSelectedEwbIndex(selectedIndex);
      
      // Auto-fill form with selected EWB and consignor place
      const selectedEwb = ewbs[selectedIndex];
      setFormData(prev => ({
        ...prev,
        ewayBillNumber: selectedEwb.replace(/[-\s]/g, ''),
        placeOfConsignor: foundData.from_city?.city_name || foundData.consignor_name || ''
      }));

    } catch (err) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Failed to search');
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searchType]);

  // Handle EWB selection change
  const handleEwbSelect = (index) => {
    setSelectedEwbIndex(index);
    const selectedEwb = ewbNumbers[index];
    setFormData(prev => ({
      ...prev,
      ewayBillNumber: selectedEwb.replace(/[-\s]/g, '')
    }));
    setResult(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
    setResult(null);
  };

  const validateForm = () => {
    if (!formData.userGstin.trim()) {
      setError('User GSTIN is required');
      return false;
    }
    if (!formData.ewayBillNumber.trim()) {
      setError('E-Way Bill Number is required');
      return false;
    }
    if (!formData.vehicleNumber.trim()) {
      setError('Vehicle Number is required');
      return false;
    }
    if (!formData.placeOfConsignor.trim()) {
      setError('Place of Consignor is required');
      return false;
    }
    if (!formData.stateOfConsignor) {
      setError('State of Consignor is required');
      return false;
    }
    // Rail(2), Air(3), Ship(4) require transport document
    if (['2', '3', '4'].includes(formData.modeOfTransport) && !formData.transporterDocumentNumber.trim()) {
      setError('Transport Document Number is required for Rail/Air/Ship transport');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ewb/update-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        setError(data.message || 'Failed to update vehicle details');
        return;
      }

      setResult(data);

    } catch (err) {
      setError(err.message || 'Failed to update vehicle details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Vehicle Update (Part-B)</h2>
            <p className="text-sm text-slate-600 mt-1">
              Update vehicle number and transport details for any E-Way Bill
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">🔍 Search E-Way Bill</h3>
        
        {/* Search Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setSearchType('grno'); setSearchQuery(''); setSearchError(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              searchType === 'grno'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Hash className="w-4 h-4" />
            Search by GR No
          </button>
          <button
            type="button"
            onClick={() => { setSearchType('ewb'); setSearchQuery(''); setSearchError(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              searchType === 'ewb'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Search by EWB No
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchType === 'ewb' ? 'Enter E-Way Bill Number (e.g., 1234-5678-9012)' : 'Enter GR Number (e.g., ALG12345)'}
              className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {searching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Search
          </button>
        </div>

        {/* Search Error */}
        {searchError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{searchError}</p>
          </div>
        )}
      </div>

      {/* Bilty Details Card */}
      {biltyData && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">📦 Bilty Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">GR Number</p>
                <p className="font-semibold text-slate-900">{biltyData.gr_no}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Consignor</p>
                <p className="font-semibold text-slate-900 truncate">{biltyData.consignor_name || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">From</p>
                <p className="font-semibold text-slate-900">{biltyData.from_city?.city_name || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Packages</p>
                <p className="font-semibold text-slate-900">{biltyData.no_of_pkg || 0}</p>
              </div>
            </div>
          </div>

          {/* EWB Selection */}
          {ewbNumbers.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Select E-Way Bill to Update:</h4>
              <div className="flex flex-wrap gap-2">
                {ewbNumbers.map((ewb, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleEwbSelect(index)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedEwbIndex === index
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {ewb}
                  </button>
                ))}
              </div>
            </div>
          )}

          {biltyData.hasNoEwb && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">⚠️ No E-Way Bill found in this record. Please enter EWB number manually below.</p>
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">Vehicle Updated Successfully!</h3>
              <div className="mt-3 space-y-2 text-sm text-green-800">
                {result.vehUpdateDate && <p><strong>Update Date:</strong> {result.vehUpdateDate}</p>}
                {result.validUpto && <p><strong>Valid Until:</strong> {result.validUpto}</p>}
                {result.pdfUrl && (
                  <a
                    href={result.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">🚛 Vehicle Details Form</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User GSTIN - Read Only */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              User GSTIN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="userGstin"
              value={formData.userGstin}
              readOnly
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
            />
          </div>

          {/* E-Way Bill Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              E-Way Bill Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="ewayBillNumber"
              value={formData.ewayBillNumber}
              onChange={handleChange}
              placeholder="e.g., 123456789012"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Mode of Transport */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mode of Transport <span className="text-red-500">*</span>
            </label>
            <select
              name="modeOfTransport"
              value={formData.modeOfTransport}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {transportModes.map(mode => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </div>

          {/* Vehicle Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Vehicle Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={handleChange}
              placeholder="e.g., DL01AB1234"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              required
            />
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Vehicle Type <span className="text-red-500">*</span>
            </label>
            <select
              name="vehicleType"
              value={formData.vehicleType}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="r">Regular</option>
              <option value="o">Over-dimensional Cargo</option>
            </select>
          </div>

          {/* Place of Consignor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Place of Consignor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="placeOfConsignor"
              value={formData.placeOfConsignor}
              onChange={handleChange}
              placeholder="e.g., Mumbai"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* State of Consignor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              State of Consignor <span className="text-red-500">*</span>
            </label>
            <select
              name="stateOfConsignor"
              value={formData.stateOfConsignor}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select State</option>
              {indianStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* Reason Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reason for Update <span className="text-red-500">*</span>
            </label>
            <select
              name="reasonCodeForVehicleUpdation"
              value={formData.reasonCodeForVehicleUpdation}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {reasonCodes.map(reason => (
                <option key={reason.value} value={reason.value}>{reason.label}</option>
              ))}
            </select>
          </div>

          {/* Transport Document Number (conditional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Transport Document Number {['2', '3', '4'].includes(formData.modeOfTransport) && <span className="text-red-500">*</span>}
              {formData.modeOfTransport === '1' && <span className="text-slate-500 text-xs ml-1">(Optional for Road)</span>}
            </label>
            <input
              type="text"
              name="transporterDocumentNumber"
              value={formData.transporterDocumentNumber}
              onChange={handleChange}
              placeholder={formData.modeOfTransport === '2' ? 'e.g., RR98765' : formData.modeOfTransport === '3' ? 'e.g., AWB12345' : formData.modeOfTransport === '4' ? 'e.g., BL45678' : 'e.g., LR123456'}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={['2', '3', '4'].includes(formData.modeOfTransport)}
            />
          </div>

          {/* Transport Document Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Transport Document Date
            </label>
            <input
              type="date"
              name="transporterDocumentDate"
              value={formData.transporterDocumentDate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Additional Reason */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Reason (Optional)
            </label>
            <textarea
              name="reasonForVehicleUpdation"
              value={formData.reasonForVehicleUpdation}
              onChange={handleChange}
              placeholder="Enter any additional details..."
              rows="3"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                Update Vehicle
              </>
            )}
          </button>
          <button
            type="button"
            onClick={clearSearch}
            disabled={loading}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📋 Important Validation Rules:</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>Authorization:</strong> Only generator or assigned transporter can update Part-B</li>
          <li>• <strong>E-Way Bill Status:</strong> Must be active (not cancelled or expired)</li>
          <li>• <strong>Vehicle Number:</strong> Always required for all transport modes</li>
          <li>• <strong>Road Transport:</strong> Transport document number is optional</li>
          <li>• <strong>Rail/Air/Ship:</strong> Transport document number is <strong>mandatory</strong></li>
          <li>• <strong>Vehicle Format:</strong> Valid registration format (e.g., DL01AB1234, UP35BT1886)</li>
          <li>• <strong>Document Date:</strong> Cannot be earlier than invoice/e-way bill date</li>
          <li>• <strong>Validity Period:</strong> E-Way Bill must be within validity period</li>
        </ul>
      </div>
    </div>
  );
}
