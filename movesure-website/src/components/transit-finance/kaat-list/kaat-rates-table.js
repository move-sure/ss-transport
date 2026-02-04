'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Edit2, Trash2, Save, XCircle, Loader2, 
  AlertCircle, CheckCircle, Eye, MapPin, Package, Calendar,
  User, TrendingUp, ChevronDown, RefreshCw
} from 'lucide-react';
import supabase from '../../../app/utils/supabase';
import { format } from 'date-fns';

export default function KaatRatesTable({ cities, refreshTrigger }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Data states
  const [kaatRates, setKaatRates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [viewingDetails, setViewingDetails] = useState(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');

  useEffect(() => {
    loadKaatRates();
  }, [refreshTrigger]);

  const loadKaatRates = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading kaat rates with full details...');

      // Fetch hub rates
      const { data: rates, error: fetchError } = await supabase
        .from('transport_hub_rates')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Get unique IDs for related data
      const transportIds = [...new Set(rates.map(r => r.transport_id).filter(Boolean))];
      const cityIds = [...new Set(rates.map(r => r.destination_city_id).filter(Boolean))];
      const userIds = [...new Set([
        ...rates.map(r => r.created_by).filter(Boolean),
        ...rates.map(r => r.updated_by).filter(Boolean)
      ])];

      // Fetch related data
      const [transportsRes, citiesRes, usersRes] = await Promise.all([
        transportIds.length > 0
          ? supabase
              .from('transports')
              .select('id, transport_name, city_name, gst_number, mob_number, address')
              .in('id', transportIds)
          : { data: [] },
        cityIds.length > 0
          ? supabase
              .from('cities')
              .select('id, city_name, city_code')
              .in('id', cityIds)
          : { data: [] },
        userIds.length > 0
          ? supabase
              .from('users')
              .select('id, name, username, post')
              .in('id', userIds)
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

      const userMap = {};
      (usersRes.data || []).forEach(u => {
        userMap[u.id] = u;
      });

      // Enrich rates with related data
      const enrichedRates = rates.map(rate => ({
        ...rate,
        transport: rate.transport_id ? transportMap[rate.transport_id] : null,
        destination: rate.destination_city_id ? cityMap[rate.destination_city_id] : null,
        creator: rate.created_by ? userMap[rate.created_by] : null,
        updater: rate.updated_by ? userMap[rate.updated_by] : null
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
    // Status filter
    if (filterStatus === 'active' && !rate.is_active) return false;
    if (filterStatus === 'inactive' && rate.is_active) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        rate.transport_name?.toLowerCase().includes(query) ||
        rate.transport?.transport_name?.toLowerCase().includes(query) ||
        rate.destination?.city_name?.toLowerCase().includes(query) ||
        rate.goods_type?.toLowerCase().includes(query) ||
        rate.creator?.name?.toLowerCase().includes(query) ||
        rate.updater?.name?.toLowerCase().includes(query);
      
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

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 overflow-hidden">
      {/* Filters Section */}
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transport, city, goods, creator..."
              className="w-full pl-11 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* City Filter */}
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium cursor-pointer hover:border-emerald-300 transition-all"
          >
            <option value="all">🌍 All Cities</option>
            {cities?.map(city => (
              <option key={city.id} value={city.id}>
                📍 {city.city_name}
              </option>
            ))}
          </select>

          {/* Pricing Mode Filter */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium cursor-pointer hover:border-emerald-300 transition-all"
          >
            <option value="all">💰 All Modes</option>
            <option value="per_kg">⚖️ Per KG</option>
            <option value="per_pkg">📦 Per Package</option>
            <option value="hybrid">🔄 Hybrid</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium cursor-pointer hover:border-emerald-300 transition-all"
          >
            <option value="all">📊 All Status</option>
            <option value="active">✅ Active</option>
            <option value="inactive">❌ Inactive</option>
          </select>
        </div>

        {/* Results Count & Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">
              Showing <span className="text-emerald-600">{filteredRates.length}</span> of <span className="text-emerald-600">{kaatRates.length}</span> rates
            </span>
            {filterStatus === 'active' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                <CheckCircle className="w-3 h-3" />
                Active Only
              </span>
            )}
          </div>
          <button
            onClick={loadKaatRates}
            disabled={loading}
            className="group p-2.5 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 group-hover:text-emerald-600 transition-all ${loading ? 'animate-spin' : 'group-hover:rotate-180'} duration-500`} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mx-5 mt-4 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-800 font-bold text-sm">Error</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mx-5 mt-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-emerald-800 font-bold text-sm">Success</h4>
            <p className="text-emerald-700 text-sm mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Table - Scrollable */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
              <p className="text-gray-600 font-semibold">Loading rates...</p>
            </div>
          </div>
        ) : filteredRates.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Rates Found</h3>
            <p className="text-gray-500">Try adjusting your filters or search criteria</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[calc(100vh-340px)]">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white sticky top-0 z-10 shadow-md">
                <tr>
                  <th className="px-4 py-3.5 text-left font-bold text-xs uppercase tracking-wider">Transport Details</th>
                  <th className="px-4 py-3.5 text-left font-bold text-xs uppercase tracking-wider">Destination</th>
                  <th className="px-4 py-3.5 text-left font-bold text-xs uppercase tracking-wider">Goods Type</th>
                  <th className="px-4 py-3.5 text-center font-bold text-xs uppercase tracking-wider">Pricing</th>
                  <th className="px-4 py-3.5 text-right font-bold text-xs uppercase tracking-wider">Rates</th>
                  <th className="px-4 py-3.5 text-center font-bold text-xs uppercase tracking-wider">Details</th>
                  <th className="px-4 py-3.5 text-left font-bold text-xs uppercase tracking-wider">Created/Updated</th>
                  <th className="px-4 py-3.5 text-center font-bold text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredRates.map((rate, index) => {
                  const isEditing = editingId === rate.id;

                  return (
                    <tr 
                      key={rate.id} 
                      className={`hover:bg-emerald-50/50 transition-colors ${
                        isEditing ? 'bg-blue-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } ${!rate.is_active ? 'opacity-60' : ''}`}
                    >
                      {/* Transport Details */}
                      <td className="px-3 py-1.5">
                        <div className="flex items-start gap-2">
                          <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-1.5 rounded-md flex-shrink-0">
                            <Package className="w-3 h-3 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 text-xs truncate" title={rate.transport_name || rate.transport?.transport_name}>
                              {rate.transport_name || rate.transport?.transport_name || 'N/A'}
                            </div>
                            {rate.transport?.gst_number && (
                              <div className="text-[10px] text-gray-600 mt-0.5 leading-tight">
                                GST: {rate.transport.gst_number}
                              </div>
                            )}
                            {rate.transport?.city_name && (
                              <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                                📍 {rate.transport.city_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-gray-900 text-xs">
                              {rate.destination?.city_name || getCityName(rate.destination_city_id)}
                            </div>
                            {rate.destination?.city_code && (
                              <div className="text-[10px] text-gray-600 leading-tight">
                                Code: {rate.destination.city_code}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Goods Type */}
                      <td className="px-3 py-1.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.goods_type}
                            onChange={(e) => setEditForm(prev => ({ ...prev, goods_type: e.target.value }))}
                            className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="Optional"
                          />
                        ) : (
                          <span className="text-xs text-gray-700 font-medium">{rate.goods_type || '-'}</span>
                        )}
                      </td>

                      {/* Pricing Mode */}
                      <td className="px-3 py-1.5 text-center">
                        {isEditing ? (
                          <select
                            value={editForm.pricing_mode}
                            onChange={(e) => setEditForm(prev => ({ ...prev, pricing_mode: e.target.value }))}
                            className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="per_kg">KG</option>
                            <option value="per_pkg">PACKAGE</option>
                            <option value="hybrid">Hybrid</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                            rate.pricing_mode === 'per_kg' 
                              ? 'bg-blue-100 text-blue-800'
                              : rate.pricing_mode === 'per_pkg'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {rate.pricing_mode === 'per_kg' ? 'KG' : rate.pricing_mode === 'per_pkg' ? 'PACKAGE' : 'HYBRID'}
                          </span>
                        )}
                      </td>

                      {/* Rates */}
                      <td className="px-3 py-1.5">
                        <div className="space-y-1">
                          {(rate.pricing_mode === 'per_kg' || rate.pricing_mode === 'hybrid') && (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[10px] text-gray-600">KG:</span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.rate_per_kg}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, rate_per_kg: e.target.value }))}
                                  className="w-20 px-1.5 py-0.5 border-2 border-gray-300 rounded-md text-xs text-right focus:ring-2 focus:ring-emerald-500"
                                />
                              ) : (
                                <span className="font-bold text-emerald-700 text-xs">
                                  ₹{parseFloat(rate.rate_per_kg || 0).toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                          {(rate.pricing_mode === 'per_pkg' || rate.pricing_mode === 'hybrid') && (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[10px] text-gray-600">Pkg:</span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.rate_per_pkg}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, rate_per_pkg: e.target.value }))}
                                  className="w-20 px-1.5 py-0.5 border-2 border-gray-300 rounded-md text-xs text-right focus:ring-2 focus:ring-emerald-500"
                                />
                              ) : (
                                <span className="font-bold text-purple-700 text-xs">
                                  ₹{parseFloat(rate.rate_per_pkg || 0).toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-end gap-1.5 pt-0.5 border-t border-gray-200">
                            <span className="text-[10px] text-gray-600">Min:</span>
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.min_charge}
                                onChange={(e) => setEditForm(prev => ({ ...prev, min_charge: e.target.value }))}
                                className="w-20 px-1.5 py-0.5 border-2 border-gray-300 rounded-md text-xs text-right focus:ring-2 focus:ring-emerald-500"
                              />
                            ) : (
                              <span className="font-semibold text-gray-800 text-xs">
                                ₹{parseFloat(rate.min_charge || 0).toFixed(0)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Details (Days & Notes) */}
                      <td className="px-3 py-1.5 text-center">
                        <div className="space-y-1">
                          <div>
                            {isEditing ? (
                              <input
                                type="number"
                                value={editForm.transit_days}
                                onChange={(e) => setEditForm(prev => ({ ...prev, transit_days: e.target.value }))}
                                className="w-20 px-2 py-1.5 border-2 border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500"
                                placeholder="Days"
                              />
                            ) : rate.metadata?.transit_days ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold">
                                <Calendar className="w-3 h-3" />
                                {rate.metadata.transit_days}d
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                          {(isEditing || rate.metadata?.notes) && (
                            <div>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.notes}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                  className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                                  placeholder="Notes"
                                />
                              ) : (
                                <span className="text-xs text-gray-600 truncate max-w-[150px] inline-block" title={rate.metadata?.notes}>
                                  {rate.metadata?.notes}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Created/Updated Info */}
                      <td className="px-3 py-1.5">
                        <div className="space-y-1">
                          {/* Created */}
                          <div className="bg-blue-50 rounded-md p-1.5 border border-blue-200">
                            <div className="flex items-center gap-1 mb-0.5">
                              <User className="w-2.5 h-2.5 text-blue-600" />
                              <span className="text-[10px] font-bold text-blue-900">Created</span>
                            </div>
                            <div className="text-[11px] text-blue-800 font-semibold leading-tight">
                              {rate.creator?.name || 'Unknown'}
                            </div>
                            <div className="text-[10px] text-blue-600 mt-0.5 leading-tight">
                              {format(new Date(rate.created_at), 'dd MMM yy, HH:mm')}
                            </div>
                          </div>

                          {/* Updated */}
                          {rate.updated_at !== rate.created_at && (
                            <div className="bg-purple-50 rounded-md p-1.5 border border-purple-200">
                              <div className="flex items-center gap-1 mb-0.5">
                                <TrendingUp className="w-2.5 h-2.5 text-purple-600" />
                                <span className="text-[10px] font-bold text-purple-900">Updated</span>
                              </div>
                              <div className="text-[11px] text-purple-800 font-semibold leading-tight">
                                {rate.updater?.name || 'Unknown'}
                              </div>
                              <div className="text-[10px] text-purple-600 mt-0.5 leading-tight">
                                {format(new Date(rate.updated_at), 'dd MMM yy, HH:mm')}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-1.5">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(rate.id)}
                              disabled={saving}
                              className="group relative p-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 overflow-hidden"
                              title="Save"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <Save className="w-3.5 h-3.5 relative z-10" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="p-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50"
                              title="Cancel"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(rate)}
                              className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(rate.id)}
                              className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:shadow-lg transition-all"
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
          </div>
        )}
      </div>

      {/* Footer Summary */}
      {!loading && filteredRates.length > 0 && (
        <div className="border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-gray-700 font-medium">
                  Active: <span className="font-bold text-emerald-700">{filteredRates.filter(r => r.is_active).length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700 font-medium">
                  Inactive: <span className="font-bold text-gray-700">{filteredRates.filter(r => !r.is_active).length}</span>
                </span>
              </div>
            </div>
            <div className="text-gray-600 font-semibold">
              Total: {filteredRates.length} {filteredRates.length === 1 ? 'rate' : 'rates'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
