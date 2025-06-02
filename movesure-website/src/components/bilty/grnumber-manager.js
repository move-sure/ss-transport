'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

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
  const grRef = useRef(null);
  
  // Clear GR search when switching modes
  useEffect(() => {
    if (!isEditMode) {
      setGrSearch('');
    } else {
      // In edit mode, clear the search to allow searching
      setGrSearch('');
    }
  }, [isEditMode]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (grRef.current && !grRef.current.contains(event.target)) {
        setShowGRDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const generateGRNumber = (billBook) => {
    if (!billBook) return '';
    const { prefix, current_number, digits, postfix } = billBook;
    const paddedNumber = String(current_number).padStart(digits, '0');
    return `${prefix || ''}${paddedNumber}${postfix || ''}`;
  };

  const handleGRSelect = (bilty) => {
    onLoadExistingBilty(bilty);
    setGrSearch('');
    setShowGRDropdown(false);
  };

  const handleNewMode = () => {
    resetForm();
  };

  const handleKeyDown = (e) => {
    if (!showGRDropdown || filteredBilties.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredBilties.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredBilties.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleGRSelect(filteredBilties[selectedIndex]);
        } else if (filteredBilties.length > 0) {
          handleGRSelect(filteredBilties[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowGRDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const filteredBilties = existingBilties.filter(b => 
    b.gr_no.toLowerCase().includes(grSearch.toLowerCase())
  );

  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200 shadow-md">
      {/* Left side - Mode buttons and GR input */}
      <div className="flex items-center gap-4">
        {/* Mode Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleNewMode}
            className={`px-6 py-2 text-sm font-bold rounded-lg border-2 transition-all shadow-md ${
              !isEditMode 
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-500 shadow-emerald-200' 
                : 'bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            NEW
          </button>
          <button
            onClick={toggleEditMode}
            className={`px-6 py-2 text-sm font-bold rounded-lg border-2 transition-all shadow-md ${
              isEditMode 
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-500 shadow-amber-200' 
                : 'bg-white text-amber-600 border-amber-300 hover:bg-amber-50'
            }`}
          >
            EDIT
          </button>
        </div>

        {/* GR Number Input */}
        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 text-sm font-bold rounded-lg min-w-20 text-center shadow-md">
            GR_NO
          </span>
          <div className="relative" ref={grRef}>
            {isEditMode ? (
              <input
                type="text"
                value={grSearch}
                onChange={(e) => {
                  setGrSearch(e.target.value);
                  setShowGRDropdown(true);
                  setSelectedIndex(-1);
                }}
                onFocus={() => setShowGRDropdown(true)}
                onKeyDown={handleKeyDown}
                className="w-48 px-4 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                placeholder="Search GR Number..."
                tabIndex={1}
              />
            ) : (
              <input
                type="text"
                value={formData.gr_no}
                className="w-48 px-4 py-2 text-gray-800 font-semibold border-2 border-gray-300 rounded-lg bg-gray-100 shadow-sm"
                readOnly
                tabIndex={-1}
              />
            )}
            
            {showGRDropdown && isEditMode && (
              <div className="absolute z-30 mt-2 w-96 bg-white border-2 border-blue-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold">
                  SELECT EXISTING BILTY TO EDIT
                </div>
                {filteredBilties.length > 0 ? (
                  filteredBilties.map((bilty, index) => (
                    <button
                      key={bilty.id}
                      onClick={() => handleGRSelect(bilty)}
                      className={`w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-blue-100 transition-colors ${
                        index === selectedIndex ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-bold text-blue-600">{bilty.gr_no}</div>
                          <div className="text-xs text-gray-600 truncate max-w-48">
                            {bilty.consignor_name} → {bilty.consignee_name}
                          </div>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full font-bold ${
                          bilty.saving_option === 'DRAFT' 
                            ? 'bg-yellow-200 text-amber-800' 
                            : 'bg-green-200 text-green-800'
                        }`}>
                          {bilty.saving_option}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-600">
                    No matching GR numbers found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date Fields */}
        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 text-sm font-bold rounded-lg text-center shadow-md">
            DATE
          </span>
          <input
            type="date"
            value={formData.bilty_date}
            onChange={(e) => setFormData(prev => ({ ...prev, bilty_date: e.target.value }))}
            className="px-4 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
            tabIndex={2}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 text-sm font-bold rounded-lg text-center shadow-md">
            INV DATE
          </span>
          <input
            type="date"
            value={formData.invoice_date}
            onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
            className="px-4 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
            tabIndex={3}
          />
        </div>
      </div>

      {/* Draft indicator */}
      {isEditMode && formData.saving_option === 'DRAFT' && (
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-2 rounded-lg font-bold text-sm border-2 border-yellow-400 shadow-md">
          EDITING DRAFT BILTY
        </div>
      )}
    </div>
  );
};

export default GRNumberSection;