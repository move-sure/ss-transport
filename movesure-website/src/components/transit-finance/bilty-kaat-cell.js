'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Loader2, Plus, Trash2 } from 'lucide-react';
import supabase from '../../app/utils/supabase';

export default function BiltyKaatCell({ 
  grNo, 
  challanNo, 
  destinationCityId,
  biltyWeight,
  biltyPackages,
  biltyTransportGst,
  kaatData: initialKaatData = null,
  onKaatUpdate,
  onKaatDelete
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kaatData, setKaatData] = useState(initialKaatData);
  const [hubRates, setHubRates] = useState([]);
  
  const [formData, setFormData] = useState({
    transport_hub_rate_id: '',
    rate_type: 'per_kg',
    rate_per_kg: '',
    rate_per_pkg: ''
  });

  // Update local state when prop changes
  useEffect(() => {
    setKaatData(initialKaatData);
    if (initialKaatData) {
      setFormData({
        transport_hub_rate_id: initialKaatData.transport_hub_rate_id || '',
        rate_type: initialKaatData.rate_type || 'per_kg',
        rate_per_kg: initialKaatData.rate_per_kg || '',
        rate_per_pkg: initialKaatData.rate_per_pkg || ''
      });
    }
  }, [initialKaatData]);

  useEffect(() => {
    // Listen for hub rate additions/updates
    const handleHubRateUpdate = () => {
      if (isEditing && destinationCityId) {
        loadHubRates();
      }
    };

    window.addEventListener('hubRateUpdated', handleHubRateUpdate);
    
    return () => {
      window.removeEventListener('hubRateUpdated', handleHubRateUpdate);
    };
  }, [isEditing, destinationCityId]);

  useEffect(() => {
    if (isEditing && destinationCityId) {
      loadHubRates();
    }
  }, [isEditing, destinationCityId]);

  const loadHubRates = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Loading hub rates for:', { destinationCityId, biltyTransportGst });
      
      // Check cache first
      const cacheKey = `hub_rates_${destinationCityId}_${biltyTransportGst || 'all'}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Use cache if less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          console.log('📦 Using cached hub rates');
          setHubRates(data);
          setLoading(false);
          return;
        }
      }
      
      // Fetch rates by destination city with minimal fields first
      const { data: ratesByCity, error: cityError } = await supabase
        .from('transport_hub_rates')
        .select('id, transport_id, transport_name, destination_city_id, rate_per_kg, rate_per_pkg, min_charge, pricing_mode, is_active')
        .eq('destination_city_id', destinationCityId)
        .eq('is_active', true)
        .limit(50); // Limit to prevent over-fetching

      if (cityError) throw cityError;

      let ratesByTransport = [];
      
      // If bilty has transport GST, also fetch rates by that transport
      if (biltyTransportGst) {
        // First find transport(s) with this GST
        const { data: transportsWithGst, error: gstError } = await supabase
          .from('transports')
          .select('id, transport_name, gst_number, city_id')
          .eq('gst_number', biltyTransportGst)
          .limit(5);

        if (!gstError && transportsWithGst && transportsWithGst.length > 0) {
          const transportIds = transportsWithGst.map(t => t.id);
          
          // Fetch rates for these transports
          const { data: gstRates, error: gstRatesError } = await supabase
            .from('transport_hub_rates')
            .select('id, transport_id, transport_name, destination_city_id, rate_per_kg, rate_per_pkg, min_charge, pricing_mode, is_active')
            .in('transport_id', transportIds)
            .eq('is_active', true)
            .limit(20);

          if (!gstRatesError) {
            ratesByTransport = gstRates || [];
          }
        }
      }

      // Combine and deduplicate rates
      const allRatesMap = new Map();
      [...(ratesByCity || []), ...ratesByTransport].forEach(rate => {
        allRatesMap.set(rate.id, rate);
      });
      
      const rates = Array.from(allRatesMap.values());
      
      console.log('📊 Found rates:', {
        byCity: ratesByCity?.length || 0,
        byTransport: ratesByTransport.length,
        total: rates.length
      });

      // Get unique transport IDs
      const transportIds = [...new Set(rates.map(r => r.transport_id).filter(Boolean))];

      // Fetch transport details
      let transportsRes = { data: [] };
      if (transportIds.length > 0) {
        transportsRes = await supabase
          .from('transports')
          .select('id, transport_name, city_id, gst_number')
          .in('id', transportIds);
      }

      // Get unique city IDs from transports
      const cityIds = [...new Set((transportsRes.data || []).map(t => t.city_id).filter(Boolean))];

      // Fetch city details
      let citiesRes = { data: [] };
      if (cityIds.length > 0) {
        citiesRes = await supabase
          .from('cities')
          .select('id, city_name')
          .in('id', cityIds);
      }

      // Create city map
      const cityMap = {};
      (citiesRes.data || []).forEach(c => {
        cityMap[c.id] = c.city_name;
      });

      // Create transport map with city names
      const transportMap = {};
      (transportsRes.data || []).forEach(t => {
        transportMap[t.id] = {
          ...t,
          city_name: t.city_id ? cityMap[t.city_id] : null
        };
      });

      // Enrich rates with transport details and sort
      const enrichedRates = rates
        .map(rate => ({
          ...rate,
          transport: rate.transport_id ? transportMap[rate.transport_id] : null
        }))
        .sort((a, b) => {
          // Prioritize rates matching bilty's transport GST
          if (biltyTransportGst) {
            const aMatchesGst = a.transport?.gst_number === biltyTransportGst;
            const bMatchesGst = b.transport?.gst_number === biltyTransportGst;
            if (aMatchesGst && !bMatchesGst) return -1;
            if (!aMatchesGst && bMatchesGst) return 1;
          }
          // Then sort by transport name
          const aName = a.transport_name || a.transport?.transport_name || '';
          const bName = b.transport_name || b.transport?.transport_name || '';
          return aName.localeCompare(bName);
        });

      console.log('✅ Loaded hub rates:', enrichedRates.length, 'rates');
      setHubRates(enrichedRates);
      
      // Cache the results
      try {
        const cacheKey = `hub_rates_${destinationCityId}_${biltyTransportGst || 'all'}`;
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: enrichedRates,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Ignore cache errors
        console.warn('Failed to cache hub rates:', e);
      }
    } catch (err) {
      console.error('Error loading hub rates:', err);
      setHubRates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHubRateSelect = (rateId) => {
    const selectedRate = hubRates.find(r => r.id === rateId);
    if (selectedRate) {
      setFormData({
        transport_hub_rate_id: rateId,
        rate_type: selectedRate.pricing_mode,
        rate_per_kg: selectedRate.rate_per_kg || '',
        rate_per_pkg: selectedRate.rate_per_pkg || ''
      });
    }
  };

  const calculateAmount = () => {
    if (!biltyWeight && !biltyPackages) return 0;
    
    const rateKg = parseFloat(formData.rate_per_kg) || 0;
    const ratePkg = parseFloat(formData.rate_per_pkg) || 0;
    const weight = parseFloat(biltyWeight) || 0;
    const packages = parseFloat(biltyPackages) || 0;

    if (formData.rate_type === 'per_kg') {
      return (weight * rateKg).toFixed(2);
    } else if (formData.rate_type === 'per_pkg') {
      return (packages * ratePkg).toFixed(2);
    } else if (formData.rate_type === 'hybrid') {
      return ((weight * rateKg) + (packages * ratePkg)).toFixed(2);
    }
    return 0;
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Get user session
      let userId = null;
      if (typeof window !== 'undefined') {
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          userId = session.user?.id || null;
        }
      }

      const saveData = {
        gr_no: grNo,
        challan_no: challanNo,
        destination_city_id: destinationCityId,
        transport_hub_rate_id: formData.transport_hub_rate_id || null,
        rate_type: formData.rate_type,
        rate_per_kg: formData.rate_per_kg ? parseFloat(formData.rate_per_kg) : 0,
        rate_per_pkg: formData.rate_per_pkg ? parseFloat(formData.rate_per_pkg) : 0,
        updated_by: userId,
        updated_at: new Date().toISOString()
      };

      if (kaatData) {
        // Update existing
        const { data, error } = await supabase
          .from('bilty_wise_kaat')
          .update(saveData)
          .eq('gr_no', grNo)
          .select()
          .single();

        if (error) throw error;
        setKaatData(data);
        if (onKaatUpdate) onKaatUpdate(data);
      } else {
        // Insert new
        saveData.created_by = userId;
        const { data, error } = await supabase
          .from('bilty_wise_kaat')
          .insert([saveData])
          .select()
          .single();

        if (error) throw error;
        setKaatData(data);
        if (onKaatUpdate) onKaatUpdate(data);
      }

      setIsEditing(false);

    } catch (err) {
      console.error('Error saving kaat:', err);
      alert('Failed to save kaat: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (kaatData) {
      setFormData({
        transport_hub_rate_id: kaatData.transport_hub_rate_id || '',
        rate_type: kaatData.rate_type || 'per_kg',
        rate_per_kg: kaatData.rate_per_kg || '',
        rate_per_pkg: kaatData.rate_per_pkg || ''
      });
    } else {
      setFormData({
        transport_hub_rate_id: '',
        rate_type: 'per_kg',
        rate_per_kg: '',
        rate_per_pkg: ''
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!kaatData) return;
    
    const confirmed = window.confirm('Delete this kaat entry?');
    if (!confirmed) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('bilty_wise_kaat')
        .delete()
        .eq('gr_no', grNo);

      if (error) throw error;

      setKaatData(null);
      setFormData({
        transport_hub_rate_id: '',
        rate_type: 'per_kg',
        rate_per_kg: '',
        rate_per_pkg: ''
      });
      
      if (onKaatDelete) onKaatDelete();
    } catch (err) {
      console.error('Error deleting kaat:', err);
      alert('Failed to delete kaat: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="min-w-[280px]">
        <div className="bg-blue-50 border border-blue-200 rounded p-2 space-y-2">
          {/* Kaat Rate List */}
          <div>
            <label className="text-[9px] text-gray-700 font-semibold mb-1 block">Kaat Rate List (Select Existing Rate)</label>
            <select
              value={formData.transport_hub_rate_id}
              onChange={(e) => handleHubRateSelect(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              disabled={loading}
            >
              <option value="">-- Select Rate (Optional) --</option>
              {hubRates.map(rate => {
                const transportName = rate.transport_name || rate.transport?.transport_name || 'Unknown Transport';
                const cityName = rate.transport?.city_name || '';
                const gstNumber = rate.transport?.gst_number || '';
                const rateKg = rate.rate_per_kg ? `₹${parseFloat(rate.rate_per_kg).toFixed(2)}/kg` : '';
                const ratePkg = rate.rate_per_pkg ? `₹${parseFloat(rate.rate_per_pkg).toFixed(2)}/pkg` : '';
                const rateDisplay = [rateKg, ratePkg].filter(Boolean).join(' + ');
                const minCharge = rate.min_charge > 0 ? ` (Min: ₹${parseFloat(rate.min_charge).toFixed(0)})` : '';
                const matchesBiltyGst = biltyTransportGst && gstNumber === biltyTransportGst;
                
                return (
                  <option key={rate.id} value={rate.id}>
                    {matchesBiltyGst ? '⭐ ' : ''}{transportName} {cityName ? `(${cityName})` : ''} → {rateDisplay}{minCharge}
                  </option>
                );
              })}
            </select>
            {loading && (
              <div className="text-[9px] text-blue-600 mt-1 flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Loading rates...
              </div>
            )}
            {!loading && hubRates.length === 0 && (
              <div className="text-[9px] text-orange-600 mt-1">
                No kaat rates configured for this destination
              </div>
            )}
          </div>

          {/* Rate Type */}
          <div className="flex gap-1">
            {['per_kg', 'per_pkg', 'hybrid'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, rate_type: type }))}
                className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                  formData.rate_type === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                {type === 'per_kg' ? 'KG' : type === 'per_pkg' ? 'Pkg' : 'Both'}
              </button>
            ))}
          </div>

          {/* Rate Inputs */}
          <div className="grid grid-cols-2 gap-1">
            {(formData.rate_type === 'per_kg' || formData.rate_type === 'hybrid') && (
              <div>
                <label className="text-[9px] text-gray-700 font-semibold">₹/KG</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rate_per_kg}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate_per_kg: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  placeholder="0.00"
                />
              </div>
            )}
            {(formData.rate_type === 'per_pkg' || formData.rate_type === 'hybrid') && (
              <div>
                <label className="text-[9px] text-gray-700 font-semibold">₹/Pkg</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rate_per_pkg}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate_per_pkg: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {/* Calculated Amount */}
          <div className="text-[10px] text-gray-700 bg-white rounded px-2 py-1 font-semibold">
            Amount: ₹{calculateAmount()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-[10px] font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex-1 bg-gray-600 text-white px-2 py-1 rounded text-[10px] font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Display mode
  if (kaatData) {
    return (
      <div className="min-w-[120px]">
        <div className="bg-green-50 border border-green-200 rounded p-1.5 group hover:bg-green-100 transition-colors">
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-gray-600 mb-0.5">
                <span className={`px-1.5 py-0.5 rounded-full font-semibold ${
                  kaatData.rate_type === 'per_kg' 
                    ? 'bg-blue-100 text-blue-800'
                    : kaatData.rate_type === 'per_pkg'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {kaatData.rate_type === 'per_kg' ? 'KG' : kaatData.rate_type === 'per_pkg' ? 'Pkg' : 'Both'}
                </span>
              </div>
              {kaatData.rate_per_kg > 0 && (
                <div className="text-[10px] text-gray-700">
                  <span className="font-semibold">₹{parseFloat(kaatData.rate_per_kg).toFixed(2)}</span>/kg
                </div>
              )}
              {kaatData.rate_per_pkg > 0 && (
                <div className="text-[10px] text-gray-700">
                  <span className="font-semibold">₹{parseFloat(kaatData.rate_per_pkg).toFixed(2)}</span>/pkg
                </div>
              )}
              <div className="text-xs font-bold text-green-700 mt-0.5">
                ₹{calculateAmount()}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Edit"
                disabled={saving}
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Delete"
                disabled={saving}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No kaat data - show add button
  return (
    <div className="min-w-[80px]">
      <button
        onClick={() => setIsEditing(true)}
        className="w-full bg-gray-100 hover:bg-blue-50 border border-gray-300 hover:border-blue-300 rounded p-1.5 text-gray-500 hover:text-blue-600 transition-all flex items-center justify-center gap-1 text-[10px] font-semibold"
        title="Add Kaat"
      >
        <Plus className="w-3 h-3" />
        Add Kaat
      </button>
    </div>
  );
}
