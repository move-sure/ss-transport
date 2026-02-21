'use client';

import React, { useState, useEffect } from 'react';
import { X, List, Edit2, Trash2, Save, XCircle, Loader2, AlertCircle, Search, Filter } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { format } from 'date-fns';

export default function KaatListModal({ isOpen, onClose, cities }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Data states
  const [kaatRates, setKaatRates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [filterMode, setFilterMode] = useState('all');

  useEffect(() => {
    if (isOpen) {
      loadKaatRates();
    }
  }, [isOpen]);

  const loadKaatRates = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch hub rates first
      const { data: rates, error: fetchError } = await supabase
        .from('transport_hub_rates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Get unique transport IDs and destination city IDs
      const transportIds = [...new Set(rates.map(r => r.transport_id).filter(Boolean))];
      const cityIds = [...new Set(rates.map(r => r.destination_city_id).filter(Boolean))];

      // Fetch related data
      const [transportsRes, citiesRes] = await Promise.all([
        transportIds.length > 0
          ? supabase
              .from('transports')
              .select('id, transport_name, city_name, gst_number, mob_number')
              .in('id', transportIds)
          : { data: [] },
        cityIds.length > 0
          ? supabase
              .from('cities')
              .select('id, city_name, city_code')
              .in('id', cityIds)
          : { data: [] }
      ]);

      // Create lookup maps
      const transportMap = {};
      (transportsRes.data || []).forEach(t => {
        transportMap[t.id] = t;
      });

      const cityMap = {};
      (citiesRes.data || []).forEach(c => {
        cityMap[c.id] = c;
      });

      // Enrich rates with related data
      const enrichedRates = rates.map(rate => ({
        ...rate,
        transport: rate.transport_id ? transportMap[rate.transport_id] : null,
        destination: rate.destination_city_id ? cityMap[rate.destination_city_id] : null
      }));

      console.log('✅ Loaded kaat rates:', enrichedRates.length);
      setKaatRates(enrichedRates);

    } catch (err) {
      console.error('❌ Error loading kaat rates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rate) => {
    setEditingId(rate.id);
    setEditForm({
      goods_type: rate.goods_type || '',
      pricing_mode: rate.pricing_mode,
      rate_per_kg: rate.rate_per_kg || '',
      rate_per_pkg: rate.rate_per_pkg || '',
      min_charge: rate.min_charge || '0',
      bilty_chrg: rate.bilty_chrg || '',
      ewb_chrg: rate.ewb_chrg || '',
      labour_chrg: rate.labour_chrg || '',
      other_chrg: rate.other_chrg || '',
      transit_days: rate.metadata?.transit_days || '',
      notes: rate.metadata?.notes || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setError(null);
  };

  const handleSaveEdit = async (id) => {
    try {
      setSaving(true);
      setError(null);

      // Get user session for updated_by
      let updatedBy = null;
      if (typeof window !== 'undefined') {
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          updatedBy = session.user?.id || null;
        }
      }

      // Prepare metadata
      const metadata = {};
      if (editForm.transit_days) metadata.transit_days = parseInt(editForm.transit_days);
      if (editForm.notes) metadata.notes = editForm.notes;

      // Prepare update data
      const updateData = {
        goods_type: editForm.goods_type || null,
        pricing_mode: editForm.pricing_mode,
        rate_per_kg: editForm.rate_per_kg ? parseFloat(editForm.rate_per_kg) : null,
        rate_per_pkg: editForm.rate_per_pkg ? parseFloat(editForm.rate_per_pkg) : null,
        min_charge: editForm.min_charge ? parseFloat(editForm.min_charge) : 0,
        bilty_chrg: editForm.bilty_chrg ? parseFloat(editForm.bilty_chrg) : null,
        ewb_chrg: editForm.ewb_chrg ? parseFloat(editForm.ewb_chrg) : null,
        labour_chrg: editForm.labour_chrg ? parseFloat(editForm.labour_chrg) : null,
        other_chrg: editForm.other_chrg ? parseFloat(editForm.other_chrg) : null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('transport_hub_rates')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      console.log('✅ Kaat rate updated successfully');
      setSuccess('Rate updated successfully!');
      
      // Reload data
      await loadKaatRates();
      
      setTimeout(() => {
        setSuccess(null);
        handleCancelEdit();
      }, 1500);

    } catch (err) {
      console.error('❌ Error updating kaat rate:', err);
      setError(err.message || 'Failed to update rate');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('transport_hub_rates')
        .update({ is_active: false })
        .eq('id', id);

      if (deleteError) throw deleteError;

      console.log('✅ Kaat rate deleted successfully');
      setSuccess('Rate deleted successfully!');
      
      await loadKaatRates();
      
      setTimeout(() => setSuccess(null), 2000);

    } catch (err) {
      console.error('❌ Error deleting kaat rate:', err);
      setError(err.message || 'Failed to delete rate');
    }
  };

  // Get city name by ID
  const getCityName = (cityId) => {
    const city = cities?.find(c => c.id === cityId);
    return city?.city_name || 'Unknown';
  };

  // Filter rates
  const filteredRates = kaatRates.filter(rate => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        rate.transport_name?.toLowerCase().includes(query) ||
        rate.transport?.transport_name?.toLowerCase().includes(query) ||
        rate.destination?.city_name?.toLowerCase().includes(query) ||
        rate.goods_type?.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }

    // City filter
    if (filterCity !== 'all' && rate.destination_city_id !== filterCity) {
      return false;
    }

    // Pricing mode filter
    if (filterMode !== 'all' && rate.pricing_mode !== filterMode) {
      return false;
    }

    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-4 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <List className="w-6 h-6" />
              Kaat Rates List
            </h2>
            <p className="text-green-100 text-xs mt-0.5">
              {filteredRates.length} {filteredRates.length === 1 ? 'rate' : 'rates'} found
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="grid grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transport, city, goods..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="all">All Cities</option>
              {cities?.map(city => (
                <option key={city.id} value={city.id}>
                  {city.city_name}
                </option>
              ))}
            </select>

            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="all">All Pricing Modes</option>
              <option value="per_kg">Per KG</option>
              <option value="per_pkg">Per Package</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-800 font-semibold text-sm">Error</h4>
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
            <Save className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-green-800 font-semibold text-sm">Success</h4>
              <p className="text-green-600 text-xs">{success}</p>
            </div>
          </div>
        )}

        {/* Content - Scrollable Table */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <span className="ml-3 text-gray-600">Loading rates...</span>
            </div>
          ) : filteredRates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <List className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>No kaat rates found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900 text-xs">Transport</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900 text-xs">GST</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900 text-xs">Destination</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900 text-xs">Goods Type</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-900 text-xs">Mode</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">₹/KG</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">₹/Pkg</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">Min ₹</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">Bilty ₹</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">EWB ₹</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">Labour ₹</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">Other ₹</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-900 text-xs">Days</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900 text-xs">Notes</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-900 text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRates.map(rate => {
                  const isEditing = editingId === rate.id;

                  return (
                    <tr key={rate.id} className={`hover:bg-green-50 transition-colors ${isEditing ? 'bg-blue-50' : ''}`}>
                      {/* Transport */}
                      <td className="px-3 py-2">
                        <div className="font-semibold text-gray-900 text-xs truncate max-w-[150px]" title={rate.transport_name || rate.transport?.transport_name}>
                          {rate.transport_name || rate.transport?.transport_name || 'N/A'}
                        </div>
                        <div className="text-[10px] text-gray-600 truncate">
                          {rate.transport?.city_name}
                        </div>
                      </td>

                      {/* GST */}
                      <td className="px-3 py-2 text-xs text-gray-700 truncate max-w-[100px]" title={rate.transport?.gst_number}>
                        {rate.transport?.gst_number || '-'}
                      </td>

                      {/* Destination */}
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 text-xs">
                          {rate.destination?.city_name || getCityName(rate.destination_city_id)}
                        </div>
                        <div className="text-[10px] text-gray-600">
                          {rate.destination?.city_code}
                        </div>
                      </td>

                      {/* Goods Type */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.goods_type}
                            onChange={(e) => setEditForm(prev => ({ ...prev, goods_type: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="Optional"
                          />
                        ) : (
                          <span className="text-xs text-gray-700">{rate.goods_type || '-'}</span>
                        )}
                      </td>

                      {/* Pricing Mode */}
                      <td className="px-3 py-2 text-center">
                        {isEditing ? (
                          <select
                            value={editForm.pricing_mode}
                            onChange={(e) => setEditForm(prev => ({ ...prev, pricing_mode: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          >
                            <option value="per_kg">Per KG</option>
                            <option value="per_pkg">Per Pkg</option>
                            <option value="hybrid">Hybrid</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                            rate.pricing_mode === 'per_kg' 
                              ? 'bg-blue-100 text-blue-800'
                              : rate.pricing_mode === 'per_pkg'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {rate.pricing_mode === 'per_kg' ? 'KG' : rate.pricing_mode === 'per_pkg' ? 'Pkg' : 'Both'}
                          </span>
                        )}
                      </td>

                      {/* Rate per KG */}
                      <td className="px-3 py-2 text-right">
                        {isEditing && (editForm.pricing_mode === 'per_kg' || editForm.pricing_mode === 'hybrid') ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.rate_per_kg}
                            onChange={(e) => setEditForm(prev => ({ ...prev, rate_per_kg: e.target.value }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-xs text-right"
                          />
                        ) : (
                          <span className="text-xs text-gray-900 font-medium">
                            {rate.rate_per_kg ? `₹${parseFloat(rate.rate_per_kg).toFixed(2)}` : '-'}
                          </span>
                        )}
                      </td>

                      {/* Rate per Pkg */}
                      <td className="px-3 py-2 text-right">
                        {isEditing && (editForm.pricing_mode === 'per_pkg' || editForm.pricing_mode === 'hybrid') ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.rate_per_pkg}
                            onChange={(e) => setEditForm(prev => ({ ...prev, rate_per_pkg: e.target.value }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-xs text-right"
                          />
                        ) : (
                          <span className="text-xs text-gray-900 font-medium">
                            {rate.rate_per_pkg ? `₹${parseFloat(rate.rate_per_pkg).toFixed(2)}` : '-'}
                          </span>
                        )}
                      </td>

                      {/* Min Charge */}
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.min_charge}
                            onChange={(e) => setEditForm(prev => ({ ...prev, min_charge: e.target.value }))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-xs text-right"
                          />
                        ) : (
                          <span className="text-xs text-gray-700">
                            ₹{parseFloat(rate.min_charge || 0).toFixed(0)}
                          </span>
                        )}
                      </td>

                      {/* Bilty Charge */}
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input type="number" step="0.01" value={editForm.bilty_chrg} onChange={(e) => setEditForm(prev => ({ ...prev, bilty_chrg: e.target.value }))} className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-right" placeholder="0" />
                        ) : (
                          <span className="text-xs text-gray-700">{rate.bilty_chrg ? `₹${parseFloat(rate.bilty_chrg).toFixed(0)}` : '-'}</span>
                        )}
                      </td>

                      {/* EWB Charge */}
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input type="number" step="0.01" value={editForm.ewb_chrg} onChange={(e) => setEditForm(prev => ({ ...prev, ewb_chrg: e.target.value }))} className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-right" placeholder="0" />
                        ) : (
                          <span className="text-xs text-gray-700">{rate.ewb_chrg ? `₹${parseFloat(rate.ewb_chrg).toFixed(0)}` : '-'}</span>
                        )}
                      </td>

                      {/* Labour Charge */}
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input type="number" step="0.01" value={editForm.labour_chrg} onChange={(e) => setEditForm(prev => ({ ...prev, labour_chrg: e.target.value }))} className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-right" placeholder="0" />
                        ) : (
                          <span className="text-xs text-gray-700">{rate.labour_chrg ? `₹${parseFloat(rate.labour_chrg).toFixed(0)}` : '-'}</span>
                        )}
                      </td>

                      {/* Other Charge */}
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input type="number" step="0.01" value={editForm.other_chrg} onChange={(e) => setEditForm(prev => ({ ...prev, other_chrg: e.target.value }))} className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-right" placeholder="0" />
                        ) : (
                          <span className="text-xs text-gray-700">{rate.other_chrg ? `₹${parseFloat(rate.other_chrg).toFixed(0)}` : '-'}</span>
                        )}
                      </td>

                      {/* Transit Days */}
                      <td className="px-3 py-2 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.transit_days}
                            onChange={(e) => setEditForm(prev => ({ ...prev, transit_days: e.target.value }))}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center"
                            placeholder="-"
                          />
                        ) : (
                          <span className="text-xs text-gray-700">
                            {rate.metadata?.transit_days || '-'}
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.notes}
                            onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="Optional"
                          />
                        ) : (
                          <span className="text-xs text-gray-600 truncate max-w-[120px] inline-block" title={rate.metadata?.notes}>
                            {rate.metadata?.notes || '-'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(rate.id)}
                              disabled={saving}
                              className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="p-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                              title="Cancel"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(rate)}
                              className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(rate.id)}
                              className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600">
            Showing {filteredRates.length} of {kaatRates.length} total rates
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
