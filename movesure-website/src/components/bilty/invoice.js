'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Check, CheckCircle, XCircle, Loader2, Shield, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { useInputNavigation } from './input-navigation';
import EwbValidator from '../ewb/ewb-validator';
import { getActiveEwbToken } from '../ewb/token-helper';

const InvoiceDetailsSection = ({ formData, setFormData }) => {
  const [contentOptions, setContentOptions] = useState([]);
  const [showContentDropdown, setShowContentDropdown] = useState(false);
  const [contentSearch, setContentSearch] = useState('');
  const [selectedContentIndex, setSelectedContentIndex] = useState(-1);
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [newContentName, setNewContentName] = useState('');
  const [showEwbValidator, setShowEwbValidator] = useState(false);
  
  // EWB Validation State
  const [ewbValidationStatus, setEwbValidationStatus] = useState('idle'); // 'idle', 'validating', 'verified', 'failed'
  const [ewbValidationResult, setEwbValidationResult] = useState(null);
  const [ewbValidationError, setEwbValidationError] = useState(null);

  const contentRef = useRef(null);
  const contentInputRef = useRef(null);
  const paymentModeRef = useRef(null);
  const deliveryTypeRef = useRef(null);
  const invoiceNoRef = useRef(null);
  const invoiceValueRef = useRef(null);
  const eWayBillRef = useRef(null);
  const invoiceDateRef = useRef(null);
  
  // Input navigation
  const { register, unregister, handleEnter } = useInputNavigation();
    // Reset EWB validation when EWB number changes
  useEffect(() => {
    // Clean both values for proper comparison
    const cleanedCurrentEwb = formData.e_way_bill ? formData.e_way_bill.replace(/[-\s]/g, '').trim() : '';
    const cleanedValidatedEwb = ewbValidationResult?.ewbNo ? ewbValidationResult.ewbNo.toString().replace(/[-\s]/g, '').trim() : '';
    
    // Only reset if the cleaned versions are different
    if (cleanedCurrentEwb !== cleanedValidatedEwb) {
      console.log('🔄 EWB changed, resetting validation status');
      console.log('🧹 Current cleaned:', cleanedCurrentEwb, '→ Validated cleaned:', cleanedValidatedEwb);
      setEwbValidationStatus('idle');
      setEwbValidationResult(null);
      setEwbValidationError(null);
    }
  }, [formData.e_way_bill, ewbValidationResult]);
  // EWB Validation Function
  const validateEwbInBackground = async () => {
    if (!formData.e_way_bill || formData.e_way_bill.trim() === '') {
      setEwbValidationError('Please enter an E-way bill number');
      setEwbValidationStatus('failed');
      return;
    }

    // Clean the EWB number by removing hyphens and spaces
    const cleanedEwbNumber = formData.e_way_bill.replace(/[-\s]/g, '').trim();
    
    if (cleanedEwbNumber === '') {
      setEwbValidationError('Please enter a valid E-way bill number');
      setEwbValidationStatus('failed');
      return;
    }

    console.log('🔄 Starting EWB validation...');
    console.log('🧹 Original EWB:', formData.e_way_bill, '→ Cleaned EWB:', cleanedEwbNumber);
    setEwbValidationStatus('validating');
    setEwbValidationError(null);
    setEwbValidationResult(null);

    try {
      console.log('🔍 Starting background EWB validation for:', cleanedEwbNumber);
      
      // Get active EWB token
      const defaultGstin = '09COVPS5556J1ZT';
      console.log('🔑 Fetching EWB token for GSTIN:', defaultGstin);
      
      const tokenResult = await getActiveEwbToken(defaultGstin);
      console.log('🎫 Token fetch result:', tokenResult);
      
      if (!tokenResult.success || !tokenResult.data) {
        console.error('❌ Token fetch failed:', tokenResult.error);
        throw new Error('No active EWB token found. Please check your token settings.');
      }

      const ewbToken = tokenResult.data;
      console.log('✅ EWB token retrieved');
      
      // Use internal API route to avoid CORS issues
      const apiUrl = '/api/ewb/validate';
      
      const requestBody = {
        ewbNumber: cleanedEwbNumber, // Use cleaned number for API call
        authToken: ewbToken.access_token
      };
      
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
      console.log('📊 Response data:', data);      if (response.ok && data.success) {
        console.log('✅ Validation successful');
        // Handle different response structures
        const validationData = data.data?.data?.data || data.data?.data || data.data;
        console.log('🎯 Extracted validation data:', validationData);
        
        // Check for error codes in the response - even with 200 status
        if (validationData?.error?.errorCodes) {
          console.error('❌ API returned error code:', validationData.error.errorCodes);
          const errorCode = validationData.error.errorCodes;
          let errorMessage = 'Invalid E-way bill number';
          
          // Handle specific error codes
          switch (errorCode) {
            case '325':
              errorMessage = 'E-way bill number not found. Please verify the number is correct.';
              break;
            case '102':
              errorMessage = 'E-way bill number is invalid or expired.';
              break;
            case '101':
              errorMessage = 'E-way bill number format is incorrect.';
              break;
            default:
              errorMessage = `E-way bill validation failed (Error: ${errorCode})`;
          }
          
          throw new Error(errorMessage);
        }
        
        // Check if status is '0' which indicates failure
        if (validationData?.status === '0') {
          console.error('❌ Validation failed with status 0');
          throw new Error('E-way bill number not found or is invalid.');
        }
        
        // Ensure we have actual validation data, not just error structure
        if (!validationData?.ewbNo && !validationData?.data?.ewbNo) {
          console.error('❌ No valid E-way bill data found');
          throw new Error('E-way bill number not found. Please verify the number.');
        }
        
        // Store in localStorage as backup
        if (validationData) {
          localStorage.setItem(`ewb_${cleanedEwbNumber}`, JSON.stringify(validationData));
        }
        
        setEwbValidationResult(validationData);
        setEwbValidationStatus('verified');
        console.log('🎉 Status set to verified, should trigger UI update');
        
        // Force a re-render by updating the state again after a small delay
        setTimeout(() => {
          console.log('🔄 Re-confirming verification status...');
          setEwbValidationStatus('verified');
        }, 100);      } else {
        console.error('❌ API error:', data);
        // Handle specific error responses from our API
        const errorMessage = data.error || data.details?.message || `API Error: ${response.status}`;
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('🚨 EWB validation error:', err);
      
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
      
      console.log('❌ Setting error status:', errorMessage);
      setEwbValidationError(errorMessage);
      setEwbValidationStatus('failed');
    }
  };
  // Load content options on component mount
  useEffect(() => {
    loadContentOptions();
  }, []);

  // Initialize contentSearch with form data when component mounts or formData.contain changes
  useEffect(() => {
    if (formData.contain && formData.contain !== contentSearch) {
      setContentSearch(formData.contain);
    }
  }, [formData.contain]);

  // Enhanced auto-selection watcher for content dropdown
  useEffect(() => {
    if (contentSearch && contentSearch.length >= 2 && !isAddingContent) {
      const filtered = contentOptions.filter(content =>
        content.content_name.toLowerCase().includes(contentSearch.toLowerCase())
      );
      
      const exactMatch = contentOptions.find(
        c => c.content_name.toLowerCase() === contentSearch.toLowerCase()
      );
      
      // Fast auto-select if only one option available and no exact match
      if (filtered.length === 1 && !exactMatch && document.activeElement === contentInputRef.current) {
        console.log('🚀 Fast auto-selecting single content option:', filtered[0].content_name);
        setTimeout(() => {
          handleContentSelect(filtered[0]);
        }, 100);
      }
    }
  }, [contentOptions, contentSearch, isAddingContent]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target)) {
        setShowContentDropdown(false);
        setIsAddingContent(false);
        setSelectedContentIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Register inputs for navigation
  useEffect(() => {
    if (deliveryTypeRef.current) {
      register(11, deliveryTypeRef.current, {
        beforeFocus: () => {
          console.log('🎯 Focusing on Delivery Type');
        }
      });
    }
    if (paymentModeRef.current) {
      register(12, paymentModeRef.current);
    }
    if (contentInputRef.current) {
      register(13, contentInputRef.current, {
        skipCondition: () => showContentDropdown && filteredContent.length > 0
      });
    }
    if (invoiceNoRef.current) {
      register(14, invoiceNoRef.current);
    }
    if (invoiceValueRef.current) {
      register(15, invoiceValueRef.current);
    }
    if (eWayBillRef.current) {
      register(16, eWayBillRef.current);
    }
    if (invoiceDateRef.current) {
      register(17, invoiceDateRef.current);
    }
    
    return () => {
      unregister(11);
      unregister(12);
      unregister(13);
      unregister(14);
      unregister(15);
      unregister(16);
      unregister(17);
    };
  }, [register, unregister]);

  const loadContentOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('content_management')
        .select('*')
        .order('content_name');
      
      if (error) throw error;
      setContentOptions(data || []);
    } catch (error) {
      console.error('Error loading content options:', error);
    }
  };

  const handleContentSelect = (content) => {
    setContentSearch(content.content_name);
    setFormData(prev => ({ ...prev, contain: content.content_name }));
    setShowContentDropdown(false);
    setSelectedContentIndex(-1);
    if (contentInputRef.current) {
      contentInputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (isAddingContent) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddNewContent();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsAddingContent(false);
        setNewContentName('');
      }
      return;
    }

    // Handle dropdown navigation
    if (showContentDropdown && filteredContent.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const newDownIndex = selectedContentIndex < filteredContent.length - 1 ? selectedContentIndex + 1 : 0;
          setSelectedContentIndex(newDownIndex);
          setTimeout(() => {
            const dropdown = contentRef.current?.querySelector('.dropdown-open');
            const selectedOption = dropdown?.querySelector(`[data-index="${newDownIndex}"]`);
            if (selectedOption && dropdown) {
              selectedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const newUpIndex = selectedContentIndex > 0 ? selectedContentIndex - 1 : filteredContent.length - 1;
          setSelectedContentIndex(newUpIndex);
          setTimeout(() => {
            const dropdown = contentRef.current?.querySelector('.dropdown-open');
            const selectedOption = dropdown?.querySelector(`[data-index="${newUpIndex}"]`);
            if (selectedOption && dropdown) {
              selectedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 10);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          console.log(`🎯 ${e.key} key pressed on content dropdown - selecting option`);
          if (selectedContentIndex >= 0) {
            handleContentSelect(filteredContent[selectedContentIndex]);
          } else if (filteredContent.length > 0) {
            handleContentSelect(filteredContent[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowContentDropdown(false);
          setSelectedContentIndex(-1);
          break;
      }
    } else {
      if (e.key === 'ArrowDown' && !showContentDropdown) {
        e.preventDefault();
        setShowContentDropdown(true);
      }
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setContentSearch(value);
    setFormData(prev => ({ ...prev, contain: value }));
    
    const filtered = contentOptions.filter(content =>
      content.content_name.toLowerCase().includes(value.toLowerCase())
    );

    if (filtered.length === 1) {
      console.log('🎯 Auto-selecting single content option:', filtered[0].content_name);
      setTimeout(() => {
        handleContentSelect(filtered[0]);
      }, 200);
      return;
    }
    
    const exactMatch = contentOptions.find(
      c => c.content_name.toLowerCase() === value.toLowerCase()
    );
    
    if (!exactMatch && value.trim()) {
      setShowContentDropdown(true);
    } else {
      setShowContentDropdown(false);
    }
    
    setSelectedContentIndex(-1);
    setIsAddingContent(false);
  };

  const handleAddNewContent = async () => {
    if (!newContentName.trim()) return;

    try {
      const existingContent = contentOptions.find(
        c => c.content_name.toLowerCase() === newContentName.trim().toLowerCase()
      );

      if (existingContent) {
        handleContentSelect(existingContent);
        setIsAddingContent(false);
        setNewContentName('');
        return;
      }

      const { data, error } = await supabase
        .from('content_management')
        .insert([{ content_name: newContentName.trim() }])
        .select()
        .single();

      if (error) throw error;

      setContentOptions(prev => [...prev, data]);
      handleContentSelect(data);
      
      setIsAddingContent(false);
      setNewContentName('');
    } catch (error) {
      console.error('Error adding new content:', error);
      alert('Error adding new content. Please try again.');
    }
  };

  const startAddingContent = () => {
    setIsAddingContent(true);
    setNewContentName(contentSearch);
    setShowContentDropdown(false);
  };

  const filteredContent = contentOptions.filter(content =>
    content.content_name.toLowerCase().includes(contentSearch.toLowerCase())
  );

  const exactMatch = contentOptions.find(
    c => c.content_name.toLowerCase() === contentSearch.toLowerCase()
  );
  // Enhanced EWB Status Component
  const EwbStatusIndicator = () => {
    console.log('🎯 EwbStatusIndicator render - Status:', ewbValidationStatus, 'Result:', !!ewbValidationResult);
    
    if (ewbValidationStatus === 'idle') return null;

    return (
      <div className="w-full animate-in slide-in-from-top-2 duration-300">        {ewbValidationStatus === 'validating' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm mt-2">
            <div className="flex items-center justify-center w-5 h-5 bg-blue-100 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-800">Validating E-way Bill...</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-0.5">Checking GST portal...</p>
            </div>
          </div>
        )}          {ewbValidationStatus === 'verified' && ewbValidationResult && (
          <div className="mt-2">
            {/* Success Banner with compact design */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-300 rounded-lg shadow-sm mb-2">
              <div className="flex items-center justify-center w-5 h-5 bg-emerald-100 rounded-full">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-emerald-800">✅ E-way Bill Verified</span>
                <p className="text-xs text-emerald-600">
                  Status: <span className="font-semibold">{ewbValidationResult.status === 'ACT' ? 'Active' : ewbValidationResult.status}</span>
                </p>
              </div>
            </div>

            {/* Compact Quick Info Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border border-emerald-200 rounded-md p-2 shadow-sm">
                <div className="text-xs text-emerald-600 font-semibold">From</div>
                <div className="text-xs font-bold text-gray-800 truncate">{ewbValidationResult.fromTrdName}</div>
              </div>
              <div className="bg-white border border-emerald-200 rounded-md p-2 shadow-sm">
                <div className="text-xs text-emerald-600 font-semibold">To</div>
                <div className="text-xs font-bold text-gray-800 truncate">{ewbValidationResult.toTrdName}</div>
              </div>
              <div className="bg-white border border-emerald-200 rounded-md p-2 shadow-sm">
                <div className="text-xs text-emerald-600 font-semibold">Value</div>
                <div className="text-xs font-bold text-gray-800">₹{ewbValidationResult.totInvValue?.toLocaleString()}</div>
              </div>
              <div className="bg-white border border-emerald-200 rounded-md p-2 shadow-sm">
                <div className="text-xs text-emerald-600 font-semibold">Distance</div>
                <div className="text-xs font-bold text-gray-800">{ewbValidationResult.actualDist} km</div>
              </div>
            </div>
          </div>
        )}        {ewbValidationStatus === 'failed' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-lg shadow-sm mt-2">
            <div className="flex items-center justify-center w-5 h-5 bg-red-100 rounded-full">
              <XCircle className="w-3 h-3 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-red-800">❌ Validation Failed</span>
                  {ewbValidationError && (
                    <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{ewbValidationError}</p>
                  )}
                </div>
                <button
                  onClick={validateEwbInBackground}
                  className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-all duration-200 font-semibold shadow-sm text-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border-2 border-purple-200 shadow-lg">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Row 1 - Main Options */}
        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[80px] lg:min-w-[90px]">
            DELIVERY
          </span>
          <select
            ref={deliveryTypeRef}
            value={formData.delivery_type}
            onChange={(e) => setFormData(prev => ({ ...prev, delivery_type: e.target.value }))}
            onFocus={() => {
              setTimeout(() => {
                const element = deliveryTypeRef.current;
                if (element) {
                  element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                  });
                }
              }, 100);
            }}
            className="flex-1 px-3 lg:px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 bilty-input-focus transition-all duration-200 text-sm lg:text-base"
            tabIndex={11}
          >
            <option value="godown-delivery">Godown</option>
            <option value="door-delivery">Door</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[80px] lg:min-w-[90px]">
            PAYMENT
          </span>
          <select
            ref={paymentModeRef}
            value={formData.payment_mode}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
            className="flex-1 px-3 lg:px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 bilty-input-focus transition-all duration-200 text-sm lg:text-base"
            tabIndex={12}
          >
            <option value="to-pay">To Pay</option>
            <option value="paid">Paid</option>
            <option value="freeofcost">FOC</option>
          </select>
        </div>

        {/* Enhanced Content Field with Dropdown */}
        <div className="flex items-center gap-3 lg:col-span-1">
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[80px] lg:min-w-[90px]">
            CONTENT
          </span>
          <div className="relative flex-1" ref={contentRef}>
            {isAddingContent ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newContentName}
                  onChange={(e) => setNewContentName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="✨ Enter new content name..."
                  className="flex-1 px-3 lg:px-4 py-2 text-black font-semibold border-2 border-purple-400 rounded-lg bg-white shadow-sm text-input-focus transition-all duration-200 text-sm lg:text-base"
                  autoFocus
                />
                <button
                  onClick={handleAddNewContent}
                  className="px-2 lg:px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center gap-1 shadow-md transition-all"
                >
                  <Check className="w-3 lg:w-4 h-3 lg:h-4" />
                </button>
              </div>
            ) : (
              <input
                type="text"
                ref={contentInputRef}
                value={contentSearch}
                onChange={handleInputChange}
                onFocus={() => {
                  const exactMatch = contentOptions.find(
                    c => c.content_name.toLowerCase() === contentSearch.toLowerCase()
                  );
                  if (!exactMatch && contentSearch.trim()) {
                    setShowContentDropdown(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowContentDropdown(false);
                    setSelectedContentIndex(-1);
                  }, 150);
                }}
                onKeyDown={handleKeyDown}
                placeholder="📦 Search or type goods description..."
                className="w-full px-3 lg:px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 text-input-focus transition-all duration-200 dropdown-input text-sm lg:text-base"
                tabIndex={13}
                aria-expanded={showContentDropdown}
                role="combobox"
              />
            )}

            {showContentDropdown && !isAddingContent && (
              <div className="absolute z-30 mt-1 w-full bg-white border-2 border-purple-300 rounded-lg shadow-xl max-h-48 lg:max-h-64 overflow-y-auto dropdown-open autocomplete-open">
                <div className="p-2 lg:p-3 bg-gradient-to-r from-purple-50 to-blue-50 text-xs font-bold border-b border-purple-200 flex justify-between items-center">
                  <span className="text-black">CONTENT OPTIONS</span>
                  {contentSearch && !exactMatch && (
                    <button
                      onClick={startAddingContent}
                      className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-bold transition-colors text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Add New
                    </button>
                  )}
                </div>
                {filteredContent.length > 0 ? (
                  filteredContent.map((content, index) => (
                    <button
                      key={content.content_id}
                      data-index={index}
                      onClick={() => handleContentSelect(content)}
                      className={`w-full px-3 lg:px-4 py-2 lg:py-3 text-left hover:bg-purple-50 text-xs lg:text-sm transition-colors border-b border-purple-100 ${
                        index === selectedContentIndex ? 'bg-purple-100' : ''
                      }`}
                    >
                      <div className="font-semibold text-black">{content.content_name}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-600">
                    {contentSearch ? (
                      <div className="flex justify-between items-center">
                        <span>No matching content found</span>
                        <button
                          onClick={startAddingContent}
                          className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 transition-colors text-xs"
                        >
                          <Plus className="w-3 h-3" />
                          Add {contentSearch}
                        </button>
                      </div>
                    ) : (
                      'Start typing to search content...'
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2 - Invoice Details */}
        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[80px] lg:min-w-[90px]">
            INV NO
          </span>
          <input
            type="text"
            ref={invoiceNoRef}
            value={formData.invoice_no || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
            className="flex-1 px-3 lg:px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 text-input-focus transition-all duration-200 text-sm lg:text-base"
            placeholder="📄 Invoice number"
            tabIndex={14}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[80px] lg:min-w-[90px]">
            INV VAL
          </span>
          <input
            type="number"
            ref={invoiceValueRef}
            value={formData.invoice_value || 0}
            onChange={(e) => setFormData(prev => ({ ...prev, invoice_value: parseFloat(e.target.value) || 0 }))}
            onFocus={(e) => e.target.select()}
            className="flex-1 px-3 lg:px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 number-input-focus transition-all duration-200 text-sm lg:text-base"
            placeholder="💰 Invoice value"
            tabIndex={15}
          />
        </div>        {/* Enhanced E-WAY Bill with validation status */}
        <div className="lg:col-span-3">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4 shadow-inner">
            <div className="flex items-start gap-3">
              <span className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[80px] lg:min-w-[90px]">
                E-WAY
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    ref={eWayBillRef}
                    value={formData.e_way_bill || ''}
                    onChange={(e) => {
                      // Only allow numbers and hyphens
                      const value = e.target.value.replace(/[^0-9-]/g, '');
                      setFormData(prev => ({ ...prev, e_way_bill: value }));
                      
                      // Auto-validate when format matches 4315-8135-2543 (4-4-4 pattern)
                      const cleanedValue = value.replace(/[-\s]/g, '');
                      if (cleanedValue.length === 12 && /^\d{12}$/.test(cleanedValue)) {
                        console.log('🚀 Auto-triggering validation for:', value);
                        setTimeout(() => {
                          validateEwbInBackground();
                        }, 500);
                      }
                    }}
                    onKeyPress={(e) => {
                      // Prevent non-numeric and non-hyphen characters
                      if (!/[0-9-]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className={`flex-1 px-3 lg:px-4 py-2 text-black font-semibold border-2 rounded-lg bg-white shadow-sm transition-all duration-200 text-sm lg:text-base ${
                      ewbValidationStatus === 'verified' 
                        ? 'border-emerald-400 hover:border-emerald-500 bg-emerald-50' 
                        : ewbValidationStatus === 'failed'
                        ? 'border-red-400 hover:border-red-500 bg-red-50'
                        : ewbValidationStatus === 'validating'
                        ? 'border-blue-400 hover:border-blue-500 bg-blue-50'
                        : 'border-purple-300 hover:border-purple-400'
                    } text-input-focus`}
                    placeholder="🚛 E-way bill number (e.g., 4315-8135-2543)"
                    tabIndex={16}
                  />
                  
                  {/* Status Indicator Icon */}
                  {ewbValidationStatus === 'validating' && (
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  )}
                  {ewbValidationStatus === 'verified' && (
                    <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-full">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                  )}
                  {ewbValidationStatus === 'failed' && (
                    <button
                      onClick={validateEwbInBackground}
                      className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
                      title="Retry validation"
                    >
                      <RefreshCw className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                  
                  {/* Details button when verified */}
                  {ewbValidationStatus === 'verified' && (
                    <button
                      onClick={() => {
                        // Check localStorage if validation result is missing
                        if (!ewbValidationResult && formData.e_way_bill) {
                          const cleanedEwb = formData.e_way_bill.replace(/[-\s]/g, '').trim();
                          const storedResult = localStorage.getItem(`ewb_${cleanedEwb}`);
                          if (storedResult) {
                            setEwbValidationResult(JSON.parse(storedResult));
                          }
                        }
                        setShowEwbValidator(true);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-md text-xs font-semibold"
                      title="View full E-way bill details"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Details</span>
                    </button>
                  )}
                </div>
                
                {/* Enhanced EWB Status Indicator - Now contained within the section */}
                <EwbStatusIndicator />
              </div>
            </div>
          </div>
        </div>        {/* Row 3 - Invoice Date */}
        <div className="flex items-center gap-3 lg:col-span-1 lg:col-start-2">
          <span className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[80px] lg:min-w-[90px]">
            INV DATE
          </span>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              ref={invoiceDateRef}
              value={(() => {
                // Display logic based on focus state
                if (document.activeElement === invoiceDateRef.current) {
                  // When focused, show input-friendly format
                  if (formData.invoice_date) {
                    const [year, month, day] = formData.invoice_date.split('-');
                    const currentDate = new Date();
                    const currentYear = currentDate.getFullYear().toString();
                    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
                    
                    if (year === currentYear && month === currentMonth) {
                      return parseInt(day).toString(); // Show just day for current month
                    } else {
                      return `${parseInt(day)}/${parseInt(month)}/${year}`; // Show full date for other months
                    }
                  }
                  return '';
                } else {
                  // When not focused, show full formatted date
                  if (formData.invoice_date) {
                    const [year, month, day] = formData.invoice_date.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${parseInt(day)} ${monthNames[parseInt(month) - 1]} ${year}`;
                  }
                  return '';
                }
              })()}
              onChange={(e) => {
                let value = e.target.value.replace(/[^0-9\/]/g, ''); // Only allow numbers and slash
                
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth() + 1;
                
                // If just numbers (1-31), assume current month/year
                if (/^\d{1,2}$/.test(value)) {
                  const day = parseInt(value);
                  if (day >= 1 && day <= 31) {
                    const formattedDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                }
                // If DD/MM format, use current year
                else if (/^\d{1,2}\/\d{1,2}$/.test(value)) {
                  const [day, month] = value.split('/').map(n => parseInt(n));
                  if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                    const formattedDate = `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                }
                // If DD/MM/YYYY format
                else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
                  const [day, month, year] = value.split('/').map(n => parseInt(n));
                  if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                }
              }}
              onKeyDown={(e) => {
                // Handle special keys for quick date entry
                if (e.key === 'Enter' || e.key === 'Tab') {
                  const value = e.target.value;
                  
                  // If empty, set today's date
                  if (!value.trim()) {
                    const today = new Date();
                    const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                  // Special shortcuts
                  else if (value === 't' || value === 'today') {
                    e.preventDefault();
                    const today = new Date();
                    const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                  else if (value === 'y' || value === 'yesterday') {
                    e.preventDefault();
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const formattedDate = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                  else if (value === 'n' || value === 'next') {
                    e.preventDefault();
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const formattedDate = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                }
              }}
              onFocus={() => {
                // Force re-render to show input format
                setTimeout(() => {
                  if (invoiceDateRef.current) {
                    invoiceDateRef.current.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }, 10);
              }}
              onBlur={() => {
                // Force re-render to show display format
                setTimeout(() => {
                  if (invoiceDateRef.current) {
                    invoiceDateRef.current.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }, 10);
              }}
              placeholder={document.activeElement === invoiceDateRef.current ? 
                "18, 25/1, 1/1/2026" : 
                "📅 Invoice date"
              }
              maxLength={10}
              className="flex-1 px-3 lg:px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 text-input-focus transition-all duration-200 text-sm lg:text-base"
              tabIndex={17}
            />
            
            {/* Calendar Picker Button */}
            <div className="relative">
              <input
                type="date"
                onChange={(e) => {
                  if (e.target.value) {
                    setFormData(prev => ({ ...prev, invoice_date: e.target.value }));
                    // Force text input to update display
                    setTimeout(() => {
                      if (invoiceDateRef.current) {
                        invoiceDateRef.current.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }, 10);
                  }
                }}
                value={formData.invoice_date || ''}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Pick date from calendar"
              />
              <button
                type="button"
                className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-md border-2 border-purple-300 hover:border-purple-400"
                title="Open calendar picker"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>      {/* EWB Validator Modal - Enhanced */}
      {showEwbValidator && (
        <EwbValidator
          ewbNumber={formData.e_way_bill ? formData.e_way_bill.replace(/[-\s]/g, '').trim() : ''}
          isOpen={showEwbValidator}
          onClose={() => {
            setShowEwbValidator(false);
          }}
          validationResult={ewbValidationResult}
        />
      )}
    </div>
  );
};

export default InvoiceDetailsSection;