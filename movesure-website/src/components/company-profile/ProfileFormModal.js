'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  X, Save, Loader2, Building2, MapPin, Truck, IndianRupee
} from 'lucide-react';

const ProfileFormModal = ({
  showModal,
  setShowModal,
  editingProfile,
  formData,
  setFormData,
  consignors,
  cities,
  transports,
  saving,
  onSubmit,
  getConsignorName,
  getCityName
}) => {
  // Dropdown states for autocomplete
  const [consignorSearch, setConsignorSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [transportSearch, setTransportSearch] = useState('');
  const [showConsignorDropdown, setShowConsignorDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showTransportDropdown, setShowTransportDropdown] = useState(false);

  // Refs
  const consignorRef = useRef(null);
  const cityRef = useRef(null);
  const transportRef = useRef(null);
  const lastFormDataRef = useRef(null);

  // Initialize search fields when modal opens OR when formData changes with new consignor/city
  useEffect(() => {
    if (showModal) {
      // Check if formData has changed (new selection from history)
      const formDataKey = `${formData.consignor_id}-${formData.destination_station_id}`;
      
      if (lastFormDataRef.current !== formDataKey) {
        lastFormDataRef.current = formDataKey;
        
        // Set consignor search
        if (formData.consignor_id) {
          const consignorName = getConsignorName(formData.consignor_id);
          setConsignorSearch(consignorName || '');
        } else if (editingProfile) {
          setConsignorSearch(getConsignorName(editingProfile.consignor_id) || '');
        } else {
          setConsignorSearch('');
        }
        
        // Set city search
        if (formData.destination_station_id) {
          const cityName = getCityName(formData.destination_station_id);
          setCitySearch(cityName || '');
        } else if (editingProfile) {
          setCitySearch(getCityName(editingProfile.destination_station_id) || '');
        } else {
          setCitySearch('');
        }
        
        // Set transport search
        if (formData.transport_name) {
          setTransportSearch(formData.transport_name);
        } else if (editingProfile) {
          setTransportSearch(editingProfile.transport_name || '');
        } else {
          setTransportSearch('');
        }
      }
    }
    
    // Reset when modal closes
    if (!showModal) {
      lastFormDataRef.current = null;
    }
  }, [showModal, formData.consignor_id, formData.destination_station_id, formData.transport_name, editingProfile, getConsignorName, getCityName]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (consignorRef.current && !consignorRef.current.contains(e.target)) {
        setShowConsignorDropdown(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target)) {
        setShowCityDropdown(false);
      }
      if (transportRef.current && !transportRef.current.contains(e.target)) {
        setShowTransportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoized filtered dropdown items for better performance
  const filteredConsignors = useMemo(() => {
    if (!consignorSearch) return consignors.slice(0, 50); // Limit initial results
    const search = consignorSearch.toLowerCase();
    return consignors.filter(c =>
      c.company_name.toLowerCase().includes(search)
    ).slice(0, 50);
  }, [consignors, consignorSearch]);

  const filteredCities = useMemo(() => {
    if (!citySearch) return cities.slice(0, 50);
    const search = citySearch.toLowerCase();
    return cities.filter(c =>
      c.city_name.toLowerCase().includes(search) ||
      c.city_code.toLowerCase().includes(search)
    ).slice(0, 50);
  }, [cities, citySearch]);

  const filteredTransports = useMemo(() => {
    const selectedCityObj = cities.find(c => c.id === formData.destination_station_id);
    let filtered = transports;
    
    if (selectedCityObj) {
      filtered = filtered.filter(t => t.city_name === selectedCityObj.city_name);
    }
    
    if (transportSearch) {
      const search = transportSearch.toLowerCase();
      filtered = filtered.filter(t => t.transport_name.toLowerCase().includes(search));
    }
    
    return filtered.slice(0, 50);
  }, [transports, cities, formData.destination_station_id, transportSearch]);

  // Handle consignor selection
  const handleConsignorSelect = useCallback((consignor) => {
    setFormData(prev => ({
      ...prev,
      consignor_id: consignor.id
    }));
    setConsignorSearch(consignor.company_name);
    setShowConsignorDropdown(false);
  }, [setFormData]);

  // Handle city selection
  const handleCitySelect = useCallback((city) => {
    setFormData(prev => ({
      ...prev,
      destination_station_id: city.id,
      city_code: city.city_code,
      city_name: city.city_name,
      transport_name: '',
      transport_gst: ''
    }));
    setCitySearch(city.city_name);
    setShowCityDropdown(false);
    setTransportSearch('');
  }, [setFormData]);

  // Handle transport selection
  const handleTransportSelect = useCallback((transport) => {
    setFormData(prev => ({
      ...prev,
      transport_name: transport.transport_name,
      transport_gst: transport.gst_number || ''
    }));
    setTransportSearch(transport.transport_name);
    setShowTransportDropdown(false);
  }, [setFormData]);

  if (!showModal) return null;

  // Auto-select all text on focus for number inputs
  const handleFocus = (e) => {
    e.target.select();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingProfile ? 'Edit Rate Profile' : 'Add New Rate Profile'}
          </h3>
          <button
            onClick={() => setShowModal(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {/* Consignor, City, Transport Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Consignor Autocomplete */}
            <div ref={consignorRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consignor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={consignorSearch}
                  onChange={(e) => {
                    setConsignorSearch(e.target.value);
                    setShowConsignorDropdown(true);
                  }}
                  onFocus={() => setShowConsignorDropdown(true)}
                  placeholder="Search consignor..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {showConsignorDropdown && filteredConsignors.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredConsignors.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleConsignorSelect(c)}
                      className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors ${
                        formData.consignor_id === c.id ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      <p className="font-medium text-gray-900">{c.company_name}</p>
                      {c.gst_num && <p className="text-xs text-gray-500">GST: {c.gst_num}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* City Autocomplete */}
            <div ref={cityRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination City <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setShowCityDropdown(true);
                  }}
                  onFocus={() => setShowCityDropdown(true)}
                  placeholder="Search city..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {showCityDropdown && filteredCities.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredCities.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCitySelect(c)}
                      className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors ${
                        formData.destination_station_id === c.id ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      <p className="font-medium text-gray-900">{c.city_name}</p>
                      <p className="text-xs text-gray-500">Code: {c.city_code}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Transport Autocomplete */}
            <div ref={transportRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transport
              </label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={transportSearch}
                  onChange={(e) => {
                    setTransportSearch(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      transport_name: e.target.value,
                      transport_gst: ''
                    }));
                    setShowTransportDropdown(true);
                  }}
                  onFocus={() => setShowTransportDropdown(true)}
                  placeholder="Search transport..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {showTransportDropdown && filteredTransports.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredTransports.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTransportSelect(t)}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors"
                    >
                      <p className="font-medium text-gray-900">{t.transport_name}</p>
                      <p className="text-xs text-gray-500">{t.city_name} {t.gst_number && `• ${t.gst_number}`}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Transport GST */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transport GST
              </label>
              <input
                type="text"
                value={formData.transport_gst}
                onChange={(e) => setFormData(prev => ({ ...prev, transport_gst: e.target.value }))}
                placeholder="GST Number"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Rate Section */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm">
              <IndianRupee className="w-4 h-4" />
              Rate Configuration
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {/* Min Weight - Always shown, default 50 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min Weight (kg)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.minimum_weight_kg || 50}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimum_weight_kg: e.target.value }))}
                  onFocus={handleFocus}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {/* Rate */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rate</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                    onFocus={handleFocus}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {/* Rate Unit */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rate Unit</label>
                <select
                  value={formData.rate_unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate_unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="PER_KG">Per KG</option>
                  <option value="PER_NAG">Per Nag</option>
                </select>
              </div>
              {/* Min Freight */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min Freight</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.freight_minimum_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, freight_minimum_amount: e.target.value }))}
                    onFocus={handleFocus}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {/* Labour per Nag */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Labour /Nag</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.labour_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, labour_rate: e.target.value, labour_unit: 'PER_NAG' }))}
                    onFocus={handleFocus}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {/* No Charge Checkbox */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-lg">
                  <input
                    type="checkbox"
                    checked={formData.is_no_charge}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_no_charge: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">No Charge</span>
                </label>
              </div>
            </div>
          </div>

          {/* Charges Section - Bilty, Toll, DD Print, RS, DD Real */}
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 mb-2 text-sm">Charges Configuration</h4>
            <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
              {/* Bilty Charge */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bilty Charge</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.bilty_charge}
                    onChange={(e) => setFormData(prev => ({ ...prev, bilty_charge: e.target.value }))}
                    onFocus={handleFocus}
                    className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
              {/* Toll Tax Checkbox */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 border border-gray-300 rounded-lg">
                  <input
                    type="checkbox"
                    checked={formData.is_toll_tax_applicable}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_toll_tax_applicable: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700">Toll Tax</span>
                </label>
              </div>
              {/* Toll Amount */}
              {formData.is_toll_tax_applicable && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Toll Amount</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.toll_tax_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, toll_tax_amount: e.target.value }))}
                      onFocus={handleFocus}
                      className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              )}
              {/* DD Print/nag */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">DD Print /Nag</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.dd_print_charge_per_nag}
                    onChange={(e) => setFormData(prev => ({ ...prev, dd_print_charge_per_nag: e.target.value }))}
                    onFocus={handleFocus}
                    placeholder="-"
                    className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
              {/* DD Print/kg */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">DD Print /KG</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.dd_print_charge_per_kg}
                    onChange={(e) => setFormData(prev => ({ ...prev, dd_print_charge_per_kg: e.target.value }))}
                    onFocus={handleFocus}
                    placeholder="-"
                    className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
              {/* Receiving Slip /Bilty */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">RS Charge /Bilty</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.receiving_slip_charge}
                    onChange={(e) => setFormData(prev => ({ ...prev, receiving_slip_charge: e.target.value }))}
                    onFocus={handleFocus}
                    className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
              {/* DD Real/nag */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">DD Real /Nag</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.dd_charge_per_nag}
                    onChange={(e) => setFormData(prev => ({ ...prev, dd_charge_per_nag: e.target.value }))}
                    onFocus={handleFocus}
                    className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
              {/* DD Real/kg */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">DD Real /KG</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.dd_charge_per_kg}
                    onChange={(e) => setFormData(prev => ({ ...prev, dd_charge_per_kg: e.target.value }))}
                    onFocus={handleFocus}
                    className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingProfile ? 'Update Profile' : 'Create Profile'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileFormModal;
