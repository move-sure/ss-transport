'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Truck, MapPin, Package, DollarSign, Save, Loader2, AlertCircle, Edit2, Trash2, XCircle } from 'lucide-react';
import supabase from '../../app/utils/supabase';

export default function AddKaatModal({ isOpen, onClose, cities, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Data states
  const [transports, setTransports] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [searchTransport, setSearchTransport] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  const [searchCity, setSearchCity] = useState('');
  const [filteredCities, setFilteredCities] = useState([]);
  const [existingRates, setExistingRates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [editingExistingId, setEditingExistingId] = useState(null);
  const [editExistingForm, setEditExistingForm] = useState({});
  
  // Form states
  const [formData, setFormData] = useState({
    transport_id: '',
    destination_city_id: '',
    goods_type: '',
    pricing_mode: 'per_kg',
    rate_per_kg: '',
    rate_per_pkg: '',
    min_charge: '0',
    transit_days: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      resetForm();
      // Initialize filtered cities
      setFilteredCities(cities?.slice(0, 10) || []);
    }
  }, [isOpen, cities]);

  // Load transports when city is selected
  useEffect(() => {
    if (selectedCity) {
      loadTransportsForCity(selectedCity.id);
    }
  }, [selectedCity]);

  const loadTransportsForCity = async (cityId) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('transports')
        .select(`
          id,
          transport_name,
          city_id,
          city_name,
          address,
          gst_number,
          mob_number,
          branch_owner_name,
          website
        `)
        .eq('city_id', cityId)
        .order('transport_name');

      if (fetchError) throw fetchError;

      console.log('✅ Loaded transports for city:', data?.length || 0);
      setTransports(data || []);

    } catch (err) {
      console.error('❌ Error loading transports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingRates = async (transportId, destinationCityId) => {
    try {
      setShowDuplicateWarning(false);
      setExistingRates([]);

      const { data, error: fetchError } = await supabase
        .from('transport_hub_rates')
        .select('*')
        .eq('transport_id', transportId)
        .eq('destination_city_id', destinationCityId)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        console.log('⚠️ Found existing rates:', data.length);
        setExistingRates(data);
        setShowDuplicateWarning(true);
      } else {
        setExistingRates([]);
        setShowDuplicateWarning(false);
      }

    } catch (err) {
      console.error('❌ Error checking existing rates:', err);
    }
  };

  const handleEditExisting = (rate) => {
    setEditingExistingId(rate.id);
    setEditExistingForm({
      goods_type: rate.goods_type || '',
      pricing_mode: rate.pricing_mode,
      rate_per_kg: rate.rate_per_kg || '',
      rate_per_pkg: rate.rate_per_pkg || '',
      min_charge: rate.min_charge || '0',
      transit_days: rate.metadata?.transit_days || '',
      notes: rate.metadata?.notes || ''
    });
  };

  const handleCancelEditExisting = () => {
    setEditingExistingId(null);
    setEditExistingForm({});
  };

  const handleUpdateExisting = async (id) => {
    try {
      setSaving(true);
      setError(null);

      let updatedBy = null;
      if (typeof window !== 'undefined') {
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          updatedBy = session.user?.id || null;
        }
      }

      const metadata = {};
      if (editExistingForm.transit_days) metadata.transit_days = parseInt(editExistingForm.transit_days);
      if (editExistingForm.notes) metadata.notes = editExistingForm.notes;

      const updateData = {
        goods_type: editExistingForm.goods_type || null,
        pricing_mode: editExistingForm.pricing_mode,
        rate_per_kg: editExistingForm.rate_per_kg ? parseFloat(editExistingForm.rate_per_kg) : null,
        rate_per_pkg: editExistingForm.rate_per_pkg ? parseFloat(editExistingForm.rate_per_pkg) : null,
        min_charge: editExistingForm.min_charge ? parseFloat(editExistingForm.min_charge) : 0,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('transport_hub_rates')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      console.log('✅ Existing rate updated successfully');
      setSuccess('Rate updated successfully!');
      
      window.dispatchEvent(new CustomEvent('hubRateUpdated'));
      
      // Reload existing rates
      if (selectedTransport && selectedCity) {
        await checkExistingRates(selectedTransport.id, selectedCity.id);
      }
      
      setTimeout(() => {
        setSuccess(null);
        handleCancelEditExisting();
      }, 1500);

    } catch (err) {
      console.error('❌ Error updating existing rate:', err);
      setError(err.message || 'Failed to update rate');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExisting = async (id) => {
    if (!confirm('Delete this existing rate?')) return;

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('transport_hub_rates')
        .update({ is_active: false })
        .eq('id', id);

      if (deleteError) throw deleteError;

      console.log('✅ Existing rate deleted');
      setSuccess('Rate deleted successfully!');
      
      window.dispatchEvent(new CustomEvent('hubRateUpdated'));
      
      // Reload existing rates
      if (selectedTransport && selectedCity) {
        await checkExistingRates(selectedTransport.id, selectedCity.id);
      }
      
      setTimeout(() => setSuccess(null), 1500);

    } catch (err) {
      console.error('❌ Error deleting existing rate:', err);
      setError(err.message || 'Failed to delete rate');
    }
  };

  // Handle city search
  const handleCitySearch = (query) => {
    setSearchCity(query);
    if (!query.trim()) {
      setFilteredCities(cities?.slice(0, 10) || []);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = cities?.filter(city => 
      city.city_name?.toLowerCase().includes(lowerQuery) ||
      city.city_code?.toLowerCase().includes(lowerQuery)
    ).slice(0, 10) || [];
    
    setFilteredCities(filtered);
  };

  // Handle city selection
  const handleCitySelect = async (city) => {
    setSelectedCity(city);
    setFormData(prev => ({ ...prev, destination_city_id: city.id }));
    setSearchCity('');
    setSelectedTransport(null);
    setFormData(prev => ({ ...prev, transport_id: '' }));
    setExistingRates([]);
    setShowDuplicateWarning(false);
  };

  const resetForm = () => {
    setFormData({
      transport_id: '',
      destination_city_id: '',
      goods_type: '',
      pricing_mode: 'per_kg',
      rate_per_kg: '',
      rate_per_pkg: '',
      min_charge: '0',
      transit_days: '',
      notes: ''
    });
    setSelectedTransport(null);
    setSearchTransport('');
    setSelectedCity(null);
    setSearchCity('');
    setTransports([]);
    setFilteredCities(cities?.slice(0, 10) || []);
    setError(null);
    setSuccess(null);
    setExistingRates([]);
    setShowDuplicateWarning(false);
  };

  const handleTransportSelect = async (transport) => {
    setSelectedTransport(transport);
    setFormData(prev => ({ ...prev, transport_id: transport.id }));
    setSearchTransport('');
    
    // Check for existing rates with same transport and destination
    if (selectedCity) {
      await checkExistingRates(transport.id, selectedCity.id);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.destination_city_id) {
      setError('Please select destination city');
      return false;
    }
    if (!formData.transport_id) {
      setError('Please select a transport');
      return false;
    }
    if (formData.pricing_mode === 'per_kg' && !formData.rate_per_kg) {
      setError('Please enter rate per kg');
      return false;
    }
    if (formData.pricing_mode === 'per_pkg' && !formData.rate_per_pkg) {
      setError('Please enter rate per package');
      return false;
    }
    if (formData.pricing_mode === 'hybrid' && (!formData.rate_per_kg || !formData.rate_per_pkg)) {
      setError('Please enter both rate per kg and rate per package');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);

      // Get user session for created_by
      let createdBy = null;
      if (typeof window !== 'undefined') {
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          createdBy = session.user?.id || null;
        }
      }

      // Prepare metadata
      const metadata = {};
      if (formData.transit_days) metadata.transit_days = parseInt(formData.transit_days);
      if (formData.notes) metadata.notes = formData.notes;

      // Prepare insert data with transport_name and created_by
      const insertData = {
        transport_id: formData.transport_id,
        transport_name: selectedTransport?.transport_name || null,
        destination_city_id: formData.destination_city_id,
        goods_type: formData.goods_type || null,
        pricing_mode: formData.pricing_mode,
        rate_per_kg: formData.rate_per_kg ? parseFloat(formData.rate_per_kg) : null,
        rate_per_pkg: formData.rate_per_pkg ? parseFloat(formData.rate_per_pkg) : null,
        min_charge: formData.min_charge ? parseFloat(formData.min_charge) : 0,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        created_by: createdBy,
        is_active: true
      };

      console.log('📤 Inserting kaat rate:', insertData);

      const { data, error: insertError } = await supabase
        .from('transport_hub_rates')
        .insert([insertData])
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('✅ Kaat rate added successfully:', data);
      setSuccess('Hub rate added successfully!');
      
      // Trigger event to refresh kaat cells
      window.dispatchEvent(new CustomEvent('hubRateUpdated'));
      
      setTimeout(() => {
        if (onSuccess) onSuccess(data);
        onClose();
      }, 1500);

    } catch (err) {
      console.error('❌ Error adding kaat rate:', err);
      setError(err.message || 'Failed to add hub rate');
    } finally {
      setSaving(false);
    }
  };

  // Filter transports based on search
  const filteredTransports = transports.filter(t => 
    t.transport_name?.toLowerCase().includes(searchTransport.toLowerCase()) ||
    t.city_name?.toLowerCase().includes(searchTransport.toLowerCase()) ||
    t.mob_number?.includes(searchTransport)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6" />
              Add Kaat (Hub to Destination Rate)
            </h2>
            <p className="text-blue-100 text-xs mt-0.5">Configure transport hub rates for destinations</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600 text-sm">Loading transports...</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-800 font-semibold text-sm">Error</h4>
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <Save className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-green-800 font-semibold text-sm">Success</h4>
                <p className="text-green-600 text-xs">{success}</p>
              </div>
            </div>
          )}

          {/* Duplicate Warning with Edit */}
          {showDuplicateWarning && existingRates.length > 0 && (
            <div className="mb-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-yellow-800 font-bold text-sm">⚠️ Duplicate Rate Warning</h4>
                  <p className="text-yellow-700 text-xs mt-0.5">
                    {existingRates.length} existing {existingRates.length === 1 ? 'rate' : 'rates'} found - Edit below or add new
                  </p>
                </div>
              </div>
              
              <div className="mt-3 bg-white border border-yellow-300 rounded-lg overflow-hidden">
                <div className="bg-yellow-100 px-3 py-2 border-b border-yellow-300">
                  <h5 className="text-xs font-bold text-yellow-900">Existing Rates (Click Edit to Modify):</h5>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {existingRates.map((rate) => {
                    const isEditing = editingExistingId === rate.id;
                    
                    return (
                      <div key={rate.id} className={`px-3 py-2.5 border-b border-yellow-200 last:border-b-0 ${isEditing ? 'bg-blue-50' : 'hover:bg-yellow-50'}`}>
                        {isEditing ? (
                          /* Edit Mode */
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-semibold text-gray-700">Goods Type</label>
                                <input
                                  type="text"
                                  value={editExistingForm.goods_type}
                                  onChange={(e) => setEditExistingForm(prev => ({ ...prev, goods_type: e.target.value }))}
                                  className="w-full px-2 py-1 border rounded text-[11px]"
                                  placeholder="Optional"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-semibold text-gray-700">Mode</label>
                                <select
                                  value={editExistingForm.pricing_mode}
                                  onChange={(e) => setEditExistingForm(prev => ({ ...prev, pricing_mode: e.target.value }))}
                                  className="w-full px-2 py-1 border rounded text-[11px]"
                                >
                                  <option value="per_kg">Per KG</option>
                                  <option value="per_pkg">Per Pkg</option>
                                  <option value="hybrid">Hybrid</option>
                                </select>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2">
                              {(editExistingForm.pricing_mode === 'per_kg' || editExistingForm.pricing_mode === 'hybrid') && (
                                <div>
                                  <label className="text-[9px] font-semibold text-gray-700">₹/KG</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editExistingForm.rate_per_kg}
                                    onChange={(e) => setEditExistingForm(prev => ({ ...prev, rate_per_kg: e.target.value }))}
                                    className="w-full px-2 py-1 border rounded text-[11px]"
                                  />
                                </div>
                              )}
                              {(editExistingForm.pricing_mode === 'per_pkg' || editExistingForm.pricing_mode === 'hybrid') && (
                                <div>
                                  <label className="text-[9px] font-semibold text-gray-700">₹/Pkg</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editExistingForm.rate_per_pkg}
                                    onChange={(e) => setEditExistingForm(prev => ({ ...prev, rate_per_pkg: e.target.value }))}
                                    className="w-full px-2 py-1 border rounded text-[11px]"
                                  />
                                </div>
                              )}
                              <div>
                                <label className="text-[9px] font-semibold text-gray-700">Min ₹</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editExistingForm.min_charge}
                                  onChange={(e) => setEditExistingForm(prev => ({ ...prev, min_charge: e.target.value }))}
                                  className="w-full px-2 py-1 border rounded text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-semibold text-gray-700">Days</label>
                                <input
                                  type="number"
                                  value={editExistingForm.transit_days}
                                  onChange={(e) => setEditExistingForm(prev => ({ ...prev, transit_days: e.target.value }))}
                                  className="w-full px-2 py-1 border rounded text-[11px]"
                                  placeholder="-"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-[9px] font-semibold text-gray-700">Notes</label>
                              <input
                                type="text"
                                value={editExistingForm.notes}
                                onChange={(e) => setEditExistingForm(prev => ({ ...prev, notes: e.target.value }))}
                                className="w-full px-2 py-1 border rounded text-[11px]"
                                placeholder="Optional"
                              />
                            </div>
                            
                            <div className="flex gap-2 justify-end pt-1">
                              <button
                                onClick={() => handleUpdateExisting(rate.id)}
                                disabled={saving}
                                className="px-3 py-1.5 bg-green-600 text-white rounded text-[11px] font-semibold hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                              >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Update
                              </button>
                              <button
                                onClick={handleCancelEditExisting}
                                disabled={saving}
                                className="px-3 py-1.5 bg-gray-500 text-white rounded text-[11px] font-semibold hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50"
                              >
                                <XCircle className="w-3 h-3" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-[11px]">
                                <span className="font-semibold text-gray-900">
                                  {rate.pricing_mode === 'per_kg' && `₹${parseFloat(rate.rate_per_kg || 0).toFixed(2)}/KG`}
                                  {rate.pricing_mode === 'per_pkg' && `₹${parseFloat(rate.rate_per_pkg || 0).toFixed(2)}/Pkg`}
                                  {rate.pricing_mode === 'hybrid' && `₹${parseFloat(rate.rate_per_kg || 0).toFixed(2)}/KG | ₹${parseFloat(rate.rate_per_pkg || 0).toFixed(2)}/Pkg`}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-600">Min: ₹{parseFloat(rate.min_charge || 0).toFixed(0)}</span>
                                {rate.metadata?.transit_days && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-600">{rate.metadata.transit_days}d</span>
                                  </>
                                )}
                              </div>
                              {rate.goods_type && (
                                <div className="text-[10px] text-gray-600 mt-0.5">
                                  Goods: {rate.goods_type}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                rate.pricing_mode === 'per_kg' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : rate.pricing_mode === 'per_pkg'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {rate.pricing_mode === 'per_kg' ? 'KG' : rate.pricing_mode === 'per_pkg' ? 'PKG' : 'BOTH'}
                              </span>
                              <button
                                onClick={() => handleEditExisting(rate)}
                                className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteExisting(rate.id)}
                                className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-2 text-[11px] text-yellow-700 font-medium">
                💡 Edit existing rates above or scroll down to add a new rate
              </div>
            </div>
          )}

          {!loading && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* City & Transport Selection - Reordered */}
              <div className="grid grid-cols-3 gap-3">
                {/* City Selection First */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-gray-900 mb-1.5">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    Destination City *
                  </label>
                  
                  {selectedCity ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-purple-900 truncate">{selectedCity.city_name}</h3>
                          <p className="text-[10px] text-gray-600 truncate">{selectedCity.city_code}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCity(null);
                            setFormData(prev => ({ ...prev, destination_city_id: '' }));
                            setSelectedTransport(null);
                            setFormData(prev => ({ ...prev, transport_id: '' }));
                            setTransports([]);
                          }}
                          className="text-red-600 hover:bg-red-100 rounded p-1 transition-colors ml-1 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={searchCity}
                        onChange={(e) => handleCitySearch(e.target.value)}
                        placeholder="Search city..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm mb-2"
                      />
                      
                      <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg divide-y bg-white">
                        {filteredCities.length === 0 ? (
                          <div className="p-3 text-center text-gray-500 text-xs">
                            <MapPin className="w-8 h-8 mx-auto mb-1 text-gray-400" />
                            <p>No cities found</p>
                          </div>
                        ) : (
                          filteredCities.map(city => (
                            <button
                              key={city.id}
                              type="button"
                              onClick={() => handleCitySelect(city)}
                              className="w-full p-2 hover:bg-purple-50 transition-colors text-left"
                            >
                              <div className="font-semibold text-gray-900 text-xs truncate">{city.city_name}</div>
                              <div className="text-[10px] text-gray-600 truncate">{city.city_code}</div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Transport Selection - Shows after city selection */}
                <div className="col-span-2">
                  <label className="flex items-center gap-1 text-xs font-bold text-gray-900 mb-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    Transport * {!selectedCity && <span className="text-[10px] text-gray-500 font-normal">(Select city first)</span>}
                  </label>
                  
                  {selectedTransport ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-blue-900 truncate">{selectedTransport.transport_name}</h3>
                          <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5 truncate">
                            {selectedTransport.gst_number && (
                              <>
                                <span className="font-medium">GST:</span>
                                <span>{selectedTransport.gst_number}</span>
                              </>
                            )}
                            {selectedTransport.mob_number && selectedTransport.gst_number && (
                              <span className="text-gray-400 mx-1">•</span>
                            )}
                            {selectedTransport.mob_number && (
                              <span>{selectedTransport.mob_number}</span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTransport(null);
                            setFormData(prev => ({ ...prev, transport_id: '' }));
                          }}
                          className="text-red-600 hover:bg-red-100 rounded p-1 transition-colors ml-2 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {selectedCity ? (
                        <>
                          <input
                            type="text"
                            value={searchTransport}
                            onChange={(e) => setSearchTransport(e.target.value)}
                            placeholder="Search transport..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-2"
                          />
                          
                          <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg divide-y bg-white">
                            {filteredTransports.length === 0 ? (
                              <div className="p-3 text-center text-gray-500 text-xs">
                                <Truck className="w-8 h-8 mx-auto mb-1 text-gray-400" />
                                <p>No transports in this city</p>
                              </div>
                            ) : (
                              filteredTransports.slice(0, 10).map(transport => (
                                <button
                                  key={transport.id}
                                  type="button"
                                  onClick={() => handleTransportSelect(transport)}
                                  className="w-full p-2 hover:bg-blue-50 transition-colors text-left"
                                >
                                  <div className="font-semibold text-gray-900 text-xs truncate">{transport.transport_name}</div>
                                  <div className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1 truncate">
                                    {transport.gst_number && (
                                      <>
                                        <span className="font-medium">GST:</span>
                                        <span className="truncate">{transport.gst_number}</span>
                                      </>
                                    )}
                                    {transport.mob_number && transport.gst_number && (
                                      <span className="text-gray-400 mx-1">•</span>
                                    )}
                                    {transport.mob_number && (
                                      <span className="truncate">{transport.mob_number}</span>
                                    )}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="w-full px-3 py-8 border border-gray-300 rounded-lg bg-gray-50 text-center text-gray-500 text-xs">
                          <MapPin className="w-8 h-8 mx-auto mb-1 text-gray-400" />
                          <p>Select a city first</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Goods Type */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5 flex items-center gap-1">
                  <Package className="w-4 h-4 text-green-600" />
                  Goods Type (Optional)
                </label>
                <input
                  type="text"
                  value={formData.goods_type}
                  onChange={(e) => handleInputChange('goods_type', e.target.value)}
                  placeholder="e.g., Electronics, Furniture"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>

              {/* Pricing Mode & Rates - Ultra Compact Single Row */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                <label className="flex items-center gap-1 text-xs font-bold text-gray-900 mb-1.5">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  Pricing & Rates *
                </label>
                
                <div className="grid grid-cols-6 gap-2 items-end">
                  {/* Mode Buttons - Compact */}
                  {['per_kg', 'per_pkg', 'hybrid'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleInputChange('pricing_mode', mode)}
                      className={`px-2 py-1.5 rounded border-2 transition-all font-semibold text-[10px] ${
                        formData.pricing_mode === mode
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      {mode === 'per_kg' ? 'KG' : mode === 'per_pkg' ? 'Pkg' : 'Both'}
                    </button>
                  ))}

                  {/* Rate Inputs */}
                  {(formData.pricing_mode === 'per_kg' || formData.pricing_mode === 'hybrid') && (
                    <div>
                      <label className="block text-[9px] font-semibold text-gray-700 mb-0.5">₹/KG *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.rate_per_kg}
                        onChange={(e) => handleInputChange('rate_per_kg', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                        required={formData.pricing_mode === 'per_kg' || formData.pricing_mode === 'hybrid'}
                      />
                    </div>
                  )}

                  {(formData.pricing_mode === 'per_pkg' || formData.pricing_mode === 'hybrid') && (
                    <div>
                      <label className="block text-[9px] font-semibold text-gray-700 mb-0.5">₹/Pkg *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.rate_per_pkg}
                        onChange={(e) => handleInputChange('rate_per_pkg', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                        required={formData.pricing_mode === 'per_pkg' || formData.pricing_mode === 'hybrid'}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] font-semibold text-gray-700 mb-0.5">Min ₹</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.min_charge}
                      onChange={(e) => handleInputChange('min_charge', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Info - Compact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1.5">
                    Transit Days
                  </label>
                  <input
                    type="number"
                    value={formData.transit_days}
                    onChange={(e) => handleInputChange('transit_days', e.target.value)}
                    placeholder="e.g., 3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1.5">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Rate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
