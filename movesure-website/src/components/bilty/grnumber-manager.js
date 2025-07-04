'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Edit3, Search, Plus } from 'lucide-react';
import { useInputNavigation } from './input-navigation';

const GRNumberSection = ({ 
  formData, 
  setFormData, 
  billBooks, 
  selectedBillBook, 
  setSelectedBillBook,
  onLoadExistingBilty,
  isEditMode,
  setIsEditMode,
  toggleEditMode,
  resetForm,
  existingBilties,
  showShortcuts
}) => {
  const [showGRDropdown, setShowGRDropdown] = useState(false);
  const [grSearch, setGrSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentEditingGR, setCurrentEditingGR] = useState('');
  const [displayLimit, setDisplayLimit] = useState(50); // Start with 50 bilties
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const grRef = useRef(null);
  const grInputRef = useRef(null);
  const biltyDateRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Input navigation
  const { register, unregister, handleEnter } = useInputNavigation();
  // Update currentEditingGR when switching between modes
  useEffect(() => {
    if (isEditMode && formData.gr_no && formData.consignor_name) {
      // Only set currentEditingGR if we have a fully loaded bilty
      setCurrentEditingGR(formData.gr_no);
      setGrSearch('');
    } else if (isEditMode && !formData.consignor_name && !formData.consignee_name && formData.gr_no === '') {
      // Only clear currentEditingGR if form is truly empty (not just consignor cleared during editing)
      setCurrentEditingGR('');
      setGrSearch('');
    } else if (!isEditMode) {
      // New mode
      setCurrentEditingGR('');
      setGrSearch('');
    }
  }, [isEditMode, formData.gr_no, formData.consignor_name, formData.consignee_name]);

  // Listen for focus GR search event from edit button
  useEffect(() => {
    const handleFocusGRSearch = () => {
      if (isEditMode && !currentEditingGR && grInputRef.current) {
        setTimeout(() => {
          grInputRef.current.focus();
          console.log('🎯 GR search input focused via custom event');
        }, 50);
      }
    };

    window.addEventListener('focusGRSearch', handleFocusGRSearch);
    
    return () => {
      window.removeEventListener('focusGRSearch', handleFocusGRSearch);
    };
  }, [isEditMode, currentEditingGR]);
    useEffect(() => {
    const handleClickOutside = (event) => {
      if (grRef.current && !grRef.current.contains(event.target)) {
        setShowGRDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);  // Register inputs for navigation - REMOVED: GR number and bilty date not part of navigation flow
  useEffect(() => {
    // No inputs to register for navigation - GR number and date excluded from Enter navigation
    return () => {
      // Cleanup if needed
    };
  }, [register, unregister, isEditMode, currentEditingGR]);

  const generateGRNumber = (billBook) => {
    if (!billBook) return '';
    const { prefix, current_number, digits, postfix } = billBook;
    const paddedNumber = String(current_number).padStart(digits, '0');
    return `${prefix || ''}${paddedNumber}${postfix || ''}`;
  };

  const handleGRSelect = (bilty) => {
    setCurrentEditingGR(bilty.gr_no);
    onLoadExistingBilty(bilty);
    setGrSearch('');
    setShowGRDropdown(false);
    setSelectedIndex(-1);
  };

  const handleNewMode = () => {
    setCurrentEditingGR('');
    resetForm();
  };
  // Add function to clear current editing and allow new search
  const handleClearEditingGR = () => {
    setCurrentEditingGR('');
    setGrSearch('');
    // Reset form but stay in edit mode
    const newGrNo = selectedBillBook ? generateGRNumber(selectedBillBook) : '';
    setFormData(prev => ({
      ...prev,
      gr_no: newGrNo,
      to_city_id: '',
      consignor_name: '',
      consignor_gst: '',
      consignor_number: '',
      consignee_name: '',
      consignee_gst: '',
      consignee_number: '',
      transport_name: '',
      transport_gst: '',
      transport_number: '',
      payment_mode: 'to-pay',
      contain: '',
      invoice_no: '',
      invoice_value: 0,
      e_way_bill: '',
      document_number: '',
      no_of_pkg: 0,
      wt: 0,
      rate: 0,
      pvt_marks: '',
      freight_amount: 0,
      labour_charge: 0,
      bill_charge: 50,
      toll_charge: 0,
      dd_charge: 0,
      other_charge: 0,
      pf_charge: 0,
      total: 50,
      remark: ''
    }));
    
    // Focus on GR search input after clearing
    setTimeout(() => {
      if (grInputRef.current) {
        grInputRef.current.focus();
        console.log('🎯 GR search input focused after clearing current GR');
      }
    }, 100);
  };const handleKeyDown = (e) => {
    // Handle dropdown navigation
    if (showGRDropdown && displayedBilties.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < displayedBilties.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : displayedBilties.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handleGRSelect(displayedBilties[selectedIndex]);
          } else if (displayedBilties.length > 0) {
            handleGRSelect(displayedBilties[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowGRDropdown(false);
          setSelectedIndex(-1);
          break;      }
    } else {
      // Handle Enter key - no navigation for GR number field
      if (e.key === 'Enter') {
        // Do nothing - GR number field is excluded from Enter navigation
      }
    }
  };
  const filteredBilties = existingBilties.filter(b => 
    b.gr_no.toLowerCase().includes(grSearch.toLowerCase())
  );

  // Implement pagination for display
  const displayedBilties = filteredBilties.slice(0, displayLimit);
  const hasMore = filteredBilties.length > displayLimit;

  // Load more bilties when scrolling to bottom
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 5 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setDisplayLimit(prev => prev + 50);
        setIsLoadingMore(false);
      }, 200); // Small delay for better UX
    }
  };

  // Reset display limit when search changes
  useEffect(() => {
    setDisplayLimit(50);
  }, [grSearch]);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl border-2 border-purple-200 shadow-lg">
      {/* Responsive layout for edit mode */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Main form controls */}
        <div className="flex flex-col xl:flex-row xl:items-center gap-4 flex-1">
          {/* Mode Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleNewMode}
              className={`px-6 py-2.5 text-xs font-bold rounded-lg border-2 transition-all shadow-md transform hover:scale-105 ${
                !isEditMode 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-500 shadow-green-200' 
                  : 'bg-white text-green-600 border-green-300 hover:bg-green-50'
              }`}
            >
              <Plus className="w-3 h-3 inline mr-1" />
              NEW
            </button>
            <button
              onClick={toggleEditMode}
              className={`px-6 py-2.5 text-xs font-bold rounded-lg border-2 transition-all shadow-md transform hover:scale-105 ${
                isEditMode 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white border-purple-500 shadow-purple-200' 
                  : 'bg-white text-purple-600 border-purple-300 hover:bg-purple-50'
              }`}
            >
              <Edit3 className="w-3 h-3 inline mr-1" />
              EDIT
            </button>
          </div>

          {/* GR Number Input Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className={`px-4 py-2.5 text-xs font-bold rounded-lg min-w-24 text-center shadow-md whitespace-nowrap ${
              isEditMode && currentEditingGR 
                ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white border-purple-500' 
                : 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
            }`}>
              {isEditMode && currentEditingGR ? 'EDITING' : isEditMode ? 'SEARCH' : 'GR NO'}
            </span>
            <div className="relative flex-1 min-w-0" ref={grRef}>
              {isEditMode ? (
                <>
                  {/* Show current editing GR when a bilty is loaded for editing */}
                  {currentEditingGR ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        type="text"
                        value={currentEditingGR}
                        className="w-full sm:w-48 px-3 py-2.5 text-purple-800 text-sm font-bold border-2 border-purple-400 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 shadow-md cursor-not-allowed"
                        readOnly
                        tabIndex={-1}
                      />
                      <button
                        onClick={handleClearEditingGR}
                        className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-md whitespace-nowrap"
                        title="Search different GR"
                      >
                        <Search className="w-3 h-3 inline mr-1" />
                        CHANGE
                      </button>
                    </div>
                  ) : (                    /* Search input when in edit mode but no bilty selected */                    <input
                      type="text"
                      ref={grInputRef}
                      value={grSearch}
                      onChange={(e) => {
                        setGrSearch(e.target.value);
                        setShowGRDropdown(true);
                        setSelectedIndex(-1);
                      }}
                      onFocus={() => {
                        setShowGRDropdown(true);
                        setDisplayLimit(50); // Reset display limit when opening dropdown
                      }}                      onKeyDown={handleKeyDown}
                      className="w-full sm:w-48 px-3 py-2.5 text-black text-sm font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400"
                      placeholder="🔍 Search GR..."
                      tabIndex={-1}
                    />
                  )}
                </>
              ) : (                <input
                  type="text"
                  value={formData.gr_no}
                  className="w-full sm:w-48 px-3 py-2.5 text-black text-sm font-bold border-2 border-gray-300 rounded-lg bg-gray-100 shadow-md transition-all duration-200"
                  readOnly
                  tabIndex={-1}
                />
              )}
                {showGRDropdown && isEditMode && !currentEditingGR && (
                <div className="absolute z-30 mt-2 w-full sm:w-96 bg-white border-2 border-purple-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
                     ref={dropdownRef}
                     onScroll={handleScroll}>
                  <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs font-bold rounded-t-lg sticky top-0 z-10">
                    <Search className="w-3 h-3 inline mr-1" />
                    SELECT BILTY TO EDIT ({filteredBilties.length} total, showing {displayedBilties.length})
                  </div>
                  {displayedBilties.length > 0 ? (
                    <>
                      {displayedBilties.map((bilty, index) => (
                        <button
                          key={bilty.id}
                          onClick={() => handleGRSelect(bilty)}
                          className={`w-full px-3 py-3 text-left hover:bg-purple-50 border-b border-purple-100 transition-colors text-xs ${
                            index === selectedIndex ? 'bg-purple-100' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-purple-700 truncate">{bilty.gr_no}</div>
                              <div className="text-xs text-black font-medium truncate">
                                {bilty.consignor_name} → {bilty.consignee_name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(bilty.bilty_date).toLocaleDateString()} | ₹{bilty.total}
                              </div>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap ${
                              bilty.saving_option === 'DRAFT' 
                                ? 'bg-yellow-200 text-amber-800 border border-yellow-300' 
                                : 'bg-green-200 text-green-800 border border-green-300'
                            }`}>
                              {bilty.saving_option}
                            </div>
                          </div>
                        </button>
                      ))}
                      {hasMore && (
                        <div className="px-3 py-3 text-xs text-gray-600 text-center border-b border-purple-100">
                          {isLoadingMore ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                              Loading more bilties...
                            </div>
                          ) : (
                            <div className="text-purple-600 font-medium">
                              Scroll down to load more bilties...
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : grSearch ? (
                    <div className="px-3 py-3 text-xs text-gray-600 text-center">
                      No bilties found matching &quot;{grSearch}&quot;
                    </div>
                  ) : (
                    <div className="px-3 py-3 text-xs text-gray-600 text-center">
                      Start typing to search bilties...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Date Fields */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-3 py-2.5 text-xs font-bold rounded-lg text-center shadow-md whitespace-nowrap">
                BILTY DATE
              </span>              <input
                type="date"
                ref={biltyDateRef}                value={formData.bilty_date}                onChange={(e) => setFormData(prev => ({ ...prev, bilty_date: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} // Prevent Enter navigation
                className="px-3 py-2.5 text-black text-sm font-semibold border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-600 bg-white shadow-md"
              />            </div>
          </div>
        </div>

        {/* Status indicators - Now properly contained */}
        {isEditMode && currentEditingGR && (
          <div className="flex flex-col sm:flex-row gap-2 lg:justify-end">
            {formData.saving_option === 'DRAFT' && (
              <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-3 py-2 rounded-lg font-bold text-xs border-2 border-yellow-400 shadow-md flex items-center gap-1 whitespace-nowrap">
                <Edit3 className="w-3 h-3" />
                DRAFT MODE
              </div>
            )}
            <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-3 py-2 rounded-lg font-bold text-xs border-2 border-purple-400 shadow-md flex items-center gap-1 whitespace-nowrap">
              <Edit3 className="w-3 h-3" />
              EDITING: {currentEditingGR}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GRNumberSection;