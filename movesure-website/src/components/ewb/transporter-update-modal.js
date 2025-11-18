import React, { useState, useEffect, useMemo } from 'react';
import { Truck, User, Send, X, Loader2, CheckCircle, AlertTriangle, Edit3, Download, ExternalLink } from 'lucide-react';
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

const TransporterUpdateModal = ({ grData, ewbNumbers }) => {
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
  const [showDebug, setShowDebug] = useState(true);

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

  // Reset effect - only resets when GR changes
  useEffect(() => {
    // Reset everything to initial state
    setFormData(createEmptyFormState());
    setResult(null);
    setError(null);
    setAutoFillStatus({ loading: false, attempted: false, match: null, error: null });
    setLastAttemptSignature(null);
  }, [grData?.gr_no]);

  // Auto-fill effect - runs after reset, attempts to fill transporter details
  useEffect(() => {
    if (!grData) {
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

      // Check if first call was successful
      if (data1.results?.status === 'Success' && data1.results?.code === 200) {
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
        const finalData = (data2.results?.status === 'Success' && data2.results?.code === 200) ? data2 : data1;
        
        // Extract PDF URL from second response if available
        let pdfUrl = finalData.results.message?.url || data2.results?.message?.url;
        if (pdfUrl && !pdfUrl.startsWith('http')) {
          pdfUrl = `https://${pdfUrl}`;
        }
        
        console.log('📄 PDF URL:', pdfUrl);
        
        setResult({
          success: true,
          message: finalData.message || 'Transporter updated successfully!',
          ewbNumber: finalData.results.message?.ewayBillNo || formData.eway_bill_number,
          transporterId: finalData.results.message?.transporterId || formData.transporter_id,
          transporterName: formData.transporter_name,
          updateDate: finalData.results.message?.transUpdateDate,
          pdfUrl: pdfUrl,
          rawResponse: finalData
        });
      } else if (!response1.ok) {
        throw new Error(`HTTP ${response1.status}: Failed to update transporter`);
      } else {
        throw new Error('Unexpected response format from server');
      }
    } catch (err) {
      console.error('❌ Transporter Update Error:', err);
      
      // Try to parse structured error
      try {
        const errorObj = JSON.parse(err.message);
        setError({
          code: errorObj.code,
          status: errorObj.status,
          message: errorObj.message,
          fullResponse: errorObj.fullResponse
        });
      } catch {
        // If not JSON, use the error message as is
        setError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setFormData(createEmptyFormState());
    setAutoFillStatus({
      loading: false,
      attempted: false,
      match: null,
      error: null
    });
    setLastAttemptSignature(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <Edit3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Update Transporter ID</h1>
              <p className="text-lg text-gray-600 mt-1">
                GR Number: <span className="font-bold text-blue-600">{grData?.gr_no || 'N/A'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Debug Information - Always visible when there's data */}
          {(result || error || formData.eway_bill_number) && (
            <div className="bg-gray-900 rounded-lg shadow-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  🐛 Debug Information
                </h3>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
                >
                  {showDebug ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showDebug && (
                <div className="space-y-4">
                  {/* Form Data */}
                  <div className="bg-gray-800 rounded p-4">
                    <div className="text-sm font-bold text-yellow-400 mb-2">📝 Current Form Data:</div>
                    <pre className="text-xs text-green-300 overflow-auto max-h-60 font-mono">
{JSON.stringify(formData, null, 2)}
                    </pre>
                  </div>

                  {/* API Response */}
                  {result && (
                    <div className="bg-gray-800 rounded p-4">
                      <div className="text-sm font-bold text-green-400 mb-2">✅ API Response (Success):</div>
                      <pre className="text-xs text-green-300 overflow-auto max-h-60 font-mono">
{JSON.stringify(result.rawResponse || result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Error Response */}
                  {error && (
                    <div className="bg-gray-800 rounded p-4">
                      <div className="text-sm font-bold text-red-400 mb-2">❌ API Response (Error):</div>
                      <pre className="text-xs text-red-300 overflow-auto max-h-60 font-mono">
{JSON.stringify(typeof error === 'object' ? error : { message: error }, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Auto-fill Status */}
                  <div className="bg-gray-800 rounded p-4">
                    <div className="text-sm font-bold text-blue-400 mb-2">🔍 Auto-fill Status:</div>
                    <pre className="text-xs text-blue-300 overflow-auto max-h-40 font-mono">
{JSON.stringify(autoFillStatus, null, 2)}
                    </pre>
                  </div>

                  {/* City Hints */}
                  {cityHints && (
                    <div className="bg-gray-800 rounded p-4">
                      <div className="text-sm font-bold text-purple-400 mb-2">📍 City Hints:</div>
                      <pre className="text-xs text-purple-300 overflow-auto max-h-40 font-mono">
{JSON.stringify(cityHints, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* GR Data */}
                  {grData && (
                    <div className="bg-gray-800 rounded p-4">
                      <div className="text-sm font-bold text-cyan-400 mb-2">📦 GR Data:</div>
                      <pre className="text-xs text-cyan-300 overflow-auto max-h-60 font-mono">
{JSON.stringify(grData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* EWB Numbers */}
                  {ewbNumbers && ewbNumbers.length > 0 && (
                    <div className="bg-gray-800 rounded p-4">
                      <div className="text-sm font-bold text-pink-400 mb-2">🔢 Available EWB Numbers:</div>
                      <pre className="text-xs text-pink-300 overflow-auto max-h-40 font-mono">
{JSON.stringify(ewbNumbers, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-4 border-red-500">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-8 h-8 text-red-600 mt-1" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-red-800 mb-3">Failed to Update Transporter</h3>
                  
                  {typeof error === 'object' ? (
                    <div className="space-y-4">
                      {/* Error Code */}
                      {error.code && (
                        <div className="bg-white rounded-lg p-4 border border-red-200">
                          <div className="text-sm font-semibold text-red-700 mb-1">Error Code</div>
                          <div className="text-2xl font-bold text-red-900">{error.code}</div>
                        </div>
                      )}
                      
                      {/* Error Status */}
                      {error.status && (
                        <div className="bg-white rounded-lg p-4 border border-red-200">
                          <div className="text-sm font-semibold text-red-700 mb-1">Status</div>
                          <div className="text-lg font-bold text-red-900">{error.status}</div>
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {error.message && (
                        <div className="bg-white rounded-lg p-4 border border-red-200">
                          <div className="text-sm font-semibold text-red-700 mb-2">Error Details</div>
                          <div className="text-base text-red-900 leading-relaxed">
                            {error.message.split('||').map((msg, idx) => (
                              <div key={idx} className="mb-2 last:mb-0">
                                <span className="inline-flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                  <span className="font-medium">{msg.trim()}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Helpful Tips */}
                      <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-200">
                        <p className="text-sm font-semibold text-red-800 mb-2">💡 How to Fix:</p>
                        <ul className="text-sm text-red-700 space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="text-red-500 font-bold">•</span>
                            <span>Verify the <strong>Transporter ID (GSTIN)</strong> is correct and registered</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-500 font-bold">•</span>
                            <span>Ensure the GSTIN is mapped to your logged-in account</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-500 font-bold">•</span>
                            <span>Check if the E-Way Bill number is valid and active</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-500 font-bold">•</span>
                            <span>Confirm the Transporter Name matches the registered name exactly</span>
                          </li>
                        </ul>
                      </div>
                      
                      {/* Full Response (Collapsible) */}
                      {error.fullResponse && (
                        <details className="mt-4">
                          <summary className="text-sm text-red-700 font-semibold cursor-pointer hover:text-red-900 mb-2">
                            📋 View Full API Response
                          </summary>
                          <div className="mt-2 p-4 bg-white rounded-lg border border-red-200">
                            <pre className="text-xs text-gray-800 overflow-auto max-h-60 whitespace-pre-wrap break-words font-mono">
{JSON.stringify(error.fullResponse, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-base text-red-800 mb-3 font-medium">{error}</p>
                      <div className="mt-3 p-3 bg-red-100 rounded-lg">
                        <p className="text-sm text-red-600 font-medium mb-1">Common Issues:</p>
                        <ul className="text-sm text-red-600 space-y-1">
                          <li>• Check if the E-Way Bill number is valid and active</li>
                          <li>• Ensure Transporter ID format is correct (e.g., 05AAAAU6537D1ZO)</li>
                          <li>• Verify Transporter Name matches the registered name</li>
                          <li>• Confirm all required fields are filled</li>
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
              <div className="bg-white rounded-lg shadow-lg p-6">
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
      </div>
    </div>
  );
};

export default TransporterUpdateModal;