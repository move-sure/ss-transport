import React, { useState, useEffect, useMemo } from 'react';
import { Truck, User, Send, X, Loader2, CheckCircle, AlertTriangle, Edit3 } from 'lucide-react';
import supabase from '../../app/utils/supabase';

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

const TransporterUpdateModal = ({ isOpen, onClose, grData, ewbNumbers }) => {
  const [formData, setFormData] = useState(createEmptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [autoFillStatus, setAutoFillStatus] = useState({
    loading: false,
    attempted: false,
    match: null,
    error: null
  });
  const [lastAttemptSignature, setLastAttemptSignature] = useState(null);

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

  const citySignature = useMemo(() => {
    if (!cityHints) return null;
    return [
      cityHints.cityId || '',
      cityHints.cityCode || '',
      (cityHints.cityName || '').toLowerCase()
    ].join('|');
  }, [cityHints]);

  // Reset effect - only resets when modal opens or GR changes
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Reset everything to initial state
    setFormData(createEmptyFormState());
    setResult(null);
    setError(null);
    setAutoFillStatus({ loading: false, attempted: false, match: null, error: null });
    setLastAttemptSignature(null);
  }, [isOpen, grData?.gr_no]);

  // Auto-fill effect - runs after reset, attempts to fill transporter details
  useEffect(() => {
    if (!isOpen || !grData) {
      return;
    }

    // If no city hints, mark as attempted and exit
    if (!cityHints) {
      if (!autoFillStatus.attempted) {
        setAutoFillStatus({ loading: false, attempted: true, match: null, error: null });
      }
      return;
    }

    // If already attempted with same signature, don't retry
    if (autoFillStatus.attempted && lastAttemptSignature === citySignature) {
      return;
    }

    // If city changed, reset attempt status
    if (autoFillStatus.attempted && citySignature && lastAttemptSignature !== citySignature) {
      setAutoFillStatus({ loading: false, attempted: false, match: null, error: null });
      setLastAttemptSignature(null);
      return;
    }

    let cancelled = false;

    const lookupTransporterForCity = async () => {
      setAutoFillStatus({ loading: true, attempted: true, match: null, error: null });
      setLastAttemptSignature(citySignature);

      try {
        const normalizedName = cityHints.cityName ? cityHints.cityName.trim() : null;
        const normalizedCode = cityHints.cityCode ? cityHints.cityCode.trim() : null;
        let targetCityId = cityHints.cityId || null;
        let resolvedCity = null;

        if (!targetCityId) {
          let cityQuery = supabase
            .from('cities')
            .select('id, city_name, city_code')
            .limit(1);

          if (normalizedCode) {
            cityQuery = cityQuery.eq('city_code', normalizedCode);
          } else if (normalizedName) {
            cityQuery = cityQuery.ilike('city_name', normalizedName);
          }

          let { data: cityRows, error: cityError } = await cityQuery;
          if (cityError) throw cityError;

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
            if (!cancelled) {
              setAutoFillStatus({ loading: false, attempted: true, match: null, error: null });
            }
            return;
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
        
        let { data: transportRows, error: transportError } = await supabase
          .from('transports')
          .select('id, transport_name, gst_number, city_id, city_name, mob_number')
          .eq('city_id', targetCityId)
          .not('transport_name', 'is', null)
          .limit(1);

        if (transportError) throw transportError;

        let transportRecord = transportRows?.[0];
        
        console.log('📦 Transport query result:', transportRecord);
        
        console.log('📦 Transport query result:', transportRecord);

        if (!transportRecord && (normalizedName || resolvedCity?.city_name)) {
          const fallbackName = resolvedCity?.city_name || normalizedName;
          console.log('🔄 Trying fallback query with city name:', fallbackName);
          
          const { data: fallbackRows, error: fallbackError } = await supabase
            .from('transports')
            .select('id, transport_name, gst_number, city_id, city_name, mob_number')
            .ilike('city_name', `%${fallbackName}%`)
            .not('transport_name', 'is', null)
            .not('gst_number', 'is', null)
            .limit(1);

          if (fallbackError) throw fallbackError;
          transportRecord = fallbackRows?.[0];
          
          console.log('🔄 Fallback query result:', transportRecord);
        }

        // If still no match, try getting ANY transporter with GST (last resort)
        if (!transportRecord) {
          console.log('🆘 No city match, fetching any transporter with GST...');
          
          const { data: anyRows, error: anyError } = await supabase
            .from('transports')
            .select('id, transport_name, gst_number, city_id, city_name, mob_number')
            .not('transport_name', 'is', null)
            .not('gst_number', 'is', null)
            .limit(1);

          if (anyError) throw anyError;
          transportRecord = anyRows?.[0];
          
          console.log('🆘 Any transporter result:', transportRecord);
        }

        if (!cancelled) {
          if (transportRecord && (transportRecord.gst_number || transportRecord.transport_name)) {
            console.log('✅ Found transporter:', {
              name: transportRecord.transport_name,
              gst: transportRecord.gst_number,
              city: transportRecord.city_name
            });
            
            // Direct state update - set both values explicitly
            const newTransporterId = transportRecord.gst_number ? transportRecord.gst_number.toUpperCase() : '';
            const newTransporterName = transportRecord.transport_name || '';
            
            console.log('📝 Setting form values:', {
              transporter_id: newTransporterId,
              transporter_name: newTransporterName
            });
            
            setFormData(prev => ({
              ...prev,
              transporter_id: newTransporterId,
              transporter_name: newTransporterName
            }));

            setAutoFillStatus({
              loading: false,
              attempted: true,
              match: {
                name: transportRecord.transport_name || null,
                gst: transportRecord.gst_number || null,
                city: transportRecord.city_name || resolvedCity?.city_name || normalizedName || 'Selected city',
                phone: transportRecord.mob_number || null
              },
              error: null
            });
          } else {
            console.log('❌ No transporter found');
            setAutoFillStatus({ loading: false, attempted: true, match: null, error: null });
          }
        }
      } catch (lookupError) {
        console.error('Auto-fill transporter lookup failed:', lookupError);
        if (!cancelled) {
          setAutoFillStatus({
            loading: false,
            attempted: true,
            match: null,
            error: lookupError.message || 'Failed to fetch transporter details'
          });
        }
      }
    };

    lookupTransporterForCity();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    grData?.gr_no,
    citySignature
  ]);

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

      console.log('Sending transporter update payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('http://localhost:5000/api/transporter-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Transporter Update API Response:', data);

      // Check for success response - updated to match actual API response format
      if (data.results?.status === 'Success' && data.results?.code === 200) {
        // Check if there's an error flag in the response
        if (data.results.message?.error === true) {
          throw new Error('API returned error flag: Update failed');
        }
        
        setResult({
          success: true,
          message: data.message || 'Transporter updated successfully!',
          ewbNumber: data.results.message?.ewayBillNo || formData.eway_bill_number,
          transporterId: data.results.message?.transporterId || formData.transporter_id,
          transporterName: formData.transporter_name,
          updateDate: data.results.message?.transUpdateDate,
          rawResponse: data
        });
      } else if (data.results?.status === 'No Content' || data.results?.code >= 400) {
        throw new Error(data.results?.message || `Error ${data.results?.code}: Failed to update transporter`);
      } else if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: Failed to update transporter`);
      } else {
        throw new Error('Unexpected response format from server');
      }
    } catch (err) {
      console.error('Transporter Update Error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = (enableAutoFill = true) => {
    setResult(null);
    setError(null);
    setFormData(createEmptyFormState());
    setAutoFillStatus({
      loading: false,
      attempted: enableAutoFill ? false : true,
      match: null,
      error: null
    });
    setLastAttemptSignature(null);
  };

  const handleClose = () => {
    reset(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Edit3 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Update Transporter ID</h2>
              <p className="text-sm text-gray-600">
                GR Number: <span className="font-medium">{grData?.gr_no}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Success Result */}
          {result && result.success && (
            <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
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
              </div>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Update Another
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>

              {/* Debug Information (for development) */}
              {process.env.NODE_ENV === 'development' && result.rawResponse && (
                <details className="mt-4">
                  <summary className="text-xs text-gray-500 cursor-pointer">Debug: Raw API Response</summary>
                  <pre className="text-xs text-gray-600 mt-2 p-3 bg-gray-100 rounded overflow-auto max-h-40">
                    {JSON.stringify(result.rawResponse, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-800 mb-1">Failed to Update Transporter</h4>
                  <p className="text-sm text-red-700">{error}</p>
                  
                  <div className="mt-3 p-3 bg-red-100 rounded-lg">
                    <p className="text-xs text-red-600 font-medium mb-1">Common Issues:</p>
                    <ul className="text-xs text-red-600 space-y-1">
                      <li>• Check if the E-Way Bill number is valid and active</li>
                      <li>• Ensure Transporter ID format is correct (e.g., 05AAAAU6537D1ZO)</li>
                      <li>• Verify Transporter Name matches the registered name</li>
                      <li>• Confirm all required fields are filled</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GR Information */}
          {grData && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
          {ewbNumbers.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">
                Select E-Way Bill to Update *
                {!formData.eway_bill_number && (
                  <span className="text-red-500 text-sm ml-2">(Required)</span>
                )}
              </h3>
              <div className="space-y-2">
                {ewbNumbers.map((ewb, index) => (
                  <label key={index} className={`flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                    formData.eway_bill_number === ewb ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="ewb_selection"
                      value={ewb}
                      checked={formData.eway_bill_number === ewb}
                      onChange={(e) => handleInputChange('eway_bill_number', e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 font-mono text-sm font-medium text-gray-900">{ewb}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          {!result && (
            <div className="space-y-6">
              {/* Debug Information (for development) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-2">Debug: Form Data</h4>
                  <pre className="text-xs text-yellow-700 whitespace-pre-wrap">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                  <div className="mt-2 text-xs text-yellow-600">
                    EWB Numbers available: {ewbNumbers.length} ({ewbNumbers.join(', ')})
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Transporter Information
                </h3>

                {autoFillStatus.loading && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-blue-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Matching saved transporter for this destination…</span>
                  </div>
                )}

                {!autoFillStatus.loading && autoFillStatus.match && (
                  <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    <div className="font-medium text-emerald-800">Auto-filled transporter details</div>
                    <div className="mt-1 text-xs text-emerald-700">
                      {autoFillStatus.match.city ? `City: ${autoFillStatus.match.city}` : 'City matched'}
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

                {!autoFillStatus.loading && autoFillStatus.attempted && !autoFillStatus.match && !autoFillStatus.error && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    No saved transporter found for {cityHints?.cityName || 'this city'}. Fill in the details below.
                  </div>
                )}

                {!autoFillStatus.loading && autoFillStatus.error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    Could not auto-fill transporter details. {autoFillStatus.error}
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
                      Transporter ID *
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
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.eway_bill_number || !formData.transporter_id || !formData.transporter_name}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center gap-2 shadow-lg"
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
          )}
        </div>
      </div>
    </div>
  );
};

export default TransporterUpdateModal;