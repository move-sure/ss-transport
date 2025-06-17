'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/dashboard/navbar';
import { getActiveEwbToken, updateTokenUsage } from '../../components/ewb/token-helper';
import { 
  Truck, 
  Plus, 
  Trash2, 
  FileText, 
  Key, 
  Shield,
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react';

const INDIAN_STATES = [
  { code: 1, name: "Jammu and Kashmir" },
  { code: 2, name: "Himachal Pradesh" },
  { code: 3, name: "Punjab" },
  { code: 4, name: "Chandigarh" },
  { code: 5, name: "Uttarakhand" },
  { code: 6, name: "Haryana" },
  { code: 7, name: "Delhi" },
  { code: 8, name: "Rajasthan" },
  { code: 9, name: "Uttar Pradesh" },
  { code: 10, name: "Bihar" },
  { code: 11, name: "Sikkim" },
  { code: 12, name: "Arunachal Pradesh" },
  { code: 13, name: "Nagaland" },
  { code: 14, name: "Manipur" },
  { code: 15, name: "Mizoram" },
  { code: 16, name: "Tripura" },
  { code: 17, name: "Meghalaya" },
  { code: 18, name: "Assam" },
  { code: 19, name: "West Bengal" },
  { code: 20, name: "Jharkhand" },
  { code: 21, name: "Odisha" },
  { code: 22, name: "Chhattisgarh" },
  { code: 23, name: "Madhya Pradesh" },
  { code: 24, name: "Gujarat" },
  { code: 25, name: "Daman and Diu" },
  { code: 26, name: "Dadra and Nagar Haveli" },
  { code: 27, name: "Maharashtra" },
  { code: 29, name: "Karnataka" },
  { code: 30, name: "Goa" },
  { code: 31, name: "Lakshadweep" },
  { code: 32, name: "Kerala" },
  { code: 33, name: "Tamil Nadu" },
  { code: 34, name: "Puducherry" },
  { code: 35, name: "Andaman and Nicobar Islands" },
  { code: 36, name: "Telangana" },
  { code: 37, name: "Andhra Pradesh" },
  { code: 38, name: "Ladakh" }
];

const TRANSPORT_MODES = [
  { code: "1", name: "Road" },
  { code: "2", name: "Rail" },
  { code: "3", name: "Air" },
  { code: "4", name: "Ship" }
];

export default function ConsolidatedEWBPage() {
  const { user, requireAuth, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState({
    fromPlace: '',
    fromState: '',
    vehicleNo: '',
    transMode: '1',
    transDocNo: '',
    transDocDate: new Date().toISOString().split('T')[0]
  });
  
  const [ewbBills, setEwbBills] = useState([{ ewbNo: '' }]);
  
  // Token and API state
  const [ewbToken, setEwbToken] = useState(null);
  const [apiKey] = useState('key_live_ntAPuJY6MmlucPdCo2cwL7eIXZIAXO0j');
  const [showToken, setShowToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
    // UI state
  const [loading, setLoading] = useState(false);
  const [fetchingToken, setFetchingToken] = useState(false);
  const [testingNetwork, setTestingNetwork] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  useEffect(() => {
    if (!authLoading && !requireAuth()) {
      return;
    }
    
    if (user) {
      fetchActiveEwbToken();
    }
  }, [user, authLoading, requireAuth, fetchActiveEwbToken]);

  const fetchActiveEwbToken = async () => {
    try {
      setFetchingToken(true);
      setError('');
      setDebugInfo('Fetching EWB token...');

      // Get the GSTIN from user details or use default
      const gstin = user?.gstin || '09COVPS5556J1ZT';
      
      const result = await getActiveEwbToken(gstin);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch EWB token');
      }

      if (!result.data) {
        throw new Error(`No active EWB token found for GSTIN: ${gstin}`);
      }

      setEwbToken(result.data);
      setDebugInfo(`✅ EWB token loaded successfully for GSTIN: ${gstin}`);
      
    } catch (err) {
      console.error('Error fetching EWB token:', err);
      setError(err.message);
      setDebugInfo(`❌ Error: ${err.message}`);
    } finally {
      setFetchingToken(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addEwbBill = () => {
    setEwbBills(prev => [...prev, { ewbNo: '' }]);
  };

  const removeEwbBill = (index) => {
    if (ewbBills.length > 1) {
      setEwbBills(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateEwbBill = (index, value) => {
    setEwbBills(prev => prev.map((bill, i) => 
      i === index ? { ewbNo: value } : bill
    ));
  };

  const formatDateForAPI = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.fromPlace.trim()) errors.push('From Place is required');
    if (!formData.fromState) errors.push('From State is required');
    if (!formData.vehicleNo.trim()) errors.push('Vehicle Number is required');
    if (!formData.transDocNo.trim()) errors.push('Transport Document Number is required');
    if (!formData.transDocDate) errors.push('Transport Document Date is required');
    
    const validEwbBills = ewbBills.filter(bill => bill.ewbNo.trim());
    if (validEwbBills.length === 0) errors.push('At least one EWB Number is required');
    
    return errors;
  };  const createTimeoutSignal = (timeout) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  };
  const checkNetworkConnectivity = async () => {
    try {
      setTestingNetwork(true);
      setDebugInfo(prev => prev + '\n🌐 Checking network connectivity...');
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        signal: createTimeoutSignal(5000)
      });
      if (response.ok) {
        setDebugInfo(prev => prev + '\n✅ Network connectivity confirmed');
        
        // Also test the actual API endpoint with a simple GET request
        try {
          setDebugInfo(prev => prev + '\n🔍 Testing API endpoint accessibility...');
          const apiTest = await fetch('https://api.sandbox.co.in', {
            method: 'GET',
            signal: createTimeoutSignal(5000)
          });
          setDebugInfo(prev => prev + `\n📡 API endpoint response: ${apiTest.status}`);
        } catch (apiError) {
          setDebugInfo(prev => prev + `\n⚠️ API endpoint test failed: ${apiError.message}`);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      setDebugInfo(prev => prev + `\n❌ Network connectivity check failed: ${error.message}`);
      return false;
    } finally {
      setTestingNetwork(false);
    }
  };

  const createConsolidatedEWB = async (retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      setLoading(true);
      setError('');
      setResult(null);
      setDebugInfo('Starting consolidated EWB creation...');

      // Check network connectivity first
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('No internet connection detected. Please check your network and try again.');
      }

      // Validate form
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check token
      if (!ewbToken) {
        throw new Error('EWB token not available. Please refresh token.');
      }

      setDebugInfo('✅ Form validation passed. Preparing API request...');

      // Prepare request data
      const requestData = {
        fromPlace: formData.fromPlace.toUpperCase(),
        fromState: parseInt(formData.fromState),
        vehicleNo: formData.vehicleNo.toUpperCase(),
        transMode: formData.transMode,
        transDocNo: formData.transDocNo,
        transDocDate: formatDateForAPI(formData.transDocDate),
        tripSheetEwbBills: ewbBills
          .filter(bill => bill.ewbNo.trim())
          .map(bill => ({ ewbNo: parseInt(bill.ewbNo) }))
      };      setDebugInfo(`📋 Request Data: ${JSON.stringify(requestData, null, 2)}`);

      // Prepare headers
      const headers = {
        'accept': 'application/json',
        'authorization': `${ewbToken.token_type} ${ewbToken.access_token}`,
        'x-api-key': apiKey,
        'x-api-version': '1',
        'content-type': 'application/json'
      };

      setDebugInfo(prev => prev + `\n🔑 Headers: ${JSON.stringify({
        'accept': headers.accept,
        'authorization': `${ewbToken.token_type} [TOKEN_HIDDEN]`,
        'x-api-key': '[API_KEY_HIDDEN]',
        'x-api-version': headers['x-api-version'],
        'content-type': headers['content-type']
      }, null, 2)}`);
      
      setDebugInfo(prev => prev + '\n🌐 API Endpoint: https://api.sandbox.co.in/gst/compliance/e-way-bill/consignor/consolidated-bill');
      setDebugInfo(prev => prev + '\n📤 Making API call...');
      if (retryCount > 0) {
        setDebugInfo(prev => prev + `\n🔄 Retry attempt ${retryCount}/${maxRetries}`);
      }// Make API request with better error handling
      let response;
      let responseData;
      
      try {        response = await fetch(
          'https://api.sandbox.co.in/gst/compliance/e-way-bill/consignor/consolidated-bill',
          {
            method: 'POST',
            headers,
            body: JSON.stringify(requestData),
            // Add timeout and other fetch options
            signal: createTimeoutSignal(30000), // 30 second timeout
          }
        );

        setDebugInfo(prev => prev + `\n📡 API Response Status: ${response.status}`);
        setDebugInfo(prev => prev + `\n📡 Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);

      } catch (fetchError) {
        // Handle network errors specifically
        if (fetchError.name === 'TimeoutError') {
          throw new Error('API request timed out after 30 seconds. Please check your internet connection and try again.');
        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
          throw new Error('Network error: Unable to connect to the API. Please check your internet connection and try again.');
        } else {
          throw new Error(`Network error: ${fetchError.message}`);
        }
      }

      // Parse response
      try {
        responseData = await response.json();
        setDebugInfo(prev => prev + `\n📄 Raw Response: ${JSON.stringify(responseData, null, 2)}`);
      } catch (parseError) {
        setDebugInfo(prev => prev + `\n⚠️ Failed to parse response as JSON: ${parseError.message}`);
        const textResponse = await response.text();
        setDebugInfo(prev => prev + `\n📄 Raw Response Text: ${textResponse}`);
        throw new Error(`Invalid JSON response from API: ${parseError.message}`);
      }      if (!response.ok) {
        let errorMessage = `API Error: ${response.status}`;
        
        if (response.status === 500) {
          errorMessage = `Server Error (500): The EWB API server is experiencing internal issues. This is not your fault.`;
          setDebugInfo(prev => prev + '\n🚨 HTTP 500 - Internal Server Error detected');
          setDebugInfo(prev => prev + '\n💡 This is a server-side issue, not a problem with your request');
        } else if (response.status === 503) {
          errorMessage = `Service Unavailable (503): The EWB API service is temporarily down for maintenance.`;        } else if (response.status === 502) {
          errorMessage = `Bad Gateway (502): There&apos;s a problem with the API gateway or load balancer.`;
        } else if (response.status === 401) {
          errorMessage = `Unauthorized (401): Your EWB token may have expired or is invalid.`;
        } else if (response.status === 403) {
          errorMessage = `Forbidden (403): You don't have permission to access this EWB service.`;
        } else if (response.status === 429) {
          errorMessage = `Rate Limited (429): Too many requests. Please wait before trying again.`;
        }
        
        if (responseData.message) {
          errorMessage += ` Server message: ${responseData.message}`;
        }
        
        throw new Error(errorMessage);
      }

      // Update token usage
      if (ewbToken.id) {
        await updateTokenUsage('ewb_tokens', ewbToken.id);
      }

      // Process response
      let processedResult = responseData;
      
      // Try to decode base64 data if present
      if (responseData.data && typeof responseData.data === 'string' && responseData.data.length > 50) {
        try {
          const decodedData = JSON.parse(atob(responseData.data));
          processedResult.decoded_data = decodedData;
          setDebugInfo(prev => prev + `\n🔓 Decoded Data: ${JSON.stringify(decodedData, null, 2)}`);
        } catch (decodeError) {
          setDebugInfo(prev => prev + `\n⚠️ Could not decode data as base64: ${decodeError.message}`);
        }
      }

      setResult({
        success: true,
        data: processedResult,
        timestamp: new Date().toISOString()
      });      setDebugInfo(prev => prev + '\n✅ Consolidated EWB created successfully!');

    } catch (err) {
      console.error('Error creating consolidated EWB:', err);
        // Check if this is a network error and we can retry
      const isNetworkError = err.name === 'TypeError' || 
                           err.message.includes('fetch') || 
                           err.message.includes('Network error') ||
                           err.message.includes('Failed to fetch');
      
      const isServerError = err.message.includes('500') || 
                           err.message.includes('502') || 
                           err.message.includes('503') ||
                           err.message.includes('Internal Server Error') ||
                           err.message.includes('Bad Gateway') ||
                           err.message.includes('Service Unavailable');
      
      if ((isNetworkError || isServerError) && retryCount < maxRetries) {
        const waitTime = isServerError ? 10000 : 3000; // Wait longer for server errors
        setDebugInfo(prev => prev + `\n⚠️ ${isServerError ? 'Server' : 'Network'} error encountered, retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return createConsolidatedEWB(retryCount + 1);
      }
      
      setError(err.message);
      setResult({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
      });
      setDebugInfo(prev => prev + `\n❌ Error: ${err.message}`);
        // Add additional troubleshooting info for network errors
      if (isNetworkError) {
        setDebugInfo(prev => prev + '\n\n🔧 Troubleshooting Tips:');
        setDebugInfo(prev => prev + '\n• Check your internet connection');
        setDebugInfo(prev => prev + '\n• Verify the API endpoint is accessible');
        setDebugInfo(prev => prev + '\n• Check if your firewall/antivirus is blocking the request');
        setDebugInfo(prev => prev + '\n• Try refreshing the EWB token');
        setDebugInfo(prev => prev + '\n• Contact your network administrator if the problem persists');
      }
      
      if (isServerError) {
        setDebugInfo(prev => prev + '\n\n🚨 Server Error Information:');
        setDebugInfo(prev => prev + '\n• This is a server-side issue, not your fault');
        setDebugInfo(prev => prev + '\n• The EWB API service is experiencing problems');
        setDebugInfo(prev => prev + '\n• Your request data and credentials are likely correct');
        setDebugInfo(prev => prev + '\n• Wait 10-15 minutes before trying again');
        setDebugInfo(prev => prev + '\n• Contact the API service provider if issue persists');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consolidated-ewb-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white">
        <Navbar />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white">
      <Navbar />
      
      <main className="w-full py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl shadow-2xl p-8 mb-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-2xl mb-6">
                <Truck className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">Consolidated E-Way Bill Creator</h1>
              <p className="text-blue-100 text-lg font-medium">Generate consolidated e-way bills for multiple shipments</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Token & API Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Token Status */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
                    <Key className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">EWB Token Status</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">Status:</span>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${ewbToken ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={`font-semibold ${ewbToken ? 'text-green-700' : 'text-red-700'}`}>
                        {ewbToken ? 'Active' : 'Not Available'}
                      </span>
                    </div>
                  </div>
                  
                  {ewbToken && (
                    <>
                      <div className="border-t pt-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">GSTIN:</span>
                            <span className="font-mono text-black">{ewbToken.gstin}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Environment:</span>
                            <span className="uppercase font-semibold text-blue-600">{ewbToken.environment || 'sandbox'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Expires:</span>
                            <span className="text-gray-900">{new Date(ewbToken.expires_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Access Token:</span>
                          <button
                            onClick={() => setShowToken(!showToken)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <code className="text-xs font-mono text-black break-all">
                            {showToken ? ewbToken.access_token : '•'.repeat(50)}
                          </code>
                          {showToken && (
                            <button
                              onClick={() => copyToClipboard(ewbToken.access_token)}
                              className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                    <button
                    onClick={fetchActiveEwbToken}
                    disabled={fetchingToken}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 shadow-lg font-semibold mb-3"
                  >
                    {fetchingToken ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-5 w-5 mr-2" />
                    )}
                    {fetchingToken ? 'Refreshing...' : 'Refresh Token'}
                  </button>
                    <button
                    onClick={checkNetworkConnectivity}
                    disabled={testingNetwork}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg font-semibold"
                  >
                    {testingNetwork ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Shield className="h-5 w-5 mr-2" />
                    )}
                    {testingNetwork ? 'Testing Network...' : 'Test Network'}
                  </button>
                </div>
              </div>

              {/* API Key Info */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">API Key</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Live API Key:</span>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <code className="text-xs font-mono text-black break-all">
                      {showApiKey ? apiKey : '•'.repeat(40)}
                    </code>
                    {showApiKey && (
                      <button
                        onClick={() => copyToClipboard(apiKey)}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Debug Info */}
              {debugInfo && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Debug Information</h3>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {debugInfo}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <div className="flex items-center mb-8">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Consolidated EWB Details</h2>
                </div>

                <form className="space-y-6">
                  {/* Transport Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-3">From Place *</label>
                      <input
                        type="text"
                        value={formData.fromPlace}
                        onChange={(e) => handleFormChange('fromPlace', e.target.value)}
                        placeholder="e.g., BANGALORE SOUTH"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-lg text-black bg-white font-semibold focus:ring-3 focus:ring-purple-500 focus:border-purple-500 focus:shadow-xl transform focus:scale-105 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-3">From State *</label>
                      <select
                        value={formData.fromState}
                        onChange={(e) => handleFormChange('fromState', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-lg text-black bg-white font-semibold focus:ring-3 focus:ring-purple-500 focus:border-purple-500 focus:shadow-xl transform focus:scale-105 transition-all duration-200"
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map(state => (
                          <option key={state.code} value={state.code}>
                            {state.code} - {state.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-3">Vehicle Number *</label>
                      <input
                        type="text"
                        value={formData.vehicleNo}
                        onChange={(e) => handleFormChange('vehicleNo', e.target.value)}
                        placeholder="e.g., KA12AB1234"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-lg text-black bg-white font-semibold focus:ring-3 focus:ring-purple-500 focus:border-purple-500 focus:shadow-xl transform focus:scale-105 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-3">Transport Mode *</label>
                      <select
                        value={formData.transMode}
                        onChange={(e) => handleFormChange('transMode', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-lg text-black bg-white font-semibold focus:ring-3 focus:ring-purple-500 focus:border-purple-500 focus:shadow-xl transform focus:scale-105 transition-all duration-200"
                      >
                        {TRANSPORT_MODES.map(mode => (
                          <option key={mode.code} value={mode.code}>
                            {mode.code} - {mode.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-3">Transport Doc No *</label>
                      <input
                        type="text"
                        value={formData.transDocNo}
                        onChange={(e) => handleFormChange('transDocNo', e.target.value)}
                        placeholder="e.g., 1234"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-lg text-black bg-white font-semibold focus:ring-3 focus:ring-purple-500 focus:border-purple-500 focus:shadow-xl transform focus:scale-105 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-3">Transport Doc Date *</label>
                      <input
                        type="date"
                        value={formData.transDocDate}
                        onChange={(e) => handleFormChange('transDocDate', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-lg text-black bg-white font-semibold focus:ring-3 focus:ring-purple-500 focus:border-purple-500 focus:shadow-xl transform focus:scale-105 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* EWB Bills */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-bold text-gray-800">E-Way Bill Numbers *</label>
                      <button
                        type="button"
                        onClick={addEwbBill}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md font-semibold"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add EWB
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {ewbBills.map((bill, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="flex-1">
                            <input
                              type="number"
                              value={bill.ewbNo}
                              onChange={(e) => updateEwbBill(index, e.target.value)}
                              placeholder={`EWB Number ${index + 1} (12 digits)`}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-lg text-black bg-white font-semibold focus:ring-3 focus:ring-purple-500 focus:border-purple-500 focus:shadow-xl transform focus:scale-105 transition-all duration-200"
                              maxLength={12}
                            />
                          </div>
                          {ewbBills.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEwbBill(index)}
                              className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={createConsolidatedEWB}
                      disabled={loading || !ewbToken}
                      className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 font-bold text-lg"
                    >
                      {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin mr-3" />
                      ) : (
                        <Truck className="h-6 w-6 mr-3" />
                      )}
                      {loading ? 'Creating Consolidated EWB...' : 'Create Consolidated E-Way Bill'}
                    </button>
                  </div>
                </form>                {/* Error Display */}
                {error && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl shadow-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-4">
                        <AlertCircle className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-red-800 mb-1">Error Occurred</h3>
                        <p className="text-sm text-red-700 font-medium mb-3">{error}</p>
                          {/* Common troubleshooting tips */}
                        {(error.includes('fetch') || error.includes('Network') || error.includes('Failed to fetch')) && (
                          <div className="bg-white p-4 rounded-lg border border-red-200">                            <h4 className="text-sm font-bold text-red-800 mb-2">🔧 Troubleshooting Network Issues:</h4>
                            <ul className="text-xs text-red-700 space-y-1">
                              <li>• Check your internet connection</li>
                              <li>• Disable any VPN or proxy temporarily</li>
                              <li>• Check if your firewall/antivirus is blocking the request</li>
                              <li>• Try refreshing the page and the EWB token</li>
                              <li>• Use the &quot;Test Network&quot; button above to verify connectivity</li>
                              <li>• Contact your IT support if the problem persists</li>
                            </ul>
                          </div>
                        )}
                        
                        {(error.includes('500') || error.includes('Internal Server Error') || error.includes('Server Error')) && (
                          <div className="bg-white p-4 rounded-lg border border-red-200">
                            <h4 className="text-sm font-bold text-red-800 mb-2">🚨 Server Error (HTTP 500):</h4>
                            <ul className="text-xs text-red-700 space-y-1">                              <li>• This is a server-side issue, not a problem with your request</li>
                              <li>• The EWB API server is experiencing internal problems</li>
                              <li>• Wait 5-10 minutes and try again</li>
                              <li>• Check if the API service status page reports any outages</li>
                              <li>• Contact the API provider if the issue persists</li>
                              <li>• Your data and token are likely correct</li>
                            </ul>
                          </div>
                        )}
                        
                        {(error.includes('503') || error.includes('Service Unavailable')) && (
                          <div className="bg-white p-4 rounded-lg border border-red-200">
                            <h4 className="text-sm font-bold text-red-800 mb-2">🔧 Service Unavailable (HTTP 503):</h4>
                            <ul className="text-xs text-red-700 space-y-1">
                              <li>• The EWB API service is temporarily down for maintenance</li>
                              <li>• This is usually scheduled maintenance</li>
                              <li>• Try again in 15-30 minutes</li>
                              <li>• Check the service provider&apos;s status page</li>
                            </ul>
                          </div>
                        )}
                        
                        {error.includes('token') && (
                          <div className="bg-white p-4 rounded-lg border border-red-200">                            <h4 className="text-sm font-bold text-red-800 mb-2">🔑 Token Issues:</h4>
                            <ul className="text-xs text-red-700 space-y-1">
                              <li>• Click &quot;Refresh Token&quot; to get a new EWB token</li>
                              <li>• Ensure your GSTIN is correct in your profile</li>
                              <li>• Check if your EWB credentials are valid</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Result Display */}
                {result && (
                  <div className={`mt-6 p-6 rounded-xl shadow-lg border-l-4 ${
                    result.success 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500' 
                      : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-500'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
                          result.success ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {result.success ? (
                            <CheckCircle className="h-6 w-6 text-white" />
                          ) : (
                            <AlertCircle className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-sm font-bold mb-1 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                            {result.success ? '✅ Consolidated EWB Created Successfully!' : '❌ Failed to Create Consolidated EWB'}
                          </h3>
                          <p className="text-xs text-gray-600 mb-4">Generated at: {new Date(result.timestamp).toLocaleString()}</p>
                          
                          {result.success && result.data && (
                            <div className="space-y-4">
                              {/* Consolidated EWB Details */}
                              {result.data.decoded_data && (
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                  <h4 className="text-sm font-bold text-gray-800 mb-3">📋 Consolidated EWB Details:</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="font-semibold text-gray-600">Consolidated EWB No:</span>
                                      <p className="font-mono text-lg font-bold text-green-700">{result.data.decoded_data.cEwbNo}</p>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-600">Generated Date:</span>
                                      <p className="font-medium text-gray-900">{result.data.decoded_data.cEWBDate}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Raw Response */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <h4 className="text-sm font-bold text-gray-800 mb-3">📄 Complete API Response:</h4>
                                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded border max-h-64 overflow-y-auto">
                                  {JSON.stringify(result.data, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {result.success && (
                        <button
                          onClick={downloadResult}
                          className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md font-semibold"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
