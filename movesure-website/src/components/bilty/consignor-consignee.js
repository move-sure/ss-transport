'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, AlertTriangle, Search, X, CheckCircle } from 'lucide-react';
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
  getSimilarConsignees,
  getConsigneeLastCity,
  findConsignorByGST,
  findConsigneeByGST
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
  
  // Last city for consignee (from most recent bilty)
  const [consigneeLastCity, setConsigneeLastCity] = useState(null);
  
  // New entry tracking
  const [isNewConsignor, setIsNewConsignor] = useState(false);
  const [isNewConsignee, setIsNewConsignee] = useState(false);
  const [newConsignorSaved, setNewConsignorSaved] = useState(false);
  const [newConsigneeSaved, setNewConsigneeSaved] = useState(false);
    const consignorRef = useRef(null);
  const consigneeRef = useRef(null);
  const consignorInputRef = useRef(null);
  const consigneeInputRef = useRef(null);
  const consignorGstRef = useRef(null);
  const consignorPhoneRef = useRef(null);
  const consigneeGstRef = useRef(null);
  const consigneePhoneRef = useRef(null);
  
  // Refs to store the selected name from dropdown (for auto-correction when moving to GST)
  const selectedConsignorNameRef = useRef(null);
  const selectedConsigneeNameRef = useRef(null);
  
  // Input navigation
  const { register, unregister, handleEnter } = useInputNavigation();
  // Use the optimized search hook
  const { searchResults, isSearching, searchDatabase, clearResults } = useConsignorConsigneeSearch();  // Control dropdown visibility and auto-selection
  useEffect(() => {
    if (consignorSearch && consignorSearch.length >= 1 && document.activeElement === consignorInputRef.current) {
      setShowConsignorDropdown(true);
      
      // Auto-select if only one exact prefix match available
      if (searchResults.consignors && searchResults.consignors.length > 0) {
        const filteredResults = searchResults.consignors.filter(c => 
          c.company_name.toLowerCase().startsWith(consignorSearch.toLowerCase())
        );
        if (filteredResults.length === 1) {
          console.log('🚀 Auto-selecting single consignor option:', filteredResults[0].company_name);
          setTimeout(() => {
            handleConsignorSelect(filteredResults[0]);
          }, 200);
        }
      }
    } else {
      setShowConsignorDropdown(false);
    }
  }, [consignorSearch, searchResults.consignors]);

  useEffect(() => {
    if (consigneeSearch && consigneeSearch.length >= 1 && document.activeElement === consigneeInputRef.current) {
      setShowConsigneeDropdown(true);
      
      // Auto-select if only one exact prefix match available
      if (searchResults.consignees && searchResults.consignees.length > 0) {
        const filteredResults = searchResults.consignees.filter(c => 
          c.company_name.toLowerCase().startsWith(consigneeSearch.toLowerCase())
        );
        if (filteredResults.length === 1) {
          console.log('🚀 Auto-selecting single consignee option:', filteredResults[0].company_name);
          setTimeout(() => {
            handleConsigneeSelect(filteredResults[0]);
          }, 200);
        }
      }
    } else {
      setShowConsigneeDropdown(false);
    }
  }, [consigneeSearch, searchResults.consignees]);
  // Initialize search values when formData changes (for edit mode)
  useEffect(() => {
    if (formData.consignor_name && consignorSearch !== formData.consignor_name) {
      setConsignorSearch(formData.consignor_name);
    }
    if (formData.consignee_name && consigneeSearch !== formData.consignee_name) {
      setConsigneeSearch(formData.consignee_name);
    }
    // Clear states when names are cleared (e.g., form reset)
    if (!formData.consignee_name) {
      setConsigneeLastCity(null);
      setConsigneeSearch('');
      selectedConsigneeNameRef.current = null;
      setIsNewConsignee(false);
      setNewConsigneeSaved(false);
    }
    if (!formData.consignor_name) {
      setConsignorSearch('');
      selectedConsignorNameRef.current = null;
      setIsNewConsignor(false);
      setNewConsignorSaved(false);
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
  }, []);  // Handle consignor search with exact prefix matching
  const handleConsignorSearchChange = (value) => {
    // Convert to uppercase immediately
    const upperValue = value.toUpperCase();
    console.log('🎯 Consignor search changed:', upperValue);
    
    // If user types after selecting from dropdown, clear the selected ref
    // (they are intentionally changing the name)
    if (selectedConsignorNameRef.current && upperValue !== selectedConsignorNameRef.current) {
      selectedConsignorNameRef.current = null;
      setIsNewConsignor(false);
      setNewConsignorSaved(false);
      // Clear GST and phone since name is changing
      setFormData(prev => ({
        ...prev,
        consignor_name: upperValue,
        consignor_gst: '',
        consignor_number: ''
      }));
      setConsignorSearch(upperValue);
      if (upperValue.length >= 1) {
        searchDatabase(upperValue, 'consignors');
      }
      setConsignorSelectedIndex(-1);
      return;
    }
    
    // Update search state immediately
    setConsignorSearch(upperValue);
    
    // Update form data immediately and synchronously
    setFormData(prev => {
      const updated = { ...prev, consignor_name: upperValue };
      console.log('🔄 Updated formData.consignor_name:', updated.consignor_name);
      return updated;
    });
      // Clear GST and phone when clearing consignor name
    if (!upperValue || upperValue.length === 0) {
      setFormData(prev => ({
        ...prev,
        consignor_name: '',
        consignor_gst: '',
        consignor_number: ''
      }));
      setShowConsignorDropdown(false);
      clearResults();
      setConsignorSelectedIndex(-1);
      return;
    }
    
    // Always search when user types (even 1 character)
    if (upperValue.length >= 1) {
      searchDatabase(upperValue, 'consignors');
    } else {
      clearResults();
    }
    setConsignorSelectedIndex(-1);
  };  // Handle consignee search with exact prefix matching
  const handleConsigneeSearchChange = (value) => {
    // Convert to uppercase immediately
    const upperValue = value.toUpperCase();
    console.log('🎯 Consignee search changed:', upperValue);
    
    // Clear last city when user is typing (not when selecting)
    setConsigneeLastCity(null);
    
    // If user types after selecting from dropdown, clear the selected ref
    if (selectedConsigneeNameRef.current && upperValue !== selectedConsigneeNameRef.current) {
      selectedConsigneeNameRef.current = null;
      setIsNewConsignee(false);
      setNewConsigneeSaved(false);
      // Clear GST and phone since name is changing
      setFormData(prev => ({
        ...prev,
        consignee_name: upperValue,
        consignee_gst: '',
        consignee_number: ''
      }));
      setConsigneeSearch(upperValue);
      if (upperValue.length >= 1) {
        searchDatabase(upperValue, 'consignees');
      }
      setConsigneeSelectedIndex(-1);
      return;
    }
    
    // Update search state immediately
    setConsigneeSearch(upperValue);
    
    // Update form data immediately and synchronously
    setFormData(prev => {
      const updated = { ...prev, consignee_name: upperValue };
      console.log('🔄 Updated formData.consignee_name:', updated.consignee_name);
      return updated;
    });
      // Clear GST and phone when clearing consignee name
    if (!upperValue || upperValue.length === 0) {
      setFormData(prev => ({
        ...prev,
        consignee_name: '',
        consignee_gst: '',
        consignee_number: ''
      }));
      setShowConsigneeDropdown(false);
      clearResults();
      setConsigneeSelectedIndex(-1);
      setConsigneeLastCity(null);
      return;
    }
    
    // Always search when user types (even 1 character)
    if (upperValue.length >= 1) {
      searchDatabase(upperValue, 'consignees');
    } else {
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
    
    // Remember the selected name for auto-correction
    selectedConsignorNameRef.current = consignor.company_name;
    setIsNewConsignor(false);
    setNewConsignorSaved(false);
    
    // Focus back to the input to maintain navigation flow
    if (consignorInputRef.current) {
      consignorInputRef.current.focus();
    }
  };
  const handleConsigneeSelect = async (consignee) => {
    console.log('🎯 Consignee selected:', consignee.company_name);
    setConsigneeSearch(consignee.company_name);
    
    // Fetch last city for this consignee from their most recent bilty
    const lastCity = await getConsigneeLastCity(consignee.company_name);
    setConsigneeLastCity(lastCity);
    if (lastCity) {
      console.log('📍 Consignee last city:', lastCity.city_name);
    }
    
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
    
    // Remember the selected name for auto-correction
    selectedConsigneeNameRef.current = consignee.company_name;
    setIsNewConsignee(false);
    setNewConsigneeSaved(false);
    
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
    
    // If consignor exists in DB and number is being updated, save to database
    // Skip for new consignors (not yet saved) - will be saved with bilty
    if (formData.consignor_name && newNumber && newNumber.length >= 10 && !isNewConsignor) {
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
    
    // If consignee exists in DB and number is being updated, save to database
    // Skip for new consignees (not yet saved) - will be saved with bilty
    if (formData.consignee_name && newNumber && newNumber.length >= 10 && !isNewConsignee) {
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
    const newGST = e.target.value.toUpperCase();
    console.log('🎯 Consignor GST changed:', newGST);
    
    // Update form data immediately
    setFormData(prev => {
      const updated = { ...prev, consignor_gst: newGST };
      return updated;
    });
    
    // When GST is 15 chars (valid GSTIN length), check if another consignor already has this GST
    if (newGST && newGST.trim().length >= 15) {
      try {
        const existingConsignor = await findConsignorByGST(newGST);
        if (existingConsignor && existingConsignor.company_name.trim().toUpperCase() !== (formData.consignor_name || '').trim().toUpperCase()) {
          // Found a different consignor with same GST - auto-switch to existing one
          console.log('🔄 GST duplicate found! Switching consignor from', formData.consignor_name, 'to', existingConsignor.company_name);
          
          setConsignorSearch(existingConsignor.company_name);
          selectedConsignorNameRef.current = existingConsignor.company_name;
          setIsNewConsignor(false);
          setNewConsignorSaved(false);
          
          setFormData(prev => ({
            ...prev,
            consignor_name: existingConsignor.company_name,
            consignor_gst: existingConsignor.gst_num || newGST,
            consignor_number: existingConsignor.number || prev.consignor_number
          }));
          
          // Dispatch event for rate lookup with new consignor
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('consignorSelected', {
              detail: { consignor: existingConsignor, cityId: formData.to_city_id }
            }));
          }
          return;
        }
        // GST doesn't belong to another consignor - update the current consignor's GST in DB
        // Skip for new consignors (not yet saved) - will be saved with bilty
        if (formData.consignor_name && !isNewConsignor) {
          const result = await updateConsignorGST(formData.consignor_name, newGST);
          if (result.success) {
            console.log('Consignor GST updated successfully');
          }
        }
      } catch (error) {
        console.error('Error checking/updating consignor GST:', error);
      }
    }
  };

  const handleConsigneeGSTChange = async (e) => {
    const newGST = e.target.value.toUpperCase();
    console.log('🎯 Consignee GST changed:', newGST);
    
    // Update form data immediately
    setFormData(prev => {
      const updated = { ...prev, consignee_gst: newGST };
      return updated;
    });
    
    // When GST is 15 chars (valid GSTIN length), check if another consignee already has this GST
    if (newGST && newGST.trim().length >= 15) {
      try {
        const existingConsignee = await findConsigneeByGST(newGST);
        if (existingConsignee && existingConsignee.company_name.trim().toUpperCase() !== (formData.consignee_name || '').trim().toUpperCase()) {
          // Found a different consignee with same GST - auto-switch to existing one
          console.log('🔄 GST duplicate found! Switching consignee from', formData.consignee_name, 'to', existingConsignee.company_name);
          
          setConsigneeSearch(existingConsignee.company_name);
          selectedConsigneeNameRef.current = existingConsignee.company_name;
          setIsNewConsignee(false);
          setNewConsigneeSaved(false);
          
          // Fetch last city for the switched consignee
          const lastCity = await getConsigneeLastCity(existingConsignee.company_name);
          setConsigneeLastCity(lastCity);
          
          setFormData(prev => ({
            ...prev,
            consignee_name: existingConsignee.company_name,
            consignee_gst: existingConsignee.gst_num || newGST,
            consignee_number: existingConsignee.number || prev.consignee_number
          }));
          return;
        }
        // GST doesn't belong to another consignee - update the current consignee's GST in DB
        // Skip for new consignees (not yet saved) - will be saved with bilty
        if (formData.consignee_name && !isNewConsignee) {
          const result = await updateConsigneeGST(formData.consignee_name, newGST);
          if (result.success) {
            console.log('Consignee GST updated successfully');
          }
        }
      } catch (error) {
        console.error('Error checking/updating consignee GST:', error);
      }
    }
  };  // Keyboard navigation with Enter and Tab support
  const handleConsignorKeyDown = (e) => {
    // Handle dropdown navigation
    if (showConsignorDropdown && searchResults.consignors && searchResults.consignors.length > 0) {
      const filteredConsignors = searchResults.consignors.filter(c => 
        c.company_name.toLowerCase().startsWith(consignorSearch.toLowerCase())
      );
      
      if (filteredConsignors.length === 0) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const newDownIndex = consignorSelectedIndex < filteredConsignors.length - 1 ? consignorSelectedIndex + 1 : 0;
          setConsignorSelectedIndex(newDownIndex);
          // Auto-scroll to selected option
          setTimeout(() => {
            const selectedOption = document.querySelector(`[data-consignor-index="${newDownIndex}"]`);
            if (selectedOption) {
              selectedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const newUpIndex = consignorSelectedIndex > 0 ? consignorSelectedIndex - 1 : filteredConsignors.length - 1;
          setConsignorSelectedIndex(newUpIndex);
          // Auto-scroll to selected option
          setTimeout(() => {
            const selectedOption = document.querySelector(`[data-consignor-index="${newUpIndex}"]`);
            if (selectedOption) {
              selectedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 10);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          console.log(`🎯 ${e.key} key pressed on consignor dropdown - selecting option`);
          if (consignorSelectedIndex >= 0 && filteredConsignors[consignorSelectedIndex]) {
            handleConsignorSelect(filteredConsignors[consignorSelectedIndex]);
          } else if (filteredConsignors.length > 0) {
            handleConsignorSelect(filteredConsignors[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowConsignorDropdown(false);
          setConsignorSelectedIndex(-1);
          break;
      }
    } else {
      // Only handle navigation keys when not in dropdown mode
      if (e.key === 'Enter') {
        e.preventDefault();
        // Move to next field using input navigation
        handleEnter(e, 5);
      }
      // Let Tab work naturally - don't interfere
    }
  };  const handleConsigneeKeyDown = (e) => {
    // Handle dropdown navigation
    if (showConsigneeDropdown && searchResults.consignees && searchResults.consignees.length > 0) {
      const filteredConsignees = searchResults.consignees.filter(c => 
        c.company_name.toLowerCase().startsWith(consigneeSearch.toLowerCase())
      );
      
      if (filteredConsignees.length === 0) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const newDownIndex = consigneeSelectedIndex < filteredConsignees.length - 1 ? consigneeSelectedIndex + 1 : 0;
          setConsigneeSelectedIndex(newDownIndex);
          // Auto-scroll to selected option
          setTimeout(() => {
            const selectedOption = document.querySelector(`[data-consignee-index="${newDownIndex}"]`);
            if (selectedOption) {
              selectedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const newUpIndex = consigneeSelectedIndex > 0 ? consigneeSelectedIndex - 1 : filteredConsignees.length - 1;
          setConsigneeSelectedIndex(newUpIndex);
          // Auto-scroll to selected option
          setTimeout(() => {
            const selectedOption = document.querySelector(`[data-consignee-index="${newUpIndex}"]`);
            if (selectedOption) {
              selectedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 10);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          console.log(`🎯 ${e.key} key pressed on consignee dropdown - selecting option`);
          if (consigneeSelectedIndex >= 0 && filteredConsignees[consigneeSelectedIndex]) {
            handleConsigneeSelect(filteredConsignees[consigneeSelectedIndex]);
          } else if (filteredConsignees.length > 0) {
            handleConsigneeSelect(filteredConsignees[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowConsigneeDropdown(false);
          setConsigneeSelectedIndex(-1);
          break;
      }
    } else {
      // Only handle navigation keys when not in dropdown mode
      if (e.key === 'Enter') {
        e.preventDefault();
        // Move to next field using input navigation
        handleEnter(e, 8);
      }
      // Let Tab work naturally - don't interfere
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

    // Check if GST already exists for another consignor
    if (newConsignorData.gst_num && newConsignorData.gst_num.trim().length >= 15) {
      const existingByGST = await findConsignorByGST(newConsignorData.gst_num);
      if (existingByGST) {
        // GST already belongs to another consignor - use existing one
        console.log('🔄 GST already exists for consignor:', existingByGST.company_name);
        setFormData(prev => ({
          ...prev,
          consignor_name: existingByGST.company_name,
          consignor_gst: existingByGST.gst_num || '',
          consignor_number: existingByGST.number || ''
        }));
        setConsignorSearch(existingByGST.company_name);
        selectedConsignorNameRef.current = existingByGST.company_name;
        setNewConsignorData({ company_name: '', gst_num: '', number: '' });
        setConsignorSuggestions([]);
        setConsignorExists(false);
        setShowAddConsignor(false);
        setShowConsignorDropdown(false);
        alert(`GST ${newConsignorData.gst_num} already belongs to "${existingByGST.company_name}". Using existing consignor.`);
        return;
      }
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

    // Check if GST already exists for another consignee
    if (newConsigneeData.gst_num && newConsigneeData.gst_num.trim().length >= 15) {
      const existingByGST = await findConsigneeByGST(newConsigneeData.gst_num);
      if (existingByGST) {
        // GST already belongs to another consignee - use existing one
        console.log('🔄 GST already exists for consignee:', existingByGST.company_name);
        setFormData(prev => ({
          ...prev,
          consignee_name: existingByGST.company_name,
          consignee_gst: existingByGST.gst_num || '',
          consignee_number: existingByGST.number || ''
        }));
        setConsigneeSearch(existingByGST.company_name);
        selectedConsigneeNameRef.current = existingByGST.company_name;
        setNewConsigneeData({ company_name: '', gst_num: '', number: '' });
        setConsigneeSuggestions([]);
        setConsigneeExists(false);
        setShowAddConsignee(false);
        setShowConsigneeDropdown(false);
        alert(`GST ${newConsigneeData.gst_num} already belongs to "${existingByGST.company_name}". Using existing consignee.`);
        return;
      }
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
  // Auto-correct consignor name when user moves to GST field
  // If a consignor was selected from dropdown but user typed extra chars, revert to selected name
  const autoCorrectConsignorName = () => {
    if (selectedConsignorNameRef.current && consignorSearch !== selectedConsignorNameRef.current) {
      console.log('🔧 Auto-correcting consignor name from', consignorSearch, 'to', selectedConsignorNameRef.current);
      setConsignorSearch(selectedConsignorNameRef.current);
      setFormData(prev => ({
        ...prev,
        consignor_name: selectedConsignorNameRef.current
      }));
    }
  };

  // Auto-correct consignee name when user moves to GST field
  const autoCorrectConsigneeName = () => {
    if (selectedConsigneeNameRef.current && consigneeSearch !== selectedConsigneeNameRef.current) {
      console.log('🔧 Auto-correcting consignee name from', consigneeSearch, 'to', selectedConsigneeNameRef.current);
      setConsigneeSearch(selectedConsigneeNameRef.current);
      setFormData(prev => ({
        ...prev,
        consignee_name: selectedConsigneeNameRef.current
      }));
    }
  };

  // Auto-save new consignor to database (called when user leaves name and goes to GST)
  // Detect new consignor (does NOT save to DB - saved only when bilty is created)
  const autoSaveNewConsignor = async (nameToSave) => {
    const name = nameToSave || consignorSearch;
    if (!name || !name.trim() || name.trim().length < 2) return;
    // Don't detect if a consignor was selected from dropdown
    if (selectedConsignorNameRef.current) return;
    
    try {
      // Check if already exists (exact name match)
      const isDuplicate = await checkDuplicateConsignor(name);
      if (isDuplicate) {
        setIsNewConsignor(false);
        return;
      }
      
      // Also check if current GST already belongs to an existing consignor
      if (formData.consignor_gst && formData.consignor_gst.trim().length >= 15) {
        const existingByGST = await findConsignorByGST(formData.consignor_gst);
        if (existingByGST) {
          console.log('🔄 GST already exists for consignor:', existingByGST.company_name, '- skipping auto-save');
          // Auto-switch to the existing consignor
          setConsignorSearch(existingByGST.company_name);
          selectedConsignorNameRef.current = existingByGST.company_name;
          setIsNewConsignor(false);
          setFormData(prev => ({
            ...prev,
            consignor_name: existingByGST.company_name,
            consignor_gst: existingByGST.gst_num || prev.consignor_gst,
            consignor_number: existingByGST.number || prev.consignor_number
          }));
          return;
        }
      }
      
      // Mark as new consignor - will be saved to DB when bilty is created
      console.log('📋 New consignor detected (will save with bilty):', name);
      selectedConsignorNameRef.current = name.trim();
      setIsNewConsignor(true);
    } catch (error) {
      console.error('Error detecting new consignor:', error);
    }
  };

  // Detect new consignee (does NOT save to DB - saved only when bilty is created)
  const autoSaveNewConsignee = async (nameToSave) => {
    const name = nameToSave || consigneeSearch;
    if (!name || !name.trim() || name.trim().length < 2) return;
    // Don't detect if a consignee was selected from dropdown
    if (selectedConsigneeNameRef.current) return;
    
    try {
      // Check if already exists (exact name match)
      const isDuplicate = await checkDuplicateConsignee(name);
      if (isDuplicate) {
        setIsNewConsignee(false);
        return;
      }
      
      // Also check if current GST already belongs to an existing consignee
      if (formData.consignee_gst && formData.consignee_gst.trim().length >= 15) {
        const existingByGST = await findConsigneeByGST(formData.consignee_gst);
        if (existingByGST) {
          console.log('🔄 GST already exists for consignee:', existingByGST.company_name, '- skipping auto-save');
          // Auto-switch to the existing consignee
          setConsigneeSearch(existingByGST.company_name);
          selectedConsigneeNameRef.current = existingByGST.company_name;
          setIsNewConsignee(false);
          setFormData(prev => ({
            ...prev,
            consignee_name: existingByGST.company_name,
            consignee_gst: existingByGST.gst_num || prev.consignee_gst,
            consignee_number: existingByGST.number || prev.consignee_number
          }));
          return;
        }
      }
      
      // Mark as new consignee - will be saved to DB when bilty is created
      console.log('📋 New consignee detected (will save with bilty):', name);
      selectedConsigneeNameRef.current = name.trim();
      setIsNewConsignee(true);
    } catch (error) {
      console.error('Error detecting new consignee:', error);
    }
  };

  return (
    <div className="bg-white/95 p-3 rounded-lg border border-slate-200 shadow-sm space-y-3">
      {/* Consignor Section - Single Row */}
      <div className="grid grid-cols-12 gap-2 items-center">
        {/* Consignor Label + Status Badge */}
        <div className="col-span-1">
          <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap text-center shadow-sm block">
            CONSIGNOR
          </span>
          {newConsignorSaved && (
            <span className="mt-1 flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5 animate-pulse">
              <CheckCircle className="w-3 h-3" /> NEW ✓
            </span>
          )}
        </div>
        
        {/* Consignor Name */}
        <div className="col-span-5 relative" ref={consignorRef}>
          <div className="relative">
            <input
              type="text"
              ref={consignorInputRef}
              value={consignorSearch || ''}
              onChange={(e) => {
                console.log('🎯 Consignor input onChange triggered with value:', e.target.value);
                handleConsignorSearchChange(e.target.value);
              }}
              onFocus={() => {
                console.log('🎯 Consignor input focused');
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
                  searchDatabase(consignorSearch, 'consignors');
                }
              }}
              onBlur={() => {
                console.log('🎯 Consignor input blurred');
                const currentSearch = consignorSearch;
                setTimeout(async () => {
                  setShowConsignorDropdown(false);
                  setConsignorSelectedIndex(-1);
                  
                  // Auto-correct: if a consignor was selected from dropdown but user typed extra chars, revert
                  autoCorrectConsignorName();
                  
                  // If name is typed and not from dropdown, auto-save as new consignor
                  if (currentSearch && currentSearch.trim() && !selectedConsignorNameRef.current) {
                    await autoSaveNewConsignor(currentSearch);
                  }
                }, 250);
              }}
              onKeyDown={handleConsignorKeyDown}
              placeholder="Name..."
              className={`w-full px-2 py-1.5 pr-8 text-sm text-slate-900 font-semibold border rounded-lg shadow-sm placeholder-slate-400 focus:ring-0 transition-colors duration-200 uppercase ${
                newConsignorSaved
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-300 bg-white focus:border-indigo-400 hover:border-indigo-300'
              }`}
              tabIndex={5}
              aria-expanded={showConsignorDropdown ? 'true' : 'false'}
              role="combobox"
              style={{ textTransform: 'uppercase' }}
            />
            {isSearching && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {!isSearching && consignorSearch && (
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-indigo-500" />
            )}
          </div>
            {showConsignorDropdown && (
                <div className="absolute z-30 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {/* Add New Consignor Button - Always at top */}
                  <button
                    onClick={() => {
                      setNewConsignorData({ company_name: consignorSearch, gst_num: '', number: '' });
                      setShowAddConsignor(true);
                      setShowConsignorDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-xs transition-colors border-b border-slate-100 bg-white"
                  >
                    <div className="flex items-center gap-2 font-semibold text-emerald-600">
                      <Plus className="w-4 h-4" />
                      <span className="text-xs">Add {consignorSearch} as New Consignor</span>
                    </div>
                  </button>
                  
                  {/* Search Results Header */}
                  {searchResults.consignors && searchResults.consignors.length > 0 && (
                    <div className="p-3 bg-indigo-500 text-white text-xs font-semibold rounded-t-lg">
                      EXISTING CONSIGNORS ({searchResults.consignors.filter(c => 
                        c.company_name.toLowerCase().startsWith(consignorSearch.toLowerCase())
                      ).length})
                    </div>
                  )}
                  
                  {/* Filtered Results - Only exact prefix matches */}
                  {searchResults.consignors && searchResults.consignors
                    .filter(c => c.company_name.toLowerCase().startsWith(consignorSearch.toLowerCase()))
                    .length > 0 ? (
                    searchResults.consignors
                      .filter(c => c.company_name.toLowerCase().startsWith(consignorSearch.toLowerCase()))
                      .map((consignor, index) => (
                      <button
                        key={consignor.id}
                        data-consignor-index={index}
                        onClick={() => handleConsignorSelect(consignor)}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors border-b border-slate-100 ${
                          index === consignorSelectedIndex 
                            ? 'bg-indigo-200 border-l-4 border-l-indigo-700 font-bold shadow-sm' 
                            : 'hover:bg-indigo-200 hover:border-l-4 hover:border-l-indigo-700 hover:shadow-sm'
                        }`}
                      >
                        <div className={`${index === consignorSelectedIndex ? 'text-indigo-900 font-bold' : 'text-black font-medium hover:text-indigo-900 hover:font-bold'}`}>
                          {consignor.company_name}
                        </div>
                        <div className={`text-xs ${index === consignorSelectedIndex ? 'text-indigo-800 font-semibold' : 'text-gray-600 hover:text-indigo-800 hover:font-semibold'}`}>
                          {consignor.gst_num && `GST: ${consignor.gst_num}`}
                          {consignor.number && ` | Ph: ${consignor.number}`}
                        </div>
                      </button>
                    ))
                  ) : searchResults.consignors && searchResults.consignors.length > 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-600">
                      No consignors starting with {consignorSearch}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-xs text-gray-600">
                      {isSearching ? 'Searching...' : `Type to search existing consignors`}
                    </div>
                  )}
              </div>
            )}
          </div>
        
        {/* Consignor GST */}
        <div className="col-span-3 flex items-center gap-1">
          <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap text-center shadow-sm min-w-[55px]">
            GST
          </span>
          <input
            type="text"
            ref={consignorGstRef}
            value={formData.consignor_gst || ''}
            onChange={handleConsignorGSTChange}
            onFocus={() => {
              // Auto-correct consignor name when user moves to GST field
              autoCorrectConsignorName();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleEnter(e, 6);
              }
            }}
            className="flex-1 px-2 py-1.5 text-sm text-slate-900 font-semibold border border-slate-300 rounded-lg bg-white shadow-sm placeholder-slate-400 focus:border-indigo-400 focus:ring-0 transition-colors duration-200 hover:border-indigo-300"
            placeholder="GST..."
            tabIndex={6}
          />
        </div>
        
        {/* Consignor Phone */}
        <div className="col-span-3 flex items-center gap-1">
          <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap text-center shadow-sm min-w-[55px]">
            PHONE
          </span>
          <input
            type="text"
            ref={consignorPhoneRef}
            value={formData.consignor_number || ''}
            onChange={handleConsignorNumberChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleEnter(e, 7);
              }
            }}
            className="flex-1 px-2 py-1.5 text-sm text-slate-900 font-semibold border border-slate-300 rounded-lg bg-white shadow-sm placeholder-slate-400 focus:border-indigo-400 focus:ring-0 transition-colors duration-200 hover:border-indigo-300"
            placeholder="Phone..."
            tabIndex={7}
          />
        </div>
      </div>

      {/* Consignee Section - Single Row */}
      <div className="grid grid-cols-12 gap-2 items-center">
        {/* Consignee Label + Status Badge */}
        <div className="col-span-1">
          <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap text-center shadow-sm block">
            CONSIGNEE
          </span>
          {newConsigneeSaved && (
            <span className="mt-1 flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5 animate-pulse">
              <CheckCircle className="w-3 h-3" /> NEW ✓
            </span>
          )}
        </div>
        
        {/* Consignee Name */}
        <div className="col-span-5 relative" ref={consigneeRef}>
          <div className="relative">
            <input
              type="text"
              ref={consigneeInputRef}
              value={consigneeSearch || ''}
              onChange={(e) => {
                console.log('🎯 Consignee input onChange triggered with value:', e.target.value);
                handleConsigneeSearchChange(e.target.value);
              }}
              onFocus={() => {
                console.log('🎯 Consignee input focused');
                if (consigneeSearch && consigneeSearch.length >= 2) {
                  searchDatabase(consigneeSearch, 'consignees');
                }
              }}
              onBlur={() => {
                console.log('🎯 Consignee input blurred');
                const currentSearch = consigneeSearch;
                setTimeout(async () => {
                  setShowConsigneeDropdown(false);
                  setConsigneeSelectedIndex(-1);
                  
                  // Auto-correct: if a consignee was selected from dropdown but user typed extra chars, revert
                  autoCorrectConsigneeName();
                  
                  // If name is typed and not from dropdown, auto-save as new consignee
                  if (currentSearch && currentSearch.trim() && !selectedConsigneeNameRef.current) {
                    await autoSaveNewConsignee(currentSearch);
                  }
                }, 250);
              }}
              onKeyDown={handleConsigneeKeyDown}
              placeholder="Name..."
              className={`w-full px-2 py-1.5 pr-8 text-sm text-slate-900 font-semibold border rounded-lg shadow-sm placeholder-slate-400 focus:ring-0 transition-colors duration-200 uppercase ${
                newConsigneeSaved
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-300 bg-white focus:border-indigo-400 hover:border-indigo-300'
              }`}
              tabIndex={8}
              aria-expanded={showConsigneeDropdown}
              role="combobox"
              style={{ textTransform: 'uppercase' }}
            />
            {isSearching && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {!isSearching && consigneeSearch && (
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-indigo-600" />
            )}
          </div>
              {showConsigneeDropdown && (
              <div className="absolute z-30 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto dropdown-open autocomplete-open">
                {/* Add New Consignee Button - Always at top */}
                <button
                  onClick={() => {
                    setNewConsigneeData({ company_name: consigneeSearch, gst_num: '', number: '' });
                    setShowAddConsignee(true);
                    setShowConsigneeDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-green-50 text-xs transition-colors border-b-2 border-green-200 bg-green-25"
                >
                  <div className="flex items-center gap-2 font-bold text-green-700">
                    <Plus className="w-4 h-4" />
                    <span className="text-xs">Add {consigneeSearch} as New Consignee</span>
                  </div>
                </button>
                
                {/* Search Results Header */}
                {searchResults.consignees && searchResults.consignees.length > 0 && (
                  <div className="p-3 bg-indigo-500 text-white text-xs font-semibold rounded-t-lg">
                    EXISTING CONSIGNEES ({searchResults.consignees.filter(c => 
                      c.company_name.toLowerCase().startsWith(consigneeSearch.toLowerCase())
                    ).length})
                  </div>
                )}
                
                {/* Filtered Results - Only exact prefix matches */}
                {searchResults.consignees && searchResults.consignees
                  .filter(c => c.company_name.toLowerCase().startsWith(consigneeSearch.toLowerCase()))
                  .length > 0 ? (
                  searchResults.consignees
                    .filter(c => c.company_name.toLowerCase().startsWith(consigneeSearch.toLowerCase()))
                    .map((consignee, index) => (
                    <button
                      key={consignee.id}
                      data-consignee-index={index}
                      onClick={() => handleConsigneeSelect(consignee)}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors border-b border-slate-100 ${
                        index === consigneeSelectedIndex 
                          ? 'bg-indigo-200 border-l-4 border-l-indigo-700 font-bold shadow-sm' 
                          : 'hover:bg-indigo-200 hover:border-l-4 hover:border-l-indigo-700 hover:shadow-sm'
                      }`}
                    >
                      <div className={`${index === consigneeSelectedIndex ? 'text-indigo-900 font-bold' : 'text-black font-medium hover:text-indigo-900 hover:font-bold'}`}>
                        {consignee.company_name}
                      </div>
                      <div className={`text-xs ${index === consigneeSelectedIndex ? 'text-indigo-800 font-semibold' : 'text-gray-600 hover:text-indigo-800 hover:font-semibold'}`}>
                        {consignee.gst_num && `GST: ${consignee.gst_num}`}
                        {consignee.number && ` | Ph: ${consignee.number}`}
                      </div>
                    </button>
                  ))
                ) : searchResults.consignees && searchResults.consignees.length > 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-600">
                    No consignees starting with {consigneeSearch}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-xs text-gray-600">
                    {isSearching ? 'Searching...' : `Type to search existing consignees`}
                  </div>
                )}
            </div>
          )}
        </div>
        
        {/* Consignee GST */}
        <div className="col-span-3 flex items-center gap-1">
          <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap text-center shadow-sm min-w-[55px]">
            GST
          </span>
          <input
            type="text"
            ref={consigneeGstRef}
            value={formData.consignee_gst || ''}
            onChange={handleConsigneeGSTChange}
            onFocus={() => {
              // Auto-correct consignee name when user moves to GST field
              autoCorrectConsigneeName();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleEnter(e, 9);
              }
            }}
            className="flex-1 px-2 py-1.5 text-sm text-slate-900 font-semibold border border-slate-300 rounded-lg bg-white shadow-sm placeholder-slate-400 focus:border-indigo-400 focus:ring-0 transition-colors duration-200 hover:border-indigo-300"
            placeholder="GST..."
            tabIndex={9}
          />
        </div>
        
        {/* Consignee Phone */}
        <div className="col-span-3 flex items-center gap-1">
          <span className="bg-indigo-500 text-white px-2 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap text-center shadow-sm min-w-[55px]">
            PHONE
          </span>
          <input
            type="text"
            ref={consigneePhoneRef}
            value={formData.consignee_number || ''}
            onChange={handleConsigneeNumberChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleEnter(e, 10);
              }
            }}
            className="flex-1 px-2 py-1.5 text-sm text-slate-900 font-semibold border border-slate-300 rounded-lg bg-white shadow-sm placeholder-slate-400 focus:border-indigo-400 focus:ring-0 transition-colors duration-200 hover:border-indigo-300"
            placeholder="Phone..."
            tabIndex={10}
          />
        </div>
      </div>

      {/* Consignee Last City Info */}
      {consigneeLastCity && formData.consignee_name && (
        <div className="grid grid-cols-12 gap-2 items-center mt-1">
          <div className="col-span-1"></div>
          <div className="col-span-11">
            <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-xs text-amber-700 font-medium">
                📍 Last Station: <span className="font-bold text-amber-900">{consigneeLastCity.city_name}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add New Consignor Modal */}
      {showAddConsignor && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={() => {
                setShowAddConsignor(false);
                setNewConsignorData({ company_name: '', gst_num: '', number: '' });
                setConsignorSuggestions([]);
                setConsignorExists(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Plus className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Add New Consignor
              </h3>
              <p className="text-sm text-gray-600">
                Fill in the details to add a new consignor to your database
              </p>
            </div>
            
            <div className="space-y-5">
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>                <input
                  type="text"
                  value={newConsignorData.company_name || ''}
                  onChange={(e) => setNewConsignorData(prev => ({ ...prev, company_name: e.target.value.toUpperCase() }))}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-black font-medium text-lg uppercase ${
                    consignorExists 
                      ? 'border-red-500 focus:border-red-500 bg-red-50' 
                      : 'border-gray-300 focus:border-green-500 bg-white focus:bg-green-50'
                  }`}
                  placeholder="Enter company name"
                  autoFocus
                  style={{ textTransform: 'uppercase' }}
                />
                
                {/* Duplicate Warning */}
                {consignorExists && (
                  <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-700">This company name already exists!</span>
                  </div>
                )}
                
                {/* Suggestions Dropdown */}
                {consignorSuggestions.length > 0 && !consignorExists && (
                  <div className="absolute z-60 mt-1 w-full bg-white border-2 border-orange-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    <div className="p-3 bg-orange-100 text-orange-800 text-sm font-bold">
                      💡 Similar companies found - Click to use existing:
                    </div>
                    {consignorSuggestions.map((consignor) => (
                      <button
                        key={consignor.id}
                        onClick={() => handleConsignorSuggestionSelect(consignor)}
                        className="w-full px-4 py-3 text-left hover:bg-orange-50 text-sm transition-colors border-b border-orange-100"
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
                <label className="block text-sm font-bold text-gray-700 mb-2">GST Number (Optional)</label>                <input
                  type="text"
                  value={newConsignorData.gst_num || ''}
                  onChange={(e) => setNewConsignorData(prev => ({ ...prev, gst_num: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 text-black font-medium bg-white focus:bg-green-50"
                  placeholder="Enter GST number (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number (Optional)</label>                <input
                  type="text"
                  value={newConsignorData.number || ''}
                  onChange={(e) => setNewConsignorData(prev => ({ ...prev, number: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 text-black font-medium bg-white focus:bg-green-50"
                  placeholder="Enter phone number (optional)"
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={handleAddNewConsignor}
                disabled={addingConsignor || !newConsignorData.company_name.trim() || consignorExists}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                {addingConsignor ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding Consignor...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add New Consignor
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Consignee Modal */}
      {showAddConsignee && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={() => {
                setShowAddConsignee(false);
                setNewConsigneeData({ company_name: '', gst_num: '', number: '' });
                setConsigneeSuggestions([]);
                setConsigneeExists(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Plus className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Add New Consignee
              </h3>
              <p className="text-sm text-gray-600">
                Fill in the details to add a new consignee to your database
              </p>
            </div>
            
            <div className="space-y-5">
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>                <input
                  type="text"
                  value={newConsigneeData.company_name || ''}
                  onChange={(e) => setNewConsigneeData(prev => ({ ...prev, company_name: e.target.value.toUpperCase() }))}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-black font-medium text-lg uppercase ${
                    consigneeExists 
                      ? 'border-red-500 focus:border-red-500 bg-red-50' 
                      : 'border-gray-300 focus:border-green-500 bg-white focus:bg-green-50'
                  }`}
                  placeholder="Enter company name"
                  autoFocus
                  style={{ textTransform: 'uppercase' }}
                />
                
                {/* Duplicate Warning */}
                {consigneeExists && (
                  <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-700">This company name already exists!</span>
                  </div>
                )}
                
                {/* Suggestions Dropdown */}
                {consigneeSuggestions.length > 0 && !consigneeExists && (
                  <div className="absolute z-60 mt-1 w-full bg-white border-2 border-orange-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    <div className="p-3 bg-orange-100 text-orange-800 text-sm font-bold">
                      💡 Similar companies found - Click to use existing:
                    </div>
                    {consigneeSuggestions.map((consignee) => (
                      <button
                        key={consignee.id}
                        onClick={() => handleConsigneeSuggestionSelect(consignee)}
                        className="w-full px-4 py-3 text-left hover:bg-orange-50 text-sm transition-colors border-b border-orange-100"
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
                <label className="block text-sm font-bold text-gray-700 mb-2">GST Number (Optional)</label>                <input
                  type="text"
                  value={newConsigneeData.gst_num || ''}
                  onChange={(e) => setNewConsigneeData(prev => ({ ...prev, gst_num: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 text-black font-medium bg-white focus:bg-green-50"
                  placeholder="Enter GST number (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number (Optional)</label>                <input
                  type="text"
                  value={newConsigneeData.number || ''}
                  onChange={(e) => setNewConsigneeData(prev => ({ ...prev, number: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 text-black font-medium bg-white focus:bg-green-50"
                  placeholder="Enter phone number (optional)"
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={handleAddNewConsignee}
                disabled={addingConsignee || !newConsigneeData.company_name.trim() || consigneeExists}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                {addingConsignee ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding Consignee...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add New Consignee
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsignorConsigneeSection;
