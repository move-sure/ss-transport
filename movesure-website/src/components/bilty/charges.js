'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useInputNavigation } from './input-navigation';
import { Save, FileText, RotateCcw } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { LabourRateInfo, useConsignorLabourRate } from './labour-rate-helper';
import { HistoricalRateInfo, useHistoricalRate } from './rate-helper';

const PackageChargesSection = ({ 
  formData, 
  setFormData, 
  rates, 
  onSave, 
  onSaveDraft,
  onReset,
  saving = false, 
  isEditMode = false, 
  showShortcuts = false
}) => {  const { register, unregister, handleEnter } = useInputNavigation();
  const inputRefs = useRef({});
  const labourChargeTimeoutRef = useRef(null);
  const [rateInfo, setRateInfo] = useState(null);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  const [duplicateGrInfo, setDuplicateGrInfo] = useState(null);  const rateRef = useRef(null);
  const saveDebounceRef = useRef(null); // Add debounce ref for save operations
  const lastSaveTimeRef = useRef(0); // Track last save time
  
  // Fetch old labour rate for consignor
  const { labourRate: oldLabourRate, loading: loadingLabourRate } = useConsignorLabourRate(
    formData.consignor_name, 
    formData.branch_id
  );

  // Fetch historical rate from bilty table
  const { historicalRate, loading: loadingHistoricalRate } = useHistoricalRate(
    formData.consignor_name,
    formData.consignee_name,
    formData.to_city_id,
    formData.branch_id
  );  // Validation function to check required fields and duplicate GR numbers
  const validateBeforeSaveOrPrint = async (isDraft = false) => {
    console.log('🔍 Starting validation with:', { 
      isDraft, 
      isEditMode, 
      grNo: formData?.gr_no,
      consignor: formData?.consignor_name,
      consignee: formData?.consignee_name,
      city: formData?.to_city_id 
    });

    // If it's a draft, allow saving with minimal validation
    if (isDraft) {
      console.log('✅ Draft mode - skipping validation');
      return { isValid: true, message: '' };
    }

    const errors = [];

    // Check required fields for printing
    if (!formData.consignor_name || formData.consignor_name.trim() === '') {
      errors.push('Consignor name is required');
    }
    
    if (!formData.consignee_name || formData.consignee_name.trim() === '') {
      errors.push('Consignee name is required');
    }
    
    if (!formData.to_city_id) {
      errors.push('Destination city is required');
    }
    
    if (!formData.gr_no || formData.gr_no.trim() === '') {
      errors.push('GR Number is required');
    }

    // If basic validation fails, return early
    if (errors.length > 0) {
      return { 
        isValid: false, 
        message: 'Please fill all required fields:\n• ' + errors.join('\n• ') 
      };
    }

    // Check for duplicate GR number only if we have a GR number and not in edit mode
    if (formData.gr_no && !isEditMode) {
      try {
        console.log('🔍 Checking for duplicate GR number:', formData.gr_no.trim());
        
        const { data: existingBilty, error } = await supabase
          .from('bilty')
          .select('gr_no, id, created_at')
          .eq('gr_no', formData.gr_no.trim())
          .eq('is_active', true)
          .is('deleted_at', null)
          .maybeSingle(); // Use maybeSingle instead of single to avoid error when no record found

        console.log('🔍 Duplicate check result:', { existingBilty, error });

        if (existingBilty) {
          console.log('❌ Duplicate GR found:', existingBilty);
          setDuplicateGrInfo({
            grNo: formData.gr_no,
            existingId: existingBilty.id,
            createdAt: new Date(existingBilty.created_at).toLocaleString()
          });
          setShowDuplicatePopup(true);
          return { 
            isValid: false, 
            message: '' // No message since we're showing popup
          };
        }

        if (error) {
          console.error('❌ Error checking duplicate GR number:', error);
          return { 
            isValid: false, 
            message: `❌ Error checking GR number: ${error.message}\n\nPlease try again or contact support.` 
          };
        }

        console.log('✅ No duplicate GR found - safe to proceed');
      } catch (error) {
        console.error('❌ Exception while checking duplicate GR number:', error);
        return { 
          isValid: false, 
          message: `❌ Error checking GR number: ${error.message}\n\nPlease try again or contact support.` 
        };
      }
    }

    return { isValid: true, message: '' };
  };

  // Safe save function with validation, debouncing and protection against multiple saves
  const handleSafeSave = async (isDraft = false) => {
    const currentTime = Date.now();
    const timeSinceLastSave = currentTime - lastSaveTimeRef.current;
    
    console.log('🔍 handleSafeSave called with:', { 
      isDraft, 
      saving, 
      timeSinceLastSave,
      hasOnSave: !!onSave,
      formDataExists: !!formData,
      grNo: formData?.gr_no
    });
    
    // Prevent saves if already saving or too recent (within 500ms)
    if (saving || timeSinceLastSave < 500) {
      console.log('🚫 Save blocked - already saving or too recent:', { saving, timeSinceLastSave });
      return;
    }

    // Validate before saving/printing
    const validation = await validateBeforeSaveOrPrint(isDraft);
    if (!validation.isValid) {
      if (validation.message) {
        alert(validation.message);
      }
      return;
    }
    
    // Clear any pending debounced save
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    
    // Update last save time
    lastSaveTimeRef.current = currentTime;
    
    console.log('✅ Executing safe save:', { isDraft, currentTime });
    
    // Call the actual save function
    if (onSave) {
      onSave(isDraft);
    } else {
      console.error('❌ No onSave function provided!');
    }
  };
  const setInputRef = (tabIndex, element) => {
    inputRefs.current[tabIndex] = element;
    if (element) {
      console.log(`📋 Charges: Registering input tabIndex ${tabIndex}`);      // Special handling for Save & Print button (tabIndex 30)
      if (tabIndex === 30) {
        // Register normally but don't add extra handlers since button has onKeyDown
        register(tabIndex, element, {
          beforeFocus: () => {
            console.log(`🎯 Focusing on Save & Print button: ${tabIndex}`);
          }
        });
        
      } else {
        register(tabIndex, element, {
          beforeFocus: () => {
            console.log(`🎯 Focusing on charges field: ${tabIndex}`);
          }
        });
      }    } else {
      console.log(`📋 Charges: Unregistering input tabIndex ${tabIndex}`);
      unregister(tabIndex);
    }
  };
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.keys(inputRefs.current).forEach(tabIndex => {
        unregister(parseInt(tabIndex));
      });
      
      // Cleanup timeouts
      if (labourChargeTimeoutRef.current) {
        clearTimeout(labourChargeTimeoutRef.current);
      }
      if (window.rateSaveTimeout) {
        clearTimeout(window.rateSaveTimeout);
      }
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, [unregister]);

  // Ensure all inputs are registered after component mounts
  useEffect(() => {
    console.log(`📋 Charges component mounted, checking input registrations...`);
    
    // Small delay to ensure all refs are set
    const timer = setTimeout(() => {
      Object.entries(inputRefs.current).forEach(([tabIndex, element]) => {
        if (element) {
          console.log(`📋 Charges: Re-registering input tabIndex ${tabIndex} after mount`);
          register(parseInt(tabIndex), element, {
            beforeFocus: () => {
              console.log(`🎯 Focusing on charges field: ${tabIndex}`);
            }
          });
        }
      });
    }, 100);

    return () => clearTimeout(timer);  }, [register]); // Run when register function is available

  useEffect(() => {
    // Calculate labour charge when packages or labour rate changes
    const labourRate = parseFloat(formData.labour_rate) || 0;
    const packages = parseInt(formData.no_of_pkg) || 0;
    const calculatedLabourCharge = packages * labourRate;
    
    // Clear any existing timeout
    if (labourChargeTimeoutRef.current) {
      clearTimeout(labourChargeTimeoutRef.current);
    }
    
    // Set a small delay to allow manual input to take precedence
    labourChargeTimeoutRef.current = setTimeout(() => {
      setFormData(prev => ({ ...prev, labour_charge: calculatedLabourCharge }));
    }, 100);
    
    // Cleanup timeout on unmount
    return () => {
      if (labourChargeTimeoutRef.current) {
        clearTimeout(labourChargeTimeoutRef.current);
      }
    };
  }, [formData.no_of_pkg, formData.labour_rate, setFormData]);

  // Listen for copied rate from rate search modal
  useEffect(() => {
    const handleRateCopied = (event) => {
      const rate = event.detail.rate;
      setFormData(prev => ({ ...prev, rate: parseFloat(rate) }));
      
      // Focus on the rate input to show the change
      if (rateRef.current) {
        rateRef.current.focus();
        // Briefly highlight the input
        rateRef.current.classList.add('ring-2', 'ring-green-500');
        setTimeout(() => {
          rateRef.current?.classList.remove('ring-2', 'ring-green-500');
        }, 1000);
      }
    };
    
    window.addEventListener('rateCopied', handleRateCopied);
    return () => window.removeEventListener('rateCopied', handleRateCopied);
  }, [setFormData]);

  useEffect(() => {
    // Calculate freight amount
    const freightAmount = (formData.wt || 0) * (formData.rate || 0);
    setFormData(prev => ({ ...prev, freight_amount: freightAmount }));
  }, [formData.wt, formData.rate, setFormData]);
  useEffect(() => {
    // Calculate total - handle string values during decimal input
    const parseValue = (val) => {
      if (val === undefined || val === null || val === '') return 0;
      // If it's a string ending with just a decimal point, treat as the number before decimal
      if (typeof val === 'string') {
        if (val === '.' || val === '') return 0;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      }
      return parseFloat(val) || 0;
    };

    const total = parseValue(formData.freight_amount) + 
                  parseValue(formData.labour_charge) + 
                  parseValue(formData.bill_charge) + 
                  parseValue(formData.toll_charge) + 
                  parseValue(formData.other_charge) + 
                  parseValue(formData.pf_charge);
    
    setFormData(prev => ({ ...prev, total }));
  }, [formData.freight_amount, formData.labour_charge, formData.bill_charge, 
      formData.toll_charge, formData.other_charge, formData.pf_charge, setFormData]);  // Check and display rate info when rate, consignor, or city changes
  useEffect(() => {
    // REMOVED - Now only using historical rate from rate-helper.js
    // No need to check rates table separately
    setRateInfo(null);
  }, [formData.rate, formData.consignor_name, formData.to_city_id, formData.branch_id]);

  // Handle rate change with auto-save functionality
  const handleRateChange = async (e) => {
    const newRate = parseFloat(e.target.value) || 0;
    setFormData(prev => ({ ...prev, rate: newRate }));

    // Don't save if no city or branch selected, or rate is 0
    if (!formData.to_city_id || !formData.branch_id || newRate <= 0) {
      return;
    }

    // Debounce the save operation
    if (window.rateSaveTimeout) {
      clearTimeout(window.rateSaveTimeout);
    }

    window.rateSaveTimeout = setTimeout(async () => {
      await saveRateAutomatically(newRate);
    }, 1000); // Save after 1 second of no typing
  };

  // Auto-save rate function
  const saveRateAutomatically = async (rate) => {
    if (!formData.to_city_id || !formData.branch_id || !rate || rate <= 0) {
      return;
    }

    try {
      setIsSavingRate(true);
      console.log('🔄 Auto-saving rate:', rate);

      let consignorId = null;

      // If consignor is selected, get consignor ID
      if (formData.consignor_name && formData.consignor_name.trim()) {
        const { data: consignor } = await supabase
          .from('consignors')
          .select('id, company_name')
          .ilike('company_name', formData.consignor_name.trim())
          .single();

        if (consignor) {
          consignorId = consignor.id;
          console.log('📋 Found consignor for rate:', consignor.company_name, 'ID:', consignorId);
        }
      }

      // Check for existing rate
      let duplicateQuery = supabase
        .from('rates')
        .select('id, rate')
        .eq('branch_id', formData.branch_id)
        .eq('city_id', formData.to_city_id);

      if (consignorId) {
        duplicateQuery = duplicateQuery.eq('consignor_id', consignorId);
      } else {
        duplicateQuery = duplicateQuery.is('consignor_id', null);
      }

      const { data: existingRate } = await duplicateQuery.single();

      if (existingRate) {
        // Update existing rate if different
        if (parseFloat(existingRate.rate) !== parseFloat(rate)) {
          const { error: updateError } = await supabase
            .from('rates')
            .update({ rate: parseFloat(rate) })
            .eq('id', existingRate.id);

          if (updateError) throw updateError;
          
          console.log('✅ Rate updated successfully!');
          setRateInfo({
            type: consignorId ? 'consignor' : 'default',
            message: `✅ Rate updated ${consignorId ? `for ${formData.consignor_name}` : '(default)'}`
          });
        } else {
          console.log('📌 Rate unchanged - no update needed');
        }
      } else {
        // Insert new rate
        const rateData = {
          branch_id: formData.branch_id,
          city_id: formData.to_city_id,
          consignor_id: consignorId || null,
          rate: parseFloat(rate),
          is_default: !consignorId
        };

        const { error: insertError } = await supabase
          .from('rates')
          .insert([rateData]);

        if (insertError) throw insertError;
        
        console.log('✅ New rate saved successfully!');
        setRateInfo({
          type: consignorId ? 'consignor' : 'default',
          message: `✅ New rate saved ${consignorId ? `for ${formData.consignor_name}` : '(default)'}`
        });
      }    } catch (error) {
      console.error('❌ Error auto-saving rate:', error);
      setRateInfo({
        type: 'error',
        message: '❌ Failed to save rate - ' + (error.message || 'Please try again')
      });    } finally {
      setIsSavingRate(false);
    }
  };

  // Auto-populate labour rate from consignor's previous bilty when consignor changes
  useEffect(() => {
    // Only auto-populate in new bilty mode, not in edit mode
    if (!isEditMode && formData.consignor_name && !loadingLabourRate) {
      // If old labour rate exists and current labour_rate is default or not set
      if (oldLabourRate && oldLabourRate.rate) {
        // Only update if current labour_rate is unset, null, or still at default 20
        const currentRate = formData.labour_rate;
        if (currentRate === undefined || currentRate === null || currentRate === 0 || currentRate === 20) {
          setFormData(prev => ({ ...prev, labour_rate: oldLabourRate.rate }));
        }
      }
    }
  }, [formData.consignor_name, oldLabourRate, loadingLabourRate, isEditMode]);

  // Auto-apply historical rate when available (in new bilty mode only)
  useEffect(() => {
    if (!isEditMode && historicalRate && !loadingHistoricalRate) {
      // Always auto-apply the predicted rate (whether default, general, or specific)
      const currentRate = formData.rate;
      const historicalRateValue = parseFloat(historicalRate.rate);
      const currentRateValue = parseFloat(currentRate);
      
      // Apply if: (1) rate is 0/not set, OR (2) rate is different from predicted rate
      if (currentRate === undefined || currentRate === null || currentRate === 0 || 
          Math.abs(currentRateValue - historicalRateValue) > 0.01) {
        console.log('🎯 Auto-applying historical rate:', historicalRate.rate, 'Type:', historicalRate.type);
        setFormData(prev => ({ ...prev, rate: historicalRate.rate }));
      }
    }
  }, [historicalRate, loadingHistoricalRate, isEditMode]);

  // Handler to manually apply historical rate
  const handleApplyHistoricalRate = (rate) => {
    console.log('✅ Manually applying historical rate:', rate);
    setFormData(prev => ({ ...prev, rate: rate }));
  };

  // Initialize labour rate and toll charge if not set (only for new bilty, not editing)
  useEffect(() => {
    const updates = {};
    // Only set default values for new bilty (not edit mode) and only if value is undefined/null
    // This runs first before consignor is selected
    if (!isEditMode && (formData.labour_rate === undefined || formData.labour_rate === null)) {
      updates.labour_rate = 20;
    }
    if (!isEditMode && (formData.toll_charge === undefined || formData.toll_charge === null)) {
      updates.toll_charge = 20;
    }
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [isEditMode]); // Remove formData dependencies to prevent overriding edit data

return (
    <>
      <div className="bg-white/95 p-3 rounded-lg border border-slate-200 shadow-sm relative">
        <div 
          className="grid grid-cols-12 gap-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {/* Package Details - Left Side (7 columns) */}
          <div className="col-span-7">
            <div className="bg-white rounded-lg border border-slate-300 p-2.5 shadow-lg h-full">
              <div className="space-y-1.5">
                {/* Private Marks */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-lg whitespace-nowrap min-w-[90px] text-center">
                    PVT MARKS
                  </span>
                  <input
                    type="text"
                    value={formData.pvt_marks || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, pvt_marks: e.target.value.toUpperCase() }))}
                    ref={(el) => setInputRef(18, el)}
                    className="w-32 px-2 py-1 text-black text-sm font-bold border border-slate-300 rounded text-center bg-white hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 transition-all text-input-focus"
                    placeholder="Private marks"
                    tabIndex={18}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                {/* Packages */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-lg whitespace-nowrap min-w-[90px] text-center">
                    PACKAGES
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.no_of_pkg || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setFormData(prev => ({ ...prev, no_of_pkg: value ? parseInt(value) : 0 }));
                    }}
                    onFocus={(e) => e.target.select()}
                    ref={(el) => setInputRef(19, el)}
                    className="w-32 px-2 py-1 text-black text-sm font-bold border border-slate-300 rounded text-center bg-white hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 transition-all number-input-focus"
                    placeholder="0"
                    tabIndex={19}
                  />
                </div>

                {/* Weight */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-lg whitespace-nowrap min-w-[90px] text-center">
                    WEIGHT
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.wt || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setFormData(prev => ({ ...prev, wt: value ? parseFloat(value) : 0 }));
                    }}
                    onFocus={(e) => e.target.select()}
                    ref={(el) => setInputRef(20, el)}
                    className="w-32 px-2 py-1 text-black text-sm font-bold border border-slate-300 rounded text-center bg-white hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 transition-all number-input-focus"
                    placeholder="0"
                    tabIndex={20}
                  />
                </div>

                {/* Labour Rate */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-1 text-xs font-bold rounded shadow-lg whitespace-nowrap min-w-[90px] text-center">
                    LABOUR RATE
                  </span>
                  <div className="flex items-center gap-1 relative w-32">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.labour_rate !== undefined && formData.labour_rate !== null ? formData.labour_rate : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setFormData(prev => ({ ...prev, labour_rate: value ? parseFloat(value) : 0 }));
                      }}
                      onFocus={(e) => e.target.select()}
                      ref={(el) => setInputRef(21, el)}
                      className="w-24 px-2 py-1 text-black text-sm font-bold border border-slate-300 rounded text-center bg-white hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 transition-all number-input-focus"
                      placeholder="20"
                      tabIndex={21}
                    />
                    <span className="text-xs text-gray-600 font-medium whitespace-nowrap">₹/pkg</span>
                  </div>
                </div>

                {/* Rate */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-lg whitespace-nowrap min-w-[90px] text-center">
                    RATE
                  </span>
                  <div className="relative w-32">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.rate !== undefined && formData.rate !== null ? formData.rate : ''}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Allow only numbers and one decimal point
                        value = value.replace(/[^0-9.]/g, '');
                        // Prevent multiple decimal points
                        const parts = value.split('.');
                        if (parts.length > 2) {
                          value = parts[0] + '.' + parts.slice(1).join('');
                        }
                        
                        // Update formData with string value to allow decimal typing
                        setFormData(prev => ({ ...prev, rate: value }));
                        
                        // Debounce the save operation
                        if (window.rateSaveTimeout) {
                          clearTimeout(window.rateSaveTimeout);
                        }
                        const numericValue = parseFloat(value);
                        if (formData.to_city_id && formData.branch_id && numericValue > 0) {
                          window.rateSaveTimeout = setTimeout(async () => {
                            await saveRateAutomatically(numericValue);
                          }, 1000);
                        }
                      }}
                      onBlur={(e) => {
                        // Convert to number on blur for calculations
                        const value = e.target.value;
                        const numericValue = value ? parseFloat(value) : 0;
                        setFormData(prev => ({ ...prev, rate: numericValue }));
                      }}
                      onFocus={(e) => e.target.select()}
                      ref={(el) => setInputRef(22, el)}
                      className="w-full px-2 py-1 text-black text-sm font-bold border border-slate-300 rounded text-center bg-white hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 transition-all number-input-focus pr-7"
                      placeholder="0"
                      tabIndex={22}
                    />
                    {isSavingRate && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Labour Rate Total */}
                <div className="text-right text-xs text-gray-500 -mt-1">
                  Total: ₹{((formData.no_of_pkg || 0) * (formData.labour_rate || 0)).toFixed(2)}
                </div>
                
                {/* Historical Rate Info - Below all inputs */}
                {formData.consignor_name && formData.to_city_id && (
                  <div className="pt-1">
                    <HistoricalRateInfo
                      consignorName={formData.consignor_name}
                      consigneeName={formData.consignee_name}
                      toCityId={formData.to_city_id}
                      branchId={formData.branch_id}
                      currentRate={formData.rate}
                      onApplyRate={handleApplyHistoricalRate}
                    />
                  </div>
                )}
                
                {/* Old Labour Rate Info - Below all inputs */}
                {!isEditMode && formData.consignor_name && (
                  <div>
                    {loadingLabourRate ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 text-[10px] font-medium animate-pulse">
                        <svg className="w-2 h-2 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>🤖 Fetching...</span>
                      </div>
                    ) : oldLabourRate && oldLabourRate.rate ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded border border-slate-300 text-[10px] font-semibold">
                        <svg className="w-2 h-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>🤖 Auto: ₹{oldLabourRate.rate} ({new Date(oldLabourRate.date).toLocaleDateString('en-IN')})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 rounded border border-gray-300 text-[10px] font-medium">
                        <svg className="w-2 h-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>💼 Default: ₹20</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charges Section - Right Side (5 columns) */}
          <div className="col-span-5">
            <div className="bg-white rounded-lg border border-slate-300 p-2.5 shadow-lg h-full">
              <div className="space-y-1.5">
                {/* Freight */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-lg whitespace-nowrap min-w-[70px] text-center">
                    FREIGHT
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.freight_amount || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setFormData(prev => ({ ...prev, freight_amount: value ? parseFloat(value) : 0 }));
                    }}
                    onFocus={(e) => e.target.select()}
                    ref={(el) => setInputRef(23, el)}
                    className="w-20 px-2 py-1 text-black text-sm font-bold border border-slate-300 rounded text-center bg-white hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 number-input-focus transition-all duration-200"
                    placeholder="0"
                    tabIndex={23}
                  />
                </div>

                {/* Labour Charge with Rate Display */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-1 text-xs font-bold rounded shadow-lg whitespace-nowrap min-w-[70px] text-center">
                    LABOUR
                  </span>
                  <div className="flex flex-col items-end">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.labour_charge || ''}
                      onChange={(e) => {
                        // Allow manual override of labour charge
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        
                        // Clear the auto-calculation timeout to prevent override
                        if (labourChargeTimeoutRef.current) {
                          clearTimeout(labourChargeTimeoutRef.current);
                        }
                        
                        setFormData(prev => ({ ...prev, labour_charge: value ? parseFloat(value) : 0 }));
                      }}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => {
                        // Re-enable auto-calculation after manual input is complete
                        const labourRate = formData.labour_rate || 0;
                        const packages = parseInt(formData.no_of_pkg) || 0;
                        const calculatedLabourCharge = packages * labourRate;
                        
                        // If the user cleared the field, use auto-calculation
                        if (!formData.labour_charge) {
                          setFormData(prev => ({ ...prev, labour_charge: calculatedLabourCharge }));
                        }
                      }}
                      ref={(el) => setInputRef(24, el)}
                      className="w-20 px-2 py-1 text-black font-bold border border-slate-300 rounded text-center bg-white hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 number-input-focus transition-all duration-200"
                      placeholder="0"
                      tabIndex={24}
                      title={`Auto-calculated: ${((formData.no_of_pkg || 0) * (formData.labour_rate || 0)).toFixed(2)}`}
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5">
                      @₹{formData.labour_rate || 0}/pkg
                    </span>
                  </div>
                </div>

                {/* Bill Charge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-lg whitespace-nowrap min-w-[70px] text-center">
                    BILL CHR
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.bill_charge || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setFormData(prev => ({ ...prev, bill_charge: value ? parseFloat(value) : 0 }));
                    }}
                    onFocus={(e) => e.target.select()}
                    ref={(el) => setInputRef(25, el)}
                    className="w-20 px-2 py-1 text-black font-bold border border-slate-300 rounded text-center bg-white hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 number-input-focus transition-all duration-200"
                    placeholder="0"
                    tabIndex={25}
                  />
                </div>

                {/* Toll Charge - Moved before PF Charge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-1 text-xs font-bold rounded shadow-lg whitespace-nowrap min-w-[70px] text-center">
                    TOLL
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.toll_charge !== undefined && formData.toll_charge !== null ? formData.toll_charge : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setFormData(prev => ({ ...prev, toll_charge: value ? parseFloat(value) : 0 }));
                    }}
                    onFocus={(e) => e.target.select()}
                    ref={(el) => setInputRef(26, el)}
                    className="w-20 px-2 py-1 text-black font-bold border border-slate-300 rounded text-center bg-white hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 number-input-focus transition-all duration-200"
                    placeholder="20"
                    tabIndex={26}
                  />
                </div>

                {/* PF Charge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-lg whitespace-nowrap min-w-[70px] text-center">
                    PF CHR
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.pf_charge !== undefined && formData.pf_charge !== null ? formData.pf_charge : ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Allow only numbers and one decimal point
                      value = value.replace(/[^0-9.]/g, '');
                      // Prevent multiple decimal points
                      const parts = value.split('.');
                      if (parts.length > 2) {
                        value = parts[0] + '.' + parts.slice(1).join('');
                      }
                      setFormData(prev => ({ ...prev, pf_charge: value }));
                    }}
                    onBlur={(e) => {
                      // Convert to number on blur
                      const value = e.target.value;
                      const numericValue = value ? parseFloat(value) : 0;
                      setFormData(prev => ({ ...prev, pf_charge: numericValue }));
                    }}
                    onFocus={(e) => e.target.select()}
                    ref={(el) => setInputRef(27, el)}
                    className="w-20 px-2 py-1 text-black font-bold border border-slate-300 rounded text-center bg-white hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 number-input-focus transition-all duration-200"
                    placeholder="0"
                    tabIndex={27}
                  />
                </div>

                {/* Other Charge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-lg whitespace-nowrap min-w-[70px] text-center">
                    OTHER
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.other_charge !== undefined && formData.other_charge !== null ? formData.other_charge : ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Allow only numbers and one decimal point
                      value = value.replace(/[^0-9.]/g, '');
                      // Prevent multiple decimal points
                      const parts = value.split('.');
                      if (parts.length > 2) {
                        value = parts[0] + '.' + parts.slice(1).join('');
                      }
                      setFormData(prev => ({ ...prev, other_charge: value }));
                    }}
                    onBlur={(e) => {
                      // Convert to number on blur
                      const value = e.target.value;
                      const numericValue = value ? parseFloat(value) : 0;
                      setFormData(prev => ({ ...prev, other_charge: numericValue }));
                    }}
                    onFocus={(e) => e.target.select()}
                    ref={(el) => setInputRef(28, el)}
                    className="w-20 px-2 py-1 text-black font-bold border border-slate-300 rounded text-center bg-white hover:border-indigo-300 focus:border-indigo-400 focus:ring-0 number-input-focus transition-all duration-200"
                    placeholder="0"
                    tabIndex={28}
                  />
                </div>

                {/* Total Amount */}
                <div className="border-t-2 border-slate-300 pt-2 mt-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="bg-indigo-600 text-white px-2 py-1.5 text-sm font-bold rounded shadow-lg whitespace-nowrap min-w-[70px] text-center">
                      TOTAL
                    </span>
                    <input
                      type="number"
                      value={formData.total || 0}
                      readOnly
                      ref={(el) => setInputRef(29, el)}
                      className="w-24 px-2 py-1.5 text-black font-bold border-2 border-indigo-400 rounded-lg bg-indigo-50 focus:border-indigo-500 focus:ring-0 text-center text-lg shadow-lg bilty-input-focus transition-all duration-200"
                      tabIndex={29}
                    />
                  </div>

                  {/* SAVE & PRINT Button */}
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleSafeSave(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Tab') {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log(`🎯 ${e.key} key pressed on Save button - triggering save`);
                          handleSafeSave(false);
                        }
                      }}
                      disabled={saving}
                      ref={(el) => setInputRef(30, el)}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-base font-bold hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 flex items-center gap-2 shadow-xl transition-all transform hover:scale-105 border-2 border-emerald-400"
                      tabIndex={30}
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'SAVING...' : isEditMode ? 'UPDATE & PRINT' : 'SAVE & PRINT'} 
                      {showShortcuts && ' (Ctrl+S or Tab)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Draft and Reset Buttons - Bottom Left */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saving}
            tabIndex="-1"
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-xs font-bold hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all border border-amber-400"
          >
            <FileText className="w-3 h-3" />
            DRAFT
          </button>
          <button
            type="button"
            onClick={onReset}
            tabIndex="-1"
            className="px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg text-xs font-bold hover:from-gray-600 hover:to-gray-700 flex items-center gap-1.5 shadow-sm transition-all border border-gray-400"
          >
            <RotateCcw className="w-3 h-3" />
            RESET
          </button>
        </div>
      </div>

      {/* Duplicate GR Number Popup */}
      {showDuplicatePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl border-2 border-red-300">
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-red-800 mb-2">GR Number Already Exists!</h3>
                <p className="text-sm text-gray-600 mb-4">
                  GR Number <span className="font-bold text-red-600">{duplicateGrInfo?.grNo}</span> already exists in the database.
                </p>
                <div className="bg-red-50 p-3 rounded-lg mb-4 text-sm">
                  <p className="text-red-700 mb-2">
                    <strong>You can change the GR number from danger zone</strong>
                  </p>
                  <p className="text-red-700">
                    <strong>Or call: </strong>
                    <a href="tel:7668291228" className="text-indigo-600 underline font-bold">
                      7668291228
                    </a>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDuplicatePopup(false);
                  setDuplicateGrInfo(null);
                }}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PackageChargesSection;
