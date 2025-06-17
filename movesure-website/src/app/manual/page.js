'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import EwbValidatorManual from '../../components/manual/ewb-validator-manual';
import { getActiveEwbToken } from '../../components/ewb/token-helper';
import { 
  FileText, Plus, Download, Search, RefreshCw, Edit2, Trash2, 
  MapPin, Users, DollarSign, Package, Weight, Check, X, Save,
  Building2, ChevronDown, Eye, Shield, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { 
  useStationBiltySummary, 
  PAYMENT_STATUS_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
  formatCurrency,
  formatWeight,
  getPaymentStatusColor
} from '../../components/manual/manual-helper';

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

// Helper function to get combined option color
const getCombinedOptionColor = (value) => {
  switch(value) {
    case 'paid':
    case 'paid_door':
      return 'bg-green-100 text-green-800';
    case 'to-pay':
    case 'to-pay_door':
      return 'bg-orange-100 text-orange-800';
    case 'foc':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Searchable Dropdown Component
const SearchableDropdown = ({ options, value, onChange, placeholder, displayField, allowCustom = true, className = "" }) => {
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
  });  const handleSelect = (option) => {
    const selectedValue = displayField ? option[displayField] : option;
    setInputValue(selectedValue);
    setSearchTerm(''); // Clear search term first
    onChange(selectedValue);
    setSelectedIndex(-1);
  };  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSearchTerm(newValue);
    if (allowCustom) {
      onChange(newValue);
    }
    setSelectedIndex(-1);
    
    // Auto-fill if exact match found with city code
    if (displayField === 'city_code' && newValue.length >= 2) {
      const exactMatch = filteredOptions.find(option => 
        option.city_code.toLowerCase() === newValue.toLowerCase()
      );
      
      if (exactMatch) {
        setTimeout(() => {
          handleSelect(exactMatch);
        }, 100);
      }
    }
  };  const handleKeyDown = (e) => {
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
        // If no selection but we have options, select the first one
        handleSelect(filteredOptions[0]);
      } else if (allowCustom) {
        onChange(inputValue);
        // Move to next input
        const form = e.target.form;
        if (form) {
          const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
          const currentIndex = inputs.indexOf(e.target);
          if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
            inputs[currentIndex + 1].focus();
          }
        }
      }
    } else if (e.key === 'Escape') {
      setSelectedIndex(-1);
      setSearchTerm('');
    } else if (e.key === 'Tab') {
      setSelectedIndex(-1);
      setSearchTerm('');
      // Don't prevent default - let Tab work normally for navigation
    }
  };
  return (
    <div className={`relative ${className}`}>      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm && setSelectedIndex(-1)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
          placeholder={placeholder}
        />
      </div>      {searchTerm && filteredOptions.length > 0 && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => {
              setSelectedIndex(-1);
              setSearchTerm('');
              // Blur the input to hide dropdown
              document.activeElement?.blur();
            }}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const displayValue = displayField ? option[displayField] : option;
                const isSelected = displayValue === value;
                const isHighlighted = index === selectedIndex;
                
                // For city options, show both name and code
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
                    {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-gray-500 text-sm">
                {allowCustom ? `Press Enter to add "${inputValue}"` : 'No options found'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default function StationBiltySummaryPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, initialized } = useAuth();
  // Use the custom hook
  const {
    loading,
    saving,
    searching,
    summaryData,
    searchResults,
    searchTerm,
    editingId,
    formData,
    cities,
    loadingReferenceData,
    setFormData,
    setSearchTerm,
    loadSummaryData,
    saveSummary,
    loadForEdit,
    deleteSummary,
    resetForm,
    getSummaryStats,
    exportToCSV
  } = useStationBiltySummary();
  // Component state
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsPerPage] = useState(20);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  // Branch management state
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // E-way bill validation state
  const [showEwbValidator, setShowEwbValidator] = useState(false);
  const [ewbValidationStatus, setEwbValidationStatus] = useState('idle'); // 'idle', 'validating', 'verified', 'failed'
  const [ewbValidationResult, setEwbValidationResult] = useState(null);
  const [ewbValidationError, setEwbValidationError] = useState(null);
  const [validationTimeout, setValidationTimeout] = useState(null);

  // Authentication check
  useEffect(() => {
    if (initialized && !authLoading) {
      if (!isAuthenticated || !user) {
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
      }
    }
  }, [initialized, authLoading, isAuthenticated, user, router]);
  // Load initial data
  useEffect(() => {
    if (user?.id) {
      handleLoadData();
      loadStats();
    }
  }, [user?.id, currentPage]);
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt + N for new entry
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewRecord();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  // Load branches and initialize default branch
  useEffect(() => {
    if (user?.id) {
      loadBranches();
    }
  }, [user?.id]);

  // Initialize default branch when branches are loaded
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      initializeDefaultBranch();
    }
  }, [branches, user?.user_metadata?.branch_id]);

  // Load branches from database
  const loadBranches = async () => {
    try {
      setLoadingBranches(true);
      const supabase = (await import('../utils/supabase')).default;
      
      const { data: branchesData, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('branch_name');

      if (error) {
        console.error('Error loading branches:', error);
        return;
      }

      setBranches(branchesData || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoadingBranches(false);
    }
  };
  // Initialize default branch from localStorage or user's branch
  const initializeDefaultBranch = () => {
    try {
      const savedBranchId = localStorage.getItem('selectedBranchId');
      if (savedBranchId) {
        const branch = branches.find(b => b.id === savedBranchId);
        if (branch) {
          setSelectedBranch(branch);
          return;
        }
      }
      
      // Fallback to user's branch
      if (user?.user_metadata?.branch_id) {
        const userBranch = branches.find(b => b.id === user.user_metadata.branch_id);
        if (userBranch) {
          setSelectedBranch(userBranch);
          localStorage.setItem('selectedBranchId', userBranch.id);
          return;
        }
      }

      // If no match, select first available branch
      if (branches.length > 0) {
        setSelectedBranch(branches[0]);
        localStorage.setItem('selectedBranchId', branches[0].id);
      }
    } catch (error) {
      console.error('Error initializing default branch:', error);
      // Fallback to first branch if localStorage fails
      if (branches.length > 0) {
        setSelectedBranch(branches[0]);
      }
    }
  };
  // Handle branch selection
  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch);
    setShowBranchDropdown(false);
    localStorage.setItem('selectedBranchId', branch.id);
    
    // Update form data if form is open
    if (showForm) {
      setFormData(prev => ({
        ...prev,
        branch_id: branch.id
      }));
    }
  };

  // Format E-way bill number (1234-1234-1234 format)
  const formatEwayBill = (value) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Limit to 12 digits
    const limited = digitsOnly.slice(0, 12);
    
    // Add dashes every 4 digits
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
    
    // Clear any existing timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
      setValidationTimeout(null);
    }
    
    // Reset validation state when EWB changes
    setEwbValidationStatus('idle');
    setEwbValidationResult(null);
    setEwbValidationError(null);
    
    // Auto-validate when format matches 12 digits
    const cleanedValue = formatted.replace(/[-\s]/g, '');
    if (cleanedValue.length === 12 && /^\d{12}$/.test(cleanedValue)) {
      console.log('🚀 Auto-triggering validation for:', formatted);
      
      // Trigger validation after a delay
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

    // Clean the EWB number by removing hyphens and spaces
    const cleanedEwbNumber = ewbToValidate.replace(/[-\s]/g, '').trim();
    
    if (cleanedEwbNumber === '') {
      setEwbValidationError('Please enter a valid E-way bill number');
      setEwbValidationStatus('failed');
      return;
    }

    // Prevent duplicate API calls
    if (ewbValidationStatus === 'validating') {
      console.log('🚫 Validation already in progress, skipping duplicate call');
      return;
    }

    console.log('🔄 Starting EWB validation...');
    console.log('🧹 Original EWB:', ewbToValidate, '→ Cleaned EWB:', cleanedEwbNumber);
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
      console.log('📊 Response data:', data);

      if (response.ok && data.success) {
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
        
        setEwbValidationResult(validationData);
        setEwbValidationStatus('verified');
        console.log('🎉 Status set to verified, should trigger UI update');
        
        // Force a re-render by updating the state again after a small delay
        setTimeout(() => {
          console.log('🔄 Re-confirming verification status...');
          setEwbValidationStatus('verified');
        }, 100);
      } else {
        console.error('❌ API error:', data);
        // Handle specific error responses from our API
        const errorMessage = data.error || data.details?.message || `API Error: ${response.status}`;
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('🚨 EWB validation error:', err);
      console.error('🚨 Error stack:', err.stack);
      
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
    } finally {
      console.log('🏁 EWB validation process complete');
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

  // Load data with pagination
  const handleLoadData = async () => {
    try {
      const offset = (currentPage - 1) * recordsPerPage;
      const result = await loadSummaryData(recordsPerPage, offset);
      setTotalRecords(result.count);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data. Please try again.');
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const statsData = await getSummaryStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveSummary();
      
      // Clear E-way bill validation state after successful save
      setEwbValidationStatus('idle');
      setEwbValidationResult(null);
      setEwbValidationError(null);
      if (validationTimeout) {
        clearTimeout(validationTimeout);
        setValidationTimeout(null);
      }
      
      setShowForm(false);
      await loadStats();
      alert(editingId ? 'Record updated successfully!' : 'Record added successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert(`Error saving record: ${error.message}`);
    }
  };

  // Handle edit
  const handleEdit = (summary) => {
    loadForEdit(summary);
    setShowForm(true);
  };

  // Handle delete with confirmation
  const handleDelete = async (id) => {
    try {
      await deleteSummary(id);
      setShowDeleteConfirm(null);
      await loadStats();
      alert('Record deleted successfully!');
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting record. Please try again.');
    }
  };  // Handle new record
  const handleNewRecord = () => {
    resetForm();
    
    // Clear E-way bill validation state
    setEwbValidationStatus('idle');
    setEwbValidationResult(null);
    setEwbValidationError(null);
    
    // Clear any existing validation timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
      setValidationTimeout(null);
    }
    
    // Set staff_id and branch_id from selected branch or user data
    setFormData(prev => ({
      ...prev,
      staff_id: user?.id || null,
      branch_id: selectedBranch?.id || user?.user_metadata?.branch_id || null
    }));
    setShowForm(true);
    // Focus on station code field after form opens
    setTimeout(() => {
      const stationInput = document.querySelector('input[placeholder="Enter or select station code"]');
      if (stationInput) {
        stationInput.focus();
      }
    }, 100);
  };

  // Handle export
  const handleExport = async () => {
    try {
      await exportToCSV();
      alert('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  // Calculate pagination info
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  // Show loading while auth is initializing
  if (!initialized || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl shadow-2xl p-6 mb-6 border border-purple-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Station Bilty Summary</h1>
                    <p className="text-purple-100">Manual entry and management of station bilty records</p>
                  </div>
                </div>
              </div>
                <div className="flex items-center gap-3">
                {/* Branch Selector */}
                <div className="relative">                  <button
                    onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                    className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-100 transition-all border border-gray-300 shadow-sm"
                    disabled={loadingBranches}
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {selectedBranch ? selectedBranch.branch_name : 'Select Branch'}
                    </span>
                    <span className="sm:hidden">
                      {selectedBranch ? selectedBranch.branch_code : 'Branch'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Branch Dropdown */}
                  {showBranchDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowBranchDropdown(false)}
                      />
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-60 overflow-auto">
                        {loadingBranches ? (
                          <div className="px-4 py-3 text-center text-gray-500">
                            <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                            Loading branches...
                          </div>
                        ) : branches.length > 0 ? (
                          branches.map((branch) => (
                            <button
                              key={branch.id}
                              onClick={() => handleBranchSelect(branch)}
                              className={`w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center justify-between ${
                                selectedBranch?.id === branch.id ? 'bg-purple-100 text-purple-700' : 'text-gray-900'
                              }`}
                            >
                              <div>
                                <div className="font-medium">{branch.branch_name}</div>
                                <div className="text-sm text-gray-500">{branch.branch_code} - {branch.city_code}</div>
                              </div>
                              {selectedBranch?.id === branch.id && (
                                <Check className="w-4 h-4 text-purple-600" />
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-gray-500">
                            No branches found
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleNewRecord}
                  className="bg-white text-purple-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-50 transition-all shadow-lg"
                  title="Alt + N"
                >
                  <Plus className="w-4 h-4" />
                  New Entry
                </button>                <button
                  onClick={handleExport}
                  disabled={loading}
                  className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-100 transition-all border border-gray-300 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Records</dt>
                        <dd className="text-2xl font-bold text-gray-900">{stats.totalRecords}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Amount</dt>
                        <dd className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Packages</dt>
                        <dd className="text-2xl font-bold text-gray-900">{stats.totalPackets}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Weight className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Weight</dt>
                        <dd className="text-2xl font-bold text-gray-900">{formatWeight(stats.totalWeight)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"                    placeholder="Search by station, GR no, consignor, consignee, or PVT marks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadData}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Station Bilty Records 
                {searchTerm && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Showing search results for {searchTerm})
                  </span>
                )}
              </h3>
              {!searchTerm && totalRecords > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Showing {startRecord} to {endRecord} of {totalRecords} records
                </p>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">                <thead className="bg-gray-50">
                  <tr>                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station/GR No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consignor/Consignee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contents/PVT Marks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-way Bill</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packages/Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment & Delivery</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(searchTerm ? searchResults : summaryData).map((summary) => (
                    <tr key={summary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {summary.station}
                          </div>
                          <div className="text-sm text-gray-500">GR: {summary.gr_no}</div>
                        </div>
                      </td>                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            {summary.consignor || '-'}
                          </div>
                          <div className="text-sm text-gray-500">To: {summary.consignee || '-'}</div>
                        </div>
                      </td>                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900 font-medium">{summary.contents || '-'}</div>
                          {summary.pvt_marks && (
                            <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded mt-1 inline-block">
                              <span className="font-medium">PVT:</span> {summary.pvt_marks}
                            </div>
                          )}
                        </div>
                      </td>                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          {summary.e_way_bill ? (
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900 bg-blue-50 px-2 py-1 rounded border">
                                <span className="text-blue-600">EWB:</span> {summary.e_way_bill}
                              </div>
                              <button
                                onClick={() => {
                                  // Set the E-way bill for validation and show modal
                                  setFormData(prev => ({ ...prev, e_way_bill: summary.e_way_bill }));
                                  setShowEwbValidator(true);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="Validate E-way Bill"
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No E-way Bill</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{summary.no_of_packets} packages</div>
                        <div className="text-sm text-gray-500">{formatWeight(summary.weight)}</div>
                      </td><td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getCombinedOptionColor(getCombinedValue(summary.payment_status, summary.delivery_type))
                        }`}>
                          {COMBINED_OPTIONS.find(opt => 
                            opt.payment_status === summary.payment_status && opt.delivery_type === summary.delivery_type
                          )?.label || `${summary.payment_status || 'N/A'} / ${summary.delivery_type || 'N/A'}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(summary.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(summary)}
                            className="text-purple-600 hover:text-purple-900 p-1 hover:bg-purple-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(summary.id)}
                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(searchTerm ? searchResults : summaryData).length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'No records found matching your search.' : 'No records found. Add your first entry!'}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {!searchTerm && totalPages > 1 && (
              <div className="bg-white px-6 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{startRecord}</span> to{' '}
                        <span className="font-medium">{endRecord}</span> of{' '}
                        <span className="font-medium">{totalRecords}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          if (pageNum <= totalPages) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentPage === pageNum
                                    ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        })}
                        
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-xl bg-white">
            <div className="mt-3">              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-purple-600" />
                  {editingId ? 'Edit Station Bilty Summary' : 'Add New Station Bilty Summary'}
                </h3>                <button
                  onClick={() => {
                    // Clear E-way bill validation state when closing form
                    setEwbValidationStatus('idle');
                    setEwbValidationResult(null);
                    setEwbValidationError(null);
                    if (validationTimeout) {
                      clearTimeout(validationTimeout);
                      setValidationTimeout(null);
                    }
                    setShowForm(false);
                  }}
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

                {/* Basic Information Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Station */}
                    <div>
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
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        You can search by city name or code, or enter manually
                      </p>
                    </div>

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
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const form = e.target.form;
                            if (form) {
                              const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                              const currentIndex = inputs.indexOf(e.target);
                              if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                                inputs[currentIndex + 1].focus();
                              }
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                        placeholder="Enter GR number"
                        required
                        maxLength={50}
                      />
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
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const form = e.target.form;
                            if (form) {
                              const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                              const currentIndex = inputs.indexOf(e.target);
                              if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                                inputs[currentIndex + 1].focus();
                              }
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                        placeholder="Enter consignor name (optional)"
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
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const form = e.target.form;
                            if (form) {
                              const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                              const currentIndex = inputs.indexOf(e.target);
                              if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                                inputs[currentIndex + 1].focus();
                              }
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                        placeholder="Enter consignee name (optional)"
                      />
                    </div>
                  </div>
                </div>

                {/* Content and Documentation Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    Content & Documentation
                  </h4>
                  <div className="space-y-6">
                    {/* Contents - Full width */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contents/Description
                      </label>
                      <input
                        type="text"
                        value={formData.contents}
                        onChange={(e) => setFormData({ ...formData, contents: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const form = e.target.form;
                            if (form) {
                              const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                              const currentIndex = inputs.indexOf(e.target);
                              if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                                inputs[currentIndex + 1].focus();
                              }
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                        placeholder="Enter contents or description"
                      />
                    </div>

                    {/* E-way Bill - Full width with enhanced styling */}
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
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const form = e.target.form;
                                if (form) {
                                  const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                                  const currentIndex = inputs.indexOf(e.target);
                                  if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                                    inputs[currentIndex + 1].focus();
                                  }
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white transition-colors ${
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
                          
                          {/* Status Indicator Icon */}
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

                        {/* Validation Action Buttons */}
                        <div className="flex items-center gap-2">
                          {/* Manual Validation Button */}
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

                          {/* View Details Button */}
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
                        12-digit E-way bill number in format: 1234-1234-1234 (optional)
                      </p>
                    </div>

                    {/* Private Marks - Full width */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Private Marks
                      </label>
                      <input
                        type="text"
                        value={formData.pvt_marks}
                        onChange={(e) => setFormData({ ...formData, pvt_marks: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const form = e.target.form;
                            if (form) {
                              const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                              const currentIndex = inputs.indexOf(e.target);
                              if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                                inputs[currentIndex + 1].focus();
                              }
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                        placeholder="Enter private marks"
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
                        Number of Packets
                      </label>
                      <input
                        type="number"
                        value={formData.no_of_packets}
                        onChange={(e) => setFormData({ ...formData, no_of_packets: parseInt(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const form = e.target.form;
                            if (form) {
                              const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                              const currentIndex = inputs.indexOf(e.target);
                              if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                                inputs[currentIndex + 1].focus();
                              }
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                        placeholder="Enter number of packets"
                        min="0"
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
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const form = e.target.form;
                            if (form) {
                              const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                              const currentIndex = inputs.indexOf(e.target);
                              if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                                inputs[currentIndex + 1].focus();
                              }
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                        placeholder="Enter weight in kg"
                        min="0"
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const form = e.target.form;
                            if (form) {
                              const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                              const currentIndex = inputs.indexOf(e.target);
                              if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                                inputs[currentIndex + 1].focus();
                              }
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                        placeholder="Enter amount"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment and Delivery Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    Payment & Delivery
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment & Delivery Type *
                    </label>
                    <select
                      value={getCombinedValue(formData.payment_status, formData.delivery_type)}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        const selectedOption = COMBINED_OPTIONS.find(opt => opt.value === selectedValue);
                        if (selectedOption) {
                          setFormData({ 
                            ...formData, 
                            payment_status: selectedOption.payment_status,
                            delivery_type: selectedOption.delivery_type
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const form = e.target.form;
                          if (form) {
                            const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                            const currentIndex = inputs.indexOf(e.target);
                            if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                              inputs[currentIndex + 1].focus();
                            }
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black bg-white"
                      required
                    >
                      {COMBINED_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select payment method and delivery type combination
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">                  <button
                    type="button"
                    onClick={() => {
                      // Clear E-way bill validation state when canceling
                      setEwbValidationStatus('idle');
                      setEwbValidationResult(null);
                      setEwbValidationError(null);
                      if (validationTimeout) {
                        clearTimeout(validationTimeout);
                        setValidationTimeout(null);
                      }
                      setShowForm(false);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button><button
                    type="submit"
                    disabled={saving}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        // Trigger form submission
                        const form = e.target.closest('form');
                        if (form) {
                          form.requestSubmit();
                        }
                      }
                    }}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      )}      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-xl bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Record</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this station bilty summary record? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}