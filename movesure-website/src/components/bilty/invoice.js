'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Check, CheckCircle, XCircle, Loader2, Shield, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { useInputNavigation } from './input-navigation';
import EwbValidator from '../ewb/ewb-validator';
import { getActiveEwbToken } from '../ewb/token-helper';

const InvoiceDetailsSection = ({ formData, setFormData }) => {
  const [showEwbValidator, setShowEwbValidator] = useState(false);
  // Multiple EWB State
  const [ewbList, setEwbList] = useState([]);
  const [currentEwbInput, setCurrentEwbInput] = useState('');
  const [validatingEwbId, setValidatingEwbId] = useState(null);
  const [selectedEwbForDetails, setSelectedEwbForDetails] = useState(null);

  const contentInputRef = useRef(null);
  const paymentModeRef = useRef(null);
  const deliveryTypeRef = useRef(null);
  const invoiceNoRef = useRef(null);
  const invoiceValueRef = useRef(null);
  const eWayBillRef = useRef(null);
  const invoiceDateRef = useRef(null);
    // Input navigation
  const { register, unregister, handleEnter } = useInputNavigation();
    // Initialize EWB list from formData whenever it changes (for edit mode)
  useEffect(() => {
    if (formData.e_way_bill && formData.e_way_bill.trim() !== '') {
      const ewbNumbers = formData.e_way_bill.split(',').map(ewb => ewb.trim()).filter(ewb => ewb !== '');
      
      // Only update if the EWB numbers have actually changed
      const currentEwbNumbers = ewbList.map(ewb => ewb.number.trim());
      const newEwbNumbers = ewbNumbers;
      
      const hasChanged = currentEwbNumbers.length !== newEwbNumbers.length || 
                        !currentEwbNumbers.every((ewb, index) => ewb === newEwbNumbers[index]);
      
      if (hasChanged && ewbNumbers.length > 0) {
        console.log('🔄 Initializing EWB list from formData:', ewbNumbers);
        const initialEwbList = ewbNumbers.map((ewb, index) => ({
          id: Date.now() + index,
          number: ewb, // Keep original format with hyphens
          status: 'idle',
          result: null,
          error: null
        }));
        setEwbList(initialEwbList);
      }
    } else if (!formData.e_way_bill && ewbList.length > 0) {
      // Clear the list if formData is empty
      console.log('🧹 Clearing EWB list as formData is empty');
      setEwbList([]);
    }
  }, [formData.e_way_bill]);// Update formData whenever ewbList changes (but avoid infinite loops)
  useEffect(() => {
    const ewbString = ewbList.map(ewb => ewb.number).join(', ');
    
    // Only update if the string has actually changed AND user is not actively typing
    if (formData.e_way_bill !== ewbString && document.activeElement !== eWayBillRef.current) {
      console.log('📝 Updating formData with EWB string:', ewbString);
      setFormData(prev => ({ ...prev, e_way_bill: ewbString }));
    }
  }, [ewbList]); // Remove setFormData from dependencies to avoid loops

  // Multiple EWB Functions
  const addEwbToList = () => {
    if (!currentEwbInput || currentEwbInput.trim() === '') return;
    
    const cleanedEwbNumber = currentEwbInput.replace(/[-\s]/g, '').trim();
    if (cleanedEwbNumber === '' || cleanedEwbNumber.length !== 12) {
      alert('Please enter a valid 12-digit E-way bill number');
      return;
    }
    
    // Check for duplicates
    const isDuplicate = ewbList.some(ewb => 
      ewb.number.replace(/[-\s]/g, '').trim() === cleanedEwbNumber
    );
    
    if (isDuplicate) {
      alert('This E-way bill number is already added');
      return;
    }
    
    const newEwb = {
      id: Date.now(),
      number: currentEwbInput.trim(), // Store with hyphens as user entered
      status: 'idle',
      result: null,
      error: null
    };
    
    setEwbList(prev => [...prev, newEwb]);
    // Clear parent state after successful addition
    setCurrentEwbInput('');
  };
  
  const removeEwbFromList = (ewbId) => {
    setEwbList(prev => prev.filter(ewb => ewb.id !== ewbId));
  };
  
  const validateSingleEwb = async (ewbId) => {
    const ewbItem = ewbList.find(ewb => ewb.id === ewbId);
    if (!ewbItem) return;
    
    const cleanedEwbNumber = ewbItem.number.replace(/[-\s]/g, '').trim();
    
    if (cleanedEwbNumber === '' || cleanedEwbNumber.length !== 12) {
      setEwbList(prev => prev.map(ewb => 
        ewb.id === ewbId 
          ? { ...ewb, status: 'failed', error: 'Invalid E-way bill format' }
          : ewb
      ));
      return;
    }
    
    // Update status to validating
    setEwbList(prev => prev.map(ewb => 
      ewb.id === ewbId 
        ? { ...ewb, status: 'validating', error: null }
        : ewb
    ));
    
    setValidatingEwbId(ewbId);
    
    try {
      console.log('🔍 Starting EWB validation for:', cleanedEwbNumber);
      
      const defaultGstin = '09COVPS5556J1ZT';
      const tokenResult = await getActiveEwbToken(defaultGstin);
      
      if (!tokenResult.success || !tokenResult.data) {
        throw new Error('No active EWB token found. Please check your token settings.');
      }
      
      const ewbToken = tokenResult.data;
      const apiUrl = '/api/ewb/validate';
      
      const requestBody = {
        ewbNumber: cleanedEwbNumber,
        authToken: ewbToken.access_token
      };
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const validationData = data.data?.data?.data || data.data?.data || data.data;
        
        if (validationData?.error?.errorCodes) {
          const errorCode = validationData.error.errorCodes;
          let errorMessage = 'Invalid E-way bill number';
          
          switch (errorCode) {
            case '325':
              errorMessage = 'E-way bill number not found';
              break;
            case '102':
              errorMessage = 'E-way bill number is invalid or expired';
              break;
            case '101':
              errorMessage = 'E-way bill number format is incorrect';
              break;
            default:
              errorMessage = `Validation failed (Error: ${errorCode})`;
          }
          
          throw new Error(errorMessage);
        }
        
        if (validationData?.status === '0') {
          throw new Error('E-way bill number not found or is invalid');
        }
        
        if (!validationData?.ewbNo && !validationData?.data?.ewbNo) {
          throw new Error('E-way bill number not found');
        }
        
        // Update with success
        setEwbList(prev => prev.map(ewb => 
          ewb.id === ewbId 
            ? { ...ewb, status: 'verified', result: validationData, error: null }
            : ewb
        ));
        
      } else {
        const errorMessage = data.error || data.details?.message || `API Error: ${response.status}`;
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('🚨 EWB validation error:', err);
      
      let errorMessage = err.message || 'Failed to validate E-way bill';
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect';
      } else if (err.message.includes('CORS')) {
        errorMessage = 'CORS error: Service unavailable';
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Connection failed: Check internet';
      } else if (err.message.includes('401')) {
        errorMessage = 'Authentication failed: Invalid token';
      } else if (err.message.includes('404')) {
        errorMessage = 'E-way bill not found';
      } else if (err.message.includes('400')) {
        errorMessage = 'Invalid E-way bill format';
      }
      
      setEwbList(prev => prev.map(ewb => 
        ewb.id === ewbId 
          ? { ...ewb, status: 'failed', error: errorMessage }
          : ewb
      ));
    } finally {
      setValidatingEwbId(null);
    }
  };

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
      register(13, contentInputRef.current);
    }
    if (invoiceNoRef.current) {
      register(14, invoiceNoRef.current);
    }
    if (invoiceValueRef.current) {
      register(15, invoiceValueRef.current);
    }    if (eWayBillRef.current) {
      register(16, eWayBillRef.current, {
        skipAutoFocus: true, // Prevent auto-focus on component mount
        preventInitialFocus: true // Additional flag to prevent focus
      });
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

  // Multiple EWB Status Component
  const MultipleEwbSection = () => {
    const [localInputValue, setLocalInputValue] = useState('');
    const [inputRefs] = useState(() => ({ current: null }));

    const formatEwbWithHyphens = (value) => {
      // Remove all non-digits first
      const digits = value.replace(/\D/g, '');
      
      // Limit to 12 digits max
      const limitedDigits = digits.slice(0, 12);
      
      // Add hyphens every 4 digits
      if (limitedDigits.length <= 4) return limitedDigits;
      if (limitedDigits.length <= 8) return `${limitedDigits.slice(0, 4)}-${limitedDigits.slice(4)}`;
      return `${limitedDigits.slice(0, 4)}-${limitedDigits.slice(4, 8)}-${limitedDigits.slice(8)}`;
    };    const addToListAndClear = () => {
      const digits = localInputValue.replace(/\D/g, '');
      
      if (digits.length !== 12 || !localInputValue.trim()) {
        console.log('❌ Invalid EWB - need exactly 12 digits, got:', digits.length);
        return;
      }
      
      // Check for duplicates
      const isDuplicate = ewbList.some(ewb => 
        ewb.number.replace(/[-\s]/g, '').trim() === digits
      );
      
      if (isDuplicate) {
        console.log('❌ Duplicate EWB detected');
        return;
      }
      
      const newEwb = {
        id: Date.now(),
        number: localInputValue.trim(), // Store formatted version with hyphens
        status: 'idle',
        result: null,
        error: null
      };
      
      console.log('✅ Adding EWB to list:', newEwb.number);
      setEwbList(prev => [...prev, newEwb]);
      setLocalInputValue(''); // Clear local input
      
      // Robust focus management
      const focusInput = () => {
        if (inputRefs.current) {
          inputRefs.current.focus();
          inputRefs.current.setSelectionRange(0, 0); // Reset cursor position
        } else if (eWayBillRef.current) {
          eWayBillRef.current.focus();
          eWayBillRef.current.setSelectionRange(0, 0);
        }
      };
      
      // Multiple focus attempts to ensure success
      setTimeout(focusInput, 5);
      setTimeout(focusInput, 15);
      setTimeout(focusInput, 30);
    };    const handleInputChange = (e) => {
      const rawValue = e.target.value;
      
      // Check for comma or + - this triggers adding the EWB
      if (rawValue.includes(',') || rawValue.includes('+')) {
        const beforeTrigger = rawValue.split(/[,+]/)[0].trim();
        console.log('🔤 Trigger detected, processing:', beforeTrigger);
        
        if (beforeTrigger) {
          const formattedValue = formatEwbWithHyphens(beforeTrigger);
          const digits = beforeTrigger.replace(/\D/g, '');
          
          if (digits.length === 12) {
            // Set the formatted value and trigger add
            setLocalInputValue(formattedValue);
            // Small delay to ensure state update before adding
            setTimeout(() => {
              addToListAndClear();
            }, 5);
          } else {
            // If not 12 digits, just remove the trigger and continue typing
            setLocalInputValue(formattedValue);
          }
        } else {
          setLocalInputValue('');
        }
        return;
      }

      // Normal typing - format with hyphens
      const formattedValue = formatEwbWithHyphens(rawValue);
      setLocalInputValue(formattedValue);
    };    const handleKeyDown = (e) => {
      // Handle Enter key
      if (e.key === 'Enter') {
        e.preventDefault();
        const digits = localInputValue.replace(/\D/g, '');
        
        if (digits.length === 12 && localInputValue.trim()) {
          console.log('⏎ Enter pressed, adding EWB:', localInputValue);
          addToListAndClear();
        }
      }
      
      // Handle comma key (keyCode 188 or key ',')
      if (e.key === ',' || e.keyCode === 188) {
        e.preventDefault();
        const digits = localInputValue.replace(/\D/g, '');
        
        if (digits.length === 12 && localInputValue.trim()) {
          console.log('🔤 Comma key pressed, adding EWB:', localInputValue);
          addToListAndClear();
        }
      }
      
      // Handle + key (keyCode 107 or key '+')
      if (e.key === '+' || e.keyCode === 107 || e.keyCode === 61) {
        e.preventDefault();
        const digits = localInputValue.replace(/\D/g, '');
        
        if (digits.length === 12 && localInputValue.trim()) {
          console.log('➕ Plus key pressed, adding EWB:', localInputValue);
          addToListAndClear();
        }
      }
    };const handleAddClick = () => {
      const digits = localInputValue.replace(/\D/g, '');
      
      if (digits.length === 12 && localInputValue.trim()) {
        console.log('➕ Add button clicked, adding EWB:', localInputValue);
        addToListAndClear();
      }
    };

    return (
      <div className="w-full">
        {/* Single EWB Input */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              ref={(el) => {
                if (el) {
                  eWayBillRef.current = el;
                  inputRefs.current = el;
                }
              }}
              value={localInputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="ewb-input flex-1 px-3 lg:px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 text-input-focus transition-all duration-200 text-sm lg:text-base"
              placeholder="🚛 Type E-way bill (e.g., 4521-1235-5451) - Press comma/+ or click + to add"
              tabIndex={16}
              maxLength={14}
              autoComplete="off"
            />
              {/* Add Button - shows when there's exactly 12 digits */}
            {localInputValue.trim() && localInputValue.replace(/\D/g, '').length === 12 && (
              <button
                onClick={handleAddClick}
                className="px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-md text-sm font-semibold"
                title="Add E-way bill"
                type="button"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>          {/* Helper text */}
          <div className="mt-1 text-xs text-gray-600">
            💡 Type 12-digit E-way bill number and press <kbd className="bg-gray-100 px-1 rounded">comma</kbd>, <kbd className="bg-gray-100 px-1 rounded">+</kbd>, <kbd className="bg-gray-100 px-1 rounded">Enter</kbd> or click <kbd className="bg-gray-100 px-1 rounded">+</kbd> button to add
          </div>
        </div>

        {/* EWB List */}
        {ewbList.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-purple-700 mb-2">
              E-way Bills ({ewbList.length})
            </div>
            {ewbList.map((ewb) => (
              <div key={ewb.id} className="bg-white border-2 border-purple-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1">
                    {/* EWB Number */}
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-800">{ewb.number}</div>
                      {ewb.status === 'verified' && ewb.result && (
                        <div className="text-xs text-emerald-600 mt-1">
                          {ewb.result.fromTrdName} → {ewb.result.toTrdName}
                        </div>
                      )}
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                      {ewb.status === 'validating' && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">Validating...</span>
                        </div>
                      )}
                      {ewb.status === 'verified' && (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-semibold">Verified</span>
                        </div>
                      )}
                      {ewb.status === 'failed' && (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs">Failed</span>
                        </div>
                      )}
                      {ewb.status === 'idle' && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs">Not verified</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    {/* Validate Button */}
                    {(ewb.status === 'idle' || ewb.status === 'failed') && (
                      <button
                        onClick={() => validateSingleEwb(ewb.id)}
                        disabled={validatingEwbId === ewb.id}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-all text-xs font-semibold"
                        title="Validate E-way bill"
                      >
                        <Shield className="w-3 h-3" />
                      </button>
                    )}
                    
                    {/* Details Button */}
                    {ewb.status === 'verified' && ewb.result && (
                      <button
                        onClick={() => {
                          setSelectedEwbForDetails(ewb.result);
                          setShowEwbValidator(true);
                        }}
                        className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-all text-xs font-semibold"
                        title="View details"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                    
                    {/* Remove Button */}
                    <button
                      onClick={() => removeEwbFromList(ewb.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-all text-xs font-semibold"
                      title="Remove E-way bill"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {ewb.status === 'failed' && ewb.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {ewb.error}
                  </div>
                )}
                
                {/* Success Details */}
                {ewb.status === 'verified' && ewb.result && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                      <div className="text-xs text-emerald-600 font-semibold">Value</div>
                      <div className="text-xs font-bold text-gray-800">₹{ewb.result.totInvValue?.toLocaleString()}</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                      <div className="text-xs text-emerald-600 font-semibold">Distance</div>
                      <div className="text-xs font-bold text-gray-800">{ewb.result.actualDist} km</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
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

        {/* Simple Content Field */}
        <div className="flex items-center gap-3 lg:col-span-1">
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[80px] lg:min-w-[90px]">
            CONTENT
          </span>
          <input
            type="text"
            ref={contentInputRef}
            value={formData.contain || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, contain: e.target.value.toUpperCase() }))}
            placeholder="📦 Goods description..."
            className="flex-1 px-3 lg:px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 text-input-focus transition-all duration-200 text-sm lg:text-base"
            tabIndex={13}
            style={{ textTransform: 'uppercase' }}
          />
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
            onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value.toUpperCase() }))}
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
        </div>        {/* Enhanced E-WAY Bill with multiple entries */}
        <div className="lg:col-span-3">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4 shadow-inner">
            <div className="flex items-start gap-3">
              <span className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[80px] lg:min-w-[90px]">
                E-WAY
              </span>
              <div className="flex-1">
                <MultipleEwbSection />
              </div>
            </div>
          </div>
        </div>{/* Row 3 - Invoice Date */}
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
      </div>      {/* EWB Validator Modal - Enhanced for multiple EWBs */}
      {showEwbValidator && (
        <EwbValidator
          ewbNumber={selectedEwbForDetails?.ewbNo || ''}
          isOpen={showEwbValidator}
          onClose={() => {
            setShowEwbValidator(false);
            setSelectedEwbForDetails(null);
          }}
          validationResult={selectedEwbForDetails}
        />
      )}
    </div>
  );
};

export default InvoiceDetailsSection;