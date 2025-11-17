'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  FileText, Package, Weight, DollarSign, X, Save, Building2,
  CheckCircle, XCircle, Plus, AlertTriangle
} from 'lucide-react';

// Combined Payment and Delivery options
const COMBINED_OPTIONS = [
  { value: 'to-pay', label: 'TO PAY', payment_status: 'to-pay', delivery_type: 'godown' },
  { value: 'paid', label: 'PAID', payment_status: 'paid', delivery_type: 'godown' },
  { value: 'to-pay_door', label: 'TO PAY / DD', payment_status: 'to-pay', delivery_type: 'door' },
  { value: 'paid_door', label: 'PAID / DD', payment_status: 'paid', delivery_type: 'door' },
  { value: 'foc', label: 'FOC', payment_status: 'foc', delivery_type: 'godown' }
];

// Helper function to get combined value from payment status and delivery type
const getCombinedValue = (paymentStatus, deliveryType) => {
  const option = COMBINED_OPTIONS.find(opt => 
    opt.payment_status === paymentStatus && opt.delivery_type === deliveryType
  );
  return option ? option.value : 'to-pay'; // default to to-pay
};

// Searchable Dropdown Component for Station (Only Valid Cities)
const StationDropdown = ({ options, value, onChange, placeholder, onTabPress, isValid, errorMessage }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState(value || '');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);
  
  const filteredOptions = options.filter(option => {
    const cityCode = option.city_code || '';
    const cityName = option.city_name || '';
    
    return cityCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
           cityName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelect = (option) => {
    const selectedValue = option.city_code;
    setInputValue(selectedValue);
    setSearchTerm('');
    onChange(selectedValue);
    setSelectedIndex(-1);
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value.toUpperCase();
    setInputValue(newValue);
    setSearchTerm(newValue);
    onChange(newValue);
    setSelectedIndex(-1);
    setShowDropdown(true);
    
    // Auto-fill if exact match found
    if (newValue.length >= 2) {
      const exactMatch = filteredOptions.find(option => 
        option.city_code?.toLowerCase() === newValue.toLowerCase() ||
        option.city_name?.toLowerCase() === newValue.toLowerCase()
      );
      
      if (exactMatch) {
        setTimeout(() => {
          handleSelect(exactMatch);
        }, 100);
      }
    }
  };

  const handleKeyDown = (e) => {
    // Handle Shift+Tab first - highest priority for backward navigation
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      setShowDropdown(false);
      setSearchTerm('');
      setSelectedIndex(-1);
      const grInput = document.querySelector('[data-tab-target="gr_no"]');
      if (grInput) {
        grInput.focus();
      }
      return;
    }

    if (showDropdown && filteredOptions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
            handleSelect(filteredOptions[selectedIndex]);
          } else if (filteredOptions.length > 0) {
            handleSelect(filteredOptions[0]);
          }
          if (e.key === 'Tab' && !e.shiftKey && onTabPress) {
            onTabPress();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          setSelectedIndex(-1);
          break;
      }
    } else {
      if (e.key === 'Tab' && !e.shiftKey && onTabPress) {
        e.preventDefault();
        onTabPress();
      }
    }
  };

  // Find selected city name
  const selectedCity = options.find(city => city.city_code === value);

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 text-sm font-semibold border rounded-lg shadow-sm focus:outline-none focus:ring-0 transition-all duration-200 ${
            !isValid 
              ? 'border-red-500 focus:border-red-400 bg-red-50 text-red-900' 
              : 'border-slate-300 focus:border-indigo-400 hover:border-indigo-300 bg-white text-slate-900'
          }`}
          style={{ textTransform: 'uppercase' }}
        />
        {/* Show selected city name badge */}
        {selectedCity && value && !showDropdown && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md text-xs font-semibold border border-indigo-200 shadow-sm">
            {selectedCity.city_name}
          </div>
        )}
      </div>

      {showDropdown && searchTerm && filteredOptions.length > 0 && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => {
              setSelectedIndex(-1);
              setSearchTerm('');
              setShowDropdown(false);
              document.activeElement?.blur();
            }}
          />
          <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            <div className="p-3 bg-indigo-500 text-white text-xs font-semibold rounded-t-lg">
              SELECT STATION CODE
            </div>
            {filteredOptions.map((option, index) => {
              const displayValue = option.city_code;
              const isSelected = displayValue === value;
              const isHighlighted = index === selectedIndex;
              
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-4 py-3 text-left hover:bg-indigo-50 text-xs border-b border-slate-100 transition-colors ${
                    isHighlighted 
                      ? 'bg-indigo-100' 
                      : isSelected 
                      ? 'bg-indigo-50' 
                      : ''
                  }`}
                >
                  <div className="font-semibold text-slate-800">{option.city_name}</div>
                  <div className="text-xs text-slate-600">Code: {displayValue}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
      
      {/* Error Message */}
      {!isValid && errorMessage && (
        <div className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

// Searchable Dropdown Component
const SearchableDropdown = ({ options, value, onChange, placeholder, displayField, allowCustom = true, className = "", onTabPress }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState(value || '');
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);
  
  const filteredOptions = options.filter(option => {
    const displayValue = displayField ? option[displayField] : option;
    const cityName = option.city_name || '';
    
    // For city searches, search both city name and city code
    if (displayField === 'city_code') {
      return displayValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
             cityName.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return displayValue.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelect = (option) => {
    const selectedValue = displayField ? option[displayField] : option;
    setInputValue(selectedValue);
    setSearchTerm(''); // Clear search term first
    onChange(selectedValue);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSearchTerm(newValue);
    if (allowCustom) {
      onChange(newValue);
    }
    setSelectedIndex(-1);
    
    // Auto-fill if exact match found with city code or city name
    if (displayField === 'city_code' && newValue.length >= 2) {
      const exactMatch = filteredOptions.find(option => 
        option.city_code?.toLowerCase() === newValue.toLowerCase() ||
        option.city_name?.toLowerCase() === newValue.toLowerCase()
      );
      
      if (exactMatch) {
        setTimeout(() => {
          handleSelect(exactMatch);
        }, 100);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
        handleSelect(filteredOptions[selectedIndex]);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      } else if (allowCustom) {
        onChange(inputValue);
      }
      if (onTabPress) {
        onTabPress();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setSelectedIndex(-1);
      setSearchTerm('');
      
      if (displayField === 'city_code' && searchTerm && filteredOptions.length > 0) {
        const bestMatch = filteredOptions.find(option => 
          option.city_name?.toLowerCase() === searchTerm.toLowerCase() ||
          option.city_code?.toLowerCase() === searchTerm.toLowerCase()
        ) || filteredOptions[0];
        
        if (bestMatch) {
          handleSelect(bestMatch);
        }
      }
      
      if (onTabPress) {
        onTabPress();
      }
    } else if (e.key === 'Escape') {
      setSelectedIndex(-1);
      setSearchTerm('');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm && setSelectedIndex(-1)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
          placeholder={placeholder}
          style={{ textTransform: 'uppercase' }}
        />
      </div>

      {searchTerm && filteredOptions.length > 0 && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => {
              setSelectedIndex(-1);
              setSearchTerm('');
              document.activeElement?.blur();
            }}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredOptions.map((option, index) => {
              const displayValue = displayField ? option[displayField] : option;
              const isSelected = displayValue === value;
              const isHighlighted = index === selectedIndex;
              
              const optionLabel = displayField === 'city_code' && option.city_name 
                ? `${option.city_name} (${displayValue})`
                : displayValue;
              
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between ${
                    isHighlighted 
                      ? 'bg-purple-200 text-purple-800' 
                      : isSelected 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'text-gray-900 hover:bg-purple-50'
                  }`}
                >
                  <span className="truncate">{optionLabel}</span>
                  {isSelected && <CheckCircle className="w-4 h-4 text-purple-600" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const ManualBiltyForm = ({
  showForm,
  setShowForm,
  editingId,
  formData,
  setFormData,
  handleSubmit,
  saving,
  selectedBranch,
  cities,
  loadingReferenceData
}) => {
  // Multi-EWB state
  const [ewbList, setEwbList] = useState([]);

  // Station validation state
  const [stationError, setStationError] = useState('');
  const [isValidStation, setIsValidStation] = useState(true);
  // Format E-way bill number (1234-1234-1234 format)
  const formatEwayBill = (value) => {
    const digitsOnly = value.replace(/\D/g, '');
    const limited = digitsOnly.slice(0, 12);
    const formatted = limited.replace(/(\d{4})(\d{4})?(\d{4})?/g, (match, p1, p2, p3) => {
      let result = p1;
      if (p2) result += '-' + p2;
      if (p3) result += '-' + p3;
      return result;
    });
    return formatted;
  };

  // Validate station code against cities list
  const validateStationCode = (stationCode) => {
    if (!stationCode || stationCode.trim() === '') {
      setStationError('');
      setIsValidStation(true);
      return true;
    }
    
    const trimmedCode = stationCode.trim().toUpperCase();
    const isValid = cities.some(city => 
      city.city_code?.toUpperCase() === trimmedCode || 
      city.city_name?.toUpperCase() === trimmedCode
    );
    
    if (isValid) {
      setStationError('');
      setIsValidStation(true);
      return true;
    } else {
      setStationError('This city is not available. Add this city first.');
      setIsValidStation(false);
      return false;
    }
  };
  // Handle station change with validation
  const handleStationChange = (value) => {
    setFormData({ ...formData, station: value });
    validateStationCode(value);
  };

  // Enhanced form submission with station validation
  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    // Validate station before submission
    const stationValid = validateStationCode(formData.station);
    
    if (!stationValid) {
      // Focus on station input if invalid
      const stationInput = document.querySelector('[data-tab-target="station"] input');
      if (stationInput) {
        stationInput.focus();
      }
      return;
    }
    
    // If station is valid, proceed with original submission
    handleSubmit(e);
  };
  // Initialize EWB list from formData whenever it changes (for edit mode)
  useEffect(() => {
    if (formData.e_way_bill && formData.e_way_bill.trim() !== '') {
      const existingEwbs = formData.e_way_bill.split(',').map(ewb => ewb.trim()).filter(ewb => ewb);
      const newEwbList = existingEwbs.map((ewb, index) => ({
        id: Date.now() + index,
        number: ewb,
        status: 'added'
      }));
      setEwbList(newEwbList);
    } else {
      setEwbList([]);
    }
  }, [formData.e_way_bill]);

  // Validate station when cities load or formData.station changes
  useEffect(() => {
    if (cities.length > 0 && formData.station) {
      validateStationCode(formData.station);
    }
  }, [cities, formData.station]);

  // Update formData whenever ewbList changes
  useEffect(() => {
    const ewbString = ewbList.map(ewb => ewb.number).join(', ');
    if (formData.e_way_bill !== ewbString) {
      setFormData(prev => ({ ...prev, e_way_bill: ewbString }));
    }
  }, [ewbList]);

  // Multi-EWB Functions
  const addEwbToList = (ewbNumber) => {
    const cleanedEwbNumber = ewbNumber.replace(/[-\s]/g, '').trim();
    if (cleanedEwbNumber === '' || cleanedEwbNumber.length !== 12) {
      return false;
    }
    
    // Check for duplicates
    const isDuplicate = ewbList.some(ewb => 
      ewb.number.replace(/[-\s]/g, '').trim() === cleanedEwbNumber
    );
    
    if (isDuplicate) {
      return false;
    }
    
    const newEwb = {
      id: Date.now(),
      number: ewbNumber.trim(),
      status: 'added'
    };
    
    setEwbList(prev => [...prev, newEwb]);
    return true;
  };
  
  const removeEwbFromList = (ewbId) => {
    setEwbList(prev => prev.filter(ewb => ewb.id !== ewbId));
  };

  // Multi-EWB Input Component
  const MultipleEwbSection = () => {
    const [localInputValue, setLocalInputValue] = useState('');
    const [inputRefs] = useState(() => ({ current: null }));

    const formatEwbWithHyphens = (value) => {
      const digitsOnly = value.replace(/\D/g, '');
      const limited = digitsOnly.slice(0, 12);
      return limited.replace(/(\d{4})(\d{4})?(\d{4})?/g, (match, p1, p2, p3) => {
        let result = p1;
        if (p2) result += '-' + p2;
        if (p3) result += '-' + p3;
        return result;
      });
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
        number: localInputValue.trim(),
        status: 'added'
      };
      
      console.log('✅ Adding EWB to list:', newEwb.number);
      setEwbList(prev => [...prev, newEwb]);
      setLocalInputValue('');
      
      // Robust focus management
      const focusInput = () => {
        if (inputRefs.current) {
          inputRefs.current.focus();
          inputRefs.current.setSelectionRange(0, 0);
        }
      };
      
      // Multiple focus attempts to ensure success
      setTimeout(focusInput, 5);
      setTimeout(focusInput, 15);
      setTimeout(focusInput, 30);
    };

    const handleInputChange = (e) => {
      const rawValue = e.target.value;
      
      // Check for comma or + - this triggers adding the EWB
      if (rawValue.includes(',') || rawValue.includes('+')) {
        const beforeTrigger = rawValue.split(/[,+]/)[0].trim();
        console.log('🔤 Trigger detected, processing:', beforeTrigger);
        
        if (beforeTrigger) {
          const formattedValue = formatEwbWithHyphens(beforeTrigger);
          const digits = beforeTrigger.replace(/\D/g, '');
          
          if (digits.length === 12) {
            setLocalInputValue(formattedValue);
            setTimeout(() => {
              addToListAndClear();
            }, 5);
          } else {
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
    };

    const handleKeyDown = (e) => {
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
    };

    const handleAddClick = () => {
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
                  inputRefs.current = el;
                }
              }}
              value={localInputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="ewb-input flex-1 px-3 lg:px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-sm lg:text-base"
              placeholder="🚛 Type E-way bill (e.g., 4521-1235-5451) - Press comma/+ or click + to add"
              tabIndex={-1}
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
          </div>
          
          {/* Helper text */}
          <div className="mt-1 text-xs text-gray-600">
            💡 Type 12-digit E-way bill number and press <kbd className="bg-gray-100 px-1 rounded">comma</kbd>, <kbd className="bg-gray-100 px-1 rounded">+</kbd>, <kbd className="bg-gray-100 px-1 rounded">Enter</kbd> or click <kbd className="bg-gray-100 px-1 rounded">+</kbd> button to add
          </div>
        </div>

        {/* EWB List Display */}
        {ewbList.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-purple-700 mb-2">
              E-way Bills ({ewbList.length})
            </div>
            {ewbList.map((ewb) => (
              <div key={ewb.id} className="bg-white border-2 border-purple-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-800">{ewb.number}</div>
                      <div className="text-xs text-emerald-600 mt-1">
                        E-way bill added successfully
                      </div>
                    </div>

                    {/* Status Icons */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-emerald-600">
                        <span className="text-xs font-semibold">Added</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
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
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleFormClose = () => {
    setShowForm(false);
  };

  if (!showForm) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-xl bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-purple-600" />
                {editingId ? 'Edit Manual Bilty Summary' : 'Add New Manual Bilty Summary'}
              </h3>
              <button
                onClick={handleFormClose}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Branch Indicator */}
            {selectedBranch && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-6">
                <div className="flex items-center gap-2 text-purple-700">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Recording for: {selectedBranch.branch_name} ({selectedBranch.branch_code})
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-8">
              {loadingReferenceData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Loading cities...</span>
                  </div>
                </div>
              )}

              {/* Multiple E-way Bill Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  E-way Bills (Optional)
                </h4>
                <MultipleEwbSection />
                <p className="text-xs text-gray-500 mt-2">
                  Multiple E-way bills supported. Format: 1234-1234-1234 (excluded from tab order)
                </p>
              </div>

              {/* Basic Information Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GR Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GR Number *
                    </label>
                    <input
                      type="text"
                      value={formData.gr_no}
                      onChange={(e) => setFormData({ ...formData, gr_no: e.target.value.toUpperCase() })}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const stationInput = document.querySelector('[data-tab-target="station"] input');
                          if (stationInput) {
                            stationInput.focus();
                          }
                        } else if (e.key === 'Tab' && e.shiftKey) {
                          // Let it cycle to save button (last field) - natural form behavior
                          e.preventDefault();
                          const saveButton = document.querySelector('[data-tab-target="save"]');
                          if (saveButton) {
                            saveButton.focus();
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                      placeholder="Enter GR number"
                      required
                      maxLength={50}
                      autoFocus
                      data-tab-target="gr_no"
                    />
                  </div>

                  {/* Station */}
                  <div data-tab-target="station">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Station Code *
                    </label>
                    <StationDropdown
                      options={cities}
                      value={formData.station}
                      onChange={handleStationChange}
                      placeholder="Enter or select station code"
                      isValid={isValidStation}
                      errorMessage={stationError}
                      onTabPress={() => {
                        const consignorInput = document.querySelector('[data-tab-target="consignor"]');
                        if (consignorInput) {
                          consignorInput.focus();
                        }
                      }}
                    />
                    <p className={`text-xs mt-1 ${!isValidStation ? 'text-red-600' : 'text-gray-500'}`}>
                      {!isValidStation 
                        ? 'Only valid city codes from the system are allowed'
                        : 'Search by city name or code from available cities'
                      }
                    </p>
                  </div>

                  {/* Consignor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consignor
                    </label>
                    <input
                      type="text"
                      value={formData.consignor}
                      onChange={(e) => setFormData({ ...formData, consignor: e.target.value.toUpperCase() })}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const consigneeInput = document.querySelector('[data-tab-target="consignee"]');
                          if (consigneeInput) {
                            consigneeInput.focus();
                          }
                        } else if (e.key === 'Tab' && e.shiftKey) {
                          e.preventDefault();
                          const stationInput = document.querySelector('[data-tab-target="station"] input');
                          if (stationInput) {
                            stationInput.focus();
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                      placeholder="Enter consignor name (optional)"
                      data-tab-target="consignor"
                    />
                  </div>

                  {/* Consignee */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consignee
                    </label>
                    <input
                      type="text"
                      value={formData.consignee}
                      onChange={(e) => setFormData({ ...formData, consignee: e.target.value.toUpperCase() })}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const contentsInput = document.querySelector('[data-tab-target="contents"]');
                          if (contentsInput) {
                            contentsInput.focus();
                          }
                        } else if (e.key === 'Tab' && e.shiftKey) {
                          e.preventDefault();
                          const consignorInput = document.querySelector('[data-tab-target="consignor"]');
                          if (consignorInput) {
                            consignorInput.focus();
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                      placeholder="Enter consignee name (optional)"
                      data-tab-target="consignee"
                    />
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Content Details
                </h4>
                <div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contents/Description
                    </label>
                    <input
                      type="text"
                      value={formData.contents}
                      onChange={(e) => setFormData({ ...formData, contents: e.target.value.toUpperCase() })}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const packetsInput = document.querySelector('[data-tab-target="no_of_packets"]');
                          if (packetsInput) {
                            packetsInput.focus();
                          }
                        } else if (e.key === 'Tab' && e.shiftKey) {
                          e.preventDefault();
                          const consigneeInput = document.querySelector('[data-tab-target="consignee"]');
                          if (consigneeInput) {
                            consigneeInput.focus();
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                      placeholder="Enter contents or description"
                      data-tab-target="contents"
                    />
                  </div>
                </div>
              </div>

              {/* Shipment Details Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Weight className="w-5 h-5 text-purple-600" />
                  Shipment Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Number of Packets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Bags
                    </label>
                    <input
                      type="number"
                      value={formData.no_of_packets}
                      onChange={(e) => setFormData({ ...formData, no_of_packets: parseInt(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const weightInput = document.querySelector('[data-tab-target="weight"]');
                          if (weightInput) {
                            weightInput.focus();
                          }
                        } else if (e.key === 'Tab' && e.shiftKey) {
                          e.preventDefault();
                          const contentsInput = document.querySelector('[data-tab-target="contents"]');
                          if (contentsInput) {
                            contentsInput.focus();
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                      placeholder="Enter number of bags"
                      min="0"
                      data-tab-target="no_of_packets"
                    />
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const paymentSelect = document.querySelector('[data-tab-target="payment_status"]');
                          if (paymentSelect) {
                            paymentSelect.focus();
                          }
                        } else if (e.key === 'Tab' && e.shiftKey) {
                          e.preventDefault();
                          const packetsInput = document.querySelector('[data-tab-target="no_of_packets"]');
                          if (packetsInput) {
                            packetsInput.focus();
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                      placeholder="Enter weight in kg"
                      min="0"
                      data-tab-target="weight"
                    />
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment & Delivery Type *
                    </label>
                    <select
                      value={getCombinedValue(formData.payment_status, formData.delivery_type)}
                      onChange={(e) => {
                        const selectedOption = COMBINED_OPTIONS.find(opt => opt.value === e.target.value);
                        if (selectedOption) {
                          setFormData({
                            ...formData,
                            payment_status: selectedOption.payment_status,
                            delivery_type: selectedOption.delivery_type
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const amountInput = document.querySelector('[data-tab-target="amount"]');
                          if (amountInput) {
                            amountInput.focus();
                          }
                        } else if (e.key === 'Tab' && e.shiftKey) {
                          e.preventDefault();
                          const weightInput = document.querySelector('[data-tab-target="weight"]');
                          if (weightInput) {
                            weightInput.focus();
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                      required
                      data-tab-target="payment_status"
                    >
                      {COMBINED_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Freight & Private Marks Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  Freight & Marks
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Freight Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Freight Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const pvtMarksInput = document.querySelector('[data-tab-target="pvt_marks"]');
                          if (pvtMarksInput) {
                            pvtMarksInput.focus();
                          }
                        } else if (e.key === 'Tab' && e.shiftKey) {
                          e.preventDefault();
                          const paymentSelect = document.querySelector('[data-tab-target="payment_status"]');
                          if (paymentSelect) {
                            paymentSelect.focus();
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                      placeholder="Enter freight amount"
                      min="0"
                      data-tab-target="amount"
                    />
                  </div>

                  {/* Private Marks */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Private Marks
                    </label>
                    <input
                      type="text"
                      value={formData.pvt_marks}
                      onChange={(e) => setFormData({ ...formData, pvt_marks: e.target.value.toUpperCase() })}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const saveButton = document.querySelector('[data-tab-target="save"]');
                          if (saveButton) {
                            saveButton.focus();
                          }
                        } else if (e.key === 'Tab' && e.shiftKey) {
                          e.preventDefault();
                          const amountInput = document.querySelector('[data-tab-target="amount"]');
                          if (amountInput) {
                            amountInput.focus();
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                      placeholder="Enter private marks"
                      data-tab-target="pvt_marks"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleFormClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>                <button
                  type="submit"
                  disabled={saving || !isValidStation}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      const grInput = document.querySelector('[data-tab-target="gr_no"]');
                      if (grInput) {
                        grInput.focus();
                      }
                    } else if (e.key === 'Tab' && e.shiftKey) {
                      e.preventDefault();
                      const pvtMarksInput = document.querySelector('[data-tab-target="pvt_marks"]');
                      if (pvtMarksInput) {
                        pvtMarksInput.focus();
                      }
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const form = e.target.closest('form');
                      if (form && isValidStation) {
                        form.requestSubmit();
                      }
                    }
                  }}
                  className={`px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                    !isValidStation 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                  data-tab-target="save"
                  title={!isValidStation ? 'Please enter a valid station code before saving' : ''}
                >                  {saving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving...
                    </>
                  ) : !isValidStation ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Fix Station Code
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingId ? 'Update' : 'Save'} (Tab to Save)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManualBiltyForm;
