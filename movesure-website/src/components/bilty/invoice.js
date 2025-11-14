'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, XCircle } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { useInputNavigation } from './input-navigation';
import { useConsignorPaymentMode, useConsignorDeliveryType } from './payment-mode-helper';

const InvoiceDetailsSection = ({ formData, setFormData, isEditMode = false }) => {
  // Multiple EWB State
  const [ewbList, setEwbList] = useState([]);
  
  // Track focus state for date input to force re-render
  const [isDateFocused, setIsDateFocused] = useState(false);

  const contentInputRef = useRef(null);
  const paymentModeRef = useRef(null);
  const deliveryTypeRef = useRef(null);
  const invoiceNoRef = useRef(null);
  const invoiceValueRef = useRef(null);
  const eWayBillRef = useRef(null);
  const invoiceDateRef = useRef(null);
  
  // Input navigation
  const { register, unregister, handleEnter } = useInputNavigation();
  
  // Fetch payment mode based on consignor's history
  const { paymentMode: oldPaymentMode, loading: loadingPaymentMode } = useConsignorPaymentMode(
    formData.consignor_name, 
    formData.branch_id
  );
  
  // Fetch delivery type based on consignor's history
  const { deliveryType: oldDeliveryType, loading: loadingDeliveryType } = useConsignorDeliveryType(
    formData.consignor_name, 
    formData.branch_id
  );
  
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
      status: 'added'
    };
    
    setEwbList(prev => [...prev, newEwb]);
    // Clear parent state after successful addition
    setCurrentEwbInput('');
  };
  
  const removeEwbFromList = (ewbId) => {
    setEwbList(prev => prev.filter(ewb => ewb.id !== ewbId));
  };

  // Auto-populate payment mode from consignor's payment history
  useEffect(() => {
    // DON'T auto-populate in edit mode - respect database values
    if (isEditMode) return;
    
    // Only auto-populate when consignor is selected and data is loaded
    if (formData.consignor_name && !loadingPaymentMode && oldPaymentMode) {
      // Only update if current payment_mode is default 'to-pay'
      const currentMode = formData.payment_mode;
      if (currentMode === 'to-pay' && oldPaymentMode.mode) {
        setFormData(prev => ({ ...prev, payment_mode: oldPaymentMode.mode }));
      }
    }
  }, [formData.consignor_name, oldPaymentMode, loadingPaymentMode, isEditMode]);

  // Auto-populate delivery type from consignor's delivery history
  useEffect(() => {
    // DON'T auto-populate in edit mode - respect database values
    if (isEditMode) return;
    
    // Only auto-populate when consignor is selected and data is loaded
    if (formData.consignor_name && !loadingDeliveryType && oldDeliveryType) {
      // Only update if current delivery_type is default 'godown-delivery'
      const currentType = formData.delivery_type;
      if (currentType === 'godown-delivery' && oldDeliveryType.type) {
        setFormData(prev => ({ ...prev, delivery_type: oldDeliveryType.type }));
      }
    }
  }, [formData.consignor_name, oldDeliveryType, loadingDeliveryType, isEditMode]);

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
    }    if (invoiceDateRef.current) {
      register(16, invoiceDateRef.current);
    }
    if (eWayBillRef.current) {
      register(17, eWayBillRef.current, {
        skipAutoFocus: true, // Prevent auto-focus on component mount
        preventInitialFocus: true // Additional flag to prevent focus
      });
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
    };

    const addToListAndClear = () => {
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
        status: 'added'
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
            className="ewb-input flex-1 px-2 py-1.5 text-black font-semibold border border-slate-300 rounded-lg bg-white shadow-sm hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 text-input-focus transition-all duration-200 text-sm"
            placeholder="🚛 E-way bill (e.g., 4521-1235-5451)"
            tabIndex={17}
            maxLength={14}
            autoComplete="off"
          />
            {/* Add Button - shows when there's exactly 12 digits */}
          {localInputValue.trim() && localInputValue.replace(/\D/g, '').length === 12 && (
            <button
              onClick={handleAddClick}
              className="px-2 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all duration-200 shadow-md text-sm font-semibold"
              title="Add E-way bill"
              type="button"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* EWB List - Compact Grid Layout */}
        {ewbList.length > 0 && (
          <div className="mt-1.5">
            <div className="text-[10px] font-semibold text-indigo-700 mb-1">
              Added ({ewbList.length})
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
              {ewbList.map((ewb) => (
                <div key={ewb.id} className="bg-slate-50 border border-slate-200 rounded-md p-1.5 shadow-sm flex items-center justify-between gap-1">
                  {/* EWB Number - Compact */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate">{ewb.number}</div>
                  </div>

                  {/* Remove Button - Small */}
                  <button
                    onClick={() => removeEwbFromList(ewb.id)}
                    className="flex-shrink-0 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition-all"
                    title="Remove"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white/95 p-3 rounded-lg border border-slate-200 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        {/* Row 1 - Main Options */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500 text-white px-2 lg:px-3 py-1.5 text-xs font-semibold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[70px] lg:min-w-[80px]">
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
              className="flex-1 px-2 lg:px-3 py-1.5 text-black font-semibold border border-slate-300 rounded-lg bg-white shadow-sm hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 bilty-input-focus transition-all duration-200 text-sm"
              tabIndex={11}
            >
              <option value="godown-delivery">Godown</option>
              <option value="door-delivery">Door</option>
            </select>
          </div>
          {/* Smart Delivery Type Status - Shows AI analysis */}
          {formData.consignor_name && (() => {
            const formatDeliveryType = (type) => {
              const types = { 'godown-delivery': 'Godown', 'door-delivery': 'Door' };
              return types[type] || type;
            };

            // In edit mode, show what was originally in database
            if (isEditMode) {
              return (
                <div className="ml-[94px] lg:ml-[102px] text-[10px] font-medium mt-0.5">
                  <span className="text-blue-600">📋 Database Value (Edit Mode)</span>
                </div>
              );
            }

            // In create mode, show AI suggestion
            if (loadingDeliveryType) {
              return (
                <div className="ml-[94px] lg:ml-[102px] text-[10px] text-gray-500 font-medium mt-0.5 animate-pulse">
                  🤖 Analyzing delivery history...
                </div>
              );
            }

            if (!oldDeliveryType || !oldDeliveryType.type) {
              return (
                <div className="ml-[94px] lg:ml-[102px] text-[10px] text-gray-600 font-medium mt-0.5">
                  💼 Using Default (Godown) - No history
                </div>
              );
            }

            const percentage = Math.round((oldDeliveryType.count / oldDeliveryType.totalBilties) * 100);
            return (
              <div className="ml-[94px] lg:ml-[102px] text-[10px] text-green-600 font-medium mt-0.5">
                ✅ AI: {formatDeliveryType(oldDeliveryType.type)} Delivery ({percentage}%)
              </div>
            );
          })()}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500 text-white px-2 lg:px-3 py-1.5 text-xs font-semibold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[70px] lg:min-w-[75px]">
              PAYMENT
            </span>
            <select
              ref={paymentModeRef}
              value={formData.payment_mode}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
              className="flex-1 px-2 lg:px-3 py-1.5 text-black text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 bilty-input-focus transition-all duration-200"
              tabIndex={12}
            >
              <option value="to-pay">To Pay</option>
              <option value="paid">Paid</option>
              <option value="freeofcost">FOC</option>
            </select>
          </div>
          {/* Smart Payment Mode Status - Shows AI analysis */}
          {formData.consignor_name && (() => {
            const formatPaymentMode = (mode) => {
              const modes = { 'to-pay': 'To Pay', 'paid': 'Paid', 'freeofcost': 'FOC' };
              return modes[mode] || mode;
            };

            // In edit mode, show what was originally in database
            if (isEditMode) {
              return (
                <div className="ml-[94px] lg:ml-[102px] text-[10px] font-medium mt-0.5">
                  <span className="text-blue-600">📋 Database Value (Edit Mode)</span>
                </div>
              );
            }

            // In create mode, show AI suggestion
            if (loadingPaymentMode) {
              return (
                <div className="ml-[94px] lg:ml-[102px] text-[10px] text-gray-500 font-medium mt-0.5 animate-pulse">
                  🤖 Analyzing payment history...
                </div>
              );
            }

            if (!oldPaymentMode || !oldPaymentMode.mode) {
              return (
                <div className="ml-[94px] lg:ml-[102px] text-[10px] text-gray-600 font-medium mt-0.5">
                  💼 Using Default (To Pay) - No history
                </div>
              );
            }

            const percentage = Math.round((oldPaymentMode.count / oldPaymentMode.totalBilties) * 100);
            return (
              <div className="ml-[94px] lg:ml-[102px] text-[10px] text-green-600 font-medium mt-0.5">
                ✅ AI: {formatPaymentMode(oldPaymentMode.mode)} ({percentage}%)
              </div>
            );
          })()}
        </div>

        {/* Simple Content Field */}
        <div className="flex items-center gap-2 lg:col-span-1">
          <span className="bg-indigo-500 text-white px-2 lg:px-3 py-1.5 text-xs font-semibold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[70px] lg:min-w-[75px]">
            CONTENT
          </span>
          <input
            type="text"
            ref={contentInputRef}
            value={formData.contain || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, contain: e.target.value.toUpperCase() }))}
            placeholder="📦 Goods description..."
            className="flex-1 px-2 lg:px-3 py-1.5 text-black text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 text-input-focus transition-all duration-200"
            tabIndex={13}
            style={{ textTransform: 'uppercase' }}
          />
        </div>

        {/* Row 2 - Invoice Details with Date */}
        <div className="flex items-center gap-2">
          <span className="bg-indigo-500 text-white px-2 lg:px-3 py-1.5 text-xs font-semibold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[70px] lg:min-w-[75px]">
            INV NO
          </span>
          <input
            type="text"
            ref={invoiceNoRef}
            value={formData.invoice_no || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value.toUpperCase() }))}
            className="flex-1 px-2 lg:px-3 py-1.5 text-black text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 text-input-focus transition-all duration-200"
            placeholder="📄 Invoice number"
            tabIndex={14}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-indigo-500 text-white px-2 lg:px-3 py-1.5 text-xs font-semibold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[70px] lg:min-w-[75px]">
            INV VAL
          </span>
          <input
            type="text"
            inputMode="decimal"
            ref={invoiceValueRef}
            value={formData.invoice_value || ''}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9.]/g, '');
              setFormData(prev => ({ ...prev, invoice_value: value ? parseFloat(value) : 0 }));
            }}
            onFocus={(e) => e.target.select()}
            className="flex-1 px-2 lg:px-3 py-1.5 text-black text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 number-input-focus transition-all duration-200"
            placeholder="0"
            tabIndex={15}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[65px]">
            INV DATE
          </span>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              ref={invoiceDateRef}
              value={(() => {
                // Display logic based on focus state
                if (isDateFocused) {
                  // When focused, show input-friendly format
                  if (formData.invoice_date) {
                    const [year, month, day] = formData.invoice_date.split('-');
                    const currentDate = new Date();
                    const currentYear = currentDate.getFullYear().toString();
                    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
                    
                    if (year === currentYear && month === currentMonth) {
                      return parseInt(day).toString();
                    } else {
                      return `${parseInt(day)}/${parseInt(month)}/${year}`;
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
                let value = e.target.value.replace(/[^0-9\/]/g, '');
                
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth() + 1;
                
                if (/^\d{1,2}$/.test(value)) {
                  const day = parseInt(value);
                  if (day >= 1 && day <= 31) {
                    const formattedDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                }
                else if (/^\d{1,2}\/\d{1,2}$/.test(value)) {
                  const [day, month] = value.split('/').map(n => parseInt(n));
                  if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                    const formattedDate = `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                }
                else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
                  const [day, month, year] = value.split('/').map(n => parseInt(n));
                  if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  const value = e.target.value;
                  
                  if (!value.trim()) {
                    const today = new Date();
                    const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                  else if (value === 't' || value === 'today') {
                    const today = new Date();
                    const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                  else if (value === 'y' || value === 'yesterday') {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const formattedDate = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, invoice_date: formattedDate }));
                  }
                }
              }}
              onFocus={(e) => {
                setIsDateFocused(true);
                setTimeout(() => {
                  e.target.select();
                }, 0);
              }}
              onBlur={() => {
                setIsDateFocused(false);
              }}
              placeholder={isDateFocused ? 
                "18, 25/1, 1/1/2026" : 
                "📅 Date"
              }
              maxLength={10}
              className="flex-1 px-2 lg:px-3 py-1.5 text-black text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-sm hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 text-input-focus transition-all duration-200"
              tabIndex={16}
            />
            
            {/* Calendar Picker Button */}
            <div className="relative">
              <input
                type="date"
                onChange={(e) => {
                  if (e.target.value) {
                    setFormData(prev => ({ ...prev, invoice_date: e.target.value }));
                    setTimeout(() => {
                      if (invoiceDateRef.current) {
                        invoiceDateRef.current.blur();
                      }
                    }, 10);
                  }
                }}
                value={formData.invoice_date || ''}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Pick date from calendar"
                tabIndex="-1"
              />
              <button
                type="button"
                className="flex items-center justify-center w-9 h-9 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all duration-200 shadow-md border border-slate-300 hover:border-indigo-300 focus:border-indigo-400 focus:ring-0"
                title="Open calendar picker"
                tabIndex="-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Row 3 - E-WAY Bill (Full Width) */}
        <div className="lg:col-span-3">
          <div className="flex items-start gap-2">
            <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[50px]">
              EWB
            </span>
            <div className="flex-1">
              <MultipleEwbSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsSection;
