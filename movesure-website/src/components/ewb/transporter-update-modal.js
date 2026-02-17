import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Truck, User, Send, X, Loader2, CheckCircle, AlertTriangle, Edit3, Download, ExternalLink, Search, ChevronDown, MapPin } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { saveTransporterUpdate } from '../../utils/ewbValidationStorage';
import { useAuth } from '../../app/utils/auth';

const DEFAULT_USER_GSTIN = '09COVPS5556J1ZT';

const createEmptyFormState = () => ({
  user_gstin: DEFAULT_USER_GSTIN,
  eway_bill_number: '',
  transporter_id: '',
  transporter_name: ''
});

const parseCityReference = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([^()]+?)(?:\(([^()]+)\))?$/);
  const cityName = match?.[1]?.trim() || null;
  const cityCode = match?.[2]?.trim() || null;

  return {
    cityName,
    cityCode,
    raw: trimmed
  };
};

const TransporterUpdateModal = ({ isOpen, onClose, onUpdateSuccess, grData, ewbNumbers }) => {
  const [formData, setFormData] = useState(createEmptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [autoFillStatus, setAutoFillStatus] = useState({
    loading: false,
    match: null,
    error: null
  });
  const [showDebug, setShowDebug] = useState(false);
  const [selectedEwbIndex, setSelectedEwbIndex] = useState(0);
  const [transporterSuggestions, setTransporterSuggestions] = useState([]);
  const [transporterSearch, setTransporterSearch] = useState('');
  const [showTransporterDropdown, setShowTransporterDropdown] = useState(false);
  const [selectedTransporterIdx, setSelectedTransporterIdx] = useState(-1);
  const transporterDropdownRef = useRef(null);
  const transporterSearchRef = useRef(null);
  
  // Get current user from auth context
  const { user: currentUser } = useAuth();

  const cityHints = useMemo(() => {
    if (!grData) return null;

    if (grData.toCity) {
      return {
        cityId: grData.toCity.id || null,
        cityName: grData.toCity.city_name || null,
        cityCode: grData.toCity.city_code || null,
        source: 'direct'
      };
    }

    const candidates = [
      grData.station?.station,
      grData.station?.city_name,
      grData.bilty?.to_location
    ];

    for (const value of candidates) {
      const parsed = parseCityReference(value);
      if (parsed) {
        return {
          cityId: null,
          cityName: parsed.cityName || null,
          cityCode: parsed.cityCode || null,
          source: 'parsed',
          raw: parsed.raw
        };
      }
    }

    return null;
  }, [grData]);

  // Single unified effect - handles reset and auto-fill
  useEffect(() => {
    // Reset when modal closes
    if (!isOpen) {
      setFormData(createEmptyFormState());
      setResult(null);
      setError(null);
      setAutoFillStatus({ loading: false, match: null, error: null });
      setSelectedEwbIndex(0);
      setTransporterSuggestions([]);
      setTransporterSearch('');
      setShowTransporterDropdown(false);
      setSelectedTransporterIdx(-1);
      return;
    }

    // Reset form when modal opens or GR changes
    setFormData(createEmptyFormState());
    setResult(null);
    setError(null);
    setSelectedEwbIndex(0);

    // Auto-select first EWB if available
    if (ewbNumbers && ewbNumbers.length > 0) {
      setFormData(prev => ({
        ...prev,
        eway_bill_number: ewbNumbers[0]
      }));
    }

    // Exit early if no data
    if (!grData) {
      setAutoFillStatus({ loading: false, match: null, error: null });
      return;
    }

    // Exit if no city hints
    if (!cityHints) {
      setAutoFillStatus({ 
        loading: false, 
        match: null, 
        error: 'Could not determine destination city from GR data' 
      });
      return;
    }

    let cancelled = false;

    const lookupTransporterForCity = async () => {
      setAutoFillStatus({ loading: true, match: null, error: null });

      try {
        const normalizedName = cityHints.cityName ? cityHints.cityName.trim() : null;
        const normalizedCode = cityHints.cityCode ? cityHints.cityCode.trim() : null;
        let targetCityId = cityHints.cityId || null;
        let resolvedCity = null;

        // Step 1: Resolve city ID if not provided
        if (!targetCityId) {
          let cityQuery = supabase
            .from('cities')
            .select('id, city_name, city_code')
            .limit(1);

          if (normalizedCode) {
            cityQuery = cityQuery.eq('city_code', normalizedCode);
          } else if (normalizedName) {
            cityQuery = cityQuery.ilike('city_name', normalizedName);
          } else {
            throw new Error('No city code or name available to lookup');
          }

          let { data: cityRows, error: cityError } = await cityQuery;
          if (cityError) throw cityError;

          // Try fuzzy match if exact match fails
          if (!cityRows || cityRows.length === 0) {
            if (normalizedName) {
              const { data: fuzzyRows, error: fuzzyError } = await supabase
                .from('cities')
                .select('id, city_name, city_code')
                .ilike('city_name', `%${normalizedName}%`)
                .limit(1);

              if (fuzzyError) throw fuzzyError;
              cityRows = fuzzyRows || [];
            }
          }

          const cityRecord = cityRows?.[0];
          if (!cityRecord) {
            throw new Error(`City not found: ${normalizedName || normalizedCode}`);
          }

          targetCityId = cityRecord.id;
          resolvedCity = cityRecord;
        } else {
          resolvedCity = {
            id: targetCityId,
            city_name: normalizedName || grData.toCity?.city_name || null,
            city_code: normalizedCode || grData.toCity?.city_code || null
          };
        }

        console.log('🔍 Querying transports for city_id:', targetCityId, 'City:', resolvedCity);
        
        // Step 2: Fetch ALL transporters for the matched city
        let { data: transportRows, error: transportError } = await supabase
          .from('transports')
          .select('id, transport_name, gst_number, city_id, city_name, mob_number, address, branch_owner_name')
          .eq('city_id', targetCityId)
          .not('transport_name', 'is', null)
          .order('transport_name', { ascending: true });

        if (transportError) throw transportError;

        console.log('📦 Transport query results:', transportRows?.length, 'transporters found');

        if (cancelled) return;

        // Store all suggestions
        const allTransporters = (transportRows || []).map(t => ({
          id: t.id,
          name: t.transport_name,
          gst: t.gst_number || '',
          city: t.city_name || resolvedCity?.city_name || '',
          phone: t.mob_number || '',
          address: t.address || '',
          branchOwner: t.branch_owner_name || ''
        }));
        
        setTransporterSuggestions(allTransporters);

        // If no transporter found for this city, show clear error
        if (allTransporters.length === 0) {
          setAutoFillStatus({ 
            loading: false, 
            match: null, 
            error: `No transporter found for ${resolvedCity?.city_name || 'this city'}. Please enter details manually.`
          });
          return;
        }

        // Auto-select the first transporter with a GST number
        const firstWithGst = allTransporters.find(t => t.gst) || allTransporters[0];
        
        console.log('✅ Found transporters:', allTransporters.length, 'Auto-selecting:', firstWithGst.name);
        
        const newTransporterId = firstWithGst.gst ? firstWithGst.gst.toUpperCase() : '';
        const newTransporterName = firstWithGst.name || '';
        
        setFormData(prev => ({
          ...prev,
          transporter_id: newTransporterId,
          transporter_name: newTransporterName
        }));

        setAutoFillStatus({
          loading: false,
          match: {
            name: firstWithGst.name,
            gst: firstWithGst.gst,
            city: resolvedCity?.city_name || normalizedName,
            phone: firstWithGst.phone || null,
            totalFound: allTransporters.length
          },
          error: null
        });

      } catch (lookupError) {
        console.error('❌ Auto-fill transporter lookup failed:', lookupError);
        if (!cancelled) {
          setAutoFillStatus({
            loading: false,
            match: null,
            error: lookupError.message || 'Failed to fetch transporter details. Please enter manually.'
          });
        }
      }
    };

    lookupTransporterForCity();

    return () => {
      cancelled = true;
    };
  }, [isOpen, grData?.gr_no, cityHints]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Enhanced validation with specific field checking
    const missingFields = [];
    if (!formData.eway_bill_number) missingFields.push('E-Way Bill Number');
    if (!formData.transporter_id) missingFields.push('Transporter ID');
    if (!formData.transporter_name) missingFields.push('Transporter Name');
    
    if (missingFields.length > 0) {
      setError(`Please fill the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    console.log('Form data before submission:', formData);
    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        ...formData,
        eway_bill_number: formData.eway_bill_number.replace(/-/g, '') // Remove hyphens
      };

      console.log('🚀 Sending transporter update payload (First Call):', JSON.stringify(payload, null, 2));

      // First API call
      const response1 = await fetch('https://movesure-backend.onrender.com/api/transporter-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data1 = await response1.json();
      console.log('✅ First API Response:', JSON.stringify(data1, null, 2));

      // Check for errors in first call
      if (data1.results?.status === 'No Content' || data1.results?.code >= 400) {
        const errorData = data1.error?.results || data1.results || data1;
        const detailedMessage = errorData.message || data1.message || 'Failed to update transporter';
        const errorCode = errorData.code || data1.status_code || response1.status;
        const errorStatus = errorData.status || data1.status || 'Error';
        
        throw new Error(JSON.stringify({
          code: errorCode,
          status: errorStatus,
          message: detailedMessage,
          fullResponse: data1
        }));
      }

      // Check if first call was successful (handle both formats: 'Success' and 'success')
      const isSuccess = (data1.status === 'success' || data1.results?.status === 'Success') && 
                        (data1.status_code === 200 || data1.results?.code === 200);
      
      if (isSuccess) {
        console.log('🔄 First call successful, making second call for PDF...');
        
        // Second API call - same payload to get PDF
        const response2 = await fetch('https://movesure-backend.onrender.com/api/transporter-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        const data2 = await response2.json();
        console.log('✅ Second API Response (with PDF):', JSON.stringify(data2, null, 2));

        // Use second response if successful, otherwise use first
        const isSuccess2 = (data2.status === 'success' || data2.results?.status === 'Success') && 
                          (data2.status_code === 200 || data2.results?.code === 200);
        const finalData = isSuccess2 ? data2 : data1;
        
        // Extract PDF URL from response (handle both formats)
        let pdfUrl = finalData.results?.message?.url || finalData.pdfUrl || data2.results?.message?.url || data2.pdfUrl;
        if (pdfUrl && !pdfUrl.startsWith('http')) {
          pdfUrl = `https://${pdfUrl}`;
        }
        
        console.log('📄 PDF URL:', pdfUrl);
        
        // Extract values from response (handle both formats)
        const ewbNumber = finalData.results?.message?.ewayBillNo || finalData.ewbNumber || formData.eway_bill_number;
        const transporterId = finalData.results?.message?.transporterId || finalData.transporterId || formData.transporter_id;
        const updateDate = finalData.results?.message?.transUpdateDate || finalData.updateDate;
        
        const successResult = {
          success: true,
          message: finalData.message || 'Transporter updated successfully!',
          ewbNumber: ewbNumber,
          transporterId: transporterId,
          transporterName: formData.transporter_name,
          updateDate: updateDate,
          pdfUrl: pdfUrl,
          rawResponse: finalData
        };

        setResult(successResult);

        // Call the success callback to update parent state immediately (for live green highlight)
        if (onUpdateSuccess) {
          onUpdateSuccess(formData.eway_bill_number, successResult);
        }

        // Save to database (in background)
        if (currentUser?.id && formData.eway_bill_number) {
          console.log('💾 Saving to database:', {
            ewbNumber: formData.eway_bill_number,
            transporterId: formData.transporter_id,
            successResult
          });
          
          saveTransporterUpdate({
            challanNo: grData?.challan_no || null,
            grNo: grData?.gr_no || null,
            ewbNumber: formData.eway_bill_number,
            transporterId: formData.transporter_id,
            transporterName: formData.transporter_name,
            userGstin: formData.user_gstin,
            updateResult: successResult, // This contains success: true
            userId: currentUser.id
          }).then(saveResult => {
            if (saveResult.success) {
              console.log('✅ Transporter update saved to database:', saveResult);
            } else {
              console.error('❌ Failed to save transporter update:', saveResult.error);
            }
          }).catch(err => console.error('❌ Save error:', err));
        }
      } else if (!response1.ok) {
        throw new Error(`HTTP ${response1.status}: Failed to update transporter`);
      } else {
        throw new Error('Unexpected response format from server');
      }
    } catch (err) {
      console.error('❌ Transporter Update Error:', err);
      
      // Try to parse structured error
      let errorDetails;
      try {
        const errorObj = JSON.parse(err.message);
        errorDetails = {
          code: errorObj.code,
          status: errorObj.status,
          message: errorObj.message,
          fullResponse: errorObj.fullResponse
        };
      } catch {
        // If not JSON, use the error message as is
        errorDetails = err.message;
      }
      
      setError(errorDetails);

      // Save error to database (in background)
      if (currentUser?.id && formData.eway_bill_number) {
        saveTransporterUpdate({
          challanNo: grData?.challan_no || null,
          grNo: grData?.gr_no || null,
          ewbNumber: formData.eway_bill_number,
          transporterId: formData.transporter_id,
          transporterName: formData.transporter_name,
          userGstin: formData.user_gstin,
          updateResult: { 
            success: false, 
            error: typeof errorDetails === 'object' ? errorDetails.message : errorDetails,
            fullData: errorDetails
          },
          userId: currentUser.id
        }).then(saveResult => {
          if (saveResult.success) {
            console.log('✅ Transporter update error saved to database');
          } else {
            console.error('❌ Failed to save transporter update error:', saveResult.error);
          }
        }).catch(err => console.error('❌ Save error:', err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    // Keep the current EWB selection but reset other form fields
    setFormData(prev => ({
      ...createEmptyFormState(),
      eway_bill_number: prev.eway_bill_number // Keep the selected EWB
    }));
    setAutoFillStatus({
      loading: false,
      match: null,
      error: null
    });
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
  const filteredSuggestions = useMemo(() => {
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

  if (!isOpen) return null;

  return (
    <div className="w-full bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Update Transporter ID</h1>
              <p className="text-lg text-gray-600 mt-1">
                GR Number: <span className="font-bold text-blue-600">{grData?.gr_no || 'N/A'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Back to List
          </button>
        </div>
      </div>

      {/* Success Result */}
      {result && result.success && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-4 border-green-400">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Transporter Updated Successfully!</h3>
                  <p className="text-sm text-green-600">E-Way Bill transporter information has been updated</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-green-100">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-green-700">E-Way Bill Number</span>
                      <div className="text-sm font-mono font-bold text-green-900">{result.ewbNumber}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-700">Transporter ID</span>
                      <div className="text-sm font-mono font-semibold text-blue-900">{result.transporterId}</div>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-purple-700">Transporter Name</span>
                      <div className="text-sm font-semibold text-purple-900">{result.transporterName}</div>
                    </div>
                  </div>

                  {result.updateDate && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm font-medium text-yellow-700">Updated On</span>
                      <div className="text-sm font-semibold text-yellow-900">{result.updateDate}</div>
                    </div>
                  )}
                </div>
                
                {/* PDF Download Section */}
                {result.pdfUrl && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-blue-800">Updated E-Way Bill PDF</span>
                        <div className="text-xs text-blue-600 mt-1">Download or view the updated E-Way Bill</div>
                      </div>
                      <a
                        href={result.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </a>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={reset}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 shadow-lg"
                >
                  <Edit3 className="w-5 h-5" />
                  Update Another
                </button>
                {result.pdfUrl && (
                  <button
                    onClick={() => window.open(result.pdfUrl, '_blank')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-lg"
                  >
                    <ExternalLink className="w-5 h-5" />
                    View PDF
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-white rounded-lg shadow-lg p-4 mb-6 border-2 border-red-400">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-800 mb-2">Failed to Update Transporter</h3>
                  
                  {typeof error === 'object' ? (
                    <div className="space-y-2">
                      {/* Compact Error Summary */}
                      <div className="bg-red-50 rounded p-3 border border-red-200">
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          {error.code && (
                            <div>
                              <div className="text-[10px] font-semibold text-red-600 uppercase">Error Code</div>
                              <div className="text-lg font-bold text-red-900">{error.code}</div>
                            </div>
                          )}
                          {error.status && (
                            <div>
                              <div className="text-[10px] font-semibold text-red-600 uppercase">Status</div>
                              <div className="text-lg font-bold text-red-900">{error.status}</div>
                            </div>
                          )}
                        </div>
                        
                        {/* Error Message */}
                        {error.message && (
                          <div>
                            <div className="text-[10px] font-semibold text-red-600 uppercase mb-1">Error Details</div>
                            <div className="text-sm text-red-900 leading-relaxed">
                              {error.message.split('||').map((msg, idx) => (
                                <div key={idx} className="mb-1 last:mb-0">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                    <span className="font-medium">{msg.trim()}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Helpful Tips */}
                      <div className="p-2.5 bg-amber-50 rounded border border-amber-200">
                        <p className="text-[10px] font-semibold text-amber-800 uppercase mb-1.5">💡 How to Fix:</p>
                        <ul className="text-xs text-amber-800 space-y-1">
                          <li className="flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold text-[10px]">•</span>
                            <span>Verify the <strong>Transporter ID (GSTIN)</strong> is correct</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold text-[10px]">•</span>
                            <span>Ensure GSTIN is mapped to your account</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold text-[10px]">•</span>
                            <span>Check if EWB number is valid and active</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold text-[10px]">•</span>
                            <span>Confirm Transporter Name matches exactly</span>
                          </li>
                        </ul>
                      </div>
                      
                      {/* Full Response (Collapsible) */}
                      {error.fullResponse && (
                        <details>
                          <summary className="text-[10px] text-red-600 font-semibold cursor-pointer hover:text-red-800 uppercase">
                            📋 View Full Response
                          </summary>
                          <div className="mt-1.5 p-2 bg-white rounded border border-red-200">
                            <pre className="text-[9px] text-gray-700 overflow-auto max-h-40 whitespace-pre-wrap break-words font-mono">
{JSON.stringify(error.fullResponse, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-red-800 mb-2 font-medium">{error}</p>
                      <div className="p-2 bg-amber-50 rounded border border-amber-200">
                        <p className="text-[10px] text-amber-800 font-semibold uppercase mb-1">Common Issues:</p>
                        <ul className="text-xs text-amber-800 space-y-0.5">
                          <li>• Check if EWB number is valid</li>
                          <li>• Ensure Transporter ID format is correct</li>
                          <li>• Verify Transporter Name matches</li>
                          <li>• Confirm all fields are filled</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* GR Information */}
          {grData && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="font-medium text-gray-900 mb-3">GR Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">GR Number:</span>
                  <span className="ml-2 text-gray-900">{grData.gr_no}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Consignor:</span>
                  <span className="ml-2 text-gray-900">{grData.bilty?.consignor_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">To:</span>
                  <span className="ml-2 text-gray-900">
                    {grData.toCity?.city_name || grData.bilty?.to_location || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">EWB Count:</span>
                  <span className="ml-2 text-gray-900">{ewbNumbers.length} EWB(s)</span>
                </div>
              </div>
            </div>
          )}

          {/* EWB Selection */}
          {ewbNumbers && ewbNumbers.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="font-medium text-gray-900 mb-3">
                Select E-Way Bill to Update *
                {!formData.eway_bill_number && (
                  <span className="text-red-500 text-sm ml-2">(Required)</span>
                )}
              </h3>
              <div className="space-y-2">
                {ewbNumbers.map((ewb, index) => {
                  const isSelected = formData.eway_bill_number === ewb;
                  return (
                    <label 
                      key={index} 
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="ewb_selection"
                        value={ewb}
                        checked={isSelected}
                        onChange={(e) => {
                          const selectedEwb = e.target.value;
                          setSelectedEwbIndex(index);
                          handleInputChange('eway_bill_number', selectedEwb);
                          // Clear any previous result/error when switching EWBs
                          setResult(null);
                          setError(null);
                        }}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <span className={`font-mono text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {ewb}
                        </span>
                        {ewbNumbers.length > 1 && (
                          <span className={`ml-2 text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                            (EWB #{index + 1})
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                          Selected
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              {ewbNumbers.length > 1 && (
                <p className="mt-3 text-xs text-gray-500">
                  This GR has {ewbNumbers.length} E-Way Bills. Select the one you want to update.
                </p>
              )}
            </div>
          )}

          {/* Form */}
          {!result && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Transporter Information
                </h3>

                {autoFillStatus.loading && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-blue-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Fetching transporters for this destination…</span>
                  </div>
                )}

                {!autoFillStatus.loading && autoFillStatus.match && (
                  <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" />
                          Transporter auto-selected
                        </div>
                        <div className="mt-1 text-xs text-emerald-700">
                          {autoFillStatus.match.city ? `City: ${autoFillStatus.match.city}` : 'City matched'}
                          {autoFillStatus.match.totalFound > 1 && (
                            <span className="ml-2 font-semibold">({autoFillStatus.match.totalFound} transporters available)</span>
                          )}
                        </div>
                      </div>
                      {transporterSuggestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowTransporterDropdown(true);
                            setTimeout(() => transporterSearchRef.current?.focus(), 100);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                        >
                          <Search className="w-3 h-3" />
                          Change Transporter
                        </button>
                      )}
                    </div>
                    {autoFillStatus.match.gst && (
                      <div className="mt-1 text-xs text-emerald-700">
                        GSTIN: <span className="font-mono font-semibold text-emerald-900">{autoFillStatus.match.gst}</span>
                      </div>
                    )}
                    {autoFillStatus.match.phone && (
                      <div className="mt-1 text-xs text-emerald-600">
                        Contact: {autoFillStatus.match.phone}
                      </div>
                    )}
                  </div>
                )}

                {!autoFillStatus.loading && !autoFillStatus.match && !autoFillStatus.error && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    <div className="font-medium text-amber-800 mb-1">No saved transporter found</div>
                    <div className="text-xs">
                      No transporter details found for {cityHints?.cityName || 'this city'}. Please enter the transporter information manually below.
                    </div>
                  </div>
                )}

                {!autoFillStatus.loading && autoFillStatus.error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <div className="font-medium text-red-800 mb-1">⚠️ Auto-fill Failed</div>
                    <div className="text-xs">{autoFillStatus.error}</div>
                  </div>
                )}

                {/* Transporter Selector - Searchable Dropdown */}
                {transporterSuggestions.length > 0 && (
                  <div className="mb-5" ref={transporterDropdownRef}>
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      Select Transporter ({transporterSuggestions.length} available for {cityHints?.cityName || 'this city'})
                    </label>
                    <div className="relative">
                      {/* Search Input / Selected Display */}
                      <div
                        className="w-full flex items-center border-2 border-blue-200 rounded-xl bg-white shadow-sm hover:border-blue-400 transition-colors cursor-pointer"
                        onClick={() => {
                          setShowTransporterDropdown(!showTransporterDropdown);
                          setTimeout(() => transporterSearchRef.current?.focus(), 100);
                        }}
                      >
                        <div className="flex-1 px-4 py-3">
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
                                    prev < filteredSuggestions.length - 1 ? prev + 1 : 0
                                  );
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setSelectedTransporterIdx(prev => 
                                    prev > 0 ? prev - 1 : filteredSuggestions.length - 1
                                  );
                                } else if (e.key === 'Enter' && selectedTransporterIdx >= 0) {
                                  e.preventDefault();
                                  handleSelectTransporter(filteredSuggestions[selectedTransporterIdx]);
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
                                    <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
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

                      {/* Dropdown List */}
                      {showTransporterDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                          {filteredSuggestions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No transporters match &quot;{transporterSearch}&quot;
                            </div>
                          ) : (
                            filteredSuggestions.map((t, idx) => {
                              const isCurrentlySelected = formData.transporter_id === (t.gst?.toUpperCase() || '') && 
                                                          formData.transporter_name === t.name;
                              const isKeyboardSelected = idx === selectedTransporterIdx;
                              return (
                                <div
                                  key={t.id || idx}
                                  onClick={() => handleSelectTransporter(t)}
                                  className={`px-4 py-3 cursor-pointer transition-all border-b border-gray-50 last:border-0 ${
                                    isCurrentlySelected
                                      ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                      : isKeyboardSelected
                                      ? 'bg-gray-100'
                                      : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        <span className="text-sm font-semibold text-gray-900 truncate">{t.name}</span>
                                        {isCurrentlySelected && (
                                          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">SELECTED</span>
                                        )}
                                      </div>
                                      <div className="mt-1 flex flex-wrap items-center gap-2 ml-6">
                                        {t.gst && (
                                          <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                            GST: {t.gst}
                                          </span>
                                        )}
                                        {!t.gst && (
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GSTIN */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      User GSTIN *
                    </label>
                    <input
                      type="text"
                      value={formData.user_gstin}
                      onChange={(e) => handleInputChange('user_gstin', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm shadow-sm"
                      placeholder="09COVPS5556J1ZT"
                    />
                  </div>

                  {/* Transporter ID */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Transporter ID (GSTIN) *
                      {!formData.transporter_id && (
                        <span className="text-red-500 text-sm ml-2">(Required)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.transporter_id}
                      onChange={(e) => handleInputChange('transporter_id', e.target.value.toUpperCase())}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm shadow-sm ${
                        !formData.transporter_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="05AAAAU6537D1ZO"
                    />
                    {transporterSuggestions.length > 0 && !formData.transporter_id && (
                      <p className="mt-1 text-xs text-amber-600">💡 Select a transporter above to auto-fill this field</p>
                    )}
                  </div>

                  {/* Transporter Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Transporter Name *
                      {!formData.transporter_name && (
                        <span className="text-red-500 text-sm ml-2">(Required)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.transporter_name}
                      onChange={(e) => handleInputChange('transporter_name', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm ${
                        !formData.transporter_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="MS Uttarayan"
                    />
                    {transporterSuggestions.length > 0 && !formData.transporter_name && (
                      <p className="mt-1 text-xs text-amber-600">💡 Select a transporter above to auto-fill this field</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.eway_bill_number || !formData.transporter_id || !formData.transporter_name}
                  className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-lg flex items-center justify-center gap-3 shadow-xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Updating Transporter...
                    </>
                  ) : (
                    <>
                      <Send className="w-6 h-6" />
                      Update Transporter
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
    </div>
  );
};

export default TransporterUpdateModal;