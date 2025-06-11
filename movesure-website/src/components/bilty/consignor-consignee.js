'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Plus, AlertTriangle } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const ConsignorConsigneeSection = ({ 
  formData, 
  setFormData, 
  consignors, 
  consignees,
  onDataUpdate // Callback to refresh consignors/consignees lists
}) => {
  const [showConsignorDropdown, setShowConsignorDropdown] = useState(false);
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false);
  const [consignorSearch, setConsignorSearch] = useState('');
  const [consigneeSearch, setConsigneeSearch] = useState('');
  const [consignorSelectedIndex, setConsignorSelectedIndex] = useState(-1);
  const [consigneeSelectedIndex, setConsigneeSelectedIndex] = useState(-1);
  const [showConsignorDetails, setShowConsignorDetails] = useState(false);
  const [showConsigneeDetails, setShowConsigneeDetails] = useState(false);
  
  // New states for adding new entries
  const [showAddConsignor, setShowAddConsignor] = useState(false);
  const [showAddConsignee, setShowAddConsignee] = useState(false);
  const [addingConsignor, setAddingConsignor] = useState(false);
  const [addingConsignee, setAddingConsignee] = useState(false);
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
  
  // New states for suggestions and duplicate detection
  const [consignorSuggestions, setConsignorSuggestions] = useState([]);
  const [consigneeSuggestions, setConsigneeSuggestions] = useState([]);
  const [consignorExists, setConsignorExists] = useState(false);
  const [consigneeExists, setConsigneeExists] = useState(false);
  
  const consignorRef = useRef(null);
  const consigneeRef = useRef(null);

  // Initialize search values when formData changes (for edit mode)
  useEffect(() => {
    if (formData.consignor_name && consignorSearch !== formData.consignor_name) {
      setConsignorSearch(formData.consignor_name);
    }
    if (formData.consignee_name && consigneeSearch !== formData.consignee_name) {
      setConsigneeSearch(formData.consignee_name);
    }
  }, [formData.consignor_name, formData.consignee_name]);

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
  }, []);

  const handleConsignorSelect = (consignor) => {
    setConsignorSearch(consignor.company_name);
    setFormData(prev => ({
      ...prev,
      consignor_name: consignor.company_name,
      consignor_gst: consignor.gst_num || '',
      consignor_number: consignor.number || ''
    }));
    setShowConsignorDropdown(false);
    setConsignorSelectedIndex(-1);
  };

  const handleConsigneeSelect = (consignee) => {
    setConsigneeSearch(consignee.company_name);
    setFormData(prev => ({
      ...prev,
      consignee_name: consignee.company_name,
      consignee_gst: consignee.gst_num || '',
      consignee_number: consignee.number || ''
    }));
    setShowConsigneeDropdown(false);
    setConsigneeSelectedIndex(-1);
  };

  const handleConsignorKeyDown = (e) => {
    if (!showConsignorDropdown || filteredConsignors.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setConsignorSelectedIndex(prev => 
          prev < filteredConsignors.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setConsignorSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredConsignors.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (consignorSelectedIndex >= 0) {
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
  };

  const handleConsigneeKeyDown = (e) => {
    if (!showConsigneeDropdown || filteredConsignees.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setConsigneeSelectedIndex(prev => 
          prev < filteredConsignees.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setConsigneeSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredConsignees.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (consigneeSelectedIndex >= 0) {
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
  };

  const filteredConsignors = consignors.filter(c => 
    c.company_name.toLowerCase().includes(consignorSearch.toLowerCase()) ||
    (c.gst_num && c.gst_num.toLowerCase().includes(consignorSearch.toLowerCase()))
  );

  const filteredConsignees = consignees.filter(c => 
    c.company_name.toLowerCase().includes(consigneeSearch.toLowerCase()) ||
    (c.gst_num && c.gst_num.toLowerCase().includes(consigneeSearch.toLowerCase()))
  );

  // Check for existing consignor when typing
  useEffect(() => {
    if (newConsignorData.company_name.trim()) {
      const searchTerm = newConsignorData.company_name.toLowerCase();
      
      // Filter suggestions
      const suggestions = consignors.filter(c => 
        c.company_name.toLowerCase().includes(searchTerm)
      ).slice(0, 5);
      setConsignorSuggestions(suggestions);
      
      // Check if exact match exists
      const exactMatch = consignors.find(c => 
        c.company_name.toLowerCase() === searchTerm
      );
      setConsignorExists(!!exactMatch);
    } else {
      setConsignorSuggestions([]);
      setConsignorExists(false);
    }
  }, [newConsignorData.company_name, consignors]);

  // Check for existing consignee when typing
  useEffect(() => {
    if (newConsigneeData.company_name.trim()) {
      const searchTerm = newConsigneeData.company_name.toLowerCase();
      
      // Filter suggestions
      const suggestions = consignees.filter(c => 
        c.company_name.toLowerCase().includes(searchTerm)
      ).slice(0, 5);
      setConsigneeSuggestions(suggestions);
      
      // Check if exact match exists
      const exactMatch = consignees.find(c => 
        c.company_name.toLowerCase() === searchTerm
      );
      setConsigneeExists(!!exactMatch);
    } else {
      setConsigneeSuggestions([]);
      setConsigneeExists(false);
    }
  }, [newConsigneeData.company_name, consignees]);

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
      
      const { data, error } = await supabase
        .from('consignors')
        .insert([{
          company_name: newConsignorData.company_name.trim(),
          company_add: 'address-not-yet-assigned',
          gst_num: newConsignorData.gst_num.trim() || null,
          number: newConsignorData.number.trim() || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Update form data with new consignor
      setFormData(prev => ({
        ...prev,
        consignor_name: data.company_name,
        consignor_gst: data.gst_num || '',
        consignor_number: data.number || ''
      }));

      // Update search field
      setConsignorSearch(data.company_name);

      // Reset add form
      setNewConsignorData({ company_name: '', gst_num: '', number: '' });
      setConsignorSuggestions([]);
      setConsignorExists(false);
      setShowAddConsignor(false);
      setShowConsignorDropdown(false);

      // Refresh consignors list in parent component
      if (onDataUpdate) {
        onDataUpdate();
      }

      alert('New consignor added successfully!');

    } catch (error) {
      console.error('Error adding consignor:', error);
      alert('Error adding consignor. Please try again.');
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
      
      const { data, error } = await supabase
        .from('consignees')
        .insert([{
          company_name: newConsigneeData.company_name.trim(),
          company_add: 'address-not-yet-assigned',
          gst_num: newConsigneeData.gst_num.trim() || null,
          number: newConsigneeData.number.trim() || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Update form data with new consignee
      setFormData(prev => ({
        ...prev,
        consignee_name: data.company_name,
        consignee_gst: data.gst_num || '',
        consignee_number: data.number || ''
      }));

      // Update search field
      setConsigneeSearch(data.company_name);

      // Reset add form
      setNewConsigneeData({ company_name: '', gst_num: '', number: '' });
      setConsigneeSuggestions([]);
      setConsigneeExists(false);
      setShowAddConsignee(false);
      setShowConsigneeDropdown(false);

      // Refresh consignees list in parent component
      if (onDataUpdate) {
        onDataUpdate();
      }

      alert('New consignee added successfully!');

    } catch (error) {
      console.error('Error adding consignee:', error);
      alert('Error adding consignee. Please try again.');
    } finally {
      setAddingConsignee(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl border-2 border-purple-200 shadow-lg">
      {/* Main Consignor/Consignee Names */}
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Consignor Name */}
        <div className="col-span-5">
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap min-w-28 text-center shadow-lg">
              CONSIGNOR
            </span>
            <div className="relative flex-1" ref={consignorRef}>
              <input
                type="text"
                value={consignorSearch}
                onChange={(e) => {
                  setConsignorSearch(e.target.value);
                  setFormData(prev => ({ ...prev, consignor_name: e.target.value }));
                  setShowConsignorDropdown(true);
                  setConsignorSelectedIndex(-1);
                }}
                onFocus={() => setShowConsignorDropdown(true)}
                onKeyDown={handleConsignorKeyDown}
                placeholder="Search consignor..."
                className="w-full px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white shadow-md placeholder-gray-500"
                tabIndex={8}
              />
              
              {showConsignorDropdown && (
                <div className="absolute z-30 mt-2 w-80 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs font-bold rounded-t-xl">
                    CONSIGNOR WISE AUTO FILL DETAILS HERE
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

                  {filteredConsignors.length > 0 ? (
                    filteredConsignors.map((consignor, index) => (
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
                  ) : (
                    <div className="px-4 py-3 text-xs text-gray-600">
                      No consignors found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Consignee Name */}
        <div className="col-span-5">
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap min-w-28 text-center shadow-lg">
              CONSIGNEE
            </span>
            <div className="relative flex-1" ref={consigneeRef}>
              <input
                type="text"
                value={consigneeSearch}
                onChange={(e) => {
                  setConsigneeSearch(e.target.value);
                  setFormData(prev => ({ ...prev, consignee_name: e.target.value }));
                  setShowConsigneeDropdown(true);
                  setConsigneeSelectedIndex(-1);
                }}
                onFocus={() => setShowConsigneeDropdown(true)}
                onKeyDown={handleConsigneeKeyDown}
                placeholder="Search consignee..."
                className="w-full px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white shadow-md placeholder-gray-500"
                tabIndex={9}
              />
              
              {showConsigneeDropdown && (
                <div className="absolute z-30 mt-2 w-80 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs font-bold rounded-t-xl">
                    CONSIGNEE WISE AUTO FILL DETAILS HERE
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

                  {filteredConsignees.length > 0 ? (
                    filteredConsignees.map((consignee, index) => (
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
                  ) : (
                    <div className="px-4 py-3 text-xs text-gray-600">
                      No consignees found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toggle Details Buttons */}
        <div className="col-span-2 flex flex-col gap-2">
          <button
            onClick={() => setShowConsignorDetails(!showConsignorDetails)}
            className="flex items-center justify-center gap-1 bg-white text-purple-600 px-3 py-2 rounded-xl font-bold hover:bg-purple-50 transition-colors border-2 border-purple-300 shadow-lg text-xs"
          >
            {showConsignorDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showConsignorDetails ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={() => setShowConsigneeDetails(!showConsigneeDetails)}
            className="flex items-center justify-center gap-1 bg-white text-purple-600 px-3 py-2 rounded-xl font-bold hover:bg-purple-50 transition-colors border-2 border-purple-300 shadow-lg text-xs"
          >
            {showConsigneeDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showConsigneeDetails ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Collapsible Additional Details */}
      {(showConsignorDetails || showConsigneeDetails) && (
        <div className="mt-6 space-y-4">
          {/* Consignor Details */}
          {showConsignorDetails && (
            <div className="p-5 bg-white rounded-xl border-2 border-purple-200 shadow-lg">
              <h4 className="text-sm font-bold text-black mb-4 bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-3 rounded-xl text-center border border-purple-200">
                CONSIGNOR ADDITIONAL DETAILS
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap text-center shadow-lg">
                    GST NO
                  </span>
                  <input
                    type="text"
                    value={formData.consignor_gst}
                    onChange={(e) => setFormData(prev => ({ ...prev, consignor_gst: e.target.value }))}
                    className="flex-1 px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white shadow-md placeholder-gray-500"
                    placeholder="Consignor GST"
                    tabIndex={10}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap text-center shadow-lg">
                    PHONE
                  </span>
                  <input
                    type="text"
                    value={formData.consignor_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, consignor_number: e.target.value }))}
                    className="flex-1 px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white shadow-md placeholder-gray-500"
                    placeholder="Consignor Phone"
                    tabIndex={11}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Consignee Details */}
          {showConsigneeDetails && (
            <div className="p-5 bg-white rounded-xl border-2 border-purple-200 shadow-lg">
              <h4 className="text-sm font-bold text-black mb-4 bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-3 rounded-xl text-center border border-purple-200">
                CONSIGNEE ADDITIONAL DETAILS
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap text-center shadow-lg">
                    GST NO
                  </span>
                  <input
                    type="text"
                    value={formData.consignee_gst}
                    onChange={(e) => setFormData(prev => ({ ...prev, consignee_gst: e.target.value }))}
                    className="flex-1 px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white shadow-md placeholder-gray-500"
                    placeholder="Consignee GST"
                    tabIndex={12}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap text-center shadow-lg">
                    PHONE
                  </span>
                  <input
                    type="text"
                    value={formData.consignee_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, consignee_number: e.target.value }))}
                    className="flex-1 px-4 py-3 text-sm text-black font-semibold border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white shadow-md placeholder-gray-500"
                    placeholder="Consignee Phone"
                    tabIndex={13}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add New Consignor Modal */}
      {showAddConsignor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center bg-emerald-100 py-2 rounded">
              Add New Consignor
            </h3>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newConsignorData.company_name}
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
                    {consignorSuggestions.map((consignor, index) => (
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
                <label className="block text-sm font-bold text-gray-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={newConsignorData.gst_num}
                  onChange={(e) => setNewConsignorData(prev => ({ ...prev, gst_num: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 text-black font-medium bg-white"
                  placeholder="Enter GST number"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newConsignorData.number}
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
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center bg-emerald-100 py-2 rounded">
              Add New Consignee
            </h3>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newConsigneeData.company_name}
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
                    {consigneeSuggestions.map((consignee, index) => (
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
                <label className="block text-sm font-bold text-gray-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={newConsigneeData.gst_num}
                  onChange={(e) => setNewConsigneeData(prev => ({ ...prev, gst_num: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 text-black font-medium bg-white"
                  placeholder="Enter GST number"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newConsigneeData.number}
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