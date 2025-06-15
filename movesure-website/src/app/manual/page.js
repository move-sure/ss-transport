'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
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
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Download, 
  FileText, 
  Package,
  Weight,
  DollarSign,
  TrendingUp,
  Users,
  MapPin,
  Clock,
  X,
  Save,
  RefreshCw,
  Eye,
  ChevronDown,
  Check
} from 'lucide-react';

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
  };
  // Handle new record
  const handleNewRecord = () => {
    resetForm();
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
              
              <div className="flex items-center gap-3">                <button
                  onClick={handleNewRecord}
                  className="bg-white text-purple-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-50 transition-all shadow-lg"
                  title="Alt + N"
                >
                  <Plus className="w-4 h-4" />
                  New Entry
                </button>
                <button
                  onClick={handleExport}
                  disabled={loading}
                  className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-white hover:bg-opacity-30 transition-all border border-white border-opacity-20"
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{summary.no_of_packets} packages</div>
                        <div className="text-sm text-gray-500">{formatWeight(summary.weight)}</div>
                      </td>                      <td className="px-6 py-4 whitespace-nowrap">
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
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-purple-600" />
                  {editingId ? 'Edit Station Bilty Summary' : 'Add New Station Bilty Summary'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">                {loadingReferenceData && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-blue-700">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <span className="text-sm">Loading cities...</span>
                    </div>
                  </div>
                )}<div className="grid grid-cols-1 md:grid-cols-2 gap-6">                  {/* Station */}
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
                  </div>                  {/* GR Number */}
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
                  </div>                  {/* Consignor */}
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
                  </div>                  {/* Consignee */}
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

                  {/* Contents */}
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
                  </div>                  {/* Number of Packets */}
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
                  </div>{/* Payment & Delivery Type Combined */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment & Delivery Type *
                    </label>                    <select
                      value={getCombinedValue(formData.payment_status, formData.delivery_type)}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        const selectedOption = COMBINED_OPTIONS.find(opt => opt.value === selectedValue);
                        console.log('Selected option:', selectedOption); // Debug log
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
                  </div>                  {/* Amount */}
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
                </div>                {/* Full width fields */}
                <div className="grid grid-cols-1 gap-6">                  {/* Private Marks */}
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

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>                  <button
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
      )}

      {/* Delete Confirmation Modal */}
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
    </div>
  );
}