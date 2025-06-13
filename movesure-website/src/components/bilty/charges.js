'use client';

import React, { useEffect, useRef } from 'react';
import { useInputNavigation } from './input-navigation';
import { Save } from 'lucide-react';

const PackageChargesSection = ({ 
  formData, 
  setFormData, 
  rates, 
  onSave, 
  saving = false, 
  isEditMode = false, 
  showShortcuts = false 
}) => {
  const { register, unregister, handleEnter } = useInputNavigation();
  const inputRefs = useRef({});
  const labourChargeTimeoutRef = useRef(null);// Handle Enter key navigation
  const handleEnterNavigation = (e, tabIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      handleEnter(e, tabIndex);
      return false;
    }
  };

  // Register input ref and with navigation manager
  const setInputRef = (tabIndex, element) => {
    inputRefs.current[tabIndex] = element;
    if (element) {
      register(tabIndex, element);
    } else {
      unregister(tabIndex);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.keys(inputRefs.current).forEach(tabIndex => {
        unregister(parseInt(tabIndex));
      });
    };
  }, [unregister]);  useEffect(() => {
    // Calculate labour charge when packages or labour rate changes
    const labourRate = parseFloat(formData.labour_rate) || 20;
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
      formData.toll_charge, formData.other_charge, formData.pf_charge, setFormData]);  // Initialize labour rate and toll charge if not set
  useEffect(() => {
    const updates = {};
    if (formData.labour_rate === undefined || formData.labour_rate === null || formData.labour_rate === 0) {
      updates.labour_rate = 20;
    }
    if (formData.toll_charge === undefined || formData.toll_charge === null) {
      updates.toll_charge = 20;
    }
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [formData.labour_rate, formData.toll_charge, setFormData]);return (
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
                </span>                <input
                  type="text"
                  value={formData.pvt_marks || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, pvt_marks: e.target.value }))}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleEnterNavigation(e, 20);
                  }}
                  ref={(el) => setInputRef(20, el)}
                  className="flex-1 px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 transition-all text-input-focus"
                  placeholder="Private marks"
                  tabIndex={20}
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
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleEnterNavigation(e, 21);
                  }}
                  ref={(el) => setInputRef(21, el)}
                  className="flex-1 px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 transition-all number-input-focus"
                  placeholder="0"
                  tabIndex={21}
                />
              </div>              {/* No of Packages - Third */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
                  PACKAGES
                </span>                <input
                  type="number"
                  value={formData.no_of_pkg || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, no_of_pkg: parseInt(e.target.value) || 0 }))}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleEnterNavigation(e, 22);
                  }}
                  ref={(el) => setInputRef(22, el)}
                  className="flex-1 px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 transition-all number-input-focus"
                  placeholder="0"
                  tabIndex={22}
                />
              </div>              {/* Rate per kg - Fourth */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
                  RATE
                </span>                <input
                  type="number"
                  step="0.01"
                  value={formData.rate || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleEnterNavigation(e, 23);
                  }}
                  ref={(el) => setInputRef(23, el)}
                  className="flex-1 px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 transition-all number-input-focus"
                  placeholder="0"
                  tabIndex={23}
                />
              </div>

              {/* Labour Rate - Fifth */}
              <div className="flex items-center gap-3 col-span-2">
                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[120px]">
                  LABOUR RATE
                </span>                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={parseFloat(formData.labour_rate) || 20}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setFormData(prev => ({ ...prev, labour_rate: value }));
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleEnterNavigation(e, 24);
                  }}
                  ref={(el) => setInputRef(24, el)}
                  className="w-32 px-3 py-2 text-black font-semibold border-2 border-orange-300 rounded-lg bg-white shadow-sm hover:border-orange-400 transition-all number-input-focus"
                  placeholder="20"
                  tabIndex={24}
                />
                <span className="text-sm text-gray-600 font-medium">₹ per package</span>                <span className="text-xs text-gray-500 ml-auto">
                  Total Labour: ₹{((formData.no_of_pkg || 0) * (parseFloat(formData.labour_rate) || 20)).toFixed(2)}
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
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleEnterNavigation(e, 25);
                  }}
                  ref={(el) => setInputRef(25, el)}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded text-center bg-white hover:border-purple-400 number-input-focus transition-all duration-200"
                  tabIndex={25}
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
                    }}
                    onBlur={() => {
                      // Re-enable auto-calculation after manual input is complete
                      const labourRate = parseFloat(formData.labour_rate) || 20;
                      const packages = parseInt(formData.no_of_pkg) || 0;
                      const calculatedLabourCharge = packages * labourRate;
                      
                      // If the user cleared the field or set it to 0, use auto-calculation
                      if (!formData.labour_charge || formData.labour_charge === 0) {
                        setFormData(prev => ({ ...prev, labour_charge: calculatedLabourCharge }));
                      }
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      handleEnterNavigation(e, 26);
                    }}
                    ref={(el) => setInputRef(26, el)}
                    className="w-24 px-2 py-2 text-black font-bold border-2 border-orange-300 rounded text-center bg-white hover:border-orange-400 number-input-focus transition-all duration-200"
                    tabIndex={26}
                    title={`Auto-calculated: ${((formData.no_of_pkg || 0) * (parseFloat(formData.labour_rate) || 20)).toFixed(2)}`}
                  /><span className="text-xs text-gray-500 mt-1">
                    @₹{parseFloat(formData.labour_rate) || 20}/pkg
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
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleEnterNavigation(e, 27);
                  }}
                  ref={(el) => setInputRef(27, el)}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded text-center bg-white hover:border-purple-400 number-input-focus transition-all duration-200"
                  tabIndex={27}
                />
              </div>              {/* Toll Charge - Moved before PF Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  TOLL
                </span>                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={parseFloat(formData.toll_charge) || 20}
                  onChange={(e) => setFormData(prev => ({ ...prev, toll_charge: parseFloat(e.target.value) || 0 }))}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleEnterNavigation(e, 28);
                  }}
                  ref={(el) => setInputRef(28, el)}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-green-300 rounded text-center bg-white hover:border-green-400 number-input-focus transition-all duration-200"
                  placeholder="20"
                  tabIndex={28}
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
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleEnterNavigation(e, 29);
                  }}
                  ref={(el) => setInputRef(29, el)}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded text-center bg-white hover:border-purple-400 number-input-focus transition-all duration-200"
                  tabIndex={29}
                />
              </div>              {/* Other Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  OTHER
                </span>                <input
                  type="number"
                  value={formData.other_charge || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, other_charge: parseFloat(e.target.value) || 0 }))}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleEnterNavigation(e, 30);
                  }}
                  ref={(el) => setInputRef(30, el)}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded text-center bg-white hover:border-purple-400 number-input-focus transition-all duration-200"
                  tabIndex={30}
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
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        // Focus on the Save & Print button
                        const saveButton = document.getElementById('save-print-button-charges');
                        if (saveButton) {
                          setTimeout(() => {
                            saveButton.focus();
                            saveButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 50);
                        }
                        return false;
                      }
                    }}
                    ref={(el) => {
                      // Don't register with navigation manager since we handle navigation manually
                      inputRefs.current[31] = el;
                    }}
                    className="w-24 px-2 py-3 text-black font-bold border-4 border-purple-400 rounded bg-purple-50 text-center text-lg shadow-lg bilty-input-focus transition-all duration-200"
                    tabIndex={31}
                  />
                </div>
                
                {/* SAVE & PRINT Button */}
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => onSave && onSave(false)}
                    disabled={saving}
                    id="save-print-button-charges"
                    className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-lg font-bold hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 flex items-center gap-3 shadow-xl transition-all transform hover:scale-105 border-2 border-emerald-400"
                    tabIndex={32}
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'SAVING...' : isEditMode ? 'UPDATE & PRINT' : 'SAVE & PRINT'} 
                    {showShortcuts && ' (Ctrl+S)'}
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