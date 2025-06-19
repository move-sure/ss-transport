'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, Package, Weight, DollarSign, X, Save, Building2,
  Shield, CheckCircle, XCircle, Loader2, Eye
} from 'lucide-react';
import EwbValidatorManual from './ewb-validator-manual';
import { getActiveEwbToken } from '../ewb/token-helper';

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
  // E-way bill validation state
  const [showEwbValidator, setShowEwbValidator] = useState(false);
  const [ewbValidationStatus, setEwbValidationStatus] = useState('idle');
  const [ewbValidationResult, setEwbValidationResult] = useState(null);
  const [ewbValidationError, setEwbValidationError] = useState(null);
  const [validationTimeout, setValidationTimeout] = useState(null);

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

  // Handle E-way bill input change
  const handleEwayBillChange = (e) => {
    const formatted = formatEwayBill(e.target.value);
    setFormData({ ...formData, e_way_bill: formatted });
    
    if (validationTimeout) {
      clearTimeout(validationTimeout);
      setValidationTimeout(null);
    }
    
    setEwbValidationStatus('idle');
    setEwbValidationResult(null);
    setEwbValidationError(null);
    
    const cleanedValue = formatted.replace(/[-\s]/g, '');
    if (cleanedValue.length === 12 && /^\d{12}$/.test(cleanedValue)) {
      const timeoutId = setTimeout(() => {
        validateEwbInBackground(formatted);
      }, 800);
      setValidationTimeout(timeoutId);
    }
  };

  // EWB Validation Function
  const validateEwbInBackground = async (ewbNumber = null) => {
    const ewbToValidate = ewbNumber || formData.e_way_bill;
    
    if (!ewbToValidate || ewbToValidate.trim() === '') {
      setEwbValidationError('Please enter an E-way bill number');
      setEwbValidationStatus('failed');
      return;
    }

    const cleanedEwbNumber = ewbToValidate.replace(/[-\s]/g, '').trim();
    
    if (cleanedEwbNumber === '') {
      setEwbValidationError('Please enter a valid E-way bill number');
      setEwbValidationStatus('failed');
      return;
    }

    if (ewbValidationStatus === 'validating') {
      return;
    }

    setEwbValidationStatus('validating');
    setEwbValidationError(null);
    setEwbValidationResult(null);

    try {
      const defaultGstin = '09COVPS5556J1ZT';
      const tokenResult = await getActiveEwbToken(defaultGstin);
      
      if (!tokenResult.success || !tokenResult.data) {
        throw new Error('No active EWB token found. Please check your token settings.');
      }

      const ewbToken = tokenResult.data;
      const apiUrl = '/api/ewb/validate';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ewbNumber: cleanedEwbNumber,
          authToken: ewbToken.access_token
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const validationData = data.data?.data?.data || data.data?.data || data.data;
        
        if (validationData?.error?.errorCodes) {
          const errorCode = validationData.error.errorCodes;
          let errorMessage = 'Invalid E-way bill number';
          
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
        
        if (validationData?.status === '0') {
          throw new Error('E-way bill number not found or is invalid.');
        }
        
        if (!validationData?.ewbNo && !validationData?.data?.ewbNo) {
          throw new Error('E-way bill number not found. Please verify the number.');
        }
        
        setEwbValidationResult(validationData);
        setEwbValidationStatus('verified');
        
        setTimeout(() => {
          setEwbValidationStatus('verified');
        }, 100);
      } else {
        const errorMessage = data.error || data.details?.message || `API Error: ${response.status}`;
        throw new Error(errorMessage);
      }
    } catch (err) {
      let errorMessage = err.message || 'Failed to validate E-way bill';
      
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
      
      setEwbValidationError(errorMessage);
      setEwbValidationStatus('failed');
    }
  };

  // Handle EWB validation complete callback
  const handleEwbValidationComplete = (validationData) => {
    setEwbValidationResult(validationData);
    setEwbValidationStatus('verified');
    setEwbValidationError(null);
  };

  // Cleanup validation timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  const handleFormClose = () => {
    setEwbValidationStatus('idle');
    setEwbValidationResult(null);
    setEwbValidationError(null);
    if (validationTimeout) {
      clearTimeout(validationTimeout);
      setValidationTimeout(null);
    }
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

            <form onSubmit={handleSubmit} className="space-y-8">
              {loadingReferenceData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Loading cities...</span>
                  </div>
                </div>
              )}

              {/* E-way Bill Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  E-way Bill (Optional)
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-way Bill Number
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.e_way_bill}
                        onChange={handleEwayBillChange}
                        tabIndex={-1}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white transition-colors ${
                          ewbValidationStatus === 'verified' 
                            ? 'border-emerald-400 bg-emerald-50' 
                            : ewbValidationStatus === 'failed'
                            ? 'border-red-400 bg-red-50'
                            : ewbValidationStatus === 'validating'
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-300'
                        }`}
                        placeholder="1234-1234-1234 (optional)"
                        maxLength={14}
                      />
                      
                      {ewbValidationStatus !== 'idle' && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          {ewbValidationStatus === 'validating' && (
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          )}
                          {ewbValidationStatus === 'verified' && (
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          )}
                          {ewbValidationStatus === 'failed' && (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {formData.e_way_bill && formData.e_way_bill.length >= 10 && (
                        <button
                          type="button"
                          onClick={() => validateEwbInBackground()}
                          disabled={ewbValidationStatus === 'validating'}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                          title="Validate E-way Bill"
                        >
                          <Shield className="w-4 h-4" />
                          {ewbValidationStatus === 'validating' ? 'Validating...' : 'Validate'}
                        </button>
                      )}

                      {ewbValidationStatus === 'verified' && (
                        <button
                          type="button"
                          onClick={() => setShowEwbValidator(true)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium"
                          title="View full E-way bill details"
                        >
                          <Eye className="w-4 h-4" />
                          Details
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Validation Status Messages */}
                  {ewbValidationStatus === 'validating' && (
                    <div className="flex items-center gap-2 mt-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Validating E-way Bill...</span>
                    </div>
                  )}

                  {ewbValidationStatus === 'verified' && ewbValidationResult && (
                    <div className="mt-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-800">✅ E-way Bill Verified</span>
                      </div>
                      <div className="text-sm text-emerald-700 space-y-1">
                        <p>Status: <span className="font-semibold">{ewbValidationResult.status === 'ACT' ? 'Active' : ewbValidationResult.status}</span></p>
                        <p>From: <span className="font-semibold">{ewbValidationResult.fromTrdName}</span></p>
                        <p>To: <span className="font-semibold">{ewbValidationResult.toTrdName}</span></p>
                      </div>
                    </div>
                  )}

                  {ewbValidationStatus === 'failed' && ewbValidationError && (
                    <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-bold text-red-800">❌ Validation Failed</span>
                      </div>
                      <p className="text-sm text-red-700">{ewbValidationError}</p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    12-digit E-way bill number in format: 1234-1234-1234 (optional - excluded from tab order)
                  </p>
                </div>
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
                    <SearchableDropdown
                      options={cities}
                      value={formData.station}
                      onChange={(value) => setFormData({ ...formData, station: value })}
                      placeholder="Enter or select station code"
                      displayField="city_code"
                      allowCustom={true}
                      className=""
                      onTabPress={() => {
                        const consignorInput = document.querySelector('[data-tab-target="consignor"]');
                        if (consignorInput) {
                          consignorInput.focus();
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You can search by city name or code, or enter manually
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
                      onChange={(e) => setFormData({ ...formData, consignor: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const consigneeInput = document.querySelector('[data-tab-target="consignee"]');
                          if (consigneeInput) {
                            consigneeInput.focus();
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
                      onChange={(e) => setFormData({ ...formData, consignee: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const contentsInput = document.querySelector('[data-tab-target="contents"]');
                          if (contentsInput) {
                            contentsInput.focus();
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
                      onChange={(e) => setFormData({ ...formData, contents: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const packetsInput = document.querySelector('[data-tab-target="no_of_packets"]');
                          if (packetsInput) {
                            packetsInput.focus();
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
                      onChange={(e) => setFormData({ ...formData, pvt_marks: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const saveButton = document.querySelector('[data-tab-target="save"]');
                          if (saveButton) {
                            saveButton.focus();
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
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      const form = e.target.closest('form');
                      if (form && !saving) {
                        form.requestSubmit();
                      }
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const form = e.target.closest('form');
                      if (form) {
                        form.requestSubmit();
                      }
                    }
                  }}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  data-tab-target="save"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving...
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

      {/* E-way Bill Validator Modal */}
      {showEwbValidator && (
        <EwbValidatorManual
          ewbNumber={formData.e_way_bill}
          isOpen={showEwbValidator}
          onClose={() => setShowEwbValidator(false)}
          validationResult={ewbValidationResult}
          onValidationComplete={handleEwbValidationComplete}
        />
      )}
    </>
  );
};

export default ManualBiltyForm;
