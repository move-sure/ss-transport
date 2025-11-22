'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Loader2, Plus } from 'lucide-react';
import supabase from '../../app/utils/supabase';

export default function BiltyKaatCell({ 
  grNo, 
  challanNo, 
  destinationCityId,
  biltyWeight,
  biltyPackages,
  onKaatUpdate 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kaatData, setKaatData] = useState(null);
  const [hubRates, setHubRates] = useState([]);
  
  const [formData, setFormData] = useState({
    transport_hub_rate_id: '',
    rate_type: 'per_kg',
    rate_per_kg: '',
    rate_per_pkg: ''
  });

  useEffect(() => {
    loadKaatData();
  }, [grNo]);

  useEffect(() => {
    if (isEditing && destinationCityId) {
      loadHubRates();
    }
  }, [isEditing, destinationCityId]);

  const loadKaatData = async () => {
    try {
      const { data, error } = await supabase
        .from('bilty_wise_kaat')
        .select('*')
        .eq('gr_no', grNo)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setKaatData(data);
        setFormData({
          transport_hub_rate_id: data.transport_hub_rate_id || '',
          rate_type: data.rate_type || 'per_kg',
          rate_per_kg: data.rate_per_kg || '',
          rate_per_pkg: data.rate_per_pkg || ''
        });
      }
    } catch (err) {
      console.error('Error loading kaat data:', err);
    }
  };

  const loadHubRates = async () => {
    try {
      setLoading(true);
      
      const { data: rates, error: fetchError } = await supabase
        .from('transport_hub_rates')
        .select('*')
        .eq('destination_city_id', destinationCityId)
        .eq('is_active', true)
        .order('transport_name');

      if (fetchError) throw fetchError;

      // Get unique transport IDs
      const transportIds = [...new Set(rates.map(r => r.transport_id).filter(Boolean))];

      // Fetch transport details
      let transportsRes = { data: [] };
      if (transportIds.length > 0) {
        transportsRes = await supabase
          .from('transports')
          .select('id, transport_name')
          .in('id', transportIds);
      }

      // Create transport map
      const transportMap = {};
      (transportsRes.data || []).forEach(t => {
        transportMap[t.id] = t;
      });

      // Enrich rates
      const enrichedRates = rates.map(rate => ({
        ...rate,
        transport: rate.transport_id ? transportMap[rate.transport_id] : null
      }));

      setHubRates(enrichedRates);
    } catch (err) {
      console.error('Error loading hub rates:', err);
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
      }

      setIsEditing(false);
      if (onKaatUpdate) onKaatUpdate();

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

  if (isEditing) {
    return (
      <div className="min-w-[280px]">
        <div className="bg-blue-50 border border-blue-200 rounded p-2 space-y-2">
          {/* Hub Rate Selection */}
          <select
            value={formData.transport_hub_rate_id}
            onChange={(e) => handleHubRateSelect(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            disabled={loading}
          >
            <option value="">Select Hub Rate (Optional)</option>
            {hubRates.map(rate => (
              <option key={rate.id} value={rate.id}>
                {rate.transport_name || rate.transport?.transport_name || 'Unknown'} - 
                {rate.rate_per_kg ? ` ₹${rate.rate_per_kg}/kg` : ''}
                {rate.rate_per_pkg ? ` ₹${rate.rate_per_pkg}/pkg` : ''}
              </option>
            ))}
          </select>

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
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Edit"
            >
              <Edit2 className="w-3 h-3" />
            </button>
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
