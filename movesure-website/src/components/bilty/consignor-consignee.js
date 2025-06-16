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
  const { searchResults, isSearching, searchDatabase, clearResults } = useConsignorConsigneeSearch();  // Control dropdown visibility based on search results and exact matches
  useEffect(() => {
    if (searchResults.consignors && consignorSearch && consignorSearch.length >= 2) {
      const exactMatch = searchResults.consignors.find(
        c => c.company_name.toLowerCase() === consignorSearch.toLowerCase()
      );
      // Only show dropdown if no exact match, input is focused, and has results
      if (!exactMatch && document.activeElement === consignorInputRef.current && searchResults.consignors.length > 0) {
        setShowConsignorDropdown(true);
        
        // Auto-select if only one option available
        if (searchResults.consignors.length === 1) {
          console.log('🚀 Fast auto-selecting single consignor option:', searchResults.consignors[0].company_name);
          setTimeout(() => {
            handleConsignorSelect(searchResults.consignors[0]);
          }, 100);
        }
      } else {
        setShowConsignorDropdown(false);
      }
    } else {
      setShowConsignorDropdown(false);
    }
  }, [searchResults.consignors, consignorSearch]);

  useEffect(() => {
    if (searchResults.consignees && consigneeSearch && consigneeSearch.length >= 2) {
      const exactMatch = searchResults.consignees.find(
        c => c.company_name.toLowerCase() === consigneeSearch.toLowerCase()
      );
      // Only show dropdown if no exact match, input is focused, and has results
      if (!exactMatch && document.activeElement === consigneeInputRef.current && searchResults.consignees.length > 0) {
        setShowConsigneeDropdown(true);
        
        // Auto-select if only one option available
        if (searchResults.consignees.length === 1) {
          console.log('🚀 Fast auto-selecting single consignee option:', searchResults.consignees[0].company_name);
          setTimeout(() => {
            handleConsigneeSelect(searchResults.consignees[0]);
          }, 100);
        }
      } else {
        setShowConsigneeDropdown(false);
      }
    } else {
      setShowConsigneeDropdown(false);
    }
  }, [searchResults.consignees, consigneeSearch]);
  // Initialize search values when formData changes (for edit mode)
  useEffect(() => {
    if (formData.consignor_name && consignorSearch !== formData.consignor_name) {
      setConsignorSearch(formData.consignor_name);
    }
    if (formData.consignee_name && consigneeSearch !== formData.consignee_name) {
      setConsigneeSearch(formData.consignee_name);
    }
  }, [formData.consignor_name, formData.consignee_name]);
  // Simple tab navigation using standard tabIndex

  // Register inputs for navigation
  useEffect(() => {
    if (consignorInputRef.current) {
      register(5, consignorInputRef.current, {
        beforeFocus: () => {
          console.log('🎯 Focusing on Consignor input');
        },
        skipCondition: () => showConsignorDropdown && searchResults.consignors?.length > 0
      });
    }
    if (consignorGstRef.current) {
      register(6, consignorGstRef.current);
    }
    if (consignorPhoneRef.current) {
      register(7, consignorPhoneRef.current);
    }
    if (consigneeInputRef.current) {
      register(8, consigneeInputRef.current, {
        beforeFocus: () => {
          console.log('🎯 Focusing on Consignee input');
        },
        skipCondition: () => showConsigneeDropdown && searchResults.consignees?.length > 0
      });
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
      unregister(10);
    };
  }, [register, unregister]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (consignorRef.current && !consignorRef.current.contains(event.target)) {
        setShowConsignorDropdown(false);
        setConsignorSelectedIndex(-1);
      }
      if (consigneeRef.current && !consigneeRef.current.contains(event.target)) {
        setShowConsigneeDropdown(false);
        setConsigneeSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);  // Handle consignor search with optimized database query
  const handleConsignorSearchChange = (value) => {
    console.log('🎯 Consignor search changed:', value);
    
    // Update search state immediately
    setConsignorSearch(value);
    
    // Update form data immediately and synchronously
    setFormData(prev => {
      const updated = { ...prev, consignor_name: value };
      console.log('🔄 Updated formData.consignor_name:', updated.consignor_name);
      return updated;
    });
    
    if (value.length >= 2) {
      searchDatabase(value, 'consignors');
      
      // Enhanced auto-selection: check for single option after search results update
      setTimeout(() => {
        if (searchResults.consignors?.length === 1) {
          console.log('🎯 Auto-selecting single consignor option:', searchResults.consignors[0].company_name);
          handleConsignorSelect(searchResults.consignors[0]);
        }
      }, 200); // Reduced timeout for faster response
    } else {
      setShowConsignorDropdown(false);
      clearResults();
    }
    setConsignorSelectedIndex(-1);
  };  // Handle consignee search with optimized database query
  const handleConsigneeSearchChange = (value) => {
    console.log('🎯 Consignee search changed:', value);
    
    // Update search state immediately
    setConsigneeSearch(value);
    
    // Update form data immediately and synchronously
    setFormData(prev => {
      const updated = { ...prev, consignee_name: value };
      console.log('🔄 Updated formData.consignee_name:', updated.consignee_name);
      return updated;
    });
    
    if (value.length >= 2) {
      searchDatabase(value, 'consignees');
      
      // Enhanced auto-selection: check for single option after search results update
      setTimeout(() => {
        if (searchResults.consignees?.length === 1) {
          console.log('🎯 Auto-selecting single consignee option:', searchResults.consignees[0].company_name);
          handleConsigneeSelect(searchResults.consignees[0]);
        }
      }, 200); // Reduced timeout for faster response
    } else {
      setShowConsigneeDropdown(false);
      clearResults();
    }
    setConsigneeSelectedIndex(-1);
  };const handleConsignorSelect = async (consignor) => {
    console.log('🎯 Consignor selected:', consignor.company_name);
    setConsignorSearch(consignor.company_name);
    
    // Update consignor details
    setFormData(prev => {
      const updatedData = {
        ...prev,
        consignor_name: consignor.company_name,
        consignor_gst: consignor.gst_num || '',
        consignor_number: consignor.number || ''
      };
      
      console.log('🔄 Updated consignor formData:', {
        consignor_name: updatedData.consignor_name,
        consignor_gst: updatedData.consignor_gst,
        consignor_number: updatedData.consignor_number
      });
      
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
    
    // Focus back to the input to maintain navigation flow
    if (consignorInputRef.current) {
      consignorInputRef.current.focus();
    }
  };
  const handleConsigneeSelect = async (consignee) => {
    console.log('🎯 Consignee selected:', consignee.company_name);
    setConsigneeSearch(consignee.company_name);
    
    setFormData(prev => {
      const updatedData = {
        ...prev,
        consignee_name: consignee.company_name,
        consignee_gst: consignee.gst_num || '',
        consignee_number: consignee.number || ''
      };
      
      console.log('🔄 Updated consignee formData:', {
        consignee_name: updatedData.consignee_name,
        consignee_gst: updatedData.consignee_gst,
        consignee_number: updatedData.consignee_number
      });
      
      return updatedData;
    });setShowConsigneeDropdown(false);
    setConsigneeSelectedIndex(-1);
    clearResults();
    
    // Focus back to the input to maintain navigation flow
    if (consigneeInputRef.current) {
      consigneeInputRef.current.focus();
    }
  };  // Handle phone number updates for existing consignors/consignees
  const handleConsignorNumberChange = async (e) => {
    const newNumber = e.target.value;
    console.log('🎯 Consignor number changed:', newNumber);
    
    // Update form data immediately
    setFormData(prev => {
      const updated = { ...prev, consignor_number: newNumber };
      console.log('🔄 Updated formData.consignor_number:', updated.consignor_number);
      return updated;
    });
    
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
    console.log('🎯 Consignee number changed:', newNumber);
    
    // Update form data immediately
    setFormData(prev => {
      const updated = { ...prev, consignee_number: newNumber };
      console.log('🔄 Updated formData.consignee_number:', updated.consignee_number);
      return updated;
    });
    
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
    console.log('🎯 Consignor GST changed:', newGST);
    
    // Update form data immediately
    setFormData(prev => {
      const updated = { ...prev, consignor_gst: newGST };
      console.log('🔄 Updated formData.consignor_gst:', updated.consignor_gst);
      return updated;
    });
    
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
    console.log('🎯 Consignee GST changed:', newGST);
    
    // Update form data immediately
    setFormData(prev => {
      const updated = { ...prev, consignee_gst: newGST };
      console.log('🔄 Updated formData.consignee_gst:', updated.consignee_gst);
      return updated;
    });
    
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
  };  // Keyboard navigation with Enter and Tab support
  const handleConsignorKeyDown = (e) => {
    // Handle dropdown navigation
    if (showConsignorDropdown && searchResults.consignors.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const newDownIndex = consignorSelectedIndex < searchResults.consignors.length - 1 ? consignorSelectedIndex + 1 : 0;
          setConsignorSelectedIndex(newDownIndex);
          // Auto-scroll to selected option
          setTimeout(() => {
            const dropdown = consignorRef.current?.querySelector('.dropdown-open');
            const selectedOption = dropdown?.querySelector(`[data-index="${newDownIndex}"]`);
            if (selectedOption && dropdown) {
              selectedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const newUpIndex = consignorSelectedIndex > 0 ? consignorSelectedIndex - 1 : searchResults.consignors.length - 1;
          setConsignorSelectedIndex(newUpIndex);
          // Auto-scroll to selected option
          setTimeout(() => {
            const dropdown = consignorRef.current?.querySelector('.dropdown-open');
            const selectedOption = dropdown?.querySelector(`[data-index="${newUpIndex}"]`);
            if (selectedOption && dropdown) {
              selectedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 10);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          console.log(`🎯 ${e.key} key pressed on consignor dropdown - selecting option`);
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
      }    } else {
      // No custom navigation - let browser handle Tab naturally
    }
  };
  const handleConsigneeKeyDown = (e) => {
    // Handle dropdown navigation
    if (showConsigneeDropdown && searchResults.consignees.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const newDownIndex = consigneeSelectedIndex < searchResults.consignees.length - 1 ? consigneeSelectedIndex + 1 : 0;
          setConsigneeSelectedIndex(newDownIndex);
          // Auto-scroll to selected option
          setTimeout(() => {
            const dropdown = consigneeRef.current?.querySelector('.dropdown-open');
            const selectedOption = dropdown?.querySelector(`[data-index="${newDownIndex}"]`);
            if (selectedOption && dropdown) {
              selectedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const newUpIndex = consigneeSelectedIndex > 0 ? consigneeSelectedIndex - 1 : searchResults.consignees.length - 1;
          setConsigneeSelectedIndex(newUpIndex);
          // Auto-scroll to selected option
          setTimeout(() => {
            const dropdown = consigneeRef.current?.querySelector('.dropdown-open');
            const selectedOption = dropdown?.querySelector(`[data-index="${newUpIndex}"]`);
            if (selectedOption && dropdown) {
              selectedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 10);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          console.log(`🎯 ${e.key} key pressed on consignee dropdown - selecting option`);
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
      }    } else {
      // No custom navigation - let browser handle Tab naturally
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
  };  const handleAddNewConsignor = async () => {
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
            <div className="relative">              <input
                type="text"
                ref={consignorInputRef}
                value={consignorSearch || ''}
                onChange={(e) => {
                  console.log('🎯 Consignor input onChange triggered with value:', e.target.value);
                  handleConsignorSearchChange(e.target.value);
                }}                onFocus={() => {
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
                  
                  // Only show dropdown if search is valid and we have results
                  if (consignorSearch && consignorSearch.length >= 2) {
                    searchDatabase(consignorSearch, 'consignors');
                  }
                }}
                onBlur={() => {
                  // Close dropdown when input loses focus
                  setTimeout(() => {
                    setShowConsignorDropdown(false);
                    setConsignorSelectedIndex(-1);
                  }, 150); // Small delay to allow dropdown clicks
                }}                onKeyDown={handleConsignorKeyDown}
                placeholder="👤 Type to search consignor..."
                className="w-full px-4 py-3 pr-10 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400 dropdown-input"
                tabIndex={5}
                aria-expanded={showConsignorDropdown}
                role="combobox"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {!isSearching && consignorSearch && (
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-600" />
              )}
            </div>                {showConsignorDropdown && (
                <div className="absolute z-30 mt-2 w-80 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto dropdown-open autocomplete-open">
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
                  </button>                  {searchResults.consignors.length > 0 ? (
                    searchResults.consignors.map((consignor, index) => (
                      <button
                        key={consignor.id}
                        data-index={index}
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
            </span>            <input
              type="text"
              ref={consignorGstRef}
              value={formData.consignor_gst || ''}              onChange={handleConsignorGSTChange}
              className="flex-1 px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400"              placeholder="📄 Consignor GST (auto-saves)"
              tabIndex={6}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap text-center shadow-lg">
              PHONE
            </span>
            <input
              type="text"
              ref={consignorPhoneRef}
              value={formData.consignor_number || ''}              onChange={handleConsignorNumberChange}
              className="flex-1 px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400"
              placeholder="📞 Consignor Phone (auto-saves)"
              tabIndex={7}
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
                onChange={(e) => {
                  console.log('🎯 Consignee input onChange triggered with value:', e.target.value);
                  handleConsigneeSearchChange(e.target.value);
                }}                onFocus={() => {
                  // Only show dropdown if search is valid and we have results
                  if (consigneeSearch && consigneeSearch.length >= 2) {
                    searchDatabase(consigneeSearch, 'consignees');
                  }
                }}
                onBlur={() => {
                  // Close dropdown when input loses focus
                  setTimeout(() => {
                    setShowConsigneeDropdown(false);
                    setConsigneeSelectedIndex(-1);
                  }, 150); // Small delay to allow dropdown clicks
                }}                onKeyDown={handleConsigneeKeyDown}                placeholder="🏢 Type to search consignee..."
                className="w-full px-4 py-3 pr-10 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400 dropdown-input"
                tabIndex={8}
                aria-expanded={showConsigneeDropdown}
                role="combobox"
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
              <div className="absolute z-30 mt-2 w-80 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto dropdown-open autocomplete-open">
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
                </button>                {searchResults.consignees.length > 0 ? (
                  searchResults.consignees.map((consignee, index) => (
                    <button
                      key={consignee.id}
                      data-index={index}
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
              value={formData.consignee_gst || ''}              onChange={handleConsigneeGSTChange}
              className="flex-1 px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl bg-white shadow-md placeholder-gray-500 text-input-focus transition-all duration-200 hover:border-purple-400"              placeholder="📄 Consignee GST (auto-saves)"
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
              value={formData.consignee_number || ''}              onChange={handleConsigneeNumberChange}
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