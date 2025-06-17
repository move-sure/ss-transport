'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Eye, X, Clock, Truck, MapPin, User, FileText, Package, Loader2, Shield, Calendar, IndianRupee, Hash, Building, Phone, Mail, RefreshCw } from 'lucide-react';
import { getActiveEwbToken } from '../ewb/token-helper';

const EwbValidatorManual = ({ ewbNumber, isOpen, onClose, validationResult: preValidatedResult, onValidationComplete }) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(preValidatedResult || null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Use pre-validated result if provided, otherwise check localStorage
  useEffect(() => {
    if (preValidatedResult) {
      setValidationResult(preValidatedResult);
      setError(null);
    } else if (ewbNumber && ewbNumber.trim() !== '') {
      // Try to load from localStorage as fallback
      const cleanedEwb = ewbNumber.replace(/[-\s]/g, '').trim();
      const storedResult = localStorage.getItem(`ewb_${cleanedEwb}`);
      if (storedResult) {
        try {
          const parsedResult = JSON.parse(storedResult);
          setValidationResult(parsedResult);
          setError(null);
          console.log('📦 Loaded EWB data from localStorage:', parsedResult);
        } catch (err) {
          console.error('❌ Error parsing stored EWB data:', err);
        }
      }
    }
  }, [preValidatedResult, ewbNumber]);

  const validateEwb = async () => {
    if (!ewbNumber || ewbNumber.trim() === '') {
      setError('Please enter an E-way bill number');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      // Clean the EWB number by removing hyphens and spaces
      const cleanedEwbNumber = ewbNumber.replace(/[-\s]/g, '').trim();
      console.log('🔍 Starting EWB validation for:', ewbNumber, '→ Cleaned:', cleanedEwbNumber);
      
      // Get active EWB token - Use a default GSTIN or get from user context
      const defaultGstin = '09COVPS5556J1ZT'; // Default GSTIN for sandbox testing
      console.log('🔑 Fetching EWB token for GSTIN:', defaultGstin);
      
      const tokenResult = await getActiveEwbToken(defaultGstin);
      console.log('🎫 Token fetch result:', tokenResult);
      
      if (!tokenResult.success || !tokenResult.data) {
        console.error('❌ Token fetch failed:', tokenResult.error);
        throw new Error('No active EWB token found. Please check your token settings.');
      }

      const ewbToken = tokenResult.data;
      console.log('✅ EWB token retrieved:', {
        gstin: ewbToken.gstin,
        environment: ewbToken.environment,
        expires_at: ewbToken.expires_at,
        token_type: ewbToken.token_type
      });
      
      // Use our internal API route to avoid CORS issues
      const apiUrl = '/api/ewb/validate';
      console.log('🌐 API URL (internal):', apiUrl);
      
      // Send only the access token, not the token type prefix
      const requestBody = {
        ewbNumber: cleanedEwbNumber, // Use cleaned number for API call
        authToken: ewbToken.access_token // Remove token_type prefix
      };
      
      console.log('📤 Request body:', {
        ewbNumber: requestBody.ewbNumber,
        authToken: requestBody.authToken.substring(0, 20) + '...'
      });

      console.log('🚀 Making internal API request...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);

      const data = await response.json();
      console.log('📊 Response data:', data);

      if (response.ok && data.success) {
        console.log('✅ Validation successful');
        // The API route wraps the response, so we need to access data.data.data.data
        const validationData = data.data.data.data;
        setValidationResult(validationData);
        setActiveTab('overview'); // Reset to overview tab
        
        // Store in localStorage for future reference
        const cleanedEwb = ewbNumber.replace(/[-\s]/g, '').trim();
        localStorage.setItem(`ewb_${cleanedEwb}`, JSON.stringify(validationData));
        
        // Call the callback if provided
        if (onValidationComplete) {
          onValidationComplete(validationData);
        }
      } else {
        console.error('❌ API error:', data);
        throw new Error(data.error || data.details?.message || `API Error: ${response.status}`);
      }
    } catch (err) {
      console.error('🚨 EWB validation error:', err);
      console.error('🚨 Error stack:', err.stack);
      
      let errorMessage = err.message || 'Failed to validate E-way bill';
      
      // Handle specific error types
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to the validation service.';
      } else if (err.message.includes('CORS')) {
        errorMessage = 'CORS error: The validation service does not allow cross-origin requests.';
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Connection failed: Please check your internet connection and try again.';
      } else if (err.message.includes('401')) {
        errorMessage = 'Authentication failed: Invalid or expired token.';
      } else if (err.message.includes('404')) {
        errorMessage = 'E-way bill not found: Please verify the EWB number.';
      } else if (err.message.includes('400')) {
        errorMessage = 'Invalid E-way bill number format.';
      }
      
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format currency function
  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-blue-400/20 animate-pulse"></div>
          <div className="relative flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Eye className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">E-way Bill Validator</h2>
                <p className="text-blue-100 text-sm">Real-time GST E-way Bill Verification</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:rotate-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
          {/* EWB Number Display with Enhanced Design */}
          {!preValidatedResult && (
            <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Hash className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">E-way Bill Number</label>
                    <div className="text-2xl font-bold text-gray-900 font-mono">{ewbNumber || 'Not provided'}</div>
                  </div>
                </div>
                <button
                  onClick={validateEwb}
                  disabled={isValidating || !ewbNumber}
                  className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 transform ${
                    isValidating || !ewbNumber
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl hover:scale-105'
                  }`}
                >
                  {isValidating ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Validating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Validate E-way Bill
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Error Display */}
          {error && (
            <div className="mb-6 p-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl shadow-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-4">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-800 mb-1">Validation Failed</h3>
                  <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={validateEwb}
                  disabled={isValidating}
                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-center gap-4">
                  <div className="p-3 bg-green-200 rounded-full">
                    <CheckCircle className="w-8 h-8 text-green-700" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-green-800 mb-1">✅ EWB Verified Successfully</h3>
                    <p className="text-green-700 font-semibold">This E-way Bill is valid and active in the GST system</p>
                  </div>
                </div>
              </div>

              {/* Status Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border-2 border-purple-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-6 h-6 text-purple-600" />
                    <span className="text-sm font-bold text-purple-700 uppercase tracking-wide">Status</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{validationResult.status === 'ACT' ? 'Active' : validationResult.status}</div>
                  <div className="text-xs text-purple-600 mt-1">Current Status</div>
                </div>

                <div className="bg-white border-2 border-blue-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <span className="text-sm font-bold text-blue-700 uppercase tracking-wide">Generated</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{formatDate(validationResult.ewayBillDate)}</div>
                  <div className="text-xs text-blue-600 mt-1">Creation Date</div>
                </div>

                <div className="bg-white border-2 border-green-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <IndianRupee className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-bold text-green-700 uppercase tracking-wide">Value</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(validationResult.totInvValue)}</div>
                  <div className="text-xs text-green-600 mt-1">Invoice Value</div>
                </div>

                <div className="bg-white border-2 border-orange-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-6 h-6 text-orange-600" />
                    <span className="text-sm font-bold text-orange-700 uppercase tracking-wide">Valid Until</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{formatDate(validationResult.validUpto)}</div>
                  <div className="text-xs text-orange-600 mt-1">Expiry Date</div>
                </div>
              </div>

              {/* Detailed Information Tabs */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200 bg-gray-50">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { id: 'overview', label: 'Overview', icon: FileText },
                      { id: 'addresses', label: 'Addresses', icon: MapPin },
                      { id: 'transport', label: 'Transport', icon: Truck },
                      { id: 'items', label: 'Items', icon: Package }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                            activeTab === tab.id
                              ? 'border-purple-500 text-purple-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in-50 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                          <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                            <Building className="w-5 h-5" />
                            Basic Information
                          </h3>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-blue-600 font-semibold">EWB Number:</span>
                              <span className="font-mono font-bold text-black">{validationResult.ewbNo}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-600 font-semibold">Generated:</span>
                              <span className="text-black font-semibold">{formatDate(validationResult.ewayBillDate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-600 font-semibold">Valid Until:</span>
                              <span className="text-black font-semibold">{formatDate(validationResult.validUpto)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-600 font-semibold">Status:</span>
                              <span className={`font-bold px-2 py-1 rounded ${
                                validationResult.status === 'ACT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {validationResult.status === 'ACT' ? 'Active' : validationResult.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                          <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                            <IndianRupee className="w-5 h-5" />
                            Financial Details
                          </h3>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-green-600 font-semibold">Invoice Value:</span>
                              <span className="font-bold text-black">{formatCurrency(validationResult.totInvValue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-600 font-semibold">Document Type:</span>
                              <span className="text-black font-semibold">{validationResult.docType || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-600 font-semibold">Supply Type:</span>
                              <span className="text-black font-semibold">{validationResult.supplyType || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'addresses' && (
                    <div className="space-y-6 animate-in fade-in-50 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                          <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            From Address
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-semibold text-purple-600">Name:</span> <span className="text-black">{validationResult.fromTrdName}</span></div>
                            <div><span className="font-semibold text-purple-600">GSTIN:</span> <span className="font-mono text-black">{validationResult.fromGstin}</span></div>
                            <div><span className="font-semibold text-purple-600">Address:</span> <span className="text-black">{validationResult.fromAddr1}</span></div>
                            <div><span className="font-semibold text-purple-600">Place:</span> <span className="text-black">{validationResult.fromPlace}</span></div>
                            <div><span className="font-semibold text-purple-600">Pincode:</span> <span className="text-black">{validationResult.fromPincode}</span></div>
                            <div><span className="font-semibold text-purple-600">State:</span> <span className="text-black">{validationResult.fromStateCode}</span></div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border border-teal-200">
                          <h3 className="text-lg font-bold text-teal-800 mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            To Address
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-semibold text-teal-600">Name:</span> <span className="text-black">{validationResult.toTrdName}</span></div>
                            <div><span className="font-semibold text-teal-600">GSTIN:</span> <span className="font-mono text-black">{validationResult.toGstin}</span></div>
                            <div><span className="font-semibold text-teal-600">Address:</span> <span className="text-black">{validationResult.toAddr1}</span></div>
                            <div><span className="font-semibold text-teal-600">Place:</span> <span className="text-black">{validationResult.toPlace}</span></div>
                            <div><span className="font-semibold text-teal-600">Pincode:</span> <span className="text-black">{validationResult.toPincode}</span></div>
                            <div><span className="font-semibold text-teal-600">State:</span> <span className="text-black">{validationResult.toStateCode}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'transport' && (
                    <div className="space-y-6 animate-in fade-in-50 duration-300">
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-orange-100 rounded-xl">
                            <Truck className="w-6 h-6 text-orange-600" />
                          </div>
                          <h3 className="text-xl font-bold text-orange-800">Transportation Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-semibold text-orange-600">Transporter Name</label>
                              <div className="text-lg font-bold text-orange-800">{validationResult.transporterName}</div>
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-orange-600">Transporter ID</label>
                              <div className="font-mono text-orange-600 font-bold">{validationResult.transporterId}</div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-semibold text-orange-600">Vehicle Type</label>
                              <div className="text-lg font-bold text-orange-800">{validationResult.vehicleType || 'N/A'}</div>
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-orange-600">Document Number</label>
                              <div className="font-mono text-orange-600 font-bold">{validationResult.docNo || 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'items' && (
                    <div className="space-y-6 animate-in fade-in-50 duration-300">
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-indigo-100 rounded-xl">
                            <Package className="w-6 h-6 text-indigo-600" />
                          </div>
                          <h3 className="text-xl font-bold text-indigo-800">Item Details</h3>
                        </div>
                        {validationResult.itemList && validationResult.itemList.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-indigo-200">
                              <thead className="bg-indigo-100">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Description</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">HSN Code</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Quantity</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Unit</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Value</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-indigo-100">
                                {validationResult.itemList.map((item, index) => (
                                  <tr key={index} className="hover:bg-indigo-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-900">{item.productDesc}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-mono">{item.hsnCode}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-700">{item.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-700">{item.qtyUnit}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-semibold">{formatCurrency(item.taxableAmount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Package className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-indigo-600">No Items Found</h3>
                            <p className="text-indigo-500">This E-way bill doesn&apos;t contain item details.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Powered by:</span> GST E-way Bill API
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EwbValidatorManual;
