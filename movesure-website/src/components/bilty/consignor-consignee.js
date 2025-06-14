'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, AlertTriangle, Search } from 'lucide-react';
import { useInputNavigation } from './input-navigation';
import { 
  useConsignorConsigneeSearch,
  addNewConsignor,
  addNewConsignee,
  updateConsignorNumber,
  updateConsigneeNumber,
  updateConsignorGST,
  updateConsigneeGST,
  checkDuplicateConsignor,
  checkDuplicateConsignee,
  getSimilarConsignors,
  getSimilarConsignees
} from './consignor-consignee-helper';

const ConsignorConsigneeSection = ({ 
  formData, 
  setFormData, 
  onDataUpdate // Callback to refresh consignors/consignees lists
}) => {
  const [showConsignorDropdown, setShowConsignorDropdown] = useState(false);
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false);
  const [consignorSearch, setConsignorSearch] = useState('');
  const [consigneeSearch, setConsigneeSearch] = useState('');  const [consignorSelectedIndex, setConsignorSelectedIndex] = useState(-1);
  const [consigneeSelectedIndex, setConsigneeSelectedIndex] = useState(-1);
  
  // Modal states
  const [showAddConsignor, setShowAddConsignor] = useState(false);
  const [showAddConsignee, setShowAddConsignee] = useState(false);
  const [addingConsignor, setAddingConsignor] = useState(false);
  const [addingConsignee, setAddingConsignee] = useState(false);
  
  // Form data for new entries
  const [newConsignorData, setNewConsignorData] = useState({
    company_name: '',
    gst_num: '',
    number: ''
  });
  const [newConsigneeData, setNewConsigneeData] = useState({
    company_name: '',
    gst_num: '',
    number: ''
  });
  
  // Suggestions and validation states
  const [consignorSuggestions, setConsignorSuggestions] = useState([]);
  const [consigneeSuggestions, setConsigneeSuggestions] = useState([]);
  const [consignorExists, setConsignorExists] = useState(false);
  const [consigneeExists, setConsigneeExists] = useState(false);
    const consignorRef = useRef(null);
  const consigneeRef = useRef(null);
  const consignorInputRef = useRef(null);
  const consigneeInputRef = useRef(null);
  const consignorGstRef = useRef(null);
  const consignorPhoneRef = useRef(null);
  const consigneeGstRef = useRef(null);
  const consigneePhoneRef = useRef(null);
  
  // Input navigation
  const { register, unregister, handleEnter } = useInputNavigation();

  // Use the optimized search hook
  const { searchResults, isSearching, searchDatabase, clearResults } = useConsignorConsigneeSearch();
  // Initialize search values when formData changes (for edit mode)
  useEffect(() => {
    if (formData.consignor_name && consignorSearch !== formData.consignor_name) {
      setConsignorSearch(formData.consignor_name);
    }
    if (formData.consignee_name && consigneeSearch !== formData.consignee_name) {
      setConsigneeSearch(formData.consignee_name);
    }
  }, [formData.consignor_name, formData.consignee_name]);
  // Register inputs for navigation
  useEffect(() => {
    if (consignorInputRef.current) {
      register(5, consignorInputRef.current);
    }
    if (consigneeInputRef.current) {
      register(6, consigneeInputRef.current);
    }    if (consignorGstRef.current) {
      register(7, consignorGstRef.current);
    }
    if (consignorPhoneRef.current) {
      register(8, consignorPhoneRef.current);
    }
    if (consigneeGstRef.current) {
      register(9, consigneeGstRef.current);
    }
    if (consigneePhoneRef.current) {
      register(10, consigneePhoneRef.current);
    }
    
    return () => {
      unregister(5);
      unregister(6);
      unregister(7);
      unregister(8);
      unregister(9);
      unregister(10);    };
  }, [register, unregister]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (consignorRef.current && !consignorRef.current.contains(event.target)) {
        setShowConsignorDropdown(false);
      }
      if (consigneeRef.current && !consigneeRef.current.contains(event.target)) {
        setShowConsigneeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [consignorSearch, consigneeSearch]);

  // Handle consignor search with optimized database query
  const handleConsignorSearchChange = (value) => {
    setConsignorSearch(value);
    setFormData(prev => ({ ...prev, consignor_name: value }));
    
    if (value.length >= 2) {
      searchDatabase(value, 'consignors');
      setShowConsignorDropdown(true);
    } else {
      setShowConsignorDropdown(false);
      clearResults();
    }
    setConsignorSelectedIndex(-1);
  };

  // Handle consignee search with optimized database query
  const handleConsigneeSearchChange = (value) => {
    setConsigneeSearch(value);
    setFormData(prev => ({ ...prev, consignee_name: value }));
    
    if (value.length >= 2) {
      searchDatabase(value, 'consignees');
      setShowConsigneeDropdown(true);
    } else {
      setShowConsigneeDropdown(false);
      clearResults();
    }
    setConsigneeSelectedIndex(-1);
  };
  const handleConsignorSelect = async (consignor) => {
    setConsignorSearch(consignor.company_name);
    
    // Update consignor details
    setFormData(prev => {
      const updatedData = {
        ...prev,
        consignor_name: consignor.company_name,
        consignor_gst: consignor.gst_num || '',
        consignor_number: consignor.number || ''
      };
      
      // If city is already selected, update rate to consignor-specific rate if available
      if (prev.to_city_id) {
        console.log('🔍 Consignor selected, looking for consignor-specific rate...');
        console.log('Selected consignor:', consignor.company_name, 'ID:', consignor.id);
        console.log('Current city ID:', prev.to_city_id);
        
        // Find consignor-specific rate for this consignor and city combination
        // Note: We need to use external data since we don't have direct access to rates here
        // The rate lookup will be handled by parent component or city-transport component
        
        // For now, we'll trigger a custom event that the parent can listen to
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('consignorSelected', {
            detail: {
              consignor: consignor,
              cityId: prev.to_city_id
            }
          }));
        }
      }
      
      return updatedData;
    });
    
    setShowConsignorDropdown(false);
    setConsignorSelectedIndex(-1);
    clearResults();
  };

  const handleConsigneeSelect = async (consignee) => {
    setConsigneeSearch(consignee.company_name);
    setFormData(prev => ({
      ...prev,
      consignee_name: consignee.company_name,
      consignee_gst: consignee.gst_num || '',
      consignee_number: consignee.number || ''
    }));
    setShowConsigneeDropdown(false);
    setConsigneeSelectedIndex(-1);
    clearResults();
  };
  // Handle phone number updates for existing consignors/consignees
  const handleConsignorNumberChange = async (e) => {
    const newNumber = e.target.value;
    setFormData(prev => ({ ...prev, consignor_number: newNumber }));
    
    // If consignor exists and number is being updated, save to database
    if (formData.consignor_name && newNumber && newNumber.length >= 10) {
      try {
        const result = await updateConsignorNumber(formData.consignor_name, newNumber);
        if (result.success) {
          console.log('Consignor number updated successfully');
        }
      } catch (error) {
        console.error('Error updating consignor number:', error);
      }
    }
  };

  const handleConsigneeNumberChange = async (e) => {
    const newNumber = e.target.value;
    setFormData(prev => ({ ...prev, consignee_number: newNumber }));
    
    // If consignee exists and number is being updated, save to database
    if (formData.consignee_name && newNumber && newNumber.length >= 10) {
      try {
        const result = await updateConsigneeNumber(formData.consignee_name, newNumber);
        if (result.success) {
          console.log('Consignee number updated successfully');
        }
      } catch (error) {
        console.error('Error updating consignee number:', error);
      }
    }
  };

  // Handle GST updates for existing consignors/consignees
  const handleConsignorGSTChange = async (e) => {
    const newGST = e.target.value;
    setFormData(prev => ({ ...prev, consignor_gst: newGST }));
    
    // If consignor exists and GST is being updated, save to database
    if (formData.consignor_name && newGST && newGST.length >= 15) {
      try {
        const result = await updateConsignorGST(formData.consignor_name, newGST);
        if (result.success) {
          console.log('Consignor GST updated successfully');
        }
      } catch (error) {
        console.error('Error updating consignor GST:', error);
      }
    }
  };

  const handleConsigneeGSTChange = async (e) => {
    const newGST = e.target.value;
    setFormData(prev => ({ ...prev, consignee_gst: newGST }));
    
    // If consignee exists and GST is being updated, save to database
    if (formData.consignee_name && newGST && newGST.length >= 15) {
      try {
        const result = await updateConsigneeGST(formData.consignee_name, newGST);
        if (result.success) {
          console.log('Consignee GST updated successfully');
        }
      } catch (error) {
        console.error('Error updating consignee GST:', error);
      }
    }
  };
  // Keyboard navigation with Enter support
  const handleConsignorKeyDown = (e) => {
    // Handle dropdown navigation
    if (showConsignorDropdown && searchResults.consignors.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setConsignorSelectedIndex(prev => 
            prev < searchResults.consignors.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setConsignorSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.consignors.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (consignorSelectedIndex >= 0) {
            handleConsignorSelect(searchResults.consignors[consignorSelectedIndex]);
          } else if (searchResults.consignors.length > 0) {
            handleConsignorSelect(searchResults.consignors[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowConsignorDropdown(false);
          setConsignorSelectedIndex(-1);
          break;
      }
    } else {
      // Handle Enter key for navigation when dropdown is not open
      if (e.key === 'Enter') {
        handleEnter(e, 5);
      }
    }
  };

  const handleConsigneeKeyDown = (e) => {
    // Handle dropdown navigation
    if (showConsigneeDropdown && searchResults.consignees.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setConsigneeSelectedIndex(prev => 
            prev < searchResults.consignees.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setConsigneeSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.consignees.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (consigneeSelectedIndex >= 0) {
            handleConsigneeSelect(searchResults.consignees[consigneeSelectedIndex]);
          } else if (searchResults.consignees.length > 0) {
            handleConsigneeSelect(searchResults.consignees[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowConsigneeDropdown(false);
          setConsigneeSelectedIndex(-1);
          break;
      }
    } else {
      // Handle Enter key for navigation when dropdown is not open
      if (e.key === 'Enter') {
        handleEnter(e, 6);
      }
    }
  };

  // Check for existing companies when typing in add modals
  useEffect(() => {
    const checkConsignor = async () => {
      if (newConsignorData.company_name.trim()) {
        const suggestions = await getSimilarConsignors(newConsignorData.company_name, 5);
        setConsignorSuggestions(suggestions);
        
        const exists = await checkDuplicateConsignor(newConsignorData.company_name);
        setConsignorExists(exists);
      } else {
        setConsignorSuggestions([]);
        setConsignorExists(false);
      }
    };
    
    const timeoutId = setTimeout(checkConsignor, 300);
    return () => clearTimeout(timeoutId);
  }, [newConsignorData.company_name]);

  useEffect(() => {
    const checkConsignee = async () => {
      if (newConsigneeData.company_name.trim()) {
        const suggestions = await getSimilarConsignees(newConsigneeData.company_name, 5);
        setConsigneeSuggestions(suggestions);
        
        const exists = await checkDuplicateConsignee(newConsigneeData.company_name);
        setConsigneeExists(exists);
      } else {
        setConsigneeSuggestions([]);
        setConsigneeExists(false);
      }
    };
    
    const timeoutId = setTimeout(checkConsignee, 300);
    return () => clearTimeout(timeoutId);
  }, [newConsigneeData.company_name]);

  const handleConsignorSuggestionSelect = (consignor) => {
    setNewConsignorData({
      company_name: consignor.company_name,
      gst_num: consignor.gst_num || '',
      number: consignor.number || ''
    });
    setConsignorSuggestions([]);
  };

  const handleConsigneeSuggestionSelect = (consignee) => {
    setNewConsigneeData({
      company_name: consignee.company_name,
      gst_num: consignee.gst_num || '',
      number: consignee.number || ''
    });
    setConsigneeSuggestions([]);
  };

  const handleAddNewConsignor = async () => {
    if (!newConsignorData.company_name.trim()) {
      alert('Company name is required');
      return;
    }

    if (consignorExists) {
      alert('This company name already exists! Please select from suggestions or use a different name.');
      return;
    }

    try {
      setAddingConsignor(true);
      
      const result = await addNewConsignor(newConsignorData);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Update form data with new consignor
      setFormData(prev => ({
        ...prev,
        consignor_name: result.data.company_name,
        consignor_gst: result.data.gst_num || '',
        consignor_number: result.data.number || ''
      }));

      // Update search field
      setConsignorSearch(result.data.company_name);

      // Reset add form
      setNewConsignorData({ company_name: '', gst_num: '', number: '' });
      setConsignorSuggestions([]);
      setConsignorExists(false);
      setShowAddConsignor(false);
      setShowConsignorDropdown(false);

      // Refresh data in parent component
      if (onDataUpdate) {
        onDataUpdate();
      }

      alert('New consignor added successfully!');

    } catch (error) {
      console.error('Error adding consignor:', error);
      alert('Error adding consignor: ' + error.message);
    } finally {
      setAddingConsignor(false);
    }
  };

  const handleAddNewConsignee = async () => {
    if (!newConsigneeData.company_name.trim()) {
      alert('Company name is required');
      return;
    }

    if (consigneeExists) {
      alert('This company name already exists! Please select from suggestions or use a different name.');
      return;
    }

    try {
      setAddingConsignee(true);
      
      const result = await addNewConsignee(newConsigneeData);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Update form data with new consignee
      setFormData(prev => ({
        ...prev,
        consignee_name: result.data.company_name,
        consignee_gst: result.data.gst_num || '',
        consignee_number: result.data.number || ''
      }));

      // Update search field
      setConsigneeSearch(result.data.company_name);

      // Reset add form
      setNewConsigneeData({ company_name: '', gst_num: '', number: '' });
      setConsigneeSuggestions([]);
      setConsigneeExists(false);
      setShowAddConsignee(false);
      setShowConsigneeDropdown(false);

      // Refresh data in parent component
      if (onDataUpdate) {
        onDataUpdate();
      }

      alert('New consignee added successfully!');

    } catch (error) {
      console.error('Error adding consignee:', error);
      alert('Error adding consignee: ' + error.message);
    } finally {
      setAddingConsignee(false);
    }
  };
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl border-2 border-purple-200 shadow-lg">
      {/* Consignor Section */}
      <div className="space-y-4">
        {/* Consignor Name */}
        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap min-w-28 text-center shadow-lg">
            CONSIGNOR
          </span>
          <div className="relative flex-1" ref={consignorRef}>
            <div className="relative">
              <input
                type="text"
                ref={consignorInputRef}
                value={consignorSearch || ''}
                onChange={(e) => handleConsignorSearchChange(e.target.value)}
                onFocus={() => {
                  // Auto-scroll to show consignor section properly
                  setTimeout(() => {
                    const element = consignorInputRef.current;
                    if (element) {
                      element.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start',
                        inline: 'nearest'
                      });
                    }
                  }, 100);
                  
                  if (consignorSearch && consignorSearch.length >= 2) {
                    setShowConsignorDropdown(true);
                  }
                }}
                onKeyDown={handleConsignorKeyDown}
                placeholder="👤 Type to search consignor..."
                className="w-full px-4 py-3 pr-10 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400"
                tabIndex={5}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {!isSearching && consignorSearch && (
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-600" />
              )}
            </div>
                {showConsignorDropdown && (
                <div className="absolute z-30 mt-2 w-80 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs font-bold rounded-t-xl">
                    CONSIGNOR SEARCH RESULTS ({searchResults.consignors.length})
                  </div>
                  
                  {/* Add New Consignor Button */}
                  <button
                    onClick={() => setShowAddConsignor(true)}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 text-sm transition-colors border-b border-purple-200 bg-purple-25"
                  >
                    <div className="flex items-center gap-2 font-medium text-purple-700">
                      <Plus className="w-4 h-4" />
                      Add New Consignor
                    </div>
                  </button>

                  {searchResults.consignors.length > 0 ? (
                    searchResults.consignors.map((consignor, index) => (
                      <button
                        key={consignor.id}
                        onClick={() => handleConsignorSelect(consignor)}
                        className={`w-full px-4 py-3 text-left hover:bg-purple-50 text-sm transition-colors border-b border-purple-100 ${
                          index === consignorSelectedIndex ? 'bg-purple-100' : ''
                        }`}
                      >
                        <div className="font-medium text-black">{consignor.company_name}</div>
                        <div className="text-xs text-gray-600">
                          {consignor.gst_num && `GST: ${consignor.gst_num}`}
                          {consignor.number && ` | Ph: ${consignor.number}`}
                        </div>
                      </button>
                    ))
                  ) : !isSearching && (
                    <div className="px-4 py-3 text-xs text-gray-600">
                      No consignors found for &quot;{consignorSearch}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        {/* Consignor GST and Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap text-center shadow-lg">
              GST NO
            </span>
            <input
              type="text"
              ref={consignorGstRef}
              value={formData.consignor_gst || ''}
              onChange={handleConsignorGSTChange}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 7)}
              className="flex-1 px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400"
              placeholder="📄 Consignor GST (auto-saves)"
              tabIndex={7}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap text-center shadow-lg">
              PHONE
            </span>
            <input
              type="text"
              ref={consignorPhoneRef}
              value={formData.consignor_number || ''}
              onChange={handleConsignorNumberChange}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 8)}
              className="flex-1 px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400"
              placeholder="📞 Consignor Phone (auto-saves)"
              tabIndex={8}
            />
          </div>
        </div>
      </div>

      {/* Consignee Section */}
      <div className="mt-8 space-y-4">
        {/* Consignee Name */}
        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap min-w-28 text-center shadow-lg">
            CONSIGNEE
          </span>
          <div className="relative flex-1" ref={consigneeRef}>
            <div className="relative">
              <input
                type="text"
                ref={consigneeInputRef}
                value={consigneeSearch || ''}
                onChange={(e) => handleConsigneeSearchChange(e.target.value)}
                onFocus={() => {
                  if (consigneeSearch && consigneeSearch.length >= 2) {
                    setShowConsigneeDropdown(true);
                  }
                }}
                onKeyDown={handleConsigneeKeyDown}
                placeholder="🏢 Type to search consignee..."
                className="w-full px-4 py-3 pr-10 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400"
                tabIndex={6}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {!isSearching && consigneeSearch && (
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-600" />
              )}
            </div>
            
            {showConsigneeDropdown && (
              <div className="absolute z-30 mt-2 w-80 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs font-bold rounded-t-xl">
                  CONSIGNEE SEARCH RESULTS ({searchResults.consignees.length})
                </div>
                
                {/* Add New Consignee Button */}
                <button
                  onClick={() => setShowAddConsignee(true)}
                  className="w-full px-4 py-3 text-left hover:bg-purple-50 text-sm transition-colors border-b border-purple-200 bg-purple-25"
                >
                  <div className="flex items-center gap-2 font-medium text-purple-700">
                    <Plus className="w-4 h-4" />
                    Add New Consignee
                  </div>
                </button>

                {searchResults.consignees.length > 0 ? (
                  searchResults.consignees.map((consignee, index) => (
                    <button
                      key={consignee.id}
                      onClick={() => handleConsigneeSelect(consignee)}
                      className={`w-full px-4 py-3 text-left hover:bg-purple-50 text-sm transition-colors border-b border-purple-100 ${
                        index === consigneeSelectedIndex ? 'bg-purple-100' : ''
                      }`}
                    >
                      <div className="font-medium text-black">{consignee.company_name}</div>
                      <div className="text-xs text-gray-600">
                        {consignee.gst_num && `GST: ${consignee.gst_num}`}
                        {consignee.number && ` | Ph: ${consignee.number}`}
                      </div>
                    </button>
                  ))
                ) : !isSearching && (
                  <div className="px-4 py-3 text-xs text-gray-600">
                    No consignees found for &quot;{consigneeSearch}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Consignee GST and Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap text-center shadow-lg">
              GST NO
            </span>
            <input
              type="text"
              ref={consigneeGstRef}
              value={formData.consignee_gst || ''}
              onChange={handleConsigneeGSTChange}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 9)}
              className="flex-1 px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400"
              placeholder="📄 Consignee GST (auto-saves)"
              tabIndex={9}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap text-center shadow-lg">
              PHONE
            </span>
            <input
              type="text"
              ref={consigneePhoneRef}
              value={formData.consignee_number || ''}
              onChange={handleConsigneeNumberChange}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 10)}
              className="flex-1 px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400"
              placeholder="📞 Consignee Phone (auto-saves)"
              tabIndex={10}
            />
          </div>
        </div>
      </div>

      {/* Add New Consignor Modal */}
      {showAddConsignor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center bg-emerald-100 py-2 rounded">
              Add New Consignor
            </h3>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>                <input
                  type="text"
                  value={newConsignorData.company_name || ''}
                  onChange={(e) => setNewConsignorData(prev => ({ ...prev, company_name: e.target.value }))}
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none text-black font-medium ${
                    consignorExists 
                      ? 'border-red-500 focus:border-red-500 bg-red-50' 
                      : 'border-gray-300 focus:border-emerald-500 bg-white'
                  }`}
                  placeholder="Enter company name"
                  autoFocus
                />
                
                {/* Duplicate Warning */}
                {consignorExists && (
                  <div className="flex items-center gap-2 mt-1 text-red-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Company name already exists!</span>
                  </div>
                )}
                
                {/* Suggestions Dropdown */}
                {consignorSuggestions.length > 0 && !consignorExists && (
                  <div className="absolute z-60 mt-1 w-full bg-white border-2 border-emerald-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    <div className="p-2 bg-emerald-100 text-emerald-800 text-xs font-bold">
                      Similar companies found - Click to use existing:
                    </div>
                    {consignorSuggestions.map((consignor) => (
                      <button
                        key={consignor.id}
                        onClick={() => handleConsignorSuggestionSelect(consignor)}
                        className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-sm transition-colors border-b border-emerald-100"
                      >
                        <div className="font-medium text-black">{consignor.company_name}</div>
                        <div className="text-xs text-gray-600">
                          {consignor.gst_num && `GST: ${consignor.gst_num}`}
                          {consignor.number && ` | Ph: ${consignor.number}`}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">GST Number</label>                <input
                  type="text"
                  value={newConsignorData.gst_num || ''}
                  onChange={(e) => setNewConsignorData(prev => ({ ...prev, gst_num: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 text-black font-medium bg-white"
                  placeholder="Enter GST number"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>                <input
                  type="text"
                  value={newConsignorData.number || ''}
                  onChange={(e) => setNewConsignorData(prev => ({ ...prev, number: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 text-black font-medium bg-white"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddNewConsignor}
                disabled={addingConsignor || !newConsignorData.company_name.trim() || consignorExists}
                className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {addingConsignor ? 'Adding...' : 'Add Consignor'}
              </button>
              <button
                onClick={() => {
                  setShowAddConsignor(false);
                  setNewConsignorData({ company_name: '', gst_num: '', number: '' });
                  setConsignorSuggestions([]);
                  setConsignorExists(false);
                }}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-bold hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Consignee Modal */}
      {showAddConsignee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center bg-emerald-100 py-2 rounded">
              Add New Consignee
            </h3>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>                <input
                  type="text"
                  value={newConsigneeData.company_name || ''}
                  onChange={(e) => setNewConsigneeData(prev => ({ ...prev, company_name: e.target.value }))}
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none text-black font-medium ${
                    consigneeExists 
                      ? 'border-red-500 focus:border-red-500 bg-red-50' 
                      : 'border-gray-300 focus:border-emerald-500 bg-white'
                  }`}
                  placeholder="Enter company name"
                  autoFocus
                />
                
                {/* Duplicate Warning */}
                {consigneeExists && (
                  <div className="flex items-center gap-2 mt-1 text-red-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Company name already exists!</span>
                  </div>
                )}
                
                {/* Suggestions Dropdown */}
                {consigneeSuggestions.length > 0 && !consigneeExists && (
                  <div className="absolute z-60 mt-1 w-full bg-white border-2 border-emerald-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    <div className="p-2 bg-emerald-100 text-emerald-800 text-xs font-bold">
                      Similar companies found - Click to use existing:
                    </div>
                    {consigneeSuggestions.map((consignee) => (
                      <button
                        key={consignee.id}
                        onClick={() => handleConsigneeSuggestionSelect(consignee)}
                        className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-sm transition-colors border-b border-emerald-100"
                      >
                        <div className="font-medium text-black">{consignee.company_name}</div>
                        <div className="text-xs text-gray-600">
                          {consignee.gst_num && `GST: ${consignee.gst_num}`}
                          {consignee.number && ` | Ph: ${consignee.number}`}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">GST Number</label>                <input
                  type="text"
                  value={newConsigneeData.gst_num || ''}
                  onChange={(e) => setNewConsigneeData(prev => ({ ...prev, gst_num: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 text-black font-medium bg-white"
                  placeholder="Enter GST number"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>                <input
                  type="text"
                  value={newConsigneeData.number || ''}
                  onChange={(e) => setNewConsigneeData(prev => ({ ...prev, number: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 text-black font-medium bg-white"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddNewConsignee}
                disabled={addingConsignee || !newConsigneeData.company_name.trim() || consigneeExists}
                className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {addingConsignee ? 'Adding...' : 'Add Consignee'}
              </button>
              <button
                onClick={() => {
                  setShowAddConsignee(false);
                  setNewConsigneeData({ company_name: '', gst_num: '', number: '' });
                  setConsigneeSuggestions([]);
                  setConsigneeExists(false);
                }}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-bold hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsignorConsigneeSection;