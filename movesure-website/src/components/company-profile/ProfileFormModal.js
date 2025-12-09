'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  X, Save, Loader2, IndianRupee
} from 'lucide-react';
import ConsignorAutocomplete from '../bilty/consignor-autocomplete';
import CityAutocomplete from './city-autocomplete';
import TransportAutocomplete from './transport-autocomplete';

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
  const [consignorName, setConsignorName] = useState('');
  const [cityName, setCityName] = useState('');
  const [transportName, setTransportName] = useState('');

  // Refs
  const lastFormDataRef = useRef(null);
  const submitButtonRef = useRef(null);

  // Initialize search fields when modal opens OR when formData changes
  useEffect(() => {
    if (showModal) {
      const formDataKey = `${formData.consignor_id}-${formData.destination_station_id}`;
      
      if (lastFormDataRef.current !== formDataKey) {
        lastFormDataRef.current = formDataKey;
        
        // Set consignor name
        if (formData.consignor_id) {
          setConsignorName(getConsignorName(formData.consignor_id) || '');
        } else if (editingProfile) {
          setConsignorName(getConsignorName(editingProfile.consignor_id) || '');
        } else {
          setConsignorName('');
        }
        
        // Set city name
        if (formData.destination_station_id) {
          setCityName(getCityName(formData.destination_station_id) || '');
        } else if (editingProfile) {
          setCityName(getCityName(editingProfile.destination_station_id) || '');
        } else {
          setCityName('');
        }
        
        // Set transport name
        if (formData.transport_name) {
          setTransportName(formData.transport_name);
        } else if (editingProfile) {
          setTransportName(editingProfile.transport_name || '');
        } else {
          setTransportName('');
        }
      }
    }
    
    if (!showModal) {
      lastFormDataRef.current = null;
    }
  }, [showModal, formData.consignor_id, formData.destination_station_id, formData.transport_name, editingProfile, getConsignorName, getCityName]);





  // Handle consignor selection
  const handleConsignorSelect = useCallback((consignor) => {
    setFormData(prev => ({ ...prev, consignor_id: consignor.id }));
    setConsignorName(consignor.company_name);
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
    setCityName(city.city_name);
    setTransportName('');
  }, [setFormData]);

  // Handle transport selection
  const handleTransportSelect = useCallback((transport) => {
    setFormData(prev => ({
      ...prev,
      transport_name: transport.transport_name,
      transport_gst: transport.gst_number || ''
    }));
    setTransportName(transport.transport_name);
  }, [setFormData]);

  if (!showModal) return null;

  // Auto-select all text on focus for number inputs
  const handleFocus = (e) => {
    e.target.select();
  };

  // Handle Tab key on submit button to trigger submit
  const handleSubmitButtonKeyDown = (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      submitButtonRef.current?.click();
    }
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
            <ConsignorAutocomplete
              value={consignorName}
              onChange={setConsignorName}
              onSelect={handleConsignorSelect}
              autoFocus={true}
              placeholder="Search consignor..."
            />

            {/* City Autocomplete */}
            <CityAutocomplete
              value={cityName}
              onChange={setCityName}
              onSelect={handleCitySelect}
              autoFocus={false}
              placeholder="Search city..."
            />

            {/* Transport Autocomplete */}
            <TransportAutocomplete
              value={transportName}
              onChange={setTransportName}
              onSelect={handleTransportSelect}
              destinationCityId={formData.destination_station_id}
              autoFocus={false}
              placeholder="Search transport..."
              disabled={!formData.destination_station_id}
            />

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
              {/* Toll Tax */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Toll Tax</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.toll_tax_amount || 0}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        toll_tax_amount: value,
                        is_toll_tax_applicable: parseFloat(value) > 0
                      }));
                    }}
                    onFocus={handleFocus}
                    placeholder="0"
                    className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
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
              ref={submitButtonRef}
              type="submit"
              disabled={saving}
              onKeyDown={handleSubmitButtonKeyDown}
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
