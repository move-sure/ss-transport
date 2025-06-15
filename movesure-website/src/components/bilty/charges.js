'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useInputNavigation } from './input-navigation';
import { Save } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const PackageChargesSection = ({ 
  formData, 
  setFormData, 
  rates, 
  onSave, 
  saving = false, 
  isEditMode = false, 
  showShortcuts = false
}) => {  const { register, unregister, handleEnter } = useInputNavigation();
  const inputRefs = useRef({});
  const labourChargeTimeoutRef = useRef(null);
  const [rateInfo, setRateInfo] = useState(null);
  const [isSavingRate, setIsSavingRate] = useState(false);  const rateRef = useRef(null);  // Register input ref and with navigation manager
  const setInputRef = (tabIndex, element) => {
    inputRefs.current[tabIndex] = element;
    if (element) {
      console.log(`📋 Charges: Registering input tabIndex ${tabIndex}`);
        // Special handling for Save & Print button (tabIndex 30)
      if (tabIndex === 30) {
        register(tabIndex, element, {
          beforeFocus: () => {
            console.log(`🎯 Focusing on Save & Print button: ${tabIndex}`);
          }
        });
        
        // Add custom keydown handler for Save button
        const handleSaveKeyDown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Save button activated via keyboard');
            if (onSave && !saving) {
              onSave(false);
            }
          }
        };
        
        element.addEventListener('keydown', handleSaveKeyDown);
        
        // Store cleanup for the save button
        element._saveKeydownCleanup = () => {
          element.removeEventListener('keydown', handleSaveKeyDown);
        };
      } else {
        register(tabIndex, element, {
          beforeFocus: () => {
            console.log(`🎯 Focusing on charges field: ${tabIndex}`);
          }
        });
      }    } else {
      console.log(`📋 Charges: Unregistering input tabIndex ${tabIndex}`);
      const existingElement = inputRefs.current[tabIndex];
      if (existingElement && existingElement._saveKeydownCleanup) {
        existingElement._saveKeydownCleanup();
      }
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

  useEffect(() => {
    // Calculate freight amount
    const freightAmount = (formData.wt || 0) * (formData.rate || 0);
    setFormData(prev => ({ ...prev, freight_amount: freightAmount }));
  }, [formData.wt, formData.rate, setFormData]);
  useEffect(() => {
    // Calculate total
    const total = (formData.freight_amount || 0) + 
                  (formData.labour_charge || 0) + 
                  (formData.bill_charge || 0) + 
                  (formData.toll_charge || 0) + 
                  (formData.other_charge || 0) + 
                  (formData.pf_charge || 0);
    setFormData(prev => ({ ...prev, total }));
  }, [formData.freight_amount, formData.labour_charge, formData.bill_charge, 
      formData.toll_charge, formData.other_charge, formData.pf_charge, setFormData]);  // Check and display rate info when rate, consignor, or city changes
  useEffect(() => {
    const checkRateInfo = async () => {
      if (!formData.rate || !formData.to_city_id || !formData.branch_id) {
        setRateInfo(null);
        return;
      }

      try {
        // Check if there's a consignor-specific rate
        if (formData.consignor_name) {
          // Find consignor ID
          const { data: consignor } = await supabase
            .from('consignors')
            .select('id, company_name')
            .ilike('company_name', formData.consignor_name.trim())
            .single();

          if (consignor) {
            // Check for consignor-specific rate
            const { data: consignorRate } = await supabase
              .from('rates')
              .select('rate')
              .eq('branch_id', formData.branch_id)
              .eq('city_id', formData.to_city_id)
              .eq('consignor_id', consignor.id)
              .single();

            if (consignorRate && parseFloat(consignorRate.rate) === parseFloat(formData.rate)) {
              setRateInfo({
                type: 'consignor',
                message: `✅ Consignor-specific rate for ${formData.consignor_name}`
              });
              return;
            }
          }
        }

        // Check for default rate
        const { data: defaultRate } = await supabase
          .from('rates')
          .select('rate')
          .eq('branch_id', formData.branch_id)
          .eq('city_id', formData.to_city_id)
          .is('consignor_id', null)
          .single();

        if (defaultRate && parseFloat(defaultRate.rate) === parseFloat(formData.rate)) {
          setRateInfo({
            type: 'default',
            message: '✅ Default rate for this city'
          });
        } else {
          setRateInfo({
            type: 'custom',
            message: '⚠️ Custom rate - will be saved if different from existing'
          });
        }

      } catch (error) {
        console.error('Error checking rate info:', error);
        setRateInfo({
          type: 'custom',
          message: '⚠️ Custom rate - will be saved automatically'
        });
      }
    };

    checkRateInfo();
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
  };  // Initialize labour rate and toll charge if not set (only for new bilty, not editing)
  useEffect(() => {
    const updates = {};
    // Only set default values for new bilty (not edit mode) and only if value is undefined/null
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
    <div className="bg-white p-6 rounded-xl border-2 border-purple-200 shadow-lg">
      <div 
        className="grid grid-cols-12 gap-6"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {/* Package Details - Left Side (8 columns) */}
        <div className="col-span-8">
          <div className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-md">
            <h4 className="text-sm font-bold text-black mb-3 text-center bg-gradient-to-r from-purple-100 to-blue-100 py-2 rounded">
              PACKAGE DETAILS
            </h4>            <div className="grid grid-cols-2 gap-4">
              {/* Private Marks - First */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
                  PVT MARKS
                </span>                <input                  type="text"
                  value={formData.pvt_marks || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, pvt_marks: e.target.value }))}
                  ref={(el) => setInputRef(18, el)}
                  className="flex-1 px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 transition-all text-input-focus"
                  placeholder="Private marks"
                  tabIndex={18}
                />
              </div>              {/* Weight - Second */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
                  WEIGHT
                </span>                <input
                  type="number"
                  step="0.001"
                  value={formData.wt || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, wt: parseFloat(e.target.value) || 0 }))}
                  ref={(el) => setInputRef(19, el)}
                  className="flex-1 px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 transition-all number-input-focus"
                  placeholder="0"
                  tabIndex={19}
                />
              </div>              {/* No of Packages - Third */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
                  PACKAGES
                </span>                <input
                  type="number"
                  value={formData.no_of_pkg || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, no_of_pkg: parseInt(e.target.value) || 0 }))}
                  ref={(el) => setInputRef(20, el)}
                  className="flex-1 px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 transition-all number-input-focus"
                  placeholder="0"
                  tabIndex={20}
                />
              </div>              {/* Rate per kg - Fourth */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
                  RATE
                </span>
                <div className="flex-1">
                  <div className="space-y-2">
                    <div className="relative">                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.rate || ''}
                        onChange={handleRateChange}
                        ref={(el) => setInputRef(21, el)}
                        className="w-full px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 transition-all number-input-focus pr-8"
                        placeholder="₹ Rate per kg"
                        tabIndex={21}
                      />
                      {isSavingRate && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    {rateInfo && (
                      <div className={`text-xs px-3 py-2 rounded-lg ${
                        rateInfo.type === 'consignor' 
                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : rateInfo.type === 'default'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : rateInfo.type === 'error'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}>
                        {rateInfo.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>              {/* Labour Rate - Fifth */}
              <div className="flex items-center gap-3 col-span-2">
                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[120px]">
                  LABOUR RATE
                </span>                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.labour_rate !== undefined && formData.labour_rate !== null ? formData.labour_rate : ''}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // Handle empty string, 0, and valid numbers properly
                    let value;
                    if (inputValue === '') {
                      value = 0; // Empty input should be 0
                    } else {
                      value = parseFloat(inputValue);
                      // If parseFloat returns NaN, default to 0
                      if (isNaN(value)) {
                        value = 0;
                      }
                    }
                    setFormData(prev => ({ ...prev, labour_rate: value }));
                  }}
                  ref={(el) => setInputRef(22, el)}
                  className="w-32 px-3 py-2 text-black font-semibold border-2 border-orange-300 rounded-lg bg-white shadow-sm hover:border-orange-400 transition-all number-input-focus"
                  placeholder="20"
                  tabIndex={22}
                />
                <span className="text-sm text-gray-600 font-medium">₹ per package</span>                <span className="text-xs text-gray-500 ml-auto">
                  Total Labour: ₹{((formData.no_of_pkg || 0) * (formData.labour_rate || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charges Section - Right Side (4 columns) */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg border-2 border-purple-300 p-4 shadow-lg h-full">
            <h4 className="text-sm font-bold text-black mb-4 text-center bg-gradient-to-r from-purple-100 to-blue-100 py-2 rounded">
              CHARGES BREAKDOWN
            </h4>
            <div className="space-y-3">
              {/* Freight Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  FREIGHT
                </span>                <input
                  type="number"
                  value={formData.freight_amount || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, freight_amount: parseFloat(e.target.value) || 0 }))}
                  ref={(el) => setInputRef(23, el)}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded text-center bg-white hover:border-purple-400 number-input-focus transition-all duration-200"
                  tabIndex={23}
                />
              </div>

              {/* Labour Charge with Rate Display */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  LABOUR
                </span>
                <div className="flex flex-col items-end">                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.labour_charge || 0}
                    onChange={(e) => {
                      // Allow manual override of labour charge
                      const value = parseFloat(e.target.value) || 0;
                      
                      // Clear the auto-calculation timeout to prevent override
                      if (labourChargeTimeoutRef.current) {
                        clearTimeout(labourChargeTimeoutRef.current);
                      }
                      
                      setFormData(prev => ({ ...prev, labour_charge: value }));
                    }}                    onBlur={() => {
                      // Re-enable auto-calculation after manual input is complete
                      const labourRate = formData.labour_rate || 0;
                      const packages = parseInt(formData.no_of_pkg) || 0;
                      const calculatedLabourCharge = packages * labourRate;
                      
                      // If the user cleared the field, use auto-calculation
                      if (formData.labour_charge === undefined || formData.labour_charge === null || formData.labour_charge === '') {
                        setFormData(prev => ({ ...prev, labour_charge: calculatedLabourCharge }));
                      }
                    }}
                    ref={(el) => setInputRef(24, el)}
                    className="w-24 px-2 py-2 text-black font-bold border-2 border-orange-300 rounded text-center bg-white hover:border-orange-400 number-input-focus transition-all duration-200"
                    tabIndex={24}
                    title={`Auto-calculated: ${((formData.no_of_pkg || 0) * (formData.labour_rate || 0)).toFixed(2)}`}
                  /><span className="text-xs text-gray-500 mt-1">
                    @₹{formData.labour_rate || 0}/pkg
                  </span>
                </div>
              </div>              {/* Bill Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  BILL CHR
                </span>                <input
                  type="number"
                  value={formData.bill_charge || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, bill_charge: parseFloat(e.target.value) || 0 }))}
                  ref={(el) => setInputRef(25, el)}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded text-center bg-white hover:border-purple-400 number-input-focus transition-all duration-200"
                  tabIndex={25}
                />
              </div>              {/* Toll Charge - Moved before PF Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  TOLL
                </span>                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.toll_charge !== undefined && formData.toll_charge !== null ? formData.toll_charge : ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setFormData(prev => ({ ...prev, toll_charge: value }));
                  }}
                  ref={(el) => setInputRef(26, el)}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-green-300 rounded text-center bg-white hover:border-green-400 number-input-focus transition-all duration-200"
                  placeholder="20"
                  tabIndex={26}
                />
              </div>

              {/* PF Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  PF CHR
                </span>                <input
                  type="number"
                  value={formData.pf_charge || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, pf_charge: parseFloat(e.target.value) || 0 }))}
                  ref={(el) => setInputRef(27, el)}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded text-center bg-white hover:border-purple-400 number-input-focus transition-all duration-200"
                  tabIndex={27}
                />
              </div>              {/* Other Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  OTHER
                </span>                <input
                  type="number"
                  value={formData.other_charge || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, other_charge: parseFloat(e.target.value) || 0 }))}
                  ref={(el) => setInputRef(28, el)}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded text-center bg-white hover:border-purple-400 number-input-focus transition-all duration-200"
                  tabIndex={28}
                />
              </div>              {/* Total Amount */}
              <div className="border-t-2 border-purple-300 pt-3 mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-gradient-to-r from-purple-800 to-purple-600 text-white px-3 py-3 text-sm font-bold rounded shadow-lg whitespace-nowrap">
                    TOTAL
                  </span>
                    <input
                    type="number"
                    value={formData.total || 0}
                    readOnly
                    ref={(el) => setInputRef(29, el)}
                    className="w-24 px-2 py-3 text-black font-bold border-4 border-purple-400 rounded bg-purple-50 text-center text-lg shadow-lg bilty-input-focus transition-all duration-200"
                    tabIndex={29}
                  />
                </div>                  {/* SAVE & PRINT Button */}
                <div className="mt-4 flex justify-center">                  <button
                    type="button"
                    onClick={() => onSave && onSave(false)}
                    disabled={saving}
                    ref={(el) => setInputRef(30, el)}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-lg font-bold hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 flex items-center gap-3 shadow-xl transition-all transform hover:scale-105 border-2 border-emerald-400"
                    tabIndex={30}
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'SAVING...' : isEditMode ? 'UPDATE & PRINT' : 'SAVE & PRINT'} 
                    {showShortcuts && ' (Ctrl+S or Tab)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageChargesSection;