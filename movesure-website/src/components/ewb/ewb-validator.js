'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Eye, X, Clock, Truck, MapPin, User, FileText, Package, Loader2, Shield, Calendar, IndianRupee, Hash, Building, Phone, Mail } from 'lucide-react';
import { getActiveEwbToken } from './token-helper';

const EwbValidator = ({ ewbNumber, isOpen, onClose, validationResult: preValidatedResult }) => {
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
      // In a real application, you would get this from user context
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
        setValidationResult(data.data.data.data);
        setActiveTab('overview'); // Reset to overview tab
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
        errorMessage = 'Network error: Unable to connect to the validation service. This might be due to CORS restrictions or network connectivity issues.';
      } else if (err.message.includes('CORS')) {
        errorMessage = 'CORS error: The validation service does not allow cross-origin requests from this domain.';
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Connection failed: Please check your internet connection and try again. The validation service might be temporarily unavailable.';
      }
      
      setError(errorMessage);
    } finally {
      setIsValidating(false);
      console.log('🏁 Validation process completed');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'ACT': { 
        label: 'Active', 
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
        icon: CheckCircle,
        pulse: 'animate-pulse'
      },
      'CNL': { 
        label: 'Cancelled', 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: XCircle 
      },
      'EXP': { 
        label: 'Expired', 
        color: 'bg-orange-100 text-orange-800 border-orange-200', 
        icon: Clock 
      },
      'REJ': { 
        label: 'Rejected', 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: XCircle 
      }
    };
    
    const statusInfo = statusMap[status] || { 
      label: status, 
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      icon: AlertCircle 
    };
    const Icon = statusInfo.icon;
    
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 ${statusInfo.color} ${statusInfo.pulse || ''}`}>
        <Icon className="w-4 h-4" />
        {statusInfo.label}
      </div>
    );
  };

  const TabButton = ({ id, label, icon: Icon, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
        isActive 
          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-105' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white p-6 relative overflow-hidden">
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
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">          {/* EWB Number Display with Enhanced Design */}
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
            <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-red-800 font-bold text-lg mb-2">Validation Error</h3>
                  <p className="text-red-700 leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}          {/* Enhanced Validation Result */}
          {validationResult && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              {/* EWB Verification Status Banner */}
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-xl p-6 shadow-lg">
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
                    <span className="font-bold text-gray-700">Status</span>
                  </div>
                  {getStatusBadge(validationResult.status)}
                </div>
                
                <div className="bg-white border-2 border-blue-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <span className="font-bold text-gray-700">Document</span>
                  </div>                  <div className="space-y-1 text-sm">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Document Type:</label>
                      <div className="text-black font-bold">{validationResult.docType}</div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Document No:</label>
                      <div className="text-black font-bold">{validationResult.docNo}</div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Document Date:</label>
                      <div className="text-black font-bold">{validationResult.docDate}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-green-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-6 h-6 text-green-600" />
                    <span className="font-bold text-gray-700">Validity</span>
                  </div>                  <div className="space-y-1 text-sm">
                    <div>
                      <label className="font-semibold text-green-600">Valid Until:</label>
                      <div className="text-black font-bold">{formatDate(validationResult.validUpto)}</div>
                    </div>
                    <div>
                      <label className="font-semibold text-green-600">Valid Days:</label> 
                      <span className="text-black font-bold">{validationResult.noValidDays}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-orange-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <IndianRupee className="w-6 h-6 text-orange-600" />
                    <span className="font-bold text-gray-700">Value</span>
                  </div>                  <div className="space-y-1 text-sm">
                    <div className="font-bold text-lg text-orange-600">
                      {formatCurrency(validationResult.totInvValue)}
                    </div>
                    <div className="text-sm font-semibold text-orange-800">Total Invoice Value</div>
                  </div>
                </div>
              </div>

              {/* Enhanced Tab Navigation */}
              <div className="flex flex-wrap gap-3 p-2 bg-gray-50 rounded-xl">
                <TabButton 
                  id="overview" 
                  label="Overview" 
                  icon={FileText} 
                  isActive={activeTab === 'overview'} 
                  onClick={setActiveTab} 
                />
                <TabButton 
                  id="transport" 
                  label="Transport" 
                  icon={Truck} 
                  isActive={activeTab === 'transport'} 
                  onClick={setActiveTab} 
                />
                <TabButton 
                  id="addresses" 
                  label="Addresses" 
                  icon={MapPin} 
                  isActive={activeTab === 'addresses'} 
                  onClick={setActiveTab} 
                />
                <TabButton 
                  id="financial" 
                  label="Financial" 
                  icon={IndianRupee} 
                  isActive={activeTab === 'financial'} 
                  onClick={setActiveTab} 
                />
                <TabButton 
                  id="items" 
                  label="Items" 
                  icon={Package} 
                  isActive={activeTab === 'items'} 
                  onClick={setActiveTab} 
                />
              </div>

              {/* Tab Content */}
              <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">                        <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
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
                            <span className="text-blue-600 font-semibold">Supply Type:</span>
                            <span className="font-semibold text-black">{validationResult.supplyType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600 font-semibold">Transaction Type:</span>
                            <span className="text-black font-semibold">{validationResult.transactionType}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">                        <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Timeline
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-600 font-semibold">Document Date:</span>
                            <span className="text-black font-semibold">{validationResult.docDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600 font-semibold">Valid Until:</span>
                            <span className="font-bold text-black">{formatDate(validationResult.validUpto)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600 font-semibold">Extended Times:</span>
                            <span className="text-black font-semibold">{validationResult.extendedTimes}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600 font-semibold">Generation Mode:</span>
                            <span className="font-semibold text-black">{validationResult.genMode}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'transport' && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div className="bg-white border-2 border-blue-200 rounded-xl p-6 shadow-lg">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <Truck className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Transportation Details</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-semibold text-gray-600">Transporter Name</label>
                            <div className="text-lg font-bold text-gray-800">{validationResult.transporterName}</div>
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-600">Transporter ID</label>
                            <div className="font-mono text-blue-600 font-bold">{validationResult.transporterId}</div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-semibold text-gray-600">Vehicle Type</label>
                            <div className="text-lg font-bold text-gray-800">
                              {validationResult.vehicleType === 'R' ? 'Regular Vehicle' : validationResult.vehicleType}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-600">Distance</label>
                            <div className="text-lg font-bold text-green-600">{validationResult.actualDist} km</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Vehicle Details */}
                      {validationResult.VehiclListDetails && validationResult.VehiclListDetails.length > 0 && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            Vehicle Information
                          </h4>
                          {validationResult.VehiclListDetails.map((vehicle, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg border border-blue-200 space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-semibold text-blue-600">Vehicle No:</span> 
                                  <span className="ml-2 font-mono font-bold">{vehicle.vehicleNo}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-blue-600">From:</span> 
                                  <span className="ml-2">{vehicle.fromPlace}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-blue-600">Entry Date:</span> 
                                  <span className="ml-2">{formatDate(vehicle.enteredDate)}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-blue-600">Transport Mode:</span> 
                                  <span className="ml-2">{vehicle.transMode}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'addresses' && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* From Address */}
                      <div className="bg-white border-2 border-green-200 rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 bg-green-100 rounded-xl">
                            <MapPin className="w-6 h-6 text-green-600" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-800">From Address</h3>
                        </div>
                        <div className="space-y-4 text-sm">
                          <div>
                            <label className="text-green-600 font-semibold">Trader Name</label>
                            <div className="text-lg font-bold text-gray-800">{validationResult.fromTrdName}</div>
                          </div>
                          <div>
                            <label className="text-green-600 font-semibold">GSTIN</label>
                            <div className="font-mono text-blue-600 font-bold">{validationResult.fromGstin}</div>
                          </div>
                          <div>
                            <label className="text-green-600 font-semibold">Address</label>
                            <div className="text-gray-800 leading-relaxed">
                              {validationResult.fromAddr1}
                              {validationResult.fromAddr2 && <><br />{validationResult.fromAddr2}</>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-green-600 font-semibold">Place</label>
                              <div className="font-bold">{validationResult.fromPlace}</div>
                            </div>
                            <div>
                              <label className="text-green-600 font-semibold">Pincode</label>
                              <div className="font-mono font-bold">{validationResult.fromPincode}</div>
                            </div>
                          </div>
                          <div>
                            <label className="text-green-600 font-semibold">State Code</label>
                            <div className="font-bold">{validationResult.fromStateCode}</div>
                          </div>
                        </div>
                      </div>

                      {/* To Address */}
                      <div className="bg-white border-2 border-orange-200 rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 bg-orange-100 rounded-xl">
                            <MapPin className="w-6 h-6 text-orange-600" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-800">To Address</h3>
                        </div>
                        <div className="space-y-4 text-sm">
                          <div>
                            <label className="text-orange-600 font-semibold">Trader Name</label>
                            <div className="text-lg font-bold text-gray-800">{validationResult.toTrdName}</div>
                          </div>
                          <div>
                            <label className="text-orange-600 font-semibold">GSTIN</label>
                            <div className="font-mono text-blue-600 font-bold">{validationResult.toGstin}</div>
                          </div>
                          <div>
                            <label className="text-orange-600 font-semibold">Address</label>
                            <div className="text-gray-800 leading-relaxed">
                              {validationResult.toAddr1}
                              {validationResult.toAddr2 && <><br />{validationResult.toAddr2}</>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-orange-600 font-semibold">Place</label>
                              <div className="font-bold">{validationResult.toPlace}</div>
                            </div>
                            <div>
                              <label className="text-orange-600 font-semibold">Pincode</label>
                              <div className="font-mono font-bold">{validationResult.toPincode}</div>
                            </div>
                          </div>
                          <div>
                            <label className="text-orange-600 font-semibold">State Code</label>
                            <div className="font-bold">{validationResult.toStateCode}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'financial' && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div className="bg-white border-2 border-purple-200 rounded-xl p-6 shadow-lg">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-purple-100 rounded-xl">
                          <IndianRupee className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Tax & Financial Details</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(validationResult.totInvValue)}</div>
                            <div className="text-sm font-semibold text-blue-800">Total Invoice Value</div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(validationResult.totalValue)}</div>
                            <div className="text-sm font-semibold text-green-800">Total Value</div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-yellow-600">{formatCurrency(validationResult.cgstValue)}</div>
                            <div className="text-sm font-semibold text-yellow-800">CGST</div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-xl border border-pink-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-pink-600">{formatCurrency(validationResult.sgstValue)}</div>
                            <div className="text-sm font-semibold text-pink-800">SGST</div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-indigo-600">{formatCurrency(validationResult.igstValue)}</div>
                            <div className="text-sm font-semibold text-indigo-800">IGST</div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-purple-600">{formatCurrency(validationResult.cessValue)}</div>
                            <div className="text-sm font-semibold text-purple-800">Cess</div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-gray-600">{formatCurrency(validationResult.otherValue)}</div>
                            <div className="text-sm font-semibold text-gray-800">Other Value</div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border border-teal-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-teal-600">{validationResult.supplyType}</div>
                            <div className="text-sm font-semibold text-teal-800">Supply Type</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'items' && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    {validationResult.itemList && validationResult.itemList.length > 0 ? (
                      <div className="bg-white border-2 border-indigo-200 rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 bg-indigo-100 rounded-xl">
                            <Package className="w-6 h-6 text-indigo-600" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-800">Items & Products</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b-2 border-indigo-200 bg-indigo-50">
                                <th className="text-left p-4 font-bold text-indigo-800">Item Details</th>
                                <th className="text-left p-4 font-bold text-indigo-800">HSN Code</th>
                                <th className="text-left p-4 font-bold text-indigo-800">Quantity</th>
                                <th className="text-left p-4 font-bold text-indigo-800">Amount</th>
                                <th className="text-left p-4 font-bold text-indigo-800">Tax Rates</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validationResult.itemList.map((item, index) => (
                                <tr key={index} className="border-b border-indigo-100 hover:bg-indigo-50 transition-colors">
                                  <td className="p-4">
                                    <div>
                                      <div className="font-bold text-gray-800">{item.productName}</div>
                                      <div className="text-gray-600 text-sm">{item.productDesc}</div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className="font-mono font-bold text-indigo-600">{item.hsnCode}</span>
                                  </td>
                                  <td className="p-4">
                                    <div>
                                      <span className="font-bold text-lg">{item.quantity}</span>
                                      <span className="text-gray-600 ml-1">{item.qtyUnit}</span>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="font-bold text-green-600">{formatCurrency(item.taxableAmount)}</div>
                                  </td>
                                  <td className="p-4">
                                    <div className="space-y-1 text-sm">
                                      <div><span className="font-semibold">CGST:</span> {item.cgstRate}%</div>
                                      <div><span className="font-semibold">SGST:</span> {item.sgstRate}%</div>
                                      <div><span className="font-semibold">IGST:</span> {item.igstRate}%</div>
                                      {item.cessRate > 0 && <div><span className="font-semibold">Cess:</span> {item.cessRate}%</div>}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600">No Items Found</h3>
                        <p className="text-gray-500">This E-way bill doesn't contain item details.</p>
                      </div>
                    )}
                  </div>
                )}
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
            className="px-6 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EwbValidator;