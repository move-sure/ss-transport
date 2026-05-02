import React, { useState, useEffect } from 'react';
import { Shield, Truck, FileText, Calendar, MapPin, Send, Loader2, CheckCircle, Download, ExternalLink, Copy, AlertTriangle, ChevronLeft, FileStack, CheckSquare, Square, Check } from 'lucide-react';
import { saveConsolidatedEwbValidation } from '../../utils/ewbValidationStorage';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

const ConsolidatedEwbForm = ({ ewbNumbers, challanData, ewbToGrMapping = {}, onBack }) => {
  const [formData, setFormData] = useState({
    userGstin: '09COVPS5556J1ZT',
    place_of_consignor: 'Aligarh',
    state_of_consignor: 'Uttar Pradesh',
    vehicle_number: '',
    mode_of_transport: '1',
    transporter_document_number: '',
    transporter_document_date: new Date().toISOString().split('T')[0],
    data_source: 'erp'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [existingCewbs, setExistingCewbs] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  
  // State for EWB selection
  const [selectedEwbs, setSelectedEwbs] = useState([]);
  
  // Get current user from auth context
  const { user: currentUser } = useAuth();

  // Initialize selected EWBs when ewbNumbers change
  useEffect(() => {
    if (ewbNumbers && ewbNumbers.length > 0) {
      setSelectedEwbs(ewbNumbers); // Select all by default
    }
  }, [ewbNumbers]);

  // EWB Selection handlers
  const handleSelectEwb = (ewb) => {
    setSelectedEwbs(prev => {
      if (prev.includes(ewb)) {
        return prev.filter(e => e !== ewb);
      } else {
        return [...prev, ewb];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedEwbs(ewbNumbers);
  };

  const handleDeselectAll = () => {
    setSelectedEwbs([]);
  };

  const isEwbSelected = (ewb) => selectedEwbs.includes(ewb);

  // Compute which EWBs were already used in a previous successful consolidation
  const alreadyConsolidatedEwbs = React.useMemo(() => {
    const set = new Set();
    existingCewbs.forEach(cewb => {
      if (cewb.is_valid && Array.isArray(cewb.included_ewb_numbers)) {
        cewb.included_ewb_numbers.forEach(e => set.add(e.replace(/-/g, '')));
      }
    });
    return set;
  }, [existingCewbs]);

  const isAlreadyConsolidated = (ewb) => alreadyConsolidatedEwbs.has(ewb.replace(/-/g, ''));

  // Find which consolidation(s) an EWB belongs to
  const getConsolidationForEwb = (ewb) => {
    const clean = ewb.replace(/-/g, '');
    return existingCewbs.find(cewb =>
      cewb.is_valid &&
      Array.isArray(cewb.included_ewb_numbers) &&
      cewb.included_ewb_numbers.some(e => e.replace(/-/g, '') === clean)
    ) || null;
  };

  // Fetch existing consolidated EWBs for this challan
  useEffect(() => {
    const fetchExistingCewbs = async () => {
      if (!challanData?.challan_no) {
        setLoadingExisting(false);
        return;
      }

      try {
        setLoadingExisting(true);
        const { data, error } = await supabase
          .from('consolidated_ewb_validations')
          .select('*')
          .eq('challan_no', challanData.challan_no)
          .order('validated_at', { ascending: false });

        if (error) throw error;

        console.log('📋 Found existing consolidated EWBs:', data);
        setExistingCewbs(data || []);
      } catch (err) {
        console.error('❌ Error fetching existing consolidated EWBs:', err);
      } finally {
        setLoadingExisting(false);
      }
    };

    fetchExistingCewbs();
  }, [challanData?.challan_no]);

  // Update vehicle number from challan data
  useEffect(() => {
    console.log('🔍 Challan Data:', challanData);
    if (challanData?.truck?.truck_number) {
      console.log('✅ Found truck number:', challanData.truck.truck_number);
      const truckNumber = challanData.truck.truck_number.replace(/-/g, '');
      console.log('🚛 Setting vehicle number:', truckNumber);
      setFormData(prev => ({ ...prev, vehicle_number: truckNumber }));
    } else {
      console.log('⚠️ No truck number found in challanData');
    }
  }, [challanData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (selectedEwbs.length === 0) {
      setError({
        message: 'Please select at least one E-Way Bill',
        details: 'You must select at least one EWB to create a consolidated e-way bill.'
      });
      return;
    }

    if (!formData.vehicle_number || !formData.place_of_consignor || !formData.state_of_consignor) {
      setError({
        message: 'Please fill all required fields',
        details: 'Vehicle Number, City, and State are mandatory fields.'
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        ...formData,
        transporter_document_date: formData.transporter_document_date.split('-').reverse().join('/'),
        list_of_eway_bills: selectedEwbs.map(ewb => ({
          eway_bill_number: ewb.replace(/-/g, '')
        }))
      };

      console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));
      console.log('📋 Selected EWBs:', selectedEwbs);

      const response = await fetch('https://api.movesure.io//api/consolidated-ewaybill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));

      // Handle both response structures: data.results and results
      const results = data.data?.results || data.results;
      const statusCode = results?.code || data.status_code;
      const statusText = results?.status || data.status;
      
      console.log('🔍 Parsed Response:', { results, statusCode, statusText });

      // Check for success response (code 200 or status 'Success' or 'success')
      if ((statusCode === 200 || statusText === 'Success' || statusText === 'success') && results?.message) {
        let pdfUrl = results.message?.url;
        console.log('📄 Original PDF URL:', pdfUrl);
        
        if (pdfUrl && !pdfUrl.startsWith('http')) {
          pdfUrl = `https://${pdfUrl}`;
        }
        
        console.log('🔗 Final PDF URL:', pdfUrl);
        console.log('📋 Consolidated EWB Number:', results.message?.cEwbNo);
        console.log('📅 Consolidated EWB Date:', results.message?.cEwbDate);
        
        const successResult = {
          success: true,
          cEwbNo: results.message?.cEwbNo,
          cEwbDate: results.message?.cEwbDate,
          url: pdfUrl,
          rawResponse: data
        };

        setResult(successResult);

        // Save to database (in background)
        if (currentUser?.id && challanData?.challan_no) {
          saveConsolidatedEwbValidation({
            challanNo: challanData.challan_no,
            consolidatedEwbNumber: results.message?.cEwbNo,
            includedEwbNumbers: selectedEwbs,
            validationResult: { success: true, data: results, ...successResult },
            userId: currentUser.id
          }).then(saveResult => {
            if (saveResult.success) {
              console.log('✅ Consolidated EWB saved to database');
            } else {
              console.error('❌ Failed to save consolidated EWB:', saveResult.error);
            }
          }).catch(err => console.error('❌ Save error:', err));
        }
        
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Handle error responses with detailed information
        // Check for nested error structure
        const errorData = data.error?.results || results || data;
        
        // Get the detailed error message from results
        const detailedMessage = errorData.message || data.message || 'Failed to create consolidated EWB';
        const errorCode = statusCode || response.status;
        const errorStatus = statusText || 'Error';
        
        throw new Error(JSON.stringify({
          message: detailedMessage,
          code: errorCode,
          status: errorStatus,
          fullResponse: data
        }));
      }
    } catch (err) {
      console.error('❌ Consolidated EWB Error:', err);
      
      // Parse error if it's JSON
      let errorDetails = {
        message: 'Failed to create consolidated EWB',
        details: err.message,
        code: null,
        status: null,
        fullResponse: null
      };
      
      try {
        const parsedError = JSON.parse(err.message);
        errorDetails = {
          message: parsedError.message || errorDetails.message,
          details: typeof parsedError.message === 'object' 
            ? JSON.stringify(parsedError.message, null, 2) 
            : parsedError.message,
          code: parsedError.code,
          status: parsedError.status,
          fullResponse: parsedError.fullResponse
        };
      } catch {
        // If not JSON, use the error message as is
        errorDetails.details = err.message;
      }
      
      setError(errorDetails);

      // Save error to database (in background)
      if (currentUser?.id && challanData?.challan_no) {
        saveConsolidatedEwbValidation({
          challanNo: challanData.challan_no,
          consolidatedEwbNumber: null,
          includedEwbNumbers: selectedEwbs,
          validationResult: { success: false, error: errorDetails.message, data: errorDetails },
          userId: currentUser.id
        }).then(saveResult => {
          if (saveResult.success) {
            console.log('✅ Consolidated EWB error saved to database');
          } else {
            console.error('❌ Failed to save consolidated EWB error:', saveResult.error);
          }
        }).catch(err => console.error('❌ Save error:', err));
      }
      
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setSelectedEwbs(ewbNumbers); // Reset to all selected
    const truckNumber = challanData?.truck?.truck_number?.replace(/-/g, '') || '';
    setFormData({
      userGstin: '09COVPS5556J1ZT',
      place_of_consignor: 'Aligarh',
      state_of_consignor: 'Uttar Pradesh',
      vehicle_number: truckNumber,
      mode_of_transport: '1',
      transporter_document_number: '',
      transporter_document_date: new Date().toISOString().split('T')[0],
      data_source: 'erp'
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Create Consolidated E-Way Bill</h2>
              <p className="text-blue-100 text-sm">
                {selectedEwbs.length} of {ewbNumbers.length} EWB{ewbNumbers.length > 1 ? 's' : ''} selected for consolidation
              </p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to EWBs
          </button>
        </div>
      </div>

      {/* Existing Consolidated EWBs */}
      {loadingExisting ? (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading existing consolidated EWBs...</span>
          </div>
        </div>
      ) : existingCewbs.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileStack className="w-5 h-5 text-blue-600" />
              Previously Created Consolidated E-Way Bills - Challan {challanData?.challan_no}
            </h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {existingCewbs.length} Record{existingCewbs.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3">
            {existingCewbs.map((cewb, index) => (
              <div key={cewb.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-gray-900 font-mono">{cewb.consolidated_ewb_number}</span>
                      {cewb.is_valid ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Valid</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Invalid</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Total EWBs:</span>
                        <span className="ml-1 font-semibold text-gray-900">{cewb.total_ewb_count || cewb.included_ewb_numbers?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Created:</span>
                        <span className="ml-1 font-semibold text-gray-900">
                          {new Date(cewb.validated_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Time:</span>
                        <span className="ml-1 font-semibold text-gray-900">
                          {new Date(cewb.validated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-1 font-semibold text-gray-900">{cewb.validation_status || 'N/A'}</span>
                      </div>
                    </div>
                    {cewb.included_ewb_numbers && cewb.included_ewb_numbers.length > 0 && (
                      <div className="mt-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">View included EWBs ({cewb.included_ewb_numbers.length})</summary>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {cewb.included_ewb_numbers.map((ewb, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-900 rounded font-mono text-xs">{ewb}</span>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                  {cewb.raw_result_metadata?.url && (
                    <a
                      href={cewb.raw_result_metadata.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              💡 You can create a new consolidated EWB below if needed. Each consolidation is saved for your records.
            </p>
          </div>
        </div>
      )}

      {/* Success Result */}
      {result && result.success && (
        <div className="bg-white rounded-xl shadow-lg border border-green-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800">Consolidated EWB Created Successfully!</h3>
                <p className="text-sm text-green-600">Your consolidated e-way bill has been generated</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {/* EWB Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.cEwbNo && (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Consolidated EWB Number</span>
                    <div className="text-2xl font-bold text-green-900 font-mono mt-1">{result.cEwbNo}</div>
                  </div>
                  <button 
                    onClick={() => navigator.clipboard.writeText(result.cEwbNo)}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    title="Copy EWB Number"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              {result.cEwbDate && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Generated On</span>
                  <div className="text-lg font-semibold text-blue-900 mt-1">{result.cEwbDate}</div>
                </div>
              )}
            </div>
            
            {/* PDF Download */}
            {result.url && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-700">PDF Document</span>
                    <p className="text-xs text-gray-500 mt-1">Download or view the consolidated EWB PDF</p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                    <button
                      onClick={() => window.open(result.url, '_blank')}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={reset}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Create Another
              </button>
              <button
                onClick={onBack}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Back to EWBs
              </button>
            </div>
            
            {/* Debug Information */}
            {result.rawResponse && (
              <details className="mt-4">
                <summary className="text-xs text-gray-700 font-semibold cursor-pointer hover:text-gray-900 mb-2">📋 Debug: Complete API Response</summary>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <pre className="text-xs text-gray-800 overflow-auto max-h-60 whitespace-pre-wrap break-words font-mono">
{JSON.stringify(result.rawResponse, null, 2)}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 border-b border-red-200">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-red-800 mb-1">Failed to Create Consolidated EWB</h4>
                <p className="text-sm font-medium text-red-700">{error.message}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Error Details */}
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">Error Details</p>
              <div className="space-y-3">
                {error.code && (
                  <div>
                    <span className="text-xs font-semibold text-red-600 block mb-1">Error Code:</span>
                    <span className="text-sm font-mono text-red-900 bg-red-100 px-3 py-1.5 rounded block w-fit">{error.code}</span>
                  </div>
                )}
                {error.status && (
                  <div>
                    <span className="text-xs font-semibold text-red-600 block mb-1">Status:</span>
                    <span className="text-sm font-mono text-red-900 bg-red-100 px-3 py-1.5 rounded block w-fit">{error.status}</span>
                  </div>
                )}
                {error.message && (
                  <div>
                    <span className="text-xs font-semibold text-red-600 block mb-1">Message:</span>
                    <div className="text-sm text-red-800 bg-red-100 p-3 rounded leading-relaxed">
                      {error.message}
                    </div>
                  </div>
                )}
                {error.details && error.details !== error.message && (
                  <div>
                    <span className="text-xs font-semibold text-red-600 block mb-1">Additional Details:</span>
                    <pre className="text-xs text-red-700 whitespace-pre-wrap break-words font-mono bg-red-100 p-3 rounded">
{error.details}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            
            {/* Full Response Debug */}
            {error.fullResponse && (
              <details>
                <summary className="text-xs text-gray-700 font-semibold cursor-pointer hover:text-gray-900 mb-2">🔍 Full API Response</summary>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <pre className="text-xs text-gray-800 overflow-auto max-h-60 whitespace-pre-wrap break-words font-mono">
{JSON.stringify(error.fullResponse, null, 2)}
                  </pre>
                </div>
              </details>
            )}
            
            {/* Invalid EWB - Transfer Hint */}
            {error.message && (error.message.toLowerCase().includes('invalid eway bill') || error.message.toLowerCase().includes('invalid e-way bill')) && (
              <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-400">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900 mb-2">⚠️ E-Way Bill Not Found on Your GSTIN</p>
                    <p className="text-sm text-amber-800 mb-3">
                      The selected E-Way Bill(s) are not linked to your GSTIN. Please <strong>transfer the E-Way Bill</strong> to the following GSTIN first, then retry.
                    </p>
                    <div className="flex items-center gap-2 bg-white border-2 border-amber-300 rounded-lg px-4 py-3 w-fit">
                      <span className="text-xs font-semibold text-amber-700 uppercase">Transfer To:</span>
                      <span className="text-base font-bold font-mono text-gray-900 tracking-wide">09COVPS5556J1ZT</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('09COVPS5556J1ZT');
                          const btn = document.getElementById('gstin-copy-btn');
                          if (btn) {
                            btn.textContent = '✓ Copied!';
                            btn.classList.remove('bg-amber-600', 'hover:bg-amber-700');
                            btn.classList.add('bg-green-600');
                            setTimeout(() => {
                              btn.textContent = 'Copy';
                              btn.classList.remove('bg-green-600');
                              btn.classList.add('bg-amber-600', 'hover:bg-amber-700');
                            }, 2000);
                          }
                        }}
                        id="gstin-copy-btn"
                        className="ml-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-amber-600 mt-2">
                      Go to the E-Way Bill portal → Transfer EWB → Enter above GSTIN → Come back and retry.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Common Issues */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wide mb-2">💡 Common Issues</p>
              <ul className="text-xs text-yellow-700 space-y-1.5">
                <li>• Check if all EWB numbers are valid and active</li>
                <li>• Ensure vehicle number format is correct (no hyphens, e.g., UP14AB1234)</li>
                <li>• Verify transporter document date is not in future</li>
                <li>• Confirm all required fields are filled correctly</li>
                <li>• Check if the EWB numbers belong to the same GSTIN</li>
                <li>• If EWB shows &quot;Invalid&quot;, transfer it to <strong>09COVPS5556J1ZT</strong> on the EWB portal</li>
              </ul>
            </div>
            
            {/* Retry Button */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setError(null)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Back to EWBs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EWB Numbers List with Selection */}
      {!result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">Select E-Way Bills</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleSelectAll} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium">
                <CheckSquare className="w-3 h-3" /> All
              </button>
              <button onClick={handleDeselectAll} className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-xs font-medium">
                <Square className="w-3 h-3" /> None
              </button>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {selectedEwbs.length}/{ewbNumbers.length}
              </span>
            </div>
          </div>

          {/* Legend */}
          {alreadyConsolidatedEwbs.size > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px]">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 border border-emerald-200 rounded-full text-emerald-700 font-medium">
                <CheckCircle className="w-3 h-3" /> Previously consolidated
              </div>
              <span className="text-gray-400">Can still be re-included.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {ewbNumbers.map((ewb, index) => {
              const isSelected = isEwbSelected(ewb);
              const isDone = isAlreadyConsolidated(ewb);
              const prevCewb = isDone ? getConsolidationForEwb(ewb) : null;
              const grMappings = ewbToGrMapping[ewb] || [];
              return (
                <button
                  key={index}
                  onClick={() => handleSelectEwb(ewb)}
                  className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border transition-all duration-150 text-left ${
                    isSelected && isDone
                      ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-200'
                      : isSelected
                      ? 'bg-green-50 border-green-300 ring-1 ring-green-200'
                      : isDone
                      ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected ? 'bg-green-500 text-white' : isDone ? 'bg-emerald-200 border border-emerald-300' : 'bg-gray-100 border border-gray-300'
                  }`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* EWB + Done badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-mono font-semibold ${
                        isSelected ? 'text-green-900' : isDone ? 'text-emerald-800' : 'text-gray-800'
                      }`}>{ewb}</span>
                      {isDone && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-600 text-white rounded-full text-[9px] font-bold">
                          <CheckCircle className="w-2 h-2" /> Done
                        </span>
                      )}
                    </div>
                    {/* GR Numbers */}
                    {grMappings.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {grMappings.map((m, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-mono font-semibold border border-blue-200">
                            GR: {m.gr_no}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Previous CEWB */}
                    {isDone && prevCewb?.consolidated_ewb_number && (
                      <p className="text-[9px] text-emerald-600 font-medium mt-0.5 truncate">
                        CEWB: {prevCewb.consolidated_ewb_number}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedEwbs.length === 0 ? (
            <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-700 font-medium">⚠️ Select at least one EWB.</p>
            </div>
          ) : (
            <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200 space-y-0.5">
              <p className="text-xs text-green-700">✅ {selectedEwbs.length} EWB{selectedEwbs.length > 1 ? 's' : ''} selected for consolidation.</p>
              {(() => {
                const doneCount = selectedEwbs.filter(e => isAlreadyConsolidated(e)).length;
                return doneCount > 0 ? (
                  <p className="text-[10px] text-amber-700 font-medium">⚠️ {doneCount} already consolidated — re-consolidating will create a new CEWB.</p>
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {!result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-600" />
            Transport Details
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* GSTIN */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">GSTIN *</label>
              <input
                type="text"
                value={formData.userGstin}
                onChange={(e) => handleInputChange('userGstin', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs shadow-sm"
                placeholder="09COVPS5556J1ZT"
              />
            </div>

            {/* Vehicle Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Vehicle No. *</label>
              <input
                type="text"
                value={formData.vehicle_number}
                onChange={(e) => handleInputChange('vehicle_number', e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs shadow-sm text-gray-900"
                placeholder="UP14AB1234"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">City *</label>
              <input
                type="text"
                value={formData.place_of_consignor}
                onChange={(e) => handleInputChange('place_of_consignor', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs shadow-sm text-gray-900"
                placeholder="Aligarh"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">State *</label>
              <input
                type="text"
                value={formData.state_of_consignor}
                onChange={(e) => handleInputChange('state_of_consignor', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs shadow-sm text-gray-900"
                placeholder="Uttar Pradesh"
              />
            </div>

            {/* Mode of Transport */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mode</label>
              <select
                value={formData.mode_of_transport}
                onChange={(e) => handleInputChange('mode_of_transport', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs shadow-sm text-gray-900"
              >
                <option value="1">Road</option>
                <option value="2">Rail</option>
                <option value="3">Air</option>
                <option value="4">Ship</option>
              </select>
            </div>

            {/* Transporter Document Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Doc No.</label>
              <input
                type="text"
                value={formData.transporter_document_number}
                onChange={(e) => handleInputChange('transporter_document_number', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs shadow-sm text-gray-900"
                placeholder="TD002"
              />
            </div>

            {/* Transporter Document Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Doc Date</label>
              <input
                type="date"
                value={formData.transporter_document_date}
                onChange={(e) => handleInputChange('transporter_document_date', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs shadow-sm text-gray-900"
              />
            </div>

            {/* Data Source */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Source</label>
              <select
                value={formData.data_source}
                onChange={(e) => handleInputChange('data_source', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs shadow-sm text-gray-900"
              >
                <option value="erp">ERP</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4 mt-3 border-t border-gray-100">
            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedEwbs.length === 0}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center gap-2 shadow-md"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : (
                <><Send className="w-4 h-4" /> Create CEWB ({selectedEwbs.length} EWBs)</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsolidatedEwbForm;
