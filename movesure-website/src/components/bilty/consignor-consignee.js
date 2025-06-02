'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const ConsignorConsigneeSection = ({ 
  formData, 
  setFormData, 
  consignors, 
  consignees 
}) => {
  const [showConsignorDropdown, setShowConsignorDropdown] = useState(false);
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false);
  const [consignorSearch, setConsignorSearch] = useState('');
  const [consigneeSearch, setConsigneeSearch] = useState('');
  const [consignorSelectedIndex, setConsignorSelectedIndex] = useState(-1);
  const [consigneeSelectedIndex, setConsigneeSelectedIndex] = useState(-1);
  const [showConsignorDetails, setShowConsignorDetails] = useState(false);
  const [showConsigneeDetails, setShowConsigneeDetails] = useState(false);
  
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

  return (
    <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200 shadow-md">
      {/* Main Consignor/Consignee Names */}
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Consignor Name */}
        <div className="col-span-5">
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-sm font-bold rounded-lg whitespace-nowrap min-w-24 text-center shadow-md">
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
                className="w-full px-3 py-2 text-sm text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                tabIndex={8}
              />
              
              {showConsignorDropdown && (
                <div className="absolute z-30 mt-1 w-80 bg-white border-2 border-blue-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold">
                    CONSIGNOR WISE AUTO FILL DETAILS HERE
                  </div>
                  {filteredConsignors.length > 0 ? (
                    filteredConsignors.map((consignor, index) => (
                      <button
                        key={consignor.id}
                        onClick={() => handleConsignorSelect(consignor)}
                        className={`w-full px-3 py-2 text-left hover:bg-blue-50 text-sm transition-colors ${
                          index === consignorSelectedIndex ? 'bg-blue-100' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-800">{consignor.company_name}</div>
                        <div className="text-xs text-gray-600">
                          {consignor.gst_num && `GST: ${consignor.gst_num}`}
                          {consignor.number && ` | Ph: ${consignor.number}`}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-600">
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
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-sm font-bold rounded-lg whitespace-nowrap min-w-24 text-center shadow-md">
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
                className="w-full px-3 py-2 text-sm text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                tabIndex={9}
              />
              
              {showConsigneeDropdown && (
                <div className="absolute z-30 mt-1 w-80 bg-white border-2 border-blue-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold">
                    CONSIGNEE WISE AUTO FILL DETAILS HERE
                  </div>
                  {filteredConsignees.length > 0 ? (
                    filteredConsignees.map((consignee, index) => (
                      <button
                        key={consignee.id}
                        onClick={() => handleConsigneeSelect(consignee)}
                        className={`w-full px-3 py-2 text-left hover:bg-blue-50 text-sm transition-colors ${
                          index === consigneeSelectedIndex ? 'bg-blue-100' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-800">{consignee.company_name}</div>
                        <div className="text-xs text-gray-600">
                          {consignee.gst_num && `GST: ${consignee.gst_num}`}
                          {consignee.number && ` | Ph: ${consignee.number}`}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-600">
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
            className="flex items-center justify-center gap-1 bg-white text-emerald-600 px-2 py-1 rounded-lg font-bold hover:bg-emerald-50 transition-colors border-2 border-emerald-300 shadow-md text-xs"
          >
            {showConsignorDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showConsignorDetails ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={() => setShowConsigneeDetails(!showConsigneeDetails)}
            className="flex items-center justify-center gap-1 bg-white text-emerald-600 px-2 py-1 rounded-lg font-bold hover:bg-emerald-50 transition-colors border-2 border-emerald-300 shadow-md text-xs"
          >
            {showConsigneeDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showConsigneeDetails ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Collapsible Additional Details */}
      {(showConsignorDetails || showConsigneeDetails) && (
        <div className="mt-4 space-y-4">
          {/* Consignor Details */}
          {showConsignorDetails && (
            <div className="p-4 bg-white rounded-lg border border-emerald-200 shadow-sm">
              <h4 className="text-sm font-bold text-gray-800 mb-3 bg-emerald-100 px-3 py-2 rounded text-center">
                CONSIGNOR ADDITIONAL DETAILS
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-sm font-bold rounded-lg whitespace-nowrap text-center shadow-md">
                    GST NO
                  </span>
                  <input
                    type="text"
                    value={formData.consignor_gst}
                    onChange={(e) => setFormData(prev => ({ ...prev, consignor_gst: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                    placeholder="Consignor GST"
                    tabIndex={10}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-sm font-bold rounded-lg whitespace-nowrap text-center shadow-md">
                    PHONE
                  </span>
                  <input
                    type="text"
                    value={formData.consignor_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, consignor_number: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                    placeholder="Consignor Phone"
                    tabIndex={11}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Consignee Details */}
          {showConsigneeDetails && (
            <div className="p-4 bg-white rounded-lg border border-emerald-200 shadow-sm">
              <h4 className="text-sm font-bold text-gray-800 mb-3 bg-emerald-100 px-3 py-2 rounded text-center">
                CONSIGNEE ADDITIONAL DETAILS
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-sm font-bold rounded-lg whitespace-nowrap text-center shadow-md">
                    GST NO
                  </span>
                  <input
                    type="text"
                    value={formData.consignee_gst}
                    onChange={(e) => setFormData(prev => ({ ...prev, consignee_gst: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                    placeholder="Consignee GST"
                    tabIndex={12}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-sm font-bold rounded-lg whitespace-nowrap text-center shadow-md">
                    PHONE
                  </span>
                  <input
                    type="text"
                    value={formData.consignee_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, consignee_number: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                    placeholder="Consignee Phone"
                    tabIndex={13}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConsignorConsigneeSection;