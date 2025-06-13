'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Check } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { useInputNavigation } from './input-navigation';

const InvoiceDetailsSection = ({ formData, setFormData }) => {
  const [contentOptions, setContentOptions] = useState([]);
  const [showContentDropdown, setShowContentDropdown] = useState(false);
  const [contentSearch, setContentSearch] = useState('');
  const [selectedContentIndex, setSelectedContentIndex] = useState(-1);
  const [isAddingContent, setIsAddingContent] = useState(false);  const [newContentName, setNewContentName] = useState('');
  const contentRef = useRef(null);
  const contentInputRef = useRef(null);
  const paymentModeRef = useRef(null);
  const deliveryTypeRef = useRef(null);
  const invoiceNoRef = useRef(null);
  const invoiceValueRef = useRef(null);
  const eWayBillRef = useRef(null);
  const docNumberRef = useRef(null);
  
  // Input navigation
  const { register, unregister, handleEnter } = useInputNavigation();

  // Initialize content search when formData changes
  useEffect(() => {
    if (formData.contain && contentSearch !== formData.contain) {
      setContentSearch(formData.contain);
    }
  }, [formData.contain]);

  // Load content options on component mount
  useEffect(() => {
    loadContentOptions();
  }, []);
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target)) {
        setShowContentDropdown(false);
        setIsAddingContent(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);  // Register inputs for navigation
  useEffect(() => {
    if (deliveryTypeRef.current) {
      register(14, deliveryTypeRef.current);
    }
    if (paymentModeRef.current) {
      register(15, paymentModeRef.current);
    }
    if (contentInputRef.current) {
      register(16, contentInputRef.current);
    }
    if (invoiceNoRef.current) {
      register(17, invoiceNoRef.current);
    }
    if (invoiceValueRef.current) {
      register(18, invoiceValueRef.current);
    }
    if (eWayBillRef.current) {
      register(19, eWayBillRef.current);
    }
    
    return () => {
      unregister(14);
      unregister(15);
      unregister(16);
      unregister(17);
      unregister(18);
      unregister(19);
    };
  }, [register, unregister]);

  const loadContentOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('content_management')
        .select('*')
        .order('content_name');
      
      if (error) throw error;
      setContentOptions(data || []);
    } catch (error) {
      console.error('Error loading content options:', error);
    }
  };

  const handleContentSelect = (content) => {
    setContentSearch(content.content_name);
    setFormData(prev => ({ ...prev, contain: content.content_name }));
    setShowContentDropdown(false);
    setSelectedContentIndex(-1);
  };
  const handleKeyDown = (e) => {
    if (isAddingContent) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddNewContent();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsAddingContent(false);
        setNewContentName('');
      }
      return;
    }

    // Handle dropdown navigation
    if (showContentDropdown && filteredContent.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedContentIndex(prev => 
            prev < filteredContent.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedContentIndex(prev => 
            prev > 0 ? prev - 1 : filteredContent.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedContentIndex >= 0) {
            handleContentSelect(filteredContent[selectedContentIndex]);
          } else if (filteredContent.length > 0) {
            handleContentSelect(filteredContent[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowContentDropdown(false);
          setSelectedContentIndex(-1);
          break;
      }
    } else {      // Handle Enter key for navigation when dropdown is not open
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEnter(e, 16);
      }
      if (e.key === 'ArrowDown' && !showContentDropdown) {
        e.preventDefault();
        setShowContentDropdown(true);
      }
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setContentSearch(value);
    setFormData(prev => ({ ...prev, contain: value }));
    setShowContentDropdown(true);
    setSelectedContentIndex(-1);
    setIsAddingContent(false);
  };

  const handleAddNewContent = async () => {
    if (!newContentName.trim()) return;

    try {
      // Check if content already exists
      const existingContent = contentOptions.find(
        c => c.content_name.toLowerCase() === newContentName.trim().toLowerCase()
      );

      if (existingContent) {
        // If exists, just select it
        handleContentSelect(existingContent);
        setIsAddingContent(false);
        setNewContentName('');
        return;
      }

      // Add new content to database
      const { data, error } = await supabase
        .from('content_management')
        .insert([{ content_name: newContentName.trim() }])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setContentOptions(prev => [...prev, data]);
      
      // Select the new content
      handleContentSelect(data);
      
      setIsAddingContent(false);
      setNewContentName('');
    } catch (error) {
      console.error('Error adding new content:', error);
      alert('Error adding new content. Please try again.');
    }
  };

  const startAddingContent = () => {
    setIsAddingContent(true);
    setNewContentName(contentSearch);
    setShowContentDropdown(false);
  };

  const filteredContent = contentOptions.filter(content =>
    content.content_name.toLowerCase().includes(contentSearch.toLowerCase())
  );

  // Check if current search exactly matches any existing content
  const exactMatch = contentOptions.find(
    c => c.content_name.toLowerCase() === contentSearch.toLowerCase()
  );

  return (
    <div className="bg-white p-6 rounded-xl border-2 border-purple-200 shadow-lg">
      <div className="grid grid-cols-3 gap-6">
        {/* Row 1 - Main Options */}        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
            DELIVERY
          </span>          <select
            ref={deliveryTypeRef}
            value={formData.delivery_type}
            onChange={(e) => setFormData(prev => ({ ...prev, delivery_type: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 14)}
            className="flex-1 px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 bilty-input-focus transition-all duration-200"
            tabIndex={14}
          >
            <option value="godown-delivery">Godown</option>
            <option value="door-delivery">Door</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
            PAYMENT
          </span>          <select
            ref={paymentModeRef}
            value={formData.payment_mode}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 15)}
            className="flex-1 px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 bilty-input-focus transition-all duration-200"
            tabIndex={15}
          >
            <option value="to-pay">To Pay</option>
            <option value="paid">Paid</option>
            <option value="freeofcost">FOC</option>
          </select>
        </div>

        {/* Enhanced Content Field with Dropdown */}
        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
            CONTENT
          </span>
          <div className="relative flex-1" ref={contentRef}>
            {isAddingContent ? (
              <div className="flex items-center gap-2">                <input
                  type="text"
                  value={newContentName}
                  onChange={(e) => setNewContentName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="✨ Enter new content name..."
                  className="flex-1 px-4 py-2 text-black font-semibold border-2 border-purple-400 rounded-lg bg-white shadow-sm text-input-focus transition-all duration-200"
                  autoFocus
                />
                <button
                  onClick={handleAddNewContent}
                  className="px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center gap-1 shadow-md transition-all"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>            ) : (              <input
                type="text"
                ref={contentInputRef}
                value={contentSearch}
                onChange={handleInputChange}
                onFocus={() => setShowContentDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="📦 Search or type goods description..."
                className="w-full px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 text-input-focus transition-all duration-200"
                tabIndex={16}
              />
            )}

            {showContentDropdown && !isAddingContent && (
              <div className="absolute z-30 mt-1 w-full bg-white border-2 border-purple-300 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 text-xs font-bold border-b border-purple-200 flex justify-between items-center">
                  <span className="text-black">CONTENT OPTIONS</span>
                  {contentSearch && !exactMatch && (
                    <button
                      onClick={startAddingContent}
                      className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-bold transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add New
                    </button>
                  )}
                </div>
                
                {filteredContent.length > 0 ? (
                  filteredContent.map((content, index) => (
                    <button
                      key={content.content_id}
                      onClick={() => handleContentSelect(content)}
                      className={`w-full px-4 py-3 text-left hover:bg-purple-50 text-sm transition-colors border-b border-purple-100 ${
                        index === selectedContentIndex ? 'bg-purple-100' : ''
                      }`}
                    >
                      <div className="font-semibold text-black">{content.content_name}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-600">
                    {contentSearch ? (
                      <div className="flex justify-between items-center">
                        <span>No matching content found</span>
                        <button
                          onClick={startAddingContent}
                          className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add {contentSearch}
                        </button>
                      </div>
                    ) : (
                      'Start typing to search content...'
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>        {/* Row 2 - Invoice Details */}
        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-4 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
            INV NO
          </span>          <input
            type="text"
            ref={invoiceNoRef}
            value={formData.invoice_no || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 17)}
            className="flex-1 px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 text-input-focus transition-all duration-200"
            placeholder="📄 Invoice number"
            tabIndex={17}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-4 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
            INV VAL
          </span>          <input
            type="number"
            ref={invoiceValueRef}
            value={formData.invoice_value || 0}
            onChange={(e) => setFormData(prev => ({ ...prev, invoice_value: parseFloat(e.target.value) || 0 }))}
            onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 18)}
            className="flex-1 px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 number-input-focus transition-all duration-200"
            placeholder="💰 Invoice value"
            tabIndex={18}
          />
        </div>        <div className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-4 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
            E-WAY
          </span>          <input
            type="text"
            ref={eWayBillRef}
            value={formData.e_way_bill || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, e_way_bill: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, 19)}
            className="flex-1 px-4 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg bg-white shadow-sm hover:border-purple-400 text-input-focus transition-all duration-200"
            placeholder="🚛 E-way bill number"
            tabIndex={19}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsSection;