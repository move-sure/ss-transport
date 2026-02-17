'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, Truck, FileText, Hash, Loader2, X, AlertTriangle, CheckCircle, User, Send, Edit3, Download, ExternalLink, Package, Building, MapPin, Calendar, IndianRupee, RefreshCw, ChevronDown } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { formatEwbNumber } from '../../utils/ewbValidation';
import { saveTransporterUpdate } from '../../utils/ewbValidationStorage';
import { useAuth } from '../../app/utils/auth';

const DEFAULT_USER_GSTIN = '09COVPS5556J1ZT';

export default function StandaloneTransporterUpdate() {
  const { user: currentUser } = useAuth();
  
  // Search state
  const [searchType, setSearchType] = useState('ewb'); // 'ewb' or 'grno'
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  
  // Fetched data state
  const [biltyData, setBiltyData] = useState(null);
  const [ewbNumbers, setEwbNumbers] = useState([]);
  const [selectedEwbIndex, setSelectedEwbIndex] = useState(0);
  const [existingUpdates, setExistingUpdates] = useState({}); // Map of ewb_number -> update data
  
  // Form state
  const [formData, setFormData] = useState({
    user_gstin: DEFAULT_USER_GSTIN,
    eway_bill_number: '',
    transporter_id: '',
    transporter_name: ''
  });
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Auto-fill state
  const [autoFillStatus, setAutoFillStatus] = useState({
    loading: false,
    match: null,
    error: null
  });
  const [transporterSuggestions, setTransporterSuggestions] = useState([]);
  const [transporterSearch, setTransporterSearch] = useState('');
  const [showTransporterDropdown, setShowTransporterDropdown] = useState(false);
  const [selectedTransporterIdx, setSelectedTransporterIdx] = useState(-1);
  const transporterDropdownRef = useRef(null);
  const transporterSearchRef = useRef(null);

  // Get the existing update for currently selected EWB
  const currentExistingUpdate = ewbNumbers[selectedEwbIndex] 
    ? existingUpdates[ewbNumbers[selectedEwbIndex]?.replace(/[-\s]/g, '')] 
    : null;

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
    setExistingUpdates({});
    setFormData({
      user_gstin: DEFAULT_USER_GSTIN,
      eway_bill_number: '',
      transporter_id: '',
      transporter_name: ''
    });
    setAutoFillStatus({ loading: false, match: null, error: null });
    setTransporterSuggestions([]);
    setTransporterSearch('');
    setShowTransporterDropdown(false);
    setSelectedTransporterIdx(-1);
  };

  // Handle selecting a transporter from suggestions
  const handleSelectTransporter = (transporter) => {
    setFormData(prev => ({
      ...prev,
      transporter_id: transporter.gst ? transporter.gst.toUpperCase() : '',
      transporter_name: transporter.name || ''
    }));
    setTransporterSearch('');
    setShowTransporterDropdown(false);
    setSelectedTransporterIdx(-1);
    setAutoFillStatus(prev => ({
      ...prev,
      match: {
        ...prev.match,
        name: transporter.name,
        gst: transporter.gst,
        phone: transporter.phone || null
      }
    }));
  };

  // Filter suggestions based on search
  const filteredTransporterSuggestions = useMemo(() => {
    if (!transporterSearch.trim()) return transporterSuggestions;
    const query = transporterSearch.toLowerCase();
    return transporterSuggestions.filter(t =>
      (t.name && t.name.toLowerCase().includes(query)) ||
      (t.gst && t.gst.toLowerCase().includes(query)) ||
      (t.city && t.city.toLowerCase().includes(query)) ||
      (t.phone && t.phone.includes(query))
    );
  }, [transporterSuggestions, transporterSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (transporterDropdownRef.current && !transporterDropdownRef.current.contains(e.target)) {
        setShowTransporterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for bilty by EWB or GR number
  const handleSearch = useCallback(async () => {
    const rawQuery = searchQuery.trim();
    // Remove hyphens and spaces for EWB search
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
        // The e_way_bill column is varchar(100) and may contain comma-separated values
        // Use ilike with the clean query (no hyphens)
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

        if (biltyError) {
          console.error('Bilty search error:', biltyError);
          throw new Error(biltyError.message || 'Failed to search bilty table');
        }
        
        // Find the bilty that contains the searched EWB
        if (biltyData && biltyData.length > 0) {
          biltyResult = biltyData.find(b => {
            if (!b.e_way_bill) return false;
            const ewbList = b.e_way_bill.split(',').map(e => e.trim().replace(/[-\s]/g, ''));
            return ewbList.some(ewb => ewb.includes(cleanQuery) || cleanQuery.includes(ewb));
          }) || biltyData[0];
        }

        // If found, fetch city details separately
        if (biltyResult && biltyResult.to_city_id) {
          const { data: cityData } = await supabase
            .from('cities')
            .select('id, city_name, city_code')
            .eq('id', biltyResult.to_city_id)
            .single();
          
          if (cityData) {
            biltyResult.to_city = cityData;
          }
        }

        // Also search in station_bilty_summary if not found in bilty
        if (!biltyResult) {
          const { data: stationData, error: stationError } = await supabase
            .from('station_bilty_summary')
            .select('*')
            .or(`e_way_bill.ilike.%${cleanQuery}%,e_way_bill.ilike.%${rawQuery}%`)
            .order('created_at', { ascending: false })
            .limit(1);

          if (stationError) {
            console.error('Station search error:', stationError);
            throw new Error(stationError.message || 'Failed to search station table');
          }
          stationResult = stationData?.[0];
        }
      } else {
        // Search by GR number - use EXACT match (eq) not partial match (ilike)
        // First search in station_bilty_summary (no prefix)
        const { data: stationData, error: stationError } = await supabase
          .from('station_bilty_summary')
          .select('*')
          .eq('gr_no', cleanQuery)
          .order('created_at', { ascending: false })
          .limit(1);

        if (stationError) {
          console.error('Station search error:', stationError);
          throw new Error(stationError.message || 'Failed to search station table');
        }
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

          if (biltyError) {
            console.error('Bilty search error:', biltyError);
            throw new Error(biltyError.message || 'Failed to search bilty table');
          }
          biltyResult = biltyData?.[0];
        }

        // If found in bilty, fetch city details separately
        if (biltyResult && biltyResult.to_city_id) {
          const { data: cityData } = await supabase
            .from('cities')
            .select('id, city_name, city_code')
            .eq('id', biltyResult.to_city_id)
            .single();
          
          if (cityData) {
            biltyResult.to_city = cityData;
          }
        }

        // Also search in station_bilty_summary if not found
        if (!biltyResult) {
          const { data: stationData, error: stationError } = await supabase
            .from('station_bilty_summary')
            .select('*')
            .ilike('gr_no', `%${cleanQuery}%`)
            .order('created_at', { ascending: false })
            .limit(1);

          if (stationError) {
            console.error('Station search error:', stationError);
            throw new Error(stationError.message || 'Failed to search station table');
          }
          stationResult = stationData?.[0];
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

      // Set bilty data even if no EWBs - user can manually enter EWB
      setBiltyData({
        ...foundData,
        source: biltyResult ? 'bilty' : 'station',
        hasNoEwb: ewbs.length === 0
      });

      if (ewbs.length === 0) {
        // No EWB in record - allow manual entry
        setEwbNumbers([]);
        setSelectedEwbIndex(0);
        setFormData(prev => ({
          ...prev,
          eway_bill_number: ''
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
        if (matchIndex >= 0) {
          selectedIndex = matchIndex;
        }
      }

      // Fetch existing transporter updates for all EWBs
      // Search with both formats: with hyphens and without
      const cleanEwbs = ewbs.map(e => e.replace(/[-\s]/g, ''));
      const formattedEwbs = ewbs.map(e => {
        const clean = e.replace(/[-\s]/g, '');
        // Format as XXXX-XXXX-XXXX
        if (clean.length === 12) {
          return `${clean.slice(0,4)}-${clean.slice(4,8)}-${clean.slice(8,12)}`;
        }
        return e;
      });
      
      // Combine both formats for search
      const allEwbFormats = [...new Set([...cleanEwbs, ...formattedEwbs, ...ewbs])];
      
      const { data: existingUpdatesData, error: existingError } = await supabase
        .from('transporter_updates')
        .select('*')
        .in('ewb_number', allEwbFormats)
        .order('updated_at', { ascending: false });

      if (!existingError && existingUpdatesData) {
        const updatesMap = {};
        existingUpdatesData.forEach(update => {
          // Normalize EWB number (remove hyphens) as key
          const normalizedEwb = update.ewb_number.replace(/[-\s]/g, '');
          // Only keep the latest update for each EWB
          if (!updatesMap[normalizedEwb]) {
            updatesMap[normalizedEwb] = update;
          }
        });
        setExistingUpdates(updatesMap);
      }

      setBiltyData({
        ...foundData,
        source: biltyResult ? 'bilty' : 'station'
      });
      setEwbNumbers(ewbs);
      setSelectedEwbIndex(selectedIndex);
      setFormData(prev => ({
        ...prev,
        eway_bill_number: ewbs[selectedIndex]
      }));

    } catch (err) {
      console.error('Search error:', err);
      const errorMessage = err?.message || 'Failed to search. Please try again.';
      setSearchError(errorMessage);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searchType]);

  // Auto-fill transporter based on destination city
  useEffect(() => {
    if (!biltyData) {
      setAutoFillStatus({ loading: false, match: null, error: null });
      setTransporterSuggestions([]);
      return;
    }

    let cancelled = false;

    const lookupTransporter = async () => {
      setAutoFillStatus({ loading: true, match: null, error: null });
      setTransporterSuggestions([]);

      try {
        // Get city info from bilty data
        let targetCityId = null;
        let cityName = null;
        let cityCode = null;

        if (biltyData.to_city) {
          targetCityId = biltyData.to_city.id;
          cityName = biltyData.to_city.city_name;
          cityCode = biltyData.to_city.city_code;
        } else if (biltyData.station) {
          // station_bilty_summary: the "station" field is typically a city code (e.g. "LKO")
          // It could also be in format "CityName(CODE)" or just the city name
          const stationValue = biltyData.station.trim();
          const match = stationValue.match(/^([^()]+?)(?:\(([^()]+)\))?$/);
          const part1 = match?.[1]?.trim() || stationValue;
          const part2 = match?.[2]?.trim() || null;
          
          if (part2) {
            // Format: "CityName(CODE)" - part2 is the city code
            cityName = part1;
            cityCode = part2;
          } else {
            // Single value like "LKO" - could be city code or city name
            // Treat it as city code first (most common for station_bilty_summary)
            cityCode = part1;
            cityName = part1; // fallback for display/fuzzy search
          }
        }

        if (!cityName && !targetCityId) {
          setAutoFillStatus({
            loading: false,
            match: null,
            error: 'Could not determine destination city'
          });
          return;
        }

        // Lookup city ID if not available
        if (!targetCityId) {
          // Strategy: try city_code first (exact), then city_code (case-insensitive), 
          // then city_name (exact), then city_name (fuzzy)
          
          // 1. Try exact city_code match
          if (cityCode) {
            const { data: codeRows, error: codeError } = await supabase
              .from('cities')
              .select('id, city_name, city_code')
              .eq('city_code', cityCode)
              .limit(1);
            if (!codeError && codeRows?.[0]) {
              targetCityId = codeRows[0].id;
              cityName = codeRows[0].city_name;
              cityCode = codeRows[0].city_code;
            }
          }
          
          // 2. Try case-insensitive city_code match
          if (!targetCityId && cityCode) {
            const { data: codeIRows } = await supabase
              .from('cities')
              .select('id, city_name, city_code')
              .ilike('city_code', cityCode)
              .limit(1);
            if (codeIRows?.[0]) {
              targetCityId = codeIRows[0].id;
              cityName = codeIRows[0].city_name;
              cityCode = codeIRows[0].city_code;
            }
          }

          // 3. Try exact city_name match
          if (!targetCityId && cityName) {
            const { data: nameRows } = await supabase
              .from('cities')
              .select('id, city_name, city_code')
              .ilike('city_name', cityName)
              .limit(1);
            if (nameRows?.[0]) {
              targetCityId = nameRows[0].id;
              cityName = nameRows[0].city_name;
              cityCode = nameRows[0].city_code;
            }
          }

          // 4. Try fuzzy city_name match
          if (!targetCityId && cityName) {
            const { data: fuzzyRows } = await supabase
              .from('cities')
              .select('id, city_name, city_code')
              .ilike('city_name', `%${cityName}%`)
              .limit(1);
            if (fuzzyRows?.[0]) {
              targetCityId = fuzzyRows[0].id;
              cityName = fuzzyRows[0].city_name;
              cityCode = fuzzyRows[0].city_code;
            }
          }
          
          // 5. Last resort: try city_code as partial match on city_name
          if (!targetCityId && cityCode && cityCode !== cityName) {
            const { data: lastRows } = await supabase
              .from('cities')
              .select('id, city_name, city_code')
              .ilike('city_name', `%${cityCode}%`)
              .limit(1);
            if (lastRows?.[0]) {
              targetCityId = lastRows[0].id;
              cityName = lastRows[0].city_name;
              cityCode = lastRows[0].city_code;
            }
          }
        }

        if (!targetCityId) {
          const searchedFor = cityCode && cityName && cityCode !== cityName 
            ? `${cityName} (code: ${cityCode})` 
            : cityName || cityCode || 'unknown';
          setAutoFillStatus({
            loading: false,
            match: null,
            error: `City not found: ${searchedFor}. Please enter transporter details manually.`
          });
          return;
        }

        // Fetch ALL transporters for the city
        const { data: transportRows, error: transportError } = await supabase
          .from('transports')
          .select('id, transport_name, gst_number, city_id, city_name, mob_number, address, branch_owner_name')
          .eq('city_id', targetCityId)
          .not('transport_name', 'is', null)
          .order('transport_name', { ascending: true });

        if (transportError) throw transportError;
        if (cancelled) return;

        const allTransporters = (transportRows || []).map(t => ({
          id: t.id,
          name: t.transport_name,
          gst: t.gst_number || '',
          city: t.city_name || cityName || '',
          phone: t.mob_number || '',
          address: t.address || '',
          branchOwner: t.branch_owner_name || ''
        }));

        setTransporterSuggestions(allTransporters);

        if (allTransporters.length === 0) {
          setAutoFillStatus({
            loading: false,
            match: null,
            error: `No transporter found for ${cityName}. Please enter details manually.`
          });
          return;
        }

        // Auto-select the first transporter with GST
        const firstWithGst = allTransporters.find(t => t.gst) || allTransporters[0];

        setFormData(prev => ({
          ...prev,
          transporter_id: firstWithGst.gst?.toUpperCase() || '',
          transporter_name: firstWithGst.name || ''
        }));

        setAutoFillStatus({
          loading: false,
          match: {
            name: firstWithGst.name,
            gst: firstWithGst.gst,
            city: cityName,
            phone: firstWithGst.phone || null,
            totalFound: allTransporters.length
          },
          error: null
        });

      } catch (err) {
        console.error('Auto-fill error:', err);
        if (!cancelled) {
          setAutoFillStatus({
            loading: false,
            match: null,
            error: err.message || 'Failed to fetch transporter. Please enter manually.'
          });
        }
      }
    };

    lookupTransporter();

    return () => { cancelled = true; };
  }, [biltyData]);

  // Handle EWB selection change
  const handleEwbSelect = (index) => {
    setSelectedEwbIndex(index);
    setFormData(prev => ({
      ...prev,
      eway_bill_number: ewbNumbers[index]
    }));
    setResult(null);
    setError(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Submit transporter update
  const handleSubmit = async () => {
    const missingFields = [];
    if (!formData.eway_bill_number) missingFields.push('E-Way Bill Number');
    if (!formData.transporter_id) missingFields.push('Transporter ID');
    if (!formData.transporter_name) missingFields.push('Transporter Name');

    if (missingFields.length > 0) {
      setError(`Please fill: ${missingFields.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        eway_bill_number: formData.eway_bill_number.replace(/-/g, '')
      };

      // First API call
      const response1 = await fetch('https://movesure-backend.onrender.com/api/transporter-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data1 = await response1.json();

      if (data1.results?.status === 'No Content' || data1.results?.code >= 400) {
        const errorData = data1.error?.results || data1.results || data1;
        throw new Error(JSON.stringify({
          code: errorData.code,
          status: errorData.status,
          message: errorData.message || 'Failed to update transporter'
        }));
      }

      const isSuccess = (data1.status === 'success' || data1.results?.status === 'Success') &&
                        (data1.status_code === 200 || data1.results?.code === 200);

      if (isSuccess) {
        // Second API call for PDF
        const response2 = await fetch('https://movesure-backend.onrender.com/api/transporter-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data2 = await response2.json();

        const isSuccess2 = (data2.status === 'success' || data2.results?.status === 'Success') &&
                          (data2.status_code === 200 || data2.results?.code === 200);
        const finalData = isSuccess2 ? data2 : data1;

        let pdfUrl = finalData.results?.message?.url || finalData.pdfUrl;
        if (pdfUrl && !pdfUrl.startsWith('http')) {
          pdfUrl = `https://${pdfUrl}`;
        }

        const successResult = {
          success: true,
          message: finalData.message || 'Transporter updated successfully!',
          ewbNumber: finalData.results?.message?.ewayBillNo || formData.eway_bill_number,
          transporterId: finalData.results?.message?.transporterId || formData.transporter_id,
          transporterName: formData.transporter_name,
          updateDate: finalData.results?.message?.transUpdateDate,
          pdfUrl: pdfUrl,
          rawResponse: finalData
        };

        setResult(successResult);

        // Save to database
        if (currentUser?.id) {
          saveTransporterUpdate({
            challanNo: null,
            grNo: biltyData?.gr_no || null,
            ewbNumber: formData.eway_bill_number,
            transporterId: formData.transporter_id,
            transporterName: formData.transporter_name,
            userGstin: formData.user_gstin,
            updateResult: successResult,
            userId: currentUser.id
          }).catch(err => console.error('Save error:', err));
        }
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (err) {
      console.error('Update error:', err);
      let errorDetails;
      try {
        errorDetails = JSON.parse(err.message);
      } catch {
        errorDetails = err.message;
      }
      setError(errorDetails);

      // Save error to database
      if (currentUser?.id && formData.eway_bill_number) {
        saveTransporterUpdate({
          challanNo: null,
          grNo: biltyData?.gr_no || null,
          ewbNumber: formData.eway_bill_number,
          transporterId: formData.transporter_id,
          transporterName: formData.transporter_name,
          userGstin: formData.user_gstin,
          updateResult: { success: false, error: typeof errorDetails === 'object' ? errorDetails.message : errorDetails },
          userId: currentUser.id
        }).catch(err => console.error('Save error:', err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-white">
            <Truck className="w-5 h-5" />
            <span className="font-semibold">Standalone Transporter Update</span>
          </div>
          
          {/* Search Type Toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex bg-white/10 rounded-lg p-1 border border-white/20">
              <button
                onClick={() => { setSearchType('ewb'); clearSearch(); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  searchType === 'ewb'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-1" />
                By E-Way Bill
              </button>
              <button
                onClick={() => { setSearchType('grno'); clearSearch(); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  searchType === 'grno'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Hash className="w-4 h-4 inline mr-1" />
                By GR Number
              </button>
            </div>

            {/* Search Input */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={searchType === 'ewb' 
                    ? 'Enter EWB number (e.g., 4480-0919-5664)' 
                    : 'Enter GR Number (e.g., LKO-1234)'
                  }
                  maxLength={searchType === 'ewb' ? 14 : 50}
                  className="w-full pl-3 pr-8 py-2 rounded-lg bg-white/95 border-0 text-gray-900 text-sm font-mono placeholder-gray-400 focus:ring-2 focus:ring-white/50 focus:outline-none tracking-wide"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 bg-white text-purple-600 font-medium rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-1.5"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Error */}
      {searchError && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{searchError}</span>
          </div>
        </div>
      )}

      {/* Results Section */}
      {biltyData && (
        <div className="p-4 space-y-4">
          {/* Bilty Details Card */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">
                {biltyData.source === 'station' ? 'Station Entry' : 'Bilty'} Details
              </h3>
              <span className="ml-auto text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                {biltyData.source === 'station' ? 'Station Entry' : 'Main Bilty'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">GR Number</p>
                <p className="font-semibold text-gray-900">{biltyData.gr_no || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Date</p>
                <p className="font-medium text-gray-700">
                  {formatDate(biltyData.bilty_date || biltyData.created_at)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Consignor</p>
                <p className="font-medium text-gray-700 truncate">
                  {biltyData.consignor_name || biltyData.consignor || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Consignee</p>
                <p className="font-medium text-gray-700 truncate">
                  {biltyData.consignee_name || biltyData.consignee || 'N/A'}
                </p>
              </div>
              {biltyData.to_city && (
                <div>
                  <p className="text-gray-500 text-xs">Destination</p>
                  <p className="font-medium text-gray-700">
                    {biltyData.to_city.city_name}
                    {biltyData.to_city.city_code && ` (${biltyData.to_city.city_code})`}
                  </p>
                </div>
              )}
              {biltyData.station && (
                <div>
                  <p className="text-gray-500 text-xs">Station</p>
                  <p className="font-medium text-gray-700">{biltyData.station}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 text-xs">Packages</p>
                <p className="font-medium text-gray-700">
                  {biltyData.no_of_pkg || biltyData.no_of_packets || 0}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Amount</p>
                <p className="font-medium text-gray-700">
                  {formatCurrency(biltyData.total || biltyData.amount)}
                </p>
              </div>
            </div>
          </div>

          {/* No EWB in Record - Manual Entry */}
          {biltyData.hasNoEwb && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-800">No E-Way Bill Found in Record</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    This {biltyData.source === 'station' ? 'station entry' : 'bilty'} does not have an E-Way Bill number. 
                    You can manually enter the E-Way Bill number below to update the transporter.
                  </p>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-amber-800 mb-1">
                      Enter E-Way Bill Number Manually
                    </label>
                    <input
                      type="text"
                      value={formatEwbInput(formData.eway_bill_number)}
                      onChange={(e) => {
                        const formatted = formatEwbInput(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          eway_bill_number: formatted.replace(/-/g, '')
                        }));
                      }}
                      placeholder="Enter EWB (e.g., 4480-0919-5664)"
                      maxLength={14}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Single EWB Display */}
          {!biltyData.hasNoEwb && ewbNumbers.length === 1 && (
            <div className={`rounded-lg p-4 border ${
              currentExistingUpdate?.is_success 
                ? 'bg-emerald-50 border-emerald-300' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">E-Way Bill Number</p>
                  <p className="font-mono text-lg font-semibold text-gray-900">
                    {formatEwbNumber(ewbNumbers[0])}
                  </p>
                </div>
                {currentExistingUpdate?.is_success && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-200 text-emerald-800 rounded-full text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Already Updated
                  </span>
                )}
              </div>
            </div>
          )}

          {/* EWB Selection */}
          {!biltyData.hasNoEwb && ewbNumbers.length > 1 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Multiple E-Way Bills Found ({ewbNumbers.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {ewbNumbers.map((ewb, idx) => {
                  const cleanEwb = ewb.replace(/[-\s]/g, '');
                  const hasExistingUpdate = existingUpdates[cleanEwb]?.is_success;
                  return (
                    <button
                      key={ewb}
                      onClick={() => handleEwbSelect(idx)}
                      className={`px-3 py-1.5 text-sm font-mono rounded-lg border transition-all flex items-center gap-1.5 ${
                        selectedEwbIndex === idx
                          ? 'bg-blue-600 text-white border-blue-600'
                          : hasExistingUpdate
                            ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                            : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100'
                      }`}
                    >
                      {hasExistingUpdate && <CheckCircle className="w-3 h-3" />}
                      {formatEwbNumber(ewb)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                <CheckCircle className="w-3 h-3 inline mr-1" />
                Green indicates transporter already updated
              </p>
            </div>
          )}

          {/* Existing Transporter Update Info */}
          {currentExistingUpdate && currentExistingUpdate.is_success && (
            <div className="bg-emerald-50 rounded-lg p-4 border-2 border-emerald-300">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-emerald-800">Transporter Already Updated</h3>
                <span className="ml-auto text-xs px-2 py-1 bg-emerald-200 text-emerald-800 rounded-full font-medium">
                  ✓ Updated
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <p className="text-emerald-600 text-xs font-medium">E-Way Bill</p>
                  <p className="font-mono text-emerald-900">{formatEwbNumber(currentExistingUpdate.ewb_number)}</p>
                </div>
                <div>
                  <p className="text-emerald-600 text-xs font-medium">Transporter ID</p>
                  <p className="font-mono text-emerald-900">{currentExistingUpdate.transporter_id}</p>
                </div>
                <div>
                  <p className="text-emerald-600 text-xs font-medium">Transporter Name</p>
                  <p className="font-medium text-emerald-900">{currentExistingUpdate.transporter_name}</p>
                </div>
                {currentExistingUpdate.gr_no && (
                  <div>
                    <p className="text-emerald-600 text-xs font-medium">GR Number</p>
                    <p className="font-medium text-emerald-900">{currentExistingUpdate.gr_no}</p>
                  </div>
                )}
                {currentExistingUpdate.update_date && (
                  <div>
                    <p className="text-emerald-600 text-xs font-medium">Update Date</p>
                    <p className="font-medium text-emerald-900">{currentExistingUpdate.update_date}</p>
                  </div>
                )}
                <div>
                  <p className="text-emerald-600 text-xs font-medium">Updated At</p>
                  <p className="font-medium text-emerald-900">
                    {formatDate(currentExistingUpdate.updated_at)}
                  </p>
                </div>
              </div>

              {/* PDF Download Button */}
              {(() => {
                // Get PDF URL from pdf_url column or from raw_result_metadata
                const pdfUrl = currentExistingUpdate.pdf_url || 
                  currentExistingUpdate.raw_result_metadata?.pdfUrl ||
                  currentExistingUpdate.raw_result_metadata?.fullData?.pdfUrl ||
                  currentExistingUpdate.raw_result_metadata?.rawResponse?.results?.message?.url;
                
                if (pdfUrl) {
                  return (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download Updated E-Way Bill PDF
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  );
                }
                return null;
              })()}

              <p className="text-xs text-emerald-600 mt-3">
                This E-Way Bill has already been updated with transporter details. You can still update it again if needed.
              </p>
            </div>
          )}

          {/* Auto-fill Status */}
          {autoFillStatus.loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">Fetching transporters for destination city...</span>
            </div>
          )}

          {autoFillStatus.match && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Transporter auto-selected: {autoFillStatus.match.name}</span>
                </div>
                {transporterSuggestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowTransporterDropdown(true);
                      setTimeout(() => transporterSearchRef.current?.focus(), 100);
                    }}
                    className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    Change
                  </button>
                )}
              </div>
              <p className="text-xs text-green-600 mt-1">
                GST: {autoFillStatus.match.gst} | City: {autoFillStatus.match.city}
                {autoFillStatus.match.totalFound > 1 && (
                  <span className="ml-1 font-semibold">({autoFillStatus.match.totalFound} transporters available)</span>
                )}
              </p>
            </div>
          )}

          {autoFillStatus.error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{autoFillStatus.error}</span>
              </div>
            </div>
          )}

          {/* Update Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-purple-600" />
              Update Transporter Details
            </h3>

            <div className="grid gap-4">
              {/* E-Way Bill Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Way Bill Number
                </label>
                <input
                  type="text"
                  value={formatEwbNumber(formData.eway_bill_number)}
                  onChange={(e) => handleInputChange('eway_bill_number', e.target.value.replace(/[-\s]/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono bg-gray-50"
                  readOnly
                />
              </div>

              {/* User GSTIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User GSTIN
                </label>
                <input
                  type="text"
                  value={formData.user_gstin}
                  onChange={(e) => handleInputChange('user_gstin', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>

              {/* Transporter Selector - Searchable Dropdown */}
              {transporterSuggestions.length > 0 && (
                <div ref={transporterDropdownRef}>
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-purple-500" />
                    Select Transporter ({transporterSuggestions.length} available)
                  </label>
                  <div className="relative">
                    <div
                      className="w-full flex items-center border-2 border-purple-200 rounded-xl bg-white shadow-sm hover:border-purple-400 transition-colors cursor-pointer"
                      onClick={() => {
                        setShowTransporterDropdown(!showTransporterDropdown);
                        setTimeout(() => transporterSearchRef.current?.focus(), 100);
                      }}
                    >
                      <div className="flex-1 px-3 py-2.5">
                        {showTransporterDropdown ? (
                          <input
                            ref={transporterSearchRef}
                            type="text"
                            value={transporterSearch}
                            onChange={(e) => {
                              setTransporterSearch(e.target.value);
                              setShowTransporterDropdown(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setShowTransporterDropdown(false);
                                setTransporterSearch('');
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSelectedTransporterIdx(prev => 
                                  prev < filteredTransporterSuggestions.length - 1 ? prev + 1 : 0
                                );
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSelectedTransporterIdx(prev => 
                                  prev > 0 ? prev - 1 : filteredTransporterSuggestions.length - 1
                                );
                              } else if (e.key === 'Enter' && selectedTransporterIdx >= 0) {
                                e.preventDefault();
                                handleSelectTransporter(filteredTransporterSuggestions[selectedTransporterIdx]);
                              }
                            }}
                            className="w-full outline-none text-sm text-gray-900 placeholder-gray-400"
                            placeholder="🔍 Search by name, GSTIN, or phone..."
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            {formData.transporter_name ? (
                              <>
                                <span className="text-sm font-semibold text-gray-900">{formData.transporter_name}</span>
                                {formData.transporter_id && (
                                  <span className="text-xs font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">
                                    {formData.transporter_id}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">Click to select a transporter...</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="px-3 text-gray-400">
                        <ChevronDown className={`w-5 h-5 transition-transform ${showTransporterDropdown ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {showTransporterDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                        {filteredTransporterSuggestions.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No transporters match &quot;{transporterSearch}&quot;
                          </div>
                        ) : (
                          filteredTransporterSuggestions.map((t, idx) => {
                            const isCurrentlySelected = formData.transporter_id === (t.gst?.toUpperCase() || '') && 
                                                        formData.transporter_name === t.name;
                            const isKeyboardSelected = idx === selectedTransporterIdx;
                            return (
                              <div
                                key={t.id || idx}
                                onClick={() => handleSelectTransporter(t)}
                                className={`px-4 py-3 cursor-pointer transition-all border-b border-gray-50 last:border-0 ${
                                  isCurrentlySelected
                                    ? 'bg-purple-50 border-l-4 border-l-purple-500'
                                    : isKeyboardSelected
                                    ? 'bg-gray-100'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Truck className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                      <span className="text-sm font-semibold text-gray-900 truncate">{t.name}</span>
                                      {isCurrentlySelected && (
                                        <span className="flex-shrink-0 px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">SELECTED</span>
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
                                      {t.phone && (
                                        <span className="text-xs text-gray-500">📞 {t.phone}</span>
                                      )}
                                      {t.city && (
                                        <span className="text-xs text-gray-400">📍 {t.city}</span>
                                      )}
                                    </div>
                                    {t.branchOwner && (
                                      <div className="mt-0.5 ml-6 text-xs text-gray-400">Owner: {t.branchOwner}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transporter ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transporter ID (GST Number) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.transporter_id}
                  onChange={(e) => handleInputChange('transporter_id', e.target.value.toUpperCase())}
                  placeholder="Enter transporter GST number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                {transporterSuggestions.length > 0 && !formData.transporter_id && (
                  <p className="mt-1 text-xs text-amber-600">💡 Select a transporter above to auto-fill</p>
                )}
              </div>

              {/* Transporter Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transporter Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.transporter_name}
                  onChange={(e) => handleInputChange('transporter_name', e.target.value)}
                  placeholder="Enter transporter name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                {transporterSuggestions.length > 0 && !formData.transporter_name && (
                  <p className="mt-1 text-xs text-amber-600">💡 Select a transporter above to auto-fill</p>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2 text-red-700 text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      {typeof error === 'object' ? (
                        <>
                          <p className="font-medium">{error.status || 'Error'}: {error.message}</p>
                          {error.code && <p className="text-xs mt-1">Code: {error.code}</p>}
                        </>
                      ) : (
                        <p>{error}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Success Display */}
              {result?.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Transporter Updated Successfully!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-green-600">
                    <p>EWB: {formatEwbNumber(result.ewbNumber)}</p>
                    <p>Transporter: {result.transporterName}</p>
                    {result.updateDate && <p>Date: {result.updateDate}</p>}
                  </div>
                  {result.pdfUrl && (
                    <a
                      href={result.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Updated EWB
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.transporter_id || !formData.transporter_name}
                className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
          </div>
        </div>
      )}

      {/* Initial State */}
      {!biltyData && !searchError && !searching && (
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
            <Truck className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Update Transporter Details</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Search for a bilty using E-Way Bill number or GR number to update the transporter information directly without selecting a challan.
          </p>
        </div>
      )}

      {/* Loading State */}
      {searching && (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Searching for {searchType === 'ewb' ? 'E-Way Bill' : 'GR Number'}...</p>
        </div>
      )}
    </div>
  );
}
